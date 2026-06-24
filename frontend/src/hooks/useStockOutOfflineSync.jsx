import { useEffect, useCallback, useState, useRef } from 'react';
import { stockOutSyncService } from '../services/sync/stockOutSyncService';
import { runFullSync } from '../services/sync/syncOrchestrator';
import { useNetworkStatusContext } from '../context/useNetworkContext';

export const useStockOutOfflineSync = (options = {}) => {
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
    if (enableDebugLogs) console.log(`🔄 [useStockOutOfflineSync] ${message}`, data || '');
  };

  const updateSyncStatus = useCallback(async () => {
    try {
      const stats = await stockOutSyncService.getSyncStatus();
      setSyncStatus(prev => ({ ...prev, stats, syncError: stats.error || null }));
    } catch (error) {
      log('Failed to get stock-out sync status:', error);
      setSyncStatus(prev => ({
        ...prev,
        stats: {
          totalStockOuts: 0,
          unsyncedStockOuts: 0,
          pendingDeletes: 0,
          syncedIdsCount: 0,
          isOnline: prev.stats?.isOnline || false,
          isSyncing: prev.stats?.isSyncing || false
        },
        syncError: error.message
      }));
    }
  }, []); // No dependencies, stable callback

  const triggerSync = useCallback(async (force = false) => {
    if (!isOnline) {
      log('Offline - skipping stock-out sync');
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
      log('Stock-out sync failed', error);
      setSyncStatus(prev => ({ ...prev, isSyncing: false, syncError: error.message }));
      return { success: false, error: error.message };
    }
  }, [isOnline, updateSyncStatus]);

  useEffect(() => {
    log('useStockOutOfflineSync hook initialized');
    updateSyncStatus();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isOnline, autoSync, syncInterval]);

  return {
    triggerSync,
    forceSync: () => triggerSync(true),
    checkSyncStatus: updateSyncStatus,
    isOnline,
    isSyncing: syncStatus.isSyncing,
    lastSync: syncStatus.lastSync,
    syncError: syncStatus.syncError,
    totalStockOuts: syncStatus.stats?.totalStockOuts || 0,
    unsyncedStockOuts: syncStatus.stats?.unsyncedStockOuts || 0,
    pendingDeletes: syncStatus.stats?.pendingDeletes || 0,
    syncedIdsCount: syncStatus.stats?.syncedIdsCount || 0,
    syncStatus: syncStatus.stats
  };
};