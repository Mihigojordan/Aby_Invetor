import { isOnline } from '../../utils/networkUtils';
import { categorySyncService } from './categorySyncService';
import { productSyncService } from './productSyncService';
import { stockInSyncService } from './stockInSyncService';
import { stockOutSyncService } from './stockOutSyncService';
import { salesReturnSyncService } from './salesReturnSyncService';
import { pruneExpiredDependencies } from './syncDependencyService';
import { recoverAll } from './crashRecoveryService';

/**
 * Single global sync lock shared across ALL entities.
 * This prevents any two hooks or event handlers from running concurrent syncs.
 */
let globalSyncLock = null;
let resolveGlobalLock = null;

/**
 * Run a full sync of all entities in dependency order:
 *   Category → Product → StockIn → StockOut → SalesReturn
 *
 * The `await` between each step IS the synchronisation barrier — it completely
 * replaces the hard-coded 2s/10s waits that were causing failures with large data.
 *
 * @param {object}   options
 * @param {boolean}  options.force       Skip waiting if a sync is already running
 * @param {Function} options.onProgress  Optional (entity: string) => void callback
 * @returns {Promise<{success: boolean, results?: object, reason?: string, error?: string}>}
 */
export async function runFullSync({ force = false, onProgress } = {}) {
  if (globalSyncLock) {
    if (!force) {
      // Wait for the in-progress sync to finish, then report deferred
      await globalSyncLock;
      return { success: false, reason: 'deferred — waited for previous sync to complete' };
    }
    // force=true: wait for current sync then run again
    await globalSyncLock;
  }

  if (!(await isOnline())) {
    return { success: false, reason: 'offline' };
  }

  // Acquire global lock
  globalSyncLock = new Promise(resolve => { resolveGlobalLock = resolve; });

  const results = {};
  console.log('[syncOrchestrator] Starting full sync...');

  try {
    // Startup maintenance
    await pruneExpiredDependencies();
    await recoverAll();

    // ── Step 1: Categories (no dependencies) ──────────────────────────────
    onProgress?.('categories');
    results.categories = await categorySyncService.syncUnsyncedAdds();
    await categorySyncService.syncUnsyncedUpdates();
    await categorySyncService.syncDeletedCategories();
    await categorySyncService.fetchAndUpdateLocal(onProgress);

    // ── Step 2: Products (depend on categories) ───────────────────────────
    onProgress?.('products');
    results.products = await productSyncService.syncUnsyncedAdds();
    await productSyncService.syncUnsyncedUpdates();
    await productSyncService.syncDeletedProducts();
    await productSyncService.fetchAndUpdateLocal(onProgress);

    // ── Step 3: StockIns (depend on products) ─────────────────────────────
    onProgress?.('stockins');
    results.stockins = await stockInSyncService.syncUnsyncedAdds();
    await stockInSyncService.syncUnsyncedUpdates();
    await stockInSyncService.syncDeletedStockIns();
    await stockInSyncService.fetchAndUpdateLocal(onProgress);

    // ── Step 4: StockOuts (depend on stockins) ────────────────────────────
    onProgress?.('stockouts');
    results.stockouts = await stockOutSyncService.syncUnsyncedAdds();
    await stockOutSyncService.syncUnsyncedUpdates();
    await stockOutSyncService.syncDeletedStockOuts();
    await stockOutSyncService.fetchAndUpdateLocal(onProgress);

    // ── Step 5: Sales Returns (depend on stockouts) ───────────────────────
    onProgress?.('salesReturns');
    results.salesReturns = await salesReturnSyncService.syncUnsyncedAdds();
    await salesReturnSyncService.fetchAndUpdateLocal(onProgress);

    onProgress?.('done');
    console.log('[syncOrchestrator] Full sync complete', results);
    return { success: true, results };

  } catch (error) {
    console.error('[syncOrchestrator] Full sync failed:', error);
    return { success: false, error: error.message, results };
  } finally {
    resolveGlobalLock?.();
    globalSyncLock = null;
    resolveGlobalLock = null;
  }
}

export function isSyncInProgress() {
  return globalSyncLock !== null;
}
