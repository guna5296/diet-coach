const CACHE_NAME = 'my-diet-coach-v1.6.1';
const CORE_ASSETS = [
  './',
  './index.html',
  './style.css?v=1.6.1',
  './app.js?v=1.6.1',
  './db.js?v=1.6.1',
  './foods.js?v=1.6.1',
  './nutrition.js?v=1.6.1',
  './record.js?v=1.6.1',
  './analytics.js?v=1.6.1',
  './coach.js?v=1.6.1',
  './backup.js?v=1.6.1',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

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
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request, { cache: 'no-cache' })
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, cloned);
          });
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => cached || caches.match('./index.html'))
      )
  );
});
