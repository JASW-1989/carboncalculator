/**
 * report.js — Block-based report editor
 */
import { Store, STORES } from './store.js';
import { showToast } from './app.js';
import { getLatestSnapshot } from './snapshots.js';
import { logAction } from './audit-log.js';
import { REPORT_SECTIONS, getDefaultReportContent } from '../templates/report.zh-TW.js';

export async function renderReportEditor(tc, project) {
  const snap = await getLatestSnapshot(project.id);
  // Load saved report content
  const savedReports = await Store.getAllByIndex(STORES.reportContents, 'projectId', project.id);
  const savedContent = savedReports.length > 0 ? savedReports[savedReports.length - 1] : null;
  const editedBlocks = savedContent?.blocks || {};
  const customBlocks = savedContent?.customBlocks || [];

  tc.innerHTML = `
    <div class="fade-in">
      ${!snap ? '<div class="inventory-locked-banner"><span class="lock-icon">⚠</span>尚未建立盤查快照，報告中的數據欄位將顯示預設值。建議先鎖定盤查版本。</div>' : ''}
      <div class="report-toolbar">
        <button class="toolbar-btn" title="粗體" id="tb-bold"><strong>B</strong></button>
        <button class="toolbar-btn" title="斜體" id="tb-italic"><em>I</em></button>
        <button class="toolbar-btn" title="底線" id="tb-underline"><u>U</u></button>
        <div class="toolbar-divider"></div>
        <button class="toolbar-btn" title="標題" id="tb-heading">H</button>
        <button class="toolbar-btn" title="項目清單" id="tb-list">☰</button>
        <div class="toolbar-divider"></div>
        <div style="flex:1"></div>
        <button class="btn btn-secondary btn-sm" id="btn-save-report">💾 儲存報告</button>
        <button class="btn btn-primary btn-sm" id="btn-export-pdf">📤 匯出 PDF</button>
      </div>
      <div class="report-container" id="report-body">
        ${renderReportBlocks(project, snap, editedBlocks, customBlocks)}
        <button class="add-block-btn" id="btn-add-block">＋ 新增補充章節</button>
      </div>
    </div>
  `;

  // Render Chart if placeholder exists
  setTimeout(() => {
    const canvas = document.getElementById('report-pie-chart');
    if (canvas && snap && typeof Chart !== 'undefined') {
      const labels = [];
      const data = [];
      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b'];
      let i = 0;
      for (const [, s] of Object.entries(snap.totalsByStage)) {
        const stageName = project.lifeCycleStages.find(ls => ls.id === s.stageId)?.name || s.stageId;
        labels.push(stageName);
        data.push(s.totalCO2e);
      }
      new Chart(canvas, {
        type: 'pie',
        data: {
          labels,
          datasets: [{ data, backgroundColor: colors.slice(0, data.length), borderWidth: 0 }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'right', labels: { color: '#94a3b8', font: { family: 'Inter' } } } }
        }
      });
    }
  }, 100);


  // Toolbar formatting commands
  const cmds = { 'tb-bold':'bold', 'tb-italic':'italic', 'tb-underline':'underline', 'tb-heading':'formatBlock', 'tb-list':'insertUnorderedList' };
  for (const [id, cmd] of Object.entries(cmds)) {
    document.getElementById(id)?.addEventListener('click', () => {
      if (cmd === 'formatBlock') document.execCommand(cmd, false, 'h3');
      else document.execCommand(cmd, false, null);
    });
  }

  // Save report
  document.getElementById('btn-save-report')?.addEventListener('click', async () => {
    const blocks = {};
    document.querySelectorAll('[data-block-id][contenteditable="true"]').forEach(el => {
      blocks[el.dataset.blockId] = el.innerHTML;
    });
    const customs = [];
    document.querySelectorAll('.custom-block').forEach(el => {
      customs.push({ id: el.dataset.customId, title: el.querySelector('.custom-block-title')?.textContent || '', content: el.querySelector('[contenteditable="true"]')?.innerHTML || '' });
    });
    const reportData = {
      id: savedContent?.id || crypto.randomUUID(),
      projectId: project.id,
      snapshotId: snap?.id || null,
      blocks,
      customBlocks: customs,
      updatedAt: new Date().toISOString(),
    };
    await Store.put(STORES.reportContents, reportData);
    await logAction(project.id, 'SAVE_REPORT', '儲存報告內容');
    showToast('報告已儲存', 'success');
  });

  // Export PDF
  document.getElementById('btn-export-pdf')?.addEventListener('click', () => {
    const reportEl = document.getElementById('report-body');
    if (typeof html2pdf === 'undefined') {
      // Fallback to window.print
      window.print();
      return;
    }
    html2pdf().set({
      margin: [15, 10, 15, 10],
      filename: `碳足跡報告_${project.name}_${new Date().toISOString().slice(0,10)}.pdf`,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    }).from(reportEl).save();
    showToast('PDF 匯出中...', 'info');
  });

  // Add custom block
  document.getElementById('btn-add-block')?.addEventListener('click', () => {
    const id = 'custom-' + Date.now();
    const block = document.createElement('div');
    block.className = 'report-block free custom-block';
    block.dataset.customId = id;
    block.innerHTML = `
      <span class="block-type-indicator">➕ 補充章節（可刪除）</span>
      <h3 class="custom-block-title" contenteditable="true" style="outline:none">新增章節標題</h3>
      <div contenteditable="true" data-block-id="${id}" style="outline:none;min-height:60px"><p>請輸入內容...</p></div>
      <button class="btn btn-ghost btn-sm" style="margin-top:var(--space-sm);color:var(--accent-danger)" onclick="this.closest('.custom-block').remove()">🗑 刪除此章節</button>
    `;
    document.getElementById('report-body').insertBefore(block, document.getElementById('btn-add-block'));
  });
}

