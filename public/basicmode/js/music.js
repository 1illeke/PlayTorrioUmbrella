// Music Module for Basic Mode
// Uses the SAME localStorage keys as the main app for shared playlists

// Storage keys - MUST match main app for cross-compatibility
const MY_MUSIC_KEY = 'pt_my_music_v1';
const PLAYLISTS_KEY = 'pt_playlists_v1';
const MY_ALBUMS_KEY = 'pt_my_albums_v1';

// State
let currentView = 'empty'; // 'empty', 'results', 'my-music', 'playlists', 'playlist-view', 'album-view', 'my-albums'
let currentPlaylistId = null;
let currentAlbumData = null;
let currentAlbumTracks = [];
let musicQueue = [];
let currentQueueIndex = 0;
let isPlaying = false;

// Storage helpers - same as main app
function getMyMusic() {
    try { return JSON.parse(localStorage.getItem(MY_MUSIC_KEY) || '[]'); } catch(_) { return []; }
}

function setMyMusic(arr) {
    try { localStorage.setItem(MY_MUSIC_KEY, JSON.stringify(arr)); } catch(_) {}
}

function getPlaylists() {
    try { return JSON.parse(localStorage.getItem(PLAYLISTS_KEY) || '[]'); } catch(_) { return []; }
}

function setPlaylists(arr) {
    try { localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(arr)); } catch(_) {}
}

function getMyAlbums() {
    try { return JSON.parse(localStorage.getItem(MY_ALBUMS_KEY) || '[]'); } catch(_) { return []; }
}

function setMyAlbums(arr) {
    try { localStorage.setItem(MY_ALBUMS_KEY, JSON.stringify(arr)); } catch(_) {}
}

function addTrackToPlaylist(playlistId, track) {
    const pls = getPlaylists();
    const pl = pls.find(p => p.id === playlistId);
    if (!pl) return false;
    if (!pl.tracks) pl.tracks = [];
    if (!pl.tracks.find(t => t.id === track.id)) {
        pl.tracks.push(track);
        setPlaylists(pls);
        return true;
    }
    return false;
}

// DOM Elements
let musicSection, musicLoading, musicEmpty, musicResults, musicResultsGrid;
let myMusicSection, myMusicGrid, myMusicEmpty;
let playlistsSection, playlistsGrid, playlistsEmpty;
let playlistView, playlistTracksGrid, playlistEmpty, playlistViewTitle;
let musicSearchInput, musicSearchBtn;
let musicPlayerModal, musicMiniPlayer, musicAudio;
let playlistChooser, playlistChooserList;

// Initialize DOM references
function initDOMRefs() {
    musicSection = document.getElementById('music-section');
    musicLoading = document.getElementById('music-loading');
    musicEmpty = document.getElementById('music-empty');
    musicResults = document.getElementById('music-results');
    musicResultsGrid = document.getElementById('music-results-grid');
    myMusicSection = document.getElementById('my-music-section');
    myMusicGrid = document.getElementById('my-music-grid');
    myMusicEmpty = document.getElementById('my-music-empty');
    playlistsSection = document.getElementById('playlists-section');
    playlistsGrid = document.getElementById('playlists-grid');
    playlistsEmpty = document.getElementById('playlists-empty');
    playlistView = document.getElementById('playlist-view');
    playlistTracksGrid = document.getElementById('playlist-tracks-grid');
    playlistEmpty = document.getElementById('playlist-empty');
    playlistViewTitle = document.getElementById('playlist-view-title');
    musicSearchInput = document.getElementById('music-search-input');
    musicSearchBtn = document.getElementById('music-search-btn');
    musicPlayerModal = document.getElementById('music-player-modal');
    musicMiniPlayer = document.getElementById('music-mini-player');
    musicAudio = document.getElementById('music-audio');
    playlistChooser = document.getElementById('music-playlist-chooser');
    playlistChooserList = document.getElementById('playlist-chooser-list');
}

// Show notification
function showNotification(message, type = 'info') {
    // Use existing notification system if available
    if (window.showNotification) {
        window.showNotification(message, type);
    } else {
        console.log(`[${type}] ${message}`);
    }
}

// Hide all sub-sections
function hideAllSubSections() {
    if (musicEmpty) musicEmpty.classList.add('hidden');
    if (musicResults) musicResults.classList.add('hidden');
    if (myMusicSection) myMusicSection.classList.add('hidden');
    if (playlistsSection) playlistsSection.classList.add('hidden');
    if (playlistView) playlistView.classList.add('hidden');
    if (musicLoading) musicLoading.classList.add('hidden');
    
    const albumView = document.getElementById('album-view');
    const myAlbumsSection = document.getElementById('my-albums-section');
    if (albumView) albumView.classList.add('hidden');
    if (myAlbumsSection) myAlbumsSection.classList.add('hidden');
}

// Show a specific view
function showView(view) {
    hideAllSubSections();
    currentView = view;
    
    switch(view) {
        case 'empty':
            if (musicEmpty) musicEmpty.classList.remove('hidden');
            break;
        case 'results':
            if (musicResults) musicResults.classList.remove('hidden');
            break;
        case 'my-music':
            if (myMusicSection) myMusicSection.classList.remove('hidden');
            renderMyMusic();
            break;
        case 'playlists':
            if (playlistsSection) playlistsSection.classList.remove('hidden');
            renderPlaylists();
            break;
        case 'playlist-view':
            if (playlistView) playlistView.classList.remove('hidden');
            break;
        case 'album-view':
            const albumView = document.getElementById('album-view');
            if (albumView) albumView.classList.remove('hidden');
            break;
        case 'my-albums':
            const myAlbumsSection = document.getElementById('my-albums-section');
            if (myAlbumsSection) myAlbumsSection.classList.remove('hidden');
            renderMyAlbums();
            break;
        case 'loading':
            if (musicLoading) musicLoading.classList.remove('hidden');
            break;
    }
}

