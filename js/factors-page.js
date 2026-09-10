/**
 * factors-page.js — Emission factors management page
 */
import { getAllFactors, saveCustomFactor, deleteFactor, getFactorCategories, BUILT_IN_FACTORS } from './emission-factors.js';
import { showToast } from './app.js';

export async function renderFactorsPage(container) {
  const factors = await getAllFactors();
  const categories = getFactorCategories();

  const grouped = {};
  for (const cat of categories) grouped[cat] = [];
  for (const f of factors) {
    const cat = f.category || '其他';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(f);
  }

  container.innerHTML = `
    <div class="fade-in">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-lg)">
        <div>
          <h1 class="page-title">排放係數資料庫</h1>
          <p class="page-subtitle">共 ${factors.length} 筆排放係數（${factors.filter(f => f.isUserDefined).length} 筆自訂）</p>
        </div>
        <button class="btn btn-primary btn-sm" id="btn-add-factor">＋ 新增自訂係數</button>
      </div>

      <div id="factor-search" style="margin-bottom:var(--space-lg)">
        <input class="form-input" id="factor-search-input" placeholder="🔍 搜尋排放係數名稱、類別..." style="max-width:400px">
      </div>

      <div id="factors-container">
        ${Object.entries(grouped).filter(([,fs]) => fs.length > 0).map(([cat, fs]) => `
          <div class="card" style="margin-bottom:var(--space-lg)" data-category="${cat}">
            <div class="card-header">
              <h3 class="card-title">${cat} (${fs.length})</h3>
            </div>
            <div class="table-container">
              <table class="data-table">
                <thead><tr>
                  <th>名稱</th><th>係數值</th><th>單位</th><th>來源</th><th>年份</th><th>地理</th><th>GWP</th><th>類型</th><th class="cell-action">操作</th>
                </tr></thead>
                <tbody>
                  ${fs.map(f => `<tr class="factor-row" data-name="${f.name}" data-cat="${cat}">
                    <td><strong>${f.name}</strong></td>
                    <td class="cell-number">${f.coefficient}</td>
                    <td style="font-size:var(--fs-xs)">${f.numeratorUnit}/${f.denominatorUnit}</td>
                    <td style="font-size:var(--fs-xs)">${f.sourceName || '—'}</td>
                    <td>${f.announcementYear || '—'}</td>
                    <td>${f.geography || '—'}</td>
                    <td>${f.gwpVersion || '—'}</td>
                    <td>${f.isUserDefined ? '<span class="badge badge-info">自訂</span>' : '<span class="badge badge-default">內建</span>'}</td>
                    <td class="cell-action">
                      ${f.isUserDefined ? `<button class="btn btn-ghost btn-sm delete-factor-btn" data-id="${f.id}" title="刪除">✕</button>` : ''}
                    </td>
                  </tr>`).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  // Search
  document.getElementById('factor-search-input')?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('.factor-row').forEach(row => {
      const name = row.dataset.name?.toLowerCase() || '';
      const cat = row.dataset.cat?.toLowerCase() || '';
      row.style.display = (name.includes(q) || cat.includes(q)) ? '' : 'none';
    });
  });

  // Delete
  document.querySelectorAll('.delete-factor-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('確定刪除此自訂係數？')) return;
      await deleteFactor(btn.dataset.id);
      showToast('已刪除', 'success');
      renderFactorsPage(container);
    });
  });

  // Add custom factor
  document.getElementById('btn-add-factor')?.addEventListener('click', () => {
    showAddFactorModal(container);
  });
}

function showAddFactorModal(container) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  overlay.innerHTML = `
    <div class="modal" style="max-width:600px">
      <div class="modal-header"><h3>新增自訂排放係數</h3><button class="modal-close" id="close-factor-modal">✕</button></div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group"><label class="form-label">名稱 *</label><input class="form-input" id="nf-name"></div>
          <div class="form-group"><label class="form-label">類別</label>
            <select class="form-select" id="nf-cat"><option>能源</option><option>水資源</option><option>運輸</option><option>原料</option><option>廢棄處理</option><option>其他</option></select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">係數值 *</label><input class="form-input" type="number" id="nf-coeff" step="any"></div>
          <div class="form-group"><label class="form-label">分子單位</label><input class="form-input" id="nf-num" value="kgCO2e"></div>
          <div class="form-group"><label class="form-label">分母單位 *</label><input class="form-input" id="nf-den" placeholder="kWh, kg, L, tkm..."></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">來源名稱</label><input class="form-input" id="nf-source"></div>
          <div class="form-group"><label class="form-label">公告年份</label><input class="form-input" type="number" id="nf-year" value="${new Date().getFullYear()}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">地理範疇</label><input class="form-input" id="nf-geo" value="台灣"></div>
          <div class="form-group"><label class="form-label">GWP 版本</label>
            <select class="form-select" id="nf-gwp"><option>AR6</option><option>AR5</option></select>
          </div>
        </div>
        <div class="form-group"><label class="form-label">備註</label><input class="form-input" id="nf-note"></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary btn-sm" id="cancel-factor">取消</button>
        <button class="btn btn-primary btn-sm" id="save-factor">💾 儲存</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById('close-factor-modal').onclick = () => overlay.remove();
  document.getElementById('cancel-factor').onclick = () => overlay.remove();
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  document.getElementById('save-factor').addEventListener('click', async () => {
    const name = document.getElementById('nf-name').value.trim();
    const coeff = parseFloat(document.getElementById('nf-coeff').value);
    const den = document.getElementById('nf-den').value.trim();
    if (!name || isNaN(coeff) || !den) { showToast('請填寫名稱、係數值與分母單位', 'warning'); return; }
    await saveCustomFactor({
      name,
      category: document.getElementById('nf-cat').value,
      coefficient: coeff,
      numeratorUnit: document.getElementById('nf-num').value || 'kgCO2e',
      denominatorUnit: den,
      sourceName: document.getElementById('nf-source').value,
      announcementYear: parseInt(document.getElementById('nf-year').value) || new Date().getFullYear(),
      geography: document.getElementById('nf-geo').value || '台灣',
      gwpVersion: document.getElementById('nf-gwp').value,
      note: document.getElementById('nf-note').value,
    });
    overlay.remove();
    showToast('自訂係數已新增', 'success');
    renderFactorsPage(container);
  });
}
