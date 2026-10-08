// Retired service worker (kill switch). Do not delete this file.
//
// An old page of this site (butlr-hotel-portal.html, May 2026) registered
// /butlr-sw.js for the whole of onebutlr.com. That worker answered every
// same-origin request from its cache first, so a browser that ever ran it
// keeps showing the pages it cached then. Deleting the file does not help:
// the browser's update check gets a 404 and keeps the old worker. This
// version replaces it once: it clears every cache it made, unregisters
// itself and reloads the open tabs, which then load the live site.
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch (_) { /* nothing cached */ }
    try { await self.registration.unregister(); } catch (_) { /* already gone */ }
    try {
      const tabs = await self.clients.matchAll({ type: "window" });
      tabs.forEach((c) => { try { c.navigate(c.url); } catch (_) { /* tab closed */ } });
    } catch (_) { /* no open tabs */ }
  })());
});

// No fetch handler: requests go straight to the network.