// Search music via API (same as main app) - searches both tracks and albums
async function searchMusic(query) {
    if (!query.trim()) return;
    
    showView('loading');
    
    try {
        // Search for both tracks and albums in parallel
        const [tracksRes, albumsRes] = await Promise.all([
            fetch(`/api/search?q=${encodeURIComponent(query)}&type=track&limit=30`),
            fetch(`/api/search?q=${encodeURIComponent(query)}&type=album&limit=20`)
        ]);
        
        let tracks = [];
        let albums = [];
        
        if (tracksRes.ok) {
            const tracksData = await tracksRes.json();
            const items = Array.isArray(tracksData?.results) ? tracksData.results : [];
            tracks = items.map(it => ({
                id: it.id,
                title: it.title || it.name || 'Unknown Title',
                artist: it.artists || 'Unknown Artist',
                cover: it.albumArt || ''
            }));
        }
        
        if (albumsRes.ok) {
            const albumsData = await albumsRes.json();
            const items = Array.isArray(albumsData?.results) ? albumsData.results : [];
            albums = items.map(it => ({
                id: it.id,
                name: it.title || it.name || 'Unknown Album',
                artist: it.artists || 'Unknown Artist',
                cover: it.albumArt || '',
                totalTracks: it.totalTracks || 0,
                releaseDate: it.releaseDate || ''
            }));
        }
        
        renderSearchResults(tracks, albums, query);
        showView('results');
    } catch (err) {
        console.error('Music search error:', err);
        showNotification('Failed to search music', 'error');
        showView('empty');
    }
}

// Render search results with albums and tracks
function renderSearchResults(tracks, albums = [], query = '') {
    if (!musicResultsGrid) return;
    
    const resultsTitle = document.getElementById('music-results-title');
    const resultsCount = document.getElementById('music-results-count');
    
    if (resultsTitle) resultsTitle.textContent = query ? `Results for "${query}"` : 'Search Results';
    if (resultsCount) resultsCount.textContent = `${tracks.length} songs, ${albums.length} albums`;
    
    musicResultsGrid.innerHTML = '';
    
    // Render tracks section FIRST
    if (tracks.length > 0) {
        const tracksHeader = document.createElement('div');
        tracksHeader.className = 'col-span-full mb-2 mt-4';
        tracksHeader.innerHTML = `
            <h4 class="text-lg font-semibold text-white flex items-center gap-2">
                <svg class="w-5 h-5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
                </svg>
                Songs
            </h4>
        `;
        musicResultsGrid.appendChild(tracksHeader);
        
        tracks.forEach(track => {
            const card = createTrackCard(track);
            musicResultsGrid.appendChild(card);
        });
    }
    
    // Render albums section AFTER tracks
    if (albums.length > 0) {
        const albumsHeader = document.createElement('div');
        albumsHeader.className = 'col-span-full mb-2 mt-6';
        albumsHeader.innerHTML = `
            <h4 class="text-lg font-semibold text-white flex items-center gap-2">
                <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke-width="2"/>
                    <circle cx="12" cy="12" r="3" stroke-width="2"/>
                </svg>
                Albums
            </h4>
        `;
        musicResultsGrid.appendChild(albumsHeader);
        
        albums.forEach(album => {
            const card = createAlbumCard(album);
            musicResultsGrid.appendChild(card);
        });
    }
    
    if (albums.length === 0 && tracks.length === 0) {
        musicResultsGrid.innerHTML = `
            <div class="col-span-full text-center text-gray-400 py-12">
                <p class="text-xl">No results found</p>
                <p class="text-sm mt-2">Try a different search term</p>
            </div>
        `;
    }
}


