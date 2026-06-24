import { db } from '../../db/database';

/**
 * Register that a child item cannot sync yet because its parent hasn't been
 * synced to the server. Called instead of silently skipping.
 *
 * @param {string} entity            Child entity: 'stockin'|'stockout'|'sales_return'
 * @param {number} localId           Child's localId in its offline_add table
 * @param {string} waitingForEntity  Parent entity: 'category'|'product'|'stockin'|'stockout'
 * @param {number|string} waitingForLocalId  Parent's localId
 */
export async function registerDependency({ entity, localId, waitingForEntity, waitingForLocalId }) {
  // Avoid duplicates — compound index [entity+localId] covers this
  const existing = await db.sync_dependency_queue
    .where('[entity+localId]')
    .equals([entity, localId])
    .first();

  if (existing) return;

  await db.sync_dependency_queue.add({
    entity,
    localId,
    waitingForEntity,
    waitingForLocalId,
    createdAt: new Date(),
  });

  console.log(
    `[syncDependency] Registered: ${entity}#${localId} waiting for ${waitingForEntity}#${waitingForLocalId}`
  );
}

/**
 * After a parent entity is successfully synced, remove all dependency records
 * that were waiting for it. The orchestrator will naturally retry the children
 * on its next pass (they're still in their *_offline_add tables).
 *
 * @returns {Array<{entity, localId}>}  The child items that are now unblocked
 */
export async function resolveWaitingChildren(waitingForEntity, waitingForLocalId) {
  const waiting = await db.sync_dependency_queue
    .where('waitingForEntity')
    .equals(waitingForEntity)
    .and(dep => String(dep.waitingForLocalId) === String(waitingForLocalId))
    .toArray();

  if (waiting.length === 0) return [];

  const childIds = waiting.map(w => ({ entity: w.entity, localId: w.localId }));

  await db.sync_dependency_queue
    .where('waitingForEntity')
    .equals(waitingForEntity)
    .and(dep => String(dep.waitingForLocalId) === String(waitingForLocalId))
    .delete();

  console.log(
    `[syncDependency] Resolved ${childIds.length} child(ren) waiting for ${waitingForEntity}#${waitingForLocalId}`
  );
  return childIds;
}

/**
 * Remove stale dependency entries older than maxAgeMs (default 7 days).
 * Called at the start of each full sync cycle.
 */
export async function pruneExpiredDependencies(maxAgeMs = 7 * 24 * 60 * 60 * 1000) {
  const cutoff = new Date(Date.now() - maxAgeMs);
  const deleted = await db.sync_dependency_queue
    .where('createdAt')
    .below(cutoff)
    .delete();

  if (deleted > 0) {
    console.log(`[syncDependency] Pruned ${deleted} expired dependency record(s)`);
  }
}
