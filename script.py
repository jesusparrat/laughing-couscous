
# ── worker.js ──────────────────────────────────────────────────────────────────
worker_js = r"""
self.onmessage = function (e) {
  const { text } = e.data;
  const channels = parseM3U(text);
  self.postMessage({ channels });
};

function detectQ(name) {
  const n = name.toUpperCase();
  if (n.includes('4K') || n.includes('UHD'))   return '4K';
  if (n.includes('FHD') || n.includes('1080')) return 'FHD';
  if (n.includes(' HD') || n.includes('720'))  return 'HD';
  return 'SD';
}

function canonical(name) {
  return name
    .replace(/\s*(4K|UHD|FHD|1080p?|HD|720p?|SD|480p?)\s*$/i, '')
    .replace(/\s*\(Opci[oó]n\s*\d+\)\s*$/i, '')
    .replace(/\s*(Multi|M\d+)\s*$/i, '')
    .trim();
}

const GROUP_RULES = [
  [/^DAZN/i,                          'DAZN'],
  [/LIGA\s*DE\s*CAMPEONES|UEFA/i,     'LIGA DE CAMPEONES'],
  [/COPA\s*DEL\s*REY|^COPA\s/i,      'COPA DEL REY'],
  [/SUPERCOPA/i,                       'SUPERCOPA'],
  [/LALIGA|LALIGATV|HYPERMOTION/i,    'LIGA'],
  [/M\+\s*(DEPORTE|DEPORTES)/i,       'DEPORTES'],
  [/EUROSPORT/i,                       'EUROSPORT'],
  [/^(LA [12]|24H|TELECINCO|CUATRO|ANTENA|SEXTA|MEGA|TELEDEPORTE|GOL PLAY|REAL MADRID TV|BAR[CÇ]A TV|BARC|M\+\s*(GOLF|#|VAMOS)|TOROS|MOVISTAR)/i, 'TDT'],
];

function reclassify(name, raw) {
  for (const [re, g] of GROUP_RULES) if (re.test(name)) return g;
  const t = raw.trim().toUpperCase();
  return t || 'OTROS';
}

function parseM3U(text) {
  const lines = text.split(/\r?\n/);
  const result = [];
  let cur = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (/^#EXTINF/i.test(line)) {
      const norm = line
        .replace(/grupo-titulo/gi, 'group-title')
        .replace(/group-title\s*=/gi, 'group-title=')
        .replace(/tvg\s*-\s*id/gi, 'tvg-id')
        .replace(/tvg\s*-\s*logo/gi, 'tvg-logo');
      const name   = (norm.match(/,(.+)$/) || [])[1]?.trim() || 'Canal';
      const logo   = (norm.match(/tvg-logo\s*=\s*"([^"]*)"/i) || [])[1] || '';
      const rawGrp = (norm.match(/group-title\s*=\s*"([^"]*)"/i) || [])[1] || 'OTROS';
      cur = { name, logo, group: reclassify(name, rawGrp), qual: detectQ(name) };
    } else if (cur && line && !line.startsWith('#')) {
      cur.url  = line;
      cur.type = line.startsWith('acestream://') ? 'ace' : 'http';
      cur.cname = canonical(cur.name);
      result.push(cur);
      cur = null;
    }
  }
  return result;
}
"""

# ── manifest.json ──────────────────────────────────────────────────────────────
manifest_json = r"""
{
  "name": "IPTV Player",
  "short_name": "IPTVPlayer",
  "description": "Multi-platform IPTV Player with M3U support",
  "start_url": ".",
  "display": "standalone",
  "background_color": "#0f0f13",
  "theme_color": "#6c63ff",
  "icons": [
    { "src": "https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/1f4fa.png", "sizes": "72x72",   "type": "image/png" },
    { "src": "https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/1f4fa.png", "sizes": "192x192", "type": "image/png" },
    { "src": "https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/1f4fa.png", "sizes": "512x512", "type": "image/png" }
  ]
}
"""

# ── playlists.json ──────────────────────────────────────────────────────────────
playlists_json = r"""
[
  {
    "name": "Mi lista ES 🇪🇸",
    "description": "DAZN · LaLiga · Champions · TDT · Eurosport",
    "url": "https://raw.githubusercontent.com/jesusparrat/effective-funicular/refs/heads/main/effective-funicular.m3u"
  },
  {
    "name": "iptv-org España 🇪🇸",
    "description": "~150 canales públicos nacionales",
    "url": "https://iptv-org.github.io/iptv/countries/es.m3u"
  },
  {
    "name": "iptv-org Deportes 🏆",
    "description": "290+ canales deportivos en abierto",
    "url": "https://iptv-org.github.io/iptv/categories/sports.m3u"
  },
  {
    "name": "iptv-org Europa 🌍",
    "description": "Canales públicos europeos combinados",
    "url": "https://iptv-org.github.io/iptv/countries/de.m3u"
  },
  {
    "name": "iptv-org Global 🌐",
    "description": "20,000+ canales — stress test",
    "url": "https://iptv-org.github.io/iptv/index.m3u"
  }
]
"""

# ── sw.js ──────────────────────────────────────────────────────────────────────
sw_js = r"""
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
"""

# Write files
files = {
    'worker.js':       worker_js,
    'manifest.json':   manifest_json,
    'playlists.json':  playlists_json,
    'sw.js':           sw_js,
}
for name, content in files.items():
    with open(name, 'w', encoding='utf-8') as f:
        f.write(content.strip())
    print(f"✅ {name} ({len(content)} chars)")
