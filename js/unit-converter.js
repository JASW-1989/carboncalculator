/**
 * unit-converter.js — Unit standardization layer
 */
const UNIT_CONVERSIONS = {
  // Mass
  'g_to_kg': 0.001,
  'kg_to_kg': 1,
  'tonne_to_kg': 1000,
  'ton_to_kg': 1000,
  'lb_to_kg': 0.4536,
  '斤_to_kg': 0.6,
  '台斤_to_kg': 0.6,
  '兩_to_kg': 0.0375,
  '段_to_kg': 0.005,      // 1段麻繩約 5g
  '個_to_kg': 0.002,      // 1個羊眼釘約 2g
  '包_to_kg': 5.0,        // 1包材料平均約 5kg
  '張_to_kg': 0.005,      // 1張A4紙約 5g
  // Volume
  'mL_to_L': 0.001,
  'L_to_L': 1,
  'm3_to_L': 1000,
  'Nm3_to_Nm3': 1,
  'gal_to_L': 3.785,
  // Energy
  'kWh_to_kWh': 1,
  'MWh_to_kWh': 1000,
  'MJ_to_kWh': 0.2778,
  'GJ_to_kWh': 277.8,
  'kcal_to_kWh': 0.001163,
  // Transport
  'tkm_to_tkm': 1,
  'km_to_km': 1,
  'pkm_to_pkm': 1,
};

const MASS_UNITS = ['g', 'kg', 'tonne', 'ton', 'lb', '斤', '台斤', '兩', '段', '個', '包', '張'];
const VOLUME_UNITS = ['mL', 'L', 'm3', 'Nm3', 'gal'];
const ENERGY_UNITS = ['kWh', 'MWh', 'MJ', 'GJ', 'kcal'];
const TRANSPORT_UNITS = ['tkm', 'km', 'pkm'];

export function getUnitGroup(unit) {
  if (MASS_UNITS.includes(unit)) return 'mass';
  if (VOLUME_UNITS.includes(unit)) return 'volume';
  if (ENERGY_UNITS.includes(unit)) return 'energy';
  if (TRANSPORT_UNITS.includes(unit)) return 'transport';
  return 'other';
}

export function convert(value, fromUnit, toUnit) {
  if (fromUnit === toUnit) return value;
  const key = `${fromUnit}_to_${toUnit}`;
  if (UNIT_CONVERSIONS[key]) return value * UNIT_CONVERSIONS[key];
  // Try base conversion: from → base → to
  const fromGroup = getUnitGroup(fromUnit);
  const toGroup = getUnitGroup(toUnit);
  if (fromGroup !== toGroup) return null; // incompatible
  const bases = { mass: 'kg', volume: 'L', energy: 'kWh', transport: 'tkm' };
  const base = bases[fromGroup];
  if (!base) return null;
  const toBase = UNIT_CONVERSIONS[`${fromUnit}_to_${base}`];
  const fromBase = UNIT_CONVERSIONS[`${toUnit}_to_${base}`];
  if (toBase != null && fromBase != null && fromBase !== 0) {
    return value * toBase / fromBase;
  }
  return null;
}

export function canConvert(fromUnit, toUnit) {
  return fromUnit === toUnit || convert(1, fromUnit, toUnit) !== null;
}

export function getAllUnits() {
  return [...MASS_UNITS, ...VOLUME_UNITS, ...ENERGY_UNITS, ...TRANSPORT_UNITS, '個', '次', '張', '台'];
}

export function formatUnit(numerator, denominator) {
  return `${numerator}/${denominator}`;
}
