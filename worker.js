'use strict';

self.onmessage = function (e) {
  const { text } = e.data;
  self.postMessage({ channels: parseM3U(text) });
};

// ── Group classification rules (ordered by specificity) ───────────────────────
const GROUP_RULES = [
  [/DAZN\s*F1/i,                        'DAZN F1'],
  [/DAZN\s*(LALIGA|LA\s*LIGA)\s*\d*/i,  'DAZN LaLiga'],
  [/DAZN/i,                             'DAZN Otros'],
  [/LIGA\s*DE\s*CAMPEONES|UCL|UEFA/i,   'Liga de Campeones'],
  [/EUROPA\s*LEAGUE|UEL/i,              'Europa League'],
  [/SUPERCOPA/i,                        'Supercopa'],
  [/COPA\s*DEL\s*REY/i,                 'Copa del Rey'],
  [/HYPERMOTION|LALIGA\s*SMART/i,       'LaLiga Hypermotion'],
  [/LALIGA|LALIGATV/i,                  'LaLiga'],
  [/M\+\s*(DEPORTE|DEPORTES)/i,         'Movistar Deportes'],
  [/MOVISTAR\+?/i,                      'Movistar Deportes'],
  [/EUROSPORT/i,                        'Eurosport'],
  [/GOL\s*PLAY/i,                       'Gol Play'],
  [/REAL\s*MADRID\s*TV/i,               'Real Madrid TV'],
  [/BAR[CÇ]A\s*TV|FC\s*BARCELONA\s*TV/i,'Barça TV'],
  [/^(LA\s*[12]|24H|TELECINCO|CUATRO|ANTENA\s*3|LA\s*SEXTA|MEGA|TELEDEPORTE|TVE|LA\s*1|LA\s*2)/i, 'TDT'],
];

// ── Strip quality/option suffixes to get canonical channel name ───────────────
function canonicalName(name) {
  return name
    .replace(/\s*\b(4K|UHD|FHD|1080[pi]?|HD|720[pi]?|SD|480[pi]?)\b/gi, '')
    .replace(/\s*\(\s*Opci[oó]n\s*\d+\s*\)/gi, '')
    .replace(/\s*\bMulti\b/gi, '')
    .replace(/\s*M\+\s*$/i, '')
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
  const u = n.toUpperCase();
  if (u.includes('4K') || u.includes('UHD'))        return '4K';
  if (u.includes('FHD') || /1080[PI]?/.test(u))     return 'FHD';
  if (u.includes(' HD') || u.includes('HD ') || u.includes('720')) return 'HD';
  return 'SD';
}

// ── Parse M3U and group streams by canonical channel name ─────────────────────
function parseM3U(text) {
  const lines = text.split(/\r?\n/);
  // Key: group + '||' + canonical_name (same channel across groups stays separate)
  const channelMap = new Map();
  let cur = null;

  for (const raw of lines) {
    const line = raw.trim();

    if (/^#EXTINF/i.test(line)) {
      const norm = line
        .replace(/grupo-titulo/gi, 'group-title')
        .replace(/group-title\s*=/gi, 'group-title=')
        .replace(/tvg\s*-\s*logo/gi, 'tvg-logo')
        .replace(/tvg\s*-\s*id/gi, 'tvg-id');

      const rawName = (norm.match(/,(.+)$/) || [])[1]?.trim() || 'Canal';
      const logo    = (norm.match(/tvg-logo\s*=\s*"([^"]*)"/i) || [])[1] || '';
      const rawGrp  = (norm.match(/group-title\s*=\s*"([^"]*)"/i) || [])[1] || '';

      cur = { rawName, logo, rawGrp, qual: detectQ(rawName) };

    } else if (cur && line && !line.startsWith('#')) {
      // Skip broken/empty acestream URLs
      if (line === 'acestream://' || line === 'acestream://undefined' || line === 'acestream://null') {
        cur = null; continue;
      }

      const type  = line.startsWith('acestream://') ? 'ace' : 'http';
      const cname = canonicalName(cur.rawName);
      const group = classifyGroup(cname, cur.rawGrp);
      const mapKey = group + '||' + cname.toLowerCase();

      if (!channelMap.has(mapKey)) {
        channelMap.set(mapKey, {
          name:    cname,
          logo:    cur.logo,
          group:   group,
          streams: []
        });
      }

      const ch = channelMap.get(mapKey);
      // Keep best logo found (prefer non-empty)
      if (cur.logo && !ch.logo) ch.logo = cur.logo;

      ch.streams.push({ rawName: cur.rawName, url: line, type, qual: cur.qual });
      cur = null;
    }
  }

  // Post-process: sort streams, compute badges
  const qScore = { '4K': 4, 'FHD': 3, 'HD': 2, 'SD': 1 };
  const result = [];

  for (const ch of channelMap.values()) {
    // Sort: HTTP before ACE, then best quality first
    ch.streams.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'http' ? -1 : 1;
      return (qScore[b.qual] || 0) - (qScore[a.qual] || 0);
    });

    const qSet = new Set();
    ch.hasAce = false;
    ch.streams.forEach(s => {
      qSet.add(s.qual);
      if (s.type === 'ace') ch.hasAce = true;
    });
    // Badges sorted best-first
    ch.badges = ['4K','FHD','HD','SD'].filter(q => qSet.has(q));

    result.push(ch);
  }

  // Sort alphabetically within each group (stable)
  result.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
  return result;
}
