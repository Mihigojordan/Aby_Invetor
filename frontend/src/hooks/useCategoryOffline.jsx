// useCategoryOfflineSync.js
import { useEffect, useCallback, useState, useRef } from 'react';
import { categorySyncService } from '../services/sync/categorySyncService';
import { runFullSync } from '../services/sync/syncOrchestrator';
import { useNetworkStatusContext } from '../context/useNetworkContext';

export const useCategoryOfflineSync = (options = {}) => {
  const { isOnline } = useNetworkStatusContext();
  const { autoSync = true, syncInterval = 30000, enableDebugLogs = true } = options;

  const [syncStatus, setSyncStatus] = useState({
    isSyncing: false,
    lastSync: null,
    syncError: null,
    stats: null
  });

  const intervalRef = useRef(null);

  const log = (message, data) => {
    if (enableDebugLogs) console.log(`🔄 [useCategoryOfflineSync] ${message}`, data || '');
  };

  const updateSyncStatus = useCallback(async () => {
    try {
      const stats = await categorySyncService.getSyncStatus();
      setSyncStatus(prev => ({ ...prev, stats, syncError: stats.error || null }));
    } catch (error) {
      log('Failed to get category sync status:', error);
      setSyncStatus(prev => ({
        ...prev,
        stats: {
          totalCategories: 0,
          unsyncedCategories: 0,
          pendingDeletes: 0,
          isOnline: prev.stats?.isOnline || false,
          isSyncing: prev.stats?.isSyncing || false
        },
        syncError: error.message
      }));
    }
  }, []); // ⬅️ no deps, stable

  const triggerSync = useCallback(async (force = false) => {
    if (!isOnline) {
      log('Offline - skipping category sync');
      setSyncStatus(prev => ({ ...prev, syncError: 'Device is offline' }));
      return { success: false, error: 'Device is offline' };
    }

    setSyncStatus(prev => ({ ...prev, isSyncing: true, syncError: null }));
    try {
      const result = await runFullSync({ force });
      setSyncStatus(prev => ({ ...prev, isSyncing: false, lastSync: new Date(), syncError: result?.success === false ? result.error : null }));
      await updateSyncStatus();
      return result;
    } catch (error) {
      log('Category sync failed', error);
      setSyncStatus(prev => ({ ...prev, isSyncing: false, syncError: error.message }));
      return { success: false, error: error.message };
    }
  }, [isOnline, updateSyncStatus]);

  useEffect(() => {
    log('useCategoryOfflineSync hook initialized');
    updateSyncStatus();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // ⬇️ only run once + when isOnline changes
  }, [isOnline, autoSync, syncInterval]);


  return {
    triggerSync,
    forceSync: () => triggerSync(true),
    checkSyncStatus: updateSyncStatus,
    isOnline,
    isSyncing: syncStatus.isSyncing,
    lastSync: syncStatus.lastSync,
    syncError: syncStatus.syncError,
    totalCategories: syncStatus.stats?.totalCategories || 0,
    unsyncedCategories: syncStatus.stats?.unsyncedCategories || 0,
    pendingDeletes: syncStatus.stats?.pendingDeletes || 0,
    syncStatus: syncStatus.stats
  };
};