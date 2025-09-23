// ./db/database.js
import Dexie from 'dexie';

export class AppDatabase extends Dexie {
  constructor() {
    super('AppDatabase');

    // Define schema version
    this.version(15).stores({
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
      stockins_offline_add: '++localId, productId, quantity, offlineQuantity, price, sellingPrice, supplier, adminId, employeeId, lastModified, createdAt, updatedAt',
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
    })
    .upgrade(trans => {
      // simple migration - move records if needed
      const safeMove = async (from, to) => {
        try {
          await from.toCollection().modify(async record => {
            if (record.id) {
              await to.put(record);
              await from.delete(record.localId);
            }
          });
        } catch (e) {
          console.warn("Migration skipped:", e);
        }
      };

      safeMove(trans.products_offline_add, trans.products_offline_update);
      safeMove(trans.categories_offline_add, trans.categories_offline_update);
      safeMove(trans.stockins_offline_add, trans.stockins_offline_update);
      safeMove(trans.stockouts_offline_add, trans.stockouts_offline_update);
      safeMove(trans.sales_returns_offline_add, trans.sales_returns_offline_update);
      safeMove(trans.sales_return_items_offline_add, trans.sales_return_items_offline_update);
    });

    // Assign tables
    this.products_all = this.table('products_all');
    this.products_offline_add = this.table('products_offline_add');
    this.products_offline_update = this.table('products_offline_update');
    this.products_offline_delete = this.table('products_offline_delete');
    this.product_images = this.table('product_images');
    this.synced_product_ids = this.table('synced_product_ids');

    this.categories_all = this.table('categories_all');
    this.categories_offline_add = this.table('categories_offline_add');
    this.categories_offline_update = this.table('categories_offline_update');
    this.categories_offline_delete = this.table('categories_offline_delete');
    this.synced_category_ids = this.table('synced_category_ids');

    this.stockins_all = this.table('stockins_all');
    this.stockins_offline_add = this.table('stockins_offline_add');
    this.stockins_offline_update = this.table('stockins_offline_update');
    this.stockins_offline_delete = this.table('stockins_offline_delete');
    this.synced_stockin_ids = this.table('synced_stockin_ids');

    this.stockouts_all = this.table('stockouts_all');
    this.stockouts_offline_add = this.table('stockouts_offline_add');
    this.stockouts_offline_update = this.table('stockouts_offline_update');
    this.stockouts_offline_delete = this.table('stockouts_offline_delete');
    this.synced_stockout_ids = this.table('synced_stockout_ids');

    this.backorders_all = this.table('backorders_all');
    this.backorders_offline_add = this.table('backorders_offline_add');

    this.sales_returns_all = this.table('sales_returns_all');
    this.sales_returns_offline_add = this.table('sales_returns_offline_add');
    this.sales_returns_offline_update = this.table('sales_returns_offline_update');
    this.sales_returns_offline_delete = this.table('sales_returns_offline_delete');
    this.synced_sales_return_ids = this.table('synced_sales_return_ids');

    this.sales_return_items_all = this.table('sales_return_items_all');
    this.sales_return_items_offline_add = this.table('sales_return_items_offline_add');
    this.sales_return_items_offline_update = this.table('sales_return_items_offline_update');
    this.sales_return_items_offline_delete = this.table('sales_return_items_offline_delete');
    this.synced_sales_return_item_ids = this.table('synced_sales_return_item_ids');

    this.admins_all = this.table('admins_all');
    this.employees_all = this.table('employees_all');
  }
}

// Create DB safely
export const db = new AppDatabase();

// Try to open it safely
db.open().catch(async err => {
  console.error("Failed to open DB:", err);

  if (err.name === 'DatabaseClosedError' || err.name === 'VersionError' || err.name === 'UnknownError') {
    console.warn("Clearing corrupted DB...");
    await Dexie.delete('AppDatabase');
    window.location.reload();
  }
});
