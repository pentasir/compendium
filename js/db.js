/* ============================================================================
   db.js: the only place Compendium touches storage.
   Everything lives in IndexedDB, on this device, in this browser. There is no
   network call anywhere in this file (or this project). That is the point.

   Two stores:
     • entries   keyed by date string "YYYY-MM-DD": one record per day, forever
     • settings  a single "config" record holding the birthdate
   ============================================================================ */

const DB = (() => {
  const NAME = 'compendium';
  const VERSION = 1;
  let _db = null;

  function open() {
    if (_db) return Promise.resolve(_db);
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(NAME, VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('entries')) {
          db.createObjectStore('entries', { keyPath: 'id' }); // id = "YYYY-MM-DD"
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
      req.onsuccess = (e) => { _db = e.target.result; resolve(_db); };
      req.onerror = () => reject(req.error);
    });
  }

  function tx(store, mode) {
    return open().then((db) => db.transaction(store, mode).objectStore(store));
  }

  function reqToPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  return {
    // ── settings ──────────────────────────────────────────────────────────
    async getSettings() {
      const store = await tx('settings', 'readonly');
      return reqToPromise(store.get('config'));
    },
    async saveSettings(config) {
      const store = await tx('settings', 'readwrite');
      return reqToPromise(store.put({ key: 'config', ...config }));
    },

    // ── entries ───────────────────────────────────────────────────────────
    async getEntry(id) {
      const store = await tx('entries', 'readonly');
      return reqToPromise(store.get(id));
    },
    async putEntry(entry) {
      const store = await tx('entries', 'readwrite');
      return reqToPromise(store.put(entry));
    },
    async allEntries() {
      const store = await tx('entries', 'readonly');
      return reqToPromise(store.getAll());
    },

    // ── backup: the user's data-loss safety net (Phase 5 wires the UI) ──────
    async exportAll() {
      const [settings, entries] = await Promise.all([this.getSettings(), this.allEntries()]);
      return { version: VERSION, exportedAt: Date.now(), settings, entries };
    },
  };
})();
