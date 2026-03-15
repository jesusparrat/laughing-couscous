const CACHE = 'iptvplayer-v1';
const SHELL = ['./', './index.html', './manifest.json', './playlists.json', './worker.js',
  'https://cdn.jsdelivr.net/npm/hls.js@latest/dist/hls.min.js'];

self.addEventListener('install', e =>
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()))
);
self.addEventListener('activate', e =>
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()))
);
self.addEventListener('fetch', e => {
  const url = e.request.url;
  // M3U playlists: always network
  if (url.endsWith('.m3u') || url.endsWith('.m3u8') || url.includes('raw.githubusercontent') || url.includes('iptv-org')) {
    return e.respondWith(fetch(e.request).catch(() => new Response('', { status: 503 })));
  }
  // App shell: cache first
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => {
    const clone = res.clone();
    caches.open(CACHE).then(c => c.put(e.request, clone));
    return res;
  })));
});