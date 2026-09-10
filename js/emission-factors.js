/**
 * emission-factors.js — Built-in emission factor database + version management
 */
import { Store, STORES } from './store.js';

// Taiwan common emission factors & International references
const BUILT_IN_FACTORS = [
  // ── 能源 ──
  { id: 'ef-elec-tw', carbonType: 'fossil', name: '外購電力（台灣電網）', category: '能源', coefficient: 0.474, numeratorUnit: 'kgCO2e', denominatorUnit: 'kWh', sourceName: '能源署', sourceUrl: 'https://www.moeaea.gov.tw/', announcementYear: 2024, geography: '台灣', technologyScope: '電網平均', gwpVersion: 'AR6', isUserDefined: false, version: '2024-v1' },
  { id: 'ef-ng', carbonType: 'fossil', name: '天然氣', category: '能源', coefficient: 2.105, numeratorUnit: 'kgCO2e', denominatorUnit: 'Nm3', sourceName: '環境部', sourceUrl: '', announcementYear: 2024, geography: '台灣', technologyScope: '燃燒', gwpVersion: 'AR6', isUserDefined: false, version: '2024-v1' },
  { id: 'ef-diesel', carbonType: 'fossil', name: '柴油', category: '能源', coefficient: 2.606, numeratorUnit: 'kgCO2e', denominatorUnit: 'L', sourceName: '環境部', sourceUrl: '', announcementYear: 2024, geography: '台灣', technologyScope: '燃燒', gwpVersion: 'AR6', isUserDefined: false, version: '2024-v1' },
  { id: 'ef-gasoline', carbonType: 'fossil', name: '汽油', category: '能源', coefficient: 2.263, numeratorUnit: 'kgCO2e', denominatorUnit: 'L', sourceName: '環境部', sourceUrl: '', announcementYear: 2024, geography: '台灣', technologyScope: '燃燒', gwpVersion: 'AR6', isUserDefined: false, version: '2024-v1' },
  { id: 'ef-lpg', carbonType: 'fossil', name: '液化石油氣 (LPG)', category: '能源', coefficient: 3.003, numeratorUnit: 'kgCO2e', denominatorUnit: 'kg', sourceName: '環境部', sourceUrl: '', announcementYear: 2024, geography: '台灣', technologyScope: '燃燒', gwpVersion: 'AR6', isUserDefined: false, version: '2024-v1' },
  { id: 'ef-coal', carbonType: 'fossil', name: '煤炭', category: '能源', coefficient: 2.471, numeratorUnit: 'kgCO2e', denominatorUnit: 'kg', sourceName: '環境部', sourceUrl: '', announcementYear: 2024, geography: '台灣', technologyScope: '燃燒', gwpVersion: 'AR6', isUserDefined: false, version: '2024-v1' },
  { id: 'ef-fo', carbonType: 'fossil', name: '重油', category: '能源', coefficient: 2.924, numeratorUnit: 'kgCO2e', denominatorUnit: 'L', sourceName: '環境部', sourceUrl: '', announcementYear: 2024, geography: '台灣', technologyScope: '燃燒', gwpVersion: 'AR6', isUserDefined: false, version: '2024-v1' },
  { id: 'ef-steam', carbonType: 'fossil', name: '外購蒸汽', category: '能源', coefficient: 0.280, numeratorUnit: 'kgCO2e', denominatorUnit: 'kg', sourceName: '通用估算', sourceUrl: '', announcementYear: 2024, geography: '台灣', technologyScope: '鍋爐平均', gwpVersion: 'AR6', isUserDefined: false, version: '2024-v1' },
  
  // ── 水資源與廢水 ──
  { id: 'ef-water', carbonType: 'fossil', name: '自來水', category: '水資源', coefficient: 0.160, numeratorUnit: 'kgCO2e', denominatorUnit: 'm3', sourceName: '台水', sourceUrl: '', announcementYear: 2024, geography: '台灣', technologyScope: '供水處理', gwpVersion: 'AR6', isUserDefined: false, version: '2024-v1' },
  { id: 'ef-wastewater', carbonType: 'fossil', name: '廢水處理', category: '廢棄處理', coefficient: 0.350, numeratorUnit: 'kgCO2e', denominatorUnit: 'm3', sourceName: '通用估算', sourceUrl: '', announcementYear: 2024, geography: '台灣', technologyScope: '二級處理', gwpVersion: 'AR6', isUserDefined: false, version: '2024-v1' },

  // ── 運輸 ──
  { id: 'ef-truck-small', carbonType: 'fossil', name: '小型貨車運輸 (<3.5t)', category: '運輸', coefficient: 0.221, numeratorUnit: 'kgCO2e', denominatorUnit: 'tkm', sourceName: '環境部', sourceUrl: '', announcementYear: 2024, geography: '台灣', technologyScope: '柴油', gwpVersion: 'AR6', isUserDefined: false, version: '2024-v1' },
  { id: 'ef-truck-med', carbonType: 'fossil', name: '中型貨車運輸 (3.5-10t)', category: '運輸', coefficient: 0.185, numeratorUnit: 'kgCO2e', denominatorUnit: 'tkm', sourceName: '環境部', sourceUrl: '', announcementYear: 2024, geography: '台灣', technologyScope: '柴油', gwpVersion: 'AR6', isUserDefined: false, version: '2024-v1' },
  { id: 'ef-truck-large', carbonType: 'fossil', name: '大型貨車運輸 (>10t)', category: '運輸', coefficient: 0.103, numeratorUnit: 'kgCO2e', denominatorUnit: 'tkm', sourceName: '環境部', sourceUrl: '', announcementYear: 2024, geography: '台灣', technologyScope: '柴油', gwpVersion: 'AR6', isUserDefined: false, version: '2024-v1' },
  { id: 'ef-ocean', carbonType: 'fossil', name: '海運 (貨櫃船)', category: '運輸', coefficient: 0.016, numeratorUnit: 'kgCO2e', denominatorUnit: 'tkm', sourceName: 'IPCC', sourceUrl: '', announcementYear: 2023, geography: '全球', technologyScope: '貨櫃', gwpVersion: 'AR6', isUserDefined: false, version: '2023-v1' },
  { id: 'ef-air', carbonType: 'fossil', name: '空運 (貨機)', category: '運輸', coefficient: 0.602, numeratorUnit: 'kgCO2e', denominatorUnit: 'tkm', sourceName: 'IPCC', sourceUrl: '', announcementYear: 2023, geography: '全球', technologyScope: '長程', gwpVersion: 'AR6', isUserDefined: false, version: '2023-v1' },
  { id: 'ef-rail', carbonType: 'fossil', name: '鐵路運輸', category: '運輸', coefficient: 0.045, numeratorUnit: 'kgCO2e', denominatorUnit: 'tkm', sourceName: '環境部', sourceUrl: '', announcementYear: 2024, geography: '台灣', technologyScope: '台鐵/高鐵平均', gwpVersion: 'AR6', isUserDefined: false, version: '2024-v1' },

  // ── 金屬建材與原料 ──
  { id: 'ef-steel', carbonType: 'fossil', name: '鋼鐵 (一般)', category: '原料', coefficient: 1.850, numeratorUnit: 'kgCO2e', denominatorUnit: 'kg', sourceName: 'ecoinvent', sourceUrl: '', announcementYear: 2023, geography: '全球', technologyScope: '粗鋼', gwpVersion: 'AR6', isUserDefined: false, version: '2023-v1' },
  { id: 'ef-stainless', carbonType: 'fossil', name: '不鏽鋼', category: '原料', coefficient: 4.500, numeratorUnit: 'kgCO2e', denominatorUnit: 'kg', sourceName: 'ecoinvent', sourceUrl: '', announcementYear: 2023, geography: '全球', technologyScope: '冷軋', gwpVersion: 'AR6', isUserDefined: false, version: '2023-v1' },
  { id: 'ef-aluminum', carbonType: 'fossil', name: '鋁 (原鋁)', category: '原料', coefficient: 8.240, numeratorUnit: 'kgCO2e', denominatorUnit: 'kg', sourceName: 'ecoinvent', sourceUrl: '', announcementYear: 2023, geography: '全球', technologyScope: '原鋁', gwpVersion: 'AR6', isUserDefined: false, version: '2023-v1' },
  { id: 'ef-copper', carbonType: 'fossil', name: '銅', category: '原料', coefficient: 3.800, numeratorUnit: 'kgCO2e', denominatorUnit: 'kg', sourceName: 'ecoinvent', sourceUrl: '', announcementYear: 2023, geography: '全球', technologyScope: '精煉', gwpVersion: 'AR6', isUserDefined: false, version: '2023-v1' },
  { id: 'ef-zinc', carbonType: 'fossil', name: '鋅', category: '原料', coefficient: 2.500, numeratorUnit: 'kgCO2e', denominatorUnit: 'kg', sourceName: 'ecoinvent', sourceUrl: '', announcementYear: 2023, geography: '全球', technologyScope: '原鋅', gwpVersion: 'AR6', isUserDefined: false, version: '2023-v1' },
  { id: 'ef-cement', carbonType: 'fossil', name: '水泥', category: '原料', coefficient: 0.830, numeratorUnit: 'kgCO2e', denominatorUnit: 'kg', sourceName: '水泥公會', sourceUrl: '', announcementYear: 2024, geography: '台灣', technologyScope: '波特蘭', gwpVersion: 'AR6', isUserDefined: false, version: '2024-v1' },
  { id: 'ef-concrete', carbonType: 'fossil', name: '預拌混凝土', category: '原料', coefficient: 0.120, numeratorUnit: 'kgCO2e', denominatorUnit: 'kg', sourceName: '環境部', sourceUrl: '', announcementYear: 2024, geography: '台灣', technologyScope: '一般', gwpVersion: 'AR6', isUserDefined: false, version: '2024-v1' },
  { id: 'ef-glass', carbonType: 'fossil', name: '玻璃', category: '原料', coefficient: 0.860, numeratorUnit: 'kgCO2e', denominatorUnit: 'kg', sourceName: 'ecoinvent', sourceUrl: '', announcementYear: 2023, geography: '全球', technologyScope: '平板/容器', gwpVersion: 'AR6', isUserDefined: false, version: '2023-v1' },

  // ── 塑膠與橡膠 ──
  { id: 'ef-pe', carbonType: 'fossil', name: '聚乙烯 (PE)', category: '原料', coefficient: 1.890, numeratorUnit: 'kgCO2e', denominatorUnit: 'kg', sourceName: 'ecoinvent', sourceUrl: '', announcementYear: 2023, geography: '全球', technologyScope: '顆粒', gwpVersion: 'AR6', isUserDefined: false, version: '2023-v1' },
  { id: 'ef-pp', carbonType: 'fossil', name: '聚丙烯 (PP)', category: '原料', coefficient: 1.980, numeratorUnit: 'kgCO2e', denominatorUnit: 'kg', sourceName: 'ecoinvent', sourceUrl: '', announcementYear: 2023, geography: '全球', technologyScope: '顆粒', gwpVersion: 'AR6', isUserDefined: false, version: '2023-v1' },
  { id: 'ef-pet', carbonType: 'fossil', name: '聚酯 (PET)', category: '原料', coefficient: 2.150, numeratorUnit: 'kgCO2e', denominatorUnit: 'kg', sourceName: 'ecoinvent', sourceUrl: '', announcementYear: 2023, geography: '全球', technologyScope: '顆粒', gwpVersion: 'AR6', isUserDefined: false, version: '2023-v1' },
  { id: 'ef-pvc', carbonType: 'fossil', name: '聚氯乙烯 (PVC)', category: '原料', coefficient: 1.900, numeratorUnit: 'kgCO2e', denominatorUnit: 'kg', sourceName: 'ecoinvent', sourceUrl: '', announcementYear: 2023, geography: '全球', technologyScope: '顆粒', gwpVersion: 'AR6', isUserDefined: false, version: '2023-v1' },
  { id: 'ef-abs', carbonType: 'fossil', name: 'ABS 樹脂', category: '原料', coefficient: 3.100, numeratorUnit: 'kgCO2e', denominatorUnit: 'kg', sourceName: 'ecoinvent', sourceUrl: '', announcementYear: 2023, geography: '全球', technologyScope: '顆粒', gwpVersion: 'AR6', isUserDefined: false, version: '2023-v1' },
  { id: 'ef-nylon', carbonType: 'fossil', name: '尼龍 (PA6)', category: '原料', coefficient: 6.500, numeratorUnit: 'kgCO2e', denominatorUnit: 'kg', sourceName: 'ecoinvent', sourceUrl: '', announcementYear: 2023, geography: '全球', technologyScope: '顆粒', gwpVersion: 'AR6', isUserDefined: false, version: '2023-v1' },
  { id: 'ef-rubber', carbonType: 'fossil', name: '合成橡膠', category: '原料', coefficient: 2.800, numeratorUnit: 'kgCO2e', denominatorUnit: 'kg', sourceName: 'ecoinvent', sourceUrl: '', announcementYear: 2023, geography: '全球', technologyScope: '一般', gwpVersion: 'AR6', isUserDefined: false, version: '2023-v1' },

  // ── 紙、木材與包裝 ──
  { id: 'ef-wood-biogenic', name: '木材燃燒 (生質碳)', category: '其他', coefficient: 1.500, numeratorUnit: 'kgCO2e', denominatorUnit: 'kg', sourceName: '測試用', sourceUrl: '', announcementYear: 2024, geography: '全球', technologyScope: '生質燃燒', gwpVersion: 'AR6', isUserDefined: false, version: '2024-v1', carbonType: 'biogenic' },
  { id: 'ef-cardboard', carbonType: 'fossil', name: '瓦楞紙板', category: '原料', coefficient: 0.840, numeratorUnit: 'kgCO2e', denominatorUnit: 'kg', sourceName: 'ecoinvent', sourceUrl: '', announcementYear: 2023, geography: '全球', technologyScope: '回收紙混合', gwpVersion: 'AR6', isUserDefined: false, version: '2023-v1' },
  { id: 'ef-paper-print', carbonType: 'fossil', name: '印刷紙/影印紙', category: '原料', coefficient: 0.950, numeratorUnit: 'kgCO2e', denominatorUnit: 'kg', sourceName: 'DEFRA', sourceUrl: '', announcementYear: 2024, geography: '全球', technologyScope: '原生紙', gwpVersion: 'AR6', isUserDefined: false, version: '2024-v1' },
  { id: 'ef-wood', carbonType: 'fossil', name: '木材 (一般)', category: '原料', coefficient: 0.350, numeratorUnit: 'kgCO2e', denominatorUnit: 'kg', sourceName: 'DEFRA', sourceUrl: '', announcementYear: 2024, geography: '全球', technologyScope: '乾燥', gwpVersion: 'AR6', isUserDefined: false, version: '2024-v1' },
  { id: 'ef-eps', carbonType: 'fossil', name: '發泡聚苯乙烯 (保麗龍)', category: '原料', coefficient: 3.400, numeratorUnit: 'kgCO2e', denominatorUnit: 'kg', sourceName: 'ecoinvent', sourceUrl: '', announcementYear: 2023, geography: '全球', technologyScope: '包裝', gwpVersion: 'AR6', isUserDefined: false, version: '2023-v1' },

  // ── 紡織與化學品 ──
  { id: 'ef-cotton', carbonType: 'fossil', name: '棉花 (天然纖維)', category: '原料', coefficient: 1.800, numeratorUnit: 'kgCO2e', denominatorUnit: 'kg', sourceName: 'DEFRA', sourceUrl: '', announcementYear: 2024, geography: '全球', technologyScope: '一般種植', gwpVersion: 'AR6', isUserDefined: false, version: '2024-v1' },
  { id: 'ef-naoh', carbonType: 'fossil', name: '氫氧化鈉 (液鹼)', category: '原料', coefficient: 1.100, numeratorUnit: 'kgCO2e', denominatorUnit: 'kg', sourceName: 'ecoinvent', sourceUrl: '', announcementYear: 2023, geography: '全球', technologyScope: '100% 活性', gwpVersion: 'AR6', isUserDefined: false, version: '2023-v1' },
  { id: 'ef-sulfuric', carbonType: 'fossil', name: '硫酸', category: '原料', coefficient: 0.150, numeratorUnit: 'kgCO2e', denominatorUnit: 'kg', sourceName: 'ecoinvent', sourceUrl: '', announcementYear: 2023, geography: '全球', technologyScope: '工業級', gwpVersion: 'AR6', isUserDefined: false, version: '2023-v1' },
  { id: 'ef-solvent', carbonType: 'fossil', name: '有機溶劑 (VOCs)', category: '原料', coefficient: 2.500, numeratorUnit: 'kgCO2e', denominatorUnit: 'kg', sourceName: '通用估算', sourceUrl: '', announcementYear: 2024, geography: '全球', technologyScope: '平均', gwpVersion: 'AR6', isUserDefined: false, version: '2024-v1' },

  // ── 食品與農業 ──
  { id: 'ef-rice', carbonType: 'fossil', name: '稻米', category: '原料', coefficient: 2.500, numeratorUnit: 'kgCO2e', denominatorUnit: 'kg', sourceName: '農業部', sourceUrl: '', announcementYear: 2024, geography: '台灣', technologyScope: '白米', gwpVersion: 'AR6', isUserDefined: false, version: '2024-v1' },
  { id: 'ef-wheat', carbonType: 'fossil', name: '小麥粉', category: '原料', coefficient: 0.900, numeratorUnit: 'kgCO2e', denominatorUnit: 'kg', sourceName: 'DEFRA', sourceUrl: '', announcementYear: 2024, geography: '全球', technologyScope: '麵粉', gwpVersion: 'AR6', isUserDefined: false, version: '2024-v1' },
  { id: 'ef-pork', carbonType: 'fossil', name: '豬肉', category: '原料', coefficient: 5.500, numeratorUnit: 'kgCO2e', denominatorUnit: 'kg', sourceName: '農業部', sourceUrl: '', announcementYear: 2024, geography: '台灣', technologyScope: '屠體', gwpVersion: 'AR6', isUserDefined: false, version: '2024-v1' },
  { id: 'ef-chicken', carbonType: 'fossil', name: '雞肉', category: '原料', coefficient: 3.500, numeratorUnit: 'kgCO2e', denominatorUnit: 'kg', sourceName: '農業部', sourceUrl: '', announcementYear: 2024, geography: '台灣', technologyScope: '屠體', gwpVersion: 'AR6', isUserDefined: false, version: '2024-v1' },
  { id: 'ef-beef', carbonType: 'fossil', name: '牛肉', category: '原料', coefficient: 25.000, numeratorUnit: 'kgCO2e', denominatorUnit: 'kg', sourceName: 'DEFRA', sourceUrl: '', announcementYear: 2024, geography: '全球', technologyScope: '平均', gwpVersion: 'AR6', isUserDefined: false, version: '2024-v1' },
  
  // ── 冷媒 ──
  { id: 'ef-r134a', carbonType: 'fossil', name: '冷媒 R-134a (逸散)', category: '其他', coefficient: 1430, numeratorUnit: 'kgCO2e', denominatorUnit: 'kg', sourceName: 'IPCC', sourceUrl: '', announcementYear: 2023, geography: '全球', technologyScope: 'GWP 值', gwpVersion: 'AR4', isUserDefined: false, version: '2023-v1' },
  { id: 'ef-r410a', carbonType: 'fossil', name: '冷媒 R-410A (逸散)', category: '其他', coefficient: 2088, numeratorUnit: 'kgCO2e', denominatorUnit: 'kg', sourceName: 'IPCC', sourceUrl: '', announcementYear: 2023, geography: '全球', technologyScope: 'GWP 值', gwpVersion: 'AR4', isUserDefined: false, version: '2023-v1' },
  
  // ── 廢棄處理 ──
  { id: 'ef-tree-planting', name: '植樹造林 (生質碳移除)', category: '其他', coefficient: -10.0, numeratorUnit: 'kgCO2e', denominatorUnit: '棵', sourceName: '測試用', sourceUrl: '', announcementYear: 2024, geography: '全球', technologyScope: '固碳', gwpVersion: 'AR6', isUserDefined: false, version: '2024-v1', carbonType: 'biogenic' },
  { id: 'ef-landfill', carbonType: 'fossil', name: '掩埋處理 (一般廢棄物)', category: '廢棄處理', coefficient: 0.576, numeratorUnit: 'kgCO2e', denominatorUnit: 'kg', sourceName: '環境部', sourceUrl: '', announcementYear: 2024, geography: '台灣', technologyScope: '掩埋', gwpVersion: 'AR6', isUserDefined: false, version: '2024-v1' },
  { id: 'ef-incineration', carbonType: 'fossil', name: '焚化處理 (一般廢棄物)', category: '廢棄處理', coefficient: 0.381, numeratorUnit: 'kgCO2e', denominatorUnit: 'kg', sourceName: '環境部', sourceUrl: '', announcementYear: 2024, geography: '台灣', technologyScope: '焚化', gwpVersion: 'AR6', isUserDefined: false, version: '2024-v1' },
  { id: 'ef-recycle-plastic', carbonType: 'fossil', name: '塑膠回收處理 (扣抵)', category: '廢棄處理', coefficient: -1.200, numeratorUnit: 'kgCO2e', denominatorUnit: 'kg', sourceName: 'ecoinvent', sourceUrl: '', announcementYear: 2023, geography: '全球', technologyScope: '封閉迴路', gwpVersion: 'AR6', isUserDefined: false, version: '2023-v1' },
  { id: 'ef-recycle-paper', carbonType: 'fossil', name: '紙類回收處理 (扣抵)', category: '廢棄處理', coefficient: -0.400, numeratorUnit: 'kgCO2e', denominatorUnit: 'kg', sourceName: 'DEFRA', sourceUrl: '', announcementYear: 2024, geography: '全球', technologyScope: '回收效益', gwpVersion: 'AR6', isUserDefined: false, version: '2024-v1' },
];

export async function initEmissionFactors() {
  const existing = await Store.getAll(STORES.emissionFactors);
  if (existing.length === 0) {
    for (const f of BUILT_IN_FACTORS) {
      await Store.put(STORES.emissionFactors, f);
    }
  }
}

export async function getAllFactors() {
  return Store.getAll(STORES.emissionFactors);
}

export async function getFactorById(id) {
  return Store.get(STORES.emissionFactors, id);
}

export async function saveCustomFactor(factor) {
  factor.isUserDefined = true;
  if (!factor.id) factor.id = 'ef-custom-' + crypto.randomUUID().slice(0, 8);
  await Store.put(STORES.emissionFactors, factor);
  return factor;
}

export async function deleteFactor(id) {
  return Store.delete(STORES.emissionFactors, id);
}

export function getFactorCategories() {
  return ['能源', '水資源', '運輸', '原料', '廢棄處理', '其他'];
}

export { BUILT_IN_FACTORS };
