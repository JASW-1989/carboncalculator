/**
 * uncertainty.js — Sensitivity & uncertainty analysis
 * Monte Carlo-style variance propagation for PCF results
 */
import { calculateTotal } from './calculator.js';

/**
 * Run sensitivity analysis: ±variation% on each record's activity data or emission factor
 * @returns {Array<{recordId, itemName, stageId, baselineCO2e, highCO2e, lowCO2e, impactPct}>}
 */
export function sensitivityAnalysis(records, variationPct = 10) {
  const { totalCO2e: baseline } = calculateTotal(records);
  if (baseline === 0) return [];

  const results = [];
  for (const r of records) {
    if (r.co2e === 0 && r.activityData === 0) continue;

    // Vary activity data +variation%
    const highRecords = records.map(x =>
      x.id === r.id ? { ...x, activityData: x.activityData * (1 + variationPct / 100) } : { ...x }
    );
    const { totalCO2e: highTotal } = calculateTotal(highRecords);

    // Vary activity data -variation%
    const lowRecords = records.map(x =>
      x.id === r.id ? { ...x, activityData: x.activityData * (1 - variationPct / 100) } : { ...x }
    );
    const { totalCO2e: lowTotal } = calculateTotal(lowRecords);

    const impactPct = baseline > 0 ? ((highTotal - lowTotal) / baseline * 100) : 0;

    results.push({
      recordId: r.id,
      itemName: r.itemName || '(未命名)',
      stageId: r.stageId,
      baselineCO2e: r.co2e || 0,
      highCO2e: highTotal,
      lowCO2e: lowTotal,
      impactPct: Math.abs(impactPct),
      variationPct,
    });
  }

  return results.sort((a, b) => b.impactPct - a.impactPct);
}

/**
 * Simple uncertainty estimate based on data quality
 * Returns overall uncertainty range as % of total
 */
export function estimateUncertainty(records) {
  if (records.length === 0) return { lower: 0, upper: 0, pct: 0 };

  const { totalCO2e } = calculateTotal(records);
  // Assign uncertainty % per data type
  let weightedSum = 0;
  let totalWeight = 0;
  for (const r of records) {
    const co2e = Math.abs(r.co2e || 0);
    const unc = r.dataType === 'primary' ? 10 : 30; // primary ±10%, secondary ±30%
    weightedSum += co2e * unc;
    totalWeight += co2e;
  }
  const avgUncPct = totalWeight > 0 ? weightedSum / totalWeight : 30;
  // Root sum of squares (simplified)
  const combinedPct = avgUncPct / Math.sqrt(records.length);

  return {
    totalCO2e,
    lower: totalCO2e * (1 - combinedPct / 100),
    upper: totalCO2e * (1 + combinedPct / 100),
    pct: combinedPct,
  };
}

/**
 * Render uncertainty & sensitivity analysis tab
 */
export function renderUncertainty(tc, project, records) {
  const sa = sensitivityAnalysis(records, 10);
  const unc = estimateUncertainty(records);

  if (records.length === 0) {
    tc.innerHTML = '<div class="card fade-in"><div class="empty-state"><div class="empty-icon">📊</div><div class="empty-text">尚無盤查資料，無法進行敏感度分析。</div></div></div>';
    return;
  }

  tc.innerHTML = `<div class="fade-in">
    <div style="display:flex;gap:var(--space-lg);margin-bottom:var(--space-xl);flex-wrap:wrap">
      <div class="card stat-card" style="flex:1;min-width:200px;text-align:center">
        <div class="stat-value">${unc.totalCO2e.toFixed(4)}</div>
        <div class="stat-label">總碳排 (kgCO₂e)</div>
      </div>
      <div class="card stat-card" style="flex:1;min-width:200px;text-align:center">
        <div class="stat-value">±${unc.pct.toFixed(1)}%</div>
        <div class="stat-label">估計不確定性</div>
      </div>
      <div class="card stat-card" style="flex:1;min-width:200px;text-align:center">
        <div class="stat-value" style="font-size:var(--fs-base)">${unc.lower.toFixed(4)} ~ ${unc.upper.toFixed(4)}</div>
        <div class="stat-label">不確定性範圍 (kgCO₂e)</div>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><h4 class="card-title">敏感度分析（±10% 活動數據變動）</h4></div>
      <div class="card-body">
        <p style="font-size:var(--fs-sm);color:var(--text-secondary);margin-bottom:var(--space-lg)">
          對每一筆活動數據施加 ±10% 變動，觀察對總碳排的影響程度。影響比例越高，表示該項目對結果越敏感。
        </p>
        <div class="table-container">
          <table class="data-table">
            <thead><tr>
              <th>項目</th><th>階段</th>
              <th style="text-align:right">基線 CO₂e</th>
              <th style="text-align:right">+10%</th>
              <th style="text-align:right">-10%</th>
              <th style="text-align:right">影響比例</th>
              <th>敏感度</th>
            </tr></thead>
            <tbody>${sa.map(r => {
              const sn = project.lifeCycleStages.find(s => s.id === r.stageId)?.name || r.stageId;
              const level = r.impactPct >= 5 ? 'high' : r.impactPct >= 1 ? 'medium' : 'low';
              const levelLabel = { high: '🔴 高', medium: '🟡 中', low: '🟢 低' };
              return `<tr>
                <td>${r.itemName}</td><td>${sn}</td>
                <td class="cell-number">${r.baselineCO2e.toFixed(4)}</td>
                <td class="cell-number">${r.highCO2e.toFixed(4)}</td>
                <td class="cell-number">${r.lowCO2e.toFixed(4)}</td>
                <td class="cell-number" style="font-weight:600">${r.impactPct.toFixed(2)}%</td>
                <td>${levelLabel[level]}</td>
              </tr>`;
            }).join('')}</tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top:var(--space-lg)">
      <div class="card-header"><h4 class="card-title">方法說明</h4></div>
      <div class="card-body" style="font-size:var(--fs-sm);color:var(--text-secondary)">
        <p><strong>敏感度分析</strong>：逐一對每筆活動數據施加 ±10% 變動，計算對整體碳足跡的影響比例。</p>
        <p><strong>不確定性估算</strong>：依數據類型指定不確定性（初級數據 ±10%、次級數據 ±30%），以加權平均 + 根方和方式合併。此為簡化估算，正式報告建議使用 Monte Carlo 模擬。</p>
      </div>
    </div>
  </div>`;
}
