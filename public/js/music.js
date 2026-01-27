// Music Module - Deezer/yt-dlp Integration via local API

let musicResultsCache = [];
let currentAlbumTracks = [];
let currentDownloadId = null;
let currentDownloadController = null;
let currentDownloadCancelled = false;
let currentDownloadFilePath = null;
let currentDownloadPoll = null;
let musicInitialized = false;
let isDownloadMinimized = false;

// Play queue
let currentPlayQueue = [];
let currentQueueIndex = 0;
const MUSIC_AUTOPLAY_KEY = 'pt_music_autoplay_next_v1';
let musicAutoPlayNext = false;
let isPlayerMinimized = false;

// Download queue
let downloadQueue = [];

// DOM refs
let musicSearchInput, musicSearchBtn, musicLoading, musicEmpty, musicResults;
let musicResultsGrid, musicResultsTitle, musicResultsCount;
let musicModal, miniPlayer, musicAudio, musicModalTitle, musicSongTitle, musicArtist, musicCover;
let musicPlayPauseBtn, musicProgressFill, musicCurrentTime, musicTotalTime, musicProgressBar;
let musicVolumeSlider, musicVolumeFill, musicBackwardBtn, musicForwardBtn;
let musicNextTrackBtn, musicPrevTrackBtn, musicModalBack, musicModalMinimize;
let miniPlayerSongTitle, miniPlayerArtist, miniPlayPauseBtn, miniBackwardBtn, miniForwardBtn;
let miniCurrentTime, miniTotalTime, miniProgressFill, miniPlayerMaximize, musicAutoplayToggle;
let playlistChooser, playlistChooserList, playlistChooserEmpty, playlistChooserTrack;
let playlistChooserBack, playlistChooserCreate, playlistChooserNewName;

function getMusicApiUrl(path) {
    const baseUrl = window.API_BASE_URL || 'http://localhost:6987/api';
    const cleanPath = path.replace(/^\/api/, '');
    return baseUrl + cleanPath;
}

async function musicApiFetch(path) {
    const url = getMusicApiUrl(path);
    console.log('[MUSIC] Fetching:', url);
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`API error ${resp.status}`);
    return await resp.json();
}