// Create a track card element
function createTrackCard(track) {
    const isSaved = getMyMusic().some(t => t.id === track.id);
    
    const card = document.createElement('div');
    card.className = 'bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden hover:border-pink-500/50 transition-all group';
    
    const coverUrl = track.cover || track.album?.images?.[0]?.url || 'https://via.placeholder.com/200x200/1a1a2e/ec4899?text=♪';
    const title = track.title || track.name || 'Unknown';
    const artist = track.artist || track.artists?.map(a => a.name).join(', ') || 'Unknown Artist';
    
    card.innerHTML = `
        <div class="relative aspect-square">
            <img src="${coverUrl}" alt="${title}" class="w-full h-full object-cover">
            <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button class="play-btn w-12 h-12 rounded-full bg-pink-600 hover:bg-pink-500 flex items-center justify-center text-white transition-colors" data-id="${track.id}" data-title="${title.replace(/"/g, '&quot;')}" data-artist="${artist.replace(/"/g, '&quot;')}" data-cover="${coverUrl}">
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                </button>
            </div>
        </div>
        <div class="p-3">
            <p class="text-sm font-medium text-white truncate">${title}</p>
            <p class="text-xs text-gray-400 truncate">${artist}</p>
            <div class="flex items-center gap-2 mt-2">
                <button class="heart-btn p-1.5 rounded-lg ${isSaved ? 'bg-pink-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-pink-400'} transition-colors" data-id="${track.id}" data-title="${title.replace(/"/g, '&quot;')}" data-artist="${artist.replace(/"/g, '&quot;')}" data-cover="${coverUrl}">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                </button>
                <button class="add-playlist-btn p-1.5 rounded-lg bg-gray-700 text-gray-400 hover:text-blue-400 transition-colors" data-id="${track.id}" data-title="${title.replace(/"/g, '&quot;')}" data-artist="${artist.replace(/"/g, '&quot;')}" data-cover="${coverUrl}">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                </button>
            </div>
        </div>
    `;
    
    // Event listeners
    card.querySelector('.play-btn').addEventListener('click', (e) => {
        const btn = e.currentTarget;
        playTrack({
            id: btn.dataset.id,
            title: btn.dataset.title,
            artist: btn.dataset.artist,
            cover: btn.dataset.cover
        });
    });
    
    card.querySelector('.heart-btn').addEventListener('click', (e) => {
        const btn = e.currentTarget;
        toggleSaveTrack({
            id: btn.dataset.id,
            title: btn.dataset.title,
            artist: btn.dataset.artist,
            cover: btn.dataset.cover
        }, btn);
    });
    
    card.querySelector('.add-playlist-btn').addEventListener('click', (e) => {
        const btn = e.currentTarget;
        openPlaylistChooser({
            id: btn.dataset.id,
            title: btn.dataset.title,
            artist: btn.dataset.artist,
            cover: btn.dataset.cover
        });
    });
    
    return card;
}

// Create an album card element
function createAlbumCard(album) {
    const isSaved = getMyAlbums().some(a => String(a.id) === String(album.id));
    
    const card = document.createElement('div');
    card.className = 'bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden hover:border-blue-500/50 transition-all group cursor-pointer';
    
    const coverUrl = album.cover || album.albumArt || 'https://via.placeholder.com/200x200/1a1a2e/3b82f6?text=♪';
    const name = album.name || album.title || 'Unknown Album';
    const artist = album.artist || album.artists || 'Unknown Artist';
    const trackCount = album.totalTracks || '';
    
    card.innerHTML = `
        <div class="relative aspect-square">
            <img src="${coverUrl}" alt="${name}" class="w-full h-full object-cover">
            <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button class="open-album-btn w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-500 flex items-center justify-center text-white transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>
                </button>
            </div>
            <div class="absolute top-2 right-2">
                <span class="px-2 py-1 rounded-full bg-blue-600/80 text-white text-xs font-medium">Album</span>
            </div>
        </div>
        <div class="p-3">
            <p class="text-sm font-medium text-white truncate">${name}</p>
            <p class="text-xs text-gray-400 truncate">${artist}</p>
            ${trackCount ? `<p class="text-xs text-gray-500 mt-1">${trackCount} tracks</p>` : ''}
            <div class="flex items-center gap-2 mt-2">
                <button class="album-heart-btn p-1.5 rounded-lg ${isSaved ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-blue-400'} transition-colors" data-id="${album.id}">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                </button>
            </div>
        </div>
    `;
    
    // Normalize album data for saving/opening
    const normalizedAlbum = {
        id: album.id,
        name: name,
        artist: artist,
        cover: coverUrl,
        totalTracks: trackCount,
        releaseDate: album.releaseDate || ''
    };
    
    // Open album on click
    card.querySelector('.open-album-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        openAlbum(normalizedAlbum);
    });
    
    // Also open on card click
    card.addEventListener('click', () => openAlbum(normalizedAlbum));
    
    // Save album
    card.querySelector('.album-heart-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleSaveAlbum(normalizedAlbum, e.currentTarget);
    });
    
    return card;
}

// Toggle save album to My Albums
function toggleSaveAlbum(album, btn) {
    const saved = getMyAlbums();
    const exists = saved.find(a => String(a.id) === String(album.id));
    
    if (exists) {
        const filtered = saved.filter(a => String(a.id) !== String(album.id));
        setMyAlbums(filtered);
        btn.classList.remove('bg-blue-600', 'text-white');
        btn.classList.add('bg-gray-700', 'text-gray-400');
        showNotification('Removed from My Albums', 'info');
    } else {
        saved.push(album);
        setMyAlbums(saved);
        btn.classList.add('bg-blue-600', 'text-white');
        btn.classList.remove('bg-gray-700', 'text-gray-400');
        showNotification(`Added "${album.name}" to My Albums`, 'success');
    }
}

