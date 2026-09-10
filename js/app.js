/**
 * app.js — SPA Router & Shell for ISO 14067 PCF System
 */
import { Store, STORES, openDB } from './store.js';
import { initEmissionFactors } from './emission-factors.js';
import { renderDashboard } from './dashboard.js';
import { renderProject, currentProjectState } from './project.js';
import { createProjectTemplate, createActivityRecord } from './store.js';
import { renderFactorsPage } from './factors-page.js';
import { importProjectBundle } from './export.js';

// ── State ──
let currentView = 'dashboard';
let currentProjectId = null;

// ── Toast ──
export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
  toast.innerHTML = `<span>${icons[type] || 'ℹ'}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// ── Navigation ──
export function navigate(view, projectId = null) {
  currentView = view;
  currentProjectId = projectId;
  updateNav();
  renderView();
}

function updateNav() {
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.view === currentView);
  });
  const bc = document.getElementById('breadcrumb');
  if (currentView === 'dashboard') {
    bc.innerHTML = '<span class="breadcrumb-current">儀表板</span>';
  } else if (currentView === 'project') {
    bc.innerHTML = '<span class="breadcrumb-link" style="cursor:pointer" onclick="window.__nav(\'dashboard\')">儀表板</span><span class="breadcrumb-separator">›</span><span class="breadcrumb-current">專案詳情</span>';
  } else if (currentView === 'factors') {
    bc.innerHTML = '<span class="breadcrumb-link" style="cursor:pointer" onclick="window.__nav(\'dashboard\')">儀表板</span><span class="breadcrumb-separator">›</span><span class="breadcrumb-current">排放係數</span>';
  }
}

function renderView() {
  const body = document.getElementById('main-body');
  body.innerHTML = '';
  if (currentView === 'dashboard') {
    renderDashboard(body);
  } else if (currentView === 'project' && currentProjectId) {
    renderProject(body, currentProjectId);
  } else if (currentView === 'factors') {
    renderFactorsPage(body);
  }
}

import { getAllFactors } from './emission-factors.js';

async function checkAndCreateExampleProject() {
  const projects = await Store.getAll(STORES.projects);
  if (projects.length === 0) {
    const p = createProjectTemplate();
    await Store.put(STORES.projects, p);
    
    const factors = await getAllFactors();

    // Add default activity records
    const records = [
      { stageId: 'activities', name: '麻繩', activityData: 160, unit: '段', factorId: 'ef-hemp', type: 'fossil', alloc: 100 },
      { stageId: 'activities', name: '羊眼釘', activityData: 306, unit: '個', factorId: 'ef-screw', type: 'fossil', alloc: 100 },
      { stageId: 'activities', name: 'A4紙張', activityData: 16, unit: '張', factorId: 'ef-paper-print', type: 'fossil', alloc: 100 },
      { stageId: 'activities', name: '培養土', activityData: 1.5, unit: '包', factorId: 'ef-soil', type: 'fossil', alloc: 100 },
      { stageId: 'activities', name: '水苔', activityData: 1, unit: '包', factorId: 'ef-moss', type: 'fossil', alloc: 100 },
      { stageId: 'food', name: '蔬菜', activityData: 50.1, unit: '斤', factorId: 'ef-veg', type: 'fossil', alloc: 100 },
      { stageId: 'food', name: '豬肉', activityData: 14480.34, unit: '斤', factorId: 'ef-pork', type: 'fossil', alloc: 100 },
      { stageId: 'food', name: '米', activityData: 138, unit: '包', factorId: 'ef-rice', type: 'fossil', alloc: 100 },
      { stageId: 'transport', name: '遊覽車', activityData: 167, unit: '人次', factorId: 'ef-diesel', type: 'fossil', alloc: 100 },
      { stageId: 'accommodation', name: '全場外購電力', activityData: 22752, unit: 'kWh', factorId: 'ef-elec-tw', type: 'fossil', alloc: 1.54 },
      { stageId: 'accommodation', name: '全場液化石油氣', activityData: 3383, unit: 'kg', factorId: 'ef-lpg', type: 'fossil', alloc: 1.54 },
      { stageId: 'waste', name: '一般生活廢棄物', activityData: 0.359, unit: 'ton', factorId: 'ef-incineration', type: 'fossil', alloc: 100 }
    ];
    for (const r of records) {
      const rec = createActivityRecord(p.id, r.stageId);
      rec.itemName = r.name;
      rec.activityData = r.activityData;
      rec.activityUnit = r.unit;
      rec.emissionFactorId = r.factorId;
      rec.carbonType = r.type;
      rec.allocationRatio = r.alloc;
      
      const f = factors.find(x => x.id === r.factorId);
      if (f) {
        rec.emissionFactorValue = f.coefficient;
        rec.emissionFactorUnit = f.denominatorUnit;
      }
      
      // Calculate co2e
      const allocatedData = rec.activityData * (rec.allocationRatio / 100);
      rec.co2e = allocatedData * rec.emissionFactorValue;

      await Store.put(STORES.activityRecords, rec);
    }
  }
}

// ── Init ──
async function init() {
  await openDB();
  await initEmissionFactors();
  await checkAndCreateExampleProject();
  window.__nav = navigate;
  window.__showToast = showToast;
  // Setup sidebar nav
  document.querySelectorAll('.nav-item[data-view]').forEach(el => {
    el.addEventListener('click', () => {
      const view = el.dataset.view;
      if (view) navigate(view);
    });
  });
  // Import button
  document.getElementById('btn-import-bundle')?.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.addEventListener('change', async () => {
      if (!input.files[0]) return;
      try {
        const project = await importProjectBundle(input.files[0]);
        showToast(`專案「${project.name}」匯入成功`, 'success');
        navigate('dashboard');
      } catch (err) {
        showToast(`匯入失敗：${err.message}`, 'error');
      }
    });
    input.click();
  });
  navigate('dashboard');
}

document.addEventListener('DOMContentLoaded', init);
