# Aby Inventor — Project Context for Claude

## Project Overview
Aby Inventor is a full-stack **inventory management PWA** with strong offline-first capabilities.
It supports three user roles (Admin, Employee, Partner), real-time sync via Socket.io, and full
offline operation with Dexie/IndexedDB. The system can run completely disconnected and sync all
changes when connectivity is restored.

**Live domain:** abyinventory.com | **API:** api.abyinventory.com

---

## Stack

### Frontend
- React 19 + Vite + React Router DOM 7
- Tailwind CSS 3, Framer Motion, Lucide React icons
- Axios for HTTP, TanStack React Query 5 for server state
- **Dexie 4** (IndexedDB abstraction) for offline storage
- Socket.io-client for real-time updates
- vite-plugin-pwa for PWA/Service Worker

### Backend
- NestJS 11 (TypeScript)
- Prisma 6 + PostgreSQL
- Redis (cache-manager) for response caching
- JWT + bcryptjs for auth
- Socket.io for real-time events
- Nodemailer + web-push for notifications

---

## Repository Structure

```
Aby_Invetor/
├── frontend/src/
│   ├── main.jsx              # Entry — mounts all Context providers
│   ├── App.jsx               # RouterProvider wrapper
│   ├── api/api.js            # Axios instance + interceptors
│   ├── db/database.js        # Dexie schema (currently v16)
│   ├── context/              # React Contexts (see below)
│   ├── hooks/                # Custom hooks (5 sync hooks + network)
│   ├── services/             # Business logic + API calls
│   │   └── sync/             # 5 delta-sync orchestrators
│   ├── page/                 # Page components
│   ├── components/           # Shared UI components
│   ├── utils/                # networkUtils, etc.
│   └── routes/               # Route definitions
└── backend/src/
    ├── modules/              # 19 NestJS feature modules
    └── prisma/schema.prisma  # Database schema
```

---

## Context Provider Tree (main.jsx)

Providers nest in this exact order — innermost providers CANNOT call hooks from outer providers:

```
NetworkStatusProvider
  └── SocketProvider
        └── NotificationProvider
              └── AdminAuthContextProvider
                    └── EmployeeAuthContextProvider
                          └── PartnerAuthProvider
                                └── SyncProvider       ← offline sync orchestrator
                                      └── App
```

**Important:** Auth providers are PARENTS of SyncProvider. They cannot call `useSyncContext()`.
Communication between auth and sync uses `window.dispatchEvent(new CustomEvent('sync:resume'))`.

---

## Offline Sync Architecture

### Three-Tier Write Queue (per entity)

| Table pattern | Purpose |
|---|---|
| `*_all` | Local mirror of server data (read source for UI) |
| `*_offline_add` | Items created offline, pending server creation |
| `*_offline_update` | Items modified offline, pending server update |
| `*_offline_delete` | Items deleted offline, pending server deletion |
| `synced_*_ids` | Maps local temp IDs → server UUIDs after first sync |
| `sync_metadata` | Per-entity `lastSyncedAt` timestamp for delta sync |

### Delta Sync (current implementation, v16 schema)
- On sync: read `lastSyncedAt` from `sync_metadata` table
- If timestamp exists: call `GET /entity?updatedAfter=<ISO>` → server returns `{ data: T[], deletedIds: string[] }`
- If no timestamp (first install / DB upgrade): full fetch, then write timestamp
- Local DB: upsert changed records, delete `deletedIds` — NEVER `.clear()` on delta path
- Backend: soft-delete via `deletedAt` field (records are never hard-deleted)

### SyncContext (`frontend/src/context/SyncContext.jsx`)
The **single sync orchestrator**. Replaces 5 independent polling hooks.

```js
// Exposed via useSyncContext():
{
  isSyncing,           // bool
  syncPaused,          // bool — true during 401 re-auth
  lastSyncedAt,        // { categories, products, stockIns, stockOuts, salesReturns }
  pendingCounts,       // { categories, products, stockIns, stockOuts, salesReturns }
  errors,              // { categories, products, stockIns, stockOuts, salesReturns }
  lastSyncCompleted,   // Date | null
  triggerSync,         // () => Promise — respects lock + paused state
  forceSync,           // () => Promise — bypasses lock
  pauseSync,           // () => void
  resumeSync,          // () => void
  refreshCounts,       // () => Promise — update pending counts without full sync
}
```