// Open album and show tracks
async function openAlbum(album) {
    currentAlbumData = album;
    currentAlbumTracks = [];
    
    // Show album view with loading state
    showView('album-view');
    
    const albumViewTitle = document.getElementById('album-view-title');
    const albumViewArtist = document.getElementById('album-view-artist');
    const albumViewCover = document.getElementById('album-view-cover');
    const albumTracksGrid = document.getElementById('album-tracks-grid');
    
    if (albumViewTitle) albumViewTitle.textContent = album.name || 'Album';
    if (albumViewArtist) albumViewArtist.textContent = album.artist || 'Unknown Artist';
    if (albumViewCover) albumViewCover.src = album.cover || 'https://via.placeholder.com/200x200/1a1a2e/3b82f6?text=♪';
    if (albumTracksGrid) albumTracksGrid.innerHTML = '<div class="col-span-full text-center py-8"><div class="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div><p class="text-gray-400 mt-2">Loading tracks...</p></div>';
    
    try {
        const res = await fetch(`/api/album/${encodeURIComponent(album.id)}/tracks`);
        if (!res.ok) throw new Error('Failed to load album');
        const data = await res.json();
        
        const tracks = Array.isArray(data.tracks) ? data.tracks : [];
        const albumMeta = data.album || {};
        
        // Update album info if we got more details
        if (albumMeta.name && albumViewTitle) albumViewTitle.textContent = albumMeta.name;
        if (albumMeta.artists && albumViewArtist) albumViewArtist.textContent = albumMeta.artists;
        if (albumMeta.albumArt && albumViewCover) albumViewCover.src = albumMeta.albumArt;
        
        // Build track list for queue
        currentAlbumTracks = tracks.map((t, idx) => ({
            id: t.id || idx + 1,
            title: t.title || t.name || `Track ${idx + 1}`,
            artist: t.artists || albumMeta.artists || album.artist || 'Unknown Artist',
            cover: albumMeta.albumArt || album.cover || ''
        }));
        
        renderAlbumTracks(tracks, albumMeta.albumArt || album.cover, albumMeta.artists || album.artist);
    } catch (err) {
        console.error('Failed to load album:', err);
        if (albumTracksGrid) albumTracksGrid.innerHTML = '<div class="col-span-full text-center text-red-400 py-8">Failed to load album tracks</div>';
    }
}

// Render album tracks
function renderAlbumTracks(tracks, coverUrl, artistName) {
    const albumTracksGrid = document.getElementById('album-tracks-grid');
    if (!albumTracksGrid) return;
    
    if (tracks.length === 0) {
        albumTracksGrid.innerHTML = '<div class="col-span-full text-center text-gray-400 py-8">No tracks found</div>';
        return;
    }
    
    albumTracksGrid.innerHTML = '';
    
    tracks.forEach((track, idx) => {
        const trackId = track.id || idx + 1;
        const title = track.title || track.name || `Track ${idx + 1}`;
        const artist = track.artists || artistName || 'Unknown Artist';
        const isSaved = getMyMusic().some(t => String(t.id) === String(trackId));
        
        const row = document.createElement('div');
        row.className = 'flex items-center gap-3 p-3 rounded-lg bg-gray-800/30 hover:bg-gray-800/60 transition-colors group';
        
        row.innerHTML = `
            <span class="w-8 text-center text-gray-500 text-sm">${idx + 1}</span>
            <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-white truncate">${title}</p>
                <p class="text-xs text-gray-400 truncate">${artist}</p>
            </div>
            <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button class="track-play-btn p-2 rounded-full bg-pink-600 hover:bg-pink-500 text-white transition-colors" data-idx="${idx}">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                </button>
                <button class="track-heart-btn p-2 rounded-full ${isSaved ? 'bg-pink-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-pink-400'} transition-colors" data-id="${trackId}" data-title="${title.replace(/"/g, '&quot;')}" data-artist="${artist.replace(/"/g, '&quot;')}" data-cover="${coverUrl || ''}">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                </button>
            </div>
        `;
        
        // Play track
        row.querySelector('.track-play-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = parseInt(e.currentTarget.dataset.idx);
            if (currentAlbumTracks.length > 0) {
                playTrack(currentAlbumTracks[idx], currentAlbumTracks, idx);
            }
        });
        
        // Save track
        row.querySelector('.track-heart-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            const btn = e.currentTarget;
            toggleSaveTrack({
                id: btn.dataset.id,
                title: btn.dataset.title,
                artist: btn.dataset.artist,
                cover: btn.dataset.cover
            }, btn);
        });
        
        albumTracksGrid.appendChild(row);
    });
}

// Render My Albums
function renderMyAlbums() {
    const myAlbumsGrid = document.getElementById('my-albums-grid');
    const myAlbumsEmpty = document.getElementById('my-albums-empty');
    if (!myAlbumsGrid) return;
    
    const albums = getMyAlbums();
    myAlbumsGrid.innerHTML = '';
    
    if (albums.length === 0) {
        if (myAlbumsEmpty) myAlbumsEmpty.classList.remove('hidden');
        return;
    }
    
    if (myAlbumsEmpty) myAlbumsEmpty.classList.add('hidden');
    
    albums.forEach(album => {
        const card = createAlbumCard(album);
        myAlbumsGrid.appendChild(card);
    });
}

// Toggle save track to My Music
function toggleSaveTrack(track, btn) {
    const saved = getMyMusic();
    const exists = saved.find(t => t.id === track.id);
    
    if (exists) {
        // Remove from My Music
        const filtered = saved.filter(t => t.id !== track.id);
        setMyMusic(filtered);
        btn.classList.remove('bg-pink-600', 'text-white');
        btn.classList.add('bg-gray-700', 'text-gray-400');
        showNotification('Removed from My Music', 'info');
    } else {
        // Add to My Music
        saved.push(track);
        setMyMusic(saved);
        btn.classList.add('bg-pink-600', 'text-white');
        btn.classList.remove('bg-gray-700', 'text-gray-400');
        showNotification(`Added "${track.title}" to My Music`, 'success');
    }
}

