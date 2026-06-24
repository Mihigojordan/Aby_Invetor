import { db } from '../../db/database';
import productService from '../productService';
import { isOnline } from '../../utils/networkUtils';
import { ProcessingMutex } from '../../utils/syncMutex';
import { moveToDeadLetter } from './deadLetterService';
import { resolveWaitingChildren } from './syncDependencyService';

class ProductSyncService {
  constructor() {
    this.isSyncing = false;
    this.mutex = new ProcessingMutex();
    this.lastSyncTime = null;
    this.syncLock = null;
  }

  async syncProducts() {
    if (this.syncLock) {
      console.log('Product sync already in progress, waiting for completion...');
      await this.syncLock;
      return { success: false };
    }

    if (!(await isOnline())) {
      return { success: false, error: 'Offline' };
    }

    let resolveSyncLock;
    this.syncLock = new Promise(resolve => { resolveSyncLock = resolve; });
    this.isSyncing = true;
    console.log('🔄 Starting product sync process...');

    try {
      const results = {
        adds: await this.syncUnsyncedAdds(),
        updates: await this.syncUnsyncedUpdates(),
        deletes: await this.syncDeletedProducts()
      };

      const shouldFetchFresh =
        results.adds.processed > 0 ||
        results.updates.processed > 0 ||
        results.deletes.processed > 0 ||
        !this.lastSyncTime ||
        (Date.now() - this.lastSyncTime) > 120000;

      if (shouldFetchFresh) {
        await this.fetchAndUpdateLocal();
      }

      this.lastSyncTime = Date.now();
      console.log('✅ Product sync completed successfully', results);
      return { success: true, results };
    } catch (error) {
      console.error('❌ Product sync failed:', error);
      return { success: false, error: error.message };
    } finally {
      this.isSyncing = false;
      resolveSyncLock();
      this.syncLock = null;
    }
  }

