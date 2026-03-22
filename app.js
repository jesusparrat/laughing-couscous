'use strict';

const UA = navigator.userAgent;
const IS_ANDROID = /android/i.test(UA);
const IS_IOS = /iphone|ipad|ipod/i.test(UA);
const IS_MOBILE = IS_ANDROID || IS_IOS;

const state = {
  allChannels: [],
  filteredChs: [],
  activeGroup: 'TODOS',
  activeLetter: 'ALL',
  pageOffset: 0,
  pageSize: 40,
  currentChId: null,        // FIX: was object ref; now stable numeric id
  currentStreamIndex: 0,
  aceAvailable: false,
  hlsInstance: null
};

let m3uWorker = null;       // FIX: singleton — terminate() before recreating

const dom = {
  searchInput:    document.getElementById('search-input'),
  groupPills:     document.getElementById('group-pills'),
  alphaPills:     document.getElementById('alpha-pills'),
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

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
function init() {
  if (!IS_MOBILE) detectAceEngine();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});

  loadPlaylistOptions();

  document.getElementById('btn-load-url').addEventListener('click', loadFromInput);
  document.getElementById('btn-fullscreen').addEventListener('click', toggleFullscreen);
  document.getElementById('btn-retry').addEventListener('click', retryPlay);

  document.getElementById('btn-open-playlists').addEventListener('click', openPlaylists);
  document.getElementById('btn-close-playlists').addEventListener('click', closePlaylists);
  document.getElementById('playlist-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'playlist-overlay') closePlaylists();
  });

  document.getElementById('btn-close-modal').addEventListener('click', () => closeModal(false));
  document.getElementById('modal-backdrop').addEventListener('click', (e) => {
    if (e.target.id === 'modal-backdrop') closeModal(false);
  });
  window.addEventListener('popstate', () => {
    if (document.getElementById('modal-backdrop').classList.contains('open')) closeModal(true);
  });

  let searchTimer;
  dom.searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(applyFilter, 300);
  });

  observer.observe(dom.scrollSentinel);
}

// ---------------------------------------------------------------------------
// Playlist picker — TV-friendly card grid instead of <select>
// ---------------------------------------------------------------------------
async function loadPlaylistOptions() {
  try {
    const res = await fetch('./playlists.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);   // FIX: was silently swallowed
    const list = await res.json();
    const grid = document.getElementById('playlist-grid');

    list.forEach(pl => {
      const card = document.createElement('button');
      card.className = 'pl-card';
      card.innerHTML = `
        <div class="pl-card__name">${pl.name}</div>
        <div class="pl-card__desc">${pl.description || ''}</div>
      `;
      card.addEventListener('click', () => {
        document.getElementById('url-input').value = pl.url;
        closePlaylists();
        loadFromInput();
      });
      grid.appendChild(card);
    });
  } catch (e) {
    console.error('[playlists.json]', e);                 // FIX: was catch(e){}
    toast(`Could not load playlists: ${e.message}`, 'error');
  }
}

function openPlaylists() {
  document.getElementById('playlist-overlay').classList.add('open');
  const first = document.querySelector('.pl-card');
  if (first) first.focus();   // D-pad: auto-focus first card
}

function closePlaylists() {
  document.getElementById('playlist-overlay').classList.remove('open');
}

// ---------------------------------------------------------------------------
// Load M3U
// ---------------------------------------------------------------------------
function loadFromInput() {
  const val = document.getElementById('url-input').value.trim();
  if (!val) return;

  dom.status.textContent = 'Processing...';
  dom.channelList.innerHTML = '';
  state.allChannels = [];

  if (m3uWorker) { m3uWorker.terminate(); m3uWorker = null; }  // FIX: kill zombie

  fetch(val)
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.text();
    })
    .then(text => {
      m3uWorker = new Worker('./worker.js');
      m3uWorker.postMessage({ text });
      m3uWorker.onmessage = e => {
        // FIX: assign stable _id → eliminates all indexOf(ch) O(n) calls
        state.allChannels = e.data.channels.map((ch, i) => ({ ...ch, _id: i }));
        m3uWorker.terminate(); m3uWorker = null;
        toast(`${state.allChannels.length} channels loaded`, 'ok');
        buildGroups();
        buildAlphabet();
        setGroup('TODOS');
      };
      m3uWorker.onerror = err => {
        toast('Error parsing M3U', 'error');
        console.error('[worker]', err);
      };
    })
    .catch(e => {
      // FIX: distinguish CORS from generic network error
      const isCors = e.message === 'Failed to fetch';
      toast(isCors ? 'CORS error — use a direct/raw URL' : `Error: ${e.message}`, 'error');
      console.error('[loadFromInput]', e);
      dom.status.textContent = 'Error loading playlist';
    });
}

