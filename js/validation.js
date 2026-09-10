/**
 * validation.js — Comprehensive validation for ISO 14067 compliance
 * Covers: project metadata, activity records, emission factor matching, methodology completeness
 */

const SEVERITY = { error: 'error', warning: 'warning', info: 'info' };

/**
 * Validate project methodology completeness
 * @returns {Array<{field, severity, message}>}
 */
export function validateProject(project) {
  const issues = [];
  const req = (field, label) => {
    if (!project[field] || (typeof project[field] === 'string' && !project[field].trim())) {
      issues.push({ field, severity: SEVERITY.error, message: `「${label}」為必填欄位` });
    }
  };

  req('name', '專案名稱');
  req('tourName', '遊程名稱');
  req('functionalUnit', '功能單位');
  req('boundary', '系統邊界');
  req('cutoffCriteria', '截斷準則');
  req('allocationMethod', '分配方法');
  req('gwpVersion', 'GWP 版本');
  req('dataPeriod', '數據期間');

  // Recommended fields
  if (!project.studyGoal?.trim()) {
    issues.push({ field: 'studyGoal', severity: SEVERITY.warning, message: '建議填寫研究目標，報告生成會引用此欄位' });
  }
  if (!project.geographicScope?.trim()) {
    issues.push({ field: 'geographicScope', severity: SEVERITY.warning, message: '建議填寫地理範疇以利數據品質評估' });
  }
  if (!project.technologyScope?.trim()) {
    issues.push({ field: 'technologyScope', severity: SEVERITY.info, message: '技術範疇有助於數據代表性評估' });
  }

  // Lifecycle stage consistency
  const enabledStages = project.lifeCycleStages?.filter(s => s.enabled) || [];
  if (enabledStages.length === 0) {
    issues.push({ field: 'lifeCycleStages', severity: SEVERITY.error, message: '至少需啟用一個生命週期階段' });
  }
  if (project.boundary === 'cradle-to-grave') {
    const hasUse = enabledStages.find(s => s.id === 'use');
    const hasEol = enabledStages.find(s => s.id === 'end_of_life');
    if (!hasUse) issues.push({ field: 'lifeCycleStages', severity: SEVERITY.warning, message: 'Cradle-to-Grave 邊界通常應包含使用階段' });
    if (!hasEol) issues.push({ field: 'lifeCycleStages', severity: SEVERITY.warning, message: 'Cradle-to-Grave 邊界通常應包含廢棄處理' });
  }
  if (project.boundary === 'cradle-to-gate') {
    const hasUse = enabledStages.find(s => s.id === 'use');
    const hasEol = enabledStages.find(s => s.id === 'end_of_life');
    if (hasUse) issues.push({ field: 'lifeCycleStages', severity: SEVERITY.info, message: 'Cradle-to-Gate 通常不含使用階段，請確認是否有意啟用' });
    if (hasEol) issues.push({ field: 'lifeCycleStages', severity: SEVERITY.info, message: 'Cradle-to-Gate 通常不含廢棄處理，請確認是否有意啟用' });
  }

  return issues;
}

/**
 * Validate a single activity record
 * @returns {Array<{recordId, field, severity, message}>}
 */
