// NodeMPV Player Controller
// This runs in a transparent Electron window overlaying MPV

const { ipcRenderer } = require('electron');

// DOM Elements
const container = document.getElementById('player-container');
const titleEl = document.getElementById('video-title');
const spinner = document.getElementById('loading-spinner');
const subtitleOverlay = document.getElementById('subtitle-overlay');
const progressBar = document.getElementById('progress-bar');
const progressBuffer = document.getElementById('progress-buffer');
const progressWrapper = document.getElementById('progress-wrapper');
const seekTooltip = document.getElementById('seek-tooltip');
const timeDisplay = document.getElementById('time-display');
const playPauseBtn = document.getElementById('play-pause-btn');
const muteBtn = document.getElementById('mute-btn');
const volumeSlider = document.getElementById('volume-slider');
const fullscreenBtn = document.getElementById('fullscreen-btn');
const backBtn = document.getElementById('back-btn');
const audioBtn = document.getElementById('audio-btn');
const subsBtn = document.getElementById('subs-btn');
const audioMenu = document.getElementById('audio-menu');
const subsMenu = document.getElementById('subs-menu');
const audioList = document.getElementById('audio-list');
const subsList = document.getElementById('subs-list');
const nextEpisodeBtn = document.getElementById('next-episode-btn');

// URL params
const params = new URLSearchParams(window.location.search);
const videoUrl = params.get('url');
const tmdbId = params.get('tmdbId');
const imdbId = params.get('imdbId');
const season = params.get('season');
const episode = params.get('episode');
const type = params.get('type');
const showName = params.get('showName') || '';
const provider = params.get('provider') || '';
const providerUrl = params.get('providerUrl') || '';
const quality = params.get('quality') || '1080p';
const isBasicMode = params.get('isBasicMode') === '1';

// State
let isPlaying = false;
let isMuted = false;
let duration = 0;
let currentTime = 0;
let volume = 100;
let activityTimeout;
let subtitles = [];
let activeSub = null;
let subDelay = 0;
let subSize = 55;
let subPos = 95;
let audioTracks = [];
let currentAudioTrack = 0;
let isFullscreen = false;
let builtInSubs = [];        // Subtitles embedded in the video file
let currentBuiltInSub = 0;   // Currently selected built-in sub track
let builtInSubsRendered = false;

// Set title
if (season && episode) {
    titleEl.textContent = showName ? `${showName} - S${season}:E${episode}` : `S${season}:E${episode}`;
} else {
    titleEl.textContent = showName || (type === 'movie' ? 'Movie' : 'Video');
}

// Format time helper
function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// Update time display
function updateTimeDisplay() {
    timeDisplay.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
    if (duration > 0) {
        progressBar.style.width = `${(currentTime / duration) * 100}%`;
    }
}

// Show/hide controls
function showControls() {
    container.classList.add('show-controls');
    document.body.classList.remove('hide-mouse');
    clearTimeout(activityTimeout);
    activityTimeout = setTimeout(hideControls, 3000);
}

function hideControls() {
    if (audioMenu.classList.contains('visible') || subsMenu.classList.contains('visible')) return;
    container.classList.remove('show-controls');
    document.body.classList.add('hide-mouse');
}

// Mouse activity
container.addEventListener('mousemove', showControls);
container.addEventListener('click', (e) => {
    if (e.target === container || e.target.id === 'controls-overlay') {
        togglePlayPause();
    }
});

// Initialize MPV
async function initMPV() {
    if (!videoUrl) {
        titleEl.textContent = 'Error: No video URL';
        return;
    }
    
    spinner.style.display = 'block';
    showControls();
    
    try {
        // Tell main process to start MPV with this URL
        const result = await ipcRenderer.invoke('mpv-load', videoUrl);
        if (!result.success) {
            spinner.style.display = 'none';
            
            // Check if it's an MPV not found error
            if (result.error && result.error.includes('not found')) {
                showMpvNotFoundError();
            } else {
                titleEl.textContent = 'Error: ' + (result.error || 'Failed to start MPV');
            }
            return;
        }
        console.log('[MPV] Loaded successfully');
    } catch (err) {
        console.error('[MPV] Init error:', err);
        titleEl.textContent = 'Error: ' + err.message;
        spinner.style.display = 'none';
    }
}

