import { db } from '../../db/database';
import { isOnline } from '../../utils/networkUtils';
import salesReturnService from '../salesReturnService';
import { stockOutSyncService } from './stockOutSyncService';

class SalesReturnSyncService {
  constructor() {
    this.isSyncing = false;
    this.processingLocalIds = new Set();
    this.processingTransactionIds = new Set();
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

  /**
   * Main sync method - ensures stockouts are synced first
   */
  async syncSalesReturns() {
    if (this.syncLock) {
      console.log('Sales return sync already in progress, waiting for completion...');
      await this.syncLock;
      return { 
        success: false,
        //  error: 'Sync was already in progress'
         };
    }

    if (!(await isOnline())) {
      return { success: false, error: 'Offline' };
    }

    let resolveSyncLock;
    this.syncLock = new Promise(resolve => {
      resolveSyncLock = resolve;
    });

    this.isSyncing = true;
    console.log('🔄 Starting sales return sync process...');

    try {
      // Step 1: Sync stockouts first (sales returns depend on stockouts)
      console.log('📦 Step 1: Syncing stockouts first...');
      const stockoutResults = await stockOutSyncService.syncUnsyncedAdds();
      console.log('✅ Stockout sync completed:', stockoutResults);

      // Step 2: Wait for stockout updates to propagate
      if (this.shouldWaitForStockoutUpdates(stockoutResults)) {
        console.log('⏰ Waiting for stockout updates to propagate...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Step 3: Sync sales returns
      const results = {
        adds: await this.syncUnsyncedAdds(),
        // updates: await this.syncUnsyncedUpdates(),
        // deletes: await this.syncDeletedSalesReturns()
      };

      // Step 4: Fetch fresh data if needed
    //   const shouldFetchFresh = this.shouldFetchFreshData(results);
    //   if (shouldFetchFresh) {
        await this.fetchAndUpdateLocal();
    //   }

      this.lastSyncTime = Date.now();
      console.log('✅ Sales return sync completed successfully', results);
      return { success: true, results };
    } catch (error) {
      console.error('❌ Sales return sync failed:', error);
      return { success: false, error: error.message };
    } finally {
      this.isSyncing = false;
      resolveSyncLock();
      this.syncLock = null;
    }
  }

  /**
   * Sync unsynced sales return additions
   */
  async syncUnsyncedAdds() {
    const unsyncedAdds = await db.sales_returns_offline_add.toArray();
    console.log('******** => + ADDING UNSYNCED SALES RETURNS ', unsyncedAdds.length);

    let processed = 0;
    let skipped = 0;
    let errors = 0;

    // Group by transactionId for batch processing
    const returnsByTransaction = new Map();
    const individualReturns = [];

    for (const salesReturn of unsyncedAdds) {
      // Skip if already processing
      if (this.processingLocalIds.has(salesReturn.localId)) {
        console.log(`⏭️ Skipping sales return ${salesReturn.localId} - already processing`);
        skipped++;
        continue;
      }

      // Check if already synced
      const syncedRecord = await db.synced_sales_return_ids
        .where('localId')
        .equals(salesReturn.localId)
        .first();

      if (syncedRecord) {
        console.log(`✓ Sales return ${salesReturn.localId} already synced to server ID ${syncedRecord.serverId}`);
        await db.sales_returns_offline_add.delete(salesReturn.localId);
        skipped++;
        continue;
      }

      // Exponential backoff: skip if not enough time has passed since last failure
      if (!this.shouldRetryNow(salesReturn)) {
        skipped++;
        continue;
      }

      // Group by transactionId
      if (salesReturn.transactionId) {
        if (!returnsByTransaction.has(salesReturn.transactionId)) {
          returnsByTransaction.set(salesReturn.transactionId, []);
        }
        returnsByTransaction.get(salesReturn.transactionId).push(salesReturn);
      } else {
        individualReturns.push(salesReturn);
      }
    }

    // Process grouped transactions
    for (const [transactionId, returns] of returnsByTransaction) {
      if (this.processingTransactionIds.has(transactionId)) {
        console.log(`⏭️ Skipping transaction ${transactionId} - already processing`);
        skipped += returns.length;
        continue;
      }

      try {
        console.log(`📦 Processing transaction ${transactionId} with ${returns.length} returns`);
        
        this.processingTransactionIds.add(transactionId);
        
        // Check for duplicates
        const isDuplicate = await this.checkForTransactionDuplicate(transactionId, returns);
        if (isDuplicate) {
          console.log(`🔍 Detected duplicate transaction ${transactionId}, removing from queue`);
          for (const ret of returns) {
            await db.sales_returns_offline_add.delete(ret.localId);
          }
          skipped += returns.length;
          continue;
        }
        
        returns.forEach(ret => this.processingLocalIds.add(ret.localId));

        // Process each return in the transaction
        for (const salesReturn of returns) {
          try {
            const preparedReturn = await this.prepareSalesReturnForSync(salesReturn);
            if (!preparedReturn) {
              skipped++;
              continue;
            }

            console.log(`📤 Sending sales return ${salesReturn.localId}...`);

            const idempotencyKey = this.generateIdempotencyKey(salesReturn);

            let response;
            try {
              response = await salesReturnService.createSalesReturn({
                ...preparedReturn,
                idempotencyKey
              });
            } catch (apiError) {
              if (apiError.status === 409 || apiError.message?.includes('duplicate')) {
                console.log(`⚠️ Server detected duplicate for sales return ${salesReturn.localId}, removing from queue`);
                await db.sales_returns_offline_add.delete(salesReturn.localId);
                skipped++;
                continue;
              }
              throw apiError;
            }

            await this.saveSalesReturnResult(response, salesReturn);
            console.log(`✅ Synced sales return ${salesReturn.localId}`);
            processed++;

          } catch (error) {
            console.error(`❌ Error syncing sales return ${salesReturn.localId}:`, error);
            await this.handleSyncError(salesReturn, error);
            errors++;
          }
        }

      } catch (error) {
        console.error(`❌ Error syncing transaction ${transactionId}:`, error);
        
        for (const ret of returns) {
          await this.handleSyncError(ret, error);
        }
        errors += returns.length;
      } finally {
        returns.forEach(ret => this.processingLocalIds.delete(ret.localId));
        this.processingTransactionIds.delete(transactionId);
      }
    }

    // Process individual returns
    for (const salesReturn of individualReturns) {
      if (this.processingLocalIds.has(salesReturn.localId)) {
        skipped++;
        continue;
      }

      const isDuplicate = await this.checkForContentDuplicate(salesReturn);
      if (isDuplicate) {
        console.log(`🔍 Detected content duplicate for sales return ${salesReturn.localId}, removing`);
        await db.sales_returns_offline_add.delete(salesReturn.localId);
        skipped++;
        continue;
      }

      this.processingLocalIds.add(salesReturn.localId);

      try {
        const preparedReturn = await this.prepareSalesReturnForSync(salesReturn);
        if (!preparedReturn) {
          skipped++;
          continue;
        }

        const idempotencyKey = this.generateIdempotencyKey(salesReturn);
        
        let response;
        try {
          response = await salesReturnService.createSalesReturn({
            ...preparedReturn,
            idempotencyKey
          });
        } catch (apiError) {
          if (apiError.status === 409 || apiError.message?.includes('duplicate')) {
            console.log(`⚠️ Server detected duplicate for sales return ${salesReturn.localId}, removing from queue`);
            await db.sales_returns_offline_add.delete(salesReturn.localId);
            skipped++;
            continue;
          }
          throw apiError;
        }

        await this.saveSalesReturnResult(response, salesReturn);
        console.log(`✅ Synced individual sales return ${salesReturn.localId}`);
        processed++;

      } catch (error) {
        console.error(`❌ Error syncing sales return ${salesReturn.localId}:`, error);
        await this.handleSyncError(salesReturn, error);
        errors++;
      } finally {
        this.processingLocalIds.delete(salesReturn.localId);
      }
    }

    return { processed, skipped, errors, total: unsyncedAdds.length };
  }

  /**
   * Prepare sales return data for sync by resolving stockout IDs
   */
  async prepareSalesReturnForSync(salesReturn) {
    try {
      // Get associated items
      const items = await db.sales_return_items_offline_add
        .where('salesReturnId')
        .equals(salesReturn.localId)
        .toArray();

      if (!items || items.length === 0) {
        console.warn(`⚠️ No items found for sales return ${salesReturn.localId}`);
        return null;
      }

      // Resolve stockout IDs for all items
      const resolvedItems = [];
      for (const item of items) {
        let resolvedStockoutId = item.stockoutId;

        // Check if this is a local stockout ID that has been synced
        const syncedStockout = await db.synced_stockout_ids
          .where('localId')
          .equals(item.stockoutId)
          .first();

        if (syncedStockout) {
          resolvedStockoutId = syncedStockout.serverId;
          console.log(`🔄 Mapped local stockout ID ${item.stockoutId} to server ID ${resolvedStockoutId}`);
        } else {
          // Check if it's already a server ID in stockouts_all
          const serverStockout = await db.stockouts_all.get(item.stockoutId);
          if (!serverStockout) {
            console.warn(`⚠️ Stockout ID ${item.stockoutId} not found. Skipping sales return ${salesReturn.localId}`);
            return null;
          }
        }

        resolvedItems.push({
          stockoutId: resolvedStockoutId,
          quantity: Number(item.quantity)
        });
      }

      return {
        transactionId: salesReturn.transactionId,
        reason: salesReturn.reason,
        createdAt: salesReturn.createdAt,
        items: resolvedItems,
        adminId: salesReturn.adminId,
        employeeId: salesReturn.employeeId
      };
    } catch (error) {
      console.error(`Error preparing sales return ${salesReturn.localId}:`, error);
      return null;
    }
  }

  /**
   * Save sales return sync result to database
   */
  async saveSalesReturnResult(response, localSalesReturn) {
    const serverSalesReturn = response.salesReturn || response.data;
    
    if (!serverSalesReturn?.id) {
      throw new Error('Server did not return a valid sales return ID');
    }

    await db.transaction(
      'rw',
      db.sales_returns_all,
      db.sales_returns_offline_add,
      db.sales_return_items_all,
      db.sales_return_items_offline_add,
      db.synced_sales_return_ids,
      db.synced_sales_return_item_ids,
      async () => {
        // Check if already exists locally
        const existingRecord = await db.sales_returns_all.get(serverSalesReturn.id);
        if (existingRecord) {
          console.log(`⚠️ Server sales return ${serverSalesReturn.id} already exists locally`);
          await db.sales_returns_offline_add.delete(localSalesReturn.localId);
          return;
        }

        // Save sales return to main table
        const salesReturnRecord = {
          id: serverSalesReturn.id,
          transactionId: serverSalesReturn.transactionId || localSalesReturn.transactionId,
          creditnoteId: serverSalesReturn.creditnoteId,
          reason: serverSalesReturn.reason || localSalesReturn.reason,
          createdAt: serverSalesReturn.createdAt || localSalesReturn.createdAt || new Date()
        };

        await db.sales_returns_all.put(salesReturnRecord);

        // Handle items if present in response
        if (serverSalesReturn.items && Array.isArray(serverSalesReturn.items)) {
          for (const serverItem of serverSalesReturn.items) {
            await db.sales_return_items_all.put({
              id: serverItem.id,
              salesReturnId: serverSalesReturn.id,
              stockoutId: serverItem.stockoutId,
              quantity: serverItem.quantity
            });

            // Find corresponding local item and create sync mapping
            const localItem = await db.sales_return_items_offline_add
              .where('salesReturnId')
              .equals(localSalesReturn.localId)
              .and(item => item.stockoutId === serverItem.stockoutId)
              .first();

            if (localItem) {
              await db.synced_sales_return_item_ids.put({
                localId: localItem.localId,
                serverId: serverItem.id,
                syncedAt: new Date()
              });

              await db.sales_return_items_offline_add.delete(localItem.localId);
            }
          }
        }

        // Record sync mapping for sales return
        await db.synced_sales_return_ids.put({
          localId: localSalesReturn.localId,
          serverId: serverSalesReturn.id,
          syncedAt: new Date()
        });

        // Remove offline sales return
        await db.sales_returns_offline_add.delete(localSalesReturn.localId);
      }
    );
  }

//   /**
//    * Sync unsynced updates
//    */
//   async syncUnsyncedUpdates() {
//     const unsyncedUpdates = await db.sales_returns_offline_update.toArray();
//     console.log('******** => + UPDATING UNSYNCED SALES RETURNS ', unsyncedUpdates.length);

//     let processed = 0;
//     let errors = 0;

//     for (const salesReturn of unsyncedUpdates) {
//       try {
//         // Note: Based on your backend, sales returns might not have update endpoints
//         // This is a placeholder - adjust based on your actual API
//         console.log(`⚠️ Sales return updates not implemented in backend for ${salesReturn.id}`);
        
//         // Remove from offline updates since backend doesn't support updates
//         await db.sales_returns_offline_update.delete(salesReturn.id);
//         processed++;

//       } catch (error) {
//         console.error('Error syncing sales return update:', error);
//         await this.handleUpdateSyncError(salesReturn, error);
//         errors++;
//       }
//     }

//     return { processed, errors, total: unsyncedUpdates.length };
//   }

//   /**
//    * Sync deleted sales returns
//    */
//   async syncDeletedSalesReturns() {
//     const deletedSalesReturns = await db.sales_returns_offline_delete.toArray();
//     console.log('******** => + DELETING UNSYNCED SALES RETURNS ', deletedSalesReturns.length);

//     let processed = 0;
//     let errors = 0;

//     for (const deletedReturn of deletedSalesReturns) {
//       try {
//         // Note: Based on your backend, there's no delete endpoint shown
//         // This would need to be implemented in the backend
//         console.log(`⚠️ Sales return deletion not implemented in backend for ${deletedReturn.id}`);
        
//         // For now, just remove from local tables
//         await db.transaction('rw', db.sales_returns_all, db.sales_returns_offline_delete, async () => {
//           await db.sales_returns_all.delete(deletedReturn.id);
//           await db.sales_returns_offline_delete.delete(deletedReturn.id);
//         });

//         processed++;
//       } catch (error) {
//         console.error('Error syncing sales return delete:', error);
//         await this.handleDeleteSyncError(deletedReturn, error);
//         errors++;
//       }
//     }

//     return { processed, errors, total: deletedSalesReturns.length };
//   }

  /**
   * Fetch and update local data from server
   */
  async fetchAndUpdateLocal() {
    // Read last sync timestamp from sync_metadata
    const meta = await db.sync_metadata.get('salesReturns');
    const lastSyncedAt = meta?.lastSyncedAt || null;

    // Fetch from server outside any transaction — bail on error without touching DB
    let result;
    try {
      result = await salesReturnService.getAllSalesReturns(lastSyncedAt);
    } catch (fetchError) {
      console.error('[salesReturns] Fetch failed — local data preserved:', fetchError);
      return;
    }

    const { data: updatedRecords, deletedIds = [] } = result;
    console.log(`[salesReturns] Delta sync: ${updatedRecords?.length ?? 0} updated, ${deletedIds.length} deleted`);

    // Guard: if first-time full fetch returns nothing, don't wipe
    if (!lastSyncedAt && (!Array.isArray(updatedRecords) || updatedRecords.length === 0)) {
      console.warn('[salesReturns] Empty full-fetch response — skipping to preserve local data');
      return;
    }

    // Apply changes atomically
    await db.transaction('rw', db.sales_returns_all, db.sales_return_items_all, db.synced_sales_return_ids, db.sync_metadata, async () => {
      if (!lastSyncedAt) {
        // First-ever sync: replace all
        await db.sales_returns_all.clear();
        await db.sales_return_items_all.clear();
      } else {
        // Remove server-deleted records
        for (const id of deletedIds) {
          await db.sales_returns_all.delete(id);
          await db.sales_return_items_all.where('salesReturnId').equals(id).delete();
          const mapping = await db.synced_sales_return_ids.where('serverId').equals(id).first();
          if (mapping) await db.synced_sales_return_ids.delete(mapping.localId);
        }
      }

      // Upsert updated/new records
      for (const serverReturn of updatedRecords) {
        await db.sales_returns_all.put({
          id: serverReturn.id,
          transactionId: serverReturn.transactionId,
          creditnoteId: serverReturn.creditnoteId,
          reason: serverReturn.reason,
          createdAt: serverReturn.createdAt,
          updatedAt: serverReturn.updatedAt
        });
        if (serverReturn.items && Array.isArray(serverReturn.items)) {
          for (const item of serverReturn.items) {
            await db.sales_return_items_all.put({
              id: item.id,
              salesReturnId: serverReturn.id,
              stockoutId: item.stockoutId,
              quantity: item.quantity
            });
          }
        }
      }

      // Update per-entity sync timestamp
      await db.sync_metadata.put({
        entity: 'salesReturns',
        lastSyncedAt: new Date().toISOString(),
        lastFullSyncAt: !lastSyncedAt ? new Date().toISOString() : (meta?.lastFullSyncAt || null),
      });
    });
  }

  // Helper methods
  shouldWaitForStockoutUpdates(stockoutResults) {
    return stockoutResults.results?.adds?.processed > 0 ||
           stockoutResults.results?.updates?.processed > 0 ||
           stockoutResults.results?.deletes?.processed > 0;
  }

  shouldFetchFreshData(results) {
    return results.adds.processed > 0 ||
           results.updates.processed > 0 ||
           results.deletes.processed > 0 ||
           !this.lastSyncTime;
  }

  async checkForTransactionDuplicate(transactionId, returns) {
    const timeWindow = 5 * 60 * 1000; // 5 minutes
    const cutoffTime = new Date(Date.now() - timeWindow);

    const existingByTransactionId = await db.sales_returns_all
      .where('transactionId').equals(transactionId)
      .and(item => new Date(item.createdAt) > cutoffTime)
      .first();

    return !!existingByTransactionId;
  }

  async checkForContentDuplicate(salesReturn) {
    const timeWindow = 10 * 60 * 1000; // 10 minutes
    const cutoffTime = new Date(Date.now() - timeWindow);

    const potentialDuplicates = await db.sales_returns_all
      .where('transactionId').equals(salesReturn.transactionId)
      .and(item =>
        item.reason === salesReturn.reason &&
        new Date(item.createdAt) > cutoffTime
      )
      .count();

    return potentialDuplicates > 0;
  }

  generateIdempotencyKey(salesReturn) {
    const timestamp = salesReturn.createdAt?.getTime() || Date.now();
    const contentHash = `${salesReturn.transactionId}-${salesReturn.reason || 'no-reason'}`;
    return `sales_return-${salesReturn.localId}-${timestamp}-${contentHash}`;
  }

  async handleSyncError(salesReturn, error) {
    const retryCount = (salesReturn.syncRetryCount || 0) + 1;
    if (retryCount >= 5) {
      console.log(`🚫 Max retries reached for sales return ${salesReturn.localId}, removing from queue`);
      await db.sales_returns_offline_add.delete(salesReturn.localId);
    } else {
      await db.sales_returns_offline_add.update(salesReturn.localId, {
        syncError: error.message,
        syncRetryCount: retryCount,
        lastSyncAttempt: new Date()
      });
    }
  }

  async handleUpdateSyncError(salesReturn, error) {
    const retryCount = (salesReturn.syncRetryCount || 0) + 1;
    if (retryCount >= 5) {
      await db.sales_returns_offline_update.delete(salesReturn.id);
    } else {
      await db.sales_returns_offline_update.update(salesReturn.id, {
        syncError: error.message,
        syncRetryCount: retryCount,
        lastSyncAttempt: new Date()
      });
    }
  }

  async handleDeleteSyncError(salesReturn, error) {
    const retryCount = (salesReturn.syncRetryCount || 0) + 1;
    if (retryCount >= 5) {
      await db.sales_returns_offline_delete.delete(salesReturn.id);
    } else {
      await db.sales_returns_offline_delete.update(salesReturn.id, {
        syncError: error.message,
        syncRetryCount: retryCount,
        lastSyncAttempt: new Date()
      });
    }
  }

  /**
   * Get sync status
   */
  async getSyncStatus() {
    const unsyncedAdds = await db.sales_returns_offline_add.count();
    const unsyncedUpdates = await db.sales_returns_offline_update.count();
    const pendingDeletes = await db.sales_returns_offline_delete.count();
    const totalReturns = await db.sales_returns_all.count() + unsyncedAdds;
    const syncedIdsCount = await db.synced_sales_return_ids.count();

    return {
      totalReturns,
      unsyncedReturns: unsyncedAdds + unsyncedUpdates,
      pendingDeletes,
      syncedIdsCount,
      isOnline: await isOnline(),
      isSyncing: this.isSyncing,
      processingCount: this.processingLocalIds.size,
      lastSync: this.lastSyncTime ? new Date(this.lastSyncTime) : null
    };
  }

  /**
   * Force sync
   */
  async forceSync() {
    if (this.syncLock) {
      await this.syncLock;
    }
    return this.syncSalesReturns();
  }

  async handleOnline() {
    console.log('🌐 Network is back online, starting sales return sync...');
    setTimeout(() => this.syncSalesReturns(), 1000);
  }

  async handleFocus() {
    if ((await isOnline()) && !this.isSyncing && !this.syncLock) {
      setTimeout(() => this.syncSalesReturns(), 500);
    }
  }

  async cleanupFailedSyncs() {
    const maxRetries = 5;

    await db.sales_returns_offline_add
      .where('syncRetryCount')
      .above(maxRetries)
      .delete();

    await db.sales_returns_offline_update
      .where('syncRetryCount')
      .above(maxRetries)
      .delete();

    await db.sales_returns_offline_delete
      .where('syncRetryCount')
      .above(maxRetries)
      .delete();
  }

}

export const salesReturnSyncService = new SalesReturnSyncService();