**Single 30s interval, single `online` event listener** — no duplicate registrations.
Uses `isSyncingRef` (useRef, not state) in the interval to avoid stale closure bug.

### 401 Handling Flow
1. `api.js` 401 interceptor → dispatches `CustomEvent('sync:pause')` on window
2. SyncContext listens → sets `syncPaused = true`
3. Sync services see paused flag → skip deletion of failed queue items (preserve data)
4. Auth context re-auths user → dispatches `CustomEvent('sync:resume')`
5. SyncContext resumes → immediately retries pending sync

### Exponential Backoff
All 5 sync services implement `shouldRetryNow(item)`:
- Backoff schedule: 30s → 2m → 8m → 32m (capped)
- Formula: `Math.min(30_000 * Math.pow(4, retryCount - 1), 32 * 60 * 1000)`
- Items that fail are skipped until their backoff window expires

### The 5 Sync Services
Called sequentially by SyncContext (dependency order: categories → products → stockIns → stockOuts → salesReturns):

| Service | File | sync_metadata key |
|---|---|---|
| categorySyncService | services/sync/categorySyncService.js | `'categories'` |
| productSyncService | services/sync/productSyncService.js | `'products'` |
| stockInSyncService | services/sync/stockInSyncService.js | `'stockIns'` |
| stockOutSyncService | services/sync/stockOutSyncService.js | `'stockOuts'` |
| salesReturnSyncService | services/sync/salesReturnSyncService.js | `'salesReturns'` |

### The 5 Sync Hooks
Thin wrappers around `useSyncContext()`. Pages that import them need no changes.

```js
// All 5 follow this pattern (example: useStockOutOfflineSync):
export const useStockOutOfflineSync = () => {
  const { isOnline } = useNetworkStatusContext();
  const { triggerSync, forceSync, isSyncing, errors, pendingCounts, lastSyncedAt, lastSyncCompleted } = useSyncContext();
  return {
    triggerSync, forceSync, checkSyncStatus: triggerSync, isOnline, isSyncing,
    lastSync: lastSyncCompleted,
    syncError: errors.stockOuts,
    unsyncedStockOuts: pendingCounts.stockOuts,
    pendingDeletes: 0, syncedIdsCount: 0,
    syncStatus: { lastSyncedAt: lastSyncedAt.stockOuts },
  };
};
```

---

## IndexedDB Schema (Dexie v16)

File: `frontend/src/db/database.js`

**When bumping the Dexie version** (next = 17):
- Add a NEW `.version(17).stores({...})` block — never modify previous version blocks
- Existing data is preserved; new tables start empty
- Bump triggers upgrade hook automatically for existing users

Key table added in v16: `sync_metadata` — primary key `entity` (string), stores `lastSyncedAt`, `lastFullSyncAt`.

---

## Backend Module Pattern

```
modules/<entity>-management/
├── <entity>.controller.ts   # REST endpoints + query param parsing
├── <entity>.service.ts      # Business logic + Prisma queries
├── <entity>.module.ts       # NestJS module wiring
└── dto/                     # Validation DTOs
```

### Delta Sync Endpoints
All 5 entity controllers accept `?updatedAfter=<ISO>` and return `{ data: T[], deletedIds: string[] }`:
- `GET /category/all?updatedAfter=`
- `GET /product/all?updatedAfter=`
- `GET /stockin/all?updatedAfter=`
- `GET /stockout/all?updatedAfter=`
- `GET /sales-return?updatedAfter=`

### Prisma Schema (sync-related fields on all 5 entities)
```prisma
updatedAt  DateTime  @updatedAt   // used by delta query filter
deletedAt  DateTime?              // soft delete — null means active record
```

**Soft delete pattern (must follow for all entities):**
```typescript
// DELETE → soft delete only:
await this.prisma.entity.update({ where: { id }, data: { deletedAt: new Date() } });

// QUERY → always filter:
where: {
  deletedAt: null,
  ...(updatedAfter ? { updatedAt: { gte: new Date(updatedAfter) } } : {})
}

// RESPONSE shape:
{
  data: activeRecords,
  deletedIds: recordsDeletedSinceUpdatedAfter.map(r => r.id)
}
```

---

## Authentication

