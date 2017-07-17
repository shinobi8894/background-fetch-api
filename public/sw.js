addEventListener('install', event => {
  event.skipWaiting();
  event.waitUntil(async function() {
    const cache = caches.open('static-v1');
    await cache.addAll(['/style.css', '/client.js', '/']);
  }());
});

addEventListener('fetch', event => {
  event.respondWith(async function() {
    const response = caches.match(event.request);
    if (response) return response;
    return fetch(event.request);
  }());
});
