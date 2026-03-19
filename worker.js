// worker.js v3.1
'use strict';

self.onmessage = function (e) {
  const { text } = e.data;
  self.postMessage({ channels: parseM3U(text) });
};

const GROUP_RULES = [
  [/DAZN\s*F1/i,                 'DAZN F1'],
  [/DAZN\s*(LALIGA|LA LIGA)/i,   'DAZN LaLiga'],
  [/DAZN/i,                      'DAZN Otros'],
  [/HYPERMOTION|LALIGA\s*SMART/i,'LaLiga Hypermotion'],
  [/LIGA\s*DE\s*CAMPEONES|UCL|UEFA/i, 'Liga de Campeones'],
  [/EUROPA\s*LEAGUE|UEL/i,       'Europa League'],
  [/M\+\s*(DEPORTE|DEPORTES)/i,  'Movistar Deportes'],
  [/EUROSPORT/i,                 'Eurosport'],
  [/GOL\s*PLAY/i,                'Gol Play'],
  [/REAL\s*MADRID\s*TV/i,        'Real Madrid TV'],
  [/BAR[CÇ]A\s*TV/i,             'Barça TV'],
  [/^(LA\s*[12]|24H|TELECINCO|CUATRO|ANTENA 3|LA SEXTA|MEGA|TELEDEPORTE)/i, 'TDT'],
];

// Limpia TODAS las etiquetas de calidad del nombre para agrupar bien
function canonicalName(name) {
  return name
    // Limpia etiquetas tipo "FHD", "1080p", "4K", etc. al final del nombre
    .replace(/\s*(4K|UHD|FHD|1080p?|HD|720p?|SD|480p?)\s*$/i, '')
    // Segunda pasada por si había "Canal FHD HD"
    .replace(/\s*(4K|UHD|FHD|1080p?|HD|720p?|SD|480p?)\s*$/i, '')
    .replace(/\s*\(Opci[oó]n\s*\d+\)\s*$/i, '')
    .replace(/\s*Multi\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function classifyGroup(baseName, rawGrp) {
  for (const [re, g] of GROUP_RULES) {
    if (re.test(baseName)) return g;
  }
  if (rawGrp && rawGrp.trim()) return rawGrp.trim().toUpperCase();
  return 'OTROS';
}

function detectQ(n) {
  n = n.toUpperCase();
  if (n.includes('4K')  || n.includes('UHD'))  return '4K';
  if (n.includes('FHD') || n.includes('1080')) return 'FHD';
  if (n.includes(' HD') || n.includes('720'))  return 'HD';
  return 'SD';
}

function parseM3U(text) {
  const lines = text.split(/\r?\n/);
  const channelMap = new Map();
  let cur = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (/^#EXTINF/i.test(line)) {
      const norm = line
        .replace(/grupo-titulo/gi, 'group-title')
        .replace(/group-title\s*=/gi, 'group-title=')
        .replace(/tvg\s*-\s*logo/gi, 'tvg-logo');
      
      const rawName = (norm.match(/,(.+)$/) || [])[1]?.trim() || 'Canal';
      const logo = (norm.match(/tvg-logo\s*=\s*"([^"]*)"/i) || [])[1] || '';
      const rawGrp = (norm.match(/group-title\s*=\s*"([^"]*)"/i) || [])[1] || '';
      
      cur = { rawName, logo, rawGrp, qual: detectQ(rawName) };
    } else if (cur && line && !line.startsWith('#')) {
      const type = line.startsWith('acestream://') ? 'ace' : 'http';
      const cname = canonicalName(cur.rawName);

      if (!channelMap.has(cname)) {
        channelMap.set(cname, {
          name: cname,
          logo: cur.logo,
          group: classifyGroup(cname, cur.rawGrp),
          streams: []
        });
      }

      if (cur.logo && !channelMap.get(cname).logo) channelMap.get(cname).logo = cur.logo;

      channelMap.get(cname).streams.push({ rawName: cur.rawName, url: line, type, qual: cur.qual });
      cur = null;
    }
  }

  const result = [];
  const qScore = { '4K': 4, 'FHD': 3, 'HD': 2, 'SD': 1 };

  for (const ch of channelMap.values()) {
    ch.streams.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'http' ? -1 : 1;
      return qScore[b.qual] - qScore[a.qual];
    });

    const qSet = new Set();
    ch.hasAce = false;
    ch.streams.forEach(s => { qSet.add(s.qual); if (s.type === 'ace') ch.hasAce = true; });
    ch.badges = Array.from(qSet);
    result.push(ch);
  }

  // Ordenar alfabéticamente
  result.sort((a, b) => a.name.localeCompare(b.name));

  return result;
}
