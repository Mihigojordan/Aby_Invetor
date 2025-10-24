import { db } from '../../db/database';
import stockOutService from '../stockoutService';
import backorderService from '../backOrderService';
import { isOnline } from '../../utils/networkUtils';
import { stockInSyncService } from './stockInSyncService';

class StockOutSyncService {
  constructor() {
    this.isSyncing = false;
    this.processingLocalIds = new Set();
    this.processingTransactionIds = new Set();
    this.lastSyncTime = null;
    this.syncLock = null;
    this.syncTimeout = 5 * 60 * 1000; // 5 minute timeout
    this.batchSize = 50; // Process in batches to manage memory
    this.cleanupInterval = null;
  }

  // ==================== MAIN SYNC METHODS ====================

  async syncUnsyncedAdds() {
    const unsyncedAdds = await db.stockouts_offline_add.toArray();
    console.log('******** => + ADDING UNSYNCED STOCK-OUTS ', unsyncedAdds.length);

    let processed = 0;
    let skipped = 0;
    let errors = 0;

    // Process in batches to manage memory
    const batches = this.chunkArray(unsyncedAdds, this.batchSize);

    for (const batch of batches) {
      const batchResults = await this.processBatch(batch);
      processed += batchResults.processed;
      skipped += batchResults.skipped;
      errors += batchResults.errors;
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
          quantity: stockOut.quantity,
          soldPrice: stockOut.soldPrice,
          clientName: stockOut.clientName,
          clientEmail: stockOut.clientEmail,
          clientPhone: stockOut.clientPhone,
          paymentMethod: stockOut.paymentMethod,
          transactionId: stockOut.transactionId,
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

  // ==================== BATCH PROCESSING ====================

  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  async processBatch(stockouts) {
    let processed = 0;
    let skipped = 0;
    let errors = 0;

    // Group stockouts by transactionId within the batch
    const stockoutsByTransaction = new Map();
    const individualStockouts = [];

    for (const stockOut of stockouts) {
      // Skip if already processing this specific stockout
      if (this.processingLocalIds.has(stockOut.localId)) {
        console.log(`⏭️ Skipping stockout ${stockOut.localId} - already processing`);
        skipped++;
        continue;
      }

      // Check if already synced
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

      // Group by transactionId if it exists
      if (stockOut.transactionId) {
        if (!stockoutsByTransaction.has(stockOut.transactionId)) {
          stockoutsByTransaction.set(stockOut.transactionId, []);
        }
        stockoutsByTransaction.get(stockOut.transactionId).push(stockOut);
      } else {
        individualStockouts.push(stockOut);
      }
    }

    // Process grouped transactions
    for (const [transactionId, transactionStockouts] of stockoutsByTransaction) {
      const transactionResult = await this.processTransaction(transactionId, transactionStockouts);
      processed += transactionResult.processed;
      skipped += transactionResult.skipped;
      errors += transactionResult.errors;
    }

    // Process individual stockouts
    for (const stockOut of individualStockouts) {
      const result = await this.processIndividualStockout(stockOut);
      processed += result.processed;
      skipped += result.skipped;
      errors += result.errors;
    }

    return { processed, skipped, errors };
  }

  // ==================== TRANSACTION PROCESSING ====================

  async processTransaction(transactionId, stockouts) {
    // Skip if this transaction is already being processed
    if (this.processingTransactionIds.has(transactionId)) {
      console.log(`⏭️ Skipping transaction ${transactionId} - already processing`);
      return { processed: 0, skipped: stockouts.length, errors: 0 };
    }

    try {
      console.log(`📦 Processing transaction ${transactionId} with ${stockouts.length} stockouts`);

      // Mark transaction as processing FIRST
      this.processingTransactionIds.add(transactionId);

      // CHECK IF ENTIRE TRANSACTION ALREADY EXISTS ON SERVER
      const existingTransaction = await db.stockouts_all
        .where('transactionId')
        .equals(transactionId)
        .first();

      if (existingTransaction) {
        console.log(`🔍 Transaction ${transactionId} already exists on server, removing from offline queue`);
        await this.cleanupProcessedStockouts(stockouts);
        return { processed: 0, skipped: stockouts.length, errors: 0 };
      }

      // Double-check for recent duplicates
      const isDuplicate = await this.checkForRecentTransactionDuplicate(transactionId, stockouts);
      if (isDuplicate) {
        console.log(`🔍 Detected potential duplicate transaction ${transactionId}, skipping`);
        await this.cleanupProcessedStockouts(stockouts);
        return { processed: 0, skipped: stockouts.length, errors: 0 };
      }

      // Mark all stockouts in this transaction as processing
      stockouts.forEach(so => this.processingLocalIds.add(so.localId));

      // Validate and resolve stockin IDs for all stockouts in this transaction
      const preparedSalesData = [];
      const validationErrors = [];

      for (const stockOut of stockouts) {
        try {
          const preparedSale = await this.prepareSaleForSync(stockOut);
          if (preparedSale) {
            preparedSalesData.push({ sale: preparedSale, originalStockOut: stockOut });
          } else {
            validationErrors.push(`Invalid sale data for stockout ${stockOut.localId}`);
          }
        } catch (error) {
          console.warn(`⚠️ Error preparing sale for stockout ${stockOut.localId}:`, error.message);
          validationErrors.push(`Preparation error for stockout ${stockOut.localId}: ${error.message}`);
        }
      }

      // If we have validation errors, handle them gracefully
      if (validationErrors.length > 0) {
        console.warn(`Validation errors in transaction ${transactionId}:`, validationErrors);
        
        // If all stockouts failed validation, skip the entire transaction
        if (preparedSalesData.length === 0) {
          await this.handleTransactionValidationFailure(stockouts, validationErrors);
          return { processed: 0, skipped: 0, errors: stockouts.length };
        }
        
        // If some stockouts are valid, continue with partial transaction
        console.log(`Continuing with ${preparedSalesData.length}/${stockouts.length} valid stockouts`);
      }

      // Extract client info and user info from first valid stockout
      const firstStockout = preparedSalesData[0].originalStockOut;
      const clientInfo = {
        clientName: firstStockout.clientName,
        clientEmail: firstStockout.clientEmail,
        clientPhone: firstStockout.clientPhone,
        paymentMethod: firstStockout.paymentMethod
      };

      const userInfo = {
        adminId: firstStockout.adminId,
        employeeId: firstStockout.employeeId
      };

      // Format ALL sales in this transaction for createMultipleStockOut
      const salesArray = preparedSalesData.map(({ sale }) => sale);

      console.log(`📤 Sending transaction ${transactionId} with ${salesArray.length} stockouts in ONE REQUEST...`);

      // Generate idempotency key for the entire transaction
      const idempotencyKey = this.generateTransactionIdempotencyKey(transactionId, stockouts);

      // Send ALL stockouts with same transactionId to server in ONE call
      let response;
      try {
        response = await stockOutService.createMultipleStockOut(
          salesArray,
          clientInfo,
          userInfo,
          { idempotencyKey }
        );
      } catch (apiError) {
        if (apiError.status === 409 || apiError.message?.includes('duplicate')) {
          console.log(`⚠️ Server detected duplicate for transaction ${transactionId}, removing from queue`);
          await this.cleanupProcessedStockouts(stockouts);
          return { processed: 0, skipped: stockouts.length, errors: 0 };
        }
        throw apiError;
      }

      const serverStockOuts = response.data || [];
      if (!Array.isArray(serverStockOuts)) {
        throw new Error('Server response is not an array');
      }

      // Handle partial success - server might return fewer results than expected
      const processedStockouts = Math.min(serverStockOuts.length, preparedSalesData.length);
      const failedStockouts = preparedSalesData.slice(processedStockouts);

      // Save successful results
      if (processedStockouts > 0) {
        await this.saveTransactionResults(
          serverStockOuts.slice(0, processedStockouts),
          preparedSalesData.slice(0, processedStockouts),
          transactionId
        );
      }

      // Handle failed stockouts
      let errors = 0;
      if (failedStockouts.length > 0) {
        console.warn(`${failedStockouts.length} stockouts in transaction ${transactionId} were not processed by server`);
        for (const { originalStockOut } of failedStockouts) {
          await this.handleSyncError(originalStockOut, new Error('Server did not process this stockout'));
        }
        errors = failedStockouts.length;
      }

      console.log(`✅ Synced transaction ${transactionId} with ${processedStockouts} stockouts`);
      return { processed: processedStockouts, skipped: 0, errors };

    } catch (error) {
      console.error(`❌ Error syncing transaction ${transactionId}:`, error);

      // Handle retry logic for each stockout in the failed transaction
      for (const stockOut of stockouts) {
        await this.handleSyncError(stockOut, error);
      }
      return { processed: 0, skipped: 0, errors: stockouts.length };
    } finally {
      // Clean up processing flags
      stockouts.forEach(so => this.processingLocalIds.delete(so.localId));
      this.processingTransactionIds.delete(transactionId);
    }
  }

  async processIndividualStockout(stockOut) {
    if (this.processingLocalIds.has(stockOut.localId)) {
      console.log(`⏭️ Skipping stockout ${stockOut.localId} - already processing`);
      return { processed: 0, skipped: 1, errors: 0 };
    }

    // Check for content-based duplicates
    const isDuplicate = await this.checkForContentDuplicate(stockOut);
    if (isDuplicate) {
      console.log(`🔍 Detected content duplicate for stockout ${stockOut.localId}, removing`);
      await db.stockouts_offline_add.delete(stockOut.localId);
      return { processed: 0, skipped: 1, errors: 0 };
    }

    this.processingLocalIds.add(stockOut.localId);

    try {
      const preparedSale = await this.prepareSaleForSync(stockOut);
      if (!preparedSale) {
        return { processed: 0, skipped: 1, errors: 0 };
      }

      const clientInfo = {
        clientName: stockOut.clientName,
        clientEmail: stockOut.clientEmail,
        clientPhone: stockOut.clientPhone,
        paymentMethod: stockOut.paymentMethod
      };

      const userInfo = {
        adminId: stockOut.adminId,
        employeeId: stockOut.employeeId
      };

      console.log(`📤 Sending individual stockout ${stockOut.localId}...`);

      const idempotencyKey = this.generateIdempotencyKey(stockOut);

      let response;
      try {
        response = await stockOutService.createMultipleStockOut(
          [preparedSale],
          clientInfo,
          userInfo,
          { idempotencyKey }
        );
      } catch (apiError) {
        if (apiError.status === 409 || apiError.message?.includes('duplicate')) {
          console.log(`⚠️ Server detected duplicate for stockout ${stockOut.localId}, removing from queue`);
          await db.stockouts_offline_add.delete(stockOut.localId);
          return { processed: 0, skipped: 1, errors: 0 };
        }
        throw apiError;
      }

      await this.saveIndividualStockoutResult(response, stockOut);
      console.log(`✅ Synced individual stockout ${stockOut.localId}`);
      return { processed: 1, skipped: 0, errors: 0 };

    } catch (error) {
      console.error(`❌ Error syncing stockout ${stockOut.localId}:`, error);
      await this.handleSyncError(stockOut, error);
      return { processed: 0, skipped: 0, errors: 1 };
    } finally {
      this.processingLocalIds.delete(stockOut.localId);
    }
  }

  // ==================== DUPLICATE DETECTION ====================

  async checkForRecentTransactionDuplicate(transactionId, stockouts) {
    try {
      const timeWindow = 5 * 60 * 1000; // 5 minutes
      const cutoffTime = new Date(Date.now() - timeWindow);

      // First check by transactionId directly
      if (transactionId) {
        const existingByTransactionId = await db.stockouts_all
          .where('transactionId').equals(transactionId)
          .and(item => {
            const itemTime = new Date(item.updatedAt || item.lastModified || item.createdAt);
            return itemTime > cutoffTime;
          })
          .first();

        if (existingByTransactionId) {
          return true;
        }
      }

      // Check individual stockouts
      for (const stockOut of stockouts) {
        if (!this.isValidStockinId(stockOut.stockinId)) {
          console.warn(`Skipping duplicate check for stockout ${stockOut.localId} - invalid stockinId:`, stockOut.stockinId);
          continue;
        }

        const recentDuplicate = await db.stockouts_all
          .where('stockinId').equals(stockOut.stockinId)
          .and(item =>
            item.quantity === stockOut.quantity &&
            item.clientName === stockOut.clientName &&
            item.transactionId === transactionId &&
            new Date(item.updatedAt || item.lastModified || item.createdAt) > cutoffTime
          )
          .first();

        if (recentDuplicate) {
          return true;
        }
      }
      return false;
    } catch (error) {
      console.warn('Error checking for transaction duplicates:', error);
      return false;
    }
  }

  async checkForContentDuplicate(stockOut) {
    try {
      const timeWindow = 10 * 60 * 1000; // 10 minutes
      const cutoffTime = new Date(Date.now() - timeWindow);

      if (!this.isValidStockinId(stockOut.stockinId)) {
        console.warn(`Skipping content duplicate check for stockout ${stockOut.localId} - invalid stockinId:`, stockOut.stockinId);
        return false;
      }

      const potentialDuplicates = await db.stockouts_all
        .where('stockinId').equals(stockOut.stockinId)
        .and(item =>
          item.quantity === stockOut.quantity &&
          item.clientName === stockOut.clientName &&
          item.soldPrice === stockOut.soldPrice &&
          new Date(item.updatedAt || item.lastModified || item.createdAt) > cutoffTime
        )
        .count();

      return potentialDuplicates > 0;
    } catch (error) {
      console.warn('Error checking for content duplicates:', error);
      return false;
    }
  }

  // ==================== HELPER METHODS ====================

  isValidStockinId(stockinId) {
    return stockinId != null && 
           (typeof stockinId === 'string' || typeof stockinId === 'number') &&
           stockinId !== '' &&
           !isNaN(stockinId);
  }

  async cleanupProcessedStockouts(stockouts) {
    const deletePromises = stockouts.map(stockOut => 
      db.stockouts_offline_add.delete(stockOut.localId).catch(err => 
        console.warn(`Failed to delete stockout ${stockOut.localId}:`, err)
      )
    );
    await Promise.allSettled(deletePromises);
  }

  async handleTransactionValidationFailure(stockouts, errors) {
    for (const stockOut of stockouts) {
      const retryCount = (stockOut.syncRetryCount || 0) + 1;
      if (retryCount >= 3) {
        console.log(`🚫 Max retries reached for stockout ${stockOut.localId}, removing from queue`);
        await db.stockouts_offline_add.delete(stockOut.localId);
      } else {
        await db.stockouts_offline_add.update(stockOut.localId, {
          syncError: `Validation errors: ${errors.join(', ')}`,
          syncRetryCount: retryCount,
          lastSyncAttempt: new Date()
        });
      }
    }
  }

  generateTransactionIdempotencyKey(transactionId, stockouts) {
    const stockoutIds = stockouts.map(s => s.localId).sort().join('-');
    const timestamp = stockouts[0].createdAt?.getTime() || Date.now();
    return `transaction-${transactionId}-${stockoutIds}-${timestamp}`;
  }

  generateIdempotencyKey(stockOut) {
    const timestamp = stockOut.createdAt?.getTime() || stockOut.lastModified?.getTime() || Date.now();
    const contentHash = `${stockOut.stockinId}-${stockOut.quantity}-${stockOut.clientName}-${stockOut.soldPrice}`;
    return `stockout-${stockOut.localId}-${timestamp}-${contentHash}`;
  }

  async handleSyncError(stockOut, error) {
    const retryCount = (stockOut.syncRetryCount || 0) + 1;
    if (retryCount >= 5) {
      console.log(`🚫 Max retries reached for stockout ${stockOut.localId}, removing from queue`);
      await db.stockouts_offline_add.delete(stockOut.localId);
    } else {
      await db.stockouts_offline_add.update(stockOut.localId, {
        syncError: error.message,
        syncRetryCount: retryCount,
        lastSyncAttempt: new Date()
      });
    }
  }

  // ==================== DATA PREPARATION ====================

  async prepareSaleForSync(stockOut) {
    // Resolve stockin ID mapping
    let resolvedStockInId = stockOut.stockinId;

    if (stockOut.stockinId) {
      // Check if this is a local stockin ID that has been synced
      const syncedStockIn = await db.synced_stockin_ids
        .where('localId')
        .equals(stockOut.stockinId)
        .first();

      if (syncedStockIn) {
        resolvedStockInId = syncedStockIn.serverId;
        console.log(`🔄 Mapped local stockin ID ${stockOut.stockinId} to server ID ${resolvedStockInId}`);

        // Update the stockout record with the correct stockin ID
        await db.stockouts_offline_add.update(stockOut.localId, {
          stockinId: resolvedStockInId
        });
      } else {
        // Check if it's already a server ID in stockins_all
        const serverStockIn = await db.stockins_all.get(stockOut.stockinId);
        if (!serverStockIn) {
          console.warn(`⚠️ Product ID ${stockOut.stockinId} not found in local database. Skipping stockout ${stockOut.localId}`);
          return null;
        }
      }
    }

    // Handle backorder data if present
    let backOrderPayload = null;
    if (stockOut.backorderLocalId) {
      const localBackOrder = await db.backorders_offline_add.get(stockOut.backorderLocalId);
      if (localBackOrder) {
        backOrderPayload = {
          quantity: localBackOrder.quantity,
          sellingPrice: localBackOrder.soldPrice,
          soldPrice: localBackOrder.soldPrice,
          productName: localBackOrder.productName,
        };
      }
    }

    // Format sale data to match createMultipleStockOut expectations
    if (stockOut.isBackOrder || backOrderPayload) {
      return {
        stockinId: null,
        quantity: Number(stockOut.quantity),
        isBackOrder: true,
        soldPrice: Number(stockOut.soldPrice),
        backOrder: backOrderPayload || {
          productName: stockOut.productName,
          quantity: Number(stockOut.quantity),
          sellingPrice: stockOut.soldPrice,
          soldPrice: stockOut.soldPrice
        }
      };
    } else {
      return {
        stockinId: resolvedStockInId,
        quantity: Number(stockOut.quantity),
        soldPrice: Number(stockOut.soldPrice),
        isBackOrder: false,
        backOrder: null
      };
    }
  }

  // ==================== DATABASE OPERATIONS ====================

  async saveTransactionResults(serverStockOuts, preparedSalesData, transactionId) {
    await db.transaction(
      'rw',
      db.stockouts_all,
      db.stockouts_offline_add,
      db.backorders_all,
      db.backorders_offline_add,
      db.synced_stockout_ids,
      db.sales_return_items_offline_add,
      db.sales_return_items_offline_update,
      db.sales_returns_offline_add,
      db.sales_returns_offline_update,
      db.sales_returns_all,
      db.synced_sales_return_ids,
      async () => {
        for (let i = 0; i < serverStockOuts.length; i++) {
          const serverStockOut = serverStockOuts[i];
          const localStockOut = preparedSalesData[i].originalStockOut;
          const serverStockOutId = serverStockOut.id;

          // Skip if already exists
          const existingRecord = await db.stockouts_all.get(serverStockOutId);
          if (existingRecord) {
            console.log(`⚠️ Server stockout ${serverStockOutId} already exists locally, skipping`);
            continue;
          }

          // Save stockout
          const stockOutRecord = {
            id: serverStockOutId,
            stockinId: serverStockOut.stockinId || localStockOut.stockinId,
            quantity: serverStockOut.quantity || localStockOut.quantity,
            soldPrice: serverStockOut.soldPrice || localStockOut.soldPrice,
            clientName: serverStockOut.clientName || localStockOut.clientName,
            clientEmail: serverStockOut.clientEmail || localStockOut.clientEmail,
            clientPhone: serverStockOut.clientPhone || localStockOut.clientPhone,
            paymentMethod: serverStockOut.paymentMethod || localStockOut.paymentMethod,
            adminId: serverStockOut.adminId || localStockOut.adminId,
            employeeId: serverStockOut.employeeId || localStockOut.employeeId,
            transactionId: serverStockOut.transactionId || transactionId,
            backorderId: serverStockOut.backorderId || null,
            lastModified: new Date(),
            createdAt: serverStockOut.createdAt || localStockOut.createdAt || new Date(),
            updatedAt: serverStockOut.updatedAt || new Date()
          };
          await db.stockouts_all.put(stockOutRecord);

          // Handle backorder
          if (serverStockOut.backorderId && localStockOut.backorderLocalId) {
            await this.handleBackorderSync(serverStockOut, localStockOut);
          }

          // Record sync mapping
          await db.synced_stockout_ids.put({
            localId: localStockOut.localId,
            serverId: serverStockOutId,
            syncedAt: new Date()
          });

          // Update related offline sales return items (ADD)
          const relatedAddItems = await db.sales_return_items_offline_add
            .where('stockoutId')
            .equals(localStockOut.localId)
            .toArray();

          for (const item of relatedAddItems) {
            await db.sales_return_items_offline_add.update(item.localId, { stockoutId: serverStockOutId });

            // Update parent sales return transactionId
            const offlineParent = await db.sales_returns_offline_add
              .where('localId')
              .equals(item.salesReturnId)
              .first();

            if (offlineParent) {
              await db.sales_returns_offline_add.update(offlineParent.localId, {
                transactionId: serverStockOut.transactionId
              });
            } else {
              const syncedParent = await db.synced_sales_return_ids
                .where('localId')
                .equals(item.salesReturnId)
                .first();
              if (syncedParent) {
                await db.sales_returns_all.update(syncedParent.serverId, {
                  transactionId: serverStockOut.transactionId
                });
              }
            }

            console.log(`✅ Updated sales_return_items_offline_add ${item.localId}: stockout ${localStockOut.localId} → ${serverStockOutId}`);
          }

          // Update related offline sales return items (UPDATE)
          const relatedUpdateItems = await db.sales_return_items_offline_update
            .where('stockoutId')
            .equals(localStockOut.localId)
            .toArray();

          for (const item of relatedUpdateItems) {
            await db.sales_return_items_offline_update.update(item.id, { stockoutId: serverStockOutId });

            // Update parent sales return transactionId
            const offlineParent = await db.sales_returns_offline_update
              .where('id')
              .equals(item.salesReturnId)
              .first();

            if (offlineParent) {
              await db.sales_returns_offline_update.update(offlineParent.id, {
                transactionId: serverStockOut.transactionId
              });
            } else {
              const syncedParent = await db.synced_sales_return_ids
                .where('localId')
                .equals(item.salesReturnId)
                .first();
              if (syncedParent) {
                await db.sales_returns_all.update(syncedParent.serverId, {
                  transactionId: serverStockOut.transactionId
                });
              }
            }

            console.log(`🔄 Updated sales_return_items_offline_update ${item.id}: stockout ${localStockOut.localId} → ${serverStockOutId}`);
          }

          // Remove offline stockout
          await db.stockouts_offline_add.delete(localStockOut.localId);
        }
      }
    );
  }

  async saveIndividualStockoutResult(response, stockOut) {
    const serverStockOuts = response.data || [];
    const serverStockOut = serverStockOuts[0];

    if (!serverStockOut?.id) {
      throw new Error('Server did not return a valid stockout ID');
    }

    await db.transaction(
      'rw',
      db.stockouts_all,
      db.stockouts_offline_add,
      db.backorders_all,
      db.backorders_offline_add,
      db.synced_stockout_ids,
      db.sales_return_items_offline_add,
      db.sales_return_items_offline_update,
      db.sales_returns_offline_add,
      db.sales_returns_offline_update,
      db.sales_returns_all,
      db.synced_sales_return_ids,
      async () => {
        // Check if this server stockout already exists locally
        const existingRecord = await db.stockouts_all.get(serverStockOut.id);
        if (existingRecord) {
          console.log(`⚠️ Server stockout ${serverStockOut.id} already exists locally`);
          await db.stockouts_offline_add.delete(stockOut.localId);
          return;
        }

        // Save stockout to main table
        const stockOutRecord = {
          id: serverStockOut.id,
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
          backorderId: serverStockOut.backorderId || null,
          lastModified: new Date(),
          createdAt: serverStockOut.createdAt || stockOut.createdAt || new Date(),
          updatedAt: serverStockOut.updatedAt || new Date()
        };

        await db.stockouts_all.put(stockOutRecord);

        // Handle backorder if present
        if (serverStockOut.backorderId && stockOut.backorderLocalId) {
          await this.handleBackorderSync(serverStockOut, stockOut);
        }

        // Record sync mapping
        await db.synced_stockout_ids.put({
          localId: stockOut.localId,
          serverId: serverStockOut.id,
          syncedAt: new Date()
        });

        const serverStockOutId = serverStockOut.id;

        // Update related offline sales return items (ADD)
        const relatedSalesReturnItemAdd = await db.sales_return_items_offline_add
          .where('stockoutId')
          .equals(stockOut.localId)
          .toArray();

        if (relatedSalesReturnItemAdd.length > 0) {
          for (const salesReturnItem of relatedSalesReturnItemAdd) {
            await db.sales_return_items_offline_add.update(salesReturnItem.localId, {
              stockoutId: serverStockOutId
            });

            const offlineParent = await db.sales_returns_offline_add
              .where('localId')
              .equals(salesReturnItem.salesReturnId)
              .first();

            if (offlineParent) {
              await db.sales_returns_offline_add.update(offlineParent.localId, {
                transactionId: serverStockOut.transactionId
              });
            } else {
              const syncedParent = await db.synced_sales_return_ids
                .where('localId')
                .equals(salesReturnItem.salesReturnId)
                .first();

              if (syncedParent) {
                await db.sales_returns_all.update(syncedParent.serverId, {
                  transactionId: serverStockOut.transactionId,
                });
              }
            }

            console.log(`✅ Updated sales_return_items_offline_add ${salesReturnItem.localId}: stockout ${stockOut.localId} → ${serverStockOutId}`);
          }
        }

        // Update related offline sales return items (UPDATE)
        const relatedSalesReturnItemsUpdate = await db.sales_return_items_offline_update
          .where('stockoutId')
          .equals(stockOut.localId)
          .toArray();

        if (relatedSalesReturnItemsUpdate.length > 0) {
          for (const salesReturnItem of relatedSalesReturnItemsUpdate) {
            await db.sales_return_items_offline_update.update(salesReturnItem.id, {
              stockoutId: serverStockOutId,
            });

            const offlineParent = await db.sales_returns_offline_update
              .where('id')
              .equals(salesReturnItem.salesReturnId)
              .first();

            if (offlineParent) {
              await db.sales_returns_offline_update.update(offlineParent.id, {
                transactionId: serverStockOut.transactionId,
              });
            } else {
              const syncedParent = await db.synced_sales_return_ids
                .where('localId')
                .equals(salesReturnItem.salesReturnId)
                .first();

              if (syncedParent) {
                await db.sales_returns_all.update(syncedParent.serverId, {
                  transactionId: serverStockOut.transactionId,
                });
              }
            }

            console.log(`🔄 Updated sales_return_items_offline_update ${salesReturnItem.id}: stockout ${stockOut.localId} → ${serverStockOutId}`);
          }
        }

        // Remove offline stockout
        await db.stockouts_offline_add.delete(stockOut.localId);
      }
    );
  }

  async handleBackorderSync(serverStockOut, localStockOut) {
    const localBackOrder = await db.backorders_offline_add.get(localStockOut.backorderLocalId);
    if (localBackOrder) {
      // Check if backorder already exists
      const existingBackorder = await db.backorders_all.get(serverStockOut.backorderId);
      if (!existingBackorder) {
        await db.backorders_all.put({
          id: serverStockOut.backorderId,
          quantity: localBackOrder.quantity,
          soldPrice: localBackOrder.soldPrice,
          productName: localBackOrder.productName,
          adminId: localBackOrder.adminId,
          employeeId: localBackOrder.employeeId,
          lastModified: new Date(),
          createdAt: serverStockOut.createdAt || new Date(),
          updatedAt: serverStockOut.updatedAt || new Date()
        });
      }

      // Remove local backorder stub
      await db.backorders_offline_add.delete(localStockOut.backorderLocalId);
    }
  }

  // ==================== SYNC ORCHESTRATION ====================

  async syncStockOuts() {
    // Prevent concurrent syncs with a promise-based lock with timeout
    if (this.syncLock) {
      console.log('Sync already in progress, waiting for completion...');
      try {
        await Promise.race([
          this.syncLock,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Sync timeout')), this.syncTimeout)
          )
        ]);
      } catch (error) {
        console.warn('Previous sync timed out or failed, proceeding with new sync');
        this.syncLock = null;
        this.isSyncing = false;
        // Clear stale processing flags after timeout
        this.processingLocalIds.clear();
        this.processingTransactionIds.clear();
      }
      
      if (this.isSyncing) {
        return { success: false, error: 'Sync already in progress' };
      }
    }

    if (!(await isOnline())) {
      return { success: false, error: 'Offline' };
    }

    // Create sync lock promise with timeout
    let resolveSyncLock;
    let rejectSyncLock;
    this.syncLock = new Promise((resolve, reject) => {
      resolveSyncLock = resolve;
      rejectSyncLock = reject;
    });

    // Set up timeout for the entire sync operation
    const timeoutId = setTimeout(() => {
      rejectSyncLock(new Error('Sync operation timed out'));
    }, this.syncTimeout);

    this.isSyncing = true;
    console.log('🔄 Starting stockout sync process...');

    try {
      // Step 1: Sync stockins first and wait for completion
      console.log('📦 Step 1: Syncing stockins first...');
      const stockinResults = await stockInSyncService.syncStockIns(true);
      console.log('✅ Product sync completed:', stockinResults);

      // Step 2: Wait for stockin ID updates to propagate if needed
      if (this.shouldWaitForStockinUpdates(stockinResults)) {
        console.log('⏰ Waiting for stockin ID updates to propagate...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Step 3: Sync stockouts with enhanced error handling
      const results = {
        adds: await this.syncUnsyncedAdds(),
        updates: await this.syncUnsyncedUpdates(),
        deletes: await this.syncDeletedStockOuts()
      };

      // Only fetch if we made changes or it's been a while
      const shouldFetchFresh = this.shouldFetchFreshData(results);
      if (shouldFetchFresh) {
        await this.fetchAndUpdateLocal();
      }

      this.lastSyncTime = Date.now();
      console.log('✅ StockOut sync completed successfully', results);
      
      clearTimeout(timeoutId);
      resolveSyncLock(results);
      return { success: true, results };
    } catch (error) {
      console.error('❌ StockOut sync failed:', error);
      clearTimeout(timeoutId);
      rejectSyncLock(error);
      return { success: false, error: error.message };
    } finally {
      this.isSyncing = false;
      this.syncLock = null;
    }
  }

  shouldWaitForStockinUpdates(stockinResults) {
    return stockinResults.results?.addProducts?.processed > 0 ||
      stockinResults.results?.adds?.processed > 0 ||
      stockinResults.results?.updates?.processed > 0 ||
      stockinResults.results?.deletes?.processed > 0;
  }

  shouldFetchFreshData(results) {
    return results.adds.processed > 0 ||
      results.updates.processed > 0 ||
      results.deletes.processed > 0 ||
      !this.lastSyncTime;
  }

  async fetchAndUpdateLocal() {
    try {
      // Fetch StockOuts
      const serverStockOuts = await stockOutService.getAllStockOuts();
      console.log('******** => + FETCHING AND UPDATING STOCK-OUT DATA ', serverStockOuts.length);

      await db.transaction('rw', db.stockouts_all, db.synced_stockout_ids, async () => {
        await db.stockouts_all.clear();
        console.log('✨ Cleared local stockouts, replacing with server data');

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
            backorderId: serverStockOut.backorderId,
            employeeId: serverStockOut.employeeId,
            transactionId: serverStockOut.transactionId,
            lastModified: serverStockOut.createdAt || new Date(),
            createdAt: serverStockOut.createdAt,
            updatedAt: serverStockOut.updatedAt || new Date()
          });
        }

        const serverIds = new Set(serverStockOuts.map(s => s.id));
        await db.synced_stockout_ids
          .where('serverId')
          .noneOf(Array.from(serverIds))
          .delete();

        console.log(`✅ Replaced local data with ${serverStockOuts.length} stockouts`);
      });

      // Fetch Backorders
      const serverBackorders = await backorderService.getAllBackOrders();
      console.log('******** => + FETCHING AND UPDATING BACKORDER DATA ', serverBackorders.length);

      await db.transaction('rw', db.backorders_all, async () => {
        await db.backorders_all.clear();
        console.log('✨ Cleared local backorders, replacing with server data');

        for (const serverBackorder of serverBackorders) {
          await db.backorders_all.put({
            id: serverBackorder.id,
            quantity: serverBackorder.quantity,
            soldPrice: serverBackorder.soldPrice,
            productName: serverBackorder.productName,
            adminId: serverBackorder.adminId,
            employeeId: serverBackorder.employeeId,
            lastModified: new Date(),
            createdAt: serverBackorder.createdAt,
            updatedAt: serverBackorder.updatedAt || new Date()
          });
        }

        console.log(`✅ Replaced local data with ${serverBackorders.length} backorders`);
      });

    } catch (error) {
      console.error('Error fetching server stockout/backorder data:', error);
    }
  }

