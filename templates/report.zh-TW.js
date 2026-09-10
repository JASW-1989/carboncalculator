/**
 * report.zh-TW.js — ISO 14067 Report template (Traditional Chinese)
 */

export const REPORT_SECTIONS = [
  {
    id: 'cover',
    title: '產品碳足跡研究報告',
    type: 'locked',
    required: true,
    template: (p, snap) => `
      <div class="report-cover">
        <h1>產品碳足跡研究報告</h1>
        <h2>依據 ISO 14067:2018</h2>
        <p style="margin-top:2rem;font-size:var(--fs-lg)">${p.productName || '（產品名稱）'}</p>
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
      { id: 'functional_unit', title: '1.2 功能單位', type: 'locked', template: (p) => `<p>本研究之功能單位為：<strong>${p.functionalUnit || '（未填寫）'}</strong></p>${p.declaredUnit ? `<p>宣告單位：<strong>${p.declaredUnit}</strong></p>` : ''}` },
      { id: 'boundary', title: '1.3 系統邊界', type: 'locked', template: (p) => {
        const labels = { 'cradle-to-gate': '搖籃到大門 (Cradle-to-Gate)', 'cradle-to-grave': '搖籃到墳墓 (Cradle-to-Grave)', 'partial': '部分碳足跡 (Partial CFP)' };
        const stages = p.lifeCycleStages.filter(s => s.enabled).map(s => s.name).join('、');
        return `<p>本研究之系統邊界為：<strong>${labels[p.boundary] || p.boundary}</strong></p><p>涵蓋生命週期階段：${stages}</p>`;
      }},
      { id: 'cutoff', title: '1.4 截斷準則', type: 'editable', defaultContent: '' },
      { id: 'pcr', title: '1.5 參考標準與 PCR', type: 'editable', defaultContent: '<p>本研究依據 ISO 14067:2018 執行產品碳足跡量化。</p>' },
    ],
  },
  {
    id: 'product_description',
    title: '第二章　產品描述與製程說明',
    type: 'editable',
    required: true,
    defaultContent: '<p>（請描述產品規格、主要材料組成、製程流程等。）</p>',
  },
  {
    id: 'methodology',
    title: '第三章　方法學說明',
    type: 'mixed',
    required: true,
    subsections: [
      { id: 'allocation', title: '3.1 分配方法', type: 'locked', template: (p) => {
        const labels = { 'mass': '質量分配', 'economic': '經濟分配', 'energy': '能量分配', 'system_expansion': '系統擴展', 'other': '其他' };
        let str = `<p>本研究採用<strong>${labels[p.allocationMethod] || ''}</strong>方法進行共生產品分攤。</p>`;
        if (p.coProducts && p.coProducts.length > 0) {
          str += `<p>主產品（${p.productName}）設定：質量 ${p.mainProduct?.mass||0} kg、經濟價值 ${p.mainProduct?.value||0} 元、能量值 ${p.mainProduct?.energy||0}</p>`;
          str += `<p>共生產品設定：</p><ul>`;
          p.coProducts.forEach(cp => {
            str += `<li>${cp.name}：質量 ${cp.mass} kg、經濟價值 ${cp.value} 元、能量值 ${cp.energy}</li>`;
          });
          str += `</ul>`;
        } else {
          str += `<p>本系統無共生產品，無需分配 (分配係數 100%)。</p>`;
        }
        return str;
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
      { id: 'dq_assessment', title: '4.3 數據品質評估', type: 'editable', defaultContent: '<p>（請依時間代表性、地理代表性、技術代表性等面向進行評估。）</p>' },
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
        const a = snap.allocatedTotals;
        const pct = (snap.allocationFactor * 100).toFixed(2);
        
        let html = `<p style="font-size:1.1rem;margin-bottom:1rem">產品碳足跡總量 (分配後)：<strong>${a.totalCO2e.toFixed(4)} kgCO₂e / ${p.functionalUnit || '功能單位'}</strong></p>`;
        html += `<p>分配係數：<strong>${pct}%</strong> (系統總排碳 ${g.totalCO2e.toFixed(4)} kgCO₂e)</p>`;
        
        html += `
          <table class="data-table" style="margin-top:1rem;margin-bottom:1rem">
            <thead><tr><th>溫室氣體來源類別</th><th style="text-align:right">系統總量 (kgCO₂e)</th><th style="text-align:right">產品分配量 (kgCO₂e)</th></tr></thead>
            <tbody>
              <tr><td>化石碳排放 (Fossil)</td><td class="cell-number">${g.fossil.toFixed(4)}</td><td class="cell-number">${a.fossil.toFixed(4)}</td></tr>
              <tr><td>生質碳排放 (Biogenic Emission)</td><td class="cell-number">${g.biogenicEmission.toFixed(4)}</td><td class="cell-number">${a.biogenicEmission.toFixed(4)}</td></tr>
              <tr><td>生質碳移除 (Biogenic Removal)</td><td class="cell-number">${g.biogenicRemoval.toFixed(4)}</td><td class="cell-number">${a.biogenicRemoval.toFixed(4)}</td></tr>
              <tr><td>土地利用變遷 (LUC)</td><td class="cell-number">${g.luc.toFixed(4)}</td><td class="cell-number">${a.luc.toFixed(4)}</td></tr>
            </tbody>
          </table>
        `;
        
        const mb = snap.massBalance;
        if (mb) {
           html += `<div style="background:var(--bg-secondary);padding:1rem;border-radius:8px">
             <strong>質量平衡檢核：</strong> 投入總量 ${mb.totalInput.toFixed(2)} kg，產出總量 ${mb.totalOutput.toFixed(2)} kg。誤差率 ${mb.errorPct.toFixed(2)}%。
           </div>`;
        }
        return html;
      }},
      { id: 'stage_breakdown', title: '5.2 各階段排放分佈', type: 'locked', template: (p, snap) => {
        if (!snap) return '<p>（尚未建立盤查快照）</p>';
        let html = '<div class="table-container"><table class="data-table"><thead><tr><th>生命週期階段</th><th style="text-align:right">排放量 (kgCO₂e)</th><th style="text-align:right">佔比 (%)</th></tr></thead><tbody>';
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
      html += '<div class="table-container"><table class="data-table"><thead><tr><th>階段</th><th>項目</th><th>活動數據</th><th>單位</th><th>排放係數</th><th>碳來源</th><th>類型</th><th>質量</th><th>佐證資料</th><th style="text-align:right">CO₂e (kg)</th></tr></thead><tbody>';
      for (const item of snap.lineItems) {
        const stageName = p.lifeCycleStages.find(s => s.id === item.stageId)?.name || item.stageId;
        const cType = item.carbonType === 'biogenic' ? '生質' : item.carbonType === 'luc' ? 'LUC' : '化石';
        html += `<tr><td>${stageName}</td><td>${item.itemName}</td><td class="cell-number">${item.activityData}</td><td>${item.activityUnit}</td><td class="cell-number">${item.emissionFactorValue}</td><td>${cType}</td><td>${item.dataType === 'primary' ? '初級' : '次級'}</td><td>${item.massValue?item.massValue+(item.isInput?'(入)':'(出)'):''}</td><td><a href="${item.evidenceUrl||'#'}" target="_blank" style="font-size:12px;color:var(--accent-primary)">${item.evidenceUrl?'連結':''}</a></td><td class="cell-number">${item.co2e?.toFixed(4) || '—'}</td></tr>`;
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
