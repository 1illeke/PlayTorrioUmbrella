// Streaming Module - WebTorrent and Debrid Integration
// This module handles the complete streaming orchestration
console.log('[Streaming] Loading streaming module...');

// State variables
let currentDebridTorrentId = null;
let debridFlowSession = 0;
let useDebrid = false;
let debridAuth = null;
let debridProvider = 'realdebrid';
let debridStatus = null;

// Player state
let currentStreamUrl = null;
let currentSelectedVideoName = null;
let currentSubtitleUrl = null;
let currentSubtitleFile = null;
let currentSubtitles = [];
let resumeKey = null;
let resumeInfo = null;
let currentFileInfo = null; // Stores extracted season/episode from filename

// DOM elements (will be initialized)
let mpvPlayerContainer = null;
let mpvLoading = null;
let mpvControls = null;
let fileList = null;
let subtitleList = null;
let subtitleControls = null;
let playerTitle = null;
let streamSourceBadge = null;
let customSourceBadge = null;

// Initialize DOM references
function initStreamingModule() {
    mpvPlayerContainer = document.getElementById('mpvPlayerContainer');
    mpvLoading = document.getElementById('mpvLoading');
    mpvControls = document.getElementById('mpvControls');
    fileList = document.getElementById('fileList');
    subtitleList = document.getElementById('subtitleList');
    subtitleControls = document.getElementById('subtitleControls');
    playerTitle = document.getElementById('playerTitle');
    streamSourceBadge = document.getElementById('streamSourceBadge');
    customSourceBadge = document.getElementById('customSourceBadge');
    debridStatus = document.getElementById('debridStatus');
}

// Ensure Debrid state is loaded
async function ensureDebridState() {
    try {
        const API_BASE_URL = window.API_BASE_URL || 'http://localhost:6987/api';
        const res = await fetch(`${API_BASE_URL}/settings`);
        if (res.ok) {
            const settings = await res.json();
            useDebrid = settings.useDebrid || false;
            debridAuth = settings.debridAuth || null;
            debridProvider = settings.debridProvider || 'realdebrid';
        }
    } catch (e) {
        console.warn('[Streaming] Could not load debrid state:', e);
    }
}

// Get provider display name
function getProviderDisplayName(provider) {
    const names = {
        'realdebrid': 'Real-Debrid',
        'alldebrid': 'AllDebrid',
        'torbox': 'TorBox',
        'premiumize': 'Premiumize'
    };
    return names[provider] || 'Debrid';
}

// Prompt user to login to Debrid
function promptDebridLogin() {
    if (typeof showNotification === 'function') {
        showNotification('Please login to your Debrid service in Settings', 'info');
    }
    // Navigate to settings
    window.location.hash = '#/settings';
}

// Show player
function showPlayer() {
    if (mpvPlayerContainer) {
        mpvPlayerContainer.classList.add('active');
        mpvPlayerContainer.style.display = 'block';
    }
}

