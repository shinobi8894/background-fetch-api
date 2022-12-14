const version = '1.3.9';
const staticCache = `static-${version}`;
const dynamicCache = 'dynamic'

addEventListener('install', (event) => {
  skipWaiting();
  
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
      "/lit/lib/template-factory.js",
      "https://cdn.glitch.com/6801d344-cd53-4f92-aedc-9202eb8d91c4%2Fhero.jpg?1538735805226",
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
    
    // A pretty harsh way to handle updates, but it's just a demo.
    for (const client of await clients.matchAll()) {
      client.navigate(client.url);
    }
  }());
});

addEventListener('fetch', (event) => {
  
  // Skip the service worker for the feed. The page handles the caching.
  if (event.request.url === 'https://http203.libsyn.com/rss') return;
  
  event.respondWith(async function() {
    
    // Offline first:
    const cachedResponse = await caches.match(event.request);
    
    // Generate partial responses
    // This doesn't seem to be needed anymore
    /*if (cachedResponse && event.request.headers.has('range') && cachedResponse.status !== 206) {
      // Create a partial response.
      // At some point we'll fix caches.match to generate these.
      const blob = await cachedResponse.blob();
      const rangeResult = /bytes=(\d+)-(\d*)/.exec(event.request.headers.get('range'));
      const rangeStart = Number(rangeResult[1]);
      const rangeEnd = Number(rangeResult[2]) || blob.size - 1;
      
      const headers = new Headers(cachedResponse.headers);
      headers.set('Content-Range', `bytes ${rangeStart}-${rangeEnd}/${blob.size}`);
      headers.set('Content-Length', (rangeEnd - rangeStart) + 1);
      const body = blob.slice(rangeStart, rangeEnd + 1);
      
      return new Response(body, { headers, status: 206 });
    }*/
    
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

addEventListener('backgroundfetchfail', event => {
  console.log('Background fetch failed', event);
});


addEventListener('backgroundfetchclick', event => {
  clients.openWindow('/');
});
