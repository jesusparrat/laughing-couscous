// app.js v3.0 - Modular, Resiliente y Optimizado
'use strict';

// Detección de plataforma
const UA = navigator.userAgent;
const IS_ANDROID = /android/i.test(UA);
const IS_IOS = /iphone|ipad|ipod/i.test(UA);
const IS_MOBILE = IS_ANDROID || IS_IOS;

// Estado centralizado
const state = {
  allChannels: [],
  filteredChs: [],
  activeGroup: 'TODOS',
  pageOffset: 0,
  pageSize: 40, // Renderizamos de 40 en 40
  currentCh: null,
  currentStreamIndex: 0,
  aceAvailable: false,
  hlsInstance: null
};

// Referencias DOM
const dom = {
  searchInput: document.getElementById('search-input'),
  groupPills: document.getElementById('group-pills'),
  channelList: document.getElementById('channel-list'),
  status: document.getElementById('sidebar-status'),
  scrollSentinel: document.getElementById('scroll-sentinel'),
  playerOverlay: document.getElementById('player-overlay'),
  playerSpinner: document.getElementById('player-spinner'),
  playerError: document.getElementById('player-error'),
  errText: document.getElementById('player-error-text')
};

// 1. VIRTUAL SCROLL (Intersection Observer)
const observer = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting && state.pageOffset < state.filteredChs.length) {
    renderNextBatch();
  }
}, { root: document.getElementById('channel-scroll-wrap'), rootMargin: '200px' });

function init() {
  if (!IS_MOBILE) detectAceEngine();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});

  // Event Listeners Base
  document.getElementById('btn-load-url').addEventListener('click', loadFromInput);
  document.getElementById('btn-fullscreen').addEventListener('click', toggleFullscreen);
  document.getElementById('btn-retry').addEventListener('click', retryPlay);
  
  // History API para el botón atrás del móvil (Fix 3)
  document.getElementById('btn-close-modal').addEventListener('click', () => closeModal(false));
  document.getElementById('modal-backdrop').addEventListener('click', (e) => {
    if(e.target.id === 'modal-backdrop') closeModal(false);
  });
  window.addEventListener('popstate', (e) => {
    if (document.getElementById('modal-backdrop').classList.contains('open')) {
      closeModal(true); // Se cerró usando el botón atrás del móvil
    }
  });

  // Debounce buscador
  let searchTimer;
  dom.searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(applyFilter, 300);
  });

  observer.observe(dom.scrollSentinel);
}

// Lógica de carga
function loadFromInput() {
  const val = document.getElementById('url-input').value.trim();
  if (!val) return;
  
  dom.status.textContent = 'Procesando M3U (esto puede tardar unos segundos)...';
  dom.channelList.innerHTML = '';
  state.allChannels = [];
  
  fetch(val).then(r => r.text()).then(text => {
    const worker = new Worker('./worker.js');
    worker.postMessage({ text });
    worker.onmessage = e => {
      state.allChannels = e.data.channels;
      toast(`${state.allChannels.length} canales extraídos y agrupados!`, 'ok');
      buildGroups();
      setGroup('TODOS');
    };
  }).catch(e => toast('Error al descargar la lista M3U', 'error'));
}

// Filtros y Renderizado Pagina
function buildGroups() {
  const counts = {};
  state.allChannels.forEach(ch => { counts[ch.group] = (counts[ch.group] || 0) + 1; });
  const groups = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  dom.groupPills.innerHTML = '';
  dom.groupPills.appendChild(makePill('TODOS', state.allChannels.length));
  groups.forEach(([g, c]) => dom.groupPills.appendChild(makePill(g, c)));
}

function makePill(label, count) {
  const p = document.createElement('button');
  p.className = 'pill' + (label === state.activeGroup ? ' active' : '');
  p.textContent = label + ' ' + count;
  p.onclick = () => setGroup(label);
  return p;
}

function setGroup(group) {
  state.activeGroup = group;
  document.querySelectorAll('.pill').forEach(p => 
    p.classList.toggle('active', p.textContent.startsWith(group + ' '))
  );
  applyFilter();
}

function applyFilter() {
  const q = dom.searchInput.value.trim().toLowerCase();
  state.filteredChs = state.allChannels
    .filter(ch => state.activeGroup === 'TODOS' || ch.group === state.activeGroup)
    .filter(ch => !q || ch.name.toLowerCase().includes(q));
  
  dom.channelList.innerHTML = '';
  state.pageOffset = 0;
  dom.status.textContent = state.filteredChs.length + ' canales';
  renderNextBatch();
}

