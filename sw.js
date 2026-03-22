// Bump CACHE_NAME on every deploy to force cache refresh in all clients
const CACHE_NAME = 'iptv-v2';
const NETWORK_FIRST = ['playlists.json'];   // always fetch fresh; fallback to cache if offline
const ASSETS = ['/', './index.html', './app.js', './styles.css', './worker.js', './manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const pathname = new URL(e.request.url).pathname;
  const isNetworkFirst = NETWORK_FIRST.some(f => pathname.endsWith(f));

  if (isNetworkFirst) {
    e.respondWith(
      fetch(e.request)
        .then(r => { caches.open(CACHE_NAME).then(c => c.put(e.request, r.clone())); return r; })
        .catch(() => caches.match(e.request))
    );
  } else {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
  }
});
