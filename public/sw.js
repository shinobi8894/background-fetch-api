const version = '1.0.0';
const staticCache = `static-${version}`;


addEventListener('install', (event) => {
  event.waitUntil(async function() {
    const cache = caches.open(`static-${VERSION}`);
  }());
});