/**
 * project.js — Project detail view with tabs
 */
import { Store, STORES, createActivityRecord } from './store.js';
import { showToast, navigate } from './app.js';
import { getAllFactors } from './emission-factors.js';
import { calculateTotal, calculatePercentages, calculateSingleEmission, validateRecords, calculateDataRatio, calculateMassBalance } from './calculator.js';
import { createSnapshot, getLatestSnapshot, getSnapshots } from './snapshots.js';
import { logAction, getProjectLog } from './audit-log.js';
import { renderInventory } from './inventory.js';
import { renderReportEditor } from './report.js';
import { renderCharts } from './charts.js';
import { validateProject, checkSnapshotReadiness, renderValidationSummary } from './validation.js';
import { renderDQAssessment } from './dq-assessment.js';
import { renderUncertainty } from './uncertainty.js';
import { exportProjectBundle, exportAuditLog } from './export.js';

export let currentProjectState = null;

const BOUNDARY_LABELS = {
  'cradle-to-gate': '搖籃到大門 (Cradle-to-Gate)',
  'cradle-to-grave': '搖籃到墳墓 (Cradle-to-Grave)',
  'partial': '部分碳足跡 (Partial CFP)',
};
const ALLOC_LABELS = { mass:'質量分配', economic:'經濟分配', energy:'能量分配', system_expansion:'系統擴展', other:'其他' };

export async function renderProject(container, projectId) {
  const project = await Store.get(STORES.projects, projectId);
  if (!project) { showToast('專案不存在','error'); navigate('dashboard'); return; }
  currentProjectState = project;

  container.innerHTML = `
    <div class="page-title-section" style="display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <h1 class="page-title" id="proj-title">${project.name || '未命名專案'}</h1>
        <p class="page-subtitle">${project.productName || '—'} · ${BOUNDARY_LABELS[project.boundary]||project.boundary}</p>
      </div>
      <div style="display:flex;gap:var(--space-sm)">
        <button class="btn btn-secondary btn-sm" id="btn-export-bundle" title="匯出專案封存包">📦 匯出</button>
        <button class="btn btn-secondary btn-sm" id="btn-delete-proj">🗑 刪除</button>
      </div>
    </div>
    <div class="tab-bar" id="project-tabs">
      <div class="tab-item active" data-tab="info">基本資訊</div>
      <div class="tab-item" data-tab="data">盤查資料輸入</div>
      <div class="tab-item" data-tab="inventory">📋 盤查清冊</div>
      <div class="tab-item" data-tab="report">📝 碳足跡報告</div>
      <div class="tab-item" data-tab="charts">📊 圖表分析</div>
      <div class="tab-item" data-tab="dq">🎯 數據品質</div>
      <div class="tab-item" data-tab="uncertainty">📐 敏感度</div>
      <div class="tab-item" data-tab="audit">📋 審計日誌</div>
    </div>
    <div id="tab-content"></div>
  `;

  // Tab switching
  let activeTab = 'info';
  container.querySelectorAll('.tab-item').forEach(t => {
    t.addEventListener('click', () => {
      container.querySelectorAll('.tab-item').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      activeTab = t.dataset.tab;
      renderTab(activeTab);
    });
  });

  // Export bundle
  document.getElementById('btn-export-bundle').addEventListener('click', () => exportProjectBundle(project));

  // Delete
  document.getElementById('btn-delete-proj').addEventListener('click', async () => {
    if (!confirm('確定刪除此專案？此操作不可復原。')) return;
    const recs = await Store.getAllByIndex(STORES.activityRecords,'projectId',projectId);
    for (const r of recs) await Store.delete(STORES.activityRecords, r.id);
    const snaps = await Store.getAllByIndex(STORES.snapshots,'projectId',projectId);
    for (const s of snaps) await Store.delete(STORES.snapshots, s.id);
    await Store.delete(STORES.projects, projectId);
    showToast('專案已刪除','success'); navigate('dashboard');
  });

  async function renderTab(tab) {
    const tc = document.getElementById('tab-content');
    if (tab === 'info') await renderInfoTab(tc, project);
    else if (tab === 'data') await renderDataTab(tc, project);
    else if (tab === 'inventory') await renderInventory(tc, project);
    else if (tab === 'report') await renderReportEditor(tc, project);
    else if (tab === 'charts') await renderCharts(tc, project);
    else if (tab === 'dq') await renderDQTab(tc, project);
    else if (tab === 'uncertainty') await renderUncertaintyTab(tc, project);
    else if (tab === 'audit') await renderAuditTab(tc, project);
  }

  renderTab('info');
}

