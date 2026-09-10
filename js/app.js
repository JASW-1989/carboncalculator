/**
 * app.js — SPA Router & Shell for ISO 14067 PCF System
 */
import { Store, STORES, openDB } from './store.js';
import { initEmissionFactors } from './emission-factors.js';
import { renderDashboard } from './dashboard.js';
import { renderProject, currentProjectState } from './project.js';
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

// ── Init ──
async function init() {
  await openDB();
  await initEmissionFactors();
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
