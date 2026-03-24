import { db } from '../../db/database';
import productService from '../productService';
import { isOnline } from '../../utils/networkUtils';

class ProductSyncService {
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

  async syncProducts() {
    // 🔒 Prevent concurrent syncs with a promise-based lock
    if (this.syncLock) {
      console.log('Product sync already in progress, waiting for completion...');
      await this.syncLock;
      return { success: false, };
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
    console.log('🔄 Starting product sync process...');

    try {
      const results = {
        adds: await this.syncUnsyncedAdds(),
        updates: await this.syncUnsyncedUpdates(),
        deletes: await this.syncDeletedProducts()
      };

      // Always fetch — fetchAndUpdateLocal() handles delta vs full internally
      await this.fetchAndUpdateLocal();

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
    const unsyncedAdds = await db.products_offline_add.toArray();
    console.log('******** => + ADDING UNSYNCED PRODUCTS ', unsyncedAdds.length);

    let processed = 0;
    let skipped = 0;
    let errors = 0;

    for (const product of unsyncedAdds) {
      // 🔒 Skip if already being processed
      if (this.processingLocalIds.has(product.localId)) {
        console.log(`⏭️ Skipping product ${product.localId} - already processing`);
        skipped++;
        continue;
      }

      // Exponential backoff: skip if not enough time has passed since last failure
      if (!this.shouldRetryNow(product)) {
        skipped++;
        continue;
      }

      this.processingLocalIds.add(product.localId);

      try {
        // ✅ Double-check if already synced (race condition protection)
        const syncedRecord = await db.synced_product_ids
          .where('localId')
          .equals(product.localId)
          .first();

        if (syncedRecord) {
          console.log(`✓ Product ${product.localId} already synced to server ID ${syncedRecord.serverId}`);
          await this.cleanupSyncedProduct(product.localId);
          skipped++;
          continue;
        }



        // 🔍 Check for potential content duplicates
        const isDuplicateContent = await this.checkForContentDuplicate(product);
        if (isDuplicateContent) {
          console.log(`🔍 Duplicate product content detected for ${product.localId}, removing from queue`);
          await this.cleanupSyncedProduct(product.localId);
          skipped++;
          continue;
        }

        // 🖼️ Get associated images
        const images = await db.product_images
          .where('[entityLocalId+entityType]')
          .equals([product.localId, 'product'])
          .and(img => !img.synced)
          .toArray();

        // 📦 Prepare data with idempotency key
        const productData = {
          productName: product.productName,
          brand: product.brand,
          categoryId: product.categoryId,
          description: product.description,
          adminId: product.adminId,
          employeeId: product.employeeId,
          // 🔑 Idempotency key for backend deduplication
          idempotencyKey: this.generateIdempotencyKey(product),
          clientId: product.localId,
          clientTimestamp: product.createdAt || product.lastModified,
          images: images
            .filter(img => img.from === 'local' && img.imageData instanceof Blob)
            .map((img, index) => new File([img.imageData], `image_${product.localId}_${index}.png`, {
              type: img.imageData.type
            }))
        };

        console.log(`📤 Sending product ${product.localId} to server...`);

        // 🌐 Send to server with error handling
        let response;
        try {
          response = await productService.createProduct(productData);
        } catch (apiError) {
          // Handle specific API errors
          if (apiError.status === 409 || apiError.message?.includes('duplicate')) {
            console.log(`⚠️ Server detected duplicate for product ${product.localId}, removing from queue`);
            await this.cleanupSyncedProduct(product.localId);
            skipped++;
            continue;
          }
          throw apiError; // Re-throw other errors
        }

        const serverProductId = response.product?.id || response.id;
        if (!serverProductId) {
          throw new Error('Server did not return a valid product ID');
        }

        // 💾 Update local database atomically
        await db.transaction('rw', db.products_all, db.product_images, db.products_offline_add, db.synced_product_ids, db.stockins_offline_add, db.stockins_offline_update, async () => {
          // Check for existing record in products_all
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
            console.log(`📝 Updating existing product ${serverProductId}`);
            await db.products_all.update(serverProductId, productRecord);
          } else {
            console.log(`➕ Adding new product ${serverProductId}`);
            await db.products_all.add(productRecord);
          }

          // 🖼️ Handle image URLs from server
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

          // Record the sync relationship
          await db.synced_product_ids.put({
            localId: product.localId,
            serverId: serverProductId,
            syncedAt: new Date()
          });


          const relatedStockIns = await db.stockins_offline_add
            .where('productId')
            .equals(product.localId)
            .toArray();

          if (relatedStockIns.length > 0) {


            for (const stockin of relatedStockIns) {
              await db.stockins_offline_add.update(stockin.localId, {
                productId: serverProductId
              });
              console.log(`✅ Updated stockin ${stockin.localId} product ID: ${product.localId} → ${serverProductId}`);
            }
          }






          const relatedStockInUpdates = await db.stockins_offline_update
            .where('productId')
            .equals(product.localId)
            .toArray();

          if (relatedStockInUpdates.length > 0) {


            for (const stockin of relatedStockInUpdates) {
              await db.stockins_offline_update.update(stockin.id, {
                productId: serverProductId
              });
              console.log(`✅ Updated stockin update ${stockin.id} product ID: ${product.localId} → ${serverProductId}`);
            }


          }
          // Remove from offline queue
          await db.products_offline_add.delete(product.localId);
        });

        console.log(`✅ Successfully synced product ${product.localId} → ${serverProductId}`);
        processed++;

      } catch (error) {
        console.error(`❌ Error syncing product ${product.localId}:`, error);

        const retryCount = (product.syncRetryCount || 0) + 1;
        const maxRetries = 5;

        if (retryCount >= maxRetries) {
          console.log(`🚫 Max retries reached for product ${product.localId}, removing from queue`);
          await this.cleanupSyncedProduct(product.localId);
        } else {
          await db.products_offline_add.update(product.localId, {
            syncError: error.message,
            syncRetryCount: retryCount,
            lastSyncAttempt: new Date()
          });
        }
        errors++;
      } finally {
        this.processingLocalIds.delete(product.localId);
      }
    }

    return { processed, skipped, errors, total: unsyncedAdds.length };
  }



  async syncUnsyncedUpdates() {
    const unsyncedUpdates = await db.products_offline_update.toArray();
    console.log('******** => + UPDATING UNSYNCED PRODUCTS ', unsyncedUpdates.length);

    let processed = 0;
    let errors = 0;

    for (const product of unsyncedUpdates) {
      // Skip if being processed concurrently
      if (this.processingLocalIds.has(product.id)) {
        continue;
      }
      this.processingLocalIds.add(product.id);

      try {
        const images = await db.product_images
          .where('[entityId+entityType]')
          .equals([product.id, 'product'])
          .and(img => !img.synced)
          .toArray();

        const productData = {
          productName: product.productName,
          brand: product.brand,
          categoryId: product.categoryId,
          description: product.description,
          adminId: product.adminId,
          employeeId: product.employeeId,
          lastModified: product.lastModified, // For optimistic locking
          newImages: images
            .filter(img => img.from === 'local' && img.imageData instanceof Blob)
            .map((img, index) => new File([img.imageData], `image_${product.id}_${index}.png`, {
              type: img.imageData.type
            })),
          keepImages: images
            .filter(img => img.synced)
            .map(img => img.imageData)
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

          // Update images - only remove and re-add if server returned new URLs
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
      } finally {
        this.processingLocalIds.delete(product.id);
      }
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

          // Clean up sync tracking
          const syncRecord = await db.synced_product_ids
            .where('serverId')
            .equals(deletedProduct.id)
            .first();
          if (syncRecord) {
            await db.synced_product_ids.delete(syncRecord.localId);
          }
        });

        processed++;
      } catch (error) {
        // If item doesn't exist on server (404), consider it successfully deleted
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

  async fetchAndUpdateLocal() {
    // Read last sync timestamp from sync_metadata
    const meta = await db.sync_metadata.get('products');
    const lastSyncedAt = meta?.lastSyncedAt || null;

    // Fetch from server outside any transaction — bail on error without touching DB
    let result;
    try {
      result = await productService.getAllProducts(lastSyncedAt);
    } catch (fetchError) {
      console.error('[products] Fetch failed — local data preserved:', fetchError);
      return;
    }

    const { data: updatedRecords, deletedIds = [] } = result;
    console.log(`[products] Delta sync: ${updatedRecords?.length ?? 0} updated, ${deletedIds.length} deleted`);

    // Guard: if first-time full fetch returns nothing, don't wipe
    if (!lastSyncedAt && (!Array.isArray(updatedRecords) || updatedRecords.length === 0)) {
      console.warn('[products] Empty full-fetch response — skipping to preserve local data');
      return;
    }

    // Apply changes atomically
    await db.transaction('rw', db.products_all, db.product_images, db.synced_product_ids, db.sync_metadata, async () => {
      if (!lastSyncedAt) {
        // First-ever sync: replace all
        await db.products_all.clear();
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
            await db.product_images.where('[entityId+entityType]').equals([serverProduct.id, 'product']).and(img => img.from === 'server').delete();
            for (const url of serverProduct.imageUrls) {
              await db.product_images.add({ entityId: serverProduct.id, entityLocalId: null, entityType: 'product', imageData: productService.getFullImageUrl(url), synced: true, from: 'server', createdAt: new Date(), updatedAt: new Date() });
            }
          }
        }
      } else {
        // Delta sync: upsert changed records
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
            await db.product_images.where('[entityId+entityType]').equals([serverProduct.id, 'product']).and(img => img.from === 'server').delete();
            for (const url of serverProduct.imageUrls) {
              await db.product_images.add({ entityId: serverProduct.id, entityLocalId: null, entityType: 'product', imageData: productService.getFullImageUrl(url), synced: true, from: 'server', createdAt: new Date(), updatedAt: new Date() });
            }
          }
        }
        // Remove server-deleted records
        for (const id of deletedIds) {
          await db.products_all.delete(id);
          await db.product_images.where('[entityId+entityType]').equals([id, 'product']).delete();
          const mapping = await db.synced_product_ids.where('serverId').equals(id).first();
          if (mapping) await db.synced_product_ids.delete(mapping.localId);
        }
      }

      // Update per-entity sync timestamp
      await db.sync_metadata.put({
        entity: 'products',
        lastSyncedAt: new Date().toISOString(),
        lastFullSyncAt: !lastSyncedAt ? new Date().toISOString() : (meta?.lastFullSyncAt || null),
      });
    });
  }

  // 🔍 Check for content-based duplicates
  async checkForContentDuplicate(product) {
    const timeWindow = 10 * 60 * 1000; // 10 minutes
    const cutoffTime = new Date(Date.now() - timeWindow);

    const potentialDuplicates = await db.products_all
      .where('productName').equals(product.productName)
      .and(item =>
        item.brand === product.brand &&
        item.categoryId === product.categoryId &&
        item.description === product.description &&
        new Date(item.updatedAt || item.lastModified) > cutoffTime
      )
      .count();

    return potentialDuplicates > 0;
  }

  // 🔑 Generate consistent idempotency key
  generateIdempotencyKey(product) {
    const timestamp = product.createdAt?.getTime() || product.lastModified?.getTime() || Date.now();
    return `product-${product.localId}-${timestamp}-${product.productName.replace(/\s+/g, '-').toLowerCase()}`;
  }

  // 🧹 Clean up synced product and its images
  async cleanupSyncedProduct(localId) {
    await db.transaction('rw', db.products_offline_add, db.product_images, async () => {
      await db.products_offline_add.delete(localId);
      // Clean up any unsynced images for this product
      await db.product_images
        .where('[entityLocalId+entityType]')
        .equals([localId, 'product'])
        .and(img => !img.synced)
        .delete();
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
      processingCount: this.processingLocalIds.size,
      lastSync: this.lastSyncTime ? new Date(this.lastSyncTime) : null
    };
  }

  async forceSync() {
    // Wait for current sync to complete if in progress
    if (this.syncLock) {
      await this.syncLock;
    }
    return this.syncProducts();
  }

  // 🧹 Clean up failed sync attempts
  async cleanupFailedSyncs() {
    const maxRetries = 5;

    const failedAdds = await db.products_offline_add
      .where('syncRetryCount')
      .above(maxRetries)
      .toArray();

    for (const failed of failedAdds) {
      await this.cleanupSyncedProduct(failed.localId);
    }

    await db.products_offline_update
      .where('syncRetryCount')
      .above(maxRetries)
      .delete();

    await db.products_offline_delete
      .where('syncRetryCount')
      .above(maxRetries)
      .delete();
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

}

export const productSyncService = new ProductSyncService();