// Render My Music
function renderMyMusic() {
    if (!myMusicGrid) return;
    
    const tracks = getMyMusic();
    myMusicGrid.innerHTML = '';
    
    if (tracks.length === 0) {
        if (myMusicEmpty) myMusicEmpty.classList.remove('hidden');
        return;
    }
    
    if (myMusicEmpty) myMusicEmpty.classList.add('hidden');
    
    tracks.forEach(track => {
        const card = createTrackCard(track);
        myMusicGrid.appendChild(card);
    });
}

// Render Playlists
function renderPlaylists() {
    if (!playlistsGrid) return;
    
    const playlists = getPlaylists();
    playlistsGrid.innerHTML = '';
    
    if (playlists.length === 0) {
        if (playlistsEmpty) playlistsEmpty.classList.remove('hidden');
        return;
    }
    
    if (playlistsEmpty) playlistsEmpty.classList.add('hidden');
    
    playlists.forEach(pl => {
        const card = document.createElement('div');
        card.className = 'bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden hover:border-blue-500/50 transition-all cursor-pointer group';
        
        const trackCount = pl.tracks ? pl.tracks.length : 0;
        const coverUrl = pl.tracks?.[0]?.cover || 'https://via.placeholder.com/200x200/1a1a2e/3b82f6?text=♪';
        
        card.innerHTML = `
            <div class="relative aspect-square bg-gradient-to-br from-blue-600/20 to-purple-600/20">
                <img src="${coverUrl}" alt="${pl.name}" class="w-full h-full object-cover opacity-80">
                <div class="absolute inset-0 flex items-center justify-center">
                    <svg class="w-12 h-12 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>
                </div>
            </div>
            <div class="p-3">
                <p class="text-sm font-medium text-white truncate">${pl.name}</p>
                <p class="text-xs text-gray-400">${trackCount} tracks</p>
            </div>
        `;
        
        card.addEventListener('click', () => openPlaylist(pl.id));
        playlistsGrid.appendChild(card);
    });
}

// Open a specific playlist
function openPlaylist(playlistId) {
    const playlists = getPlaylists();
    const pl = playlists.find(p => p.id === playlistId);
    if (!pl) return;
    
    currentPlaylistId = playlistId;
    
    if (playlistViewTitle) playlistViewTitle.textContent = pl.name;
    if (playlistTracksGrid) playlistTracksGrid.innerHTML = '';
    
    if (!pl.tracks || pl.tracks.length === 0) {
        if (playlistEmpty) playlistEmpty.classList.remove('hidden');
    } else {
        if (playlistEmpty) playlistEmpty.classList.add('hidden');
        pl.tracks.forEach(track => {
            const card = createTrackCard(track);
            // Add remove button for playlist tracks
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-from-playlist p-1.5 rounded-lg bg-gray-700 text-gray-400 hover:text-red-400 transition-colors';
            removeBtn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>';
            removeBtn.dataset.id = track.id;
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                removeTrackFromPlaylist(playlistId, track.id);
            });
            card.querySelector('.p-3 .flex').appendChild(removeBtn);
            playlistTracksGrid.appendChild(card);
        });
    }
    
    showView('playlist-view');
}

// Remove track from playlist
function removeTrackFromPlaylist(playlistId, trackId) {
    const playlists = getPlaylists();
    const pl = playlists.find(p => p.id === playlistId);
    if (!pl || !pl.tracks) return;
    
    pl.tracks = pl.tracks.filter(t => t.id !== trackId);
    setPlaylists(playlists);
    openPlaylist(playlistId); // Refresh view
    showNotification('Removed from playlist', 'info');
}

// Create new playlist
function createPlaylist(name) {
    if (!name.trim()) return;
    
    const playlists = getPlaylists();
    const newPlaylist = {
        id: 'pl_' + Date.now(),
        name: name.trim(),
        tracks: [],
        createdAt: new Date().toISOString()
    };
    
    playlists.push(newPlaylist);
    setPlaylists(playlists);
    showNotification(`Created playlist "${name}"`, 'success');
    renderPlaylists();
    
    return newPlaylist;
}

// Delete playlist
function deletePlaylist(playlistId) {
    const playlists = getPlaylists().filter(p => p.id !== playlistId);
    setPlaylists(playlists);
    showNotification('Playlist deleted', 'info');
    showView('playlists');
}


// Open playlist chooser modal
let pendingTrackForPlaylist = null;

function openPlaylistChooser(track) {
    pendingTrackForPlaylist = track;
    
    if (!playlistChooser) return;
    
    const playlists = getPlaylists();
    const chooserEmpty = document.getElementById('playlist-chooser-empty');
    
    if (playlistChooserList) {
        playlistChooserList.innerHTML = '';
        
        if (playlists.length === 0) {
            if (chooserEmpty) chooserEmpty.classList.remove('hidden');
        } else {
            if (chooserEmpty) chooserEmpty.classList.add('hidden');
            
            playlists.forEach(pl => {
                const item = document.createElement('button');
                item.className = 'w-full p-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-left transition-colors flex items-center justify-between';
                item.innerHTML = `
                    <span class="text-white">${pl.name}</span>
                    <span class="text-xs text-gray-400">${pl.tracks?.length || 0} tracks</span>
                `;
                item.addEventListener('click', () => {
                    if (pendingTrackForPlaylist) {
                        const added = addTrackToPlaylist(pl.id, pendingTrackForPlaylist);
                        if (added) {
                            showNotification(`Added to "${pl.name}"`, 'success');
                        } else {
                            showNotification('Track already in playlist', 'info');
                        }
                    }
                    closePlaylistChooser();
                });
                playlistChooserList.appendChild(item);
            });
        }
    }
    
    playlistChooser.classList.remove('hidden');
}

