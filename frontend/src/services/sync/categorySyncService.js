import { db } from '../../db/database';
import categoryService from '../categoryService';
import { isOnline } from '../../utils/networkUtils';

class CategorySyncService {
  constructor() {
    this.isSyncing = false;
    this.processingLocalIds = new Set(); // Track items being processed
    this.lastSyncTime = null;
    this.syncLock = null;

    // Store bound handler references once in the constructor.
    // Pre-bound references kept for handleOnline/handleFocus (standalone safety net)
    // so removeEventListener actually removes the correct listener (Issue 7 fix).
    this._boundHandleOnline = this.handleOnline.bind(this);
    this._boundHandleFocus = this.handleFocus.bind(this);
  }

  // ─── Exponential backoff helper ────────────────────────────────────────────
  // Prevents hammering a downed server by spacing out retries (Issue 6 fix).
  // Schedule: 1st retry after 30s, 2nd after 2m, 3rd after 8m, 4th after 32m.
  shouldRetryNow(item) {
    if (!item.syncRetryCount || item.syncRetryCount === 0) return true;
    if (!item.lastSyncAttempt) return true;
    const backoffMs = Math.min(30_000 * Math.pow(4, item.syncRetryCount - 1), 32 * 60 * 1000);
    return (Date.now() - new Date(item.lastSyncAttempt).getTime()) >= backoffMs;
  }