// Show MPV not found error with helpful message
function showMpvNotFoundError() {
    const container = document.getElementById('player-container');
    container.innerHTML = `
        <div style="text-align:center; padding:40px; max-width:500px;">
            <div style="font-size:64px; margin-bottom:20px;">⚠️</div>
            <h2 style="color:#f97316; margin-bottom:15px; font-size:24px;">MPV Not Found</h2>
            <p style="color:#ccc; margin-bottom:25px; line-height:1.6;">
                MPV player is not installed or could not be found on your system.
            </p>
            <div style="display:flex; flex-direction:column; gap:12px; align-items:center;">
                <a href="#" id="downloadMpvError" style="display:inline-flex; align-items:center; gap:8px; padding:12px 24px; background:#f97316; color:white; text-decoration:none; border-radius:8px; font-weight:600;">
                    <span>Download MPV</span>
                </a>
                <button id="openSettingsError" style="padding:10px 20px; background:rgba(255,255,255,0.1); color:#ccc; border:1px solid rgba(255,255,255,0.2); border-radius:8px; cursor:pointer;">
                    Configure MPV Path in Settings
                </button>
                <button id="closePlayerError" style="padding:10px 20px; background:transparent; color:#888; border:none; cursor:pointer; margin-top:10px;">
                    Close Player
                </button>
            </div>
        </div>
    `;
    
    // Download MPV button - use ipcRenderer to open in default browser
    document.getElementById('downloadMpvError').addEventListener('click', (e) => {
        e.preventDefault();
        ipcRenderer.invoke('open-external', 'https://mpv.io/installation/');
    });
    
    // Open settings button - close player and let user configure
    document.getElementById('openSettingsError').addEventListener('click', () => {
        ipcRenderer.invoke('mpv-command', 'quit');
        window.close();
    });
    
    // Close button
    document.getElementById('closePlayerError').addEventListener('click', () => {
        ipcRenderer.invoke('mpv-command', 'quit');
        window.close();
    });
}


// MPV IPC Event Handlers
ipcRenderer.on('mpv-status', (event, data) => {
    if (data.duration !== undefined) duration = data.duration;
    if (data.position !== undefined) currentTime = data.position;
    if (data.paused !== undefined) {
        isPlaying = !data.paused;
        playPauseBtn.querySelector('i').textContent = isPlaying ? 'pause' : 'play_arrow';
    }
    if (data.volume !== undefined) {
        volume = data.volume;
        volumeSlider.value = volume;
        updateVolumeIcon();
    }
    if (data.muted !== undefined) {
        isMuted = data.muted;
        updateVolumeIcon();
    }
    // Only show spinner when actually buffering (paused-for-cache or seeking)
    if (data.buffering !== undefined) {
        spinner.style.display = data.buffering ? 'block' : 'none';
    }
    if (data.audioTracks) {
        audioTracks = data.audioTracks;
        renderAudioTracks();
    }
    if (data.currentAudioTrack !== undefined) {
        currentAudioTrack = data.currentAudioTrack;
        renderAudioTracks();
    }
    // Handle built-in subtitle tracks from MPV
    if (data.subtitleTracks) {
        builtInSubs = data.subtitleTracks;
        renderBuiltInSubs();
    }
    if (data.currentSubTrack !== undefined) {
        currentBuiltInSub = data.currentSubTrack;
        renderBuiltInSubs();
    }
    updateTimeDisplay();
});

ipcRenderer.on('mpv-ended', () => {
    console.log('[MPV] Playback ended');
    // Could trigger next episode here
});

