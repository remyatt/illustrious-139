/* ============================================================
   Service Worker — Illustrious 139 PWA
   Strategy: Cache-first for shell assets, network-first for
   external resources so the app works offline after first load.
   ============================================================ */

const CACHE_NAME   = 'illustrious-139-v1';
const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
];

/* ── Install: pre-cache the app shell ─────────────────────── */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(SHELL_ASSETS);
    })
  );
  // Activate immediately without waiting for old tabs to close
  self.skipWaiting();
});

/* ── Activate: remove stale caches ───────────────────────── */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  // Take control of open pages immediately
  self.clients.claim();
});

/* ── Fetch: cache-first for shell, network-first otherwise ── */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin requests (CORS proxies, Google Calendar, etc.)
  // — let the browser handle those natively
  if (url.origin !== self.location.origin) return;

  // Cache-first strategy for same-origin shell assets
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      // Not in cache — fetch from network and store a copy
      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const toCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, toCache));
        return response;
      }).catch(() => {
        // Offline fallback: serve index.html for navigation requests
        if (request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
      });
    })
  );
});
