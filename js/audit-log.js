/**
 * audit-log.js — Operation logging
 */
import { Store, STORES } from './store.js';

export async function logAction(projectId, action, description, extra = {}) {
  const entry = {
    id: crypto.randomUUID(),
    projectId,
    action,
    description,
    timestamp: new Date().toISOString(),
    ...extra,
  };
  await Store.put(STORES.auditLog, entry);
  return entry;
}

export async function getProjectLog(projectId) {
  return Store.getAllByIndex(STORES.auditLog, 'projectId', projectId);
}

export async function getAllLogs() {
  return Store.getAll(STORES.auditLog);
}
