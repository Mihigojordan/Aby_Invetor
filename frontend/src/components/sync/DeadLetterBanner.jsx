import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import { retryAllDeadLetterItems, discardAllDeadLetterItems, getDeadLetterItems } from '../../services/sync/deadLetterService';
import { runFullSync } from '../../services/sync/syncOrchestrator';
import { useState } from 'react';

/**
 * Shows a banner when items have permanently failed to sync.
 * Mount once in the app layout — it self-hides when the queue is empty.
 */
export function DeadLetterBanner() {
  const count = useLiveQuery(() => db.dead_letter_queue.count().catch(() => 0), [], 0);
  const [busy, setBusy] = useState(false);

  if (!count) return null;

  const handleRetryAll = async () => {
    setBusy(true);
    try {
      const items = await getDeadLetterItems();
      const entities = [...new Set(items.map(i => i.entity))];
      for (const entity of entities) {
        await retryAllDeadLetterItems(entity);
      }
      await runFullSync({ force: true });
    } finally {
      setBusy(false);
    }
  };

  const handleDiscardAll = async () => {
    if (!window.confirm(`Permanently discard ${count} failed item(s)? This cannot be undone.`)) return;
    setBusy(true);
    try {
      const items = await getDeadLetterItems();
      const entities = [...new Set(items.map(i => i.entity))];
      for (const entity of entities) {
        await discardAllDeadLetterItems(entity);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{
      background: '#fef3cd',
      border: '1px solid #ffc107',
      borderRadius: 6,
      padding: '8px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      fontSize: 14,
    }}>
      <span>⚠️ {count} item{count !== 1 ? 's' : ''} failed to sync and need attention.</span>
      <button onClick={handleRetryAll} disabled={busy} style={{ cursor: 'pointer' }}>
        Retry All
      </button>
      <button onClick={handleDiscardAll} disabled={busy} style={{ cursor: 'pointer', color: '#c00' }}>
        Discard All
      </button>
    </div>
  );
}
