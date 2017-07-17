const cacheName = 'static-v3';

addEventListener('install', event => {
  skipWaiting();
  event.waitUntil(async function() {
    const cache = await caches.open(cacheName);
    await cache.addAll(['/style.css', '/client.js', '/']);
  }());
});

addEventListener('activate', event => {
  event.waitUntil(async function() {
    const keys = await caches.keys();
    for (const key of keys) {
      if (key != cacheName) await caches.delete(key);
    }
  }());
});

addEventListener('fetch', event => {
  event.respondWith(async function() {
    const response = await caches.match(event.request);
    if (response) return response;
    return fetch(event.request);
  }());
});
