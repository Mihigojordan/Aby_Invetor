import { db } from '../../db/database';
import stockInService from '../stockinService';
import { isOnline } from '../../utils/networkUtils';

class StockInSyncService {
  constructor() {
    this.isSyncing = false;
    this.processingLocalIds = new Set(); // Track items being processed
    this.lastSyncTime = null;
    this.syncLock = null;
  }

  async syncStockIns() {
    // 🔒 Prevent concurrent syncs with a promise-based lock
    if (this.syncLock) {
      console.log('Sync already in progress, waiting for completion...');
      await this.syncLock;
      return { success: false, error: 'Sync was already in progress' };
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
      const results = {
        adds: await this.syncUnsyncedAdds(),
        updates: await this.syncUnsyncedUpdates(),
        deletes: await this.syncDeletedStockIns()
      };

      // Only fetch if we made changes or it's been a while
      const shouldFetchFresh = results.adds.processed > 0 || 
                              results.updates.processed > 0 || 
                              results.deletes.processed > 0 ||
                              !this.lastSyncTime ||
                              (Date.now() - this.lastSyncTime) > 300000; // 5 minutes

      if (shouldFetchFresh) {
        await this.fetchAndUpdateLocal();
      }

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

        // 🔍 Check for potential content duplicates
        const isDuplicateContent = await this.checkForContentDuplicate(stockIn);
        if (isDuplicateContent) {
          console.log(`🔍 Duplicate content detected for stockin ${stockIn.localId}, removing from queue`);
          await db.stockins_offline_add.delete(stockIn.localId);
          skipped++;
          continue;
        }

        // 📦 Prepare data with idempotency key
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
          // 🔑 Idempotency key for backend deduplication
          idempotencyKey: this.generateIdempotencyKey(stockIn),
          clientId: stockIn.localId, // For tracking
          clientTimestamp: stockIn.createdAt || stockIn.lastModified
        };

        console.log(`📤 Sending stockin ${stockIn.localId} to server...`);
        
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
          throw apiError; // Re-throw other errors
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

        // 💾 Update local database atomically with all columns
        await db.transaction('rw', db.stockins_all, db.stockins_offline_add, db.synced_stockin_ids, async () => {
          // Check for existing record in stockins_all
          const existingStockIn = await db.stockins_all.get(serverStockInId);
          
          const stockInRecord = {
            id: serverStockInId,
            productId: serverStockIn.productId || stockIn.productId,
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

          // Remove from offline queue
          await db.stockins_offline_add.delete(stockIn.localId);
        });

        console.log(`✅ Successfully synced stockin ${stockIn.localId} → ${serverStockInId}`);
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
          lastModified: stockIn.lastModified
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
            lastModified: new Date(),
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
    try {
      const serverStockIns = await stockInService.getAllStockIns();
      console.log('******** => + FETCHING AND UPDATING STOCK-IN DATA ', serverStockIns.length);

      await db.transaction('rw', db.stockins_all, db.synced_stockin_ids, async () => {
        // 🔥 Clear all local data - server is the source of truth
        await db.stockins_all.clear();
        console.log('✨ Cleared local stockins, replacing with server data');

        // 📥 Replace with fresh server data including all columns
        for (const serverStockIn of serverStockIns) {
          await db.stockins_all.put({
            id: serverStockIn.id,
            productId: serverStockIn.productId,
            quantity: serverStockIn.quantity,
            price: serverStockIn.price,
            sellingPrice: serverStockIn.sellingPrice,
            supplier: serverStockIn.supplier,
            sku: serverStockIn.sku,
            barcodeUrl: serverStockIn.barcodeUrl,
            lastModified: new Date(),
            updatedAt: serverStockIn.updatedAt || new Date()
          });
        }

        // 🧹 Clean up sync tracking for stockins no longer on server
        const serverIds = new Set(serverStockIns.map(s => s.id));
        await db.synced_stockin_ids
          .where('serverId')
          .noneOf(Array.from(serverIds))
          .delete();
        
        console.log(`✅ Successfully replaced local data with ${serverStockIns.length} stockins from server`);
      });
    } catch (error) {
      console.error('Error fetching server stockin data:', error);
      // Don't throw - sync can continue without fresh server data
    }
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

  setupAutoSync() {
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('focus', this.handleFocus.bind(this));
    
    // Periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.cleanupFailedSyncs();
    }, 30 * 60 * 1000); // Every 30 minutes
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

  cleanup() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('focus', this.handleFocus);
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

export const stockInSyncService = new StockInSyncService();