function closePlaylistChooser() {
    if (playlistChooser) playlistChooser.classList.add('hidden');
    pendingTrackForPlaylist = null;
}

// Music Player Functions
let currentTrack = null;

async function playTrack(track, queue = null, index = 0) {
    currentTrack = track;
    
    if (queue) {
        musicQueue = queue;
        currentQueueIndex = index;
    } else {
        musicQueue = [track];
        currentQueueIndex = 0;
    }
    
    // Update player UI immediately with loading state
    const playerCover = document.getElementById('music-player-cover');
    const playerTitle = document.getElementById('music-player-title');
    const playerArtist = document.getElementById('music-player-artist');
    const miniCover = document.getElementById('mini-player-cover');
    const miniTitle = document.getElementById('mini-player-title');
    const miniArtist = document.getElementById('mini-player-artist');
    const playPauseBtn = document.getElementById('music-play-pause-btn');
    const playIcon = document.getElementById('music-play-icon');
    const pauseIcon = document.getElementById('music-pause-icon');
    
    if (playerCover) playerCover.src = track.cover || 'https://via.placeholder.com/200x200/1a1a2e/ec4899?text=♪';
    if (playerTitle) playerTitle.textContent = track.title || 'Unknown';
    if (playerArtist) playerArtist.textContent = track.artist || 'Unknown Artist';
    if (miniCover) miniCover.src = track.cover || 'https://via.placeholder.com/200x200/1a1a2e/ec4899?text=♪';
    if (miniTitle) miniTitle.textContent = track.title || 'Unknown';
    if (miniArtist) miniArtist.textContent = track.artist || 'Unknown Artist';
    
    // Show loading state on play button
    if (playPauseBtn) {
        playPauseBtn.innerHTML = '<div class="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>';
    }
    
    // Show player immediately with loading state
    showMusicPlayer();
    
    // Reset progress
    const progressFill = document.getElementById('music-progress-fill');
    const miniProgressFill = document.getElementById('mini-progress-fill');
    const currentTime = document.getElementById('music-current-time');
    const totalTime = document.getElementById('music-total-time');
    if (progressFill) progressFill.style.width = '0%';
    if (miniProgressFill) miniProgressFill.style.width = '0%';
    if (currentTime) currentTime.textContent = '0:00';
    if (totalTime) totalTime.textContent = '0:00';
    
    // Get stream URL using direct URL (FASTER - no proxy)
    try {
        const res = await fetch(`/api/direct-stream-url?trackId=${encodeURIComponent(track.id)}`);
        if (!res.ok) throw new Error('Failed to get stream URL');
        const data = await res.json();
        
        const streamUrl = data?.streamUrl;
        if (!streamUrl) {
            throw new Error('No stream URL returned');
        }
        
        if (musicAudio) {
            musicAudio.src = streamUrl;
            musicAudio.load();
            await musicAudio.play();
            isPlaying = true;
            updatePlayPauseUI();
        }
    } catch (err) {
        console.error('Play error:', err);
        showNotification('Failed to play track', 'error');
        // Reset play button on error
        updatePlayPauseUI();
    }
}

function togglePlayPause() {
    if (!musicAudio) return;
    
    if (musicAudio.paused) {
        musicAudio.play();
        isPlaying = true;
    } else {
        musicAudio.pause();
        isPlaying = false;
    }
    updatePlayPauseUI();
}

function updatePlayPauseUI() {
    const playPauseBtn = document.getElementById('music-play-pause-btn');
    const miniPlayPauseBtn = document.getElementById('mini-play-pause-btn');
    
    // Restore the proper icons in the main play button
    if (playPauseBtn) {
        if (isPlaying) {
            playPauseBtn.innerHTML = `
                <svg id="music-pause-icon" class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            `;
        } else {
            playPauseBtn.innerHTML = `
                <svg id="music-play-icon" class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            `;
        }
    }
    
    // Update mini player button
    const miniPlayIcon = document.getElementById('mini-play-icon');
    const miniPauseIcon = document.getElementById('mini-pause-icon');
    
    if (isPlaying) {
        if (miniPlayIcon) miniPlayIcon.classList.add('hidden');
        if (miniPauseIcon) miniPauseIcon.classList.remove('hidden');
    } else {
        if (miniPlayIcon) miniPlayIcon.classList.remove('hidden');
        if (miniPauseIcon) miniPauseIcon.classList.add('hidden');
    }
}

function playNext() {
    if (musicQueue.length === 0) return;
    currentQueueIndex = (currentQueueIndex + 1) % musicQueue.length;
    playTrack(musicQueue[currentQueueIndex], musicQueue, currentQueueIndex);
}

function playPrev() {
    if (musicQueue.length === 0) return;
    currentQueueIndex = (currentQueueIndex - 1 + musicQueue.length) % musicQueue.length;
    playTrack(musicQueue[currentQueueIndex], musicQueue, currentQueueIndex);
}

function showMusicPlayer() {
    if (musicPlayerModal) musicPlayerModal.classList.remove('hidden');
    if (musicMiniPlayer) musicMiniPlayer.classList.add('hidden');
}

function hideMusicPlayer() {
    if (musicPlayerModal) musicPlayerModal.classList.add('hidden');
    if (musicMiniPlayer) musicMiniPlayer.classList.add('hidden');
    // Stop the music when closing
    if (musicAudio) {
        musicAudio.pause();
        musicAudio.currentTime = 0;
        musicAudio.src = '';
    }
    isPlaying = false;
    updatePlayPauseUI();
}

