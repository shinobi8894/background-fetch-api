const version = '1.0.0';
const staticCache = `static-${version}`;
const dynamicCache = 'dynamic'


addEventListener('install', (event) => {
  event.waitUntil(async function() {
    const cache = await caches.open(staticCache);
    await cache.addAll([
      "/",
      "/client.js",
      "/all.css",
      "/lit/lit-html.js",
      "/lit/lib/default-template-processor.js",
      "/lit/lib/template-result.js",
      "/lit/lib/template.js",
      "/lit/lib/template-instance.js",
      "/lit/lib/part.js",
      "/lit/lib/parts.js",
      "/lit/lib/dom.js",
      "/lit/lib/render.js",
      "/lit/lib/directive.js",
      "/lit/lib/template-factory.js"
    ]);
  }());
});

addEventListener('activate', (event) => {
  event.waitUntil(async function() {
    // Remove old caches
    for (const cacheName of await caches.keys()) {
      if (!cacheName.startsWith('podcast-') && cacheName !== staticCache && cacheName !== dynamicCache) {
        await caches.delete(cacheName);
      }
    }
  }());
});

addEventListener('fetch', (event) => {
  event.respondWith(async function() {
    // Offline first:
    const cachedResponse = await caches.match(event.request);
    return cachedResponse || fetch(event.request);
  }());
});


addEventListener('backgroundfetchsuccess', event => {
  const bgFetch = event.registration;
  
  event.waitUntil(async function () {
    const cache = await caches.open(bgFetch.id);
    const records = await bgFetch.matchAll();
    
    const promises = records.map(async record => {
      await cache.put(record.request, await record.responseReady);
    });
    
    await Promise.all(promises);
    
    new BroadcastChannel(bgFetch.id).postMessage({ stored: true });
  }());
});