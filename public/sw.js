const version = '1.0.0';
const staticCache = `static-${version}`;


addEventListener('install', (event) => {
  event.waitUntil(async function() {
    const cache = await caches.open(staticCache);
    await cache.addAll([
      "https://bgfetch-http203.glitch.me/client.js",
      "https://bgfetch-http203.glitch.me/all.css",
      "https://bgfetch-http203.glitch.me/lit/lit-html.js",
      "https://bgfetch-http203.glitch.me/lit/lib/default-template-processor.js",
      "https://bgfetch-http203.glitch.me/lit/lib/template-result.js",
      "https://bgfetch-http203.glitch.me/lit/lib/template.js",
      "https://bgfetch-http203.glitch.me/lit/lib/template-instance.js",
      "https://bgfetch-http203.glitch.me/lit/lib/part.js",
      "https://bgfetch-http203.glitch.me/lit/lib/parts.js",
      "https://bgfetch-http203.glitch.me/lit/lib/dom.js",
      "https://bgfetch-http203.glitch.me/lit/lib/render.js",
      "https://bgfetch-http203.glitch.me/lit/lib/directive.js",
      "https://bgfetch-http203.glitch.me/lit/lib/template-factory.js"
    ]);
  }());
});

addEventListener('activate', (event) => {
  event.waitUntil(async function() {
    // Remove old caches
    for (const cacheName of await caches.keys()) {
      if (!cacheName.startsWith('podcast/') && cacheName !== staticCache) {
        await caches.delete(cacheName);
      }
    }
  }());
});

addEventListener('fetch', (event) => {
  event.respondWith(async function() {
    // Cache
  }());
});
