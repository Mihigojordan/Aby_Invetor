// useProductOfflineSync.js
import { useEffect, useCallback, useState, useRef } from 'react';
import { productSyncService } from '../services/sync/productSyncService';
import { useNetworkStatus } from './useNetworkStatus';

export const useProductOfflineSync = (options = {}) => {
  const { isOnline } = useNetworkStatus();
  const { autoSync = true, syncInterval = 30000, enableDebugLogs = true } = options;

  const [syncStatus, setSyncStatus] = useState({
    isSyncing: false,
    lastSync: null,
    syncError: null,
    stats: null
  });

  const intervalRef = useRef(null);

  const log = (message, data) => {
    if (enableDebugLogs) console.log(`🔄 [useProductOfflineSync] ${message}`, data || '');
  };

  const updateSyncStatus = useCallback(async () => {
    try {
      const stats = await productSyncService.getSyncStatus();
      setSyncStatus(prev => ({ ...prev, stats, syncError: stats.error || null }));
    } catch (error) {
      log('Failed to get product sync status:', error);
      setSyncStatus(prev => ({
        ...prev,
        stats: {
          totalProducts: 0,
          unsyncedProducts: 0,
          pendingDeletes: 0,
          totalImages: 0,
          unsyncedImages: 0,
          isOnline: prev.stats?.isOnline || false,
          isSyncing: prev.stats?.isSyncing || false
        },
        syncError: error.message
      }));
    }
  }, []); // ⬅️ no deps, stable

  const triggerSync = useCallback(async (force = false) => {
    if (!isOnline) {
      log('Offline - skipping product sync');
      setSyncStatus(prev => ({ ...prev, syncError: 'Device is offline' }));
      return { success: false, error: 'Device is offline' };
    }

    setSyncStatus(prev => ({ ...prev, isSyncing: true, syncError: null }));
    try {
      const result = force ? await productSyncService.forceSync() : await productSyncService.syncProducts();
      setSyncStatus(prev => ({ ...prev, isSyncing: false, lastSync: new Date(), syncError: result?.success === false ? result.error : null }));
      await updateSyncStatus();
      return result;
    } catch (error) {
      log('Product sync failed', error);
      setSyncStatus(prev => ({ ...prev, isSyncing: false, syncError: error.message }));
      return { success: false, error: error.message };
    }
  }, [isOnline, updateSyncStatus]); // ⬅️ only depends on isOnline

  useEffect(() => {
    log('useProductOfflineSync hook initialized');

    if (autoSync) productSyncService.setupAutoSync();
    updateSyncStatus();

    if (isOnline && autoSync) triggerSync();

    if (autoSync && syncInterval > 0) {
      intervalRef.current = setInterval(() => {
        if (isOnline && !syncStatus.isSyncing) triggerSync();
      }, syncInterval);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      productSyncService.cleanup();
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
    totalProducts: syncStatus.stats?.totalProducts || 0,
    unsyncedProducts: syncStatus.stats?.unsyncedProducts || 0,
    pendingDeletes: syncStatus.stats?.pendingDeletes || 0,
    totalImages: syncStatus.stats?.totalImages || 0,
    unsyncedImages: syncStatus.stats?.unsyncedImages || 0,
    syncStatus: syncStatus.stats
  };
};