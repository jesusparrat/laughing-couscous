'use strict';

const UA = navigator.userAgent;
const IS_ANDROID = /android/i.test(UA);
const IS_IOS     = /iphone|ipad|ipod/i.test(UA);
const IS_MOBILE  = IS_ANDROID || IS_IOS;

// ── Logo map: {url, lightBg?} — lightBg=true for black/dark logos ─────────────
const LOGO_MAP = {
  'liga de campeones':      { url: 'https://raw.githubusercontent.com/davidmuma/picons_dobleM/master/icon/M%2B%20Liga%20De%20Campeones.png' },
  'm+ liga de campeones':   { url: 'https://raw.githubusercontent.com/davidmuma/picons_dobleM/master/icon/M%2B%20Liga%20De%20Campeones.png' },
  'laliga tv':              { url: 'https://raw.githubusercontent.com/davidmuma/picons_dobleM/master/icon/M%2B%20LaLiga%20TV.png' },
  'm+ laligatv':            { url: 'https://raw.githubusercontent.com/davidmuma/picons_dobleM/master/icon/M%2B%20LaLiga%20TV.png' },
  'm+ laliga':              { url: 'https://raw.githubusercontent.com/davidmuma/picons_dobleM/master/icon/M%2B%20LaLiga%20TV.png' },
  'laliga hypermotion':     { url: 'https://commons.wikimedia.org/wiki/Special:FilePath/LaLiga_Hypermotion_2023_Vertical_Logo.svg', lightBg: true },
  'dazn laliga':            { url: 'https://raw.githubusercontent.com/davidmuma/picons_dobleM/master/icon/DAZN%20LaLiga.png' },
  'dazn laliga 2':          { url: 'https://raw.githubusercontent.com/davidmuma/picons_dobleM/master/icon/DAZN%20LaLiga%202.png' },
  'dazn laliga 3':          { url: 'https://raw.githubusercontent.com/davidmuma/picons_dobleM/master/icon/DAZN%20LaLiga%203.png' },
  'dazn laliga 4':          { url: 'https://raw.githubusercontent.com/davidmuma/picons_dobleM/master/icon/DAZN%20LaLiga%204.png' },
  'dazn laliga 5':          { url: 'https://raw.githubusercontent.com/davidmuma/picons_dobleM/master/icon/DAZN%20LaLiga%205.png' },
  'dazn f1':                { url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Formula_1_logo.svg', lightBg: true },
  'dazn 1':                 { url: 'https://raw.githubusercontent.com/davidmuma/picons_dobleM/master/icon/DAZN%201.png' },
  'dazn 2':                 { url: 'https://raw.githubusercontent.com/davidmuma/picons_dobleM/master/icon/DAZN%202.png' },
  'dazn 3':                 { url: 'https://raw.githubusercontent.com/davidmuma/picons_dobleM/master/icon/DAZN%203.png' },
  'dazn 4':                 { url: 'https://raw.githubusercontent.com/davidmuma/picons_dobleM/master/icon/DAZN%204.png' },
  'm+ deportes':            { url: 'https://raw.githubusercontent.com/davidmuma/picons_dobleM/master/icon/M%2B%20Deportes.png' },
  'm+ deportes 2':          { url: 'https://raw.githubusercontent.com/davidmuma/picons_dobleM/master/icon/M%2B%20Deportes%202.png' },
  'm+ deportes 3':          { url: 'https://raw.githubusercontent.com/davidmuma/picons_dobleM/master/icon/M%2B%20Deportes%203.png' },
  'm+ deportes 4':          { url: 'https://raw.githubusercontent.com/davidmuma/picons_dobleM/master/icon/M%2B%20Deportes%204.png' },
  'm+ deportes 5':          { url: 'https://raw.githubusercontent.com/davidmuma/picons_dobleM/master/icon/M%2B%20Deportes%205.png' },
  'm+ deportes 6':          { url: 'https://raw.githubusercontent.com/davidmuma/picons_dobleM/master/icon/M%2B%20Deportes%206.png' },
  'm+ deportes 7':          { url: 'https://raw.githubusercontent.com/davidmuma/picons_dobleM/master/icon/M%2B%20Deportes%207.png' },
  'm+ #vamos':              { url: 'https://raw.githubusercontent.com/davidmuma/picons_dobleM/master/icon/M%2B%20%23Vamos.png' },
  'm+ #0':                  { url: 'https://raw.githubusercontent.com/davidmuma/picons_dobleM/master/icon/M%2B%20%230.png' },
  'm+ golf':                { url: 'https://raw.githubusercontent.com/davidmuma/picons_dobleM/master/icon/M%2B%20Golf.png' },
  'movistar+':              { url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Movistar_Plus%2B_2022_logo.svg' },
  'eurosport 1':            { url: 'https://raw.githubusercontent.com/davidmuma/picons_dobleM/master/icon/Eurosport%201.png', lightBg: true },
  'eurosport 2':            { url: 'https://raw.githubusercontent.com/davidmuma/picons_dobleM/master/icon/Eurosport%202.png', lightBg: true },
  'eurosport 3':            { url: 'https://raw.githubusercontent.com/davidmuma/picons_dobleM/master/icon/Eurosport%203.png', lightBg: true },
  'eurosport 4':            { url: 'https://raw.githubusercontent.com/davidmuma/picons_dobleM/master/icon/Eurosport%204.png', lightBg: true },
  'la 1':                   { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/La_1_HD_TVE.png/250px-La_1_HD_TVE.png' },
  'la 2':                   { url: 'https://raw.githubusercontent.com/davidmuma/picons_dobleM/master/icon/La%202.png' },
  '24h':                    { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Logo_Canal_24_horas.svg/250px-Logo_Canal_24_horas.svg.png', lightBg: true },
  'telecinco':              { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Telecinco.svg/250px-Telecinco.svg.png', lightBg: true },
  'cuatro':                 { url: 'https://raw.githubusercontent.com/davidmuma/picons_dobleM/master/icon/Cuatro.png' },
  'antena 3':               { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Logo_Antena_3_2025_%28Naranja%29.svg/250px-Logo_Antena_3_2025_%28Naranja%29.svg.png' },
  'la sexta':               { url: 'https://raw.githubusercontent.com/davidmuma/picons_dobleM/master/icon/La%20Sexta.png' },
  'mega':                   { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/MEGA.svg/250px-MEGA.svg.png', lightBg: true },
  'teledeporte':            { url: 'https://raw.githubusercontent.com/davidmuma/picons_dobleM/master/icon/Teledeporte.png' },
  'gol play':               { url: 'https://raw.githubusercontent.com/davidmuma/picons_dobleM/master/icon/Gol%20Play.png' },
  'real madrid tv':         { url: 'https://raw.githubusercontent.com/davidmuma/picons_dobleM/master/icon/Real%20Madrid%20TV.png' },
  'barça tv':               { url: 'https://raw.githubusercontent.com/davidmuma/picons_dobleM/master/icon/Barca%20TV.png' },
  'copa del rey':           { url: 'https://raw.githubusercontent.com/davidmuma/picons_dobleM/master/icon/Copa%20del%20Rey.png' },
  'supercopa':              { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Supercopa_de_Espana_logo.svg/250px-Supercopa_de_Espana_logo.svg.png', lightBg: true },
  'paramount plus':         { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Paramount_Plus_logo.svg/250px-Paramount_Plus_logo.svg.png' },
  'paramount+':             { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Paramount_Plus_logo.svg/250px-Paramount_Plus_logo.svg.png' },
};

function resolveLogo(name, fallbackUrl) {
  const key = name.toLowerCase().trim();
  if (LOGO_MAP[key]) return LOGO_MAP[key];
  for (const [k, v] of Object.entries(LOGO_MAP)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return fallbackUrl ? { url: fallbackUrl } : null;
}

// ── State ─────────────────────────────────────────────────────────────────────
const state = {
  allChannels: [], filteredChs: [],
  activeGroup: 'TODOS',
  pageOffset: 0, pageSize: 40,
  currentChId: null, currentStreamIndex: 0,
  aceAvailable: false, hlsInstance: null
};

let m3uWorker = null;

const dom = {
  searchInput:    document.getElementById('search-input'),
  groupPills:     document.getElementById('group-pills'),
  channelList:    document.getElementById('channel-list'),
  status:         document.getElementById('sidebar-status'),
  scrollSentinel: document.getElementById('scroll-sentinel'),
  playerOverlay:  document.getElementById('player-overlay'),
  playerSpinner:  document.getElementById('player-spinner'),
  playerError:    document.getElementById('player-error'),
  errText:        document.getElementById('player-error-text')
};

const observer = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting && state.pageOffset < state.filteredChs.length) renderNextBatch();
}, { root: document.getElementById('channel-scroll-wrap'), rootMargin: '200px' });

// ── Init ──────────────────────────────────────────────────────────────────────
function init() {
  if (!IS_MOBILE) detectAceEngine();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});

  loadPlaylistOptions();

  document.getElementById('btn-load-url').addEventListener('click', loadFromInput);
  document.getElementById('url-input').addEventListener('keydown', e => { if (e.key === 'Enter') loadFromInput(); });
  document.getElementById('btn-fullscreen').addEventListener('click', toggleFullscreen);
  document.getElementById('btn-pip').addEventListener('click', togglePip);
  document.getElementById('btn-retry').addEventListener('click', retryPlay);

  document.getElementById('btn-open-playlists').addEventListener('click', openPlaylists);
  document.getElementById('btn-close-playlists').addEventListener('click', closePlaylists);
  document.getElementById('playlist-overlay').addEventListener('click', e => {
    if (e.target.id === 'playlist-overlay') closePlaylists();
  });

  const plUrlInput = document.getElementById('playlist-url-input');
  const plLoadBtn  = document.getElementById('btn-load-playlist-url');
  if (plUrlInput && plLoadBtn) {
    plLoadBtn.addEventListener('click', () => {
      const u = plUrlInput.value.trim(); if (!u) return;
      document.getElementById('url-input').value = u;
      closePlaylists(); loadFromInput();
    });
    plUrlInput.addEventListener('keydown', e => { if (e.key === 'Enter') plLoadBtn.click(); });
  }

  document.getElementById('btn-close-modal').addEventListener('click', () => closeModal(false));
  document.getElementById('modal-backdrop').addEventListener('click', e => {
    if (e.target.id === 'modal-backdrop') closeModal(false);
  });
  window.addEventListener('popstate', () => {
    if (document.getElementById('modal-backdrop').classList.contains('open')) closeModal(true);
  });

  let searchTimer;
  dom.searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer); searchTimer = setTimeout(applyFilter, 300);
  });

  observer.observe(dom.scrollSentinel);
}

// ── Playlist picker ───────────────────────────────────────────────────────────
async function loadPlaylistOptions() {
  try {
    const res = await fetch('./playlists.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const list = await res.json();
    const grid = document.getElementById('playlist-grid');
    list.forEach(pl => {
      const card = document.createElement('button');
      card.className = 'pl-card';
      card.innerHTML = `<span class="pl-card__name">${pl.name}</span><span class="pl-card__desc">${pl.description || ''}</span>`;
      card.addEventListener('click', () => {
        document.getElementById('url-input').value = pl.url;
        closePlaylists(); loadFromInput();
      });
      grid.appendChild(card);
    });
  } catch (e) {
    console.error('[playlists.json]', e);
    toast(`No se pudieron cargar las listas: ${e.message}`, 'error');
  }
}

function openPlaylists() {
  document.getElementById('playlist-overlay').classList.add('open');
  const first = document.querySelector('.pl-card');
  if (first) first.focus();
}
function closePlaylists() { document.getElementById('playlist-overlay').classList.remove('open'); }

// ── Load M3U ──────────────────────────────────────────────────────────────────
function loadFromInput() {
  const val = document.getElementById('url-input').value.trim();
  if (!val) return;

  dom.status.textContent = 'Procesando…';
  dom.channelList.innerHTML = '';
  state.allChannels = [];
  if (m3uWorker) { m3uWorker.terminate(); m3uWorker = null; }
  setPlayerIdle();

  fetch(val)
    .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); })
    .then(text => {
      m3uWorker = new Worker('./worker.js');
      m3uWorker.postMessage({ text });
      m3uWorker.onmessage = e => {
        state.allChannels = e.data.channels.map((ch, i) => {
          const resolved = resolveLogo(ch.name, ch.logo);
          ch.logo    = resolved ? resolved.url : '';
          ch.lightBg = resolved ? !!resolved.lightBg : false;
          return { ...ch, _id: i };
        });
        m3uWorker.terminate(); m3uWorker = null;
        toast(`✅ ${state.allChannels.length} canales cargados`, 'ok');
        buildGroups(); setGroup('TODOS');
      };
      m3uWorker.onerror = err => {
        toast('Error al procesar el M3U', 'error');
        console.error('[worker]', err);
        dom.status.textContent = 'Error al procesar';
      };
    })
    .catch(e => {
      const isCors = e.message === 'Failed to fetch';
      toast(isCors ? '⚠️ Error CORS — usa URL directa/raw' : `❌ ${e.message}`, 'error');
      dom.status.textContent = 'Error al cargar';
    });
}

// ── Groups ────────────────────────────────────────────────────────────────────
const GROUP_ORDER = [
  'Liga de Campeones','DAZN LaLiga','DAZN F1','DAZN Otros',
  'LaLiga','LaLiga Hypermotion','Supercopa','Copa del Rey',
  'Movistar Deportes','Eurosport','Gol Play','TDT',
  'Real Madrid TV','Barça TV','Europa League'
];

function buildGroups() {
  const counts = {};
  state.allChannels.forEach(ch => { counts[ch.group] = (counts[ch.group] || 0) + 1; });
  const ordered = GROUP_ORDER.filter(g => counts[g]);
  const extras  = Object.keys(counts).filter(g => !GROUP_ORDER.includes(g)).sort();
  dom.groupPills.innerHTML = '';
  dom.groupPills.appendChild(makePill('TODOS', state.allChannels.length));
  [...ordered, ...extras].forEach(g => dom.groupPills.appendChild(makePill(g, counts[g])));
}

function makePill(label, count) {
  const p = document.createElement('button');
  p.className = 'pill' + (label === state.activeGroup ? ' active' : '');
  p.setAttribute('role', 'tab');
  p.setAttribute('aria-selected', label === state.activeGroup ? 'true' : 'false');
  p.textContent = count ? `${label} (${count})` : label;
  p.onclick = () => setGroup(label);
  return p;
}

function setGroup(group) {
  state.activeGroup = group;
  document.querySelectorAll('.pill').forEach(p => {
    const active = p.textContent === group || p.textContent.startsWith(group + ' (');
    p.classList.toggle('active', active);
    p.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  applyFilter();
}

function applyFilter() {
  const q = dom.searchInput.value.trim().toLowerCase();
  state.filteredChs = state.allChannels.filter(ch => {
    const matchGroup  = state.activeGroup === 'TODOS' || ch.group === state.activeGroup;
    const matchSearch = !q || ch.name.toLowerCase().includes(q);
    return matchGroup && matchSearch;
  });
  dom.channelList.innerHTML = '';
  state.pageOffset = 0;
  dom.status.textContent = `${state.filteredChs.length} canal${state.filteredChs.length !== 1 ? 'es' : ''}`;
  renderNextBatch();
}

function renderNextBatch() {
  const slice = state.filteredChs.slice(state.pageOffset, state.pageOffset + state.pageSize);
  slice.forEach(ch => dom.channelList.appendChild(makeCard(ch)));
  state.pageOffset += state.pageSize;
  dom.scrollSentinel.style.display = (state.pageOffset >= state.filteredChs.length) ? 'none' : 'block';
}

// ── Channel card ──────────────────────────────────────────────────────────────
function makeCard(ch) {
  const div = document.createElement('div');
  div.className = 'ch-card';
  div.dataset.chId = ch._id;
  div.setAttribute('role', 'listitem');
  if (ch._id === state.currentChId) div.classList.add('active');
  div.addEventListener('click', () => openModal(ch._id));

  const lightClass = ch.lightBg ? ' ch-logo-wrap--light' : '';
  const logoHtml = ch.logo
    ? `<div class="ch-logo-wrap${lightClass}">
         <img class="ch-logo" src="${ch.logo}" alt="" loading="lazy" decoding="async"
              onerror="this.parentElement.innerHTML='<span class=ch-logo-fb>📺</span>'">
       </div>`
    : `<div class="ch-logo-wrap"><span class="ch-logo-fb">📺</span></div>`;

  const badgeOrder = ['4K','FHD','HD','SD'];
  const sortedBadges = (ch.badges||[]).slice().sort((a,b) => badgeOrder.indexOf(a)-badgeOrder.indexOf(b));
  let badgesHtml = sortedBadges.map(q => `<span class="badge badge-${q.toLowerCase()}">${q}</span>`).join('');
  if (ch.hasAce) badgesHtml += `<span class="badge badge-ace">ACE</span>`;
  const streamCount = ch.streams && ch.streams.length > 1
    ? `<span class="ch-streams">${ch.streams.length} opc.</span>` : '';

  div.innerHTML = logoHtml + `
    <div class="ch-info">
      <div class="ch-name">${ch.name}</div>
      <div class="ch-meta">${badgesHtml}${streamCount}</div>
    </div>`;
  return div;
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function openModal(chId) {
  const ch = state.allChannels[chId];
  if (!ch) return;

  const mLogo   = document.getElementById('modal-logo');
  const mLogoFb = document.getElementById('modal-logo-fb');
  const mWrap   = document.getElementById('modal-logo-wrap');

  if (ch.logo) {
    mLogo.src = ch.logo; mLogo.style.display = ''; mLogoFb.style.display = 'none';
    mWrap.style.background = ch.lightBg ? '#fff' : '';
    mWrap.style.padding    = ch.lightBg ? '5px' : '';
    mLogo.onerror = () => { mLogo.style.display = 'none'; mLogoFb.style.display = 'flex'; };
  } else {
    mLogo.style.display = 'none'; mLogoFb.style.display = 'flex';
  }

  document.getElementById('modal-title').textContent = ch.name;
  document.getElementById('modal-meta').textContent  = `${ch.group} · ${ch.streams.length} enlace${ch.streams.length !== 1 ? 's' : ''}`;

  const body = document.getElementById('modal-body');
  body.innerHTML = '';

  ch.streams.forEach((s, index) => {
    const isAce  = s.type === 'ace';
    const aceHash = isAce ? s.url.replace(/^acestream:\/\//i,'').replace(/\?.*$/,'') : '';

    const row = document.createElement('div');
    row.className = 'stream-row';

    const qualBadge = `<span class="badge badge-${(s.qual||'sd').toLowerCase()}">${s.qual}</span>`;
    const typeBadge = isAce
      ? `<span class="badge badge-ace">ACE</span>`
      : `<span class="badge badge-http">HTTP</span>`;

    let btns = `<button class="btn btn-primary btn-sm" data-action="play" data-idx="${index}">▶ Ver</button>`;
    btns += `<button class="btn btn-orange btn-sm" data-action="vlc" data-idx="${index}">🟠 VLC</button>`;
    if (isAce) btns += `<button class="btn btn-purple btn-sm" data-action="ace" data-idx="${index}">🟣 Ace</button>`;
    else       btns += `<button class="btn btn-surface btn-sm" data-action="web" data-idx="${index}">🌐 Web</button>`;
    btns += `<button class="btn btn-surface btn-sm" data-action="copy" data-idx="${index}" title="Copiar URL">📋</button>`;

    row.innerHTML = `
      <div class="stream-info">
        <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:4px">${qualBadge}${typeBadge}</div>
        <small>${s.rawName || ch.name}</small>
      </div>
      <div class="stream-actions">${btns}</div>`;

    row.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const idx    = parseInt(btn.dataset.idx, 10);
        const stream = ch.streams[idx];
        const sIsAce = stream.type === 'ace';
        const sHash  = sIsAce ? stream.url.replace(/^acestream:\/\//i,'').replace(/\?.*$/,'') : '';
        const sHttp  = sIsAce ? `http://127.0.0.1:6878/ace/getstream?id=${encodeURIComponent(sHash)}` : stream.url;
        const action = btn.dataset.action;
        if (action === 'play')  { closeModal(false); playStream(chId, idx); }
        if (action === 'vlc')   launchVlcUrl(sHttp, ch.name);
        if (action === 'ace')   launchAce(stream.url);
        if (action === 'web')   window.open(sHttp, '_blank');
        if (action === 'copy')  copyToClipboard(stream.url);
      });
    });
    body.appendChild(row);
  });

  const hint = document.getElementById('modal-hint');
  if (hint) {
    const hasAce    = ch.streams.some(s => s.type === 'ace');
    const mixedRisk = location.protocol === 'https:' && ch.streams.some(s => /^http:/.test(s.url));
    hint.innerHTML = '';
    if (hasAce)    hint.innerHTML += `<p class="modal-hint-text">🟣 <b>Acestream</b>: requiere AceStream Engine en <code>127.0.0.1:6878</code>.</p>`;
    if (mixedRisk) hint.innerHTML += `<p class="modal-hint-text">⚠️ Streams HTTP pueden bloquearse desde HTTPS. Usa 🟠 VLC o 📋 Copiar.</p>`;
  }

  document.getElementById('modal-backdrop').classList.add('open');
  history.pushState({ isModalOpen: true }, '');
}

function closeModal(fromPopState = false) {
  document.getElementById('modal-backdrop').classList.remove('open');
  if (!fromPopState && history.state?.isModalOpen) history.back();
}

// ── Playback ──────────────────────────────────────────────────────────────────
function playStream(chId, streamIndex) {
  const ch = state.allChannels[chId];
  if (!ch || !ch.streams[streamIndex]) return;
  state.currentChId = chId; state.currentStreamIndex = streamIndex;
  const stream = ch.streams[streamIndex];

  dom.playerOverlay.classList.add('hidden');
  dom.playerError.classList.add('hidden');
  updateNowPlaying(ch, stream);

  if (stream.type === 'ace') {
    if (state.aceAvailable) {
      const hash = stream.url.replace(/^acestream:\/\//i,'').replace(/\?.*$/,'');
      startHLS(`http://127.0.0.1:6878/ace/getstream?id=${encodeURIComponent(hash)}`);
    } else { triggerFallback('AceStream Engine no disponible'); }
    return;
  }
  if (location.protocol === 'https:' && /^http:/.test(stream.url)) {
    dom.playerSpinner.classList.add('hidden');
    dom.playerError.classList.remove('hidden');
    dom.errText.textContent = '⚠️ Stream HTTP bloqueado desde HTTPS. Usa 🟠 VLC o 📋 Copiar.';
    return;
  }
  startHLS(stream.url);
}

function triggerFallback(reason) {
  const ch = state.currentChId !== null ? state.allChannels[state.currentChId] : null;
  if (ch && state.currentStreamIndex + 1 < ch.streams.length) {
    const nextIdx = state.currentStreamIndex + 1;
    toast(`Enlace fallido. Probando opción ${nextIdx + 1}…`, 'warn');
    playStream(state.currentChId, nextIdx);
  } else {
    dom.playerSpinner.classList.add('hidden');
    dom.playerError.classList.remove('hidden');
    dom.errText.textContent = reason || 'Todos los enlaces offline';
  }
}

function getCleanVideoElement() {
  const old = document.getElementById('video-el');
  const nw  = old.cloneNode(true);
  old.parentNode.replaceChild(nw, old); return nw;
}

function startHLS(url) {
  dom.playerSpinner.classList.remove('hidden');
  if (state.hlsInstance) { state.hlsInstance.destroy(); state.hlsInstance = null; }
  const vid   = getCleanVideoElement();
  const isHLS = /\.m3u8(\?|$)/i.test(url) || /m3u8/i.test(url) || /\/ace\//i.test(url);

  vid.addEventListener('waiting', () => dom.playerSpinner.classList.remove('hidden'));
  vid.addEventListener('playing', () => dom.playerSpinner.classList.add('hidden'));

  if (isHLS && typeof Hls !== 'undefined' && Hls.isSupported()) {
    state.hlsInstance = new Hls({ maxBufferLength: 30, enableWorker: true, lowLatencyMode: true });
    state.hlsInstance.loadSource(url);
    state.hlsInstance.attachMedia(vid);
    state.hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => { dom.playerSpinner.classList.add('hidden'); vid.play().catch(()=>{}); });
    state.hlsInstance.on(Hls.Events.ERROR, (_, data) => { if (data.fatal) triggerFallback('Error HLS: ' + data.type); });
  } else if (vid.canPlayType('application/vnd.apple.mpegurl')) {
    vid.src = url;
    vid.addEventListener('loadedmetadata', () => { dom.playerSpinner.classList.add('hidden'); vid.play().catch(()=>{}); }, { once: true });
    vid.addEventListener('error', () => triggerFallback('Error de vídeo nativo'), { once: true });
  } else {
    vid.src = url;
    vid.addEventListener('loadedmetadata', () => { dom.playerSpinner.classList.add('hidden'); vid.play().catch(()=>{}); }, { once: true });
    vid.addEventListener('error', () => triggerFallback('Formato no soportado — usa VLC'), { once: true });
  }
}

function setPlayerIdle() {
  if (state.hlsInstance) { state.hlsInstance.destroy(); state.hlsInstance = null; }
  const vid = getCleanVideoElement(); vid.pause(); vid.src = '';
  dom.playerOverlay.classList.remove('hidden');
  dom.playerSpinner.classList.add('hidden');
  dom.playerError.classList.add('hidden');
}

function retryPlay() { if (state.currentChId !== null) playStream(state.currentChId, 0); }

function launchVlcUrl(url, name) {
  if (IS_IOS) { window.location.href = 'vlc://' + url; return; }
  if (IS_ANDROID) {
    const scheme  = /^https/i.test(url) ? 'https' : 'http';
    const noProto = url.replace(/^https?:\/\//i,'');
    window.location.href = `intent://${noProto}#Intent;scheme=${scheme};package=org.videolan.vlc;S.title=${encodeURIComponent(name)};end`;
    return;
  }
  const blob = new Blob([url], { type: 'text/plain' });
  const a = document.createElement('a'); const obj = URL.createObjectURL(blob);
  a.href = obj; a.download = (name || 'stream') + '.strm';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(obj), 1000);
  toast('🟠 .strm descargado — ábrelo con VLC', 'info');
}

function launchAce(url) {
  const hash = url.replace(/^acestream:\/\//i,'').replace(/\?.*$/,'');
  window.location.href = 'acestream://' + hash;
  setTimeout(() => toast('🟣 Acestream: asegúrate de tener el motor instalado', 'info'), 800);
}

function copyToClipboard(url) {
  navigator.clipboard.writeText(url)
    .then(() => toast('📋 URL copiada — pégala en VLC: Media → Abrir URL', 'ok'))
    .catch(() => toast('No se pudo copiar', 'error'));
}

async function detectAceEngine() {
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 1500);
    const res = await fetch('http://127.0.0.1:6878/webui/api/service?method=get_version', { signal: ctrl.signal });
    if (res.ok) state.aceAvailable = true;
  } catch (_) {}
}

function updateNowPlaying(ch, stream) {
  document.getElementById('now-playing').classList.remove('empty');
  document.getElementById('np-name').textContent = ch.name;
  document.getElementById('np-sub').textContent  = `${stream.qual} · Enlace ${state.currentStreamIndex + 1}`;
  const lg = document.getElementById('np-logo');
  const fb = document.getElementById('np-logo-fallback');
  if (ch.logo) {
    lg.src = ch.logo; lg.style.display = ''; fb.style.display = 'none';
    lg.parentElement.style.background = ch.lightBg ? '#fff' : '';
    lg.parentElement.style.padding    = ch.lightBg ? '3px' : '';
    lg.onerror = () => { lg.style.display = 'none'; fb.style.display = 'flex'; };
  } else { lg.style.display = 'none'; fb.style.display = 'flex'; }

  document.querySelectorAll('.ch-card').forEach(el => el.classList.remove('active'));
  const activeCard = dom.channelList.querySelector(`[data-ch-id="${ch._id}"]`);
  if (activeCard) { activeCard.classList.add('active'); activeCard.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
}

function toggleFullscreen() {
  const el = document.getElementById('player-wrap');
  if (!document.fullscreenElement) (el.requestFullscreen || el.webkitRequestFullscreen).call(el).catch(()=>{});
  else (document.exitFullscreen || document.webkitExitFullscreen).call(document);
}

function togglePip() {
  const vid = document.getElementById('video-el');
  if (!vid || !document.pictureInPictureEnabled) return;
  if (document.pictureInPictureElement) document.exitPictureInPicture().catch(()=>{});
  else vid.requestPictureInPicture().catch(()=>{});
}

function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast toast--${type}`; el.textContent = msg;
  const c = document.getElementById('toast-container'); c.appendChild(el);
  while (c.children.length > 4) c.removeChild(c.firstChild);
  setTimeout(() => { el.classList.add('toast--out'); setTimeout(() => el.remove(), 300); }, 3500);
}

init();