function renderNextBatch() {
  const slice = state.filteredChs.slice(state.pageOffset, state.pageOffset + state.pageSize);
  slice.forEach(ch => dom.channelList.appendChild(makeCard(ch)));
  state.pageOffset += state.pageSize;
  
  dom.scrollSentinel.style.display = (state.pageOffset >= state.filteredChs.length) ? 'none' : 'block';
}

function makeCard(ch) {
  const div = document.createElement('div');
  div.className = 'ch-card';
  div.addEventListener('click', () => openModal(ch));

  let logoHtml = ch.logo
    ? `<img class="ch-logo" src="${ch.logo}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="ch-logo-fallback" style="display:none">📺</div>`
    : `<div class="ch-logo-fallback">📺</div>`;

  let badgesHtml = ch.badges.map(q => `<span class="badge badge-${q.toLowerCase()}">${q}</span>`).join('');
  if(ch.hasAce) badgesHtml += `<span class="badge badge-ace">ACE</span>`;

  div.innerHTML = logoHtml + `
    <div class="ch-info">
      <div class="ch-name">${ch.name}</div>
      <div class="ch-meta">${badgesHtml}</div>
    </div>
    <div class="ch-options">
      <button class="ch-btn" title="Reproducir Principal" onclick="event.stopPropagation(); playStream(state.allChannels[${state.allChannels.indexOf(ch)}], 0)">▶</button>
      <button class="ch-btn" title="Ver Enlaces" onclick="event.stopPropagation(); openModal(state.allChannels[${state.allChannels.indexOf(ch)}])">⋯</button>
    </div>`;
  return div;
}

// History API Modal Control
function openModal(ch) {
  const mLogo = document.getElementById('modal-logo');
  const mLogoFb = document.getElementById('modal-logo-fb');
  if (ch.logo) {
    mLogo.src = ch.logo; mLogo.style.display = ''; mLogoFb.style.display = 'none';
  } else {
    mLogo.style.display = 'none'; mLogoFb.style.display = 'flex';
  }

  document.getElementById('modal-title').textContent = ch.name;
  document.getElementById('modal-meta').textContent = `${ch.group} · ${ch.streams.length} enlaces agrupados`;

  const body = document.getElementById('modal-body');
  body.innerHTML = '';

  ch.streams.forEach((s, index) => {
    const row = document.createElement('div');
    row.className = 'stream-row';
    row.innerHTML = `
      <div class="stream-info">
        <strong>${s.type==='ace'?'🟣 AceStream':'🌐 HTTP'}</strong> <span class="badge badge-${s.qual.toLowerCase()}">${s.qual}</span><br>
        <small>${s.rawName}</small>
      </div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-primary btn-icon" onclick="playStream(state.allChannels[${state.allChannels.indexOf(ch)}], ${index}); closeModal();">▶</button>
        <button class="btn btn-orange btn-icon" onclick="launchVlcUrl('${s.url}', '${s.rawName}'); closeModal();">🟠</button>
      </div>
    `;
    body.appendChild(row);
  });

  document.getElementById('modal-backdrop').classList.add('open');
  // Pusheamos estado para interceptar el botón atrás de Android
  history.pushState({ isModalOpen: true }, '');
}

function closeModal(fromPopState = false) {
  document.getElementById('modal-backdrop').classList.remove('open');
  if (!fromPopState && history.state && history.state.isModalOpen) {
    history.back(); // Limpiamos el historial si se cerró con la X o clic fuera
  }
}