function fmtTime(sec) {
    if (!isFinite(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

function initMusic() {
    console.log('[Music] initMusic called');
    musicSearchInput = document.getElementById('music-search-input');
    musicSearchBtn = document.getElementById('music-search-btn');
    musicLoading = document.getElementById('music-loading');
    musicEmpty = document.getElementById('music-empty');
    musicResults = document.getElementById('music-results');
    musicResultsGrid = document.getElementById('music-results-grid');
    musicResultsTitle = document.getElementById('music-results-title');
    musicResultsCount = document.getElementById('music-results-count');
    musicModal = document.getElementById('music-player-modal');
    miniPlayer = document.getElementById('music-mini-player');
    musicAudio = document.getElementById('music-player-audio');
    musicModalTitle = document.getElementById('music-player-title');
    musicSongTitle = document.getElementById('music-player-song-title');
    musicArtist = document.getElementById('music-player-artist');
    musicCover = document.getElementById('music-player-cover');
    musicPlayPauseBtn = document.getElementById('music-play-pause-btn');
    musicProgressFill = document.getElementById('music-progress-fill');
    musicCurrentTime = document.getElementById('music-current-time');
    musicTotalTime = document.getElementById('music-total-time');
    musicProgressBar = document.getElementById('music-progress-bar');
    musicVolumeSlider = document.getElementById('music-volume-slider');
    musicVolumeFill = document.getElementById('music-volume-fill');
    musicBackwardBtn = document.getElementById('music-backward-btn');
    musicForwardBtn = document.getElementById('music-forward-btn');
    musicNextTrackBtn = document.getElementById('music-next-track-btn');
    musicPrevTrackBtn = document.getElementById('music-prev-track-btn');
    musicModalBack = document.getElementById('music-player-back');
    musicModalMinimize = document.getElementById('music-player-minimize');
    musicAutoplayToggle = document.getElementById('music-autoplay-toggle');
    miniPlayerSongTitle = document.getElementById('mini-player-song-title');
    miniPlayerArtist = document.getElementById('mini-player-artist');
    miniPlayPauseBtn = document.getElementById('mini-play-pause-btn');
    miniBackwardBtn = document.getElementById('mini-backward-btn');
    miniForwardBtn = document.getElementById('mini-forward-btn');
    miniCurrentTime = document.getElementById('mini-current-time');
    miniTotalTime = document.getElementById('mini-total-time');
    miniProgressFill = document.getElementById('mini-progress-fill');
    miniPlayerMaximize = document.getElementById('music-player-maximize');
    playlistChooser = document.getElementById('playlist-chooser');
    playlistChooserList = document.getElementById('playlist-chooser-list');
    playlistChooserEmpty = document.getElementById('playlist-chooser-empty');
    playlistChooserBack = document.getElementById('playlist-chooser-back');
    playlistChooserCreate = document.getElementById('playlist-chooser-create');
    playlistChooserNewName = document.getElementById('playlist-chooser-new-name');

    try { musicAutoPlayNext = localStorage.getItem(MUSIC_AUTOPLAY_KEY) === '1'; } catch(_) {}
    updateAutoplayToggleUI();

    if (!musicInitialized && musicSearchBtn && musicSearchInput) {
        musicSearchBtn.addEventListener('click', () => searchMusic(musicSearchInput.value));
        musicSearchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') searchMusic(musicSearchInput.value); });
        const albumSearchBtn = document.getElementById('music-album-search-btn');
        if (albumSearchBtn) albumSearchBtn.addEventListener('click', () => searchAlbums(musicSearchInput.value));
        setupPlayerEventListeners();
        musicInitialized = true;
        console.log('[Music] Initialized');
    }
}

// Storage
const MY_MUSIC_KEY = 'pt_my_music_v1';
const MY_ALBUMS_KEY = 'pt_my_albums_v1';
const DOWNLOADED_MUSIC_KEY = 'pt_downloaded_music_v1';
const PLAYLISTS_KEY = 'pt_playlists_v1';

function getMyMusic() { try { return JSON.parse(localStorage.getItem(MY_MUSIC_KEY) || '[]'); } catch(_) { return []; } }
function setMyMusic(arr) { try { localStorage.setItem(MY_MUSIC_KEY, JSON.stringify(arr)); } catch(_) {} }
function getMyAlbums() { try { return JSON.parse(localStorage.getItem(MY_ALBUMS_KEY) || '[]'); } catch(_) { return []; } }
function setMyAlbums(arr) { try { localStorage.setItem(MY_ALBUMS_KEY, JSON.stringify(arr)); } catch(_) {} }
function getDownloadedMusic() { try { return JSON.parse(localStorage.getItem(DOWNLOADED_MUSIC_KEY) || '[]'); } catch(_) { return []; } }
function setDownloadedMusic(arr) { try { localStorage.setItem(DOWNLOADED_MUSIC_KEY, JSON.stringify(arr)); } catch(_) {} }
function isTrackDownloaded(trackId) { return getDownloadedMusic().some(t => String(t.id) === String(trackId)); }
function getPlaylists() { try { return JSON.parse(localStorage.getItem(PLAYLISTS_KEY) || '[]'); } catch(_) { return []; } }
function setPlaylists(arr) { try { localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(arr)); } catch(_) {} }
function addToDownloaded(track) { const list = getDownloadedMusic(); if (!list.find(t => String(t.id) === String(track.id))) { list.push(track); setDownloadedMusic(list); } }
function removeFromDownloaded(trackId) { setDownloadedMusic(getDownloadedMusic().filter(t => String(t.id) !== String(trackId))); }
function addTrackToPlaylist(pid, track) { const pls = getPlaylists(); const pl = pls.find(p => p.id === pid); if (!pl) return false; if (!pl.tracks) pl.tracks = []; if (pl.tracks.find(t => String(t.id) === String(track.id))) return false; pl.tracks.push(track); setPlaylists(pls); return true; }

// ========== SEARCH ==========
async function searchMusic(query) {
    if (!query?.trim()) { if (typeof showNotification === 'function') showNotification('Enter a search term', 'warning'); return; }
    const q = query.trim();
    if (musicEmpty) musicEmpty.style.display = 'none';
    if (musicResults) musicResults.style.display = 'none';
    if (musicLoading) musicLoading.style.display = 'block';

    try {
        const resp = await musicApiFetch(`/search?q=${encodeURIComponent(q)}&type=track&limit=30`);
        if (musicLoading) musicLoading.style.display = 'none';
        const items = Array.isArray(resp?.results) ? resp.results : [];
        if (!items.length) {
            if (musicEmpty) { musicEmpty.style.display = 'block'; musicEmpty.innerHTML = `<div class="books-empty-icon"><i class="fas fa-search"></i></div><h3>No Music Found</h3><p>No results for "${q}"</p>`; }
            return;
        }
        // Normalize - albumArt is already full URL from Deezer
        const normalized = items.map(it => ({
            id: it.id,
            title: it.title || it.name || 'Unknown',
            artist: it.artists || it.channel || 'Unknown Artist',
            cover: it.albumArt || it.thumbnail || '',
            duration: it.duration
        }));
        musicResultsCache = normalized;
        displayMusicResults(normalized, q);
        if (typeof showNotification === 'function') showNotification(`Found ${normalized.length} tracks`, 'success');
    } catch (e) {
        console.error('[MUSIC] Search error', e);
        if (musicLoading) musicLoading.style.display = 'none';
        if (musicEmpty) { musicEmpty.style.display = 'block'; musicEmpty.innerHTML = `<div class="books-empty-icon"><i class="fas fa-exclamation-triangle"></i></div><h3>Search Error</h3>`; }
    }
}

function displayMusicResults(results, q) {
    window.currentMusicResults = results;
    window.currentMusicQuery = q;
    if (musicResultsTitle) musicResultsTitle.textContent = `Search Results for "${q}"`;
    if (musicResultsCount) musicResultsCount.textContent = `${results.length} items`;
    const musicPage = document.getElementById('music-page');
    if (musicPage) musicPage.classList.remove('playlist-open');
    ['my-albums', 'music-album-view', 'my-music', 'music-playlists', 'music-downloaded'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
    if (!musicResultsGrid) musicResultsGrid = document.getElementById('music-results-grid');
    if (!musicResultsGrid) return;
    musicResultsGrid.innerHTML = '';

    const searchTracks = [];
    results.forEach(item => {
        const trackId = item.id;
        const title = item.title || 'Unknown';
        const artist = item.artist || 'Unknown Artist';
        const img = item.cover || 'https://via.placeholder.com/320x320?text=Music';
        searchTracks.push({ id: String(trackId), title, artist, cover: img });

        const card = document.createElement('div');
        card.className = 'music-card';
        const isSaved = getMyMusic().some(x => String(x.id) == String(trackId));
        const isDownloaded = isTrackDownloaded(trackId);
        card.innerHTML = `
            <div class="music-cover"><img loading="lazy" src="${img}" alt="${title}"></div>
            <div class="music-info">
                <div class="music-title">${title}</div>
                <div class="music-artist">${artist}</div>
                <div class="music-actions">
                    <button class="music-play-btn" data-id="${trackId}" data-title="${title.replace(/"/g,'&quot;')}" data-artist="${artist.replace(/"/g,'&quot;')}" data-cover="${img}"><i class="fas fa-play"></i> Play</button>
                    <button class="music-heart-btn ${isSaved ? 'added' : ''}" data-id="${trackId}" data-title="${title.replace(/"/g,'&quot;')}" data-artist="${artist.replace(/"/g,'&quot;')}" data-cover="${img}"><i class="fas fa-heart"></i></button>
                    <button class="music-plus-btn" data-id="${trackId}" data-title="${title.replace(/"/g,'&quot;')}" data-artist="${artist.replace(/"/g,'&quot;')}" data-cover="${img}"><i class="fas fa-plus"></i></button>
                    <button class="music-download-btn ${isDownloaded ? 'downloaded' : ''}" data-id="${trackId}" data-title="${title.replace(/"/g,'&quot;')}" data-artist="${artist.replace(/"/g,'&quot;')}" data-cover="${img}"><i class="fas ${isDownloaded ? 'fa-check-circle' : 'fa-download'}"></i></button>
                </div>
            </div>`;
        musicResultsGrid.appendChild(card);
    });

    // Play buttons
    musicResultsGrid.querySelectorAll('.music-play-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const trackId = e.currentTarget.getAttribute('data-id');
            const idx = searchTracks.findIndex(t => t.id === trackId);
            if (idx >= 0) setPlayQueue(searchTracks, idx);
            else playMusicTrack({ trackId, title: e.currentTarget.dataset.title, artistName: e.currentTarget.dataset.artist, coverSrc: e.currentTarget.dataset.cover });
        });
    });
    // Heart buttons
    musicResultsGrid.querySelectorAll('.music-heart-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const el = e.currentTarget;
            const saved = getMyMusic();
            const track = { id: el.dataset.id, title: el.dataset.title, artist: el.dataset.artist, cover: el.dataset.cover };
            if (!saved.find(x => String(x.id) === String(track.id))) { saved.push(track); setMyMusic(saved); el.classList.add('added'); if (typeof showNotification === 'function') showNotification(`Saved "${track.title}"`, 'success'); }
            else { if (typeof showNotification === 'function') showNotification('Already saved', 'info'); }
        });
    });
    // Plus buttons
    musicResultsGrid.querySelectorAll('.music-plus-btn').forEach(btn => {
        btn.addEventListener('click', (e) => { showPlaylistChooser({ id: e.currentTarget.dataset.id, title: e.currentTarget.dataset.title, artist: e.currentTarget.dataset.artist, cover: e.currentTarget.dataset.cover }); });
    });
    // Download buttons
    musicResultsGrid.querySelectorAll('.music-download-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const el = e.currentTarget;
            if (isTrackDownloaded(el.dataset.id)) { if (typeof showNotification === 'function') showNotification('Already downloaded', 'info'); return; }
            await downloadMusicTrack(el.dataset.id, el.dataset.title, el.dataset.artist, el.dataset.cover);
        });
    });

    if (musicEmpty) musicEmpty.style.display = 'none';
    if (musicResults) musicResults.style.display = 'block';
}

async function searchAlbums(query) {
    if (!query?.trim()) { if (typeof showNotification === 'function') showNotification('Enter a search term', 'warning'); return; }
    const albumsSection = document.getElementById('music-albums');
    const albumsGrid = document.getElementById('music-albums-grid');
    const albumsCount = document.getElementById('music-albums-count');
    if (albumsSection) albumsSection.style.display = 'block';
    if (musicResults) musicResults.style.display = 'none';
    if (musicEmpty) musicEmpty.style.display = 'none';
    if (albumsCount) albumsCount.textContent = 'Searching...';
    if (albumsGrid) albumsGrid.innerHTML = '<div class="loading-spinner"></div>';
    try {
        const resp = await musicApiFetch(`/search?q=${encodeURIComponent(query.trim())}&type=album&limit=20`);
        renderAlbumResults(Array.isArray(resp?.results) ? resp.results : []);
    } catch (e) { console.error('[MUSIC] Album search error', e); if (albumsCount) albumsCount.textContent = 'Error'; }
}

