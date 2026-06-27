/* ============================================================================
   db.js: the only place Compendium touches storage. Two backends behind one
   interface, chosen at runtime:

     • Web      -> IndexedDB, in this browser. No network call, ever.
     • Desktop  -> a folder of Markdown files you choose (the Tauri build), via
                   Rust file commands. One .md per day, readable in Obsidian.

   The rest of the app calls DB.* and never knows which backend is in use. Both
   expose isTauri / needsVault / pickVault so the boot flow can ask for a vault
   folder on the desktop before anything is read or written.
   ============================================================================ */

const DB = (() => {
  const tauri = typeof window !== 'undefined' && window.__TAURI__ && window.__TAURI__.core;

  // ── desktop: a folder of Markdown files ───────────────────────────────────
  function fileBackend() {
    const invoke = window.__TAURI__.core.invoke;
    let vault = null;

    const fileToEntry = (f) => ({
      id: f.id,
      createdAt: new Date(f.id + 'T12:00:00').getTime(),
      age: f.age ?? null,
      text: f.text || '',
      wordCount: f.words ?? Patterns.wordCount(f.text || ''),
      tokens: Patterns.tokenize(f.text || ''),
      sealed: !!f.sealed,
    });
    const entryToFile = (e) => ({
      id: e.id,
      age: e.age ?? null,
      words: e.wordCount ?? Patterns.wordCount(e.text || ''),
      sealed: !!e.sealed,
      text: e.text || '',
    });

    return {
      isTauri: true,
      async needsVault() {
        if (!vault) vault = await invoke('get_vault');
        return !vault;
      },
      async pickVault() {
        const chosen = await invoke('pick_vault');
        if (chosen) vault = chosen;
        return !!vault;
      },
      async getSettings() { return (await invoke('read_settings', { vault })) || undefined; },
      async saveSettings(config) { await invoke('write_settings', { vault, settings: { ...config } }); },
      async updateSettings(patch) {
        const current = (await invoke('read_settings', { vault })) || {};
        await invoke('write_settings', { vault, settings: { ...current, ...patch } });
      },
      async getEntry(id) {
        const f = await invoke('read_entry', { vault, id });
        return f ? fileToEntry(f) : undefined;
      },
      async putEntry(entry) { await invoke('write_entry', { vault, entry: entryToFile(entry) }); },
      async allEntries() {
        const list = await invoke('list_entries', { vault });
        return list.map(fileToEntry);
      },
      async exportAll() {
        const [settings, entries] = await Promise.all([this.getSettings(), this.allEntries()]);
        return { version: 1, exportedAt: Date.now(), settings, entries };
      },
    };
  }

  // ── web: IndexedDB ─────────────────────────────────────────────────────────
  function idbBackend() {
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
      isTauri: false,
      async needsVault() { return false; },
      async pickVault() { return true; },
      async getSettings() {
        const store = await tx('settings', 'readonly');
        return reqToPromise(store.get('config'));
      },
      async saveSettings(config) {
        const store = await tx('settings', 'readwrite');
        return reqToPromise(store.put({ key: 'config', ...config }));
      },
      async updateSettings(patch) {
        const current = (await this.getSettings()) || {};
        const store = await tx('settings', 'readwrite');
        return reqToPromise(store.put({ ...current, ...patch, key: 'config' }));
      },
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
      async exportAll() {
        const [settings, entries] = await Promise.all([this.getSettings(), this.allEntries()]);
        return { version: VERSION, exportedAt: Date.now(), settings, entries };
      },
    };
  }

  return tauri ? fileBackend() : idbBackend();
})();
