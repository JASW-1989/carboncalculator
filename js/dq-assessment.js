/**
 * dq-assessment.js — Data Quality Indicator (DQI) assessment
 * Semi-quantitative 5-criteria matrix per ISO 14067 / PEF guidelines
 */

const DQ_CRITERIA = [
  { id: 'trr', name: '時間代表性 (TRR)', description: '數據年份與研究期間的差距',
    options: [
      { score: 1, label: '≤3 年差距' }, { score: 2, label: '4-6 年差距' },
      { score: 3, label: '7-10 年差距' }, { score: 4, label: '11-15 年差距' },
      { score: 5, label: '>15 年差距或不明' },
    ] },
  { id: 'grr', name: '地理代表性 (GRR)', description: '數據來源地區與實際製程地區的一致性',
    options: [
      { score: 1, label: '完全相同地區' }, { score: 2, label: '類似地區（同國家）' },
      { score: 3, label: '同區域（如東亞）' }, { score: 4, label: '不同區域但類似技術水平' },
      { score: 5, label: '不同區域或不明' },
    ] },
  { id: 'ter', name: '技術代表性 (TER)', description: '數據所代表的技術與實際製程的一致性',
    options: [
      { score: 1, label: '完全相同技術' }, { score: 2, label: '類似技術' },
      { score: 3, label: '同類別但不同技術' }, { score: 4, label: '相關但差異較大' },
      { score: 5, label: '不同技術或不明' },
    ] },
  { id: 'precision', name: '精確性 (P)', description: '數據的精確程度',
    options: [
      { score: 1, label: '實測數據（不確定性 <10%）' }, { score: 2, label: '實測數據（不確定性 10-20%）' },
      { score: 3, label: '基於計算的次級數據' }, { score: 4, label: '推估數據' },
      { score: 5, label: '粗略估計或不明' },
    ] },
  { id: 'completeness', name: '完整性 (C)', description: '數據涵蓋相關物質流的程度',
    options: [
      { score: 1, label: '涵蓋 >95%' }, { score: 2, label: '涵蓋 90-95%' },
      { score: 3, label: '涵蓋 80-90%' }, { score: 4, label: '涵蓋 50-80%' },
      { score: 5, label: '涵蓋 <50% 或不明' },
    ] },
];

const RATING_MAP = [
  { max: 1.5, label: '優秀', color: '#10b981', badge: 'badge-success' },
  { max: 2.5, label: '良好', color: '#14b8a6', badge: 'badge-success' },
  { max: 3.5, label: '尚可', color: '#f59e0b', badge: 'badge-warning' },
  { max: 4.5, label: '不佳', color: '#f97316', badge: 'badge-warning' },
  { max: 6, label: '極差', color: '#ef4444', badge: 'badge-danger' },
];

export function calculateDQR(scores) {
  const values = DQ_CRITERIA.map(c => scores[c.id] || 3);
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  const rating = RATING_MAP.find(r => avg <= r.max) || RATING_MAP[4];
  return { dqr: avg, scores: values, rating };
}

export function autoAssessDQ(record, factor, project) {
  const scores = {};
  const yr = new Date().getFullYear();
  // TRR
  if (factor) {
    const d = yr - (factor.announcementYear || yr);
    scores.trr = d <= 3 ? 1 : d <= 6 ? 2 : d <= 10 ? 3 : d <= 15 ? 4 : 5;
  } else scores.trr = 4;
  // GRR
  if (factor && project) {
    scores.grr = factor.geography === project.geographicScope ? 1
      : (factor.geography === '台灣' || project.geographicScope === '台灣') ? 2
      : factor.geography === '全球' ? 3 : 4;
  } else scores.grr = 3;
  // TER
  scores.ter = factor?.technologyScope ? 2 : 3;
  // P
  scores.precision = record.dataType === 'primary' ? 2 : 3;
  // C
  scores.completeness = 3;
  return scores;
}

export function renderDQAssessment(tc, project, records, factors) {
  const allScores = records.map(r => {
    const f = factors.find(x => x.id === r.emissionFactorId);
    return { record: r, auto: autoAssessDQ(r, f, project) };
  });
  const agg = {};
  for (const c of DQ_CRITERIA) {
    const v = allScores.map(s => s.auto[c.id]);
    agg[c.id] = v.length ? v.reduce((a, b) => a + b, 0) / v.length : 3;
  }
  const { dqr, rating } = calculateDQR(agg);

  tc.innerHTML = `<div class="fade-in">
    <div style="display:flex;gap:var(--space-lg);margin-bottom:var(--space-xl);flex-wrap:wrap">
      <div class="card stat-card" style="flex:1;min-width:200px;text-align:center">
        <div class="stat-value" style="color:${rating.color}">${dqr.toFixed(2)}</div>
        <div class="stat-label">整體 DQR</div>
        <div class="badge ${rating.badge}" style="margin-top:var(--space-sm)">${rating.label}</div>
      </div>
      <div class="card" style="flex:2;min-width:300px">
        <div class="card-header"><h4 class="card-title">各維度評分</h4></div>
        <div class="card-body">${DQ_CRITERIA.map(c => {
          const s = agg[c.id], pct = (5 - s) / 4 * 100;
          const bc = s <= 2 ? '#10b981' : s <= 3 ? '#f59e0b' : '#ef4444';
          return `<div style="margin-bottom:var(--space-base)">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px">
              <span style="font-size:var(--fs-sm)">${c.name}</span>
              <span style="font-size:var(--fs-sm);font-weight:600">${s.toFixed(1)}/5</span>
            </div>
            <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${bc}"></div></div>
          </div>`;
        }).join('')}</div>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><h4 class="card-title">逐項數據品質</h4></div>
      <div class="table-container"><table class="data-table">
        <thead><tr><th>項目</th><th>階段</th><th>類型</th>
          ${DQ_CRITERIA.map(c => `<th style="text-align:center">${c.id.toUpperCase()}</th>`).join('')}
          <th style="text-align:center">DQR</th></tr></thead>
        <tbody>${allScores.map(({ record: r, auto }) => {
          const res = calculateDQR(auto);
          const sn = project.lifeCycleStages.find(s => s.id === r.stageId)?.name || r.stageId;
          return `<tr><td>${r.itemName || '(未命名)'}</td><td>${sn}</td>
            <td>${r.dataType === 'primary' ? '初級' : '次級'}</td>
            ${DQ_CRITERIA.map(c => {
              const v = auto[c.id];
              const cl = v <= 2 ? 'var(--accent-success)' : v <= 3 ? 'var(--accent-warning)' : 'var(--accent-danger)';
              return `<td style="text-align:center;color:${cl};font-weight:600">${v}</td>`;
            }).join('')}
            <td style="text-align:center;font-weight:700;color:${res.rating.color}">${res.dqr.toFixed(1)}</td></tr>`;
        }).join('')}</tbody>
      </table></div>
    </div>
    <div class="card" style="margin-top:var(--space-lg)">
      <div class="card-header"><h4 class="card-title">評分準則</h4></div>
      <div class="card-body">${DQ_CRITERIA.map(c => `
        <details style="margin-bottom:var(--space-base)">
          <summary style="cursor:pointer;font-weight:600;font-size:var(--fs-sm)">${c.name}</summary>
          <div style="padding:var(--space-sm) var(--space-md)">
            ${c.options.map(o => `<div style="font-size:var(--fs-xs);padding:2px 0"><strong>${o.score}分</strong>：${o.label}</div>`).join('')}
          </div>
        </details>`).join('')}</div>
    </div>
  </div>`;
}

export { DQ_CRITERIA, RATING_MAP };