function renderAlbumResults(albums) {
    const albumsGrid = document.getElementById('music-albums-grid');
    const albumsCount = document.getElementById('music-albums-count');
    if (!albumsGrid) return;
    albumsGrid.innerHTML = '';
    if (!albums.length) { if (albumsCount) albumsCount.textContent = 'No albums found'; return; }
    if (albumsCount) albumsCount.textContent = `${albums.length} albums`;
    albums.forEach(album => {
        const title = album.title || album.name || 'Unknown';
        const img = album.albumArt || album.cover || album.thumbnail || 'https://via.placeholder.com/320x320?text=Album';
        const artist = album.artists || album.channel || 'Unknown';
        const card = document.createElement('div');
        card.className = 'album-card';
        card.innerHTML = `
            <img loading="lazy" class="album-cover" src="${img}" alt="${title}">
            <div class="album-body">
                <div class="album-title">${title}</div>
                <div class="album-artist">${artist}</div>
                <div class="album-meta"><span>${album.totalTracks || album.nb_tracks || '?'} tracks</span></div>
                <div style="display:flex;gap:0.5rem;">
                    <button class="album-open-btn"><i class="fas fa-folder-open"></i> Open</button>
                    <button class="album-heart-btn"><i class="fas fa-heart"></i></button>
                </div>
            </div>`;
        albumsGrid.appendChild(card);
        card.querySelector('.album-open-btn').addEventListener('click', () => openAlbum(album));
        card.querySelector('.album-heart-btn').addEventListener('click', (e) => saveAlbum(album, e.currentTarget));
    });
}

async function openAlbum(album) {
    const albumView = document.getElementById('music-album-view');
    const albumTracksEl = document.getElementById('album-tracks');
    const albumViewTitle = document.getElementById('album-view-title');
    const albumViewMeta = document.getElementById('album-view-meta');
    const albumViewCover = document.getElementById('album-view-cover');
    if (!albumView || !albumTracksEl) return;
    const albumsEl = document.getElementById('music-albums');
    if (albumsEl) albumsEl.style.display = 'none';
    const myAlbumsEl = document.getElementById('my-albums');
    if (myAlbumsEl) myAlbumsEl.style.display = 'none';
    if (musicResults) musicResults.style.display = 'none';
    albumView.style.display = 'block';
    const title = album.title || album.name || 'Unknown';
    const img = album.albumArt || album.cover || album.thumbnail || '';
    if (albumViewTitle) albumViewTitle.textContent = title;
    if (albumViewCover) albumViewCover.src = img;
    if (albumViewMeta) albumViewMeta.textContent = 'Loading...';
    albumTracksEl.innerHTML = '<div class="loading-spinner"></div>';
    try {
        const resp = await musicApiFetch(`/album/${encodeURIComponent(album.id)}/tracks`);
        const tracks = Array.isArray(resp.tracks) ? resp.tracks : [];
        const meta = resp.album || album;
        currentAlbumTracks = tracks.map(t => ({ id: String(t.id), title: t.title || t.name || 'Unknown', artist: t.artists || meta.artists || 'Unknown', cover: img }));
        if (albumViewMeta) albumViewMeta.textContent = `${meta.artists || meta.channel || 'Unknown'} • ${tracks.length} tracks`;
        albumTracksEl.innerHTML = '';
        tracks.forEach((t, idx) => {
            const row = document.createElement('div');
            row.className = 'album-track-row';
            row.innerHTML = `<span class="track-num">${idx + 1}</span><span class="track-title">${t.title || t.name || 'Unknown'}</span><span class="track-artist">${t.artists || ''}</span><span class="track-duration">${t.duration || ''}</span><button class="track-play-btn" data-idx="${idx}"><i class="fas fa-play"></i></button>`;
            albumTracksEl.appendChild(row);
        });
        albumTracksEl.querySelectorAll('.track-play-btn').forEach(btn => { btn.addEventListener('click', (e) => { setPlayQueue(currentAlbumTracks, parseInt(e.currentTarget.dataset.idx)); }); });
    } catch (e) { console.error('[MUSIC] Album tracks error', e); albumTracksEl.innerHTML = '<p>Failed to load tracks</p>'; }
}

function saveAlbum(album, btn) {
    const list = getMyAlbums();
    if (list.find(x => String(x.id) === String(album.id))) { if (typeof showNotification === 'function') showNotification('Already saved', 'info'); if (btn) btn.classList.add('added'); return; }
    list.push({ id: album.id, title: album.title || album.name || 'Unknown', cover: album.albumArt || album.cover || album.thumbnail, artist: album.artists || album.channel || 'Unknown', numberOfTracks: album.totalTracks || album.nb_tracks || 0 });
    setMyAlbums(list);
    if (typeof showNotification === 'function') showNotification('Album saved', 'success');
    if (btn) btn.classList.add('added');
}

// ========== PLAYER ==========
function updateAutoplayToggleUI() {
    if (!musicAutoplayToggle) return;
    if (musicAutoPlayNext) { musicAutoplayToggle.style.background = 'linear-gradient(135deg, rgba(236,72,153,0.25), rgba(168,85,247,0.25))'; musicAutoplayToggle.style.borderColor = 'rgba(236,72,153,0.55)'; musicAutoplayToggle.style.color = '#fff'; }
    else { musicAutoplayToggle.style.background = 'rgba(236,72,153,0.08)'; musicAutoplayToggle.style.borderColor = 'rgba(236,72,153,0.35)'; musicAutoplayToggle.style.color = '#ec4899'; }
}

function updateTimeDisplays() {
    if (!musicAudio) return;
    const cur = fmtTime(musicAudio.currentTime || 0);
    const tot = fmtTime(musicAudio.duration || 0);
    const p = (musicAudio.currentTime || 0) / (musicAudio.duration || 1) * 100;
    if (musicCurrentTime) musicCurrentTime.textContent = cur;
    if (musicTotalTime) musicTotalTime.textContent = tot;
    if (musicProgressFill) musicProgressFill.style.width = `${p}%`;
    if (miniCurrentTime) miniCurrentTime.textContent = cur;
    if (miniTotalTime) miniTotalTime.textContent = tot;
    if (miniProgressFill) miniProgressFill.style.width = `${p}%`;
}

function minimizeMusicPlayer() { if (musicModal) musicModal.style.display = 'none'; if (miniPlayer) miniPlayer.style.display = 'block'; isPlayerMinimized = true; if (miniPlayPauseBtn && musicAudio) miniPlayPauseBtn.innerHTML = musicAudio.paused ? '<i class="fas fa-play"></i>' : '<i class="fas fa-pause"></i>'; }
function maximizeMusicPlayer() { if (miniPlayer) miniPlayer.style.display = 'none'; if (musicModal) musicModal.style.display = 'flex'; isPlayerMinimized = false; }

function closeMusicModal() {
    try { if (musicAudio) { musicAudio.pause(); musicAudio.removeAttribute('src'); while (musicAudio.firstChild) musicAudio.removeChild(musicAudio.firstChild); musicAudio.load(); } } catch(_) {}
    if (musicProgressFill) musicProgressFill.style.width = '0%';
    if (musicCurrentTime) musicCurrentTime.textContent = '0:00';
    if (musicTotalTime) musicTotalTime.textContent = '0:00';
    if (musicPlayPauseBtn) musicPlayPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    if (musicModal) musicModal.style.display = 'none';
    if (miniPlayer) miniPlayer.style.display = 'none';
    isPlayerMinimized = false;
}