function minimizeMusicPlayer() {
    if (musicPlayerModal) musicPlayerModal.classList.add('hidden');
    if (musicMiniPlayer) musicMiniPlayer.classList.remove('hidden');
}

function expandMusicPlayer() {
    if (musicMiniPlayer) musicMiniPlayer.classList.add('hidden');
    if (musicPlayerModal) musicPlayerModal.classList.remove('hidden');
}

// Format time helper
function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Update progress bar
function updateProgress() {
    if (!musicAudio) return;
    
    const currentTimeEl = document.getElementById('music-current-time');
    const totalTime = document.getElementById('music-total-time');
    const progressFill = document.getElementById('music-progress-fill');
    const miniProgressFill = document.getElementById('mini-progress-fill');
    const playPauseBtn = document.getElementById('music-play-pause-btn');
    
    const current = musicAudio.currentTime;
    const duration = musicAudio.duration || 0;
    const percent = duration > 0 ? (current / duration) * 100 : 0;
    
    if (currentTimeEl) currentTimeEl.textContent = formatTime(current);
    if (totalTime) totalTime.textContent = formatTime(duration);
    if (progressFill) progressFill.style.width = `${percent}%`;
    if (miniProgressFill) miniProgressFill.style.width = `${percent}%`;
    
    // If time is 0:00 and we're supposed to be playing, show loading spinner
    // Otherwise show the proper play/pause button
    if (current === 0 && isPlaying && playPauseBtn) {
        const hasSpinner = playPauseBtn.querySelector('.animate-spin');
        if (!hasSpinner) {
            playPauseBtn.innerHTML = '<div class="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>';
        }
    } else if (current > 0) {
        // Music has started, update to proper play/pause UI
        updatePlayPauseUI();
    }
}

// Seek to position
function seekTo(e, progressBar) {
    if (!musicAudio || !progressBar) return;
    
    const rect = progressBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    musicAudio.currentTime = percent * musicAudio.duration;
}

// Set volume
function setVolume(e, volumeBar) {
    if (!musicAudio || !volumeBar) return;
    
    const rect = volumeBar.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    musicAudio.volume = percent;
    
    const volumeFill = document.getElementById('music-volume-fill');
    if (volumeFill) volumeFill.style.width = `${percent * 100}%`;
}

// Play all tracks from a list
function playAll(tracks, shuffle = false) {
    if (!tracks || tracks.length === 0) {
        showNotification('No tracks to play', 'info');
        return;
    }
    
    let queue = [...tracks];
    if (shuffle) {
        // Fisher-Yates shuffle
        for (let i = queue.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [queue[i], queue[j]] = [queue[j], queue[i]];
        }
    }
    
    playTrack(queue[0], queue, 0);
}


