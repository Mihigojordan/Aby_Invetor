import Dexie from 'dexie';

export class AppDatabase extends Dexie {
  constructor() {
    super('AppDatabase');

    this.version(13).stores({
      // product
      products_all: 'id, productName, brand, categoryId, lastModified, updatedAt',
      products_offline_add: '++localId, productName, brand, categoryId, description, adminId, employeeId, lastModified, createdAt, updatedAt',
      products_offline_update: 'id, productName, brand, categoryId, description, adminId, employeeId, lastModified, updatedAt',
      products_offline_delete: 'id, deletedAt, adminId, employeeId',
      product_images: '++localId, [entityId+entityType], [entityLocalId+entityType], entityType, synced, imageData, from, createdAt, updatedAt',
      synced_product_ids: 'localId, serverId, syncedAt',
      // category
      categories_all: 'id, name, description, lastModified, updatedAt',
      categories_offline_add: '++localId, name, description, adminId, employeeId, lastModified, createdAt, updatedAt',
      categories_offline_update: 'id, name, description, adminId, employeeId, lastModified, updatedAt',
      categories_offline_delete: 'id, deletedAt, adminId, employeeId',
      synced_category_ids: 'localId, serverId, syncedAt',
      // stockin
      stockins_all: 'id, productId, quantity, price, sellingPrice, supplier, sku, barcodeUrl, lastModified, updatedAt',
      stockins_offline_add: '++localId, productId, quantity, price, sellingPrice, supplier, adminId, employeeId, lastModified, createdAt, updatedAt',
      stockins_offline_update: 'id, productId, quantity, price, sellingPrice, supplier, adminId, employeeId, lastModified, updatedAt',
      stockins_offline_delete: 'id, deletedAt, adminId, employeeId',
      synced_stockin_ids: 'localId, serverId, syncedAt',
      // stockout
      stockouts_all: 'id, stockinId, quantity, soldPrice, backorderId , clientName, clientEmail, clientPhone, paymentMethod, adminId, employeeId, transactionId, lastModified, createdAt, updatedAt',
      stockouts_offline_add: '++localId, stockinId, quantity, backorderLocalId,soldPrice, clientName, clientEmail, clientPhone, paymentMethod, adminId, employeeId, transactionId, lastModified, createdAt, updatedAt',
      stockouts_offline_update: 'id, stockinId, quantity, backorderUpdateId,soldPrice ,clientName, clientEmail, clientPhone, paymentMethod, adminId, employeeId, transactionId, lastModified, updatedAt',
      stockouts_offline_delete: 'id, deletedAt, adminId, employeeId',
      synced_stockout_ids: 'localId, serverId, syncedAt',
      // backorder
      backorders_all: 'id, quantity, soldPrice, productName, adminId, employeeId, lastModified, createdAt, updatedAt',
      backorders_offline_add: '++localId, quantity, soldPrice, productName, adminId, employeeId, lastModified, createdAt, updatedAt',
     
    }).upgrade(trans => {
      trans.products_offline_add?.toCollection().modify(prod => {
        if (prod.id) {
          trans.products_offline_update.put(prod);
          trans.products_offline_add.delete(prod.localId);
        }
      });
      trans.categories_offline_add?.toCollection().modify(cat => {
        if (cat.id) {
          trans.categories_offline_update.put(cat);
          trans.categories_offline_add.delete(cat.localId);
        }
      });
      trans.stockins_offline_add?.toCollection().modify(stock => {
        if (stock.id) {
          trans.stockins_offline_update.put(stock);
          trans.stockins_offline_add.delete(stock.localId);
        }
      });
      trans.stockouts_offline_add?.toCollection().modify(stockout => {
        if (stockout.id) {
          trans.stockouts_offline_update.put(stockout);
          trans.stockouts_offline_add.delete(stockout.localId);
        }
      });
      trans.backorders_offline_add?.toCollection().modify(backorder => {
        if (backorder.id) {
          // if later you add backorders_offline_update, migrate here
          
          trans.backorders_offline_add.delete(backorder.localId);
        }
      });
    });

    // product
    this.products_all = this.table('products_all');
    this.products_offline_add = this.table('products_offline_add');
    this.products_offline_update = this.table('products_offline_update');
    this.products_offline_delete = this.table('products_offline_delete');
    this.product_images = this.table('product_images');
    this.synced_product_ids = this.table('synced_product_ids');
    // category
    this.categories_all = this.table('categories_all');
    this.categories_offline_add = this.table('categories_offline_add');
    this.categories_offline_update = this.table('categories_offline_update');
    this.categories_offline_delete = this.table('categories_offline_delete');
    this.synced_category_ids = this.table('synced_category_ids');
    // stockin
    this.stockins_all = this.table('stockins_all');
    this.stockins_offline_add = this.table('stockins_offline_add');
    this.stockins_offline_update = this.table('stockins_offline_update');
    this.stockins_offline_delete = this.table('stockins_offline_delete');
    this.synced_stockin_ids = this.table('synced_stockin_ids');
    // stockout
    this.stockouts_all = this.table('stockouts_all');
    this.stockouts_offline_add = this.table('stockouts_offline_add');
    this.stockouts_offline_update = this.table('stockouts_offline_update');
    this.stockouts_offline_delete = this.table('stockouts_offline_delete');
    this.synced_stockout_ids = this.table('synced_stockout_ids');
    // backorder
    this.backorders_all = this.table('backorders_all');
    this.backorders_offline_add = this.table('backorders_offline_add');
    
  }
}

export const db = new AppDatabase();
