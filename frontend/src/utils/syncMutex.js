/**
 * Per-key Promise mutex that replaces the non-atomic Set-based processing guard.
 *
 * The old pattern (broken):
 *   if (set.has(id)) skip;
 *   set.add(id);   // ← two concurrent iterations both pass the check above
 *
 * The new pattern (safe):
 *   if (mutex.isLocked(id)) skip;
 *   await mutex.run(id, async () => { ... });
 *
 * Concurrent calls for the same id are serialised — the second call waits for
 * the first to finish. Concurrent calls for DIFFERENT ids run in parallel.
 */
export class ProcessingMutex {
  constructor() {
    this._locks = new Map(); // id → Promise
  }

  /**
   * Run fn exclusively for the given id.
   * If another call for the same id is already running, this call waits for it.
   */
  async run(id, fn) {
    const existing = this._locks.get(id);
    if (existing) await existing;

    let resolve;
    const lock = new Promise(r => { resolve = r; });
    this._locks.set(id, lock);

    try {
      return await fn();
    } finally {
      this._locks.delete(id);
      resolve();
    }
  }

  isLocked(id) {
    return this._locks.has(id);
  }

  clear() {
    this._locks.clear();
  }
}