async function renderInfoTab(tc, project) {
  const stages = project.lifeCycleStages;
  tc.innerHTML = `
    <div class="card fade-in">
      <div class="card-header"><h3 class="card-title">方法學與專案設定</h3></div>
      <div class="card-body">
        <div class="form-row">
          <div class="form-group"><label class="form-label">專案名稱 <span class="required">*</span></label><input class="form-input" id="f-name" value="${project.name||''}"></div>
          <div class="form-group"><label class="form-label">產品名稱 <span class="required">*</span></label><input class="form-input" id="f-product" value="${project.productName||''}"></div>
        </div>
        <div class="form-group"><label class="form-label">產品描述</label><textarea class="form-textarea" id="f-desc">${project.productDescription||''}</textarea></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">功能單位 <span class="required">*</span></label><input class="form-input" id="f-fu" value="${project.functionalUnit||''}" placeholder="例: 1 kg 產品 X"></div>
          <div class="form-group"><label class="form-label">宣告單位</label><input class="form-input" id="f-du" value="${project.declaredUnit||''}" placeholder="B2B 中間品適用"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">系統邊界 <span class="required">*</span></label>
            <select class="form-select" id="f-boundary">
              ${Object.entries(BOUNDARY_LABELS).map(([k,v])=>`<option value="${k}" ${project.boundary===k?'selected':''}>${v}</option>`).join('')}
            </select>
          </div>
          <div class="form-group"><label class="form-label">GWP 版本 <span class="required">*</span></label>
            <select class="form-select" id="f-gwp">
              <option value="AR5" ${project.gwpVersion==='AR5'?'selected':''}>IPCC AR5</option>
              <option value="AR6" ${project.gwpVersion==='AR6'?'selected':''}>IPCC AR6</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">分配方法 <span class="required">*</span></label>
            <select class="form-select" id="f-alloc">
              ${Object.entries(ALLOC_LABELS).map(([k,v])=>`<option value="${k}" ${project.allocationMethod===k?'selected':''}>${v}</option>`).join('')}
            </select>
          </div>
          <div class="form-group"><label class="form-label">數據期間 <span class="required">*</span></label><input class="form-input" id="f-period" value="${project.dataPeriod||''}" placeholder="例: 2025年全年"></div>
        </div>
        <div class="form-group"><label class="form-label">截斷準則 <span class="required">*</span></label><textarea class="form-textarea" id="f-cutoff" rows="2">${project.cutoffCriteria||''}</textarea></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">PCR 引用</label><input class="form-input" id="f-pcr" value="${project.pcrReference||''}"></div>
          <div class="form-group"><label class="form-label">地理範疇</label><input class="form-input" id="f-geo" value="${project.geographicScope||''}"></div>
          <div class="form-group"><label class="form-label">技術範疇</label><input class="form-input" id="f-tech" value="${project.technologyScope||''}"></div>
        </div>
        <div class="form-group"><label class="form-label">研究目標</label><textarea class="form-textarea" id="f-goal" rows="2">${project.studyGoal||''}</textarea></div>
        <div class="form-group"><label class="form-label">預期讀者</label><input class="form-input" id="f-audience" value="${project.intendedAudience||''}"></div>
        <hr class="divider">
        <h4 style="margin-bottom:var(--space-base)">產品與共生產品設定 (分配基準)</h4>
        <div class="form-row" style="background:var(--bg-secondary);padding:var(--space-md);border-radius:var(--radius-md);margin-bottom:var(--space-md)">
          <div class="form-group"><label class="form-label">主產品產出量 (質量)</label><input class="form-input" id="f-main-mass" type="number" value="${project.mainProduct?.mass||1}"></div>
          <div class="form-group"><label class="form-label">主產品經濟價值</label><input class="form-input" id="f-main-value" type="number" value="${project.mainProduct?.value||1}"></div>
          <div class="form-group"><label class="form-label">主產品能量值</label><input class="form-input" id="f-main-energy" type="number" value="${project.mainProduct?.energy||0}"></div>
        </div>
        <div id="coproducts-container"></div>
        <button class="btn btn-secondary btn-sm" id="btn-add-coproduct" style="margin-bottom:var(--space-md)">＋ 新增共生產品</button>
        <hr class="divider">
        <h4 style="margin-bottom:var(--space-base)">生命週期階段設定</h4>
        <div id="stages-config" style="display:flex;flex-wrap:wrap;gap:var(--space-base)">
          ${stages.map(s=>`
            <label style="display:flex;align-items:center;gap:var(--space-sm);cursor:pointer;padding:var(--space-sm) var(--space-md);border-radius:var(--radius-md);border:1px solid var(--border-primary);font-size:var(--fs-sm)">
              <input type="checkbox" data-stage="${s.id}" ${s.enabled?'checked':''}>
              ${s.name}
            </label>
          `).join('')}
        </div>
        <p class="form-hint" style="margin-top:var(--space-sm)">系統邊界為 Cradle-to-Gate 時，建議關閉「使用階段」與「廢棄處理」。</p>
        <hr class="divider">
        <div class="form-row">
          <div class="form-group"><label class="form-label">查證狀態</label>
            <select class="form-select" id="f-verify">
              <option value="unverified" ${project.verificationStatus==='unverified'?'selected':''}>尚未查證</option>
              <option value="internal_review" ${project.verificationStatus==='internal_review'?'selected':''}>內部審查</option>
              <option value="third_party_verified" ${project.verificationStatus==='third_party_verified'?'selected':''}>第三方查證完成</option>
            </select>
          </div>
        </div>
        <div style="margin-top:var(--space-lg)"><button class="btn btn-primary" id="btn-save-info">💾 儲存設定</button></div>
      </div>
    </div>
  `;

  // Boundary change auto-toggle stages
  document.getElementById('f-boundary').addEventListener('change', (e) => {
    const val = e.target.value;
    const checks = document.querySelectorAll('#stages-config input[type=checkbox]');
    checks.forEach(c => {
      if (val === 'cradle-to-gate') {
        if (c.dataset.stage === 'use' || c.dataset.stage === 'end_of_life') c.checked = false;
        else c.checked = true;
      } else if (val === 'cradle-to-grave') {
        c.checked = true;
      }
    });
  });

  const renderCoProducts = () => {
    const cpc = document.getElementById('coproducts-container');
    cpc.innerHTML = project.coProducts.map((cp, idx) => `
      <div class="form-row" style="align-items:flex-end;margin-bottom:var(--space-sm)">
        <div class="form-group"><label class="form-label">共生產品名稱</label><input class="form-input cp-name" value="${cp.name||''}" data-idx="${idx}"></div>
        <div class="form-group"><label class="form-label">質量</label><input class="form-input cp-mass" type="number" value="${cp.mass||0}" data-idx="${idx}"></div>
        <div class="form-group"><label class="form-label">經濟價值</label><input class="form-input cp-value" type="number" value="${cp.value||0}" data-idx="${idx}"></div>
        <div class="form-group"><label class="form-label">能量值</label><input class="form-input cp-energy" type="number" value="${cp.energy||0}" data-idx="${idx}"></div>
        <div class="form-group"><button class="btn btn-ghost btn-sm cp-del" data-idx="${idx}" style="color:var(--accent-danger)">✕ 移除</button></div>
      </div>
    `).join('');
    
    cpc.querySelectorAll('.cp-del').forEach(btn => {
      btn.addEventListener('click', (e) => {
        project.coProducts.splice(e.target.dataset.idx, 1);
        renderCoProducts();
      });
    });
    cpc.querySelectorAll('input').forEach(inp => {
      inp.addEventListener('change', (e) => {
        const idx = e.target.dataset.idx;
        const field = e.target.classList.contains('cp-name') ? 'name' : e.target.classList.contains('cp-mass') ? 'mass' : e.target.classList.contains('cp-value') ? 'value' : 'energy';
        project.coProducts[idx][field] = field === 'name' ? e.target.value : Number(e.target.value);
      });
    });
  };
  
  document.getElementById('btn-add-coproduct').addEventListener('click', () => {
    project.coProducts = project.coProducts || [];
    project.coProducts.push({ name: '', mass: 0, value: 0, energy: 0 });
    renderCoProducts();
  });
  renderCoProducts();

  // Save
  document.getElementById('btn-save-info').addEventListener('click', async () => {
    project.name = document.getElementById('f-name').value;
    project.productName = document.getElementById('f-product').value;
    project.productDescription = document.getElementById('f-desc').value;
    project.functionalUnit = document.getElementById('f-fu').value;
    project.declaredUnit = document.getElementById('f-du').value;
    project.boundary = document.getElementById('f-boundary').value;
    project.gwpVersion = document.getElementById('f-gwp').value;
    project.allocationMethod = document.getElementById('f-alloc').value;
    project.dataPeriod = document.getElementById('f-period').value;
    project.cutoffCriteria = document.getElementById('f-cutoff').value;
    project.pcrReference = document.getElementById('f-pcr').value;
    project.geographicScope = document.getElementById('f-geo').value;
    project.technologyScope = document.getElementById('f-tech').value;
    project.studyGoal = document.getElementById('f-goal').value;
    project.intendedAudience = document.getElementById('f-audience').value;
    project.verificationStatus = document.getElementById('f-verify').value;
    project.mainProduct = {
      mass: Number(document.getElementById('f-main-mass').value) || 0,
      value: Number(document.getElementById('f-main-value').value) || 0,
      energy: Number(document.getElementById('f-main-energy').value) || 0
    };
    // Stages
    document.querySelectorAll('#stages-config input[type=checkbox]').forEach(c => {
      const stage = project.lifeCycleStages.find(s => s.id === c.dataset.stage);
      if (stage) stage.enabled = c.checked;
    });
    project.updatedAt = new Date().toISOString();
    await Store.put(STORES.projects, project);
    await logAction(project.id, 'UPDATE_PROJECT', '更新專案設定');
    document.getElementById('proj-title').textContent = project.name;
    showToast('設定已儲存','success');
  });
}

