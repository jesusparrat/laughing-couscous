// Bump version on every deploy to force cache refresh
const CACHE_NAME = 'iptv-v3';
const NETWORK_FIRST = ['playlists.json'];
const ASSETS = [
  '/',
  './index.html',
  './app.js',
  './styles.css',
  './worker.js',
  './manifest.json',
  'https://cdn.jsdelivr.net/npm/hls.js@1.5.15/dist/hls.min.js'
];

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

  const url = new URL(e.request.url);

  // Never cache M3U playlists or external streams
  if (url.hostname !== self.location.hostname &&
      !url.href.includes('cdn.jsdelivr.net') &&
      !url.href.includes('playlists.json')) {
    return;
  }

  const isNetworkFirst = NETWORK_FIRST.some(f => url.pathname.endsWith(f));

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