// REPRODUCTOR & AUTO-FALLBACK (Fix 4)
function playStream(ch, streamIndex) {
  if (!ch || !ch.streams[streamIndex]) return;
  
  state.currentCh = ch;
  state.currentStreamIndex = streamIndex;
  const stream = ch.streams[streamIndex];
  
  dom.playerOverlay.classList.add('hidden');
  dom.playerError.classList.add('hidden');
  updateNowPlaying(ch, stream);

  if (stream.type === 'ace') {
    if (aceAvailable) {
      const hash = stream.url.replace(/^acestream:\/\//i, '').replace(/\?.*$/, '');
      startHLS('http://127.0.0.1:6878/ace/getstream?id=' + encodeURIComponent(hash));
    } else {
      triggerFallback('AceStream Engine no detectado en local.');
    }
    return;
  }
  startHLS(stream.url);
}

function triggerFallback(reason) {
  if (state.currentCh && state.currentStreamIndex + 1 < state.currentCh.streams.length) {
    const nextIdx = state.currentStreamIndex + 1;
    toast(`Fallo enlace. Saltando a opción ${nextIdx + 1}...`, 'warn');
    playStream(state.currentCh, nextIdx);
  } else {
    dom.playerSpinner.classList.add('hidden');
    dom.playerError.classList.remove('hidden');
    dom.errText.textContent = reason || 'Todos los enlaces de este canal están caídos.';
  }
}

function getCleanVideoElement() {
  const oldVid = document.getElementById('video-el');
  const newVid = oldVid.cloneNode(true);
  oldVid.parentNode.replaceChild(newVid, oldVid);
  return newVid;
}

function startHLS(url) {
  dom.playerSpinner.classList.remove('hidden');
  if (state.hlsInstance) { state.hlsInstance.destroy(); state.hlsInstance = null; }
  
  const vid = getCleanVideoElement(); // Evita eventos fantasma del stream anterior
  const isHLS = /\.m3u8(\?|$)/i.test(url) || /m3u8/i.test(url);

  // Bind UI events
  vid.addEventListener('waiting', () => dom.playerSpinner.classList.remove('hidden'));
  vid.addEventListener('playing', () => dom.playerSpinner.classList.add('hidden'));

  if (isHLS && typeof Hls !== 'undefined' && Hls.isSupported()) {
    state.hlsInstance = new Hls({ maxBufferLength: 30 });
    state.hlsInstance.loadSource(url);
    state.hlsInstance.attachMedia(vid);
    
    state.hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
      dom.playerSpinner.classList.add('hidden');
      vid.play().catch(()=>{});
    });
    
    state.hlsInstance.on(Hls.Events.ERROR, (_, data) => {
      if(data.fatal) {
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR || data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          triggerFallback('Error de red HLS');
        } else {
          triggerFallback('Error de Media HLS');
        }
      }
    });
  } else {
    vid.src = url;
    vid.addEventListener('loadedmetadata', () => {
      dom.playerSpinner.classList.add('hidden');
      vid.play().catch(()=>{});
    }, {once:true});
    vid.addEventListener('error', () => triggerFallback('Error de video nativo'), {once: true});
  }
}

function retryPlay() { playStream(state.currentCh, 0); } // Reintenta desde la opción 1

function launchVlcUrl(url, name) {
  if (IS_IOS) { window.location.href = 'vlc://' + url; return; }
  if (IS_ANDROID) {
    const scheme = /^https/i.test(url) ? 'https' : 'http';
    const noProto = url.replace(/^https?:\/\//i, '');
    window.location.href = `intent://${noProto}#Intent;scheme=${scheme};package=org.videolan.vlc;S.title=${encodeURIComponent(name)};end`;
    return;
  }
  const a = document.createElement('a');
  a.href = 'vlc://' + url;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

async function detectAceEngine() {
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 1500);
    const res = await fetch('http://127.0.0.1:6878/webui/api/service?method=get_version', { signal: ctrl.signal });
    if (res.ok) state.aceAvailable = true;
  } catch(e) {}
}

function updateNowPlaying(ch, stream) {
  document.getElementById('now-playing').classList.remove('empty');
  document.getElementById('np-name').textContent = ch.name;
  document.getElementById('np-sub').textContent = stream.qual + ' · Opc ' + (state.currentStreamIndex + 1);
  const lg = document.getElementById('np-logo'); 
  const fb = document.getElementById('np-logo-fallback');
  if(ch.logo) { lg.src=ch.logo; lg.style.display=''; fb.style.display='none'; } 
  else { lg.style.display='none'; fb.style.display='flex'; }
  
  // Highlight card activa
  document.querySelectorAll('.ch-card').forEach(el => el.classList.remove('active'));
  const cards = dom.channelList.querySelectorAll('.ch-card');
  const index = state.filteredChs.indexOf(ch);
  if(index >= 0 && index < state.pageOffset && cards[index]) cards[index].classList.add('active');
}

function toggleFullscreen() {
  const el = document.getElementById('player-wrap');
  if (!document.fullscreenElement) { (el.requestFullscreen || el.webkitRequestFullscreen).call(el).catch(()=>{}); }
  else { (document.exitFullscreen || document.webkitExitFullscreen).call(document); }
}

function toast(msg, type='info') {
  const el = document.createElement('div');
  el.className = 'toast'; el.textContent = msg;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(()=>el.remove(), 3500);
}

// Arranque
init();