  async syncCategories() {
    // 🔒 Prevent concurrent syncs with a promise-based lock
    if (this.syncLock) {
      console.log('Sync already in progress, waiting for completion...');
      await this.syncLock;
      return { success: false,};
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
    console.log('🔄 Starting category sync process...');

    try {
      const results = {
        adds: await this.syncUnsyncedAdds(),
        updates: await this.syncUnsyncedUpdates(),
        deletes: await this.syncDeletedCategories()
      };

      // Always fetch — fetchAndUpdateLocal() handles delta vs full internally
      await this.fetchAndUpdateLocal();

      this.lastSyncTime = Date.now();
      console.log('✅ Category sync completed successfully', results);
      return { success: true, results };
    } catch (error) {
      console.error('❌ Category sync failed:', error);
      return { success: false, error: error.message };
    } finally {
      this.isSyncing = false;
      resolveSyncLock();
      this.syncLock = null;
    }
  }

  async syncUnsyncedAdds() {
    const unsyncedAdds = await db.categories_offline_add.toArray();
    console.log('******** => + ADDING UNSYNCED CATEGORIES ', unsyncedAdds.length);

    let processed = 0;
    let skipped = 0;
    let errors = 0;

    for (const category of unsyncedAdds) {
      // 🔒 Skip if already being processed
      if (this.processingLocalIds.has(category.localId)) {
        console.log(`⏭️ Skipping category ${category.localId} - already processing`);
        skipped++;
        continue;
      }

      // ⏳ Exponential backoff: skip items that haven't waited long enough since last failure
      if (!this.shouldRetryNow(category)) {
        console.log(`⏳ Skipping category ${category.localId} - backoff not elapsed (retry ${category.syncRetryCount})`);
        skipped++;
        continue;
      }

      this.processingLocalIds.add(category.localId);

      try {
        // ✅ Double-check if already synced (race condition protection)
        const syncedRecord = await db.synced_category_ids
          .where('localId')
          .equals(category.localId)
          .first();
        
        if (syncedRecord) {
          console.log(`✓ Category ${category.localId} already synced to server ID ${syncedRecord.serverId}`);
          await db.categories_offline_add.delete(category.localId);
          skipped++;
          continue;
        }

        // 🔍 Check for potential content duplicates
        const isDuplicateContent = await this.checkForContentDuplicate(category);
        if (isDuplicateContent) {
          console.log(`🔍 Duplicate content detected for category ${category.localId}, removing from queue`);
          await db.categories_offline_add.delete(category.localId);
          skipped++;
          continue;
        }

        // 📦 Prepare data with idempotency key
        const categoryData = {
          name: category.name,
          description: category.description,
          adminId: category.adminId,
          employeeId: category.employeeId,
          // 🔑 Idempotency key for backend deduplication
          idempotencyKey: this.generateIdempotencyKey(category),
          clientId: category.localId, // For tracking
          clientTimestamp: category.createdAt || category.lastModified
        };

        console.log(`📤 Sending category ${category.localId} to server...`);
        
        // 🌐 Send to server with error handling
        let response;
        try {
          response = await categoryService.createCategory(categoryData);
        } catch (apiError) {
          // Handle specific API errors
          if (apiError.status === 409 || apiError.message?.includes('duplicate')) {
            console.log(`⚠️ Server detected duplicate for category ${category.localId}, removing from queue`);
            await db.categories_offline_add.delete(category.localId);
            skipped++;
            continue;
          }
          throw apiError; // Re-throw other errors
        }

        const serverCategoryId = response.category?.data?.[0]?.id || 
                                response.category?.id || 
                                response.id;

        if (!serverCategoryId) {
          throw new Error('Server did not return a valid category ID');
        }

        // 💾 Update local database atomically
        await db.transaction('rw', db.categories_all, db.categories_offline_add, db.synced_category_ids, async () => {
          // Check for existing record in categories_all
          const existingCategory = await db.categories_all.get(serverCategoryId);
          
          const categoryRecord = {
            id: serverCategoryId,
            name: category.name,
            description: category.description,
            lastModified: new Date(),
            updatedAt: response.category?.updatedAt || response.updatedAt || new Date()
          };

          if (existingCategory) {
            console.log(`📝 Updating existing category ${serverCategoryId}`);
            await db.categories_all.update(serverCategoryId, categoryRecord);
          } else {
            console.log(`➕ Adding new category ${serverCategoryId}`);
            await db.categories_all.add(categoryRecord);
          }

          // Record the sync relationship
          await db.synced_category_ids.put({
            localId: category.localId,
            serverId: serverCategoryId,
            syncedAt: new Date()
          });

          // Remove from offline queue
          await db.categories_offline_add.delete(category.localId);
        });

        console.log(`✅ Successfully synced category ${category.localId} → ${serverCategoryId}`);
        processed++;

      } catch (error) {
        console.error(`❌ Error syncing category ${category.localId}:`, error);
        
        const retryCount = (category.syncRetryCount || 0) + 1;
        const maxRetries = 5;

        if (retryCount >= maxRetries) {
          console.log(`🚫 Max retries reached for category ${category.localId}, removing from queue`);
          await db.categories_offline_add.delete(category.localId);
        } else {
          await db.categories_offline_add.update(category.localId, {
            syncError: error.message,
            syncRetryCount: retryCount,
            lastSyncAttempt: new Date()
          });
        }
        errors++;
      } finally {
        this.processingLocalIds.delete(category.localId);
      }
    }

    return { processed, skipped, errors, total: unsyncedAdds.length };
  }

  async syncUnsyncedUpdates() {
    const unsyncedUpdates = await db.categories_offline_update.toArray();
    console.log('******** => + UPDATING UNSYNCED CATEGORIES ', unsyncedUpdates.length);

    let processed = 0;
    let errors = 0;

    for (const category of unsyncedUpdates) {
      try {
        const categoryData = {
          name: category.name,
          description: category.description,
          adminId: category.adminId,
          employeeId: category.employeeId,
          // Add version or timestamp for optimistic locking
          lastModified: category.lastModified
        };

        const response = await categoryService.updateCategory(category.id, categoryData);

        await db.transaction('rw', db.categories_all, db.categories_offline_update, async () => {
          await db.categories_all.put({
            id: category.id,
            name: category.name,
            description: category.description,
            lastModified: new Date(),
            updatedAt: response.category?.updatedAt || response.updatedAt || new Date()
          });

          await db.categories_offline_update.delete(category.id);
        });

        processed++;
      } catch (error) {
        console.error('Error syncing category update:', error);
        
        const retryCount = (category.syncRetryCount || 0) + 1;
        if (retryCount >= 5) {
          await db.categories_offline_update.delete(category.id);
        } else {
          await db.categories_offline_update.update(category.id, {
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

  async syncDeletedCategories() {
    const deletedCategories = await db.categories_offline_delete.toArray();
    console.log('******** => + DELETING UNSYNCED CATEGORIES ', deletedCategories.length);

    let processed = 0;
    let errors = 0;

    for (const deletedCategory of deletedCategories) {
      try {
        await categoryService.deleteCategory(deletedCategory.id, {
          adminId: deletedCategory.adminId,
          employeeId: deletedCategory.employeeId
        });

        await db.transaction('rw', db.categories_all, db.categories_offline_delete, db.synced_category_ids, async () => {
          await db.categories_all.delete(deletedCategory.id);
          await db.categories_offline_delete.delete(deletedCategory.id);
          
          // Clean up sync tracking
          const syncRecord = await db.synced_category_ids
            .where('serverId')
            .equals(deletedCategory.id)
            .first();
          if (syncRecord) {
            await db.synced_category_ids.delete(syncRecord.localId);
          }
        });

        processed++;
      } catch (error) {
        // If item doesn't exist on server (404), consider it successfully deleted
        if (error.status === 404) {
          await db.transaction('rw', db.categories_all, db.categories_offline_delete, async () => {
            await db.categories_all.delete(deletedCategory.id);
            await db.categories_offline_delete.delete(deletedCategory.id);
          });
          processed++;
          continue;
        }

        console.error('Error syncing category delete:', error);
        
        const retryCount = (deletedCategory.syncRetryCount || 0) + 1;
        if (retryCount >= 5) {
          await db.categories_offline_delete.delete(deletedCategory.id);
        } else {
          await db.categories_offline_delete.update(deletedCategory.id, {
            syncError: error.message,
            syncRetryCount: retryCount,
            lastSyncAttempt: new Date()
          });
        }
        errors++;
      }
    }

    return { processed, errors, total: deletedCategories.length };
  }

  async fetchAndUpdateLocal() {
    // Read last sync timestamp from sync_metadata
    const meta = await db.sync_metadata.get('categories');
    const lastSyncedAt = meta?.lastSyncedAt || null;

    // Fetch from server outside any transaction — bail on error without touching DB
    let result;
    try {
      result = await categoryService.getAllCategories(lastSyncedAt);
    } catch (fetchError) {
      console.error('[categories] Fetch failed — local data preserved:', fetchError);
      return;
    }

    const { data: updatedRecords, deletedIds = [] } = result;
    console.log(`[categories] Delta sync: ${updatedRecords?.length ?? 0} updated, ${deletedIds.length} deleted`);

    // Guard: if first-time full fetch returns nothing, don't wipe
    if (!lastSyncedAt && (!Array.isArray(updatedRecords) || updatedRecords.length === 0)) {
      console.warn('[categories] Empty full-fetch response — skipping to preserve local data');
      return;
    }

    // Apply changes atomically
    await db.transaction('rw', db.categories_all, db.synced_category_ids, db.sync_metadata, async () => {
      if (!lastSyncedAt) {
        // First-ever sync: replace all
        await db.categories_all.clear();
        await db.categories_all.bulkPut(
          updatedRecords.map(c => ({
            id: c.id,
            name: c.name,
            description: c.description,
            updatedAt: c.updatedAt,
            lastModified: new Date()
          }))
        );
      } else {
        // Delta sync: upsert changed records
        for (const record of updatedRecords) {
          await db.categories_all.put({
            id: record.id,
            name: record.name,
            description: record.description,
            updatedAt: record.updatedAt,
            lastModified: new Date()
          });
        }
        // Remove server-deleted records
        for (const id of deletedIds) {
          await db.categories_all.delete(id);
          const mapping = await db.synced_category_ids.where('serverId').equals(id).first();
          if (mapping) await db.synced_category_ids.delete(mapping.localId);
        }
      }

      // Update per-entity sync timestamp
      await db.sync_metadata.put({
        entity: 'categories',
        lastSyncedAt: new Date().toISOString(),
        lastFullSyncAt: !lastSyncedAt ? new Date().toISOString() : (meta?.lastFullSyncAt || null),
      });
    });
  }

  // 🔍 Check for content-based duplicates
  async checkForContentDuplicate(category) {
    const timeWindow = 10 * 60 * 1000; // 10 minutes
    const cutoffTime = new Date(Date.now() - timeWindow);

    // Check for categories with same name and description created recently
    const potentialDuplicates = await db.categories_all
      .where('name').equals(category.name)
      .and(item => 
        item.description === category.description &&
        new Date(item.updatedAt || item.lastModified) > cutoffTime
      )
      .count();

    return potentialDuplicates > 0;
  }

  // 🔑 Generate consistent idempotency key
  generateIdempotencyKey(category) {
    const timestamp = category.createdAt?.getTime() || category.lastModified?.getTime() || Date.now();
    const nameHash = category.name.toLowerCase().replace(/\s+/g, '');
    return `category-${category.localId}-${timestamp}-${nameHash}`;
  }

  async getSyncStatus() {
    const unsyncedAdds = await db.categories_offline_add.count();
    const unsyncedUpdates = await db.categories_offline_update.count();
    const pendingDeletes = await db.categories_offline_delete.count();
    const totalCategories = await db.categories_all.count() + unsyncedAdds + unsyncedUpdates;
    const syncedIdsCount = await db.synced_category_ids.count();

    return {
      totalCategories,
      unsyncedCategories: unsyncedAdds + unsyncedUpdates,
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
    return this.syncCategories();
  }

  // 🧹 Clean up failed sync attempts
  async cleanupFailedSyncs() {
    const maxRetries = 5;
    
    await db.categories_offline_add
      .where('syncRetryCount')
      .above(maxRetries)
      .delete();
    
    await db.categories_offline_update
      .where('syncRetryCount')
      .above(maxRetries)
      .delete();
      
    await db.categories_offline_delete
      .where('syncRetryCount')
      .above(maxRetries)
      .delete();
  }

  async handleOnline() {
    console.log('🌐 Network is back online, starting category sync...');
    setTimeout(() => this.syncCategories(), 1000);
  }

  async handleFocus() {
    if ((await isOnline()) && !this.isSyncing && !this.syncLock) {
      setTimeout(() => this.syncCategories(), 500);
    }
  }

}

export const categorySyncService = new CategorySyncService();