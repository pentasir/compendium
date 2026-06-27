/* ============================================================================
   sw.js: service worker. Keeps Compendium working offline.

   Strategy: NETWORK-FIRST for same-origin GETs. When online you always get the
   latest file (no stale-build trap during development); the cache is refreshed
   on every successful fetch and used only as an offline fallback.

   It caches *code only*. Your entries live in IndexedDB and are never touched,
   transmitted, or cached by this worker.
   ============================================================================ */

const CACHE = 'compendium-v17';
const SHELL = [
  './',
  './index.html',
  './css/compendium.css',
  './js/util.js',
  './js/db.js',
  './js/patterns.js',
  './js/heatmap.js',
  './js/thread.js',
  './js/ritual.js',
  './js/nav.js',
  './js/backup.js',
  './js/themes.js',
  './fonts/latin-400-normal.woff2',
  './fonts/latin-400-italic.woff2',
  './manifest.json',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)); // keep offline copy fresh
        return res;
      })
      .catch(() => caches.match(e.request)) // offline: fall back to the cached shell
  );
});