async function playMusicTrack({ trackId, title, artistName, coverSrc }) {
    if (!trackId) { if (typeof showNotification === 'function') showNotification('Missing track ID', 'error'); return; }
    
    // Ensure DOM refs are initialized
    if (!musicAudio) {
        musicAudio = document.getElementById('music-player-audio');
    }
    if (!musicModal) {
        musicModal = document.getElementById('music-player-modal');
    }
    if (!miniPlayer) {
        miniPlayer = document.getElementById('music-mini-player');
    }
    
    if (!musicAudio) { console.error('[MUSIC] musicAudio element not found'); if (typeof showNotification === 'function') showNotification('Player not initialized', 'error'); return; }
    try {
        const downloaded = getDownloadedMusic();
        const downloadedTrack = downloaded.find(t => String(t.id) === String(trackId));
        
        // Show player
        if (isPlayerMinimized) { if (miniPlayer) miniPlayer.style.display = 'block'; if (musicModal) musicModal.style.display = 'none'; }
        else { if (musicModal) musicModal.style.display = 'flex'; if (miniPlayer) miniPlayer.style.display = 'none'; }
        
        // Ensure other DOM refs are initialized
        if (!musicModalTitle) musicModalTitle = document.getElementById('music-player-title');
        if (!musicSongTitle) musicSongTitle = document.getElementById('music-player-song-title');
        if (!musicArtist) musicArtist = document.getElementById('music-player-artist');
        if (!musicCover) musicCover = document.getElementById('music-player-cover');
        if (!musicPlayPauseBtn) musicPlayPauseBtn = document.getElementById('music-play-pause-btn');
        if (!miniPlayerSongTitle) miniPlayerSongTitle = document.getElementById('mini-player-song-title');
        if (!miniPlayerArtist) miniPlayerArtist = document.getElementById('mini-player-artist');
        if (!miniPlayPauseBtn) miniPlayPauseBtn = document.getElementById('mini-play-pause-btn');
        
        if (musicModalTitle) musicModalTitle.textContent = downloadedTrack ? 'Now Playing (Offline)' : 'Now Playing';
        if (musicSongTitle) musicSongTitle.textContent = title;
        if (musicArtist) musicArtist.textContent = artistName;
        if (coverSrc && musicCover) musicCover.src = coverSrc;
        if (musicPlayPauseBtn) musicPlayPauseBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        if (miniPlayerSongTitle) miniPlayerSongTitle.textContent = title;
        if (miniPlayerArtist) miniPlayerArtist.textContent = artistName;
        if (miniPlayPauseBtn) miniPlayPauseBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        let streamUrl;
        if (downloadedTrack && downloadedTrack.filePath) {
            streamUrl = getMusicApiUrl(`/music/serve/${encodeURIComponent(downloadedTrack.filePath)}`);
        } else {
            const apiResp = await musicApiFetch(`/stream-url?trackId=${encodeURIComponent(trackId)}`);
            let rawUrl = apiResp?.streamUrl || '';
            if (!rawUrl) { if (typeof showNotification === 'function') showNotification('Failed to get stream URL', 'error'); closeMusicModal(); return; }
            // The API returns relative URL like /api/proxy-stream?trackId=... so prepend base
            if (rawUrl.startsWith('/api')) {
                const baseUrl = window.API_BASE_URL || 'http://localhost:6987/api';
                streamUrl = baseUrl.replace(/\/api$/, '') + rawUrl;
            } else {
                streamUrl = rawUrl;
            }
        }

        while (musicAudio.firstChild) musicAudio.removeChild(musicAudio.firstChild);
        musicAudio.src = streamUrl;
        musicAudio.load();
        try { await musicAudio.play(); } catch (err) { await new Promise(r => setTimeout(r, 150)); await musicAudio.play(); }
        if (musicPlayPauseBtn) musicPlayPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        if (miniPlayPauseBtn) miniPlayPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        updateTimeDisplays();
    } catch (e) {
        console.error('[MUSIC] Play error', e);
        if (typeof showNotification === 'function') showNotification('Failed to play track', 'error');
        closeMusicModal();
    }
}

function setPlayQueue(tracks, startIndex) {
    if (!Array.isArray(tracks) || tracks.length === 0) { currentPlayQueue = []; currentQueueIndex = 0; return false; }
    currentPlayQueue = tracks;
    currentQueueIndex = Math.max(0, Math.min(startIndex || 0, tracks.length - 1));
    const t = currentPlayQueue[currentQueueIndex];
    playMusicTrack({ trackId: t.id, title: t.title, artistName: t.artist, coverSrc: t.cover });
    return true;
}

function playAllTracks(tracks) {
    if (!tracks || tracks.length === 0) { if (typeof showNotification === 'function') showNotification('No tracks to play', 'info'); return; }
    musicAutoPlayNext = true; try { localStorage.setItem(MUSIC_AUTOPLAY_KEY, '1'); } catch(_) {} updateAutoplayToggleUI();
    currentPlayQueue = tracks; currentQueueIndex = 0;
    playMusicTrack({ trackId: tracks[0].id, title: tracks[0].title, artistName: tracks[0].artist, coverSrc: tracks[0].cover });
    if (typeof showNotification === 'function') showNotification(`Playing ${tracks.length} tracks`, 'success');
}

function playNextInQueue() {
    if (currentPlayQueue.length === 0) return;
    currentQueueIndex++;
    if (currentQueueIndex >= currentPlayQueue.length) { currentPlayQueue = []; currentQueueIndex = 0; if (typeof showNotification === 'function') showNotification('Queue finished', 'info'); if (musicAutoPlayNext) closeMusicModal(); return; }
    const t = currentPlayQueue[currentQueueIndex];
    playMusicTrack({ trackId: t.id, title: t.title, artistName: t.artist, coverSrc: t.cover });
}

function playPreviousInQueue() {
    if (currentPlayQueue.length === 0) return;
    if ((musicAudio?.currentTime || 0) > 3) { try { musicAudio.currentTime = 0; } catch(_) {} return; }
    if (currentQueueIndex <= 0) return;
    currentQueueIndex--;
    const t = currentPlayQueue[currentQueueIndex];
    playMusicTrack({ trackId: t.id, title: t.title, artistName: t.artist, coverSrc: t.cover });
}

