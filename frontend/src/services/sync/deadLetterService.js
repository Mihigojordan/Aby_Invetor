import { db } from '../../db/database';

const ENTITY_TABLE_MAP = {
  category:     { add: () => db.categories_offline_add },
  product:      { add: () => db.products_offline_add },
  stockin:      { add: () => db.stockins_offline_add },
  stockout:     { add: () => db.stockouts_offline_add },
  sales_return: { add: () => db.sales_returns_offline_add },
};

/**
 * Move a permanently-failed item from its offline queue into the dead_letter_queue.
 * The item is written to dead_letter_queue FIRST; it is removed from the source
 * table only after that write succeeds, so no data is lost if this call crashes.
 *
 * @param {string}   entity          'category'|'product'|'stockin'|'stockout'|'sales_return'
 * @param {object}   item            Full row from the *_offline_add table
 * @param {string}   errorMessage    Final error message
 * @param {Function} deleteFromQueue async () => void — removes item from source table
 */
export async function moveToDeadLetter(entity, item, errorMessage, deleteFromQueue) {
  await db.dead_letter_queue.add({
    entity,
    localId: item.localId ?? item.id,
    data: JSON.parse(JSON.stringify(item, (_k, v) =>
      v instanceof Blob || v instanceof File ? '[Binary]' : v
    )),
    error: errorMessage,
    failedAt: new Date(),
    retryCount: item.syncRetryCount ?? 5,
  });
  await deleteFromQueue();
}

/**
 * Re-queue a dead-letter item back into its source offline_add table so it will
 * be picked up on the next sync cycle.
 */
export async function retryDeadLetterItem(id) {
  const entry = await db.dead_letter_queue.get(id);
  if (!entry) return;

  const tables = ENTITY_TABLE_MAP[entry.entity];
  if (!tables) throw new Error(`Unknown entity: ${entry.entity}`);

  const table = tables.add();
  await db.transaction('rw', table, db.dead_letter_queue, async () => {
    const { id: _id, ...itemData } = entry.data;
    await table.add({
      ...itemData,
      syncRetryCount: 0,
      syncError: null,
      lastSyncAttempt: null,
    });
    await db.dead_letter_queue.delete(id);
  });
}

/**
 * Permanently discard a dead-letter item.
 */
export async function discardDeadLetterItem(id) {
  await db.dead_letter_queue.delete(id);
}

export async function getDeadLetterCount() {
  return db.dead_letter_queue.count();
}

export async function getDeadLetterItems() {
  return db.dead_letter_queue.orderBy('failedAt').reverse().toArray();
}

/**
 * Retry all dead-letter items for a specific entity (or all entities if omitted).
 */
export async function retryAllDeadLetterItems(entity) {
  const items = entity
    ? await db.dead_letter_queue.where('entity').equals(entity).toArray()
    : await db.dead_letter_queue.toArray();

  for (const item of items) {
    await retryDeadLetterItem(item.id);
  }
}

/**
 * Discard all dead-letter items for a specific entity (or all if omitted).
 */
export async function discardAllDeadLetterItems(entity) {
  if (entity) {
    await db.dead_letter_queue.where('entity').equals(entity).delete();
  } else {
    await db.dead_letter_queue.clear();
  }
}
