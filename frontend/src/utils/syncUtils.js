/**
 * Generate a stable idempotency key that is stored with the record at INSERT time.
 * Never call this at sync/retry time — read item.idempotencyKey instead.
 *
 * @param {string} entity  'category' | 'product' | 'stockin' | 'stockout' | 'sales_return'
 * @param {object} data    The object being inserted offline (before it gets a localId)
 * @returns {string}
 */
export function generateStableIdempotencyKey(entity, data) {
  const ts =
    data.createdAt instanceof Date
      ? data.createdAt.getTime()
      : typeof data.createdAt === 'string'
      ? new Date(data.createdAt).getTime()
      : Date.now();
  // 6-char random suffix ensures uniqueness even for bulk inserts in the same ms
  const random = Math.random().toString(36).slice(2, 8);
  return `${entity}-${ts}-${random}`;
}

/**
 * Process a Dexie collection in fixed-size chunks to avoid loading everything
 * into memory at once. Safe to use inside Dexie transactions.
 *
 * For queries where the indexed field CHANGES after each update (e.g. updating
 * productId from localId to serverId), use processUpdateInChunks instead.
 *
 * @param {Dexie.Collection} collection - e.g. db.stockins_offline_add.orderBy('localId')
 * @param {Function} processFn          - async (records: T[]) => void
 * @param {number}   chunkSize
 */
export async function processInChunks(collection, processFn, chunkSize = 100) {
  let offset = 0;
  while (true) {
    const chunk = await collection.offset(offset).limit(chunkSize).toArray();
    if (chunk.length === 0) break;
    await processFn(chunk);
    if (chunk.length < chunkSize) break;
    offset += chunkSize;
  }
}

/**
 * Process a Dexie collection in chunks where the indexed field changes after
 * each update. Re-queries from offset 0 each time so updated records fall out
 * of the result set naturally.
 *
 * @param {Function} getCollection - () => Dexie.Collection  (called fresh each chunk)
 * @param {Function} processFn     - async (records: T[]) => void
 * @param {number}   chunkSize
 */
export async function processUpdateInChunks(getCollection, processFn, chunkSize = 50) {
  while (true) {
    const chunk = await getCollection().limit(chunkSize).toArray();
    if (chunk.length === 0) break;
    await processFn(chunk);
  }
}

/**
 * Register a Background Sync event so the service worker can trigger a sync
 * when the browser regains connectivity, even if the app is closed.
 * Silently no-ops if the Background Sync API is not available.
 */
export async function requestBackgroundSync() {
  try {
    const reg = await navigator.serviceWorker?.ready;
    if (reg && 'sync' in reg) {
      await reg.sync.register('offline-queue-sync');
    }
  } catch {
    // Not available on this browser — sync will still happen when the app opens
  }
}