function renderReportBlocks(project, snap, editedBlocks, customBlocks) {
  let html = '';
  for (const section of REPORT_SECTIONS) {
    if (section.subsections) {
      // Mixed section
      html += `<div class="report-block" style="margin-bottom:var(--space-xl)"><h2>${section.title}</h2>`;
      for (const sub of section.subsections) {
        if (sub.type === 'locked') {
          html += `<div class="report-block locked"><span class="block-type-indicator">🔒 系統鎖定</span><h3>${sub.title}</h3>${sub.template(project, snap)}</div>`;
        } else {
          const saved = editedBlocks[sub.id];
          const content = saved || sub.defaultContent || getDefaultContent(sub, project);
          html += `<div class="report-block editable"><span class="block-type-indicator">✏️ 可編輯</span><h3>${sub.title}</h3><div contenteditable="true" data-block-id="${sub.id}" style="outline:none;min-height:40px">${content}</div></div>`;
        }
      }
      html += '</div>';
    } else if (section.type === 'locked') {
      html += `<div class="report-block locked"><span class="block-type-indicator">🔒 系統鎖定</span><h2>${section.title}</h2>${section.template(project, snap)}</div>`;
    } else {
      const saved = editedBlocks[section.id];
      const content = saved || section.defaultContent || '';
      html += `<div class="report-block editable"><span class="block-type-indicator">✏️ 可編輯</span><h2>${section.title}</h2><div contenteditable="true" data-block-id="${section.id}" style="outline:none;min-height:60px">${content}</div></div>`;
    }
  }
  // Custom blocks
  for (const cb of customBlocks) {
    html += `<div class="report-block free custom-block" data-custom-id="${cb.id}"><span class="block-type-indicator">➕ 補充章節</span><h3 class="custom-block-title" contenteditable="true" style="outline:none">${cb.title}</h3><div contenteditable="true" data-block-id="${cb.id}" style="outline:none;min-height:60px">${cb.content}</div><button class="btn btn-ghost btn-sm" style="margin-top:var(--space-sm);color:var(--accent-danger)" onclick="this.closest('.custom-block').remove()">🗑 刪除此章節</button></div>`;
  }
  return html;
}

function getDefaultContent(sub, project) {
  if (sub.id === 'goal') return `<p>${project.studyGoal || '（請說明本研究之目標與預期應用。）'}</p>`;
  if (sub.id === 'cutoff') return `<p>${project.cutoffCriteria || '（請說明截斷準則。）'}</p>`;
  if (sub.id === 'allocation') return `<p>本研究採用${({'mass':'質量','economic':'經濟','energy':'能量','system_expansion':'系統擴展'})[project.allocationMethod]||''}分配方法。</p>`;
  if (sub.id === 'data_sources') return '<p>（請說明初級數據與次級數據之來源。）</p>';
  return '';
}