// ---------------------------------------------------------------------------
// Sidebar — groups / alphabet / filter
// ---------------------------------------------------------------------------
function buildGroups() {
  const counts = {};
  state.allChannels.forEach(ch => { counts[ch.group] = (counts[ch.group] || 0) + 1; });
  const groups = Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0]));
  dom.groupPills.innerHTML = '';
  dom.groupPills.appendChild(makePill('TODOS', state.allChannels.length, 'group'));
  groups.forEach(([g, c]) => dom.groupPills.appendChild(makePill(g, c, 'group')));
}

function buildAlphabet() {
  dom.alphaPills.innerHTML = '';
  dom.alphaPills.appendChild(makePill('ALL', '', 'alpha'));
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(l => dom.alphaPills.appendChild(makePill(l, '', 'alpha')));
}

function makePill(label, count, type) {
  const p = document.createElement('button');
  if (type === 'group') {
    p.className = 'pill' + (label === state.activeGroup ? ' active' : '');
    p.textContent = count ? `${label} ${count}` : label;
    p.onclick = () => setGroup(label);
  } else {
    p.className = 'alpha-pill' + (label === state.activeLetter ? ' active' : '');
    p.textContent = label;
    p.onclick = () => setLetter(label);
  }
  return p;
}

function setGroup(group) {
  state.activeGroup = group;
  state.activeLetter = 'ALL';
  buildAlphabet();
  document.querySelectorAll('.pill').forEach(p =>
    p.classList.toggle('active', p.textContent.startsWith(group + ' ') || p.textContent === group)
  );
  applyFilter();
}

function setLetter(letter) {
  state.activeLetter = letter;
  document.querySelectorAll('.alpha-pill').forEach(p =>
    p.classList.toggle('active', p.textContent === letter)
  );
  applyFilter();
}

function applyFilter() {
  const q = dom.searchInput.value.trim().toLowerCase();
  state.filteredChs = state.allChannels.filter(ch => {
    const matchGroup  = state.activeGroup === 'TODOS' || ch.group === state.activeGroup;
    const matchSearch = !q || ch.name.toLowerCase().includes(q);
    const matchLetter = state.activeLetter === 'ALL' || ch.name.toUpperCase().startsWith(state.activeLetter);
    return matchGroup && matchSearch && matchLetter;
  });
  dom.channelList.innerHTML = '';
  state.pageOffset = 0;
  dom.status.textContent = state.filteredChs.length + ' channels';
  renderNextBatch();
}

function renderNextBatch() {
  const slice = state.filteredChs.slice(state.pageOffset, state.pageOffset + state.pageSize);
  slice.forEach(ch => dom.channelList.appendChild(makeCard(ch)));
  state.pageOffset += state.pageSize;
  dom.scrollSentinel.style.display = (state.pageOffset >= state.filteredChs.length) ? 'none' : 'block';
}

