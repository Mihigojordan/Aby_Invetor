import { useState, useEffect, useCallback, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { runFullSync, isSyncInProgress } from '../services/sync/syncOrchestrator';
import { recoverAll } from '../services/sync/crashRecoveryService';
import { db } from '../db/database';

const SYNC_INTERVAL_MS = 60_000; // 60 seconds

/**
 * Single shared sync hook — mount once in the app layout.
 * Handles: startup recovery, online event, interval timer, SW message handler.
 * Exposes: { isSyncing, lastSync, deadLetterCount, triggerSync }
 */
export function useSyncOrchestrator() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const intervalRef = useRef(null);

  const deadLetterCount = useLiveQuery(
    () => db.dead_letter_queue.count().catch(() => 0),
    [],
    0
  );

  const triggerSync = useCallback(async ({ force = false } = {}) => {
    if (isSyncInProgress() && !force) return;
    setIsSyncing(true);
    try {
      await runFullSync({ force });
      setLastSync(new Date());
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    // Recover any interrupted syncs from before app startup
    recoverAll().catch(console.warn);

    // Trigger a sync on first mount
    triggerSync();

    // Re-sync every minute
    intervalRef.current = setInterval(() => triggerSync(), SYNC_INTERVAL_MS);

    const handleOnline = () => triggerSync();
    const handleSwMessage = (event) => {
      if (event.data?.type === 'RUN_SYNC') triggerSync();
    };

    window.addEventListener('online', handleOnline);
    navigator.serviceWorker?.addEventListener('message', handleSwMessage);

    return () => {
      clearInterval(intervalRef.current);
      window.removeEventListener('online', handleOnline);
      navigator.serviceWorker?.removeEventListener('message', handleSwMessage);
    };
  }, [triggerSync]);

  return { isSyncing, lastSync, deadLetterCount, triggerSync };
}
