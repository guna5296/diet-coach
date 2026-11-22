/**
 * My Diet Coach - IndexedDB 管理モジュール（v1.6.2）
 */
const DietDB = (() => {
  'use strict';

  const DB_NAME = 'MyDietCoachDB';
  const DB_VERSION = 1;
  const ALL_STORES = [
    'app_state',
    'weight_logs',
    'meal_logs',
    'daily_logs',
    'food_master',
    'meal_templates',
    'ai_history'
  ];

  let dbPromise = null;

  function openDB() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains('app_state')) {
          db.createObjectStore('app_state', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('weight_logs')) {
          const store = db.createObjectStore('weight_logs', { keyPath: 'id' });
          store.createIndex('by_date', 'date', { unique: false });
        }
        if (!db.objectStoreNames.contains('meal_logs')) {
          const store = db.createObjectStore('meal_logs', { keyPath: 'id' });
          store.createIndex('by_date', 'date', { unique: false });
        }
        if (!db.objectStoreNames.contains('daily_logs')) {
          db.createObjectStore('daily_logs', { keyPath: 'date' });
        }
        if (!db.objectStoreNames.contains('food_master')) {
          db.createObjectStore('food_master', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('meal_templates')) {
          db.createObjectStore('meal_templates', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('ai_history')) {
          const store = db.createObjectStore('ai_history', { keyPath: 'id' });
          store.createIndex('by_createdAt', 'createdAt', { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return dbPromise;
  }

  function generateId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  async function getState(key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('app_state', 'readonly');
      const req = tx.objectStore('app_state').get(key);
      req.onsuccess = () => resolve(req.result ? req.result.value : null);
      req.onerror = () => reject(req.error);
    });
  }

  async function setState(key, value) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('app_state', 'readwrite');
      tx.objectStore('app_state').put({
        key,
        value,
        updatedAt: new Date().toISOString()
      });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  async function deleteState(key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('app_state', 'readwrite');
      tx.objectStore('app_state').delete(key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  async function getItem(storeName, key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function getAll(storeName) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async function getByDate(storeName, dateStr) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const index = tx.objectStore(storeName).index('by_date');
      const req = index.getAll(dateStr);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async function putItem(storeName, record) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(record);
      tx.oncomplete = () => resolve(record);
      tx.onerror = () => reject(tx.error);
    });
  }

  async function deleteItem(storeName, key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).delete(key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  async function exportAllStores() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(ALL_STORES, 'readonly');
      const data = {};
      ALL_STORES.forEach((storeName) => {
        const req = tx.objectStore(storeName).getAll();
        req.onsuccess = () => {
          data[storeName] = req.result || [];
        };
      });
      tx.oncomplete = () => resolve(data);
      tx.onerror = () => reject(tx.error);
    });
  }

  async function replaceAllStores(storesData) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(ALL_STORES, 'readwrite');

      ALL_STORES.forEach((storeName) => {
        const store = tx.objectStore(storeName);
        store.clear();
        const records = Array.isArray(storesData[storeName]) ? storesData[storeName] : [];
        records.forEach((rec) => {
          if (rec && typeof rec === 'object') {
            store.put(rec);
          }
        });
      });

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error || new Error('復元トランザクションエラー'));
      tx.onabort = () => reject(tx.error || new Error('復元が中断されました'));
    });
  }

  /**
   * 全ストアのデータを完全に空にする（引き渡し前リセット・初期化用）
   */
  async function clearAllStores() {
    return replaceAllStores({});
  }

  async function getStorageCounts() {
    const all = await exportAllStores();
    const hasProfile = (all.app_state || []).some((s) => s.key === 'user_profile' && s.value);
    return {
      hasProfile,
      weightLogs: (all.weight_logs || []).length,
      mealLogs: (all.meal_logs || []).length,
      dailyLogs: (all.daily_logs || []).length,
      foodMaster: (all.food_master || []).length,
      mealTemplates: (all.meal_templates || []).length,
      aiHistory: (all.ai_history || []).length
    };
  }

  return {
    ALL_STORES,
    openDB,
    generateId,
    getState,
    setState,
    deleteState,
    getItem,
    getAll,
    getByDate,
    putItem,
    deleteItem,
    exportAllStores,
    replaceAllStores,
    clearAllStores,
    getStorageCounts
  };
})();