function setupPlayerEventListeners() {
    if (musicAudio) {
        musicAudio.addEventListener('timeupdate', updateTimeDisplays);
        musicAudio.addEventListener('loadedmetadata', updateTimeDisplays);
        musicAudio.addEventListener('ended', () => {
            if (musicPlayPauseBtn) musicPlayPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
            if (miniPlayPauseBtn) miniPlayPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
            if (musicAutoPlayNext && currentPlayQueue.length > 0 && currentQueueIndex < currentPlayQueue.length - 1) { setTimeout(() => playNextInQueue(), 400); }
            else if (musicAutoPlayNext) { setTimeout(() => closeMusicModal(), 250); }
        });
    }
    if (musicPlayPauseBtn) musicPlayPauseBtn.addEventListener('click', async () => { if (musicAudio.paused) { await musicAudio.play(); musicPlayPauseBtn.innerHTML = '<i class="fas fa-pause"></i>'; if (miniPlayPauseBtn) miniPlayPauseBtn.innerHTML = '<i class="fas fa-pause"></i>'; } else { musicAudio.pause(); musicPlayPauseBtn.innerHTML = '<i class="fas fa-play"></i>'; if (miniPlayPauseBtn) miniPlayPauseBtn.innerHTML = '<i class="fas fa-play"></i>'; } });
    if (musicBackwardBtn) musicBackwardBtn.addEventListener('click', () => { musicAudio.currentTime = Math.max(0, (musicAudio.currentTime || 0) - 10); updateTimeDisplays(); });
    if (musicForwardBtn) musicForwardBtn.addEventListener('click', () => { musicAudio.currentTime = Math.min(musicAudio.duration || 0, (musicAudio.currentTime || 0) + 10); updateTimeDisplays(); });
    if (musicNextTrackBtn) musicNextTrackBtn.addEventListener('click', () => { if (currentPlayQueue.length && currentQueueIndex < currentPlayQueue.length - 1) playNextInQueue(); else closeMusicModal(); });
    if (musicPrevTrackBtn) musicPrevTrackBtn.addEventListener('click', () => playPreviousInQueue());
    if (musicProgressBar) musicProgressBar.addEventListener('click', (e) => { const rect = musicProgressBar.getBoundingClientRect(); musicAudio.currentTime = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)) * (musicAudio.duration || 0); updateTimeDisplays(); });
    if (musicVolumeSlider) musicVolumeSlider.addEventListener('click', (e) => { const rect = musicVolumeSlider.getBoundingClientRect(); const vol = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)); musicAudio.volume = vol; if (musicVolumeFill) musicVolumeFill.style.width = `${vol * 100}%`; });
    if (musicModalBack) musicModalBack.addEventListener('click', closeMusicModal);
    if (musicModal) musicModal.addEventListener('click', (e) => { if (e.target === musicModal) closeMusicModal(); });
    if (musicModalMinimize) musicModalMinimize.addEventListener('click', () => { minimizeMusicPlayer(); if (miniPlayerSongTitle) miniPlayerSongTitle.textContent = musicSongTitle?.textContent || ''; if (miniPlayerArtist) miniPlayerArtist.textContent = musicArtist?.textContent || ''; });
    if (miniPlayerMaximize) miniPlayerMaximize.addEventListener('click', maximizeMusicPlayer);
    if (miniPlayPauseBtn) miniPlayPauseBtn.addEventListener('click', async () => { if (musicAudio.paused) { await musicAudio.play(); miniPlayPauseBtn.innerHTML = '<i class="fas fa-pause"></i>'; if (musicPlayPauseBtn) musicPlayPauseBtn.innerHTML = '<i class="fas fa-pause"></i>'; } else { musicAudio.pause(); miniPlayPauseBtn.innerHTML = '<i class="fas fa-play"></i>'; if (musicPlayPauseBtn) musicPlayPauseBtn.innerHTML = '<i class="fas fa-play"></i>'; } });
    if (miniBackwardBtn) miniBackwardBtn.addEventListener('click', () => { musicAudio.currentTime = Math.max(0, (musicAudio.currentTime || 0) - 10); updateTimeDisplays(); });
    if (miniForwardBtn) miniForwardBtn.addEventListener('click', () => { musicAudio.currentTime = Math.min(musicAudio.duration || 0, (musicAudio.currentTime || 0) + 10); updateTimeDisplays(); });
    if (musicAutoplayToggle) musicAutoplayToggle.addEventListener('click', () => { musicAutoPlayNext = !musicAutoPlayNext; try { localStorage.setItem(MUSIC_AUTOPLAY_KEY, musicAutoPlayNext ? '1' : '0'); } catch(_) {} updateAutoplayToggleUI(); if (typeof showNotification === 'function') showNotification(`Autoplay ${musicAutoPlayNext ? 'enabled' : 'disabled'}`, 'info'); });
}

// ========== RENDER SECTIONS ==========
function renderMyAlbums() {
    const grid = document.getElementById('my-albums-grid');
    const count = document.getElementById('my-albums-count');
    const empty = document.getElementById('my-albums-empty');
    const albums = getMyAlbums();
    if (!grid) return;
    grid.innerHTML = '';
    if (!albums.length) { if (count) count.textContent = '0 albums'; if (empty) empty.style.display = ''; return; }
    if (empty) empty.style.display = 'none';
    if (count) count.textContent = `${albums.length} albums`;
    albums.forEach(a => {
        const card = document.createElement('div');
        card.className = 'album-card';
        card.innerHTML = `<img loading="lazy" class="album-cover" src="${a.cover || ''}" alt="${a.title}"><div class="album-body"><div class="album-title">${a.title}</div><div class="album-artist">${a.artist || ''}</div><div class="album-meta"><span>${a.numberOfTracks || 0} tracks</span></div><div style="display:flex;gap:0.5rem;"><button class="album-open-btn" data-id="${a.id}"><i class="fas fa-folder-open"></i> Open</button><button class="album-heart-btn added" data-id="${a.id}"><i class="fas fa-trash"></i></button></div></div>`;
        grid.appendChild(card);
    });
    grid.querySelectorAll('.album-open-btn').forEach(btn => { btn.addEventListener('click', () => { const album = getMyAlbums().find(x => String(x.id) === btn.dataset.id); if (album) openAlbum(album); }); });
    grid.querySelectorAll('.album-heart-btn').forEach(btn => { btn.addEventListener('click', () => { setMyAlbums(getMyAlbums().filter(x => String(x.id) !== btn.dataset.id)); renderMyAlbums(); if (typeof showNotification === 'function') showNotification('Removed', 'info'); }); });
}

function renderMyMusic() {
    const grid = document.getElementById('my-music-grid');
    const count = document.getElementById('my-music-count');
    const empty = document.getElementById('my-music-empty');
    const tracks = getMyMusic();
    if (!grid) return;
    grid.innerHTML = '';
    if (!tracks.length) { if (count) count.textContent = '0 tracks'; if (empty) empty.style.display = ''; return; }
    if (empty) empty.style.display = 'none';
    if (count) count.textContent = `${tracks.length} tracks`;
    tracks.forEach((t, idx) => {
        const card = document.createElement('div');
        card.className = 'music-card';
        card.innerHTML = `<div class="music-cover"><img loading="lazy" src="${t.cover || 'https://via.placeholder.com/320x320?text=Music'}" alt="${t.title}"></div><div class="music-info"><div class="music-title">${t.title}</div><div class="music-artist">${t.artist}</div><div class="music-actions"><button class="music-play-btn" data-idx="${idx}"><i class="fas fa-play"></i> Play</button><button class="music-remove-btn" data-id="${t.id}"><i class="fas fa-trash"></i></button></div></div>`;
        grid.appendChild(card);
    });
    grid.querySelectorAll('.music-play-btn').forEach(btn => { btn.addEventListener('click', (e) => { setPlayQueue(tracks, parseInt(e.currentTarget.dataset.idx)); }); });
    grid.querySelectorAll('.music-remove-btn').forEach(btn => { btn.addEventListener('click', (e) => { setMyMusic(getMyMusic().filter(t => t.id !== e.currentTarget.dataset.id)); renderMyMusic(); if (typeof showNotification === 'function') showNotification('Removed', 'info'); }); });
}

