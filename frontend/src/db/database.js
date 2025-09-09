// ./db/database.js
import Dexie from 'dexie';

export class AppDatabase extends Dexie {
  constructor() {
    super('AppDatabase');

    this.version(14).stores({
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
      stockouts_all: 'id, stockinId, quantity, soldPrice, backorderId, clientName, clientEmail, clientPhone, paymentMethod, adminId, employeeId, transactionId, lastModified, createdAt, updatedAt',
      stockouts_offline_add: '++localId, stockinId, quantity, offlineQuantity, backorderLocalId, soldPrice, clientName, clientEmail, clientPhone, paymentMethod, adminId, employeeId, transactionId, lastModified, createdAt, updatedAt',
      stockouts_offline_update: 'id, stockinId, quantity, backorderUpdateId, soldPrice, clientName, clientEmail, clientPhone, paymentMethod, adminId, employeeId, transactionId, lastModified, updatedAt',
      stockouts_offline_delete: 'id, deletedAt, adminId, employeeId',
      synced_stockout_ids: 'localId, serverId, syncedAt',

      // backorder
      backorders_all: 'id, quantity, soldPrice, productName, adminId, employeeId, lastModified, createdAt, updatedAt',
      backorders_offline_add: '++localId, quantity, soldPrice, productName, adminId, employeeId, lastModified, createdAt, updatedAt',

      // sales return
      sales_returns_all: 'id, transactionId, creditnoteId, reason, createdAt',
      sales_returns_offline_add: '++localId, transactionId, creditnoteId, reason, adminId, employeeId, createdAt',
      sales_returns_offline_update: 'id, transactionId, creditnoteId, reason, adminId, employeeId, updatedAt',
      sales_returns_offline_delete: 'id, deletedAt, adminId, employeeId',
      synced_sales_return_ids: 'localId, serverId, syncedAt',

      // sales return items
      sales_return_items_all: 'id, salesReturnId, stockoutId, quantity',
      sales_return_items_offline_add: '++localId, salesReturnId, stockoutId, quantity, adminId, employeeId, createdAt',
      sales_return_items_offline_update: 'id, salesReturnId, stockoutId, quantity, adminId, employeeId, updatedAt',
      sales_return_items_offline_delete: 'id, deletedAt, adminId, employeeId',
      synced_sales_return_item_ids: 'localId, serverId, syncedAt',

      // employee
      employees_all: "id, firstname, lastname, email, phoneNumber, address, status, profileImg, cv, identityCard, password, encryptedPassword, isLocked, createdAt, updatedAt",
      // admin
      admins_all: "id, adminName, adminEmail, password, encryptedPassword, isLocked, createdAt, updatedAt",
    }).upgrade(trans => {
      // migrate existing data logic (optional for new tables)
      trans.products_offline_add?.toCollection().modify(record => {
        if (record.id) {
          trans.products_offline_update.put(record);
          trans.products_offline_add.delete(record.localId);
        }
      });

      trans.categories_offline_add?.toCollection().modify(record => {
        if (record.id) {
          trans.categories_offline_update.put(record);
          trans.categories_offline_add.delete(record.localId);
        }
      });

      trans.stockins_offline_add?.toCollection().modify(record => {
        if (record.id) {
          trans.stockins_offline_update.put(record);
          trans.stockins_offline_add.delete(record.localId);
        }
      });

      trans.stockouts_offline_add?.toCollection().modify(record => {
        if (record.id) {
          trans.stockouts_offline_update.put(record);
          trans.stockouts_offline_add.delete(record.localId);
        }
      });

      trans.backorders_offline_add?.toCollection().modify(record => {
        if (record.id) {
          // if you have a backorders_offline_update table, move here
          // trans.backorders_offline_update.put(record);
          // else just leave it
        }
      });

      trans.sales_returns_offline_add?.toCollection().modify(ret => {
        if (ret.id) {
          trans.sales_returns_offline_update.put(ret);
          trans.sales_returns_offline_add.delete(ret.localId);
        }
      });

      trans.sales_return_items_offline_add?.toCollection().modify(item => {
        if (item.id) {
          trans.sales_return_items_offline_update.put(item);
          trans.sales_return_items_offline_add.delete(item.localId);
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

    // sales return
    this.sales_returns_all = this.table('sales_returns_all');
    this.sales_returns_offline_add = this.table('sales_returns_offline_add');
    this.sales_returns_offline_update = this.table('sales_returns_offline_update');
    this.sales_returns_offline_delete = this.table('sales_returns_offline_delete');
    this.synced_sales_return_ids = this.table('synced_sales_return_ids');

    // sales return items
    this.sales_return_items_all = this.table('sales_return_items_all');
    this.sales_return_items_offline_add = this.table('sales_return_items_offline_add');
    this.sales_return_items_offline_update = this.table('sales_return_items_offline_update');
    this.sales_return_items_offline_delete = this.table('sales_return_items_offline_delete');
    this.synced_sales_return_item_ids = this.table('synced_sales_return_item_ids');

    // admins
    this.admins_all = this.table('admins_all');

    // employees
    this.employees_all = this.table('employees_all');
  }
}

export const db = new AppDatabase();
