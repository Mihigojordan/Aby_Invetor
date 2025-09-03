import { useEffect, useCallback, useState, useRef } from 'react';
import { salesReturnSyncService } from '../services/sync/salesReturnSyncService';
import { useNetworkStatusContext } from '../context/useNetworkContext';

export const useSalesReturnOfflineSync = (options = {}) => {
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
    if (enableDebugLogs) console.log(`🔄 [useSalesReturnOfflineSync] ${message}`, data || '');
  };

  const updateSyncStatus = useCallback(async () => {
    try {
      const stats = await salesReturnSyncService.getSyncStatus();
      setSyncStatus(prev => ({ ...prev, stats, syncError: stats.error || null }));
    } catch (error) {
      log('Failed to get sales return sync status:', error);
      setSyncStatus(prev => ({
        ...prev,
        stats: {
          totalReturns: 0,
          unsyncedReturns: 0,
          pendingDeletes: 0,
          syncedIdsCount: 0,
          isOnline: prev.stats?.isOnline || false,
          isSyncing: prev.stats?.isSyncing || false
        },
        syncError: error.message
      }));
    }
  }, []);

  const triggerSync = useCallback(async (force = false) => {
    if (!isOnline) {
      log('Offline - skipping sales return sync');
      setSyncStatus(prev => ({ ...prev, syncError: 'Device is offline' }));
      return { success: false, error: 'Device is offline' };
    }

    setSyncStatus(prev => ({ ...prev, isSyncing: true, syncError: null }));
    try {
      const result = force
        ? await salesReturnSyncService.forceSync()
        : await salesReturnSyncService.syncSalesReturns();

      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        lastSync: new Date(),
        syncError: result?.success === false ? result.error : null
      }));
      await updateSyncStatus();

      return result;
    } catch (error) {
      log('Sales return sync failed', error);
      setSyncStatus(prev => ({ ...prev, isSyncing: false, syncError: error.message }));
      return { success: false, error: error.message };
    }
  }, [isOnline, updateSyncStatus]);

  useEffect(() => {
    log('useSalesReturnOfflineSync hook initialized');

    if (autoSync) salesReturnSyncService.setupAutoSync();
    updateSyncStatus();

    if (isOnline && autoSync) triggerSync();

    if (autoSync && syncInterval > 0) {
      intervalRef.current = setInterval(() => {
        if (isOnline && !syncStatus.isSyncing) triggerSync();
      }, syncInterval);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      salesReturnSyncService.cleanup();
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
    totalReturns: syncStatus.stats?.totalReturns || 0,
    unsyncedReturns: syncStatus.stats?.unsyncedReturns || 0,
    pendingDeletes: syncStatus.stats?.pendingDeletes || 0,
    syncedIdsCount: syncStatus.stats?.syncedIdsCount || 0,
    syncStatus: syncStatus.stats
  };
};
