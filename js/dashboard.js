/**
 * dashboard.js — Dashboard view
 */
import { Store, STORES, createProjectTemplate } from './store.js';
import { navigate, showToast } from './app.js';
import { calculateTotal } from './calculator.js';
import { logAction } from './audit-log.js';

export async function renderDashboard(container) {
  const projects = await Store.getAll(STORES.projects);
  // Compute stats
  let totalEmissions = 0;
  const projectStats = [];
  for (const p of projects) {
    const records = await Store.getAllByIndex(STORES.activityRecords, 'projectId', p.id);
    const { totalCO2e } = calculateTotal(records);
    totalEmissions += totalCO2e;
    projectStats.push({ ...p, totalCO2e, recordCount: records.length });
  }

  container.innerHTML = `
    <div class="page-title-section">
      <h1 class="page-title">儀表板</h1>
      <p class="page-subtitle">ISO 14067 產品碳足跡盤查與報告系統</p>
    </div>
    <div class="stats-grid stagger-children">
      <div class="card stat-card">
        <div class="stat-icon">📁</div>
        <div class="stat-value">${projects.length}</div>
        <div class="stat-label">專案數量</div>
      </div>
      <div class="card stat-card">
        <div class="stat-icon">🌱</div>
        <div class="stat-value">${totalEmissions.toFixed(2)}</div>
        <div class="stat-label">總碳排 (kgCO₂e)</div>
      </div>
      <div class="card stat-card">
        <div class="stat-icon">📊</div>
        <div class="stat-value">${projectStats.reduce((s, p) => s + p.recordCount, 0)}</div>
        <div class="stat-label">盤查項目數</div>
      </div>
      <div class="card stat-card">
        <div class="stat-icon">🔒</div>
        <div class="stat-value" id="snapshot-count">—</div>
        <div class="stat-label">已鎖定版本</div>
      </div>
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-lg)">
      <h2 style="font-size:var(--fs-lg)">專案列表</h2>
      <button class="btn btn-primary" id="btn-new-project">＋ 新增專案</button>
    </div>
    <div class="project-grid stagger-children" id="project-grid">
      ${projectStats.length === 0 ? `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-icon">📋</div>
          <div class="empty-text">尚無專案，點擊「新增專案」開始盤查</div>
        </div>
      ` : projectStats.map(p => `
        <div class="card project-card" data-id="${p.id}">
          <div class="project-card-header">
            <div>
              <div class="project-card-name">${p.name || '未命名專案'}</div>
              <div class="project-card-product">${p.productName || '—'}</div>
            </div>
            <span class="badge ${p.verificationStatus === 'third_party_verified' ? 'badge-success' : p.verificationStatus === 'internal_review' ? 'badge-info' : 'badge-warning'}">
              ${p.verificationStatus === 'third_party_verified' ? '已查證' : p.verificationStatus === 'internal_review' ? '內部審查' : '未查證'}
            </span>
          </div>
          <div class="project-card-meta">
            <span>📐 ${p.boundary === 'cradle-to-gate' ? 'C2Gate' : p.boundary === 'cradle-to-grave' ? 'C2Grave' : 'Partial'}</span>
            <span>📋 ${p.recordCount} 項</span>
            <span>📅 ${new Date(p.updatedAt).toLocaleDateString('zh-TW')}</span>
          </div>
          <div class="project-card-emission">
            <span class="project-card-emission-value">${p.totalCO2e.toFixed(4)}</span>
            <span class="project-card-emission-unit"> kgCO₂e / ${p.functionalUnit || 'FU'}</span>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  // Snapshot count
  const allSnaps = await Store.getAll(STORES.snapshots);
  document.getElementById('snapshot-count').textContent = allSnaps.length;

  // Event: new project
  document.getElementById('btn-new-project').addEventListener('click', async () => {
    const p = createProjectTemplate();
    p.name = '新專案 ' + (projects.length + 1);
    await Store.put(STORES.projects, p);
    await logAction(p.id, 'CREATE_PROJECT', `建立專案：${p.name}`);
    showToast('專案已建立', 'success');
    navigate('project', p.id);
  });

  // Event: click project card
  container.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('click', () => navigate('project', card.dataset.id));
  });
}