function renderDownloadedMusic() {
    const wrap = document.getElementById('music-downloaded');
    if (!wrap) return;
    const grid = document.getElementById('music-downloaded-grid');
    const empty = document.getElementById('music-downloaded-empty');
    const countEl = document.getElementById('music-downloaded-count');
    const downloaded = getDownloadedMusic();
    if (!grid) return;
    grid.innerHTML = '';
    if (!downloaded.length) { if (countEl) countEl.textContent = '0 items'; if (empty) empty.style.display = ''; return; }
    if (empty) empty.style.display = 'none';
    if (countEl) countEl.textContent = `${downloaded.length} items`;
    downloaded.forEach(track => {
        const card = document.createElement('div');
        card.className = 'music-card';
        card.innerHTML = `<div class="music-cover"><img loading="lazy" src="${track.cover}" alt="${track.title}"></div><div class="music-info"><div class="music-title">${track.title}</div><div class="music-artist">${track.artist}</div><div class="music-actions"><button class="music-play-btn" data-id="${track.id}" data-title="${track.title}" data-artist="${track.artist}" data-cover="${track.cover}"><i class="fas fa-play"></i> Play</button><button class="music-folder-btn" data-path="${track.filePath}" title="Open Folder"><i class="fas fa-folder-open"></i></button><button class="music-delete-downloaded-btn" data-id="${track.id}" data-path="${track.filePath}" title="Delete"><i class="fas fa-trash"></i></button></div></div>`;
        grid.appendChild(card);
    });
    grid.querySelectorAll('.music-play-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tracks = downloaded.map(t => ({ id: String(t.id), title: t.title, artist: t.artist, cover: t.cover }));
            const idx = tracks.findIndex(t => String(t.id) === String(e.currentTarget.dataset.id));
            if (idx >= 0) setPlayQueue(tracks, idx);
            else playMusicTrack({ trackId: e.currentTarget.dataset.id, title: e.currentTarget.dataset.title, artistName: e.currentTarget.dataset.artist, coverSrc: e.currentTarget.dataset.cover });
        });
    });
    grid.querySelectorAll('.music-folder-btn').forEach(btn => { btn.addEventListener('click', async (e) => { const filePath = e.currentTarget.dataset.path; if (filePath && window.electronAPI?.showFolderInExplorer) { const lastSlash = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\')); const dirPath = lastSlash > 0 ? filePath.substring(0, lastSlash) : filePath; await window.electronAPI.showFolderInExplorer(dirPath); } }); });
    grid.querySelectorAll('.music-delete-downloaded-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const trackId = e.currentTarget.dataset.id;
            const filePath = e.currentTarget.dataset.path;
            if (!confirm('Delete this downloaded track?')) return;
            try {
                await fetch(getMusicApiUrl('/music/delete'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filePath }) });
                removeFromDownloaded(trackId);
                renderDownloadedMusic();
                if (typeof showNotification === 'function') showNotification('Track deleted', 'success');
                const currentResults = window.currentMusicResults || [];
                if (currentResults.length > 0) displayMusicResults(currentResults, window.currentMusicQuery || '');
            } catch (error) { console.error('Delete error:', error); if (typeof showNotification === 'function') showNotification('Delete failed', 'error'); }
        });
    });
}

function renderPlaylists() {
    const wrap = document.getElementById('music-playlists');
    if (!wrap) return;
    const list = document.getElementById('playlists-list');
    const empty = document.getElementById('playlists-empty');
    const pls = getPlaylists();
    if (!list) return;
    list.innerHTML = '';
    if (!pls.length) { if (empty) empty.style.display = ''; return; }
    if (empty) empty.style.display = 'none';
    pls.forEach(pl => {
        const card = document.createElement('div');
        card.className = 'music-card';
        card.innerHTML = `<div class="music-info"><div class="music-title">${pl.name}</div><div class="music-artist">${(pl.tracks?.length||0)} track${(pl.tracks?.length||0)!==1?'s':''}</div><div class="music-actions"><button class="playlist-open-btn" data-id="${pl.id}"><i class="fas fa-folder-open"></i> Open</button><button class="playlist-delete-btn" data-id="${pl.id}"><i class="fas fa-trash"></i></button></div></div>`;
        list.appendChild(card);
    });
    list.querySelectorAll('.playlist-open-btn').forEach(btn => { btn.addEventListener('click', () => openPlaylist(btn.dataset.id)); });
    list.querySelectorAll('.playlist-delete-btn').forEach(btn => { btn.addEventListener('click', () => { setPlaylists(getPlaylists().filter(p => p.id !== btn.dataset.id)); renderPlaylists(); if (typeof showNotification === 'function') showNotification('Playlist deleted', 'info'); }); });
}

function openPlaylist(id) {
    const pls = getPlaylists();
    const pl = pls.find(p => p.id === id);
    if (!pl) return;
    const resSec = document.getElementById('music-results');
    const empty = document.getElementById('music-empty');
    const plsSec = document.getElementById('music-playlists');
    if (plsSec) plsSec.style.display = 'none';
    if (resSec) resSec.style.display = 'block';
    if (empty) empty.style.display = 'none';
    if (musicResultsTitle) musicResultsTitle.textContent = `Playlist: ${pl.name}`;
    const musicPage = document.getElementById('music-page');
    if (musicPage) musicPage.classList.add('playlist-open');
    const header = resSec?.querySelector('.books-results-header');
    if (header && !header.querySelector('#playlist-close-btn')) {
        const playAllBtn = document.createElement('button'); playAllBtn.id = 'playlist-play-all-btn'; playAllBtn.className = 'action-btn'; playAllBtn.style.background = 'linear-gradient(135deg, #ec4899, #a855f7)'; playAllBtn.innerHTML = '<i class="fas fa-play"></i><span>Play All</span>';
        header.appendChild(playAllBtn);
        playAllBtn.addEventListener('click', () => { if ((pl.tracks || []).length === 0) { if (typeof showNotification === 'function') showNotification('No tracks', 'info'); return; } playAllTracks(pl.tracks); });
        
        // Add Shuffle button next to Play All
        const shuffleBtn = document.createElement('button');
        shuffleBtn.id = 'playlist-shuffle-btn';
        shuffleBtn.className = 'action-btn';
        shuffleBtn.title = 'Shuffle and play this playlist';
        shuffleBtn.innerHTML = '<i class="fas fa-random"></i><span>Shuffle</span>';
        header.appendChild(shuffleBtn);
        shuffleBtn.addEventListener('click', () => {
            const tracks = pl.tracks || [];
            if (tracks.length === 0) { if (typeof showNotification === 'function') showNotification('No tracks', 'info'); return; }
            // Shuffle the tracks
            const shuffled = [...tracks].sort(() => Math.random() - 0.5);
            playAllTracks(shuffled);
            if (typeof showNotification === 'function') showNotification('Shuffling playlist', 'success');
        });
        
        const closeBtn = document.createElement('button'); closeBtn.id = 'playlist-close-btn'; closeBtn.className = 'playlist-close-btn'; closeBtn.style.marginLeft = 'auto'; closeBtn.innerHTML = '<i class="fas fa-times"></i><span>Close</span>';
        header.appendChild(closeBtn);
        closeBtn.addEventListener('click', () => {
            if (musicPage) musicPage.classList.remove('playlist-open');
            document.getElementById('playlist-play-all-btn')?.remove();
            document.getElementById('playlist-shuffle-btn')?.remove();
            document.getElementById('playlist-close-btn')?.remove();
            if (resSec) resSec.style.display = 'none';
            const plsSec2 = document.getElementById('music-playlists');
            if (plsSec2) { plsSec2.style.display = 'block'; renderPlaylists(); }
        });
    }
    const tracks = pl.tracks || [];
    if (musicResultsCount) musicResultsCount.textContent = `${tracks.length} tracks`;
    if (!musicResultsGrid) musicResultsGrid = document.getElementById('music-results-grid');
    musicResultsGrid.innerHTML = '';
    tracks.forEach(t => {
        const card = document.createElement('div');
        card.className = 'music-card';
        card.innerHTML = `<div class="music-cover"><img loading="lazy" src="${t.cover}" alt="${t.title}"></div><div class="music-info"><div class="music-title">${t.title}</div><div class="music-artist">${t.artist}</div><div class="music-actions"><button class="music-play-btn" data-id="${t.id}" data-title="${t.title}" data-artist="${t.artist}" data-cover="${t.cover}"><i class="fas fa-play"></i> Play</button><button class="playlist-remove-btn" data-id="${t.id}" data-pl="${id}"><i class="fas fa-trash"></i></button></div></div>`;
        musicResultsGrid.appendChild(card);
    });
    musicResultsGrid.querySelectorAll('.music-play-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tracksList = (pl.tracks || []).map(t => ({ id: String(t.id), title: t.title, artist: t.artist, cover: t.cover }));
            const idx = tracksList.findIndex(t => String(t.id) === String(e.currentTarget.dataset.id));
            if (idx >= 0) setPlayQueue(tracksList, idx);
        });
    });
    musicResultsGrid.querySelectorAll('.playlist-remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tid = e.currentTarget.dataset.id;
            const pid = e.currentTarget.dataset.pl;
            const pls2 = getPlaylists();
            const pl2 = pls2.find(p => p.id === pid);
            if (pl2) { pl2.tracks = (pl2.tracks || []).filter(t => t.id !== tid); setPlaylists(pls2); openPlaylist(pid); if (typeof showNotification === 'function') showNotification('Removed', 'info'); }
        });
    });
}

