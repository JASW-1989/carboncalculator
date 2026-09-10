/**
 * report.zh-TW.js — ISO 14067 Report template (Traditional Chinese)
 */

export const REPORT_SECTIONS = [
  {
    id: 'cover',
    title: '遊程碳足跡研究報告',
    type: 'locked',
    required: true,
    template: (p, snap) => `
      <div class="report-cover">
        <h1>遊程碳足跡研究報告</h1>
        <h2>依據 ISO 14067:2018</h2>
        <p style="margin-top:2rem;font-size:var(--fs-lg)">${p.tourName || '（遊程名稱）'}</p>
        <p style="margin-top:1rem;color:var(--text-secondary)">${p.name || '（專案名稱）'}</p>
        <p style="margin-top:2rem;color:var(--text-muted)">${snap ? new Date(snap.createdAt).toLocaleDateString('zh-TW') : new Date().toLocaleDateString('zh-TW')}</p>
        <p style="color:var(--text-muted)">盤查版本：${snap ? snap.version : '—'}</p>
      </div>
    `,
  },
  {
    id: 'goal_scope',
    title: '第一章　研究目標與範圍定義',
    type: 'mixed',
    required: true,
    subsections: [
      { id: 'goal', title: '1.1 研究目標', type: 'editable', defaultContent: '' },
      { id: 'functional_unit', title: '1.2 功能單位', type: 'locked', template: (p) => `<p><strong>遊程名稱：</strong> ${p.tourName || ''}</p><p><strong>遊程描述：</strong> ${p.productDescription || ''}</p><p>本研究之功能單位為：<strong>${p.functionalUnit || '（未填寫）'}</strong></p>${p.declaredUnit ? `<p>宣告單位：<strong>${p.declaredUnit}</strong></p>` : ''}` },
      { id: 'boundary', title: '1.3 系統邊界', type: 'locked', template: (p) => {
        const labels = { 'cradle-to-gate': '搖籃到大門 (Cradle-to-Gate)', 'cradle-to-grave': '搖籃到墳墓 (Cradle-to-Grave)', 'partial': '部分碳足跡 (Partial CFP)' };
        const stages = p.lifeCycleStages.filter(s => s.enabled).map(s => s.name).join('、');
        return `<p>本研究之系統邊界為：<strong>${labels[p.boundary] || p.boundary}</strong></p><p>涵蓋遊程階段：${stages}</p>`;
      }},
      { id: 'cutoff', title: '1.4 截斷準則', type: 'editable', defaultContent: '' },
      { id: 'pcr', title: '1.5 參考標準與 PCR', type: 'editable', defaultContent: '<p>本研究依據 ISO 14067:2018 執行遊程碳足跡量化。</p>' },
    ],
  },
  {
    id: 'product_description',
    title: '第二章　遊程描述與活動行程',
    type: 'editable',
    required: true,
    defaultContent: '<p>（請描述遊程主題、活動路線、體驗內容與時間表等。）</p>',
  },
  {
    id: 'methodology',
    title: '第三章　方法學說明',
    type: 'mixed',
    required: true,
    subsections: [
      { id: 'allocation', title: '3.1 分攤原則', type: 'locked', template: (p) => {
        return `<p>本研究採用「遊客人次」為基礎，或是依照農場設施耗能之面積/時間等比例，將農場整體營運之活動數據分攤至單一遊程中。</p>
        <p>依據基本資訊設定，本盤查案總服務遊客數為：<strong>${p.touristsCount || 1} 人次</strong>。</p>`;
      }},
      { id: 'gwp', title: '3.2 全球暖化潛勢', type: 'locked', template: (p) => `<p>本研究採用 IPCC ${p.gwpVersion || 'AR6'} 之 100 年全球暖化潛勢 (GWP₁₀₀) 係數。</p>` },
      { id: 'assumptions', title: '3.3 假設與限制', type: 'editable', defaultContent: '<p>（請說明研究中的假設與限制條件。）</p>' },
    ],
  },
  {
    id: 'data_quality',
    title: '第四章　數據收集與品質說明',
    type: 'mixed',
    required: true,
    subsections: [
      { id: 'data_sources', title: '4.1 數據來源', type: 'editable', defaultContent: '<p>（請說明初級數據與次級數據之來源。）</p>' },
      { id: 'data_ratio', title: '4.2 初級/次級數據比例', type: 'locked', template: (p, snap) => { const r = snap?.dataRatio; return r ? `<p>初級數據佔比：<strong>${r.primary.toFixed(1)}%</strong>，次級數據佔比：<strong>${r.secondary.toFixed(1)}%</strong></p>` : '<p>（尚未建立盤查快照）</p>'; }},
      { id: 'dq_assessment', title: '4.3 數據品質評估', type: 'locked', template: (p, snap) => {
        if (!snap || !snap.dqResult) return '<p>（系統無數據品質評估資料）</p>';
        const r = snap.dqResult;
        let html = `<p>本盤查案採用半定量 5 項評估指標 (DQR) 進行數據品質評估。分析結果如下：</p>`;
        html += `<p style="font-size:1.1rem">整體數據品質 (DQR) 評分：<strong>${r.dqr.toFixed(2)}</strong> (等級：<strong>${r.rating.label}</strong>)</p>`;
        html += `<table class="data-table" style="margin-top:1rem"><thead><tr><th>評估維度</th><th style="text-align:center">平均得分 (1-5)</th></tr></thead><tbody>`;
        html += `<tr><td>時間代表性 (TRR)</td><td class="cell-number" style="text-align:center">${r.agg.trr.toFixed(1)}</td></tr>`;
        html += `<tr><td>地理代表性 (GRR)</td><td class="cell-number" style="text-align:center">${r.agg.grr.toFixed(1)}</td></tr>`;
        html += `<tr><td>技術代表性 (TER)</td><td class="cell-number" style="text-align:center">${r.agg.ter.toFixed(1)}</td></tr>`;
        html += `<tr><td>精確性 (Precision)</td><td class="cell-number" style="text-align:center">${r.agg.precision.toFixed(1)}</td></tr>`;
        html += `<tr><td>完整性 (Completeness)</td><td class="cell-number" style="text-align:center">${r.agg.completeness.toFixed(1)}</td></tr>`;
        html += `</tbody></table>`;
        return html;
      }},
    ],
  },
  {
    id: 'results',
    title: '第五章　盤查結果與分析',
    type: 'mixed',
    required: true,
    subsections: [
      { id: 'total_result', title: '5.1 碳足跡總量', type: 'locked', template: (p, snap) => {
        if (!snap) return '<p>（尚未建立盤查快照）</p>';
        const g = snap.grossTotals;
        const tourists = p.touristsCount || 1;
        const perCapita = snap.totalCO2e / tourists;
        
        let html = `<p style="font-size:1.1rem;margin-bottom:0.5rem">遊程活動總排碳量：<strong>${snap.totalCO2e.toFixed(4)} kgCO₂e</strong></p>`;
        html += `<p style="font-size:1.2rem;margin-bottom:1rem;color:var(--accent-primary)">每人次碳足跡：<strong>${perCapita.toFixed(4)} kgCO₂e / ${p.functionalUnit || '每人次'}</strong> (遊客數: ${tourists} 人)</p>`;
        
        html += `
          <table class="data-table" style="margin-top:1rem;margin-bottom:1rem">
            <thead><tr><th>溫室氣體來源類別</th><th style="text-align:right">系統總量 (kgCO₂e)</th></tr></thead>
            <tbody>
              <tr><td>化石碳排放 (Fossil)</td><td class="cell-number">${g.fossil.toFixed(4)}</td></tr>
              <tr><td>生質碳排放 (Biogenic Emission)</td><td class="cell-number">${g.biogenicEmission.toFixed(4)}</td></tr>
              <tr><td>生質碳移除 (Biogenic Removal)</td><td class="cell-number">${g.biogenicRemoval.toFixed(4)}</td></tr>
              <tr><td>土地利用變遷 (LUC)</td><td class="cell-number">${g.luc.toFixed(4)}</td></tr>
            </tbody>
          </table>
        `;
        return html;
      }},
      { id: 'stage_breakdown', title: '5.2 各階段排放分佈', type: 'locked', template: (p, snap) => {
        if (!snap) return '<p>（尚未建立盤查快照）</p>';
        let html = '<div class="table-container"><table class="data-table"><thead><tr><th>遊程階段</th><th style="text-align:right">排放量 (kgCO₂e)</th><th style="text-align:right">佔比 (%)</th></tr></thead><tbody>';
        for (const [, s] of Object.entries(snap.totalsByStage)) {
          const stageName = p.lifeCycleStages.find(ls => ls.id === s.stageId)?.name || s.stageId;
          html += `<tr><td>${stageName}</td><td class="cell-number">${s.totalCO2e.toFixed(4)}</td><td class="cell-number">${s.percentage.toFixed(1)}%</td></tr>`;
        }
        html += `</tbody><tfoot><tr class="grand-total"><td><strong>合計</strong></td><td class="cell-number"><strong>${snap.totalCO2e.toFixed(4)}</strong></td><td class="cell-number"><strong>100%</strong></td></tr></tfoot></table></div>`;
        return html;
      }},
      { id: 'hotspot', title: '5.3 排放熱點分析', type: 'editable', defaultContent: '<p>（請依據上表結果，說明主要排放來源及成因。）</p>' },
      { id: 'chart_placeholder', title: '5.4 排放佔比圖', type: 'locked', template: () => '<div id="report-chart-container" style="max-width:500px;margin:0 auto"><canvas id="report-pie-chart"></canvas></div>' },
    ],
  },
  {
    id: 'uncertainty',
    title: '第六章　敏感度與不確定性分析',
    type: 'editable',
    required: true,
    defaultContent: '<p>（請針對關鍵參數進行敏感度分析，並評估不確定性。）</p>',
  },
  {
    id: 'conclusion',
    title: '第七章　結論與建議',
    type: 'editable',
    required: true,
    defaultContent: '<p>（請總結研究發現，並提出減碳建議與改善方向。）</p>',
  },
  {
    id: 'appendix',
    title: '附件　盤查清冊',
    type: 'locked',
    required: true,
    template: (p, snap) => {
      if (!snap) return '<p>（尚未建立盤查快照）</p>';
      let html = '<div class="inventory-locked-banner"><span class="lock-icon">🔒</span>此盤查清冊為系統自動生成，不可編輯。快照版本：' + snap.version + ' | Hash：' + snap.inventoryHash.slice(0, 16) + '...</div>';
      html += '<div class="table-container"><table class="data-table"><thead><tr><th>階段</th><th>項目</th><th>活動數據</th><th>單位</th><th>分攤(%)</th><th>排放係數</th><th>碳來源</th><th>類型</th><th>佐證資料</th><th style="text-align:right">CO₂e (kg)</th></tr></thead><tbody>';
      for (const item of snap.lineItems) {
        const stageName = p.lifeCycleStages.find(s => s.id === item.stageId)?.name || item.stageId;
        const cType = item.carbonType === 'biogenic' ? '生質' : item.carbonType === 'luc' ? 'LUC' : '化石';
        html += `<tr><td>${stageName}</td><td>${item.itemName}</td><td class="cell-number">${item.activityData}</td><td>${item.activityUnit}</td><td class="cell-number">${item.allocationRatio||100}%</td><td class="cell-number">${item.emissionFactorValue}</td><td>${cType}</td><td>${item.dataType === 'primary' ? '初級' : '次級'}</td><td><a href="${item.evidenceUrl||'#'}" target="_blank" style="font-size:12px;color:var(--accent-primary)">${item.evidenceUrl?'連結':''}</a></td><td class="cell-number">${item.co2e?.toFixed(4) || '—'}</td></tr>`;
      }
      html += '</tbody></table></div>';
      return html;
    },
  },
];

export function getDefaultReportContent(section) {
  if (section.defaultContent) return section.defaultContent;
  return '';
}