// Initialize Music Module
export function initMusic() {
    initDOMRefs();
    
    if (!musicSection) return;
    
    // Search functionality
    if (musicSearchBtn) {
        musicSearchBtn.addEventListener('click', () => {
            const query = musicSearchInput?.value || '';
            searchMusic(query);
        });
    }
    
    if (musicSearchInput) {
        musicSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchMusic(musicSearchInput.value);
            }
        });
    }
    
    // My Music button
    const myMusicBtn = document.getElementById('music-my-btn');
    if (myMusicBtn) {
        myMusicBtn.addEventListener('click', () => showView('my-music'));
    }
    
    // Playlists button
    const playlistsBtn = document.getElementById('music-playlists-btn');
    if (playlistsBtn) {
        playlistsBtn.addEventListener('click', () => showView('playlists'));
    }
    
    // Create playlist
    const createPlaylistBtn = document.getElementById('create-playlist-btn');
    const newPlaylistInput = document.getElementById('new-playlist-name');
    if (createPlaylistBtn && newPlaylistInput) {
        createPlaylistBtn.addEventListener('click', () => {
            createPlaylist(newPlaylistInput.value);
            newPlaylistInput.value = '';
        });
    }
    
    // Playlist back button
    const playlistBackBtn = document.getElementById('playlist-back-btn');
    if (playlistBackBtn) {
        playlistBackBtn.addEventListener('click', () => showView('playlists'));
    }
    
    // Playlist delete button
    const playlistDeleteBtn = document.getElementById('playlist-delete-btn');
    if (playlistDeleteBtn) {
        playlistDeleteBtn.addEventListener('click', () => {
            if (currentPlaylistId && confirm('Delete this playlist?')) {
                deletePlaylist(currentPlaylistId);
            }
        });
    }
    
    // My Music play all / shuffle
    const myMusicPlayAll = document.getElementById('my-music-play-all');
    const myMusicShuffle = document.getElementById('my-music-shuffle');
    if (myMusicPlayAll) {
        myMusicPlayAll.addEventListener('click', () => playAll(getMyMusic()));
    }
    if (myMusicShuffle) {
        myMusicShuffle.addEventListener('click', () => playAll(getMyMusic(), true));
    }
    
    // Playlist play all / shuffle
    const playlistPlayAll = document.getElementById('playlist-play-all');
    const playlistShuffle = document.getElementById('playlist-shuffle');
    if (playlistPlayAll) {
        playlistPlayAll.addEventListener('click', () => {
            const pl = getPlaylists().find(p => p.id === currentPlaylistId);
            if (pl) playAll(pl.tracks || []);
        });
    }
    if (playlistShuffle) {
        playlistShuffle.addEventListener('click', () => {
            const pl = getPlaylists().find(p => p.id === currentPlaylistId);
            if (pl) playAll(pl.tracks || [], true);
        });
    }
    
    // Player controls
    const playPauseBtn = document.getElementById('music-play-pause-btn');
    const miniPlayPauseBtn = document.getElementById('mini-play-pause-btn');
    const prevBtn = document.getElementById('music-prev-btn');
    const nextBtn = document.getElementById('music-next-btn');
    const playerClose = document.getElementById('music-player-close');
    const playerMinimize = document.getElementById('music-player-minimize');
    const miniExpand = document.getElementById('mini-player-expand');
    
    if (playPauseBtn) playPauseBtn.addEventListener('click', togglePlayPause);
    if (miniPlayPauseBtn) miniPlayPauseBtn.addEventListener('click', togglePlayPause);
    if (prevBtn) prevBtn.addEventListener('click', playPrev);
    if (nextBtn) nextBtn.addEventListener('click', playNext);
    if (playerClose) playerClose.addEventListener('click', hideMusicPlayer);
    if (playerMinimize) playerMinimize.addEventListener('click', minimizeMusicPlayer);
    if (miniExpand) miniExpand.addEventListener('click', expandMusicPlayer);
    
    // Progress bar click
    const progressBar = document.getElementById('music-progress-bar');
    const miniProgressBar = document.getElementById('mini-progress-bar');
    if (progressBar) progressBar.addEventListener('click', (e) => seekTo(e, progressBar));
    if (miniProgressBar) miniProgressBar.addEventListener('click', (e) => seekTo(e, miniProgressBar));
    
    // Volume bar
    const volumeBar = document.getElementById('music-volume-bar');
    if (volumeBar) volumeBar.addEventListener('click', (e) => setVolume(e, volumeBar));
    
    // Audio events
    if (musicAudio) {
        musicAudio.addEventListener('timeupdate', updateProgress);
        musicAudio.addEventListener('ended', playNext);
        musicAudio.addEventListener('play', () => {
            isPlaying = true;
            updatePlayPauseUI();
        });
        musicAudio.addEventListener('pause', () => {
            isPlaying = false;
            updatePlayPauseUI();
        });
    }
    
    // Playlist chooser
    const chooserClose = document.getElementById('playlist-chooser-close');
    const chooserCreateBtn = document.getElementById('chooser-create-btn');
    const chooserNewPlaylist = document.getElementById('chooser-new-playlist');
    
    if (chooserClose) chooserClose.addEventListener('click', closePlaylistChooser);
    if (chooserCreateBtn && chooserNewPlaylist) {
        chooserCreateBtn.addEventListener('click', () => {
            const pl = createPlaylist(chooserNewPlaylist.value);
            chooserNewPlaylist.value = '';
            if (pl && pendingTrackForPlaylist) {
                addTrackToPlaylist(pl.id, pendingTrackForPlaylist);
                showNotification(`Added to "${pl.name}"`, 'success');
                closePlaylistChooser();
            } else {
                openPlaylistChooser(pendingTrackForPlaylist); // Refresh list
            }
        });
    }
    
    // My Albums button
    const myAlbumsBtn = document.getElementById('music-my-albums-btn');
    if (myAlbumsBtn) {
        myAlbumsBtn.addEventListener('click', () => showView('my-albums'));
    }
    
    // Album view controls
    const albumBackBtn = document.getElementById('album-back-btn');
    const albumPlayAll = document.getElementById('album-play-all');
    const albumShuffle = document.getElementById('album-shuffle');
    const albumSaveBtn = document.getElementById('album-save-btn');
    
    if (albumBackBtn) {
        albumBackBtn.addEventListener('click', () => showView('results'));
    }
    
    if (albumPlayAll) {
        albumPlayAll.addEventListener('click', () => {
            if (currentAlbumTracks.length > 0) {
                playAll(currentAlbumTracks);
            }
        });
    }
    
    if (albumShuffle) {
        albumShuffle.addEventListener('click', () => {
            if (currentAlbumTracks.length > 0) {
                playAll(currentAlbumTracks, true);
            }
        });
    }
    
    if (albumSaveBtn) {
        albumSaveBtn.addEventListener('click', () => {
            if (currentAlbumData) {
                const saved = getMyAlbums();
                const exists = saved.find(a => String(a.id) === String(currentAlbumData.id));
                if (exists) {
                    const filtered = saved.filter(a => String(a.id) !== String(currentAlbumData.id));
                    setMyAlbums(filtered);
                    albumSaveBtn.innerHTML = `
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                        Save Album
                    `;
                    albumSaveBtn.classList.remove('bg-blue-600', 'text-white');
                    albumSaveBtn.classList.add('bg-blue-600/20', 'text-blue-400');
                    showNotification('Removed from My Albums', 'info');
                } else {
                    saved.push(currentAlbumData);
                    setMyAlbums(saved);
                    albumSaveBtn.innerHTML = `
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                        Saved!
                    `;
                    albumSaveBtn.classList.add('bg-blue-600', 'text-white');
                    albumSaveBtn.classList.remove('bg-blue-600/20', 'text-blue-400');
                    showNotification(`Added "${currentAlbumData.name}" to My Albums`, 'success');
                }
            }
        });
    }
    
    // Show empty state initially
    showView('empty');
}
