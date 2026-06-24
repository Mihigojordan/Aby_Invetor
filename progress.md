# Offline-First Sync System — Implementation Progress

## Summary
Deep analysis found **16 problems** (5 critical, 5 high, 4 medium, 2 low) causing sync failures with large data volumes. Full overhaul implemented across 4 phases.

---

## ✅ DONE

### Phase A — Foundation

#### A1. DB Schema v17 → v18 (`frontend/src/db/database.js`)
- Added 3 new tables: `dead_letter_queue`, `sync_dependency_queue`, `entity_pending_cleanup`
- These store failed items, parent-child dependencies, and crash-recovery markers

#### A2. Sync Utilities (`frontend/src/utils/syncUtils.js`) — NEW FILE
- `generateStableIdempotencyKey(entity, data)` — generates a key at INSERT time using timestamp + random suffix (fixes bug #6: keys were re-generated at sync time, causing server duplicates)
- `processInChunks(collection, fn, chunkSize)` — chunk-based reading to prevent browser OOM (fixes bug #9)
- `processUpdateInChunks(getCollection, fn, chunkSize)` — re-query pattern for mutation queries
- `requestBackgroundSync()` — registers `'offline-queue-sync'` with the Background Sync API

#### A3. Dead-Letter Service (`frontend/src/services/sync/deadLetterService.js`) — NEW FILE
- `moveToDeadLetter(entity, item, error, deleteFromQueue)` — writes failed item BEFORE deleting from queue
- `retryDeadLetterItem(id)`, `retryAllDeadLetterItems(entity)` — re-queue for retry
- `discardDeadLetterItem(id)`, `discardAllDeadLetterItems(entity)` — permanent removal
- `getDeadLetterItems()`, `getDeadLetterCount()` — for UI display

#### A3b. Dead-Letter Banner (`frontend/src/components/sync/DeadLetterBanner.jsx`) — NEW FILE
- Shows "X items failed to sync" banner when `dead_letter_queue` is non-empty
- Retry All / Discard All buttons
- Uses `useLiveQuery` for real-time count

### Phase B — Dependency Chain

#### B1. Sync Mutex (`frontend/src/utils/syncMutex.js`) — NEW FILE
- `ProcessingMutex` class with Promise-based per-ID locking
- Atomic check-and-lock: replaces all `Set`-based `has/add/delete` patterns (fixes race condition bug #7)

#### B2. Sync Dependency Service (`frontend/src/services/sync/syncDependencyService.js`) — NEW FILE
- `registerDependency({entity, localId, waitingForEntity, waitingForLocalId})` — queues children waiting on unsynced parents
- `resolveWaitingChildren(waitingForEntity, waitingForLocalId)` — unblocks children after parent syncs (fixes bug #5: children were silently skipped)
- `pruneExpiredDependencies(maxAgeMs)` — removes stale entries older than 7 days

#### B3. Crash Recovery Service (`frontend/src/services/sync/crashRecoveryService.js`) — NEW FILE
- `writeRecoveryMarker(entity, markerKey, localIds, serverIds)` — written BEFORE local Dexie save
- `clearRecoveryMarker(entity, markerKey)` — deleted AFTER successful local save
- `recoverAll()` — at startup, finalizes any interrupted syncs for all 5 entities (fixes bug #4: duplicates from partial crash-recovery)

#### B4. Sync Orchestrator (`frontend/src/services/sync/syncOrchestrator.js`) — NEW FILE
- Single global Promise-based lock (`globalSyncLock`) shared across all entities
- Sequential order: Category → Product → StockIn → StockOut → SalesReturn
- Each `await` between steps IS the sync barrier — replaces all hard-coded 2s/10s waits (fixes bugs #1, #2, #3)
- `runFullSync({ force, onProgress })` — entry point for all sync operations
- `isSyncInProgress()` — for UI state

### Phase C — Services Rewritten

#### categorySyncService.js — REWRITTEN
- `Set` → `ProcessingMutex` for atomic item locking
- Dead-letter on max retries instead of silent delete
- Stored idempotency key with fallback for old rows
- Incremental fetch progress (`pendingFetchOffset` in sync_metadata)

#### productSyncService.js — REWRITTEN
- `Set` → `ProcessingMutex`
- Category cascade REMOVED (orchestrator handles order)
- `resolveWaitingChildren('product', localId)` called after successful sync
- Dead-letter on max retries
- Stored idempotency key with fallback
- Incremental fetch progress
- Separate Dexie transactions for product save vs. stockin ID updates (reduces transaction scope)

#### stockInSyncService.js — REWRITTEN
- `waitForProductIds()` polling loop REMOVED (orchestrator's sequential await handles this)
- `Set` → `ProcessingMutex`
- `registerDependency` when product not found instead of silent skip
- `resolveWaitingChildren('stockin', localId)` after success
- Dead-letter on max retries
- Stored idempotency key with fallback
- Incremental fetch progress

#### stockOutSyncService.js — REWRITTEN
- `Set` × 2 → `ProcessingMutex` + `txMutex` (one per localId, one per transactionId)
- Cascade call to `stockInSyncService.syncStockIns()` REMOVED from `syncStockOuts()`
- 2s `setTimeout` wait REMOVED
- `registerDependency` when stockin not found
- `resolveWaitingChildren('stockout', localId)` after each successful sync
- Dead-letter on max retries (in `handleSyncError` and `handleTransactionValidationFailure`)
- Old `stockout_pending_cleanup` crash marker → `writeRecoveryMarker`/`clearRecoveryMarker`
- Stored idempotency key with fallback
- Incremental fetch progress

#### salesReturnSyncService.js — REWRITTEN
- `Set` × 2 → `ProcessingMutex` + `txMutex`
- Cascade call to `stockOutSyncService.syncUnsyncedAdds()` REMOVED from `syncSalesReturns()`
- 2s `setTimeout` wait REMOVED
- `registerDependency` when stockout not found
- Dead-letter on max retries
- Stored idempotency key with fallback
- Incremental fetch progress

### Phase D — Network & PWA

#### D1. Network Detection (`frontend/src/utils/networkUtils.js`) — FIXED
- Tests own API server first (`${VITE_API_BASE_URL}/api/health`) before falling back to Google
- 10-second cache (avoids hammering isOnline on every sync start)
- 3-second timeout (was 5 seconds)
- Cache invalidated immediately on browser `online`/`offline` events

#### D2. Background Sync in Service Worker (`frontend/src/sw.js`) — ADDED
- `sync` event handler for tag `'offline-queue-sync'`
- Posts `{ type: 'RUN_SYNC' }` to the first open window client
- Triggers sync even when the user closes and reopens the app after working offline

#### useSyncOrchestrator.jsx (`frontend/src/hooks/useSyncOrchestrator.jsx`) — NEW FILE
- Single hook, mount once in app layout
- Handles: startup `recoverAll()`, `online` event, 60s interval timer, SW message handler
- Exposes: `{ isSyncing, lastSync, deadLetterCount, triggerSync }`

#### All 5 Entity Hooks Updated
- `useCategoryOfflineSync`, `useProductOfflineSync`, `useStockInOfflineSync`, `useStockOutOfflineSync`, `useSalesReturnOfflineSync`
- `triggerSync` now calls `runFullSync({ force })` from orchestrator instead of individual service
- Removed `setupAutoSync()` calls (orchestrator handles online/interval triggers)

---

#### Mount `useSyncOrchestrator` + `DeadLetterBanner` in `DashboardLayout.jsx` — DONE
- `useSyncOrchestrator()` called at the top of `DashboardLayout` (mounts once for all dashboard pages)
- `<DeadLetterBanner />` rendered above `<Outlet />` so it's always visible

#### Add `idempotencyKey` at INSERT time — DONE (all 8 files)
Every file that writes to `*_offline_add` tables now generates and stores the key at insert time:
- `CategoryManagement.jsx` — 2 inserts (create + bulk import)
- `ProductManagement.jsx` — 1 insert
- `StockInManagement.jsx` — 2 inserts (batch + single)
- `StockOutManagment.jsx` — 2 inserts (backorder + normal)
- `SalesReturnManagement.jsx` — 1 insert
- `UpsertStockinPage.jsx` — 2 inserts
- `UpsertStockOutPage.jsx` — 2 inserts
- `UpsertSalesReturnPage.jsx` — 1 insert

All insert sites also call `requestBackgroundSync()` to trigger the service worker sync tag when working offline.

## ⏳ NOT ADDRESSED (architectural decisions deferred)

### 3. Not Addressed (architectural decisions deferred)
- **Bug #10: Conflict resolution** — Last-write-wins; two devices editing the same record offline, one will lose changes. Requires a vector-clock or CRDT strategy — out of scope for this sprint.
- **Bug #15: `offlineQuantity` field** — Exists in DB schema but unused in sync. Safe to ignore for now; remove when confirmed unneeded.
- **Bug #16: `Promise.allSettled()` in `cleanupProcessedStockouts`** — Still swallows delete errors. Now that `handleSyncError` uses dead-letter, items reaching this function have already succeeded, so risk is low.

---

## Files Changed

| File | Status |
|------|--------|
| `frontend/src/db/database.js` | Modified (v18 schema) |
| `frontend/src/utils/syncUtils.js` | **NEW** |
| `frontend/src/utils/syncMutex.js` | **NEW** |
| `frontend/src/utils/networkUtils.js` | Modified |
| `frontend/src/services/sync/deadLetterService.js` | **NEW** |
| `frontend/src/services/sync/syncDependencyService.js` | **NEW** |
| `frontend/src/services/sync/crashRecoveryService.js` | **NEW** |
| `frontend/src/services/sync/syncOrchestrator.js` | **NEW** |
| `frontend/src/services/sync/categorySyncService.js` | Rewritten |
| `frontend/src/services/sync/productSyncService.js` | Rewritten |
| `frontend/src/services/sync/stockInSyncService.js` | Rewritten |
| `frontend/src/services/sync/stockOutSyncService.js` | Rewritten |
| `frontend/src/services/sync/salesReturnSyncService.js` | Rewritten |
| `frontend/src/sw.js` | Modified (Background Sync) |
| `frontend/src/hooks/useSyncOrchestrator.jsx` | **NEW** |
| `frontend/src/components/sync/DeadLetterBanner.jsx` | **NEW** |
| `frontend/src/hooks/useCategoryOffline.jsx` | Modified |
| `frontend/src/hooks/useProductOfflineSync.jsx` | Modified |
| `frontend/src/hooks/useStockInOfflineSync.jsx` | Modified |
| `frontend/src/hooks/useStockOutOfflineSync.jsx` | Modified |
| `frontend/src/hooks/useSalesReturnOfflineSync.jsx` | Modified |
