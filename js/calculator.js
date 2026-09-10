/**
 * calculator.js — Pure CO2e calculation engine (no DOM)
 */
import { convert, canConvert } from './unit-converter.js';

/**
 * Calculate CO2e for a single activity record
 * @returns {{ co2e: number, fossil: number, biogenicEmission: number, biogenicRemoval: number, luc: number, warning: string|null }}
 */
export function calculateSingleEmission(activityData, activityUnit, factorValue, factorDenominatorUnit, carbonType = 'fossil') {
  if (!activityData || !factorValue) return { co2e: 0, fossil: 0, biogenicEmission: 0, biogenicRemoval: 0, luc: 0, warning: null };
  let data = activityData;
  let warning = null;
  // Unit conversion if needed
  if (activityUnit !== factorDenominatorUnit) {
    if (canConvert(activityUnit, factorDenominatorUnit)) {
      data = convert(activityData, activityUnit, factorDenominatorUnit);
    } else {
      warning = `單位不匹配: ${activityUnit} ↔ ${factorDenominatorUnit}`;
      return { co2e: 0, fossil: 0, biogenicEmission: 0, biogenicRemoval: 0, luc: 0, warning };
    }
  }
  const co2e = data * factorValue;
  if (co2e < 0 && factorValue > 0) warning = '活動數據為負值';

  let fossil = 0, biogenicEmission = 0, biogenicRemoval = 0, luc = 0;
  
  if (carbonType === 'biogenic') {
    if (co2e > 0) biogenicEmission = co2e;
    else biogenicRemoval = co2e;
  } else if (carbonType === 'luc') {
    luc = co2e;
  } else {
    fossil = co2e;
  }

  return { co2e, fossil, biogenicEmission, biogenicRemoval, luc, warning };
}

/**
 * Calculate totals by life cycle stage
 */
export function calculateByStage(records) {
  const stages = {};
  for (const r of records) {
    if (!stages[r.stageId]) {
      stages[r.stageId] = { stageId: r.stageId, totalCO2e: 0, fossil: 0, biogenicEmission: 0, biogenicRemoval: 0, luc: 0, items: [] };
    }
    const res = calculateSingleEmission(
      r.activityData, r.activityUnit, r.emissionFactorValue, r.emissionFactorUnit, r.carbonType
    );
    stages[r.stageId].totalCO2e += res.co2e;
    stages[r.stageId].fossil += res.fossil;
    stages[r.stageId].biogenicEmission += res.biogenicEmission;
    stages[r.stageId].biogenicRemoval += res.biogenicRemoval;
    stages[r.stageId].luc += res.luc;
    stages[r.stageId].items.push({ ...r, ...res });
  }
  return stages;
}

/**
 * Calculate grand total
 */
export function calculateTotal(records) {
  const stages = calculateByStage(records);
  let totalCO2e = 0, fossil = 0, biogenicEmission = 0, biogenicRemoval = 0, luc = 0;
  for (const s of Object.values(stages)) {
    totalCO2e += s.totalCO2e;
    fossil += s.fossil;
    biogenicEmission += s.biogenicEmission;
    biogenicRemoval += s.biogenicRemoval;
    luc += s.luc;
  }
  return { totalCO2e, fossil, biogenicEmission, biogenicRemoval, luc, stages };
}

/**
 * Calculate allocation for co-products
 */
export function calculateAllocation(grossTotals, project) {
  if (!project.mainProduct) return { factor: 1, allocatedTotals: grossTotals };
  if (project.allocationMethod === 'other' || project.allocationMethod === 'system_expansion') {
     return { factor: 1, allocatedTotals: grossTotals }; 
  }
  
  const m = project.allocationMethod; // 'mass', 'economic', 'energy'
  // Use fallback property if 'mass' doesn't exist to prevent NaN
  let mainProp = m === 'economic' ? 'value' : m;
  
  let mainVal = Number(project.mainProduct[mainProp]) || 0;
  let coVal = 0;
  if (project.coProducts && project.coProducts.length > 0) {
     coVal = project.coProducts.reduce((sum, p) => sum + (Number(p[mainProp]) || 0), 0);
  }
  
  const totalVal = mainVal + coVal;
  const factor = totalVal > 0 ? (mainVal / totalVal) : 1;

  const allocatedTotals = {
    totalCO2e: grossTotals.totalCO2e * factor,
    fossil: grossTotals.fossil * factor,
    biogenicEmission: grossTotals.biogenicEmission * factor,
    biogenicRemoval: grossTotals.biogenicRemoval * factor,
    luc: grossTotals.luc * factor
  };
  
  return { factor, allocatedTotals };
}

/**
 * Calculate mass balance check
 */
export function calculateMassBalance(records) {
  let totalInput = 0;
  let totalOutput = 0;
  for (const r of records) {
    if (r.massValue && !isNaN(r.massValue)) {
      if (r.isInput) totalInput += Number(r.massValue);
      else totalOutput += Number(r.massValue);
    }
  }
  const diff = totalInput - totalOutput;
  const errorPct = totalInput > 0 ? Math.abs(diff / totalInput) * 100 : 0;
  return { totalInput, totalOutput, diff, errorPct };
}

/**
 * Calculate percentages per stage
 */
export function calculatePercentages(stages, totalCO2e) {
  const result = {};
  for (const [id, stage] of Object.entries(stages)) {
    result[id] = {
      ...stage,
      percentage: totalCO2e > 0 ? (stage.totalCO2e / totalCO2e * 100) : 0,
    };
  }
  return result;
}

/**
 * Identify emission hotspots (stages > threshold%)
 */
export function identifyHotspots(stages, totalCO2e, threshold = 30) {
  const pcts = calculatePercentages(stages, totalCO2e);
  return Object.values(pcts).filter(s => s.percentage >= threshold);
}

/**
 * Calculate primary data ratio
 */
export function calculateDataRatio(records) {
  if (records.length === 0) return { primary: 0, secondary: 0 };
  const primary = records.filter(r => r.dataType === 'primary').length;
  return {
    primary: (primary / records.length * 100),
    secondary: ((records.length - primary) / records.length * 100),
  };
}

/**
 * Validate records for completeness
 */
export function validateRecords(records) {
  const errors = [];
  for (const r of records) {
    if (!r.itemName) errors.push({ recordId: r.id, field: 'itemName', message: '項目名稱為必填' });
    if (r.activityData === 0 || r.activityData === '') errors.push({ recordId: r.id, field: 'activityData', message: '活動數據不可為零' });
    if (!r.emissionFactorId && r.emissionFactorValue === 0) errors.push({ recordId: r.id, field: 'emissionFactor', message: '未選擇排放係數' });
    if (r.activityData < 0 && r.carbonType !== 'biogenic') errors.push({ recordId: r.id, field: 'activityData', message: '非生質碳活動數據為負值，請確認' });
  }
  return errors;
}
