/**
 * store.js — IndexedDB CRUD for ISO 14067 PCF System
 * All persistent data goes through this module.
 */

const DB_NAME = 'iso14067_tour_v2';
const DB_VERSION = 1;

const STORES = {
  projects: 'projects',
  activityRecords: 'activityRecords',
  snapshots: 'snapshots',
  auditLog: 'auditLog',
  emissionFactors: 'emissionFactors',
  reportContents: 'reportContents',
};

let dbInstance = null;

function openDB() {
  if (dbInstance) return Promise.resolve(dbInstance);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORES.projects)) {
        db.createObjectStore(STORES.projects, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.activityRecords)) {
        const s = db.createObjectStore(STORES.activityRecords, { keyPath: 'id' });
        s.createIndex('projectId', 'projectId', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.snapshots)) {
        const s = db.createObjectStore(STORES.snapshots, { keyPath: 'id' });
        s.createIndex('projectId', 'projectId', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.auditLog)) {
        const s = db.createObjectStore(STORES.auditLog, { keyPath: 'id', autoIncrement: true });
        s.createIndex('projectId', 'projectId', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.emissionFactors)) {
        db.createObjectStore(STORES.emissionFactors, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.reportContents)) {
        const s = db.createObjectStore(STORES.reportContents, { keyPath: 'id' });
        s.createIndex('projectId', 'projectId', { unique: false });
      }
    };
    req.onsuccess = (e) => { dbInstance = e.target.result; resolve(dbInstance); };
    req.onerror = (e) => reject(e.target.error);
  });
}

async function tx(storeName, mode = 'readonly') {
  const db = await openDB();
  return db.transaction(storeName, mode).objectStore(storeName);
}

function promisify(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const Store = {
  async getAll(storeName) {
    const store = await tx(storeName);
    return promisify(store.getAll());
  },
  async get(storeName, id) {
    const store = await tx(storeName);
    return promisify(store.get(id));
  },
  async put(storeName, data) {
    const store = await tx(storeName, 'readwrite');
    return promisify(store.put(data));
  },
  async delete(storeName, id) {
    const store = await tx(storeName, 'readwrite');
    return promisify(store.delete(id));
  },
  async getAllByIndex(storeName, indexName, value) {
    const store = await tx(storeName);
    const index = store.index(indexName);
    return promisify(index.getAll(value));
  },
  async clear(storeName) {
    const store = await tx(storeName, 'readwrite');
    return promisify(store.clear());
  },
};

export { STORES, openDB };

// ── Project helpers ──
export function createProjectTemplate() {
  return {
    id: crypto.randomUUID(),
    name: '頭城農場遊程盤查範例',
    tourName: '地球志工 Earth Keeper',
    productDescription: '單日/多日農業體驗遊程',
    functionalUnit: '每人次',
    declaredUnit: '人次',
    touristsCount: 167,
    boundary: 'cradle-to-grave',
    cutoffCriteria: '質量與能量貢獻低於總量 1% 之投入項予以排除，累計排除不超過 5%',
    pcrReference: '',
    gwpVersion: 'AR6',
    dataPeriod: '',
    geographicScope: '台灣',
    technologyScope: '',
    studyGoal: '',
    intendedAudience: '',
    lifeCycleStages: [
      { id: 'transport', name: '交通運輸', enabled: true },
      { id: 'accommodation', name: '住宿服務', enabled: true },
      { id: 'food', name: '餐飲服務', enabled: true },
      { id: 'activities', name: '活動與遊憩', enabled: true },
      { id: 'waste', name: '廢棄物處理', enabled: true },
    ],
    verificationStatus: 'unverified',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function createActivityRecord(projectId, stageId) {
  return {
    id: crypto.randomUUID(),
    projectId,
    stageId,
    itemName: '',
    activityData: 0,
    activityUnit: '',
    emissionFactorId: '',
    emissionFactorValue: 0,
    emissionFactorUnit: '',
    dataType: 'secondary',
    dataSource: '',
    carbonType: 'fossil',
    evidenceUrl: '',
    allocationRatio: 100,
    note: '',
    co2e: 0,
    createdAt: new Date().toISOString(),
  };
}
