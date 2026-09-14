// Multi-Tenant Service Worker v3
// Strategy: Cache-First for assets, Network-First for pages

const CACHE_VERSION = 'v7';
const STATIC_CACHE = `store-static-${CACHE_VERSION}`;
const IMAGE_CACHE = `store-images-${CACHE_VERSION}`;
const PAGE_CACHE = `store-pages-${CACHE_VERSION}`;

// Assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/',
  '/products',
  '/manifest.json'
];

// ── INSTALL ──────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE ─────────────────────────────────────────
self.addEventListener('activate', (event) => {
  const currentCaches = [STATIC_CACHE, IMAGE_CACHE, PAGE_CACHE];
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((k) => !currentCaches.includes(k))
          .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── FETCH ─────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Skip: admin, api, account, checkout, cross-origin
  if (
    url.pathname.startsWith('/admin') ||
    url.pathname.startsWith('/super-admin') ||
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/account') ||
    url.pathname.startsWith('/checkout') ||
    url.origin !== self.location.origin
  ) return;

  // Images → Cache First (long-lived)
  if (
    url.pathname.match(/\.(png|jpg|jpeg|webp|gif|svg)$/) ||
    url.pathname.startsWith('/images/') ||
    request.destination === 'image'
  ) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  // Static assets (JS, CSS, fonts) → Cache First
  // EXCLUDE /favicon.ico — must always hit the server for correct per-store resolution
  if (
    url.pathname.match(/\.(js|css|woff2?|ttf|otf|svg|png|webp)$/) &&
    !url.pathname.endsWith('favicon.ico')
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // HTML pages → Network First, fallback to cache
  event.respondWith(networkFirst(request, PAGE_CACHE));
});

// ── STRATEGIES ────────────────────────────────────────
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('', { status: 408 });
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || caches.match('/');
  }
}

// ── BACKGROUND SYNC (for future offline cart) ─────────
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
