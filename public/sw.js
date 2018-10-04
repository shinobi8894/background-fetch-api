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
    return fetch(event.request);
    // Offline first:
    const cachedResponse = await caches.match(event.request);
    
    if (cachedResponse && event.request.headers.has('range') && cachedResponse.status !== 206) {
      // Create a partial response.
      // At some point we'll fix caches.match to generate these.
      const blob = await cachedResponse.blob();
      const rangeResult = /bytes=(\d+)-(\d*)/.exec(event.request.headers.get('range'));
      const rangeStart = Number(rangeResult[1]);
      const rangeEnd = Number(rangeResult[2]) || blob.size - 1;
      
      const headers = new Headers(cachedResponse.headers);
      headers.set('Content-Range', `bytes ${rangeStart}-${rangeEnd}/${blob.size}`);
      headers.set('Content-Length', (rangeEnd - rangeStart) + 1);
      headers.set('Status', '206');
      const body = blob.slice(rangeStart, rangeEnd + 1);
      
      console.log('range', event.request.headers.get('range'));
      console.log('content-range', headers.get('content-range'));
      console.log('content-length', headers.get('content-length'));
      console.log('body size', body.size);
      console.log('=====');
      
      return new Response(body, { headers, status: 206, statusText: 'Partial Content' });
    }
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