// Close player
async function closePlayer(showNotif = true) {
    if (mpvPlayerContainer) {
        mpvPlayerContainer.classList.remove('active');
        mpvPlayerContainer.style.display = 'none';
    }
    
    // Stop ALL torrents - this will shut down the engine completely
    console.log('[Streaming] Stopping all torrents...');
    try {
        const API_BASE_URL = window.API_BASE_URL || 'http://localhost:6987';
        const res = await fetch(`${API_BASE_URL}/api/alt-stop-all`, { method: 'POST' });
        console.log('[Streaming] Stop all response:', res.status);
    } catch (e) {
        console.warn('[Streaming] Error stopping all torrents:', e);
    }
    
    // Cleanup
    currentStreamUrl = null;
    currentSelectedVideoName = null;
    currentTorrentData = null;
    
    // Stop WebTorrent if active
    try {
        const API_BASE_URL = window.API_BASE_URL || 'http://localhost:6987/api';
        await fetch(`${API_BASE_URL}/webtorrent/stop`, { method: 'POST' });
    } catch (e) {
        console.warn('[Streaming] Error stopping WebTorrent:', e);
    }
    
    // Cleanup Debrid session
    if (currentDebridTorrentId) {
        try {
            const API_BASE_URL = window.API_BASE_URL || 'http://localhost:6987/api';
            await fetch(`${API_BASE_URL}/debrid/cleanup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: currentDebridTorrentId })
            });
        } catch (e) {
            console.warn('[Streaming] Error cleaning up Debrid:', e);
        }
        currentDebridTorrentId = null;
    }
    
    // Invalidate session
    debridFlowSession++;
    
    // Clear cache when file picker closes
    if (window.electronAPI?.clearCache) {
        try {
            const result = await window.electronAPI.clearCache();
            console.log('[Streaming] Cache cleared:', result.message);
        } catch (e) {
            console.warn('[Streaming] Error clearing cache:', e);
        }
    }
    
    if (showNotif && typeof showNotification === 'function') {
        showNotification('Player closed');
    }
}

// Copy stream URL to clipboard
function copyStreamUrl() {
    if (currentStreamUrl) {
        navigator.clipboard.writeText(currentStreamUrl).then(() => {
            if (typeof showNotification === 'function') showNotification('Stream URL copied to clipboard');
        });
    }
}

// Download subtitles
function downloadSubtitles() {
    if (currentSubtitleUrl) {
        window.open(currentSubtitleUrl, '_blank');
    }
}

// Extract basename from path
function baseName(path) {
    if (!path) return '';
    return path.split(/[/\\]/).pop();
}

// Main streaming function
async function startStream(magnet) {
    if (!magnet || !magnet.startsWith('magnet:')) {
        if (typeof showNotification === 'function') showNotification('Invalid magnet link', 'error');
        return;
    }
    
    // Initialize DOM if not done
    if (!mpvPlayerContainer) initStreamingModule();
    
    // Refresh debrid state
    await ensureDebridState();
    const providerLabel = getProviderDisplayName(debridProvider);
    
    console.log('[Streaming] Starting stream with settings:', { useDebrid, debridAuth, debridProvider });
    
    // If Debrid is enabled but not authenticated, prompt login
    if (useDebrid && !debridAuth) {
        console.warn('[Streaming] Debrid enabled but not logged in');
        if (typeof showNotification === 'function') showNotification(`${providerLabel} is enabled but you are not logged in. Please log in to continue.`);
        promptDebridLogin();
        return;
    }
    
    // Debrid flow
    if (useDebrid && debridAuth) {
        console.log('[Streaming] Using Debrid path');
        await startDebridStream(magnet, providerLabel);
    } else {
        // WebTorrent flow
        console.log('[Streaming] Using WebTorrent path');
        await startWebTorrentStream(magnet);
    }
}

// Debrid streaming flow
async function startDebridStream(magnet, providerLabel) {
    const API_BASE_URL = window.API_BASE_URL || 'http://localhost:6987/api';
    
    try {
        // Start new session
        const myDebridSession = ++debridFlowSession;
        const isSessionActive = (expectedId) => {
            const playerOpen = mpvPlayerContainer && mpvPlayerContainer.classList.contains('active');
            const sessionOk = (myDebridSession === debridFlowSession);
            const idOk = (!expectedId) || (currentDebridTorrentId === expectedId);
            return playerOpen && sessionOk && idOk;
        };
        
        // Show player UI
        showPlayer();
        if (mpvLoading) mpvLoading.style.display = 'flex';
        if (mpvControls) mpvControls.style.display = 'none';
        if (fileList) fileList.innerHTML = '';
        if (subtitleList) subtitleList.innerHTML = '';
        if (subtitleControls) subtitleControls.style.display = 'none';
        if (playerTitle) playerTitle.textContent = `Preparing ${providerLabel}...`;
        
        // Add magnet to Debrid
        console.log('[Streaming] Adding magnet to Debrid');
        const prep = await fetch(`${API_BASE_URL}/debrid/prepare`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ magnet })
        });
        
        if (!prep.ok) {
            const txt = await prep.text();
            console.error('[Streaming] Debrid prepare failed:', txt);
            let notif = 'Debrid prepare failed';
            try {
                const ej = JSON.parse(txt);
                if (ej && ej.code === 'RD_PREMIUM_REQUIRED') {
                    notif = `${providerLabel} premium is required. Disable Debrid in Settings to use WebTorrent.`;
                } else if (ej && ej.code === 'DEBRID_UNAUTH') {
                    notif = `${providerLabel} authentication invalid. Please login again.`;
                    if (debridStatus) debridStatus.textContent = 'Not logged in';
                    promptDebridLogin();
                } else if (ej && ej.error) {
                    notif = ej.error;
                }
            } catch {}
            if (typeof showNotification === 'function') showNotification(notif);
            if (mpvLoading) mpvLoading.style.display = 'none';
            return;
        }
        
        const prepj = await prep.json();
        const rdId = prepj.id;
        currentDebridTorrentId = rdId;
        let info = prepj.info || null;
        
        if (!isSessionActive(rdId)) return;
        
        // Get files
        if (!info || !Array.isArray(info.files) || !info.files.length) {
            await new Promise(r => setTimeout(r, 900));
            if (!isSessionActive(rdId)) return;
            const fres = await fetch(`${API_BASE_URL}/debrid/files?id=${encodeURIComponent(rdId)}`);
            if (fres.ok) info = await fres.json();
        }
        
        let files = (info && info.files) || [];
        
        // Poll for files if not ready
        if (!files.length) {
            for (let i = 0; i < 8; i++) {
                await new Promise(r => setTimeout(r, 1000));
                if (!isSessionActive(rdId)) return;
                try {
                    const rf = await fetch(`${API_BASE_URL}/debrid/files?id=${encodeURIComponent(rdId)}`);
                    if (rf.ok) {
                        const ij = await rf.json();
                        files = (ij && ij.files) || [];
                        if (files.length) break;
                    }
                } catch {}
            }
        }
        
        // Display files
        if (mpvLoading) mpvLoading.style.display = 'none';
        if (fileList) fileList.innerHTML = '';
        
        const isCached = info?.status === 'downloaded';
        const statusPrefix = isCached ? '✅ Cached' : '⬇️ Downloading';
        if (playerTitle) playerTitle.textContent = `${statusPrefix} - ${info?.filename || providerLabel}`;
        
        if (!isCached) {
            if (typeof showNotification === 'function') showNotification(`${providerLabel}: Downloading to cloud...`, 'info');
        } else {
            if (typeof showNotification === 'function') showNotification(`${providerLabel}: Cached and ready!`, 'success');
        }
        
        const rdVideos = files.filter(f => /\.(mp4|mkv|avi|mov)$/i.test(f.path || f.filename || ''));
        const rdSubs = files.filter(f => /\.(srt|vtt)$/i.test(f.path || f.filename || ''));
        
        // Render file list
        rdVideos.forEach((f) => {
            const item = document.createElement('div');
            item.className = 'file-item';
            const displayName = f.path || f.filename || 'file';
            const displaySize = ((f.bytes || f.size || 0) / 1024 / 1024).toFixed(2) + ' MB';
            const cached = (info?.status === 'downloaded') || (Array.isArray(f.links) && f.links.length > 0);
            const badge = cached ? '<span style="background:#198754;padding:2px 6px;border-radius:4px;font-size:0.8em;margin-left:6px;">Cached</span>' : '<span style="background:#6c757d;padding:2px 6px;border-radius:4px;font-size:0.8em;margin-left:6px;">Not cached</span>';
            
            item.innerHTML = `<p class="file-name">${displayName} ${badge}</p><p class="file-size">(${displaySize})</p>`;
            item.addEventListener('click', async () => {
                await playDebridFile(f, rdId, rdSubs, info, isSessionActive);
            });
            if (fileList) fileList.appendChild(item);
        });
        
    } catch (error) {
        console.error('[Streaming] Debrid stream error:', error);
        if (typeof showNotification === 'function') showNotification('Streaming error: ' + error.message, 'error');
        if (mpvLoading) mpvLoading.style.display = 'none';
    }
}

// Play Debrid file
async function playDebridFile(f, rdId, rdSubs, info, isSessionActive) {
    const API_BASE_URL = window.API_BASE_URL || 'http://localhost:6987/api';
    
    try {
        if (!isSessionActive(rdId)) return;
        
        // Select file
        const selectRes = await fetch(`${API_BASE_URL}/debrid/select-files`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: rdId, files: String(f.id || f.file) })
        });
        
        if (!selectRes.ok) {
            console.warn('[Streaming] select-files failed');
        }
        
        // Get link
        let link = Array.isArray(f.links) && f.links.length ? f.links[0] : null;
        
        if (!link) {
            if (typeof showNotification === 'function') showNotification('Waiting for file to cache...');
            if (mpvLoading) mpvLoading.style.display = 'flex';
            
            // Wait for link
            for (let i = 0; i < 20; i++) {
                await new Promise(r => setTimeout(r, 1500));
                if (!isSessionActive(rdId)) return;
                
                const fres = await fetch(`${API_BASE_URL}/debrid/files?id=${encodeURIComponent(rdId)}`);
                if (fres.ok) {
                    const info = await fres.json();
                    const list = Array.isArray(info?.files) ? info.files : [];
                    const found = list.find(x => String(x.id || x.file) === String(f.id || f.file));
                    if (found && Array.isArray(found.links) && found.links.length) {
                        link = found.links[0];
                        break;
                    }
                }
            }
        }
        
        if (!link) {
            if (typeof showNotification === 'function') showNotification('File not cached. Try again later.');
            if (mpvLoading) mpvLoading.style.display = 'none';
            return;
        }
        
        // Unrestrict link
        const unres = await fetch(`${API_BASE_URL}/debrid/link`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ link })
        });
        
        if (!unres.ok) {
            console.error('[Streaming] unrestrict failed');
            if (typeof showNotification === 'function') showNotification('Failed to get stream link');
            if (mpvLoading) mpvLoading.style.display = 'none';
            return;
        }
        
        const uj = await unres.json();
        if (!uj?.url) {
            console.error('[Streaming] unrestrict response missing url');
            if (typeof showNotification === 'function') showNotification('Invalid stream URL');
            if (mpvLoading) mpvLoading.style.display = 'none';
            return;
        }
        
        // Set stream URL
        currentStreamUrl = uj.url;
        currentSelectedVideoName = baseName(f.path || f.filename || '');
        if (playerTitle) playerTitle.textContent = currentSelectedVideoName;
        
        // Update badges
        if (streamSourceBadge) {
            streamSourceBadge.textContent = 'Debrid';
            streamSourceBadge.classList.remove('webtorrent');
            streamSourceBadge.classList.add('debrid');
        }
        if (customSourceBadge) {
            customSourceBadge.textContent = 'Debrid';
            customSourceBadge.classList.remove('webtorrent');
            customSourceBadge.classList.add('debrid');
        }
        
        if (mpvControls) mpvControls.style.display = 'flex';
        if (mpvLoading) mpvLoading.style.display = 'none';
        if (typeof showNotification === 'function') showNotification('Ready via Debrid');
        
    } catch (error) {
        console.error('[Streaming] Play Debrid file error:', error);
        if (typeof showNotification === 'function') showNotification('Error playing file', 'error');
        if (mpvLoading) mpvLoading.style.display = 'none';
    }
}

// Store current torrent data for file selection
let currentTorrentData = null;

// WebTorrent streaming flow - uses alt-torrent-files API
async function startWebTorrentStream(magnet) {
    const API_BASE_URL = window.API_BASE_URL || 'http://localhost:6987/api';
    
    try {
        showPlayer();
        if (mpvLoading) mpvLoading.style.display = 'flex';
        if (mpvControls) mpvControls.style.display = 'none';
        if (fileList) fileList.innerHTML = '';
        if (subtitleList) subtitleList.innerHTML = '';
        if (subtitleControls) subtitleControls.style.display = 'none';
        if (playerTitle) playerTitle.textContent = 'Loading torrent info...';
        
        // Check which engine to use
        let engineConfig = { engine: 'stremio', instances: 1 };
        try {
            const cfgRes = await fetch(`${API_BASE_URL}/torrent-engine/config`);
            if (cfgRes.ok) engineConfig = await cfgRes.json();
        } catch(e) { console.warn('[Streaming] Config fetch failed, using stremio'); }
        
        const isAltEngine = engineConfig.engine !== 'stremio';
        const engineNames = { stremio: 'Stremio', webtorrent: 'WebTorrent', torrentstream: 'TorrentStream', hybrid: 'Hybrid' };
        const engineName = engineNames[engineConfig.engine] || 'Stremio';
        
        console.log('[Streaming] Using engine:', engineConfig.engine, 'isAlt:', isAltEngine);
        
        // Use appropriate endpoint based on engine
        // Note: alt endpoints use base URL without /api suffix
        const baseUrl = 'http://localhost:6987';
        const filesUrl = isAltEngine 
            ? `${baseUrl}/api/alt-torrent-files?magnet=${encodeURIComponent(magnet)}`
            : `${API_BASE_URL}/torrent-files?magnet=${encodeURIComponent(magnet)}`;
        
        console.log('[Streaming] Fetching files from:', filesUrl);
        
        const response = await fetch(filesUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        currentTorrentData = data;
        currentTorrentData._isAltEngine = isAltEngine;
        
        console.log('[Streaming] Got torrent data:', data);
        
        if (playerTitle) playerTitle.textContent = data.name || 'Selected Torrent';
        
        // Display files for selection
        displayTorrentFiles(data.videoFiles || [], data.subtitleFiles || [], isAltEngine, engineName);
        
        // Set source badges
        if (streamSourceBadge) { 
            streamSourceBadge.textContent = engineName; 
            streamSourceBadge.classList.remove('debrid'); 
            streamSourceBadge.classList.add('webtorrent'); 
        }
        if (customSourceBadge) { 
            customSourceBadge.textContent = engineName; 
            customSourceBadge.classList.remove('debrid'); 
            customSourceBadge.classList.add('webtorrent'); 
        }
        
    } catch (error) {
        console.error('[Streaming] WebTorrent stream error:', error);
        if (typeof showNotification === 'function') showNotification('Streaming error: ' + error.message, 'error');
        if (mpvLoading) mpvLoading.style.display = 'none';
    }
}

// Display torrent files for selection
function displayTorrentFiles(videos, subtitles, isAltEngine, engineName) {
    const API_BASE_URL = window.API_BASE_URL || 'http://localhost:6987/api';
    const baseUrl = 'http://localhost:6987';
    
    if (mpvLoading) mpvLoading.style.display = 'none';
    if (fileList) fileList.innerHTML = '';
    
    // Sort videos by season and episode
    videos.sort((a, b) => {
        const regex = /(S|s)(\d+)(E|e)(\d+)|(\d+)x(\d+)|(\d+)-(\d+)/;
        const aMatch = a.name.match(regex);
        const bMatch = b.name.match(regex);
        
        if (aMatch && bMatch) {
            const aSeason = parseInt(aMatch[2] || aMatch[5] || aMatch[7], 10);
            const aEpisode = parseInt(aMatch[4] || aMatch[6] || aMatch[8], 10);
            const bSeason = parseInt(bMatch[2] || bMatch[5] || bMatch[7], 10);
            const bEpisode = parseInt(bMatch[4] || bMatch[6] || bMatch[8], 10);
            
            if (aSeason !== bSeason) return aSeason - bSeason;
            return aEpisode - bEpisode;
        }
        return a.name.localeCompare(b.name);
    });
    
    videos.forEach(file => {
        const item = document.createElement('div');
        item.className = 'file-item';
        item.innerHTML = `
            <p class="file-name">${file.name}</p>
            <p class="file-size">(${(file.size / 1024 / 1024).toFixed(2)} MB)</p>
        `;
        
        item.addEventListener('click', async () => {
            // Use appropriate endpoint based on engine
            // Note: alt endpoints use base URL without /api suffix
            const streamUrl = isAltEngine 
                ? `${baseUrl}/api/alt-stream-file?hash=${currentTorrentData.infoHash}&file=${file.index}`
                : `${API_BASE_URL}/stream-file?hash=${currentTorrentData.infoHash}&file=${file.index}`;
            const prepareUrl = isAltEngine
                ? `${baseUrl}/api/alt-prepare-file?hash=${currentTorrentData.infoHash}&file=${file.index}`
                : `${API_BASE_URL}/prepare-file?hash=${currentTorrentData.infoHash}&file=${file.index}`;
            
            currentStreamUrl = streamUrl;
            currentSelectedVideoName = baseName(file.name);
            if (playerTitle) playerTitle.textContent = currentSelectedVideoName;
            
            // Extract season/episode from filename for subtitle fetching
            let extractedSeason = null;
            let extractedEpisode = null;
            if (typeof parseFromFilename === 'function') {
                const parsed = parseFromFilename(file.name);
                extractedSeason = parsed.season;
                extractedEpisode = parsed.episode;
                console.log(`[Streaming] Extracted from filename: S${extractedSeason}E${extractedEpisode}`);
            }
            
            // Store extracted info for player launch
            currentFileInfo = {
                name: file.name,
                index: file.index,
                season: extractedSeason,
                episode: extractedEpisode
            };
            
            // Compute resume key
            try {
                resumeKey = `webtorrent:${currentTorrentData.infoHash}:${file.index}`;
                if (typeof fetchResume === 'function') {
                    resumeInfo = await fetchResume(resumeKey);
                }
            } catch(_) {}
            
            if (mpvControls) mpvControls.style.display = 'flex';
            
            // Ask backend to begin downloading the selected file
            try {
                console.log('[Streaming] Preparing file:', prepareUrl);
                await fetch(prepareUrl);
            } catch (_) {}
            
            if (typeof showNotification === 'function') {
                showNotification(`Selected: ${currentSelectedVideoName}. Click Play Now or Open in MPV to start.`);
            }
        });
        
        if (fileList) fileList.appendChild(item);
    });
    
    // Handle subtitles
    if (subtitles && subtitles.length > 0) {
        if (subtitleControls) subtitleControls.style.display = 'flex';
        if (subtitleList) {
            subtitleList.innerHTML = '';
            subtitleList.classList.add('subtitle-list');
            currentSubtitles = subtitles;
            
            subtitles.forEach(sub => {
                const subItem = document.createElement('div');
                subItem.className = 'subtitle-item';
                
                const langDiv = document.createElement('div');
                langDiv.className = 'subtitle-lang';
                langDiv.textContent = sub.name;
                subItem.appendChild(langDiv);
                
                subItem.addEventListener('click', async () => {
                    document.querySelectorAll('.subtitle-item').forEach(item => {
                        item.classList.remove('selected');
                    });
                    subItem.classList.add('selected');
                    
                    currentSubtitleUrl = `${API_BASE_URL}/subtitle-file?hash=${currentTorrentData.infoHash}&file=${sub.index}`;
                    if (typeof showNotification === 'function') showNotification(`Selected subtitle: ${sub.name}`);
                });
                
                subtitleList.appendChild(subItem);
            });
        }
    }
    
    if (typeof showNotification === 'function') showNotification('Files ready! Click to play.');
}

// Handle torrent file URL (for torrents without magnet links)
async function handleTorrentFileUrl(torrent) {
    if (!torrent || !torrent.torrentFileUrl) return;
    
    const API_BASE_URL = window.API_BASE_URL || 'http://localhost:6987/api';
    
    if (typeof showNotification === 'function') showNotification('Resolving torrent file...', 'info');
    try {
        const response = await fetch(`${API_BASE_URL}/resolve-torrent-file?url=${encodeURIComponent(torrent.torrentFileUrl)}&title=${encodeURIComponent(torrent.title)}`);
        const data = await response.json();
        
        if (response.ok && data.magnet) {
            if (typeof showNotification === 'function') showNotification('Torrent resolved, starting stream...', 'success');
            await startStream(data.magnet);
        } else {
            throw new Error(data.error || 'Failed to resolve torrent file');
        }
    } catch (error) {
        console.error('[Streaming] Error resolving torrent file:', error);
        if (typeof showNotification === 'function') showNotification(error.message, 'error');
    }
}

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStreamingModule);
} else {
    initStreamingModule();
}

// Export functions
window.startStream = startStream;
window.handleTorrentFileUrl = handleTorrentFileUrl;
window.showPlayer = showPlayer;
window.closePlayer = closePlayer;
window.copyStreamUrl = copyStreamUrl;
window.downloadSubtitles = downloadSubtitles;
window.baseName = baseName;
window.ensureDebridState = ensureDebridState;
window.getProviderDisplayName = getProviderDisplayName;
window.promptDebridLogin = promptDebridLogin;

// Export currentFileInfo getter so movies.js can access extracted season/episode
Object.defineProperty(window, 'currentFileInfo', {
    get: function() { return currentFileInfo; },
    set: function(val) { currentFileInfo = val; }
});

console.log('[Streaming] Streaming module loaded');
