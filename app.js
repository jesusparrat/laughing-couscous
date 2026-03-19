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
  currentCh: null,
  currentStreamIndex: 0,
  aceAvailable: false,
  hlsInstance: null
};

const dom = {
  searchInput: document.getElementById('search-input'),
  groupPills: document.getElementById('group-pills'),
  alphaPills: document.getElementById('alpha-pills'),
  channelList: document.getElementById('channel-list'),
  status: document.getElementById('sidebar-status'),
  scrollSentinel: document.getElementById('scroll-sentinel'),
  playerOverlay: document.getElementById('player-overlay'),
  playerSpinner: document.getElementById('player-spinner'),
  playerError: document.getElementById('player-error'),
  errText: document.getElementById('player-error-text')
};

const observer = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting && state.pageOffset < state.filteredChs.length) {
    renderNextBatch();
  }
}, { root: document.getElementById('channel-scroll-wrap'), rootMargin: '200px' });

function init() {
  if (!IS_MOBILE) detectAceEngine();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});

  loadPlaylistOptions();

  document.getElementById('btn-load-url').addEventListener('click', loadFromInput);
  document.getElementById('btn-fullscreen').addEventListener('click', toggleFullscreen);
  document.getElementById('btn-retry').addEventListener('click', retryPlay);
  
  document.getElementById('btn-close-modal').addEventListener('click', () => closeModal(false));
  document.getElementById('modal-backdrop').addEventListener('click', (e) => {
    if(e.target.id === 'modal-backdrop') closeModal(false);
  });
  window.addEventListener('popstate', (e) => {
    if (document.getElementById('modal-backdrop').classList.contains('open')) {
      closeModal(true);
    }
  });

  let searchTimer;
  dom.searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(applyFilter, 300);
  });

  observer.observe(dom.scrollSentinel);
}

async function loadPlaylistOptions() {
  try {
    const res = await fetch('./playlists.json');
    const list = await res.json();
    const sel = document.getElementById('playlist-select');
    
    list.forEach(pl => {
      const opt = document.createElement('option');
      opt.value = pl.url;
      opt.textContent = pl.name;
      sel.appendChild(opt);
    });

    sel.addEventListener('change', () => {
      if (sel.value) {
        document.getElementById('url-input').value = sel.value;
        loadFromInput();
      }
    });
  } catch (e) {}
}

function loadFromInput() {
  const val = document.getElementById('url-input').value.trim();
  if (!val) return;
  
  dom.status.textContent = 'Processing...';
  dom.channelList.innerHTML = '';
  state.allChannels = [];
  
  fetch(val).then(r => r.text()).then(text => {
    const worker = new Worker('./worker.js');
    worker.postMessage({ text });
    worker.onmessage = e => {
      state.allChannels = e.data.channels;
      toast(`${state.allChannels.length} channels loaded`, 'ok');
      buildGroups();
      buildAlphabet();
      setGroup('TODOS');
    };
  }).catch(e => toast('Error loading M3U', 'error'));
}

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
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  letters.forEach(l => dom.alphaPills.appendChild(makePill(l, '', 'alpha')));
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
    const matchGroup = state.activeGroup === 'TODOS' || ch.group === state.activeGroup;
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

function makeCard(ch) {
  const div = document.createElement('div');
  div.className = 'ch-card';
  div.addEventListener('click', () => openModal(ch));

  let logoHtml = ch.logo
    ? `<img class="ch-logo" src="${ch.logo}" referrerpolicy="no-referrer" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="ch-logo-fallback" style="display:none">📺</div>`
    : `<div class="ch-logo-fallback">📺</div>`;

  let badgesHtml = ch.badges.map(q => `<span class="badge badge-${q.toLowerCase()}">${q}</span>`).join('');
  if(ch.hasAce) badgesHtml += `<span class="badge badge-ace">ACE</span>`;

  div.innerHTML = logoHtml + `
    <div class="ch-info">
      <div class="ch-name">${ch.name}</div>
      <div class="ch-meta">${badgesHtml}</div>
    </div>
    <div class="ch-options">
      <button class="ch-btn" onclick="event.stopPropagation(); playStream(state.allChannels[${state.allChannels.indexOf(ch)}], 0)">▶</button>
      <button class="ch-btn" onclick="event.stopPropagation(); openModal(state.allChannels[${state.allChannels.indexOf(ch)}])">⋯</button>
    </div>`;
  return div;
}

function openModal(ch) {
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
    
    let actionButtons = `<button class="btn btn-primary btn-icon" onclick="playStream(state.allChannels[${state.allChannels.indexOf(ch)}], ${index}); closeModal();">▶</button>`;
    
    if (s.type === 'http') {
        actionButtons += `<button class="btn btn-orange btn-icon" onclick="launchVlcUrl('${s.url}', '${s.rawName}'); closeModal();">🟠</button>`;
    } else if (s.type === 'ace') {
        actionButtons += `<button class="btn btn-purple btn-icon" onclick="launchAce('${s.url}'); closeModal();">🟣</button>`;
    }

    row.innerHTML = `
      <div class="stream-info">
        <strong>${s.type==='ace'?'🟣 AceStream':'🌐 HTTP'}</strong> <span class="badge badge-${s.qual.toLowerCase()}">${s.qual}</span><br>
        <small>${s.rawName}</small>
      </div>
      <div style="display:flex;gap:6px">
        ${actionButtons}
      </div>
    `;
    body.appendChild(row);
  });

  document.getElementById('modal-backdrop').classList.add('open');
  history.pushState({ isModalOpen: true }, '');
}

function closeModal(fromPopState = false) {
  document.getElementById('modal-backdrop').classList.remove('open');
  if (!fromPopState && history.state && history.state.isModalOpen) {
    history.back();
  }
}

function playStream(ch, streamIndex) {
  if (!ch || !ch.streams[streamIndex]) return;
  
  state.currentCh = ch;
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
  if (state.currentCh && state.currentStreamIndex + 1 < state.currentCh.streams.length) {
    const nextIdx = state.currentStreamIndex + 1;
    toast(`Link failed. Trying option ${nextIdx + 1}...`, 'warn');
    playStream(state.currentCh, nextIdx);
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
      vid.play().catch(()=>{});
    });
    
    state.hlsInstance.on(Hls.Events.ERROR, (_, data) => {
      if(data.fatal) {
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR || data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          triggerFallback('HLS network error');
        } else {
          triggerFallback('HLS media error');
        }
      }
    });
  } else {
    vid.src = url;
    vid.addEventListener('loadedmetadata', () => {
      dom.playerSpinner.classList.add('hidden');
      vid.play().catch(()=>{});
    }, {once:true});
    vid.addEventListener('error', () => triggerFallback('Native video error'), {once: true});
  }
}

function retryPlay() { playStream(state.currentCh, 0); }

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
  } catch(e) {}
}

function updateNowPlaying(ch, stream) {
  document.getElementById('now-playing').classList.remove('empty');
  document.getElementById('np-name').textContent = ch.name;
  document.getElementById('np-sub').textContent = stream.qual + ' - Opc ' + (state.currentStreamIndex + 1);
  const lg = document.getElementById('np-logo'); 
  const fb = document.getElementById('np-logo-fallback');
  if(ch.logo) { lg.src=ch.logo; lg.style.display=''; fb.style.display='none'; } 
  else { lg.style.display='none'; fb.style.display='flex'; }
  
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

init();
