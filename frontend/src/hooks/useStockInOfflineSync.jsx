import { useEffect, useCallback, useState, useRef } from 'react';
import { stockInSyncService } from '../services/sync/stockInSyncService';
import { useNetworkStatusContext } from '../context/useNetworkContext';

export const useStockInOfflineSync = (options = {}) => {
 
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
    if (enableDebugLogs) console.log(`🔄 [useStockInOfflineSync] ${message}`, data || '');
  };

  const updateSyncStatus = useCallback(async () => {
    try {
      const stats = await stockInSyncService.getSyncStatus();
      setSyncStatus(prev => ({ ...prev, stats, syncError: stats.error || null }));
    } catch (error) {
      log('Failed to get stock-in sync status:', error);
      setSyncStatus(prev => ({
        ...prev,
        stats: {
          totalStockIns: 0,
          unsyncedStockIns: 0,
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
      log('Offline - skipping stock-in sync');
      setSyncStatus(prev => ({ ...prev, syncError: 'Device is offline' }));
      return { success: false, error: 'Device is offline' };
    }

    setSyncStatus(prev => ({ ...prev, isSyncing: true, syncError: null }));
    try {
      const result = force ? await stockInSyncService.forceSync() : await stockInSyncService.syncStockIns();
      setSyncStatus(prev => ({ ...prev, isSyncing: false, lastSync: new Date(), syncError: result?.success === false ? result.error : null }));
      await updateSyncStatus();
      return result;
    } catch (error) {
      log('Stock-in sync failed', error);
      setSyncStatus(prev => ({ ...prev, isSyncing: false, syncError: error.message }));
      return { success: false, error: error.message };
    }
  }, [isOnline, updateSyncStatus]); // Depends on isOnline and updateSyncStatus

  useEffect(() => {
    log('useStockInOfflineSync hook initialized');

    if (autoSync) stockInSyncService.setupAutoSync();
    updateSyncStatus();

    if (isOnline && autoSync) {
      
      triggerSync()
    };

    if (autoSync && syncInterval > 0) {
      intervalRef.current = setInterval(() => {
        if (isOnline && !syncStatus.isSyncing) triggerSync();
      }, syncInterval);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      stockInSyncService.cleanup();
    };
  }, [isOnline, autoSync, syncInterval]); // Run on mount and when isOnline, autoSync, or syncInterval changes

  return {
    triggerSync,
    forceSync: () => triggerSync(true),
    checkSyncStatus: updateSyncStatus,
    isOnline,
    isSyncing: syncStatus.isSyncing,
    lastSync: syncStatus.lastSync,
    syncError: syncStatus.syncError,
    totalStockIns: syncStatus.stats?.totalStockIns || 0,
    unsyncedStockIns: syncStatus.stats?.unsyncedStockIns || 0,
    pendingDeletes: syncStatus.stats?.pendingDeletes || 0,
    syncedIdsCount: syncStatus.stats?.syncedIdsCount || 0,
    syncStatus: syncStatus.stats
  };
};