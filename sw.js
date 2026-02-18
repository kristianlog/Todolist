// ===== GREENKEEPER - Service Worker =====
const CACHE_NAME = 'greenkeeper-v1';
const ASSETS = [
  '/index.html',
  '/styles.css',
  '/app.js',
  '/map.js',
  '/tasks.js',
  '/lang.js',
  '/firebase-config.js',
  '/manifest.json'
];

// Install - cache static assets
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate - clean old caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

// Fetch - network first, fallback to cache
self.addEventListener('fetch', function(event) {
  // Skip non-GET requests and external URLs
  if (event.request.method !== 'GET') return;

  // For CDN resources (Firebase, Leaflet), use cache-first
  if (event.request.url.includes('gstatic.com') ||
      event.request.url.includes('unpkg.com') ||
      event.request.url.includes('tile.openstreetmap.org')) {
    event.respondWith(
      caches.match(event.request).then(function(cached) {
        if (cached) return cached;
        return fetch(event.request).then(function(response) {
          if (response.ok) {
            var clone = response.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, clone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // For app files, use network-first
  event.respondWith(
    fetch(event.request).then(function(response) {
      if (response.ok) {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, clone);
        });
      }
      return response;
    }).catch(function() {
      return caches.match(event.request);
    })
  );
});
