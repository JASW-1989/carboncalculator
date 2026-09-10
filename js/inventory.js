/**
 * inventory.js — Read-only inventory rendering from snapshot
 */
import { getLatestSnapshot, getSnapshots, verifySnapshotIntegrity } from './snapshots.js';
import { showToast } from './app.js';

export async function renderInventory(tc, project) {
  const snapshots = await getSnapshots(project.id);
  const snap = snapshots.length > 0
    ? snapshots.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
    : null;

  if (!snap) {
    tc.innerHTML = `<div class="card fade-in"><div class="empty-state"><div class="empty-icon">🔒</div><div class="empty-text">尚未建立盤查快照。請先在「盤查資料輸入」頁面填入活動數據，<br>然後點擊「鎖定盤查版本」建立不可變快照。</div></div></div>`;
    return;
  }

  // Verify integrity
  const isValid = await verifySnapshotIntegrity(snap);

  tc.innerHTML = `
    <div class="fade-in">
      <div class="inventory-locked-banner">
        <span class="lock-icon">🔒</span>
        <span>此盤查清冊由系統自動生成，<strong>不可編輯</strong>。如需修正數據，請回到「盤查資料輸入」修改後重新建立快照。</span>
      </div>
      <div class="snapshot-info">
        <div class="snapshot-info-item"><span class="snapshot-info-label">版本：</span><strong>${snap.version}</strong></div>
        <div class="snapshot-info-item"><span class="snapshot-info-label">建立時間：</span>${new Date(snap.createdAt).toLocaleString('zh-TW')}</div>
        <div class="snapshot-info-item"><span class="snapshot-info-label">系統邊界：</span>${snap.boundary}</div>
        <div class="snapshot-info-item"><span class="snapshot-info-label">功能單位：</span>${snap.functionalUnit || '—'}</div>
        <div class="snapshot-info-item"><span class="snapshot-info-label">GWP：</span>IPCC ${snap.gwpVersion}</div>
        <div class="snapshot-info-item"><span class="snapshot-info-label">Hash：</span><code style="font-size:var(--fs-xs)">${snap.inventoryHash.slice(0,16)}...</code></div>
        <div class="snapshot-info-item">
          <span class="badge ${isValid ? 'badge-success' : 'badge-danger'}">${isValid ? '✓ 完整性驗證通過' : '✕ 完整性驗證失敗'}</span>
        </div>
      </div>
      ${snapshots.length > 1 ? `<div style="margin-bottom:var(--space-lg)"><label class="form-label">歷史版本：</label><select class="form-select" id="snap-version-select" style="width:auto;display:inline-block">${snapshots.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).map(s=>`<option value="${s.id}" ${s.id===snap.id?'selected':''}>${s.version} (${new Date(s.createdAt).toLocaleString('zh-TW')})</option>`).join('')}</select></div>` : ''}
      <div class="card inventory-table" style="position:relative;overflow:hidden">
        <div class="inventory-watermark">LOCKED · 唯讀</div>
        <div class="table-container" style="position:relative;z-index:1">
          <table class="data-table" id="inventory-table">
            <thead><tr>
              <th>遊程階段</th><th>項目名稱</th><th style="text-align:right">活動數據</th><th>單位</th><th style="text-align:right">分攤(%)</th><th style="text-align:right">排放係數</th><th>係數單位</th><th>數據類型</th><th>資料來源</th><th style="text-align:right">CO₂e (kgCO₂e)</th>
            </tr></thead>
            <tbody>
              ${renderInventoryRows(snap, project)}
            </tbody>
          </table>
        </div>
      </div>
      <div style="margin-top:var(--space-lg);display:flex;gap:var(--space-md)">
        <button class="btn btn-secondary btn-sm" id="btn-export-csv">📥 匯出 CSV</button>
        <button class="btn btn-secondary btn-sm" id="btn-copy-table">📋 複製表格</button>
      </div>
    </div>
  `;

  // Version switch
  const vSelect = document.getElementById('snap-version-select');
  if (vSelect) {
    vSelect.addEventListener('change', async () => {
      const selSnap = snapshots.find(s => s.id === vSelect.value);
      if (selSnap) {
        // Re-render with selected snapshot - simplified re-render
        const tbody = document.querySelector('#inventory-table tbody');
        tbody.innerHTML = renderInventoryRows(selSnap, project);
      }
    });
  }

  // Export CSV
  document.getElementById('btn-export-csv')?.addEventListener('click', () => {
    const headers = ['階段','項目','活動數據','單位','分攤比例%','排放係數','係數單位','數據類型','資料來源','CO2e_kgCO2e'];
    const rows = snap.lineItems.map(item => {
      const stageName = project.lifeCycleStages.find(s => s.id === item.stageId)?.name || item.stageId;
      return [stageName, item.itemName, item.activityData, item.activityUnit, item.allocationRatio||100, item.emissionFactorValue, item.emissionFactorUnit, item.dataType, item.dataSource||'', item.co2e?.toFixed(4)||0].join(',');
    });
    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `inventory_${snap.version}_${project.name}.csv`;
    a.click();
    showToast('CSV 已匯出','success');
  });

  // Copy table
  document.getElementById('btn-copy-table')?.addEventListener('click', () => {
    const table = document.getElementById('inventory-table');
    const range = document.createRange(); range.selectNode(table);
    window.getSelection().removeAllRanges(); window.getSelection().addRange(range);
    document.execCommand('copy');
    window.getSelection().removeAllRanges();
    showToast('表格已複製到剪貼簿','success');
  });
}

function renderInventoryRows(snap, project) {
  let html = '';
  const stageGroups = {};
  for (const item of snap.lineItems) {
    if (!stageGroups[item.stageId]) stageGroups[item.stageId] = [];
    stageGroups[item.stageId].push(item);
  }
  for (const [stageId, items] of Object.entries(stageGroups)) {
    const stageName = project.lifeCycleStages.find(s => s.id === stageId)?.name || stageId;
    for (const item of items) {
      html += `<tr>
        <td>${stageName}</td><td>${item.itemName}</td>
        <td class="cell-number">${item.activityData}</td><td>${item.activityUnit}</td>
        <td class="cell-number">${item.allocationRatio||100}%</td>
        <td class="cell-number">${item.emissionFactorValue}</td><td>${item.emissionFactorUnit}</td>
        <td>${item.dataType === 'primary' ? '初級' : '次級'}</td><td>${item.dataSource||'—'}</td>
        <td class="cell-number" style="font-weight:600">${item.co2e?.toFixed(4)||'—'}</td>
      </tr>`;
    }
    const stageTotal = items.reduce((s, i) => s + (i.co2e || 0), 0);
    html += `<tr class="stage-subtotal"><td colspan="9" style="text-align:right"><strong>${stageName} 小計</strong></td><td class="cell-number"><strong>${stageTotal.toFixed(4)}</strong></td></tr>`;
  }
  html += `<tr class="grand-total"><td colspan="9" style="text-align:right"><strong>遊程總計 (Total)</strong></td><td class="cell-number"><strong>${snap.totalCO2e.toFixed(4)}</strong></td></tr>`;
  
  const perCapita = snap.totalCO2e / (project.touristsCount || 1);
  html += `<tr class="grand-total" style="background-color: var(--accent-primary); color: white;"><td colspan="9" style="text-align:right"><strong>每人次碳足跡 (kgCO₂e / 人次)</strong></td><td class="cell-number" style="color: white;"><strong>${perCapita.toFixed(4)}</strong></td></tr>`;
  return html;
}