  async syncUnsyncedAdds() {
    // NOTE: The orchestrator guarantees categories are synced before this runs.
    // Do NOT call categorySyncService here — it creates a double-call when the
    // orchestrator is in charge.

    const unsyncedAdds = await db.products_offline_add.toArray();
    console.log('******** => + ADDING UNSYNCED PRODUCTS ', unsyncedAdds.length);

    let processed = 0;
    let skipped = 0;
    let errors = 0;

    for (const product of unsyncedAdds) {
      if (this.mutex.isLocked(product.localId)) {
        skipped++;
        continue;
      }

      await this.mutex.run(product.localId, async () => {
        try {
          const syncedRecord = await db.synced_product_ids
            .where('localId').equals(product.localId).first();

          if (syncedRecord) {
            await this.cleanupSyncedProduct(product.localId);
            skipped++;
            return;
          }

          const isDuplicateContent = await this.checkForContentDuplicate(product);
          if (isDuplicateContent) {
            await this.cleanupSyncedProduct(product.localId);
            skipped++;
            return;
          }

          // Load images for this product
          const images = await db.product_images
            .where('[entityLocalId+entityType]')
            .equals([product.localId, 'product'])
            .and(img => !img.synced)
            .toArray();

          const productData = {
            productName: product.productName,
            brand: product.brand,
            categoryId: product.categoryId,
            description: product.description,
            adminId: product.adminId,
            employeeId: product.employeeId,
            // Read stored key first; fall back to generating one for old rows
            idempotencyKey: product.idempotencyKey || this.generateIdempotencyKey(product),
            clientId: product.localId,
            clientTimestamp: product.createdAt || product.lastModified,
            images: images
              .filter(img => img.from === 'local' && img.imageData instanceof Blob)
              .map((img, index) => new File([img.imageData], `image_${product.localId}_${index}.png`, {
                type: img.imageData.type
              }))
          };

          console.log(`📤 Sending product ${product.localId} to server...`);

          let response;
          try {
            response = await productService.createProduct(productData);
          } catch (apiError) {
            if (apiError.status === 409 || apiError.message?.includes('duplicate')) {
              await this.cleanupSyncedProduct(product.localId);
              skipped++;
              return;
            }
            throw apiError;
          }

          const serverProductId = response.product?.id || response.id;
          if (!serverProductId) {
            throw new Error('Server did not return a valid product ID');
          }

          // Save locally — use two separate transactions to keep scope manageable
          await db.transaction(
            'rw',
            db.products_all, db.product_images, db.products_offline_add, db.synced_product_ids,
            async () => {
              const existingProduct = await db.products_all.get(serverProductId);
              const productRecord = {
                id: serverProductId,
                productName: product.productName,
                brand: product.brand,
                categoryId: product.categoryId,
                description: product.description,
                lastModified: response.product?.createdAt || new Date(),
                updatedAt: response.product?.updatedAt || new Date()
              };

              if (existingProduct) {
                await db.products_all.update(serverProductId, productRecord);
              } else {
                await db.products_all.add(productRecord);
              }

              const serverImageUrls = response.product?.imageUrls || [];
              for (let i = 0; i < images.length; i++) {
                const image = images[i];
                const serverUrl = serverImageUrls[i] || null;
                if (serverUrl) {
                  await db.product_images.update(image.localId, {
                    entityId: serverProductId,
                    entityLocalId: null,
                    imageData: productService.getFullImageUrl(serverUrl),
                    synced: true,
                    from: 'server',
                    updatedAt: new Date()
                  });
                }
              }

              await db.synced_product_ids.put({
                localId: product.localId,
                serverId: serverProductId,
                syncedAt: new Date()
              });

              await db.products_offline_add.delete(product.localId);
            }
          );

          // Update dependent offline stockins — separate transaction with smaller scope.
          // Re-query fresh each iteration so updated rows fall out of the result set.
          await db.transaction('rw', db.stockins_offline_add, db.stockins_offline_update, async () => {
            while (true) {
              const chunk = await db.stockins_offline_add
                .where('productId').equals(product.localId).limit(50).toArray();
              if (chunk.length === 0) break;
              for (const stockin of chunk) {
                await db.stockins_offline_add.update(stockin.localId, { productId: serverProductId });
                console.log(`✅ Updated stockin ${stockin.localId} productId: ${product.localId} → ${serverProductId}`);
              }
            }
            while (true) {
              const chunk = await db.stockins_offline_update
                .where('productId').equals(product.localId).limit(50).toArray();
              if (chunk.length === 0) break;
              for (const stockin of chunk) {
                await db.stockins_offline_update.update(stockin.id, { productId: serverProductId });
                console.log(`✅ Updated stockin update ${stockin.id} productId: ${product.localId} → ${serverProductId}`);
              }
            }
          });

          // Unblock any stockins that were waiting for this product to sync
          await resolveWaitingChildren('product', product.localId);

          console.log(`✅ Successfully synced product ${product.localId} → ${serverProductId}`);
          processed++;

        } catch (error) {
          console.error(`❌ Error syncing product ${product.localId}:`, error);

          const retryCount = (product.syncRetryCount || 0) + 1;
          const maxRetries = 5;

          if (retryCount >= maxRetries) {
            console.log(`🚫 Moving product ${product.localId} to dead-letter queue`);
            await moveToDeadLetter(
              'product', product, error.message,
              () => this.cleanupSyncedProduct(product.localId)
            );
          } else {
            await db.products_offline_add.update(product.localId, {
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
    const unsyncedUpdates = await db.products_offline_update.toArray();
    console.log('******** => + UPDATING UNSYNCED PRODUCTS ', unsyncedUpdates.length);

    let processed = 0;
    let errors = 0;

    for (const product of unsyncedUpdates) {
      if (this.mutex.isLocked(product.id)) continue;
      this.mutex.run(product.id, async () => {
        try {
          const images = await db.product_images
            .where('[entityId+entityType]').equals([product.id, 'product'])
            .and(img => !img.synced).toArray();

          const productData = {
            productName: product.productName,
            brand: product.brand,
            categoryId: product.categoryId,
            description: product.description,
            adminId: product.adminId,
            employeeId: product.employeeId,
            lastModified: product.lastModified,
            newImages: images
              .filter(img => img.from === 'local' && img.imageData instanceof Blob)
              .map((img, index) => new File([img.imageData], `image_${product.id}_${index}.png`, { type: img.imageData.type })),
            keepImages: images.filter(img => img.synced).map(img => img.imageData)
          };

          const response = await productService.updateProduct(product.id, productData);

          await db.transaction('rw', db.products_all, db.product_images, db.products_offline_update, async () => {
            await db.products_all.put({
              id: product.id,
              productName: product.productName,
              brand: product.brand,
              categoryId: product.categoryId,
              description: product.description,
              lastModified: response?.product?.createdAt || new Date(),
              updatedAt: response?.product?.updatedAt || new Date()
            });

            const serverImageUrls = response.product?.imageUrls || [];
            if (serverImageUrls.length > 0) {
              await db.product_images.where('[entityId+entityType]').equals([product.id, 'product']).delete();
              for (const url of serverImageUrls) {
                await db.product_images.add({
                  entityId: product.id,
                  entityLocalId: null,
                  entityType: 'product',
                  imageData: productService.getFullImageUrl(url),
                  synced: true,
                  from: 'server',
                  createdAt: new Date(),
                  updatedAt: new Date()
                });
              }
            }
            await db.products_offline_update.delete(product.id);
          });

          processed++;
        } catch (error) {
          console.error(`Error syncing product update ${product.id}:`, error);
          const retryCount = (product.syncRetryCount || 0) + 1;
          if (retryCount >= 5) {
            await db.products_offline_update.delete(product.id);
          } else {
            await db.products_offline_update.update(product.id, {
              syncError: error.message,
              syncRetryCount: retryCount,
              lastSyncAttempt: new Date()
            });
          }
          errors++;
        }
      });
    }

    return { processed, errors, total: unsyncedUpdates.length };
  }

  async syncDeletedProducts() {
    const deletedProducts = await db.products_offline_delete.toArray();
    console.log('******** => + DELETING UNSYNCED PRODUCTS ', deletedProducts.length);

    let processed = 0;
    let errors = 0;

    for (const deletedProduct of deletedProducts) {
      try {
        await productService.deleteProduct(deletedProduct.id, {
          adminId: deletedProduct.adminId,
          employeeId: deletedProduct.employeeId
        });

        await db.transaction('rw', db.products_all, db.product_images, db.products_offline_delete, db.synced_product_ids, async () => {
          await db.products_all.delete(deletedProduct.id);
          await db.product_images.where('[entityId+entityType]').equals([deletedProduct.id, 'product']).delete();
          await db.products_offline_delete.delete(deletedProduct.id);
          const syncRecord = await db.synced_product_ids.where('serverId').equals(deletedProduct.id).first();
          if (syncRecord) await db.synced_product_ids.delete(syncRecord.localId);
        });

        processed++;
      } catch (error) {
        if (error.status === 404) {
          await db.transaction('rw', db.products_all, db.product_images, db.products_offline_delete, async () => {
            await db.products_all.delete(deletedProduct.id);
            await db.product_images.where('[entityId+entityType]').equals([deletedProduct.id, 'product']).delete();
            await db.products_offline_delete.delete(deletedProduct.id);
          });
          processed++;
          continue;
        }

        console.error('Error syncing product delete:', error);
        const retryCount = (deletedProduct.syncRetryCount || 0) + 1;
        if (retryCount >= 5) {
          await db.products_offline_delete.delete(deletedProduct.id);
        } else {
          await db.products_offline_delete.update(deletedProduct.id, {
            syncError: error.message,
            syncRetryCount: retryCount,
            lastSyncAttempt: new Date()
          });
        }
        errors++;
      }
    }

    return { processed, errors, total: deletedProducts.length };
  }

  async fetchAndUpdateLocal(onProgress = null) {
    const meta = await db.sync_metadata.get('products');
    const lastSyncedAt = meta?.lastSyncedAt || null;
    const startOffset = meta?.pendingFetchOffset || 0;
    const LIMIT = 200;
    let offset = startOffset;
    let totalFetched = 0;
    let isFirstPage = (offset === 0);

    while (true) {
      let result;
      try {
        result = await productService.getAllProducts(lastSyncedAt, { limit: LIMIT, offset });
      } catch (fetchError) {
        console.error('[products] Fetch failed — local data preserved:', fetchError);
        return;
      }

      const { data: updatedRecords = [], deletedIds = [] } = result;

      if (isFirstPage && !lastSyncedAt && updatedRecords.length === 0) {
        console.warn('[products] Empty full-fetch — skipping to preserve local data');
        return;
      }

      await db.transaction('rw', db.products_all, db.product_images, db.synced_product_ids, async () => {
        if (isFirstPage && !lastSyncedAt) {
          await db.products_all.clear();
          await db.product_images.where('from').equals('server').delete();
        }

        for (const serverProduct of updatedRecords) {
          await db.products_all.put({
            id: serverProduct.id,
            productName: serverProduct.productName,
            brand: serverProduct.brand,
            categoryId: serverProduct.categoryId,
            description: serverProduct.description,
            lastModified: serverProduct.createdAt || new Date(),
            updatedAt: serverProduct.updatedAt || new Date()
          });

          if (serverProduct.imageUrls?.length > 0) {
            await db.product_images
              .where('[entityId+entityType]').equals([serverProduct.id, 'product'])
              .and(img => img.from === 'server').delete();

            for (const url of serverProduct.imageUrls) {
              await db.product_images.add({
                entityId: serverProduct.id,
                entityLocalId: null,
                entityType: 'product',
                imageData: productService.getFullImageUrl(url),
                synced: true,
                from: 'server',
                createdAt: new Date(),
                updatedAt: new Date()
              });
            }
          }
        }

        for (const id of deletedIds) {
          await db.products_all.delete(id);
          await db.product_images.where('[entityId+entityType]').equals([id, 'product']).delete();
          const mapping = await db.synced_product_ids.where('serverId').equals(id).first();
          if (mapping) await db.synced_product_ids.delete(mapping.localId);
        }
      });

      totalFetched += updatedRecords.length;
      onProgress?.({ entity: 'products', fetched: totalFetched });

      // Save progress after each page
      await db.sync_metadata.put({
        entity: 'products',
        lastSyncedAt: lastSyncedAt || null,
        pendingFetchOffset: offset + updatedRecords.length,
        lastFullSyncAt: meta?.lastFullSyncAt || null,
      });

      if (updatedRecords.length < LIMIT) break;
      offset += LIMIT;
      isFirstPage = false;
    }

    await db.sync_metadata.put({
      entity: 'products',
      lastSyncedAt: new Date().toISOString(),
      pendingFetchOffset: 0,
      lastFullSyncAt: !lastSyncedAt ? new Date().toISOString() : (meta?.lastFullSyncAt || null),
    });
  }

  async checkForContentDuplicate(product) {
    const timeWindow = 10 * 60 * 1000;
    const cutoffTime = new Date(Date.now() - timeWindow);
    const count = await db.products_all
      .where('productName').equals(product.productName)
      .and(item =>
        item.brand === product.brand &&
        item.categoryId === product.categoryId &&
        item.description === product.description &&
        new Date(item.updatedAt || item.lastModified) > cutoffTime
      )
      .count();
    return count > 0;
  }

  generateIdempotencyKey(product) {
    const timestamp = product.createdAt?.getTime() || product.lastModified?.getTime() || Date.now();
    return `product-${product.localId}-${timestamp}-${product.productName.replace(/\s+/g, '-').toLowerCase()}`;
  }

  async cleanupSyncedProduct(localId) {
    await db.transaction('rw', db.products_offline_add, db.product_images, async () => {
      await db.products_offline_add.delete(localId);
      await db.product_images
        .where('[entityLocalId+entityType]').equals([localId, 'product'])
        .and(img => !img.synced).delete();
    });
  }

  async getSyncStatus() {
    const unsyncedAdds = await db.products_offline_add.count();
    const unsyncedUpdates = await db.products_offline_update.count();
    const pendingDeletes = await db.products_offline_delete.count();
    const unsyncedImages = await db.product_images.where('synced').equals(0).and(img => img.entityType === 'product').count();
    const totalProducts = await db.products_all.count() + unsyncedAdds + unsyncedUpdates;
    const totalImages = await db.product_images.where('entityType').equals('product').count();
    const syncedIdsCount = await db.synced_product_ids.count();

    return {
      totalProducts,
      unsyncedProducts: unsyncedAdds + unsyncedUpdates,
      pendingDeletes,
      totalImages,
      unsyncedImages,
      syncedIdsCount,
      isOnline: await isOnline(),
      isSyncing: this.isSyncing,
      lastSync: this.lastSyncTime ? new Date(this.lastSyncTime) : null
    };
  }

  async forceSync() {
    if (this.syncLock) await this.syncLock;
    return this.syncProducts();
  }

  async cleanupFailedSyncs() {
    const maxRetries = 5;
    const failedAdds = await db.products_offline_add.where('syncRetryCount').above(maxRetries).toArray();
    for (const failed of failedAdds) await this.cleanupSyncedProduct(failed.localId);
    await db.products_offline_update.where('syncRetryCount').above(maxRetries).delete();
    await db.products_offline_delete.where('syncRetryCount').above(maxRetries).delete();
  }

  setupAutoSync() {
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('focus', this.handleFocus.bind(this));
    this.cleanupInterval = setInterval(() => this.cleanupFailedSyncs(), 30 * 60 * 1000);
  }

  async handleOnline() {
    console.log('🌐 Network is back online, starting product sync...');
    setTimeout(() => this.syncProducts(), 1000);
  }

  async handleFocus() {
    if ((await isOnline()) && !this.isSyncing && !this.syncLock) {
      setTimeout(() => this.syncProducts(), 500);
    }
  }

  cleanup() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('focus', this.handleFocus);
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
  }
}

export const productSyncService = new ProductSyncService();
