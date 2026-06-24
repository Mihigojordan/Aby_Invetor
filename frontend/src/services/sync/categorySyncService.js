import { db } from '../../db/database';
import categoryService from '../categoryService';
import { isOnline } from '../../utils/networkUtils';
import { ProcessingMutex } from '../../utils/syncMutex';
import { moveToDeadLetter } from './deadLetterService';

class CategorySyncService {
  constructor() {
    this.isSyncing = false;
    this.mutex = new ProcessingMutex();
    this.lastSyncTime = null;
    this.syncLock = null;
  }

  async syncCategories() {
    if (this.syncLock) {
      console.log('Category sync already in progress, waiting for completion...');
      await this.syncLock;
      return { success: false };
    }

    if (!(await isOnline())) {
      return { success: false, error: 'Offline' };
    }

    let resolveSyncLock;
    this.syncLock = new Promise(resolve => { resolveSyncLock = resolve; });
    this.isSyncing = true;
    console.log('🔄 Starting category sync process...');

    try {
      const results = {
        adds: await this.syncUnsyncedAdds(),
        updates: await this.syncUnsyncedUpdates(),
        deletes: await this.syncDeletedCategories()
      };

      const shouldFetchFresh =
        results.adds.processed > 0 ||
        results.updates.processed > 0 ||
        results.deletes.processed > 0 ||
        !this.lastSyncTime ||
        (Date.now() - this.lastSyncTime) > 10000;

      if (shouldFetchFresh) {
        await this.fetchAndUpdateLocal();
      }

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
      if (this.mutex.isLocked(category.localId)) {
        skipped++;
        continue;
      }

      await this.mutex.run(category.localId, async () => {
        try {
          const syncedRecord = await db.synced_category_ids
            .where('localId').equals(category.localId).first();

          if (syncedRecord) {
            await db.categories_offline_add.delete(category.localId);
            skipped++;
            return;
          }

          const isDuplicateContent = await this.checkForContentDuplicate(category);
          if (isDuplicateContent) {
            await db.categories_offline_add.delete(category.localId);
            skipped++;
            return;
          }

          const categoryData = {
            name: category.name,
            description: category.description,
            subcategory: category.subcategory,
            adminId: category.adminId,
            employeeId: category.employeeId,
            // Read stored key first; fall back to generating one for old rows
            idempotencyKey: category.idempotencyKey || this.generateIdempotencyKey(category),
            clientId: category.localId,
            clientTimestamp: category.createdAt || category.lastModified
          };

          console.log(`📤 Sending category ${category.localId} to server...`);

          let response;
          try {
            response = await categoryService.createCategory(categoryData);
          } catch (apiError) {
            if (apiError.status === 409 || apiError.response?.status === 409) {
              const existingCategory = apiError.response?.data?.category || apiError.data?.category;
              if (existingCategory?.id) {
                await db.transaction('rw', db.categories_all, db.categories_offline_add, db.synced_category_ids, async () => {
                  await db.categories_all.put({
                    id: existingCategory.id,
                    name: existingCategory.name,
                    description: existingCategory.description,
                    lastModified: new Date(existingCategory.updatedAt || existingCategory.createdAt || Date.now()),
                    updatedAt: new Date(existingCategory.updatedAt || Date.now()),
                  });
                  await db.synced_category_ids.put({ localId: category.localId, serverId: existingCategory.id, syncedAt: new Date() });
                  await db.categories_offline_add.delete(category.localId);
                });
                console.log(`⚠️ Category duplicate — mapped ${category.localId} → ${existingCategory.id}`);
              } else {
                await db.categories_offline_add.delete(category.localId);
              }
              skipped++;
              return;
            }
            if (apiError.status === 400 && apiError.message?.includes('already exists')) {
              await db.categories_offline_add.delete(category.localId);
              skipped++;
              return;
            }
            throw apiError;
          }

          const serverCategoryId =
            response.category?.data?.[0]?.id ||
            response.category?.id ||
            response.id;

          if (!serverCategoryId) {
            throw new Error('Server did not return a valid category ID');
          }

          await db.transaction('rw', db.categories_all, db.categories_offline_add, db.synced_category_ids, async () => {
            const existingCategory = await db.categories_all.get(serverCategoryId);
            const categoryRecord = {
              id: serverCategoryId,
              name: category.name,
              description: category.description,
              subcategory: category.subcategory,
              lastModified: new Date(),
              updatedAt: response.category?.updatedAt || response.updatedAt || new Date()
            };

            if (existingCategory) {
              await db.categories_all.update(serverCategoryId, categoryRecord);
            } else {
              await db.categories_all.add(categoryRecord);
            }

            await db.synced_category_ids.put({
              localId: category.localId,
              serverId: serverCategoryId,
              syncedAt: new Date()
            });
            await db.categories_offline_add.delete(category.localId);
          });

          console.log(`✅ Synced category ${category.localId} → ${serverCategoryId}`);
          processed++;

        } catch (error) {
          console.error(`❌ Error syncing category ${category.localId}:`, error);

          const retryCount = (category.syncRetryCount || 0) + 1;
          const maxRetries = 5;

          if (retryCount >= maxRetries) {
            console.log(`🚫 Moving category ${category.localId} to dead-letter queue`);
            await moveToDeadLetter(
              'category', category, error.message,
              () => db.categories_offline_add.delete(category.localId)
            );
          } else {
            await db.categories_offline_add.update(category.localId, {
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
    const unsyncedUpdates = await db.categories_offline_update.toArray();
    console.log('******** => + UPDATING UNSYNCED CATEGORIES ', unsyncedUpdates.length);

    let processed = 0;
    let errors = 0;

    for (const category of unsyncedUpdates) {
      try {
        const categoryData = {
          name: category.name,
          description: category.description,
          subcategory: category.subcategory,
          adminId: category.adminId,
          employeeId: category.employeeId,
          lastModified: category.lastModified
        };

        const response = await categoryService.updateCategory(category.id, categoryData);

        await db.transaction('rw', db.categories_all, db.categories_offline_update, async () => {
          await db.categories_all.put({
            id: category.id,
            name: category.name,
            description: category.description,
            subcategory: category.subcategory,
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
          const syncRecord = await db.synced_category_ids.where('serverId').equals(deletedCategory.id).first();
          if (syncRecord) await db.synced_category_ids.delete(syncRecord.localId);
        });

        processed++;
      } catch (error) {
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

  async fetchAndUpdateLocal(onProgress = null) {
    const meta = await db.sync_metadata.get('categories');
    const lastSyncedAt = meta?.lastSyncedAt || null;
    const startOffset = meta?.pendingFetchOffset || 0;
    const LIMIT = 200;
    let offset = startOffset;
    let totalFetched = 0;
    let isFirstPage = (offset === 0);
    // Stamp BEFORE the first request so records created during the fetch are caught next time
    const fetchStartedAt = new Date().toISOString();

    while (true) {
      let result;
      try {
        result = await categoryService.getAllCategories(lastSyncedAt, { limit: LIMIT, offset });
      } catch (fetchError) {
        console.error('[categories] Fetch failed — local data preserved:', fetchError);
        return;
      }

      const { data: updatedRecords = [], deletedIds = [] } = result;

      if (isFirstPage && !lastSyncedAt && updatedRecords.length === 0) {
        console.warn('[categories] Empty full-fetch — skipping to preserve local data');
        return;
      }

      await db.transaction('rw', db.categories_all, db.synced_category_ids, async () => {
        if (isFirstPage && !lastSyncedAt) await db.categories_all.clear();

        const records = updatedRecords.map(c => ({
          id: c.id,
          name: c.name,
          description: c.description,
          subcategory: c.subcategory,
          lastModified: new Date(),
          updatedAt: c.updatedAt || new Date()
        }));
        await db.categories_all.bulkPut(records);

        for (const id of deletedIds) {
          await db.categories_all.delete(id);
          const mapping = await db.synced_category_ids.where('serverId').equals(id).first();
          if (mapping) await db.synced_category_ids.delete(mapping.localId);
        }
      });

      totalFetched += updatedRecords.length;
      onProgress?.({ entity: 'categories', fetched: totalFetched });

      // Save progress incrementally so a crash only loses the current page
      await db.sync_metadata.put({
        entity: 'categories',
        lastSyncedAt: lastSyncedAt || null,
        pendingFetchOffset: offset + updatedRecords.length,
        lastFullSyncAt: meta?.lastFullSyncAt || null,
      });

      if (updatedRecords.length < LIMIT) break;
      offset += LIMIT;
      isFirstPage = false;
    }

    // All pages complete — commit final metadata
    await db.sync_metadata.put({
      entity: 'categories',
      lastSyncedAt: fetchStartedAt,
      pendingFetchOffset: 0,
      lastFullSyncAt: !lastSyncedAt ? fetchStartedAt : (meta?.lastFullSyncAt || null),
    });
  }

  async checkForContentDuplicate(category) {
    const timeWindow = 10 * 60 * 1000;
    const cutoffTime = new Date(Date.now() - timeWindow);
    const count = await db.categories_all
      .where('name').equals(category.name)
      .and(item =>
        item.description === category.description &&
        new Date(item.updatedAt || item.lastModified) > cutoffTime
      )
      .count();
    return count > 0;
  }

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
      lastSync: this.lastSyncTime ? new Date(this.lastSyncTime) : null
    };
  }

  async forceSync() {
    if (this.syncLock) await this.syncLock;
    return this.syncCategories();
  }

  async cleanupFailedSyncs() {
    const maxRetries = 5;
    await db.categories_offline_add.where('syncRetryCount').above(maxRetries).delete();
    await db.categories_offline_update.where('syncRetryCount').above(maxRetries).delete();
    await db.categories_offline_delete.where('syncRetryCount').above(maxRetries).delete();
  }

  setupAutoSync() {
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('focus', this.handleFocus.bind(this));
    this.cleanupInterval = setInterval(() => this.cleanupFailedSyncs(), 30 * 60 * 1000);
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

  cleanup() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('focus', this.handleFocus);
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
  }
}

export const categorySyncService = new CategorySyncService();
