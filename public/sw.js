addEventListener('install', event => {
  skipWaiting();
  event.waitUntil(async function() {
    const cache = await caches.open('static-v1');
    await cache.addAll(['/style.css', '/client.js', '/']);
  }());
});

addEventListener('fetch', event => {
  event.respondWith(async function() {
    const response = await caches.match(event.request);
    if (response) return response;
    return fetch(event.request);
  }());
});