ipcRenderer.on('mpv-error', (event, error) => {
    console.error('[MPV] Error:', error);
    titleEl.textContent = 'Error: ' + error;
    spinner.style.display = 'none';
});

// Control functions
async function togglePlayPause() {
    await ipcRenderer.invoke('mpv-command', 'toggle-pause');
}

async function seek(seconds) {
    await ipcRenderer.invoke('mpv-command', 'seek', seconds);
}

async function seekTo(position) {
    await ipcRenderer.invoke('mpv-command', 'seek-to', position);
}

async function setVolume(vol) {
    await ipcRenderer.invoke('mpv-command', 'set-volume', vol);
}

async function toggleMute() {
    await ipcRenderer.invoke('mpv-command', 'toggle-mute');
}

async function setAudioTrack(trackId) {
    await ipcRenderer.invoke('mpv-command', 'set-audio-track', trackId);
}

async function loadSubtitle(url) {
    await ipcRenderer.invoke('mpv-command', 'load-subtitle', url);
}

async function setSubDelay(delay) {
    await ipcRenderer.invoke('mpv-command', 'set-sub-delay', delay);
}

async function setSubScale(scale) {
    await ipcRenderer.invoke('mpv-command', 'set-sub-scale', scale);
}

async function setSubPos(pos) {
    await ipcRenderer.invoke('mpv-command', 'set-sub-pos', pos);
}

async function toggleFullscreen() {
    isFullscreen = !isFullscreen;
    await ipcRenderer.invoke('mpv-command', 'toggle-fullscreen');
    fullscreenBtn.querySelector('i').textContent = isFullscreen ? 'fullscreen_exit' : 'fullscreen';
}

function updateVolumeIcon() {
    const icon = muteBtn.querySelector('i');
    if (isMuted || volume === 0) {
        icon.textContent = 'volume_off';
    } else if (volume < 50) {
        icon.textContent = 'volume_down';
    } else {
        icon.textContent = 'volume_up';
    }
}

// Render audio tracks
function renderAudioTracks() {
    if (audioTracks.length === 0) {
        audioList.innerHTML = '<div style="padding:30px; text-align:center; color:#666;">No audio tracks</div>';
        return;
    }
    audioList.innerHTML = audioTracks.map((track, i) => {
        const isActive = track.id === currentAudioTrack;
        const label = track.title || track.lang || `Track ${track.id}`;
        return `<div class="list-item ${isActive ? 'active' : ''}" onclick="selectAudioTrack(${track.id})">
            <i class="material-icons">${isActive ? 'check_circle' : 'radio_button_unchecked'}</i>
            <span>${label}</span>
        </div>`;
    }).join('');
}

window.selectAudioTrack = async (trackId) => {
    await setAudioTrack(trackId);
    currentAudioTrack = trackId;
    renderAudioTracks();
};

// Button event listeners
playPauseBtn.addEventListener('click', togglePlayPause);
document.getElementById('skip-back-btn').addEventListener('click', () => seek(-10));
document.getElementById('skip-forward-btn').addEventListener('click', () => seek(10));
muteBtn.addEventListener('click', toggleMute);
volumeSlider.addEventListener('input', (e) => setVolume(parseInt(e.target.value)));
fullscreenBtn.addEventListener('click', toggleFullscreen);
backBtn.addEventListener('click', () => {
    ipcRenderer.invoke('mpv-command', 'quit');
    window.close();
});

// Progress bar seeking
progressWrapper.addEventListener('click', (e) => {
    const rect = progressWrapper.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const seekTime = percent * duration;
    seekTo(seekTime);
});

progressWrapper.addEventListener('mousemove', (e) => {
    const rect = progressWrapper.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const time = percent * duration;
    seekTooltip.textContent = formatTime(time);
    seekTooltip.style.left = `${e.clientX - rect.left}px`;
    seekTooltip.style.display = 'block';
});

progressWrapper.addEventListener('mouseleave', () => {
    seekTooltip.style.display = 'none';
});