Three auth contexts — each has login/logout + `reAuthWhenOnline()`.
After successful re-auth, each MUST dispatch:
```js
window.dispatchEvent(new CustomEvent('sync:resume'));
```

| Context | File |
|---|---|
| AdminAuthContext | context/AdminAuthContext.jsx |
| EmployeeAuthContext | context/EmployeeAuthContext.jsx |
| PartnerAuthContext | context/PartnerAuthContext.jsx |

Auth uses httpOnly JWT cookies (not localStorage). `api.js` sends `withCredentials: true`.

---

## API Layer (`frontend/src/api/api.js`)
- Axios instance, `baseURL` from env, `withCredentials: true`
- **401 interceptor**: dispatches `CustomEvent('sync:pause')` on window
- Do NOT add circular imports between api.js and context files — use CustomEvents

---

## Network Detection (`frontend/src/utils/networkUtils.js`)
Tests 3 URLs in parallel (Google, Cloudflare, httpbin). Any one success = online.
The existing `Promise.allSettled + some()` logic handles this correctly.

---

## Development Commands

### Frontend
```bash
cd frontend && npm run dev      # Vite dev server → localhost:5173
cd frontend && npm run build    # Production build
```

### Backend
```bash
cd backend && npm run start:dev                             # NestJS watch mode
cd backend && npx prisma migrate dev --name <description>  # Apply schema changes
cd backend && npx prisma studio                            # DB GUI
```

---

## Architectural Rules (must not violate)

1. **Soft-delete only** — never call `prisma.entity.delete()` directly; always set `deletedAt`
2. **Never `.clear()` IndexedDB on delta path** — fetch first, validate non-empty, THEN clear+replace atomically inside a Dexie `'rw'` transaction
3. **SyncContext is the sole scheduler** — sync services must NOT register their own `setInterval` or `window.addEventListener('online', ...)`. `setupAutoSync()`/`cleanup()` have been removed from all 5 services.
4. **Use `isSyncingRef` (not state) in intervals** to avoid stale closures
5. **Auth → Sync: use CustomEvents** — auth providers are above SyncProvider and cannot call `useSyncContext()`
6. **`sync_metadata` entity key names** must match SyncContext state exactly: `categories`, `products`, `stockIns`, `stockOuts`, `salesReturns`
7. **Dexie schema is append-only** — never edit a previous `.version()` block
8. **`salesReturnService.getAllSalesReturns` signature**: `(updatedAfter = null, filters = {})` — internal callers pass `null` as first arg

---

## Backend Modules (19 total)

```
admin, employee-managment, partner-management,
category-management, product-managment,
stockin-managment, stockout-management, backorder-management,
salesReturn-management, stock-requisition, requisition-management,
notifications, push-notification, report-management,
task-management, activity-managament, Summary,
expense-management, credit-management
```

---

## Sync System Redesign History (March 2026)

A major architectural overhaul was completed. Do not revert or duplicate any of these changes:

**What was changed:**
- `fetchAndUpdateLocal()` in all 5 services: full-wipe → delta upsert pattern
- Dexie schema v15 → v16: added `sync_metadata` table
- Created `SyncContext.jsx` as unified orchestrator
- Removed `setupAutoSync()` and `cleanup()` from all 5 sync services
- All 5 sync hooks converted to thin SyncContext wrappers
- Added 401 interceptor + `sync:pause`/`sync:resume` CustomEvent flow
- Added `shouldRetryNow()` exponential backoff to all 5 services
- Added `_boundHandleOnline`/`_boundHandleFocus` constructor refs to all 5 services
- Added `updatedAt`/`deletedAt` to all 5 Prisma entities; ran migration
- Added `?updatedAfter` query param to all 5 backend controllers + services
- Backend: all entity deletes converted to soft-delete
- Fixed `salesReturnService` internal caller signatures
- `networkUtils.js`: added Cloudflare + httpbin fallback URLs

**8 bugs/issues resolved:**
1. Data wipe when empty fetch response received
2. 401 expiry permanently dropping offline queue items
3. `shouldFetchFresh` condition being silently ignored
4. Stale closure in interval (isSyncing always read as false)
5. Hardcoded 2s wait for ID propagation → polling helper
6. No exponential backoff on retries
7. Event listener leak in cleanup() (wrong reference)
8. Single URL (Google only) for connectivity testing
