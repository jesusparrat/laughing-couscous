'use strict';

const CACHE = 'iptvplayer-v8';
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './playlists.json',
  './worker.js',
  'https://cdn.jsdelivr.net/npm/hls.js@1.5.15/dist/hls.min.js',
];

self.addEventListener('install', e =>
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()))
);

self.addEventListener('activate', e =>
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  )
);

self.addEventListener('fetch', e => {
  const url = e.request.url;
  
  if (!url.startsWith('http')) return;

  const noCache = (
    url.includes('.m3u8') ||
    /\.m3u(\?|$)/i.test(url) ||
    (url.includes('raw.githubusercontent') && /\.(m3u8?)/i.test(url)) ||
    url.includes('iptv-org.github.io') ||
    url.includes('127.0.0.1')
  );

  if (noCache) {
    e.respondWith(fetch(e.request).catch(() => new Response('', { status: 503 })));
    return;
  }

  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      if (!res || res.status !== 200 || res.type !== 'basic' && res.type !== 'cors') {
        return res;
      }
      const clone = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, clone));
      return res;
    }))
  );
});