async function renderDataTab(tc, project) {
  const factors = await getAllFactors();
  const records = await Store.getAllByIndex(STORES.activityRecords, 'projectId', project.id);
  const enabledStages = project.lifeCycleStages.filter(s => s.enabled);

  const { totalCO2e, fossil, biogenicEmission, biogenicRemoval, luc, stages } = calculateTotal(records);
  const pcts = calculatePercentages(stages, totalCO2e);
  const dataRatio = calculateDataRatio(records);
  const massBalance = calculateMassBalance(records);

  tc.innerHTML = `
    <div class="fade-in">
      <div style="display:flex;gap:var(--space-lg);margin-bottom:var(--space-md);flex-wrap:wrap">
        <div class="card stat-card" style="flex:1;min-width:140px">
          <div class="stat-value">${totalCO2e.toFixed(4)}</div>
          <div class="stat-label">總碳排 (kgCO₂e)</div>
        </div>
        <div class="card stat-card" style="flex:1;min-width:140px;border-left:4px solid var(--accent-warning)">
          <div class="stat-value">${fossil.toFixed(4)}</div>
          <div class="stat-label">化石碳排</div>
        </div>
        <div class="card stat-card" style="flex:1;min-width:140px;border-left:4px solid var(--accent-success)">
          <div class="stat-value">${biogenicEmission.toFixed(4)}</div>
          <div class="stat-label">生質碳排</div>
        </div>
        <div class="card stat-card" style="flex:1;min-width:140px;border-left:4px solid var(--accent-primary)">
          <div class="stat-value">${biogenicRemoval.toFixed(4)}</div>
          <div class="stat-label">生質碳移除</div>
        </div>
      </div>
      
      <div class="card" style="margin-bottom:var(--space-lg);border:${massBalance.errorPct>5?'1px solid var(--accent-danger)':'1px solid var(--border-primary)'}">
        <div class="card-header"><h4 class="card-title">⚖️ 質量平衡檢核</h4></div>
        <div class="card-body" style="display:flex;gap:var(--space-lg);align-items:center">
           <div>投入總量: <strong>${massBalance.totalInput.toFixed(2)}</strong></div>
           <div>產出總量: <strong>${massBalance.totalOutput.toFixed(2)}</strong></div>
           <div>差異: <strong>${massBalance.diff.toFixed(2)}</strong></div>
           <div style="color:${massBalance.errorPct>5?'var(--accent-danger)':'var(--accent-success)'}">誤差率: <strong>${massBalance.errorPct.toFixed(2)}%</strong> ${massBalance.errorPct>5?'(警告: 誤差過大)':'(正常)'}</div>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-lg)">
        <h3>活動數據輸入</h3>
        <button class="btn btn-primary btn-sm" id="btn-lock-snapshot">🔒 鎖定盤查版本</button>
      </div>
      <div id="stages-container"></div>
    </div>
  `;

  const stagesContainer = document.getElementById('stages-container');

  for (const stage of enabledStages) {
    const stageRecords = records.filter(r => r.stageId === stage.id);
    const stageTotal = pcts[stage.id]?.totalCO2e || 0;

    const section = document.createElement('div');
    section.className = 'card';
    section.style.marginBottom = 'var(--space-lg)';
    section.innerHTML = `
      <div class="card-header">
        <h4 class="card-title">${stage.name}</h4>
        <div style="display:flex;align-items:center;gap:var(--space-md)">
          <span class="tag">${stageTotal.toFixed(4)} kgCO₂e</span>
          <button class="btn btn-secondary btn-sm add-record-btn" data-stage="${stage.id}">＋ 新增項目</button>
        </div>
      </div>
      <div class="table-container">
        <table class="data-table">
          <thead><tr>
            <th>項目名稱</th><th>活動數據</th><th>單位</th><th>排放係數</th><th>碳來源</th><th>數據類型</th><th>質量平衡</th><th>佐證資料</th><th style="text-align:right">CO₂e (kg)</th><th class="cell-action">操作</th>
          </tr></thead>
          <tbody id="stage-${stage.id}-body">
            ${stageRecords.length === 0 ? `<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:var(--space-xl)">尚無資料，點擊「新增項目」開始輸入</td></tr>` : stageRecords.map(r => {
              const f = factors.find(x => x.id === r.emissionFactorId);
              const { co2e } = calculateSingleEmission(r.activityData, r.activityUnit, r.emissionFactorValue, r.emissionFactorUnit, r.carbonType);
              return `<tr data-record-id="${r.id}">
                <td><input class="form-input" style="min-width:120px" value="${r.itemName}" data-field="itemName"></td>
                <td><input class="form-input" type="number" style="width:80px" value="${r.activityData}" data-field="activityData" step="any"></td>
                <td><input class="form-input" style="width:60px" value="${r.activityUnit}" data-field="activityUnit"></td>
                <td><select class="form-select" data-field="emissionFactorId" style="min-width:120px">
                  <option value="">選擇係數</option>
                  ${factors.map(ff=>`<option value="${ff.id}" ${r.emissionFactorId===ff.id?'selected':''}>${ff.name}</option>`).join('')}
                  <option value="__custom">自訂係數值</option>
                </select></td>
                <td><select class="form-select" data-field="carbonType" style="width:80px">
                  <option value="fossil" ${r.carbonType==='fossil'?'selected':''}>化石</option>
                  <option value="biogenic" ${r.carbonType==='biogenic'?'selected':''}>生質</option>
                  <option value="luc" ${r.carbonType==='luc'?'selected':''}>LUC</option>
                </select></td>
                <td><select class="form-select" data-field="dataType" style="width:80px">
                  <option value="primary" ${r.dataType==='primary'?'selected':''}>初級</option>
                  <option value="secondary" ${r.dataType==='secondary'?'selected':''}>次級</option>
                </select></td>
                <td style="font-size:12px;display:flex;gap:4px">
                  <select data-field="isInput" style="width:60px;padding:2px">
                    <option value="true" ${r.isInput?'selected':''}>投入</option>
                    <option value="false" ${!r.isInput?'selected':''}>產出</option>
                  </select>
                  <input type="number" data-field="massValue" style="width:60px;padding:2px" placeholder="kg" value="${r.massValue||0}">
                </td>
                <td><input class="form-input" style="width:100px" placeholder="網址或檔名" value="${r.evidenceUrl||''}" data-field="evidenceUrl"></td>
                <td class="cell-number" style="font-weight:600;color:var(--accent-primary)">${co2e.toFixed(4)}</td>
                <td class="cell-action"><button class="btn btn-ghost btn-sm delete-record" data-id="${r.id}" title="刪除">✕</button></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
    stagesContainer.appendChild(section);
  }

  // Add record
  stagesContainer.querySelectorAll('.add-record-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const r = createActivityRecord(project.id, btn.dataset.stage);
      await Store.put(STORES.activityRecords, r);
      await logAction(project.id, 'ADD_RECORD', `新增活動數據項目 (${btn.dataset.stage})`);
      await renderDataTab(tc, project);
    });
  });

  // Delete record
  stagesContainer.querySelectorAll('.delete-record').forEach(btn => {
    btn.addEventListener('click', async () => {
      await Store.delete(STORES.activityRecords, btn.dataset.id);
      await logAction(project.id, 'DELETE_RECORD', '刪除活動數據項目');
      await renderDataTab(tc, project);
    });
  });

  // Auto-save on field change
  stagesContainer.querySelectorAll('tr[data-record-id]').forEach(row => {
    const rid = row.dataset.recordId;
    row.querySelectorAll('[data-field]').forEach(input => {
      const handler = async () => {
        const rec = await Store.get(STORES.activityRecords, rid);
        if (!rec) return;
        const field = input.dataset.field;
        if (field === 'activityData' || field === 'massValue') {
          rec[field] = parseFloat(input.value) || 0;
        } else if (field === 'isInput') {
          rec[field] = input.value === 'true';
        } else if (field === 'emissionFactorId') {
          if (input.value === '__custom') {
            const val = prompt('請輸入自訂排放係數值 (kgCO₂e)：');
            if (val !== null) {
              rec.emissionFactorId = '';
              rec.emissionFactorValue = parseFloat(val) || 0;
              rec.emissionFactorUnit = rec.activityUnit || 'kg';
            }
          } else {
            rec.emissionFactorId = input.value;
            const f = factors.find(x => x.id === input.value);
            if (f) {
              rec.emissionFactorValue = f.coefficient;
              rec.emissionFactorUnit = f.denominatorUnit;
            }
          }
        } else {
          rec[field] = input.value;
        }
        // Recalc
        const { co2e } = calculateSingleEmission(rec.activityData, rec.activityUnit, rec.emissionFactorValue, rec.emissionFactorUnit, rec.carbonType);
        rec.co2e = co2e;
        await Store.put(STORES.activityRecords, rec);
        // We need to re-render to update the top stats and mass balance
        if (field === 'activityData' || field === 'emissionFactorId' || field === 'carbonType' || field === 'isInput' || field === 'massValue') {
          await renderDataTab(tc, project);
        } else {
          // just update display cell if it's a minor field, but safer to re-render
          const co2eCell = row.querySelector('.cell-number');
          if (co2eCell) co2eCell.textContent = co2e.toFixed(4);
        }
      };
      input.addEventListener('change', handler);
      if (input.tagName === 'INPUT') input.addEventListener('blur', handler);
    });
  });

  // Lock snapshot with full validation
  document.getElementById('btn-lock-snapshot').addEventListener('click', async () => {
    const recs = await Store.getAllByIndex(STORES.activityRecords, 'projectId', project.id);
    if (recs.length === 0) { showToast('無盤查資料可鎖定','warning'); return; }
    const factors = await getAllFactors();
    const readiness = checkSnapshotReadiness(project, recs, factors);
    if (!readiness.ready) {
      showToast(`有 ${readiness.errors.length} 項錯誤，請先修正`,'warning');
      // Show validation details
      const vDiv = document.createElement('div');
      vDiv.className = 'card';
      vDiv.style.cssText = 'margin-top:var(--space-lg);border:1px solid var(--accent-danger)';
      vDiv.innerHTML = `<div class="card-header"><h4 class="card-title">🚫 鎖定前驗證未通過</h4></div><div class="card-body">${renderValidationSummary(readiness.allIssues)}</div>`;
      const existing = tc.querySelector('.validation-result');
      if (existing) existing.remove();
      vDiv.classList.add('validation-result');
      tc.querySelector('.fade-in').appendChild(vDiv);
      return;
    }
    if (readiness.warnings.length > 0) {
      const proceed = confirm(`有 ${readiness.warnings.length} 項警告。是否仍要鎖定？`);
      if (!proceed) return;
    }
    const snap = await createSnapshot(project);
    showToast(`盤查版本 ${snap.version} 已鎖定 ✓`,'success');
  });
}

// ── New tabs ──

async function renderDQTab(tc, project) {
  const records = await Store.getAllByIndex(STORES.activityRecords, 'projectId', project.id);
  const factors = await getAllFactors();
  if (records.length === 0) {
    tc.innerHTML = '<div class="card fade-in"><div class="empty-state"><div class="empty-icon">🎯</div><div class="empty-text">尚無盤查資料，無法評估數據品質。</div></div></div>';
    return;
  }
  renderDQAssessment(tc, project, records, factors);
}

async function renderUncertaintyTab(tc, project) {
  const records = await Store.getAllByIndex(STORES.activityRecords, 'projectId', project.id);
  renderUncertainty(tc, project, records);
}

async function renderAuditTab(tc, project) {
  const logs = await getProjectLog(project.id);
  const sorted = logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  tc.innerHTML = `<div class="fade-in">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-lg)">
      <h3>審計日誌</h3>
      <button class="btn btn-secondary btn-sm" id="btn-export-audit">📥 匯出 CSV</button>
    </div>
    <div class="card">
      <div class="table-container">
        <table class="data-table">
          <thead><tr><th>時間</th><th>操作</th><th>描述</th></tr></thead>
          <tbody>
            ${sorted.length === 0 ? '<tr><td colspan="3" style="text-align:center;color:var(--text-muted);padding:var(--space-xl)">尚無操作紀錄</td></tr>' :
              sorted.map(l => `<tr>
                <td style="white-space:nowrap;font-size:var(--fs-sm)">${new Date(l.timestamp).toLocaleString('zh-TW')}</td>
                <td><span class="tag">${l.action}</span></td>
                <td>${l.description || '—'}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  </div>`;
  document.getElementById('btn-export-audit')?.addEventListener('click', () => exportAuditLog(project));
}
