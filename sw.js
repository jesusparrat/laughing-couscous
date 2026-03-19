// sw.js v2.1
'use strict';

const CACHE = 'iptvplayer-v4';
// FIX B07: HLS.js pinado a versión concreta, no @latest
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './playlists.json',
  './worker.js',
  'https://cdn.jsdelivr.net/npm/hls.js@1.5.15/dist/hls.min.js',
];

// FIX B06: e.waitUntil() con paréntesis correctamente cerrados
self.addEventListener('install', e =>
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  )
);

self.addEventListener('activate', e =>
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
);

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // FIX B05: bloque if con llaves {} y return explícito para aislar el flujo
  // FIX B08: raw.githubusercontent excluido solo para paths de m3u/m3u8,
  //           assets del repo propios (manifest, worker, etc.) sí se cachean
  const noCache = (
    url.includes('.m3u8')           ||
    /\.m3u(\?|$)/i.test(url)        ||
    (url.includes('raw.githubusercontent') && /\.(m3u8?)/i.test(url)) ||
    url.includes('iptv-org.github.io')     ||
    url.includes('127.0.0.1')              ||
    url.includes('acestream')
  );

  if (noCache) {
    e.respondWith(
      fetch(e.request).catch(() => new Response('', { status: 503 }))
    );
    return;  // ← return explícito: el bloque cache-first de abajo NO se alcanza
  }

  // App shell: cache-first
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      const clone = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, clone));
      return res;
    }))
  );
});
