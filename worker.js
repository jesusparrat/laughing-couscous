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