// Menu toggles
audioBtn.addEventListener('click', () => {
    subsMenu.classList.remove('visible');
    audioMenu.classList.toggle('visible');
});

subsBtn.addEventListener('click', () => {
    audioMenu.classList.remove('visible');
    subsMenu.classList.toggle('visible');
});

document.getElementById('close-audio').addEventListener('click', () => audioMenu.classList.remove('visible'));
document.getElementById('close-subs').addEventListener('click', () => subsMenu.classList.remove('visible'));

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    switch(e.key) {
        case ' ':
        case 'k':
            e.preventDefault();
            togglePlayPause();
            break;
        case 'ArrowLeft':
            seek(-10);
            break;
        case 'ArrowRight':
            seek(10);
            break;
        case 'ArrowUp':
            setVolume(Math.min(100, volume + 5));
            break;
        case 'ArrowDown':
            setVolume(Math.max(0, volume - 5));
            break;
        case 'm':
            toggleMute();
            break;
        case 'f':
            toggleFullscreen();
            break;
        case 'Escape':
            if (isFullscreen) toggleFullscreen();
            else {
                ipcRenderer.invoke('mpv-command', 'quit');
                window.close();
            }
            break;
    }
});


// Subtitle settings controls
document.getElementById('sub-delay').addEventListener('change', (e) => {
    subDelay = parseFloat(e.target.value) || 0;
    setSubDelay(subDelay);
});

document.getElementById('sub-size').addEventListener('input', (e) => {
    subSize = parseInt(e.target.value);
    // MPV sub-scale is relative, 1.0 = default. Map 20-100 to 0.5-2.0
    const scale = subSize / 55;
    setSubScale(scale);
});

document.getElementById('sub-pos').addEventListener('input', (e) => {
    subPos = parseInt(e.target.value);
    setSubPos(subPos);
});