function showPlaylistChooser(track) {
    playlistChooserTrack = track;
    const pls = getPlaylists();
    if (!playlistChooser || !playlistChooserList || !playlistChooserEmpty) return;
    playlistChooserList.innerHTML = '';
    if (!pls.length) { playlistChooserEmpty.style.display = ''; }
    else {
        playlistChooserEmpty.style.display = 'none';
        pls.forEach(pl => {
            const row = document.createElement('div');
            row.className = 'music-card';
            row.innerHTML = `<div class="music-info"><div class="music-title">${pl.name}</div><div class="music-artist">${(pl.tracks?.length||0)} tracks</div><div class="music-actions"><button class="playlist-choose-btn" data-id="${pl.id}"><i class="fas fa-check"></i> Add</button></div></div>`;
            playlistChooserList.appendChild(row);
        });
        playlistChooserList.querySelectorAll('.playlist-choose-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const pid = btn.dataset.id;
                const name = getPlaylists().find(p => p.id === pid)?.name || 'playlist';
                const ok = addTrackToPlaylist(pid, playlistChooserTrack);
                if (typeof showNotification === 'function') showNotification(ok ? `Added to ${name}` : 'Already in playlist', ok ? 'success' : 'info');
                closePlaylistChooser();
            });
        });
    }
    playlistChooser.style.display = 'flex';
}

function closePlaylistChooser() { if (playlistChooser) playlistChooser.style.display = 'none'; playlistChooserTrack = null; if (playlistChooserNewName) playlistChooserNewName.value = ''; }

// ========== DOWNLOAD ==========
function updateBothProgressBars(pct, text) {
    const fill = document.getElementById('music-download-progress-fill');
    const status = document.getElementById('music-download-status');
    const minFill = document.getElementById('music-download-minimized-progress-fill');
    const minStatus = document.getElementById('music-download-minimized-status');
    if (fill) fill.style.width = pct;
    if (status) status.textContent = text;
    if (minFill) minFill.style.width = pct;
    if (minStatus) minStatus.textContent = text;
}

async function downloadMusicTrack(trackId, title, artistName, coverSrc) {
    const downloaded = getDownloadedMusic();
    if (downloaded.some(d => String(d.id) === String(trackId))) { if (typeof showNotification === 'function') showNotification(`"${title}" already downloaded`, 'info'); return; }
    if (downloadQueue.some(item => item.trackId === trackId)) { if (typeof showNotification === 'function') showNotification(`"${title}" already in queue`, 'info'); return; }
    if (currentDownloadId || currentDownloadController) { downloadQueue.push({ trackId, title, artistName, coverSrc }); if (typeof showNotification === 'function') showNotification(`"${title}" added to queue`, 'info'); return; }
    await downloadMusicTrackInternal(trackId, title, artistName, coverSrc);
}

async function downloadMusicTrackInternal(trackId, title, artistName, coverSrc) {
    if (currentDownloadId || currentDownloadController) return;
    currentDownloadController = new AbortController();
    currentDownloadFilePath = null;
    isDownloadMinimized = false;
    currentDownloadId = Date.now().toString();
    currentDownloadCancelled = false;

    try {
        const modal = document.getElementById('music-download-modal');
        const minimized = document.getElementById('music-download-minimized');
        const songNameEl = document.getElementById('music-download-song-name');
        const artistNameEl = document.getElementById('music-download-artist-name');
        const minSongEl = document.getElementById('music-download-minimized-song');
        const minArtistEl = document.getElementById('music-download-minimized-artist');

        if (modal) modal.style.display = 'none';
        if (minimized) minimized.style.display = 'block';
        isDownloadMinimized = true;
        if (songNameEl) songNameEl.textContent = title;
        if (artistNameEl) artistNameEl.textContent = artistName;
        if (minSongEl) minSongEl.textContent = title;
        if (minArtistEl) minArtistEl.textContent = artistName;
        updateBothProgressBars('0%', 'Starting download...');

        const downloadId = currentDownloadId;
        const pollProgress = setInterval(async () => {
            try {
                const progressRes = await fetch(getMusicApiUrl(`/music/download/progress/${downloadId}`));
                if (progressRes.ok) {
                    const progressData = await progressRes.json();
                    if (typeof progressData.progress === 'number') {
                        const pct = Math.max(0, Math.min(100, progressData.progress));
                        updateBothProgressBars(`${pct}%`, `Converting... ${pct}%`);
                    }
                    if (progressData.filePath) currentDownloadFilePath = progressData.filePath;
                    if (progressData.complete) { clearInterval(pollProgress); currentDownloadPoll = null; }
                }
            } catch (e) {}
        }, 300);
        currentDownloadPoll = pollProgress;

        fetch(getMusicApiUrl('/music/download'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ trackId, songName: title, artistName, downloadId, cover: coverSrc }),
            signal: currentDownloadController.signal
        }).then(async (downloadRes) => {
            if (!downloadRes.ok) { const err = await downloadRes.json(); throw new Error(err.error || 'Download failed'); }
            const result = await downloadRes.json();
            if (result?.filePath) currentDownloadFilePath = result.filePath;
            const waitForComplete = async () => { while (true) { const progRes = await fetch(getMusicApiUrl(`/music/download/progress/${downloadId}`)); if (progRes.ok) { const progData = await progRes.json(); if (progData.complete) { if (progData.filePath) currentDownloadFilePath = progData.filePath; break; } } await new Promise(r => setTimeout(r, 300)); } };
            await waitForComplete();
            addToDownloaded({ id: String(trackId), title, artist: artistName, cover: coverSrc, filePath: currentDownloadFilePath });
            updateBothProgressBars('100%', '✓ Complete!');
            setTimeout(() => {
                if (modal) modal.style.display = 'none';
                if (minimized) minimized.style.display = 'none';
                currentDownloadController = null; currentDownloadFilePath = null; currentDownloadId = null;
                if (downloadQueue.length > 0) setTimeout(() => processDownloadQueue(), 500);
            }, 1500);
            if (typeof showNotification === 'function') showNotification(`Downloaded "${title}"`, 'success');
            const currentResults = window.currentMusicResults || [];
            if (currentResults.length > 0) displayMusicResults(currentResults, window.currentMusicQuery || '');
        }).catch((error) => {
            clearInterval(pollProgress); currentDownloadPoll = null;
            console.error('Download error:', error);
            if (modal) modal.style.display = 'none';
            if (minimized) minimized.style.display = 'none';
            currentDownloadController = null; currentDownloadFilePath = null; currentDownloadId = null;
            if (error.name === 'AbortError') { if (typeof showNotification === 'function') showNotification('Download cancelled', 'info'); }
            else { if (typeof showNotification === 'function') showNotification(`Download failed: ${error.message}`, 'error'); }
            if (downloadQueue.length > 0) setTimeout(() => processDownloadQueue(), 1000);
        });
    } catch (error) {
        console.error('Initial download error:', error);
        currentDownloadController = null;
        if (typeof showNotification === 'function') showNotification(`Failed: ${error.message}`, 'error');
        if (downloadQueue.length > 0) setTimeout(() => processDownloadQueue(), 1000);
    }
}

function processDownloadQueue() {
    if (downloadQueue.length === 0) return;
    const next = downloadQueue.shift();
    downloadMusicTrackInternal(next.trackId, next.title, next.artistName, next.coverSrc);
}

