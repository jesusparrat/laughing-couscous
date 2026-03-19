// worker.js v2.2 - Agrupación por canal (Deduplicación)
'use strict';

self.onmessage = function (e) {
  const { text } = e.data;
  self.postMessage({ channels: parseM3U(text) });
};

// Reglas limpias enfocadas en agrupar la familia del canal
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

// Limpia el nombre para agrupar todas las calidades bajo un mismo canal
function canonicalName(name) {
  return name
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
  const channelMap = new Map(); // Mapa para deduplicar
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
      const logo = (norm.match(/tvg-logo\s*=\s*"([^"]*)"/i) || [])[1] || '';
      const rawGrp = (norm.match(/group-title\s*=\s*"([^"]*)"/i) || [])[1] || '';
      
      cur = { rawName, logo, rawGrp, qual: detectQ(rawName) };
    } else if (cur && line && !line.startsWith('#')) {
      const type = line.startsWith('acestream://') ? 'ace' : 'http';
      const cname = canonicalName(cur.rawName);

      // Si el canal no existe, lo creamos
      if (!channelMap.has(cname)) {
        channelMap.set(cname, {
          name: cname, // Ej: "DAZN F1" limpio
          logo: cur.logo,
          group: classifyGroup(cname, cur.rawGrp),
          streams: [] // Array de enlaces para este canal
        });
      }

      // Si este enlace tiene logo y el canal aún no, se lo ponemos
      if (cur.logo && !channelMap.get(cname).logo) {
        channelMap.get(cname).logo = cur.logo;
      }

      // Metemos el enlace en la lista de streams del canal
      channelMap.get(cname).streams.push({
        rawName: cur.rawName,
        url: line,
        type: type,
        qual: cur.qual
      });

      cur = null;
    }
  }

  // Convertimos el Mapa a Array y procesamos los enlaces internos
  const result = [];
  const qScore = { '4K': 4, 'FHD': 3, 'HD': 2, 'SD': 1 };

  for (const ch of channelMap.values()) {
    // Ordenamos los streams para que el mejor HTTP esté el primero
    ch.streams.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'http' ? -1 : 1;
      return qScore[b.qual] - qScore[a.qual];
    });

    const qSet = new Set();
    ch.hasAce = false;
    ch.streams.forEach(s => {
      qSet.add(s.qual);
      if (s.type === 'ace') ch.hasAce = true;
    });
    
    ch.badges = Array.from(qSet); // Para renderizar todas las etiquetas en la UI
    ch.defaultStream = ch.streams[0]; // El que se reproduce con un click rápido
    
    result.push(ch);
  }

  return result;
}
