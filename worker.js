'use strict';

self.onmessage = function (e) {
  const { text } = e.data;
  self.postMessage({ channels: parseM3U(text) });
};

const GROUP_RULES = [
  [/DAZN\s*F1/i,                                    'DAZN F1'],
  [/DAZN\s*(LALIGA|LA\s*LIGA)/i,                    'DAZN LaLiga'],
  [/DAZN/i,                                         'DAZN Otros'],
  [/LIGA\s*DE\s*CAMPEONES|UCL|UEFA\s*CL/i,          'Liga de Campeones'],
  [/EUROPA\s*LEAGUE|UEL|UEFA\s*EL/i,                'Europa League'],
  [/SUPERCOPA/i,                                    'Supercopa'],
  [/COPA\s*DEL\s*REY/i,                             'Copa del Rey'],
  [/HYPERMOTION|LALIGA\s*SMART/i,                   'LaLiga Hypermotion'],
  [/LALIGA|LALIGATV/i,                              'LaLiga'],
  [/M\+\s*(DEPORTE|DEPORTES)/i,                     'Movistar Deportes'],
  [/M\+\s*(LIGA\s*DE\s*CAMPEONES|LIGA\s*CAMPEONES)/i,'Liga de Campeones'],
  [/M\+\s*LALIGA/i,                                 'LaLiga'],
  [/MOVISTAR/i,                                     'Movistar Deportes'],
  [/EUROSPORT/i,                                    'Eurosport'],
  [/GOL\s*PLAY/i,                                   'Gol Play'],
  [/REAL\s*MADRID\s*TV/i,                           'Real Madrid TV'],
  [/BAR[CÇ]A\s*TV|FC\s*BARCELONA\s*TV/i,           'Barça TV'],
  [/^(LA\s*[12]|24H|TELECINCO|CUATRO|ANTENA\s*3|LA\s*SEXTA|MEGA|TELEDEPORTE|TVE)/i, 'TDT'],
];

// Aggressive canonical: strip quality, option, numbers trailing, multi, variants
function canonicalName(name) {
  return name
    // strip quality suffixes
    .replace(/\s*\b(4K|UHD|FHD|1080[pi]?|HD|720[pi]?|SD|480[pi]?)\b/gi, '')
    // strip trailing numbers like "Canal 2", "Canal 3" ONLY when preceded by space
    // but NOT numbers that are part of the channel name like "Antena 3", "La 2", "Eurosport 2"
    // Rule: strip trailing " N" ONLY if the base already has another number in it OR it's a numbered variant
    // We use a safe approach: strip " \d+" at end only when the stem has >3 chars before the number
    .replace(/\s*\(\s*Opci[oó]n\s*\d+\s*\)/gi, '')
    .replace(/\s*\bMulti\b/gi, '')
    .replace(/\s*\bM\+\b\s*$/i, '')
    // strip trailing standalone number if it's clearly a variant (e.g. "M+ LaLigaTV 2" → "M+ LaLigaTV")
    // only when the number is preceded by a word that ends in a letter (not already a numbered channel)
    .replace(/(\b[A-Za-zÀ-ú]+\b)\s+\d+\s*$/g, (match, stem) => {
      // Preserve known numbered channels
      const KEEP = /^(la|eurosport|antena|canal|24|dazn\s*\d|mega|cuatro|la\s*sexta)$/i;
      if (KEEP.test(stem)) return match;
      return stem;
    })
    .replace(/\s+/g, ' ')
    .trim();
}

function classifyGroup(baseName, rawGrp) {
  for (const [re, g] of GROUP_RULES) if (re.test(baseName)) return g;
  if (rawGrp && rawGrp.trim()) return rawGrp.trim().toUpperCase();
  return 'OTROS';
}

function detectQ(n) {
  const u = n.toUpperCase();
  if (u.includes('4K') || u.includes('UHD'))       return '4K';
  if (u.includes('FHD') || /1080[PI]?/.test(u))    return 'FHD';
  if (/\bHD\b/.test(u) || u.includes('720'))       return 'HD';
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
      const logo    = (norm.match(/tvg-logo\s*=\s*"([^"]*)"/i) || [])[1] || '';
      const rawGrp  = (norm.match(/group-title\s*=\s*"([^"]*)"/i) || [])[1] || '';

      cur = { rawName, logo, rawGrp, qual: detectQ(rawName) };

    } else if (cur && line && !line.startsWith('#')) {
      if (/^acestream:\/\/(undefined|null)?\s*$/.test(line)) { cur = null; continue; }

      const type   = line.startsWith('acestream://') ? 'ace' : 'http';
      const cname  = canonicalName(cur.rawName);
      const group  = classifyGroup(cname, cur.rawGrp);
      // Key: group + canonical (lowercased, spaces collapsed)
      const mapKey = group + '||' + cname.toLowerCase().replace(/\s+/g, ' ');

      if (!channelMap.has(mapKey)) {
        channelMap.set(mapKey, { name: cname, logo: cur.logo, group, streams: [] });
      }
      const ch = channelMap.get(mapKey);
      if (cur.logo && !ch.logo) ch.logo = cur.logo;

      ch.streams.push({ rawName: cur.rawName, url: line, type, qual: cur.qual });
      cur = null;
    }
  }

  const qScore = { '4K': 4, 'FHD': 3, 'HD': 2, 'SD': 1 };
  const result = [];

  for (const ch of channelMap.values()) {
    ch.streams.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'http' ? -1 : 1;
      return (qScore[b.qual] || 0) - (qScore[a.qual] || 0);
    });
    const qSet = new Set(ch.streams.map(s => s.qual));
    ch.hasAce  = ch.streams.some(s => s.type === 'ace');
    ch.badges  = ['4K','FHD','HD','SD'].filter(q => qSet.has(q));
    result.push(ch);
  }

  result.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
  return result;
}
