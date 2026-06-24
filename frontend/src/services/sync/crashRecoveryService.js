import { db } from '../../db/database';

const ENTITY_TABLES = {
  category:     { syncedIds: () => db.synced_category_ids,     offlineAdd: () => db.categories_offline_add },
  product:      { syncedIds: () => db.synced_product_ids,      offlineAdd: () => db.products_offline_add },
  stockin:      { syncedIds: () => db.synced_stockin_ids,      offlineAdd: () => db.stockins_offline_add },
  stockout:     { syncedIds: () => db.synced_stockout_ids,     offlineAdd: () => db.stockouts_offline_add },
  sales_return: { syncedIds: () => db.synced_sales_return_ids, offlineAdd: () => db.sales_returns_offline_add },
};

/**
 * Write a crash-safety marker before saving server-confirmed data to IndexedDB.
 *
 * Pattern:
 *   1. Server returns success
 *   2. writeRecoveryMarker(...)   ← if crash here, recoverAll() will finish
 *   3. db.transaction(...)        ← main local save
 *   4. clearRecoveryMarker(...)
 *
 * @param {string}   entity      'stockin'|'stockout'|'product'|'category'|'sales_return'
 * @param {string}   markerKey   Unique key (e.g. localId.toString() or transactionId)
 * @param {number[]} localIds    Local IDs of items confirmed by server
 * @param {number[]} serverIds   Corresponding server IDs
 */
export async function writeRecoveryMarker(entity, markerKey, localIds, serverIds) {
  await db.entity_pending_cleanup.put({
    compositeKey: `${entity}:${markerKey}`,
    entity,
    localIds,
    serverIds,
    confirmedAt: new Date(),
  }).catch(err => console.warn('[crashRecovery] Could not write marker:', err));
}

/**
 * Remove the crash-safety marker after the local transaction completes.
 */
export async function clearRecoveryMarker(entity, markerKey) {
  await db.entity_pending_cleanup
    .delete(`${entity}:${markerKey}`)
    .catch(() => {});
}

/**
 * Called at app startup (and at the start of each full sync cycle).
 * For any marker that was written but never cleared (i.e. the app crashed
 * between server confirmation and the local Dexie commit), this function
 * writes the synced_*_ids mappings and removes the item from the offline queue
 * — exactly what the interrupted transaction was supposed to do.
 */
export async function recoverAll() {
  try {
    // Handle legacy stockout_pending_cleanup rows
    await recoverLegacyStockoutCleanups();

    const pending = await db.entity_pending_cleanup.toArray();
    if (pending.length === 0) return;

    console.log(`[crashRecovery] Recovering ${pending.length} interrupted sync(s)...`);

    for (const entry of pending) {
      const tables = ENTITY_TABLES[entry.entity];
      if (!tables) {
        console.warn(`[crashRecovery] Unknown entity "${entry.entity}" — skipping`);
        await db.entity_pending_cleanup.delete(entry.compositeKey);
        continue;
      }

      const syncedIds = tables.syncedIds();
      const offlineAdd = tables.offlineAdd();

      for (let i = 0; i < entry.localIds.length; i++) {
        const localId = entry.localIds[i];
        const serverId = entry.serverIds[i];
        if (localId == null || serverId == null) continue;

        await syncedIds.put({ localId, serverId, syncedAt: entry.confirmedAt || new Date() });
        await offlineAdd.delete(localId).catch(() => {});
      }

      await db.entity_pending_cleanup.delete(entry.compositeKey);
      console.log(`[crashRecovery] Recovered ${entry.entity} marker ${entry.compositeKey}`);
    }
  } catch (error) {
    console.warn('[crashRecovery] recoverAll failed:', error);
  }
}

async function recoverLegacyStockoutCleanups() {
  try {
    const legacy = await db.stockout_pending_cleanup.toArray();
    if (legacy.length === 0) return;

    for (const entry of legacy) {
      for (let i = 0; i < entry.localIds.length; i++) {
        const localId = entry.localIds[i];
        const serverId = entry.serverIds[i];
        if (localId == null || serverId == null) continue;
        await db.synced_stockout_ids.put({ localId, serverId, syncedAt: entry.confirmedAt || new Date() });
        await db.stockouts_offline_add.delete(localId).catch(() => {});
      }
      await db.stockout_pending_cleanup.delete(entry.transactionId);
    }
    console.log(`[crashRecovery] Recovered ${legacy.length} legacy stockout cleanup(s)`);
  } catch (err) {
    console.warn('[crashRecovery] Legacy stockout recovery failed:', err);
  }
}
