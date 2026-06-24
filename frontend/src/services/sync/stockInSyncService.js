import { db } from '../../db/database';
import stockInService from '../stockinService';
import { isOnline } from '../../utils/networkUtils';
import { ProcessingMutex } from '../../utils/syncMutex';
import { moveToDeadLetter } from './deadLetterService';
import { registerDependency, resolveWaitingChildren } from './syncDependencyService';

class StockInSyncService {
  constructor() {
    this.isSyncing = false;
    this.mutex = new ProcessingMutex();
    this.lastSyncTime = null;
    this.syncLock = null;
  }

  async syncStockIns() {
    // The orchestrator calls syncUnsyncedAdds() directly in the correct order.
    // This wrapper is kept for backward-compatible direct calls only.
    if (this.syncLock) {
      console.log('StockIn sync already in progress, waiting for completion...');
      await this.syncLock;
      return { success: false };
    }

    if (!(await isOnline())) {
      return { success: false, error: 'Offline' };
    }

    let resolveSyncLock;
    this.syncLock = new Promise(resolve => { resolveSyncLock = resolve; });
    this.isSyncing = true;
    console.log('🔄 Starting stockin sync process...');

    try {
      // When called standalone (not via orchestrator), still sync products first
      // so dependency resolution works correctly.
      const { productSyncService } = await import('./productSyncService');
      await productSyncService.syncUnsyncedAdds();

      const results = {
        adds: await this.syncUnsyncedAdds(),
        updates: await this.syncUnsyncedUpdates(),
        deletes: await this.syncDeletedStockIns()
      };

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
    // waitForProductIds() is removed — the orchestrator's sequential await
    // ensures product IDs are committed before this method runs.

    const unsyncedAdds = await db.stockins_offline_add.toArray();
    console.log('******** => + ADDING UNSYNCED STOCK-INS ', unsyncedAdds.length);

    let processed = 0;
    let skipped = 0;
    let errors = 0;

    for (const stockIn of unsyncedAdds) {
      if (this.mutex.isLocked(stockIn.localId)) {
        skipped++;
        continue;
      }

      await this.mutex.run(stockIn.localId, async () => {
        try {
          const syncedRecord = await db.synced_stockin_ids
            .where('localId').equals(stockIn.localId).first();

          if (syncedRecord) {
            await db.stockins_offline_add.delete(stockIn.localId);
            skipped++;
            return;
          }

          // Resolve product ID — check mapping first, then fall back to products_all
          let resolvedProductId = stockIn.productId;

          const syncedProduct = await db.synced_product_ids
            .where('localId').equals(stockIn.productId).first();

          if (syncedProduct) {
            resolvedProductId = syncedProduct.serverId;
            console.log(`🔄 Mapped product ${stockIn.productId} → ${resolvedProductId}`);
            await db.stockins_offline_add.update(stockIn.localId, { productId: resolvedProductId });
          } else {
            const serverProduct = await db.products_all.get(stockIn.productId);
            if (!serverProduct) {
              // Parent product hasn't synced yet — register dependency and skip
              console.warn(`⚠️ Product ${stockIn.productId} not ready yet — queuing stockin ${stockIn.localId} for retry`);
              await registerDependency({
                entity: 'stockin',
                localId: stockIn.localId,
                waitingForEntity: 'product',
                waitingForLocalId: stockIn.productId,
              });
              skipped++;
              return;
            }
          }

          const isDuplicateContent = await this.checkForContentDuplicate({
            ...stockIn,
            productId: resolvedProductId
          });

          if (isDuplicateContent) {
            await db.stockins_offline_add.delete(stockIn.localId);
            skipped++;
            return;
          }

          const stockInData = {
            productId: resolvedProductId,
            quantity: stockIn.quantity,
            price: stockIn.price,
            sellingPrice: stockIn.sellingPrice,
            supplier: stockIn.supplier,
            sku: stockIn.sku,
            barcodeUrl: stockIn.barcodeUrl,
            adminId: stockIn.adminId,
            employeeId: stockIn.employeeId,
            // Read stored key first; fall back to generating one for old rows
            idempotencyKey: stockIn.idempotencyKey || this.generateIdempotencyKey({ ...stockIn, productId: resolvedProductId }),
            clientId: stockIn.localId,
            clientTimestamp: stockIn.createdAt || stockIn.lastModified
          };

          console.log(`📤 Sending stockin ${stockIn.localId} to server with product ${resolvedProductId}...`);

          let response;
          try {
            response = await stockInService.createStockIn(stockInData);
          } catch (apiError) {
            if (apiError.status === 409 || apiError.message?.includes('duplicate')) {
              await db.stockins_offline_add.delete(stockIn.localId);
              skipped++;
              return;
            }
            throw apiError;
          }

          const serverStockIn =
            response.stockIn?.data?.[0] ||
            response.stockIn ||
            response.data?.[0] ||
            response.data ||
            response;
          const serverStockInId = serverStockIn.id;

          if (!serverStockInId) {
            throw new Error('Server did not return a valid stockin ID');
          }

          await db.transaction(
            'rw',
            db.stockins_all, db.stockins_offline_add, db.synced_stockin_ids,
            async () => {
              const existingStockIn = await db.stockins_all.get(serverStockInId);
              const stockInRecord = {
                id: serverStockInId,
                productId: resolvedProductId,
                quantity: serverStockIn.quantity || stockIn.quantity,
                price: serverStockIn.price || stockIn.price,
                sellingPrice: serverStockIn.sellingPrice || stockIn.sellingPrice,
                supplier: serverStockIn.supplier || stockIn.supplier,
                sku: serverStockIn.sku || stockIn.sku,
                barcodeUrl: serverStockIn.barcodeUrl || stockIn.barcodeUrl,
                receivedAt: serverStockIn.receivedAt || new Date(),
                lastModified: new Date(),
                updatedAt: serverStockIn.updatedAt || new Date()
              };

              if (existingStockIn) {
                await db.stockins_all.update(serverStockInId, stockInRecord);
              } else {
                await db.stockins_all.add(stockInRecord);
              }

              await db.synced_stockin_ids.put({
                localId: stockIn.localId,
                serverId: serverStockInId,
                syncedAt: new Date()
              });

              await db.stockins_offline_add.delete(stockIn.localId);
            }
          );

          // Update dependent offline stockouts — separate transaction, smaller scope.
          // Re-query fresh each iteration so updated rows fall out naturally.
          await db.transaction('rw', db.stockouts_offline_add, db.stockouts_offline_update, async () => {
            while (true) {
              const chunk = await db.stockouts_offline_add
                .where('stockinId').equals(stockIn.localId).limit(50).toArray();
              if (chunk.length === 0) break;
              for (const stockout of chunk) {
                await db.stockouts_offline_add.update(stockout.localId, { stockinId: serverStockInId });
                console.log(`✅ Updated stockout ${stockout.localId} stockinId: ${stockIn.localId} → ${serverStockInId}`);
              }
            }
            while (true) {
              const chunk = await db.stockouts_offline_update
                .where('stockinId').equals(stockIn.localId).limit(50).toArray();
              if (chunk.length === 0) break;
              for (const stockout of chunk) {
                await db.stockouts_offline_update.update(stockout.id, { stockinId: serverStockInId });
                console.log(`✅ Updated stockout update ${stockout.id} stockinId: ${stockIn.localId} → ${serverStockInId}`);
              }
            }
          });

          // Unblock any stockouts that were waiting for this stockin to sync
          await resolveWaitingChildren('stockin', stockIn.localId);

          console.log(`✅ Synced stockin ${stockIn.localId} → ${serverStockInId} (product ${resolvedProductId})`);
          processed++;

        } catch (error) {
          console.error(`❌ Error syncing stockin ${stockIn.localId}:`, error);

          const retryCount = (stockIn.syncRetryCount || 0) + 1;
          const maxRetries = 5;

          if (retryCount >= maxRetries) {
            console.log(`🚫 Moving stockin ${stockIn.localId} to dead-letter queue`);
            await moveToDeadLetter(
              'stockin', stockIn, error.message,
              () => db.stockins_offline_add.delete(stockIn.localId)
            );
          } else {
            await db.stockins_offline_add.update(stockIn.localId, {
              syncError: error.message,
              syncRetryCount: retryCount,
              lastSyncAttempt: new Date()
            });
          }
          errors++;
        }
      });
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
          ...(stockIn.receivedAt !== undefined ? { receivedAt: stockIn.receivedAt } : {}),
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
            receivedAt: serverStockIn.receivedAt || stockIn.receivedAt,
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
          const syncRecord = await db.synced_stockin_ids.where('serverId').equals(deletedStockIn.id).first();
          if (syncRecord) await db.synced_stockin_ids.delete(syncRecord.localId);
        });

        processed++;
      } catch (error) {
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

  async fetchAndUpdateLocal(onProgress = null) {
    const meta = await db.sync_metadata.get('stockIns');
    const lastSyncedAt = meta?.lastSyncedAt || null;
    const startOffset = meta?.pendingFetchOffset || 0;
    const LIMIT = 200;
    let offset = startOffset;
    let totalFetched = 0;
    let isFirstPage = (offset === 0);
    const fetchStartedAt = new Date().toISOString();

    while (true) {
      let result;
      try {
        result = await stockInService.getAllStockIns(lastSyncedAt, { limit: LIMIT, offset });
      } catch (fetchError) {
        console.error('[stockIns] Fetch failed — local data preserved:', fetchError);
        return;
      }

      const { data: updatedRecords = [], deletedIds = [] } = result;

      if (isFirstPage && !lastSyncedAt && updatedRecords.length === 0) {
        console.warn('[stockIns] Empty full-fetch — skipping to preserve local data');
        return;
      }

      await db.transaction('rw', db.stockins_all, db.synced_stockin_ids, async () => {
        if (isFirstPage && !lastSyncedAt) await db.stockins_all.clear();

        const records = updatedRecords.map(s => ({
          id: s.id,
          productId: s.productId,
          quantity: s.quantity,
          price: s.price,
          sellingPrice: s.sellingPrice,
          supplier: s.supplier,
          sku: s.sku,
          barcodeUrl: s.barcodeUrl,
          receivedAt: s.receivedAt,
          lastModified: s.createdAt,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt || new Date()
        }));
        await db.stockins_all.bulkPut(records);

        for (const id of deletedIds) {
          await db.stockins_all.delete(id);
          const mapping = await db.synced_stockin_ids.where('serverId').equals(id).first();
          if (mapping) await db.synced_stockin_ids.delete(mapping.localId);
        }
      });

      totalFetched += updatedRecords.length;
      onProgress?.({ entity: 'stockIns', fetched: totalFetched });

      // Save progress after each page
      await db.sync_metadata.put({
        entity: 'stockIns',
        lastSyncedAt: lastSyncedAt || null,
        pendingFetchOffset: offset + updatedRecords.length,
        lastFullSyncAt: meta?.lastFullSyncAt || null,
      });

      if (updatedRecords.length < LIMIT) break;
      offset += LIMIT;
      isFirstPage = false;
    }

    await db.sync_metadata.put({
      entity: 'stockIns',
      lastSyncedAt: fetchStartedAt,
      pendingFetchOffset: 0,
      lastFullSyncAt: !lastSyncedAt ? fetchStartedAt : (meta?.lastFullSyncAt || null),
    });
  }

  async checkForContentDuplicate(stockIn) {
    const timeWindow = 10 * 60 * 1000;
    const cutoffTime = new Date(Date.now() - timeWindow);
    const count = await db.stockins_all
      .where('productId').equals(stockIn.productId)
      .and(item =>
        item.quantity === stockIn.quantity &&
        item.price === stockIn.price &&
        item.sellingPrice === stockIn.sellingPrice &&
        item.supplier === stockIn.supplier &&
        new Date(item.updatedAt || item.lastModified) > cutoffTime
      )
      .count();
    return count > 0;
  }

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
      lastSync: this.lastSyncTime ? new Date(this.lastSyncTime) : null
    };
  }

  async forceSync() {
    if (this.syncLock) await this.syncLock;
    return this.syncStockIns();
  }

  async resetRetryCountsOnStartup() {
    if (sessionStorage.getItem('stockinSyncResetDone')) return;
    sessionStorage.setItem('stockinSyncResetDone', '1');
    await db.stockins_offline_add
      .filter(item => item.syncRetryCount > 0 && item.syncRetryCount < 5)
      .modify({ syncRetryCount: 0, syncError: null });
  }

  async cleanupFailedSyncs() {
    await db.stockins_offline_add.where('syncRetryCount').above(5).delete();
    await db.stockins_offline_update.where('syncRetryCount').above(5).delete();
    await db.stockins_offline_delete.where('syncRetryCount').above(5).delete();
  }

  setupAutoSync() {
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('focus', this.handleFocus.bind(this));
    this.cleanupInterval = setInterval(() => this.cleanupFailedSyncs(), 30 * 60 * 1000);
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
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
  }
}

export const stockInSyncService = new StockInSyncService();
