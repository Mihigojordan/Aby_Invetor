import { db } from '../../db/database';
import stockOutService from '../stockoutService';
import { isOnline } from '../../utils/networkUtils';

class StockOutSyncService {
  constructor() {
    this.isSyncing = false;
    this.processingLocalIds = new Set(); // Track items being processed
    this.lastSyncTime = null;
    this.syncLock = null;
  }

  async syncStockOuts() {
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
    console.log('🔄 Starting stockout sync process...');

    try {
      const results = {
        adds: await this.syncUnsyncedAdds(),
        updates: await this.syncUnsyncedUpdates(),
        deletes: await this.syncDeletedStockOuts()
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
      console.log('✅ StockOut sync completed successfully', results);
      return { success: true, results };
    } catch (error) {
      console.error('❌ StockOut sync failed:', error);
      return { success: false, error: error.message };
    } finally {
      this.isSyncing = false;
      resolveSyncLock();
      this.syncLock = null;
    }
  }

  async syncUnsyncedAdds() {
    const unsyncedAdds = await db.stockouts_offline_add.toArray();
    console.log('******** => + ADDING UNSYNCED STOCK-OUTS ', unsyncedAdds.length);

    let processed = 0;
    let skipped = 0;
    let errors = 0;

    for (const stockOut of unsyncedAdds) {
      // 🔒 Skip if already being processed
      if (this.processingLocalIds.has(stockOut.localId)) {
        console.log(`⏭️ Skipping stockout ${stockOut.localId} - already processing`);
        skipped++;
        continue;
      }

      this.processingLocalIds.add(stockOut.localId);

      try {
        // ✅ Double-check if already synced (race condition protection)
        const syncedRecord = await db.synced_stockout_ids
          .where('localId')
          .equals(stockOut.localId)
          .first();
        
        if (syncedRecord) {
          console.log(`✓ StockOut ${stockOut.localId} already synced to server ID ${syncedRecord.serverId}`);
          await db.stockouts_offline_add.delete(stockOut.localId);
          skipped++;
          continue;
        }

        // 🔍 Check for potential content duplicates
        const isDuplicateContent = await this.checkForContentDuplicate(stockOut);
        if (isDuplicateContent) {
          console.log(`🔍 Duplicate content detected for stockout ${stockOut.localId}, removing from queue`);
          await db.stockouts_offline_add.delete(stockOut.localId);
          skipped++;
          continue;
        }

        // 📦 Prepare data with idempotency key - using createStockOut for single items
        const stockOutData = {
          stockinId: stockOut.stockinId,
          quantity: stockOut.quantity,
          soldPrice: stockOut.soldPrice,
          clientName: stockOut.clientName,
          clientEmail: stockOut.clientEmail,
          clientPhone: stockOut.clientPhone,
          paymentMethod: stockOut.paymentMethod,
          adminId: stockOut.adminId,
          employeeId: stockOut.employeeId,
          transactionId: stockOut.transactionId,
          // 🔑 Idempotency key for backend deduplication
          idempotencyKey: this.generateIdempotencyKey(stockOut),
          clientId: stockOut.localId, // For tracking
          clientTimestamp: stockOut.createdAt || stockOut.lastModified
        };

        console.log(`📤 Sending stockout ${stockOut.localId} to server...`);
        
        // 🌐 Send to server with error handling
        let response;
        try {
          response = await stockOutService.createStockOut(stockOutData);
        } catch (apiError) {
          // Handle specific API errors
          if (apiError.status === 409 || apiError.message?.includes('duplicate')) {
            console.log(`⚠️ Server detected duplicate for stockout ${stockOut.localId}, removing from queue`);
            await db.stockouts_offline_add.delete(stockOut.localId);
            skipped++;
            continue;
          }
          throw apiError; // Re-throw other errors
        }

        // Handle different response structures from backend
        const serverStockOut = response.data?.[0] || response.data || response;
        const serverStockOutId = serverStockOut.id;

        if (!serverStockOutId) {
          throw new Error('Server did not return a valid stockout ID');
        }

        // 💾 Update local database atomically with all columns
        await db.transaction('rw', db.stockouts_all, db.stockouts_offline_add, db.synced_stockout_ids, async () => {
          // Check for existing record in stockouts_all
          const existingStockOut = await db.stockouts_all.get(serverStockOutId);
          
          const stockOutRecord = {
            id: serverStockOutId,
            stockinId: serverStockOut.stockinId || stockOut.stockinId,
            quantity: serverStockOut.quantity || stockOut.quantity,
            soldPrice: serverStockOut.soldPrice || stockOut.soldPrice || (stockOut.quantity * (serverStockOut.stockin?.sellingPrice || 0)),
            clientName: serverStockOut.clientName || stockOut.clientName,
            clientEmail: serverStockOut.clientEmail || stockOut.clientEmail,
            clientPhone: serverStockOut.clientPhone || stockOut.clientPhone,
            paymentMethod: serverStockOut.paymentMethod || stockOut.paymentMethod,
            adminId: serverStockOut.adminId || stockOut.adminId,
            employeeId: serverStockOut.employeeId || stockOut.employeeId,
            transactionId: serverStockOut.transactionId || stockOut.transactionId,
            lastModified: new Date(),
            createdAt: serverStockOut.createdAt || stockOut.createdAt || new Date(),
            updatedAt: serverStockOut.updatedAt || new Date()
          };

          if (existingStockOut) {
            console.log(`📝 Updating existing stockout ${serverStockOutId}`);
            await db.stockouts_all.update(serverStockOutId, stockOutRecord);
          } else {
            console.log(`➕ Adding new stockout ${serverStockOutId}`);
            await db.stockouts_all.add(stockOutRecord);
          }

          // Record the sync relationship
          await db.synced_stockout_ids.put({
            localId: stockOut.localId,
            serverId: serverStockOutId,
            syncedAt: new Date()
          });

          // Remove from offline queue
          await db.stockouts_offline_add.delete(stockOut.localId);
        });

        console.log(`✅ Successfully synced stockout ${stockOut.localId} → ${serverStockOutId}`);
        processed++;

      } catch (error) {
        console.error(`❌ Error syncing stockout ${stockOut.localId}:`, error);
        
        const retryCount = (stockOut.syncRetryCount || 0) + 1;
        const maxRetries = 5;

        if (retryCount >= maxRetries) {
          console.log(`🚫 Max retries reached for stockout ${stockOut.localId}, removing from queue`);
          await db.stockouts_offline_add.delete(stockOut.localId);
        } else {
          await db.stockouts_offline_add.update(stockOut.localId, {
            syncError: error.message,
            syncRetryCount: retryCount,
            lastSyncAttempt: new Date()
          });
        }
        errors++;
      } finally {
        this.processingLocalIds.delete(stockOut.localId);
      }
    }

    return { processed, skipped, errors, total: unsyncedAdds.length };
  }

  async syncUnsyncedUpdates() {
    const unsyncedUpdates = await db.stockouts_offline_update.toArray();
    console.log('******** => + UPDATING UNSYNCED STOCK-OUTS ', unsyncedUpdates.length);

    let processed = 0;
    let errors = 0;

    for (const stockOut of unsyncedUpdates) {
      try {
        const stockOutData = {
          stockinId: stockOut.stockinId,
          quantity: stockOut.quantity,
          soldPrice: stockOut.soldPrice,
          clientName: stockOut.clientName,
          clientEmail: stockOut.clientEmail,
          clientPhone: stockOut.clientPhone,
          paymentMethod: stockOut.paymentMethod,
          adminId: stockOut.adminId,
          employeeId: stockOut.employeeId,
          transactionId: stockOut.transactionId,
          // Add version or timestamp for optimistic locking
          lastModified: stockOut.lastModified
        };

        const response = await stockOutService.updateStockOut(stockOut.id, stockOutData);

        await db.transaction('rw', db.stockouts_all, db.stockouts_offline_update, async () => {
          const serverStockOut = response.data || response;
          
          await db.stockouts_all.put({
            id: stockOut.id,
            stockinId: serverStockOut.stockinId || stockOut.stockinId,
            quantity: serverStockOut.quantity || stockOut.quantity,
            soldPrice: serverStockOut.soldPrice || stockOut.soldPrice,
            clientName: serverStockOut.clientName || stockOut.clientName,
            clientEmail: serverStockOut.clientEmail || stockOut.clientEmail,
            clientPhone: serverStockOut.clientPhone || stockOut.clientPhone,
            paymentMethod: serverStockOut.paymentMethod || stockOut.paymentMethod,
            adminId: serverStockOut.adminId || stockOut.adminId,
            employeeId: serverStockOut.employeeId || stockOut.employeeId,
            transactionId: serverStockOut.transactionId || stockOut.transactionId,
            lastModified: new Date(),
            createdAt: serverStockOut.createdAt || stockOut.createdAt,
            updatedAt: serverStockOut.updatedAt || new Date()
          });

          await db.stockouts_offline_update.delete(stockOut.id);
        });

        processed++;
      } catch (error) {
        console.error('Error syncing stockout update:', error);
        
        const retryCount = (stockOut.syncRetryCount || 0) + 1;
        if (retryCount >= 5) {
          await db.stockouts_offline_update.delete(stockOut.id);
        } else {
          await db.stockouts_offline_update.update(stockOut.id, {
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

  async syncDeletedStockOuts() {
    const deletedStockOuts = await db.stockouts_offline_delete.toArray();
    console.log('******** => + DELETING UNSYNCED STOCK-OUTS ', deletedStockOuts.length);

    let processed = 0;
    let errors = 0;

    for (const deletedStockOut of deletedStockOuts) {
      try {
        await stockOutService.deleteStockOut(deletedStockOut.id, {
          adminId: deletedStockOut.adminId,
          employeeId: deletedStockOut.employeeId
        });

        await db.transaction('rw', db.stockouts_all, db.stockouts_offline_delete, db.synced_stockout_ids, async () => {
          await db.stockouts_all.delete(deletedStockOut.id);
          await db.stockouts_offline_delete.delete(deletedStockOut.id);
          
          // Clean up sync tracking
          const syncRecord = await db.synced_stockout_ids
            .where('serverId')
            .equals(deletedStockOut.id)
            .first();
          if (syncRecord) {
            await db.synced_stockout_ids.delete(syncRecord.localId);
          }
        });

        processed++;
      } catch (error) {
        // If item doesn't exist on server (404), consider it successfully deleted
        if (error.status === 404) {
          await db.transaction('rw', db.stockouts_all, db.stockouts_offline_delete, async () => {
            await db.stockouts_all.delete(deletedStockOut.id);
            await db.stockouts_offline_delete.delete(deletedStockOut.id);
          });
          processed++;
          continue;
        }

        console.error('Error syncing stockout delete:', error);
        
        const retryCount = (deletedStockOut.syncRetryCount || 0) + 1;
        if (retryCount >= 5) {
          await db.stockouts_offline_delete.delete(deletedStockOut.id);
        } else {
          await db.stockouts_offline_delete.update(deletedStockOut.id, {
            syncError: error.message,
            syncRetryCount: retryCount,
            lastSyncAttempt: new Date()
          });
        }
        errors++;
      }
    }

    return { processed, errors, total: deletedStockOuts.length };
  }

  async fetchAndUpdateLocal() {
    try {
      const serverStockOuts = await stockOutService.getAllStockOuts();
      console.log('******** => + FETCHING AND UPDATING STOCK-OUT DATA ', serverStockOuts.length);

      await db.transaction('rw', db.stockouts_all, db.synced_stockout_ids, async () => {
        // 🔥 Clear all local data - server is the source of truth
        await db.stockouts_all.clear();
        console.log('✨ Cleared local stockouts, replacing with server data');

        // 📥 Replace with fresh server data including all columns
        for (const serverStockOut of serverStockOuts) {
          await db.stockouts_all.put({
            id: serverStockOut.id,
            stockinId: serverStockOut.stockinId,
            quantity: serverStockOut.quantity,
            soldPrice: serverStockOut.soldPrice,
            clientName: serverStockOut.clientName,
            clientEmail: serverStockOut.clientEmail,
            clientPhone: serverStockOut.clientPhone,
            paymentMethod: serverStockOut.paymentMethod,
            adminId: serverStockOut.adminId,
            employeeId: serverStockOut.employeeId,
            transactionId: serverStockOut.transactionId,
            lastModified: new Date(),
            createdAt: serverStockOut.createdAt,
            updatedAt: serverStockOut.updatedAt || new Date()
          });
        }

        // 🧹 Clean up sync tracking for stockouts no longer on server
        const serverIds = new Set(serverStockOuts.map(s => s.id));
        await db.synced_stockout_ids
          .where('serverId')
          .noneOf(Array.from(serverIds))
          .delete();
        
        console.log(`✅ Successfully replaced local data with ${serverStockOuts.length} stockouts from server`);
      });
    } catch (error) {
      console.error('Error fetching server stockout data:', error);
      // Don't throw - sync can continue without fresh server data
    }
  }

  // 🔍 Check for content-based duplicates
  async checkForContentDuplicate(stockOut) {
    const timeWindow = 10 * 60 * 1000; // 10 minutes
    const cutoffTime = new Date(Date.now() - timeWindow);

    // Check for stockouts with same stockinId and quantity created recently
    const potentialDuplicates = await db.stockouts_all
      .where('stockinId').equals(stockOut.stockinId)
      .and(item => 
        item.quantity === stockOut.quantity &&
        item.clientName === stockOut.clientName &&
        new Date(item.updatedAt || item.lastModified) > cutoffTime
      )
      .count();

    return potentialDuplicates > 0;
  }

  // 🔑 Generate consistent idempotency key
  generateIdempotencyKey(stockOut) {
    const timestamp = stockOut.createdAt?.getTime() || stockOut.lastModified?.getTime() || Date.now();
    return `stockout-${stockOut.localId}-${timestamp}-${stockOut.stockinId}-${stockOut.quantity}`;
  }

  async getSyncStatus() {
    const unsyncedAdds = await db.stockouts_offline_add.count();
    const unsyncedUpdates = await db.stockouts_offline_update.count();
    const pendingDeletes = await db.stockouts_offline_delete.count();
    const totalStockOuts = await db.stockouts_all.count() + unsyncedAdds + unsyncedUpdates;
    const syncedIdsCount = await db.synced_stockout_ids.count();

    return {
      totalStockOuts,
      unsyncedStockOuts: unsyncedAdds + unsyncedUpdates,
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
    return this.syncStockOuts();
  }

  // 🧹 Clean up failed sync attempts
  async cleanupFailedSyncs() {
    const maxRetries = 5;
    
    await db.stockouts_offline_add
      .where('syncRetryCount')
      .above(maxRetries)
      .delete();
    
    await db.stockouts_offline_update
      .where('syncRetryCount')
      .above(maxRetries)
      .delete();
      
    await db.stockouts_offline_delete
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
    console.log('🌐 Network is back online, starting stockout sync...');
    setTimeout(() => this.syncStockOuts(), 1000);
  }

  async handleFocus() {
    if ((await isOnline()) && !this.isSyncing && !this.syncLock) {
      setTimeout(() => this.syncStockOuts(), 500);
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

export const stockOutSyncService = new StockOutSyncService();