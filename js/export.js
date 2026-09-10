/**
 * export.js — Project archive export (JSON bundle + CSV + hash manifest)
 */
import { Store, STORES } from './store.js';
import { getSnapshots } from './snapshots.js';
import { showToast } from './app.js';

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Export full project archive as a JSON bundle
 */
export async function exportProjectBundle(project) {
  const records = await Store.getAllByIndex(STORES.activityRecords, 'projectId', project.id);
  const snapshots = await getSnapshots(project.id);
  const auditLogs = await Store.getAllByIndex(STORES.auditLog, 'projectId', project.id);
  const factors = await Store.getAll(STORES.emissionFactors);
  const usedFactorIds = new Set(records.map(r => r.emissionFactorId).filter(Boolean));
  const usedFactors = factors.filter(f => usedFactorIds.has(f.id));
  const reportContents = await Store.getAllByIndex(STORES.reportContents, 'projectId', project.id);

  const bundle = {
    exportVersion: '1.0',
    exportedAt: new Date().toISOString(),
    system: 'ISO 14067 PCF Inventory System v1.0',
    project: { ...project },
    activityRecords: records,
    snapshots,
    emissionFactors: usedFactors,
    auditLog: auditLogs,
    reportContents,
  };

  // Generate hash manifest
  const manifest = {};
  const parts = { project: project, activityRecords: records, snapshots, emissionFactors: usedFactors };
  for (const [key, data] of Object.entries(parts)) {
    manifest[key] = await sha256(JSON.stringify(data));
  }
  bundle.hashManifest = manifest;

  const json = JSON.stringify(bundle, null, 2);
  downloadFile(json, `pcf_archive_${project.name}_${dateStr()}.json`, 'application/json');
  showToast('專案封存包已匯出', 'success');
}

/**
 * Export inventory CSV from latest snapshot
 */
export function exportInventoryCSV(snap, project) {
  const headers = ['階段', '項目', '活動數據', '單位', '排放係數', '係數單位', '數據類型', '資料來源', 'CO2e_kgCO2e'];
  const rows = snap.lineItems.map(item => {
    const sn = project.lifeCycleStages.find(s => s.id === item.stageId)?.name || item.stageId;
    return [sn, item.itemName, item.activityData, item.activityUnit, item.emissionFactorValue, item.emissionFactorUnit, item.dataType, item.dataSource || '', (item.co2e || 0).toFixed(4)].join(',');
  });
  const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
  downloadFile(csv, `inventory_${snap.version}_${project.name}.csv`, 'text/csv;charset=utf-8');
  showToast('CSV 已匯出', 'success');
}

/**
 * Export audit log CSV
 */
export async function exportAuditLog(project) {
  const logs = await Store.getAllByIndex(STORES.auditLog, 'projectId', project.id);
  const headers = ['時間', '操作', '描述'];
  const rows = logs.map(l => [l.timestamp, l.action, `"${l.description || ''}"`].join(','));
  const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
  downloadFile(csv, `audit_log_${project.name}_${dateStr()}.csv`, 'text/csv;charset=utf-8');
  showToast('審計日誌已匯出', 'success');
}

/**
 * Import project bundle JSON
 */
export async function importProjectBundle(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const bundle = JSON.parse(e.target.result);
        if (!bundle.project || !bundle.exportVersion) {
          reject(new Error('無效的封存包格式'));
          return;
        }
        // Verify hash manifest
        if (bundle.hashManifest) {
          const projectHash = await sha256(JSON.stringify(bundle.project));
          if (projectHash !== bundle.hashManifest.project) {
            const proceed = confirm('專案資料 hash 不一致，可能已被修改。是否仍要匯入？');
            if (!proceed) { reject(new Error('使用者取消')); return; }
          }
        }
        // Write to IndexedDB
        // Use new ID to avoid collision
        const newId = crypto.randomUUID();
        const oldId = bundle.project.id;
        bundle.project.id = newId;
        bundle.project.name = bundle.project.name + ' (匯入)';
        bundle.project.importedAt = new Date().toISOString();
        await Store.put(STORES.projects, bundle.project);
        for (const r of (bundle.activityRecords || [])) {
          r.projectId = newId;
          r.id = crypto.randomUUID();
          await Store.put(STORES.activityRecords, r);
        }
        for (const s of (bundle.snapshots || [])) {
          s.projectId = newId;
          s.id = crypto.randomUUID();
          await Store.put(STORES.snapshots, s);
        }
        for (const f of (bundle.emissionFactors || [])) {
          const existing = await Store.get(STORES.emissionFactors, f.id);
          if (!existing) await Store.put(STORES.emissionFactors, f);
        }
        for (const rc of (bundle.reportContents || [])) {
          rc.projectId = newId;
          rc.id = crypto.randomUUID();
          await Store.put(STORES.reportContents, rc);
        }
        resolve(bundle.project);
      } catch (err) { reject(err); }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function dateStr() { return new Date().toISOString().slice(0, 10); }