  // ==================== CLEANUP & MAINTENANCE ====================

  async cleanupFailedSyncs() {
    const maxRetries = 5;
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    const cutoffDate = new Date(Date.now() - maxAge);

    try {
      await db.transaction('rw', 
        db.stockouts_offline_add, 
        db.stockouts_offline_update, 
        db.stockouts_offline_delete,
        async () => {
          // Remove items that have exceeded max retries or are too old
          const oldAdds = await db.stockouts_offline_add
            .filter(item => 
              (item.syncRetryCount && item.syncRetryCount > maxRetries) ||
              (item.lastSyncAttempt && new Date(item.lastSyncAttempt) < cutoffDate)
            )
            .toArray();
          
          for (const item of oldAdds) {
            await db.stockouts_offline_add.delete(item.localId);
          }

          const oldUpdates = await db.stockouts_offline_update
            .filter(item => 
              (item.syncRetryCount && item.syncRetryCount > maxRetries) ||
              (item.lastSyncAttempt && new Date(item.lastSyncAttempt) < cutoffDate)
            )
            .toArray();
          
          for (const item of oldUpdates) {
            await db.stockouts_offline_update.delete(item.id);
          }

          const oldDeletes = await db.stockouts_offline_delete
            .filter(item => 
              (item.syncRetryCount && item.syncRetryCount > maxRetries) ||
              (item.lastSyncAttempt && new Date(item.lastSyncAttempt) < cutoffDate)
            )
            .toArray();
          
          for (const item of oldDeletes) {
            await db.stockouts_offline_delete.delete(item.id);
          }
        }
      );

      // Clean up processing sets (in case of crashes)
      this.processingLocalIds.clear();
      this.processingTransactionIds.clear();

      console.log('✅ Cleanup completed successfully');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  // ==================== STATUS & MONITORING ====================

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
      processingTransactions: this.processingTransactionIds.size,
      lastSync: this.lastSyncTime ? new Date(this.lastSyncTime) : null
    };
  }

