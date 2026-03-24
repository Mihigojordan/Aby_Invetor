// Thin wrapper — delegates to SyncContext (unified sync orchestrator)
import { useSyncContext } from '../context/SyncContext';
import { useNetworkStatusContext } from '../context/useNetworkContext';

export const useProductOfflineSync = () => {
  const { isOnline } = useNetworkStatusContext();
  const {
    triggerSync,
    forceSync,
    isSyncing,
    errors,
    pendingCounts,
    lastSyncedAt,
    lastSyncCompleted,
  } = useSyncContext();

  return {
    triggerSync,
    forceSync,
    checkSyncStatus: triggerSync,
    isOnline,
    isSyncing,
    lastSync: lastSyncCompleted,
    syncError: errors.products,
    unsyncedProducts: pendingCounts.products,
    pendingDeletes: 0,
    syncedIdsCount: 0,
    syncStatus: { lastSyncedAt: lastSyncedAt.products },
  };
};
