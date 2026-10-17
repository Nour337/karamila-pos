/* Karamila POS — Service Worker
 * Bump VERSION on every deploy so phones pick up the new app shell. */
const VERSION = 'karamila-v1.2.0';
const SHELL = [
  './', './index.html', './styles.css', './app.js', './config.js', './i18n.js', './rewards.html', './rewards.js', './manifest.webmanifest',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  // Never touch API calls (POST to script.google.com) or other origins.
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  // Navigations: network first, fall back to cached shell (works offline).
  // Each page is cached under its own path (POS = index.html, customer page = rewards.html).
  if (req.mode === 'navigate') {
    const page = /\/rewards\.html$/.test(url.pathname) ? './rewards.html' : './index.html';
    e.respondWith(fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(page, copy)); }
      return res;
    }).catch(() => caches.match(page)));
    return;
  }

  // Static assets: stale-while-revalidate.
  e.respondWith(caches.open(VERSION).then(async (cache) => {
    const cached = await cache.match(req, { ignoreSearch: true });
    const network = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => cached);
    return cached || network;
  }));
});
