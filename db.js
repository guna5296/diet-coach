/**
 * My Diet Coach - IndexedDB 管理モジュール
 * フェーズ2〜6までの全ストアをあらかじめ定義し、データ構造の一貫性を保つ
 */
const DietDB = (() => {
  'use strict';

  const DB_NAME = 'MyDietCoachDB';
  const DB_VERSION = 1;
  let dbPromise = null;

  function openDB() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // アプリ状態（プロフィール・初期登録下書き・設定）
        if (!db.objectStoreNames.contains('app_state')) {
          db.createObjectStore('app_state', { keyPath: 'key' });
        }
        // 体重・体脂肪ログ（フェーズ3〜）
        if (!db.objectStoreNames.contains('weight_logs')) {
          const store = db.createObjectStore('weight_logs', { keyPath: 'id' });
          store.createIndex('by_date', 'date', { unique: false });
        }
        // 食事ログ（フェーズ3〜）
        if (!db.objectStoreNames.contains('meal_logs')) {
          const store = db.createObjectStore('meal_logs', { keyPath: 'id' });
          store.createIndex('by_date', 'date', { unique: false });
        }
        // 行動・体調ログ（フェーズ3〜）
        if (!db.objectStoreNames.contains('daily_logs')) {
          db.createObjectStore('daily_logs', { keyPath: 'date' });
        }
        // ユーザー独自食材マスタ（フェーズ3〜）
        if (!db.objectStoreNames.contains('food_master')) {
          db.createObjectStore('food_master', { keyPath: 'id' });
        }
        // 食事テンプレート・お気に入り（フェーズ3〜）
        if (!db.objectStoreNames.contains('meal_templates')) {
          db.createObjectStore('meal_templates', { keyPath: 'id' });
        }
        // AI相談履歴・改善策（フェーズ5〜）
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

  return {
    openDB,
    getState,
    setState,
    deleteState
  };
})();