// ========== PAGE BUTTONS ==========
function setupMusicPageButtons() {
    const myBtn = document.getElementById('music-my-btn');
    const myAlbumsBtn = document.getElementById('music-my-albums-btn');
    const playlistsBtn = document.getElementById('music-playlists-btn');
    const downloadedBtn = document.getElementById('music-downloaded-btn');

    function hideAllSections() {
        ['my-music', 'my-albums', 'music-playlists', 'music-downloaded', 'music-album-view', 'music-albums'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
        if (musicResults) musicResults.style.display = 'none';
        if (musicEmpty) musicEmpty.style.display = 'none';
        const musicPage = document.getElementById('music-page');
        if (musicPage) musicPage.classList.remove('playlist-open');
        document.getElementById('playlist-play-all-btn')?.remove();
        document.getElementById('playlist-close-btn')?.remove();
    }

    if (myBtn) myBtn.onclick = () => { const sec = document.getElementById('my-music'); if (sec?.style.display === 'block') { sec.style.display = 'none'; if (musicResultsGrid?.children.length) musicResults.style.display = 'block'; else if (musicEmpty) musicEmpty.style.display = ''; } else { hideAllSections(); renderMyMusic(); if (sec) sec.style.display = 'block'; } };
    if (myAlbumsBtn) myAlbumsBtn.onclick = () => { const sec = document.getElementById('my-albums'); if (sec?.style.display === 'block') { sec.style.display = 'none'; if (musicResultsGrid?.children.length) musicResults.style.display = 'block'; else if (musicEmpty) musicEmpty.style.display = ''; } else { hideAllSections(); renderMyAlbums(); if (sec) sec.style.display = 'block'; } };
    if (playlistsBtn) playlistsBtn.onclick = () => { const sec = document.getElementById('music-playlists'); if (sec?.style.display === 'block') { sec.style.display = 'none'; if (musicResultsGrid?.children.length) musicResults.style.display = 'block'; else if (musicEmpty) musicEmpty.style.display = ''; } else { hideAllSections(); renderPlaylists(); if (sec) sec.style.display = 'block'; } };
    if (downloadedBtn) downloadedBtn.onclick = () => { const sec = document.getElementById('music-downloaded'); if (sec?.style.display === 'block') { sec.style.display = 'none'; if (musicResultsGrid?.children.length) musicResults.style.display = 'block'; else if (musicEmpty) musicEmpty.style.display = ''; } else { hideAllSections(); renderDownloadedMusic(); if (sec) sec.style.display = 'block'; } };

    const albumViewClose = document.getElementById('album-view-close');
    if (albumViewClose) albumViewClose.addEventListener('click', () => { const albumView = document.getElementById('music-album-view'); if (albumView) albumView.style.display = 'none'; const myAlbums = document.getElementById('my-albums'); if (myAlbums) myAlbums.style.display = 'block'; });

    // Album view buttons
    const albumPlayAllBtn = document.getElementById('album-play-all-btn');
    if (albumPlayAllBtn) {
        albumPlayAllBtn.addEventListener('click', () => {
            if (!currentAlbumTracks || currentAlbumTracks.length === 0) {
                if (typeof showNotification === 'function') showNotification('No tracks to play', 'info');
                return;
            }
            playAllTracks(currentAlbumTracks);
        });
    }

    const albumSaveAllBtn = document.getElementById('album-save-all-btn');
    if (albumSaveAllBtn) {
        albumSaveAllBtn.addEventListener('click', () => {
            if (!currentAlbumTracks || currentAlbumTracks.length === 0) {
                if (typeof showNotification === 'function') showNotification('No tracks to save', 'info');
                return;
            }
            // Show playlist chooser with all tracks
            showPlaylistChooser(currentAlbumTracks[0]);
        });
    }

    const albumShuffleBtn = document.getElementById('album-shuffle-btn');
    if (albumShuffleBtn) {
        albumShuffleBtn.addEventListener('click', () => {
            if (!currentAlbumTracks || currentAlbumTracks.length === 0) {
                if (typeof showNotification === 'function') showNotification('No tracks to shuffle', 'info');
                return;
            }
            const shuffled = [...currentAlbumTracks].sort(() => Math.random() - 0.5);
            playAllTracks(shuffled);
            if (typeof showNotification === 'function') showNotification('Shuffling album', 'success');
        });
    }

    const albumCloseBtn = document.getElementById('album-close-btn');
    if (albumCloseBtn) {
        albumCloseBtn.addEventListener('click', () => {
            const albumView = document.getElementById('music-album-view');
            if (albumView) albumView.style.display = 'none';
            const albumsSection = document.getElementById('music-albums');
            const myAlbums = document.getElementById('my-albums');
            if (albumsSection && albumsSection.children.length > 0) {
                albumsSection.style.display = 'block';
            } else if (myAlbums) {
                myAlbums.style.display = 'block';
            }
        });
    }

    // Playlist chooser events
    if (playlistChooserBack) playlistChooserBack.addEventListener('click', closePlaylistChooser);
    if (playlistChooser) playlistChooser.addEventListener('click', (e) => { if (e.target === playlistChooser) closePlaylistChooser(); });
    if (playlistChooserCreate) playlistChooserCreate.addEventListener('click', () => {
        const name = (playlistChooserNewName?.value || '').trim();
        if (!name) { if (typeof showNotification === 'function') showNotification('Enter a name', 'warning'); return; }
        const pls = getPlaylists();
        if (pls.find(p => p.name.toLowerCase() === name.toLowerCase())) { if (typeof showNotification === 'function') showNotification('Playlist exists', 'info'); return; }
        pls.push({ id: 'pl_' + Math.random().toString(36).slice(2, 10), name, tracks: [] });
        setPlaylists(pls);
        if (playlistChooserNewName) playlistChooserNewName.value = '';
        showPlaylistChooser(playlistChooserTrack);
        if (typeof showNotification === 'function') showNotification('Playlist created', 'success');
    });
}

// ========== EXPORTS ==========
window.initMusic = initMusic;
window.setupMusicPageButtons = setupMusicPageButtons;
window.searchMusic = searchMusic;
window.displayMusicResults = displayMusicResults;
window.searchAlbums = searchAlbums;
window.renderAlbumResults = renderAlbumResults;
window.openAlbum = openAlbum;
window.saveAlbum = saveAlbum;
window.renderMyAlbums = renderMyAlbums;
window.renderMyMusic = renderMyMusic;
window.renderDownloadedMusic = renderDownloadedMusic;
window.renderPlaylists = renderPlaylists;
window.openPlaylist = openPlaylist;
window.showPlaylistChooser = showPlaylistChooser;
window.closePlaylistChooser = closePlaylistChooser;
window.getMyMusic = getMyMusic;
window.setMyMusic = setMyMusic;
window.getMyAlbums = getMyAlbums;
window.setMyAlbums = setMyAlbums;
window.getDownloadedMusic = getDownloadedMusic;
window.setDownloadedMusic = setDownloadedMusic;
window.isTrackDownloaded = isTrackDownloaded;
window.getPlaylists = getPlaylists;
window.setPlaylists = setPlaylists;
window.fmtTime = fmtTime;
window.musicApiFetch = musicApiFetch;
window.playMusicTrack = playMusicTrack;
window.setPlayQueue = setPlayQueue;
window.playAllTracks = playAllTracks;
window.playNextInQueue = playNextInQueue;
window.playPreviousInQueue = playPreviousInQueue;
window.closeMusicModal = closeMusicModal;
window.downloadMusicTrack = downloadMusicTrack;
window.currentPlayQueue = currentPlayQueue;
window.currentQueueIndex = currentQueueIndex;

console.log('[Music] Module loaded');