// FIX: ch._id (O(1)) replaces state.allChannels.indexOf(ch) (O(n))
function makeCard(ch) {
  const div = document.createElement('div');
  div.className = 'ch-card';
  div.dataset.chId = ch._id;
  if (ch._id === state.currentChId) div.classList.add('active');
  div.addEventListener('click', () => openModal(ch._id));

  const logoHtml = ch.logo
    ? `<img class="ch-logo" src="${ch.logo}" referrerpolicy="no-referrer" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="ch-logo-fallback" style="display:none">&#128250;</div>`
    : `<div class="ch-logo-fallback">&#128250;</div>`;

  let badgesHtml = ch.badges.map(q => `<span class="badge badge-${q.toLowerCase()}">${q}</span>`).join('');
  if (ch.hasAce) badgesHtml += `<span class="badge badge-ace">ACE</span>`;

  div.innerHTML = logoHtml + `
    <div class="ch-info">
      <div class="ch-name">${ch.name}</div>
      <div class="ch-meta">${badgesHtml}</div>
    </div>
    <div class="ch-options">
      <button class="ch-btn" onclick="event.stopPropagation(); playStream(${ch._id}, 0)">&#9654;</button>
      <button class="ch-btn" onclick="event.stopPropagation(); openModal(${ch._id})">&#8943;</button>
    </div>`;
  return div;
}

// ---------------------------------------------------------------------------
// Channel modal — accepts numeric chId
// ---------------------------------------------------------------------------
function openModal(chId) {
  const ch = state.allChannels[chId];
  if (!ch) return;

  const mLogo = document.getElementById('modal-logo');
  const mLogoFb = document.getElementById('modal-logo-fb');
  if (ch.logo) {
    mLogo.src = ch.logo; mLogo.style.display = ''; mLogoFb.style.display = 'none';
  } else {
    mLogo.style.display = 'none'; mLogoFb.style.display = 'flex';
  }

  document.getElementById('modal-title').textContent = ch.name;
  document.getElementById('modal-meta').textContent = `${ch.group} · ${ch.streams.length} links`;

  const body = document.getElementById('modal-body');
  body.innerHTML = '';

  ch.streams.forEach((s, index) => {
    const row = document.createElement('div');
    row.className = 'stream-row';
    let actionButtons = `<button class="btn btn-primary btn-icon" onclick="playStream(${chId}, ${index}); closeModal();">&#9654;</button>`;
    if (s.type === 'http') {
      actionButtons += `<button class="btn btn-orange btn-icon" onclick="launchVlcUrl('${s.url}', '${s.rawName}'); closeModal();">&#x1F7E0;</button>`;
    } else if (s.type === 'ace') {
      actionButtons += `<button class="btn btn-purple btn-icon" onclick="launchAce('${s.url}'); closeModal();">&#x1F7E3;</button>`;
    }
    row.innerHTML = `
      <div class="stream-info">
        <strong>${s.type === 'ace' ? '&#x1F7E3; AceStream' : '&#127760; HTTP'}</strong>
        <span class="badge badge-${s.qual.toLowerCase()}">${s.qual}</span><br>
        <small>${s.rawName}</small>
      </div>
      <div style="display:flex;gap:6px">${actionButtons}</div>
    `;
    body.appendChild(row);
  });

  document.getElementById('modal-backdrop').classList.add('open');
  history.pushState({ isModalOpen: true }, '');
}

function closeModal(fromPopState = false) {
  document.getElementById('modal-backdrop').classList.remove('open');
  if (!fromPopState && history.state && history.state.isModalOpen) history.back();
}