  async forceSync() {
    // Wait for current sync to complete if in progress
    if (this.syncLock) {
      try {
        await Promise.race([
          this.syncLock,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Force sync timeout')), this.syncTimeout)
          )
        ]);
      } catch (error) {
        console.warn('Previous sync timed out, forcing new sync');
        this.syncLock = null;
        this.isSyncing = false;
        this.processingLocalIds.clear();
        this.processingTransactionIds.clear();
      }
    }
    return this.syncStockOuts();
  }

  // ==================== EVENT HANDLERS ====================

  setupAutoSync() {
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('focus', this.handleFocus.bind(this));

    // Enhanced cleanup interval with error handling
    this.cleanupInterval = setInterval(async () => {
      try {
        await this.cleanupFailedSyncs();
      } catch (error) {
        console.error('Error during periodic cleanup:', error);
      }
    }, 30 * 60 * 1000); // Every 30 minutes

    console.log('✅ Auto-sync event listeners registered');
  }

  async handleOnline() {
    console.log('🌐 Network is back online, starting stockout sync...');
    setTimeout(() => this.syncStockOuts(), 1000);
  }

  async handleFocus() {
    if ((await isOnline()) && !this.isSyncing && !this.syncLock) {
      console.log('👁️ Window focused, checking for pending syncs...');
      setTimeout(() => this.syncStockOuts(), 500);
    }
  }

  cleanup() {
    window.removeEventListener('online', this.handleOnline.bind(this));
    window.removeEventListener('focus', this.handleFocus.bind(this));
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    // Clear processing sets
    this.processingLocalIds.clear();
    this.processingTransactionIds.clear();
    
    // Clear sync lock if it exists
    if (this.syncLock) {
      this.syncLock = null;
    }

    console.log('✅ StockOutSyncService cleanup completed');
  }
}

export const stockOutSyncService = new StockOutSyncService();