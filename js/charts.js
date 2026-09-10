/**
 * charts.js — Chart.js visualizations
 */
import { Store, STORES } from './store.js';
import { calculateTotal, calculatePercentages, identifyHotspots } from './calculator.js';

const STAGE_COLORS = {
  transport: '#14b8a6',
  accommodation: '#06b6d4',
  food: '#8b5cf6',
  activities: '#f59e0b',
  waste: '#ef4444',
};
const STAGE_NAMES = { transport:'交通運輸', accommodation:'住宿服務', food:'餐飲服務', activities:'活動與遊憩', waste:'廢棄物處理' };

export async function renderCharts(tc, project) {
  const records = await Store.getAllByIndex(STORES.activityRecords, 'projectId', project.id);
  const { totalCO2e, fossil, biogenicEmission, biogenicRemoval, luc, stages } = calculateTotal(records);
  const pcts = calculatePercentages(stages, totalCO2e);
  const hotspots = identifyHotspots(stages, totalCO2e, 30);

  tc.innerHTML = `
    <div class="fade-in">
      ${records.length === 0 ? '<div class="card"><div class="empty-state"><div class="empty-icon">📊</div><div class="empty-text">尚無盤查資料，請先在「盤查資料輸入」頁面新增活動數據。</div></div></div>' : `
      <div class="charts-grid">
        <div class="card">
          <div class="card-header"><h4 class="card-title">各階段排放佔比</h4></div>
          <div class="chart-wrapper"><canvas id="chart-pie"></canvas></div>
        </div>
        <div class="card">
          <div class="card-header"><h4 class="card-title">各階段排放量比較</h4></div>
          <div class="chart-wrapper"><canvas id="chart-bar"></canvas></div>
        </div>
      </div>
      <div class="card" style="margin-top:var(--space-lg)">
        <div class="card-header"><h4 class="card-title">碳來源分佈</h4></div>
        <div class="chart-wrapper" style="height:250px"><canvas id="chart-carbon-type"></canvas></div>
      </div>
      <div class="card" style="margin-top:var(--space-lg)">
        <div class="card-header"><h4 class="card-title">🔥 排放熱點分析</h4></div>
        <div class="card-body">
          ${hotspots.length > 0 ? hotspots.map(h => `
            <div style="display:flex;align-items:center;gap:var(--space-md);margin-bottom:var(--space-md);padding:var(--space-md);border-radius:var(--radius-md);background:rgba(239,68,68,0.05);border:1px solid rgba(239,68,68,0.15)">
              <span style="font-size:1.3rem">🔥</span>
              <div>
                <strong>${STAGE_NAMES[h.stageId]||h.stageId}</strong>
                <span style="color:var(--accent-danger);margin-left:var(--space-sm)">${h.percentage.toFixed(1)}%</span>
                <span style="color:var(--text-muted);margin-left:var(--space-sm)">(${h.totalCO2e.toFixed(4)} kgCO₂e)</span>
              </div>
            </div>
          `).join('') : '<p style="color:var(--text-muted)">無明顯排放熱點（所有階段佔比均低於 30%）。</p>'}
        </div>
      </div>
      `}
    </div>
  `;

  if (records.length === 0) return;

  // Wait for Chart.js
  await waitForChartJS();

  const labels = [];
  const data = [];
  const colors = [];
  for (const [id, s] of Object.entries(pcts)) {
    labels.push(STAGE_NAMES[id] || id);
    data.push(parseFloat(s.totalCO2e.toFixed(4)));
    colors.push(STAGE_COLORS[id] || '#64748b');
  }

  // Pie chart
  new Chart(document.getElementById('chart-pie'), {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors, borderColor: '#111827', borderWidth: 2 }],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 16, font: { family: 'Inter', size: 12 } } },
        tooltip: { callbacks: { label: ctx => `${ctx.label}: ${ctx.parsed.toFixed(4)} kgCO₂e (${(ctx.parsed/totalCO2e*100).toFixed(1)}%)` } },
      },
    },
  });

  // Bar chart
  new Chart(document.getElementById('chart-bar'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{ label: 'kgCO₂e', data, backgroundColor: colors.map(c => c + '99'), borderColor: colors, borderWidth: 1 }],
    },
    options: {
      responsive: true,
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => `${ctx.parsed.x.toFixed(4)} kgCO₂e` } },
      },
      scales: {
        x: { ticks: { color: '#94a3b8', font: { family: 'Inter' } }, grid: { color: 'rgba(55,65,81,0.3)' } },
        y: { ticks: { color: '#94a3b8', font: { family: 'Inter' } }, grid: { display: false } },
      },
    },
  });

  // Carbon type bar chart
  new Chart(document.getElementById('chart-carbon-type'), {
    type: 'bar',
    data: {
      labels: ['化石碳排', '生質碳排', '生質碳移除', '土地利用變遷 (LUC)'],
      datasets: [{
        data: [fossil, biogenicEmission, biogenicRemoval, luc],
        backgroundColor: ['#f59e0b99', '#10b98199', '#3b82f699', '#8b5cf699'],
        borderColor: ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'],
        borderWidth: 1
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => `${ctx.parsed.y.toFixed(4)} kgCO₂e` } },
      },
      scales: {
        x: { ticks: { color: '#94a3b8', font: { family: 'Inter' } }, grid: { display: false } },
        y: { ticks: { color: '#94a3b8', font: { family: 'Inter' } }, grid: { color: 'rgba(55,65,81,0.3)' } },
      },
    },
  });
}

function waitForChartJS() {
  return new Promise(resolve => {
    if (typeof Chart !== 'undefined') return resolve();
    const check = setInterval(() => { if (typeof Chart !== 'undefined') { clearInterval(check); resolve(); } }, 100);
    setTimeout(() => { clearInterval(check); resolve(); }, 5000);
  });
}