// ---------------------------------------------------------------------------
// Playback
// ---------------------------------------------------------------------------
function playStream(chId, streamIndex) {
  const ch = state.allChannels[chId];
  if (!ch || !ch.streams[streamIndex]) return;

  state.currentChId = chId;
  state.currentStreamIndex = streamIndex;
  const stream = ch.streams[streamIndex];

  dom.playerOverlay.classList.add('hidden');
  dom.playerError.classList.add('hidden');
  updateNowPlaying(ch, stream);

  if (stream.type === 'ace') {
    if (state.aceAvailable) {
      const hash = stream.url.replace(/^acestream:\/\//i, '').replace(/\?.*$/, '');
      startHLS('http://127.0.0.1:6878/ace/getstream?id=' + encodeURIComponent(hash));
    } else {
      triggerFallback('AceStream Engine missing');
    }
    return;
  }
  startHLS(stream.url);
}

function triggerFallback(reason) {
  const ch = state.currentChId !== null ? state.allChannels[state.currentChId] : null;
  if (ch && state.currentStreamIndex + 1 < ch.streams.length) {
    const nextIdx = state.currentStreamIndex + 1;
    toast(`Link failed. Trying option ${nextIdx + 1}...`, 'warn');
    playStream(state.currentChId, nextIdx);
  } else {
    dom.playerSpinner.classList.add('hidden');
    dom.playerError.classList.remove('hidden');
    dom.errText.textContent = reason || 'All links offline';
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

  const vid = getCleanVideoElement();
  const isHLS = /\.m3u8(\?|$)/i.test(url) || /m3u8/i.test(url);

  vid.addEventListener('waiting', () => dom.playerSpinner.classList.remove('hidden'));
  vid.addEventListener('playing', () => dom.playerSpinner.classList.add('hidden'));

  if (isHLS && typeof Hls !== 'undefined' && Hls.isSupported()) {
    state.hlsInstance = new Hls({ maxBufferLength: 30 });
    state.hlsInstance.loadSource(url);
    state.hlsInstance.attachMedia(vid);
    state.hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
      dom.playerSpinner.classList.add('hidden');
      vid.play().catch(() => {});
    });
    state.hlsInstance.on(Hls.Events.ERROR, (_, data) => {
      if (data.fatal) triggerFallback('HLS error: ' + data.type);
    });
  } else {
    vid.src = url;
    vid.addEventListener('loadedmetadata', () => {
      dom.playerSpinner.classList.add('hidden');
      vid.play().catch(() => {});
    }, { once: true });
    vid.addEventListener('error', () => triggerFallback('Native video error'), { once: true });
  }
}

function retryPlay() {
  if (state.currentChId !== null) playStream(state.currentChId, 0);
}

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

function launchAce(url) {
  const hash = url.replace(/^acestream:\/\//i, '').replace(/\?.*$/, '');
  window.location.href = 'acestream://' + hash;
}

async function detectAceEngine() {
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 1500);
    const res = await fetch('http://127.0.0.1:6878/webui/api/service?method=get_version', { signal: ctrl.signal });
    if (res.ok) state.aceAvailable = true;
  } catch (e) {}
}

function updateNowPlaying(ch, stream) {
  document.getElementById('now-playing').classList.remove('empty');
  document.getElementById('np-name').textContent = ch.name;
  document.getElementById('np-sub').textContent = `${stream.qual} · Link ${state.currentStreamIndex + 1}`;
  const lg = document.getElementById('np-logo');
  const fb = document.getElementById('np-logo-fallback');
  if (ch.logo) { lg.src = ch.logo; lg.style.display = ''; fb.style.display = 'none'; }
  else { lg.style.display = 'none'; fb.style.display = 'flex'; }
  // FIX: data-ch-id attribute lookup — no more filteredChs.indexOf(ch)
  document.querySelectorAll('.ch-card').forEach(el => el.classList.remove('active'));
  const activeCard = dom.channelList.querySelector(`[data-ch-id="${ch._id}"]`);
  if (activeCard) activeCard.classList.add('active');
}

function toggleFullscreen() {
  const el = document.getElementById('player-wrap');
  if (!document.fullscreenElement) {
    (el.requestFullscreen || el.webkitRequestFullscreen).call(el).catch(() => {});
  } else {
    (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  }
}

// FIX: typed toasts — border color by severity
function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.textContent = msg;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

init();
