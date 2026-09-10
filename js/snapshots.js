/**
 * snapshots.js — Calculation snapshot with SHA-256 hash
 */
import { Store, STORES } from './store.js';
import { calculateTotal, calculatePercentages, calculateDataRatio, calculateAllocation, calculateMassBalance } from './calculator.js';
import { logAction } from './audit-log.js';

async function computeHash(data) {
  const encoder = new TextEncoder();
  const dataStr = JSON.stringify(data, Object.keys(data).sort());
  const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(dataStr));
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Create an immutable calculation snapshot
 */
export async function createSnapshot(project) {
  const records = await Store.getAllByIndex(STORES.activityRecords, 'projectId', project.id);
  const { totalCO2e, fossil, biogenicEmission, biogenicRemoval, luc, stages } = calculateTotal(records);
  const percentages = calculatePercentages(stages, totalCO2e);
  const dataRatio = calculateDataRatio(records);
  const massBalance = calculateMassBalance(records);
  const { factor, allocatedTotals } = calculateAllocation({ totalCO2e, fossil, biogenicEmission, biogenicRemoval, luc }, project);

  // Determine version number
  const existing = await Store.getAllByIndex(STORES.snapshots, 'projectId', project.id);
  const versionNum = existing.length + 1;

  const snapshotData = {
    projectId: project.id,
    lineItems: records.map(r => ({ ...r })),
    methodology: {
      functionalUnit: project.functionalUnit,
      declaredUnit: project.declaredUnit,
      boundary: project.boundary,
      cutoffCriteria: project.cutoffCriteria,
      allocationMethod: project.allocationMethod,
      pcrReference: project.pcrReference,
      gwpVersion: project.gwpVersion,
      dataPeriod: project.dataPeriod,
      geographicScope: project.geographicScope,
      lifeCycleStages: project.lifeCycleStages.filter(s => s.enabled),
    },
  };

  const inventoryHash = await computeHash(snapshotData);

  const snapshot = {
    id: crypto.randomUUID(),
    projectId: project.id,
    version: `v${versionNum}.0`,
    createdAt: new Date().toISOString(),
    boundary: project.boundary,
    functionalUnit: project.functionalUnit,
    gwpVersion: project.gwpVersion,
    inventoryHash,
    totalsByStage: percentages,
    grossTotals: { totalCO2e, fossil, biogenicEmission, biogenicRemoval, luc },
    allocatedTotals,
    allocationFactor: factor,
    massBalance,
    dataRatio,
    lineItems: snapshotData.lineItems,
    methodology: snapshotData.methodology,
    locked: true,
  };

  await Store.put(STORES.snapshots, snapshot);
  await logAction(project.id, 'CREATE_SNAPSHOT', `建立盤查快照 ${snapshot.version}`, { snapshotId: snapshot.id });
  return snapshot;
}

export async function getSnapshots(projectId) {
  return Store.getAllByIndex(STORES.snapshots, 'projectId', projectId);
}

export async function getLatestSnapshot(projectId) {
  const snaps = await getSnapshots(projectId);
  if (snaps.length === 0) return null;
  return snaps.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
}

export async function verifySnapshotIntegrity(snapshot) {
  const data = {
    projectId: snapshot.projectId,
    lineItems: snapshot.lineItems,
    methodology: snapshot.methodology,
  };
  const hash = await computeHash(data);
  return hash === snapshot.inventoryHash;
}
