// context/SyncContext.jsx
// Unified sync orchestrator — replaces 5 separate hooks/intervals.
// All entity syncs are driven from here in dependency order.
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useNetworkStatusContext } from './useNetworkContext';
import { db } from '../db/database';
import { categorySyncService } from '../services/sync/categorySyncService';
import { productSyncService } from '../services/sync/productSyncService';
import { stockInSyncService } from '../services/sync/stockInSyncService';
import { stockOutSyncService } from '../services/sync/stockOutSyncService';
import { salesReturnSyncService } from '../services/sync/salesReturnSyncService';

const SyncContext = createContext(null);

export const SyncProvider = ({ children }) => {
  const { isOnline } = useNetworkStatusContext();

  // Use refs for interval/lock so stale closures can't cause overlapping syncs
  const isSyncingRef = useRef(false);
  const syncPausedRef = useRef(false); // mirrors syncPaused state — readable in closures
  const syncLockRef = useRef(null);
  const intervalRef = useRef(null);

  const [state, setState] = useState({
    isSyncing: false,
    syncPaused: false,
    lastSyncedAt: {
      categories: null,
      products: null,
      stockIns: null,
      stockOuts: null,
      salesReturns: null,
    },
    pendingCounts: {
      categories: 0,
      products: 0,
      stockIns: 0,
      stockOuts: 0,
      salesReturns: 0,
    },
    errors: {
      categories: null,
      products: null,
      stockIns: null,
      stockOuts: null,
      salesReturns: null,
    },
    lastSyncCompleted: null,
  });

  // ── Load per-entity timestamps from sync_metadata ────────────────────────
  const loadLastSyncedTimestamps = useCallback(async () => {
    try {
      const [cats, prods, sins, souts, srets] = await Promise.all([
        db.sync_metadata.get('categories'),
        db.sync_metadata.get('products'),
        db.sync_metadata.get('stockIns'),
        db.sync_metadata.get('stockOuts'),
        db.sync_metadata.get('salesReturns'),
      ]);
      setState(s => ({
        ...s,
        lastSyncedAt: {
          categories: cats?.lastSyncedAt || null,
          products: prods?.lastSyncedAt || null,
          stockIns: sins?.lastSyncedAt || null,
          stockOuts: souts?.lastSyncedAt || null,
          salesReturns: srets?.lastSyncedAt || null,
        },
      }));
    } catch (e) {
      console.warn('[SyncContext] Failed to load sync timestamps:', e);
    }
  }, []);

  // ── Count pending (unsynced) items per entity ────────────────────────────
  const refreshCounts = useCallback(async () => {
    try {
      const [cats, prods, sins, souts, srets] = await Promise.all([
        Promise.all([db.categories_offline_add.count(), db.categories_offline_update.count()]).then(([a, b]) => a + b),
        Promise.all([db.products_offline_add.count(), db.products_offline_update.count()]).then(([a, b]) => a + b),
        Promise.all([db.stockins_offline_add.count(), db.stockins_offline_update.count()]).then(([a, b]) => a + b),
        Promise.all([db.stockouts_offline_add.count(), db.stockouts_offline_update.count()]).then(([a, b]) => a + b),
        db.sales_returns_offline_add.count(),
      ]);
      setState(s => ({
        ...s,
        pendingCounts: {
          categories: cats,
          products: prods,
          stockIns: sins,
          stockOuts: souts,
          salesReturns: srets,
        },
      }));
    } catch (e) {
      console.warn('[SyncContext] Failed to refresh counts:', e);
    }
  }, []);

  // ── Full sync cycle in dependency order ─────────────────────────────────
  const runFullSyncCycle = useCallback(async () => {
    const errors = {};

    const run = async (name, fn) => {
      try {
        await fn();
        setState(s => ({ ...s, errors: { ...s.errors, [name]: null } }));
      } catch (err) {
        console.error(`[SyncContext] ${name} sync failed:`, err);
        errors[name] = err.message;
        setState(s => ({ ...s, errors: { ...s.errors, [name]: err.message } }));
      }
    };

    await run('categories', () => categorySyncService.syncCategories());
    await run('products', () => productSyncService.syncProducts());
    await run('stockIns', () => stockInSyncService.syncStockIns());
    await run('stockOuts', () => stockOutSyncService.syncStockOuts());
    await run('salesReturns', () => salesReturnSyncService.syncSalesReturns());

    await Promise.allSettled([refreshCounts(), loadLastSyncedTimestamps()]);
  }, [refreshCounts, loadLastSyncedTimestamps]);

  // ── Master sync trigger (respects lock and paused state) ─────────────────
  const triggerSync = useCallback(async () => {
    if (!isOnline || isSyncingRef.current || syncPausedRef.current) return;
    if (syncLockRef.current) { await syncLockRef.current; return; }

    let unlock;
    syncLockRef.current = new Promise(res => { unlock = res; });
    isSyncingRef.current = true;
    setState(s => ({ ...s, isSyncing: true }));

    try {
      await runFullSyncCycle();
      setState(s => ({ ...s, lastSyncCompleted: new Date() }));
    } finally {
      isSyncingRef.current = false;
      syncLockRef.current = null;
      unlock?.();
      setState(s => ({ ...s, isSyncing: false }));
    }
  }, [isOnline, runFullSyncCycle]);

  // ── forceSync: bypass pending lock, run immediately ──────────────────────
  const forceSync = useCallback(async () => {
    // Cancel any waiting lock
    syncLockRef.current = null;
    isSyncingRef.current = false;
    await triggerSync();
  }, [triggerSync]);

  // ── Pause/resume (called by 401 interceptor and auth contexts) ───────────
  const pauseSync = useCallback(() => {
    syncPausedRef.current = true;
    setState(s => ({ ...s, syncPaused: true }));
  }, []);

  const resumeSync = useCallback(() => {
    syncPausedRef.current = false;
    setState(s => ({ ...s, syncPaused: false }));
    // Trigger an immediate sync after re-auth
    setTimeout(() => triggerSync(), 500);
  }, [triggerSync]);

  // ── Listen for sync:pause / sync:resume events ───────────────────────────
  // api.js dispatches 'sync:pause' on 401; auth contexts dispatch 'sync:resume' after re-auth.
  useEffect(() => {
    const onPause = () => pauseSync();
    const onResume = () => resumeSync();
    window.addEventListener('sync:pause', onPause);
    window.addEventListener('sync:resume', onResume);
    return () => {
      window.removeEventListener('sync:pause', onPause);
      window.removeEventListener('sync:resume', onResume);
    };
  }, [pauseSync, resumeSync]);

  // ── Online/focus → immediate sync; interval for periodic sync ─────────────
  useEffect(() => {
    if (isOnline) {
      triggerSync();
    }

    intervalRef.current = setInterval(() => {
      if (isOnline && !isSyncingRef.current) {
        triggerSync();
      }
    }, 30_000);

    return () => {
      clearInterval(intervalRef.current);
    };
  }, [isOnline]); // eslint-disable-line react-hooks/exhaustive-deps
  // triggerSync intentionally omitted — it changes reference but isOnline drives re-registration

  // ── Load initial state on mount ───────────────────────────────────────────
  useEffect(() => {
    loadLastSyncedTimestamps();
    refreshCounts();
  }, [loadLastSyncedTimestamps, refreshCounts]);

  const value = {
    ...state,
    triggerSync,
    forceSync,
    pauseSync,
    resumeSync,
    refreshCounts,
  };

  return (
    <SyncContext.Provider value={value}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSyncContext = () => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSyncContext must be used within a SyncProvider');
  }
  return context;
};