// Fetch and display subtitles - matching HTML5 player behavior
async function initSubtitles() {
    if (!tmdbId && !imdbId) {
        subsList.innerHTML = '<div style="padding:30px; text-align:center; color:#666;">No media ID for subtitles</div>';
        return;
    }
    
    subsList.innerHTML = '<div style="padding:30px; text-align:center; color:#666;"><div class="spinner" style="display:inline-block;width:24px;height:24px;border-width:3px;position:relative;transform:none;"></div> Searching...</div>';
    
    // Start with "Off" option
    subtitles = [];
    
    // Helper to add section header
    function addSectionHeader(name) {
        const header = document.createElement('div');
        header.style.cssText = 'padding:10px 22px;font-size:12px;color:var(--accent-purple);font-weight:bold;text-transform:uppercase;letter-spacing:1px;';
        header.textContent = name;
        return header;
    }
    
    // Helper to create subtitle item
    function createSubItem(sub, sourceName) {
        const id = sub.id || sub.url || `${sourceName}-${Math.random()}`;
        const subData = { ...sub, id, source: sourceName };
        subtitles.push(subData);
        
        // Determine display label
        let label = '';
        if (sub.display) {
            // Wyzie format - has nice display name
            label = sub.display;
        } else if (sub.lang) {
            // Stremio format
            label = sub.lang.toUpperCase();
        } else {
            label = 'Unknown';
        }
        
        const el = document.createElement('div');
        el.className = 'list-item';
        el.dataset.subId = id;
        el.innerHTML = `<i class="material-icons">radio_button_unchecked</i><span>${label}</span>`;
        el.onclick = () => selectSubtitle(id);
        
        return el;
    }
    
    // Clear and add "Off" option
    subsList.innerHTML = '';
    const offItem = document.createElement('div');
    offItem.className = 'list-item active';
    offItem.innerHTML = '<i class="material-icons">check_circle</i><span>Off</span>';
    offItem.onclick = () => selectSubtitle(null);
    subsList.appendChild(offItem);
    
    // 1. Fetch Wyzie subtitles
    if (tmdbId || imdbId) {
        try {
            let wyzieUrl = `https://sub.wyzie.ru/search?`;
            if (imdbId) wyzieUrl += `id=${imdbId}`;
            else if (tmdbId) wyzieUrl += `tmdb_id=${tmdbId}`;
            if (season) wyzieUrl += `&season=${season}`;
            if (episode) wyzieUrl += `&episode=${episode}`;
            
            const res = await fetch(wyzieUrl);
            const wyzieData = await res.json();
            
            if (wyzieData && wyzieData.length > 0) {
                subsList.appendChild(addSectionHeader('Wyzie Subtitles'));
                wyzieData.forEach(sub => {
                    subsList.appendChild(createSubItem(sub, 'Wyzie'));
                });
            }
        } catch (e) {
            console.warn('Wyzie fetch error:', e);
        }
    }
    
    // 2. Fetch from Stremio OpenSubtitles addon
    if (imdbId) {
        try {
            const stremioUrl = type === 'movie' 
                ? `https://opensubtitles-v3.strem.io/subtitles/movie/${imdbId}.json`
                : `https://opensubtitles-v3.strem.io/subtitles/series/${imdbId}:${season}:${episode}.json`;
            
            const res = await fetch(stremioUrl);
            const data = await res.json();
            
            if (data.subtitles && data.subtitles.length > 0) {
                subsList.appendChild(addSectionHeader('OpenSubtitles'));
                data.subtitles.forEach(sub => {
                    subsList.appendChild(createSubItem(sub, 'OpenSubtitles'));
                });
            }
        } catch (e) {
            console.warn('OpenSubtitles fetch error:', e);
        }
    }
    
    // 3. Fetch from installed Stremio addons
    try {
        const addonsRes = await fetch('/api/addons');
        if (addonsRes.ok) {
            const addons = await addonsRes.json();
            
            for (const addon of addons) {
                if (!imdbId) continue;
                
                const manifestUrl = addon.url || addon.manifestUrl;
                if (!manifestUrl) continue;
                
                try {
                    // Build subtitle URL for this addon
                    const baseUrl = manifestUrl.replace('/manifest.json', '');
                    const subType = type === 'movie' ? 'movie' : 'series';
                    const subId = type === 'movie' ? imdbId : `${imdbId}:${season}:${episode}`;
                    const subUrl = `${baseUrl}/subtitles/${subType}/${subId}.json`;
                    
                    const subRes = await fetch(subUrl);
                    if (!subRes.ok) continue;
                    
                    const subData = await subRes.json();
                    if (subData.subtitles && subData.subtitles.length > 0) {
                        const addonName = addon.manifest?.name || 'Addon';
                        subsList.appendChild(addSectionHeader(addonName));
                        subData.subtitles.forEach(sub => {
                            subsList.appendChild(createSubItem(sub, addonName));
                        });
                    }
                } catch (e) {
                    // Addon doesn't support subtitles, skip
                }
            }
        }
    } catch (e) {
        console.warn('Addons fetch error:', e);
    }
    
    if (subtitles.length === 0) {
        const noSubs = document.createElement('div');
        noSubs.style.cssText = 'padding:20px;text-align:center;color:#666;';
        noSubs.textContent = 'No subtitles found';
        subsList.appendChild(noSubs);
    }
}

window.selectSubtitle = async (subId) => {
    // Update UI - remove active from all, add to selected
    document.querySelectorAll('#subs-list .list-item').forEach(el => {
        el.classList.remove('active');
        const icon = el.querySelector('i');
        if (icon) icon.textContent = 'radio_button_unchecked';
    });
    
    if (!subId) {
        // Turn off subtitles
        activeSub = null;
        await ipcRenderer.invoke('mpv-command', 'disable-subtitles');
        // Mark "Off" as active
        const offItem = subsList.querySelector('.list-item');
        if (offItem) {
            offItem.classList.add('active');
            const icon = offItem.querySelector('i');
            if (icon) icon.textContent = 'check_circle';
        }
        return;
    }
    
    const sub = subtitles.find(s => s.id === subId);
    if (!sub) return;
    
    // Mark selected item as active
    const selectedItem = subsList.querySelector(`[data-sub-id="${subId}"]`);
    if (selectedItem) {
        selectedItem.classList.add('active');
        const icon = selectedItem.querySelector('i');
        if (icon) icon.textContent = 'check_circle';
    }
    
    activeSub = sub;
    
    // Load subtitle into MPV
    try {
        const subUrl = sub.url || sub.externalUrl;
        if (subUrl) {
            await loadSubtitle(subUrl);
            console.log('[MPV] Subtitle loaded:', sub.display || sub.lang);
        }
    } catch (err) {
        console.error('[MPV] Failed to load subtitle:', err);
    }
};

