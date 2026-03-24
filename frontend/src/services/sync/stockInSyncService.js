import { db } from '../../db/database';
import stockInService from '../stockinService';
import { isOnline } from '../../utils/networkUtils';
import { productSyncService } from './productSyncService';

class StockInSyncService {
  constructor() {
    this.isSyncing = false;
    this.processingLocalIds = new Set(); // Track items being processed
    this.lastSyncTime = null;
    this.syncLock = null;

    // Pre-bound references kept for handleOnline/handleFocus (standalone safety net)
    this._boundHandleOnline = this.handleOnline.bind(this);
    this._boundHandleFocus = this.handleFocus.bind(this);
  }

  // Exponential backoff: skip items that haven't waited long enough since their last failure (Issue 6 fix)
  shouldRetryNow(item) {
    if (!item.syncRetryCount || item.syncRetryCount === 0) return true;
    if (!item.lastSyncAttempt) return true;
    const backoffMs = Math.min(30_000 * Math.pow(4, item.syncRetryCount - 1), 32 * 60 * 1000);
    return (Date.now() - new Date(item.lastSyncAttempt).getTime()) >= backoffMs;
  }

async syncStockIns(skipLocalFetch) {
  // 🔒 Prevent concurrent syncs with a promise-based lock
  if (this.syncLock) {
    console.log('Sync already in progress, waiting for completion...');
    await this.syncLock;
    return { success: false,  };
  }

  if (!(await isOnline())) {
    return { success: false, error: 'Offline' };
  }

  // Create sync lock promise
  let resolveSyncLock;
  this.syncLock = new Promise(resolve => {
    resolveSyncLock = resolve;
  });

  this.isSyncing = true;
  console.log('🔄 Starting stockin sync process...');

  try {
    // 🎯 STEP 1: Sync products first and WAIT for completion
    console.log('📦 Step 1: Syncing products first...');
    const productResults = await productSyncService.syncUnsyncedAdds();
    console.log('✅ Product sync completed:', productResults);

    // 🎯 STEP 2: Wait a bit to ensure all product IDs are updated
    if (productResults?.processed > 0) {
      console.log('⏰ Waiting for product ID updates to propagate...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // 1 second delay
    }

    // 🎯 STEP 3: Now sync stockins with updated product IDs
    const results = {
      addProducts: productResults,
      adds: await this.syncUnsyncedAdds(),
      updates: await this.syncUnsyncedUpdates(),
      deletes: await this.syncDeletedStockIns()
    };

    // Only fetch if we made changes or it's been a while
    const shouldFetchFresh =
      results?.addProducts?.processed > 0 ||
      results.adds.processed > 0 ||
      results.updates.processed > 0 ||
      results.deletes.processed > 0 ||
      !this.lastSyncTime ||
      (Date.now() - this.lastSyncTime) > 120000; // 2 minutes
 

      console.warn(' REFRESHING   ');
      await this.fetchAndUpdateLocal();
   

    this.lastSyncTime = Date.now();
    console.log('✅ StockIn sync completed successfully', results);
    return { success: true, results };
  } catch (error) {
    console.error('❌ StockIn sync failed:', error);
    return { success: false, error: error.message };
  } finally {
    this.isSyncing = false;
    resolveSyncLock();
    this.syncLock = null;
  }
}

 async syncUnsyncedAdds() {
  const unsyncedAdds = await db.stockins_offline_add.toArray();
  console.log('******** => + ADDING UNSYNCED STOCK-INS ', unsyncedAdds.length);

  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for (const stockIn of unsyncedAdds) {
    // 🔒 Skip if already being processed
    if (this.processingLocalIds.has(stockIn.localId)) {
      console.log(`⏭️ Skipping stockin ${stockIn.localId} - already processing`);
      skipped++;
      continue;
    }

    // Exponential backoff: skip if not enough time has passed since last failure
    if (!this.shouldRetryNow(stockIn)) {
      skipped++;
      continue;
    }

    this.processingLocalIds.add(stockIn.localId);

    try {
      // ✅ Double-check if already synced (race condition protection)
      const syncedRecord = await db.synced_stockin_ids
        .where('localId')
        .equals(stockIn.localId)
        .first();

      if (syncedRecord) {
        console.log(`✓ StockIn ${stockIn.localId} already synced to server ID ${syncedRecord.serverId}`);
        await db.stockins_offline_add.delete(stockIn.localId);
        skipped++;
        continue;
      }

      // 🔍 CRITICAL: Resolve product ID - check if it's a local ID that needs to be mapped
      let resolvedProductId = stockIn.productId;
      
      // Check if this is a local product ID that has been synced
      const syncedProduct = await db.synced_product_ids
        .where('localId')
        .equals(stockIn.productId)
        .first();
      
      if (syncedProduct) {
        resolvedProductId = syncedProduct.serverId;
        console.log(`🔄 Mapped local product ID ${stockIn.productId} to server ID ${resolvedProductId}`);
        console.warn(`🔄 Mapped local product ID ${syncedProduct} to server ID ${resolvedProductId}`);
        
        // Update the stockin record with the correct product ID
        await db.stockins_offline_add.update(stockIn.localId, {
          productId: resolvedProductId
        });
      } else {
        // Check if it's already a server ID in products_all
        const serverProduct = await db.products_all.get(stockIn.productId);
        if (!serverProduct) {
          console.warn(`⚠️ Product ID ${stockIn.productId} not found in local database. Skipping stockin ${stockIn.localId}`);
          // Don't process this stockin yet - the product might still need to be synced
          skipped++;
          continue;
        }
      }

      // 🔍 Check for potential content duplicates
      const isDuplicateContent = await this.checkForContentDuplicate({
        ...stockIn,
        productId: resolvedProductId
      });
      
      if (isDuplicateContent) {
        console.log(`🔍 Duplicate content detected for stockin ${stockIn.localId}, removing from queue`);
        await db.stockins_offline_add.delete(stockIn.localId);
        skipped++;
        continue;
      }

      // 📦 Prepare data with resolved product ID
      const stockInData = {
        productId: resolvedProductId, // Use the resolved ID
        quantity: stockIn.quantity,
        price: stockIn.price,
        sellingPrice: stockIn.sellingPrice,
        supplier: stockIn.supplier,
        sku: stockIn.sku,
        barcodeUrl: stockIn.barcodeUrl,
        adminId: stockIn.adminId,
        employeeId: stockIn.employeeId,
        // 🔑 Idempotency key for backend deduplication
        idempotencyKey: this.generateIdempotencyKey({
          ...stockIn,
          productId: resolvedProductId
        }),
        clientId: stockIn.localId,
        clientTimestamp: stockIn.createdAt || stockIn.lastModified
      };

      console.log(`📤 Sending stockin ${stockIn.localId} to server with product ID ${resolvedProductId}...`);

      // 🌐 Send to server with error handling
      let response;
      try {
        response = await stockInService.createStockIn(stockInData);
      } catch (apiError) {
        // Handle specific API errors
        if (apiError.status === 409 || apiError.message?.includes('duplicate')) {
          console.log(`⚠️ Server detected duplicate for stockin ${stockIn.localId}, removing from queue`);
          await db.stockins_offline_add.delete(stockIn.localId);
          skipped++;
          continue;
        }
        throw apiError;
      }

      // Handle different response structures from backend
      const serverStockIn = response.stockIn?.data?.[0] ||
        response.stockIn ||
        response.data?.[0] ||
        response.data ||
        response;
      const serverStockInId = serverStockIn.id;

      if (!serverStockInId) {
        throw new Error('Server did not return a valid stockin ID');
      }

      // 💾 Update local database atomically with resolved product ID
      await db.transaction('rw', db.stockins_all, db.stockins_offline_add, db.synced_stockin_ids ,db.stockouts_offline_add,db.stockouts_offline_update, async () => {
        const existingStockIn = await db.stockins_all.get(serverStockInId);

        const stockInRecord = {
          id: serverStockInId,
          productId: resolvedProductId, // Use resolved product ID
          quantity: serverStockIn.quantity || stockIn.quantity,
          price: serverStockIn.price || stockIn.price,
          sellingPrice: serverStockIn.sellingPrice || stockIn.sellingPrice,
          supplier: serverStockIn.supplier || stockIn.supplier,
          sku: serverStockIn.sku || stockIn.sku,
          barcodeUrl: serverStockIn.barcodeUrl || stockIn.barcodeUrl,
          lastModified: new Date(),
          updatedAt: serverStockIn.updatedAt || new Date()
        };

        if (existingStockIn) {
          console.log(`📝 Updating existing stockin ${serverStockInId}`);
          await db.stockins_all.update(serverStockInId, stockInRecord);
        } else {
          console.log(`➕ Adding new stockin ${serverStockInId}`);
          await db.stockins_all.add(stockInRecord);
        }

        // Record the sync relationship
        await db.synced_stockin_ids.put({
          localId: stockIn.localId,
          serverId: serverStockInId,
          syncedAt: new Date()
        });

        const relatedStockOuts = await db.stockouts_offline_add
            .where('stockinId')
            .equals(stockIn.localId)
            .toArray();

          if (relatedStockOuts.length > 0) {


            for (const stockout of relatedStockOuts) {
              await db.stockouts_offline_add.update(stockout.localId, {
                stockinId: serverStockInId
              });
              console.log(`✅ Updated stockout ${stockout.localId} product ID: ${stockIn.localId} → ${serverStockInId}`);
            }
          }






          const relatedStockOutUpdates = await db.stockouts_offline_update
            .where('stockinId')
            .equals(stockIn.localId)
            .toArray();

          if (relatedStockOutUpdates.length > 0) {


            for (const stockout of relatedStockOutUpdates) {
              await db.stockouts_offline_update.update(stockout.id, {
                stockinId: serverStockInId
              });
              console.log(`✅ Updated stockout update ${stockout.id} StockIn ID: ${stockIn.localId} → ${serverStockInId}`);
            }


          }

        // Remove from offline queue
        await db.stockins_offline_add.delete(stockIn.localId);
      });

      console.log(`✅ Successfully synced stockin ${stockIn.localId} → ${serverStockInId} with product ${resolvedProductId}`);
      processed++;

    } catch (error) {
      console.error(`❌ Error syncing stockin ${stockIn.localId}:`, error);

      const retryCount = (stockIn.syncRetryCount || 0) + 1;
      const maxRetries = 5;

      if (retryCount >= maxRetries) {
        console.log(`🚫 Max retries reached for stockin ${stockIn.localId}, removing from queue`);
        await db.stockins_offline_add.delete(stockIn.localId);
      } else {
        await db.stockins_offline_add.update(stockIn.localId, {
          syncError: error.message,
          syncRetryCount: retryCount,
          lastSyncAttempt: new Date()
        });
      }
      errors++;
    } finally {
      this.processingLocalIds.delete(stockIn.localId);
    }
  }

  return { processed, skipped, errors, total: unsyncedAdds.length };
}

  async syncUnsyncedUpdates() {
    const unsyncedUpdates = await db.stockins_offline_update.toArray();
    console.log('******** => + UPDATING UNSYNCED STOCK-INS ', unsyncedUpdates.length);

    let processed = 0;
    let errors = 0;

    for (const stockIn of unsyncedUpdates) {
      try {
        const stockInData = {
          productId: stockIn.productId,
          quantity: stockIn.quantity,
          price: stockIn.price,
          sellingPrice: stockIn.sellingPrice,
          supplier: stockIn.supplier,
          sku: stockIn.sku,
          barcodeUrl: stockIn.barcodeUrl,
          adminId: stockIn.adminId,
          employeeId: stockIn.employeeId,
          // Add version or timestamp for optimistic locking
          createdAt: stockIn.lastModified
        };

        const response = await stockInService.updateStockIn(stockIn.id, stockInData);

        await db.transaction('rw', db.stockins_all, db.stockins_offline_update, async () => {
          const serverStockIn = response.data || response;

          await db.stockins_all.put({
            id: stockIn.id,
            productId: serverStockIn.productId || stockIn.productId,
            quantity: serverStockIn.quantity || stockIn.quantity,
            price: serverStockIn.price || stockIn.price,
            sellingPrice: serverStockIn.sellingPrice || stockIn.sellingPrice,
            supplier: serverStockIn.supplier || stockIn.supplier,
            sku: serverStockIn.sku || stockIn.sku,
            barcodeUrl: serverStockIn.barcodeUrl || stockIn.barcodeUrl,
            lastModified: serverStockIn.createdAt || new Date(),
            updatedAt: serverStockIn.updatedAt || new Date()
          });

          await db.stockins_offline_update.delete(stockIn.id);
        });

        processed++;
      } catch (error) {
        console.error('Error syncing stockin update:', error);

        const retryCount = (stockIn.syncRetryCount || 0) + 1;
        if (retryCount >= 5) {
          await db.stockins_offline_update.delete(stockIn.id);
        } else {
          await db.stockins_offline_update.update(stockIn.id, {
            syncError: error.message,
            syncRetryCount: retryCount,
            lastSyncAttempt: new Date()
          });
        }
        errors++;
      }
    }

    return { processed, errors, total: unsyncedUpdates.length };
  }

  async syncDeletedStockIns() {
    const deletedStockIns = await db.stockins_offline_delete.toArray();
    console.log('******** => + DELETING UNSYNCED STOCK-INS ', deletedStockIns.length);

    let processed = 0;
    let errors = 0;

    for (const deletedStockIn of deletedStockIns) {
      try {
        await stockInService.deleteStockIn(deletedStockIn.id, {
          adminId: deletedStockIn.adminId,
          employeeId: deletedStockIn.employeeId
        });

        await db.transaction('rw', db.stockins_all, db.stockins_offline_delete, db.synced_stockin_ids, async () => {
          await db.stockins_all.delete(deletedStockIn.id);
          await db.stockins_offline_delete.delete(deletedStockIn.id);

          // Clean up sync tracking
          const syncRecord = await db.synced_stockin_ids
            .where('serverId')
            .equals(deletedStockIn.id)
            .first();
          if (syncRecord) {
            await db.synced_stockin_ids.delete(syncRecord.localId);
          }
        });

        processed++;
      } catch (error) {
        // If item doesn't exist on server (404), consider it successfully deleted
        if (error.status === 404) {
          await db.transaction('rw', db.stockins_all, db.stockins_offline_delete, async () => {
            await db.stockins_all.delete(deletedStockIn.id);
            await db.stockins_offline_delete.delete(deletedStockIn.id);
          });
          processed++;
          continue;
        }

        console.error('Error syncing stockin delete:', error);

        const retryCount = (deletedStockIn.syncRetryCount || 0) + 1;
        if (retryCount >= 5) {
          await db.stockins_offline_delete.delete(deletedStockIn.id);
        } else {
          await db.stockins_offline_delete.update(deletedStockIn.id, {
            syncError: error.message,
            syncRetryCount: retryCount,
            lastSyncAttempt: new Date()
          });
        }
        errors++;
      }
    }

    return { processed, errors, total: deletedStockIns.length };
  }

  async fetchAndUpdateLocal() {
    // Read last sync timestamp from sync_metadata
    const meta = await db.sync_metadata.get('stockIns');
    const lastSyncedAt = meta?.lastSyncedAt || null;

    // Fetch from server outside any transaction — bail on error without touching DB
    let result;
    try {
      result = await stockInService.getAllStockIns(lastSyncedAt);
    } catch (fetchError) {
      console.error('[stockIns] Fetch failed — local data preserved:', fetchError);
      return;
    }

    const { data: updatedRecords, deletedIds = [] } = result;
    console.log(`[stockIns] Delta sync: ${updatedRecords?.length ?? 0} updated, ${deletedIds.length} deleted`);

    // Guard: if first-time full fetch returns nothing, don't wipe
    if (!lastSyncedAt && (!Array.isArray(updatedRecords) || updatedRecords.length === 0)) {
      console.warn('[stockIns] Empty full-fetch response — skipping to preserve local data');
      return;
    }

    const toRecord = s => ({
      id: s.id,
      productId: s.productId,
      quantity: s.quantity,
      price: s.price,
      sellingPrice: s.sellingPrice,
      supplier: s.supplier,
      sku: s.sku,
      barcodeUrl: s.barcodeUrl,
      lastModified: s.createdAt,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt || new Date()
    });

    // Apply changes atomically
    await db.transaction('rw', db.stockins_all, db.synced_stockin_ids, db.sync_metadata, async () => {
      if (!lastSyncedAt) {
        // First-ever sync: replace all
        await db.stockins_all.clear();
        await db.stockins_all.bulkPut(updatedRecords.map(toRecord));
      } else {
        // Delta sync: upsert changed records
        for (const record of updatedRecords) {
          await db.stockins_all.put(toRecord(record));
        }
        // Remove server-deleted records
        for (const id of deletedIds) {
          await db.stockins_all.delete(id);
          const mapping = await db.synced_stockin_ids.where('serverId').equals(id).first();
          if (mapping) await db.synced_stockin_ids.delete(mapping.localId);
        }
      }

      // Update per-entity sync timestamp
      await db.sync_metadata.put({
        entity: 'stockIns',
        lastSyncedAt: new Date().toISOString(),
        lastFullSyncAt: !lastSyncedAt ? new Date().toISOString() : (meta?.lastFullSyncAt || null),
      });
    });
  }

  // 🔍 Check for content-based duplicates
  async checkForContentDuplicate(stockIn) {
    const timeWindow = 10 * 60 * 1000; // 10 minutes
    const cutoffTime = new Date(Date.now() - timeWindow);

    // Check for stockins with same productId, quantity, and price created recently
    const potentialDuplicates = await db.stockins_all
      .where('productId').equals(stockIn.productId)
      .and(item =>
        item.quantity === stockIn.quantity &&
        item.price === stockIn.price &&
        item.sellingPrice === stockIn.sellingPrice &&
        item.supplier === stockIn.supplier &&
        new Date(item.updatedAt || item.lastModified) > cutoffTime
      )
      .count();

    return potentialDuplicates > 0;
  }

  // 🔑 Generate consistent idempotency key
  generateIdempotencyKey(stockIn) {
    const timestamp = stockIn.createdAt?.getTime() || stockIn.lastModified?.getTime() || Date.now();
    return `stockin-${stockIn.localId}-${timestamp}-${stockIn.productId}-${stockIn.quantity}`;
  }

  async getSyncStatus() {
    const unsyncedAdds = await db.stockins_offline_add.count();
    const unsyncedUpdates = await db.stockins_offline_update.count();
    const pendingDeletes = await db.stockins_offline_delete.count();
    const totalStockIns = await db.stockins_all.count() + unsyncedAdds + unsyncedUpdates;
    const syncedIdsCount = await db.synced_stockin_ids.count();

    return {
      totalStockIns,
      unsyncedStockIns: unsyncedAdds + unsyncedUpdates,
      pendingDeletes,
      syncedIdsCount,
      isOnline: await isOnline(),
      isSyncing: this.isSyncing,
      processingCount: this.processingLocalIds.size,
      lastSync: this.lastSyncTime ? new Date(this.lastSyncTime) : null
    };
  }

  async forceSync() {
    // Wait for current sync to complete if in progress
    if (this.syncLock) {
      await this.syncLock;
    }
    return this.syncStockIns();
  }

  // 🧹 Clean up failed sync attempts
  async cleanupFailedSyncs() {
    const maxRetries = 5;

    await db.stockins_offline_add
      .where('syncRetryCount')
      .above(maxRetries)
      .delete();

    await db.stockins_offline_update
      .where('syncRetryCount')
      .above(maxRetries)
      .delete();

    await db.stockins_offline_delete
      .where('syncRetryCount')
      .above(maxRetries)
      .delete();
  }

  async handleOnline() {
    console.log('🌐 Network is back online, starting stockin sync...');
    setTimeout(() => this.syncStockIns(), 1000);
  }

  async handleFocus() {
    if ((await isOnline()) && !this.isSyncing && !this.syncLock) {
      setTimeout(() => this.syncStockIns(), 500);
    }
  }

}

export const stockInSyncService = new StockInSyncService();