export function validateRecord(record, factors = []) {
  const issues = [];
  const id = record.id;

  if (!record.itemName?.trim()) {
    issues.push({ recordId: id, field: 'itemName', severity: SEVERITY.error, message: '項目名稱為必填' });
  }
  if (record.activityData === 0 || record.activityData === '' || record.activityData == null) {
    issues.push({ recordId: id, field: 'activityData', severity: SEVERITY.error, message: '活動數據不可為零或空白' });
  }
  if (record.activityData < 0) {
    issues.push({ recordId: id, field: 'activityData', severity: SEVERITY.warning, message: '活動數據為負值，請確認是否正確（如回收抵減）' });
  }
  if (!record.activityUnit?.trim()) {
    issues.push({ recordId: id, field: 'activityUnit', severity: SEVERITY.error, message: '活動數據單位為必填' });
  }
  if (!record.emissionFactorId && record.emissionFactorValue === 0) {
    issues.push({ recordId: id, field: 'emissionFactor', severity: SEVERITY.error, message: '未選擇排放係數，也未輸入自訂係數值' });
  }
  if (!record.dataSource?.trim()) {
    issues.push({ recordId: id, field: 'dataSource', severity: SEVERITY.warning, message: '建議填寫資料來源以利查證' });
  }

  // Magnitude outlier check (very rough heuristic)
  if (record.co2e > 0) {
    if (record.co2e > 100000) {
      issues.push({ recordId: id, field: 'co2e', severity: SEVERITY.warning, message: `排放量 ${record.co2e.toFixed(2)} kgCO₂e 異常偏高，請確認數據` });
    }
    if (record.co2e < 0.0001 && record.activityData > 0) {
      issues.push({ recordId: id, field: 'co2e', severity: SEVERITY.info, message: '排放量極小，請確認單位與係數是否正確' });
    }
  }

  // Unit mismatch check against selected factor
  if (record.emissionFactorId) {
    const factor = factors.find(f => f.id === record.emissionFactorId);
    if (factor && record.activityUnit && factor.denominatorUnit) {
      if (record.activityUnit !== factor.denominatorUnit) {
        // Only warn if we can't auto-convert
        issues.push({ recordId: id, field: 'activityUnit', severity: SEVERITY.warning, message: `活動數據單位 (${record.activityUnit}) 與排放係數單位 (${factor.denominatorUnit}) 不同，系統將嘗試自動換算` });
      }
    }
  }

  return issues;
}

/**
 * Validate all records for a project
 */
export function validateAllRecords(records, factors = []) {
  const issues = [];
  for (const r of records) {
    issues.push(...validateRecord(r, factors));
  }

  // Check for empty stages (enabled but no records)
  return issues;
}

/**
 * Check snapshot readiness: all required fields + records validated
 */
export function checkSnapshotReadiness(project, records, factors = []) {
  const projectIssues = validateProject(project);
  const recordIssues = validateAllRecords(records, factors);

  const errors = [...projectIssues, ...recordIssues].filter(i => i.severity === SEVERITY.error);
  const warnings = [...projectIssues, ...recordIssues].filter(i => i.severity === SEVERITY.warning);

  return {
    ready: errors.length === 0,
    errors,
    warnings,
    allIssues: [...projectIssues, ...recordIssues],
  };
}

/**
 * Generate a validation summary HTML string
 */
export function renderValidationSummary(issues) {
  if (issues.length === 0) return '<div class="badge badge-success">✓ 全部驗證通過</div>';

  const errors = issues.filter(i => i.severity === SEVERITY.error);
  const warnings = issues.filter(i => i.severity === SEVERITY.warning);
  const infos = issues.filter(i => i.severity === SEVERITY.info);

  let html = '<div class="validation-summary">';
  if (errors.length > 0) {
    html += `<div class="validation-group validation-errors"><div class="validation-group-title">❌ 錯誤 (${errors.length})</div>`;
    html += errors.map(e => `<div class="validation-item">${e.message}</div>`).join('');
    html += '</div>';
  }
  if (warnings.length > 0) {
    html += `<div class="validation-group validation-warnings"><div class="validation-group-title">⚠️ 警告 (${warnings.length})</div>`;
    html += warnings.map(e => `<div class="validation-item">${e.message}</div>`).join('');
    html += '</div>';
  }
  if (infos.length > 0) {
    html += `<div class="validation-group validation-infos"><div class="validation-group-title">ℹ️ 建議 (${infos.length})</div>`;
    html += infos.map(e => `<div class="validation-item">${e.message}</div>`).join('');
    html += '</div>';
  }
  html += '</div>';
  return html;
}

export { SEVERITY };