// Render built-in subtitles from MPV (embedded in video file)
function renderBuiltInSubs() {
    if (builtInSubs.length === 0 || builtInSubsRendered) return;
    
    // Find the "Off" item (first item in list)
    const offItem = subsList.querySelector('.list-item');
    if (!offItem) return;
    
    // Create section header for built-in subs
    const header = document.createElement('div');
    header.id = 'builtin-subs-header';
    header.style.cssText = 'padding:10px 22px;font-size:12px;color:var(--accent-purple);font-weight:bold;text-transform:uppercase;letter-spacing:1px;';
    header.textContent = 'Built-in Subtitles';
    
    // Insert after "Off" item
    offItem.after(header);
    
    // Add each built-in subtitle track
    let lastEl = header;
    builtInSubs.forEach(track => {
        const el = document.createElement('div');
        el.className = 'list-item';
        el.dataset.builtinId = track.id;
        
        const label = track.title || track.lang || `Track ${track.id}`;
        const isActive = currentBuiltInSub === track.id;
        
        el.innerHTML = `<i class="material-icons">${isActive ? 'check_circle' : 'radio_button_unchecked'}</i><span>${label}</span>`;
        el.onclick = () => selectBuiltInSub(track.id);
        
        if (isActive) {
            el.classList.add('active');
            // Remove active from Off
            offItem.classList.remove('active');
            offItem.querySelector('i').textContent = 'radio_button_unchecked';
        }
        
        lastEl.after(el);
        lastEl = el;
    });
    
    builtInSubsRendered = true;
}

// Select a built-in subtitle track
window.selectBuiltInSub = async (trackId) => {
    // Update UI - remove active from all
    document.querySelectorAll('#subs-list .list-item').forEach(el => {
        el.classList.remove('active');
        const icon = el.querySelector('i');
        if (icon) icon.textContent = 'radio_button_unchecked';
    });
    
    // Mark selected built-in sub as active
    const selectedItem = subsList.querySelector(`[data-builtin-id="${trackId}"]`);
    if (selectedItem) {
        selectedItem.classList.add('active');
        const icon = selectedItem.querySelector('i');
        if (icon) icon.textContent = 'check_circle';
    }
    
    currentBuiltInSub = trackId;
    activeSub = null; // Clear external sub selection
    
    // Tell MPV to use this subtitle track
    await ipcRenderer.invoke('mpv-command', 'set-sub-track', trackId);
    console.log('[MPV] Built-in subtitle selected:', trackId);
};

// Cleanup WebTorrent on window close
window.addEventListener('beforeunload', () => {
    // Extract hash from video URL if it's a WebTorrent stream
    if (videoUrl && videoUrl.includes('/api/stream-file')) {
        try {
            const urlObj = new URL(videoUrl);
            const hash = urlObj.searchParams.get('hash');
            if (hash) {
                console.log('[Cleanup] Stopping WebTorrent stream:', hash);
                // Use sendBeacon for reliable cleanup on page unload
                navigator.sendBeacon(`/api/stop-stream?hash=${hash}`);
            }
        } catch (e) {
            console.error('[Cleanup] Error:', e);
        }
    }
});

// Initialize
initMPV();
initSubtitles();
showControls();
