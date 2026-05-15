// Butlr service worker — basic offline caching of the portal shell.
const CACHE = 'butlr-portal-v1';
const SHELL = [
  './butlr-hotel-portal.html',
  './butlr-for-hotels.html',
  './butlr-icon-192.png',
  './butlr-icon-512.png',
  './butlr-icon-180.png',
  './manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Never cache Firebase or CDN — always live
  if (url.host.includes('firebase') || url.host.includes('gstatic') ||
      url.host.includes('googleapis') || url.host.includes('cdn.jsdelivr')) return;
  e.respondWith(
    caches.match(e.request).then(cached =>
      cached || fetch(e.request).then(r => {
        if (r.ok && url.origin === location.origin) {
          const clone = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return r;
      }).catch(() => cached)
    )
  );
});
