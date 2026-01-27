// Video Player Functions
// This file handles video player logic (VLC, custom player, MPV, IINA, etc.)

// Global player state
let currentStreamUrl = null;
let currentSelectedVideoName = null;
let currentSubtitleUrl = null;
let currentSubtitleFile = null;
let currentSubtitles = [];
let resumeKey = null;
let resumeInfo = null;

// ===== EXTERNAL PLAYER FUNCTIONS =====

async function openInMPV() {
    if (!currentStreamUrl) {
        showNotification('No file selected to play');
        return;
    }
    
    // On macOS, use IINA instead of MPV
    const isMac = window.electronAPI && window.electronAPI.platform === 'darwin';
    const playerName = isMac ? 'IINA' : 'MPV';
    const apiMethod = isMac ? 'openInIINA' : 'openInMPV';
    
    if (!window.electronAPI || !window.electronAPI[apiMethod]) {
        showNotification(`${playerName} integration not available in this environment`);
        return;
    }
    
    // Update Discord presence for external player streaming
    const title = currentContent?.title || currentContent?.name || 'Video';
    
    // Determine provider based on selectedProvider setting
    let provider;
    if (selectedProvider === 'jackett') {
        provider = 'Jackett';
    } else if (selectedProvider === 'prowlarr') {
        provider = 'Prowlarr';
    } else if (selectedProvider === 'nuvio') {
        provider = 'Nuvio';
    } else if (selectedProvider === 'comet') {
        provider = 'Comet';
    } else if (selectedProvider === '111477') {
        provider = '111477';
    } else if (selectedProvider === 'moviebox') {
        provider = 'MovieBox';
    } else if (selectedProvider === 'torrentless') {
        provider = 'PlayTorrio';
    } else {
        provider = 'App Sources';
    }
    
    // For TV shows, pass the season number
    const seasonNum = (currentMediaType === 'tv' && currentSeason) ? currentSeason : null;
    updateDiscordForStreaming(title, provider, seasonNum);
    
    const data = {
        streamUrl: currentStreamUrl,
        infoHash: (currentTorrentData && currentTorrentData.infoHash) ? currentTorrentData.infoHash : null,
        startSeconds: (resumeInfo && typeof resumeInfo.position === 'number' && resumeInfo.position > 10) ? Math.floor(resumeInfo.position) : undefined
    };
    
    const result = await window.electronAPI[apiMethod](data);
    if (result.success) {
        showNotification(`${playerName} launched - Please Wait! Watch out for a new window`, 'success', 5000);
    } else {
        if (result.message && (result.message.includes('not installed') || result.message.includes('not found'))) {
            showNotification(result.message, 'error', 10000);
        } else {
            showNotification(`Error: ${result.message}`, 'error', 7000);
        }
    }
}

async function openInVLC() {
    if (!currentStreamUrl) {
        showNotification('No file selected to play');
        return;
    }
    if (!window.electronAPI || !window.electronAPI.openInVLC) {
        showNotification('VLC integration not available in this environment');
        return;
    }

    const title = currentContent?.title || currentContent?.name || 'Video';
    let provider;
    if (selectedProvider === 'jackett') provider = 'Jackett';
    else if (selectedProvider === 'prowlarr') provider = 'Prowlarr';
    else if (selectedProvider === 'nuvio') provider = 'Nuvio';
    else if (selectedProvider === 'comet') provider = 'Comet';
    else if (selectedProvider === '111477') provider = '111477';
    else if (selectedProvider === 'moviebox') provider = 'MovieBox';
    else if (selectedProvider === 'torrentless') provider = 'PlayTorrio';
    else provider = 'App Sources';

    const seasonNum = (currentMediaType === 'tv' && currentSeason) ? currentSeason : null;
    updateDiscordForStreaming(title, provider, seasonNum);

    const data = {
        streamUrl: currentStreamUrl,
        infoHash: (currentTorrentData && currentTorrentData.infoHash) ? currentTorrentData.infoHash : null,
        startSeconds: (resumeInfo && typeof resumeInfo.position === 'number' && resumeInfo.position > 10) ? Math.floor(resumeInfo.position) : undefined
    };
    const result = await window.electronAPI.openInVLC(data);
    if (result.success) {
        showNotification('VLC launched - Please Wait! Watch out for a new window', 'success', 5000);
    } else {
        showNotification(`Error: ${result.message}`);
    }
}

// ===== CUSTOM HTML5 PLAYER =====

function openCustomPlayer() {
    if (!currentStreamUrl) {
        showNotification('No file selected to play');
        return;
    }
    
    // Update Discord presence for streaming
    const tmdbTitle = currentContent?.title || currentContent?.name || 'Unknown';
    
    // Determine provider based on selectedProvider setting
    let provider;
    if (selectedProvider === 'jackett') {
        provider = 'Jackett';
    } else if (selectedProvider === 'prowlarr') {
        provider = 'Prowlarr';
    } else if (selectedProvider === 'nuvio') {
        provider = 'Nuvio';
    } else if (selectedProvider === 'comet') {
        provider = 'Comet';
    } else if (selectedProvider === '111477') {
        provider = '111477';
    } else if (selectedProvider === 'torrentless') {
        provider = 'PlayTorrio';
    } else {
        provider = 'App Sources';
    }
    
    // For TV shows, pass the season number
    const seasonNum = (currentMediaType === 'tv' && currentSeason) ? currentSeason : null;
    updateDiscordForStreaming(tmdbTitle, provider, seasonNum);
    
    customPlayerContainer.classList.add('active');
    customPlayerContainer.style.display = 'flex';
    
    // Check if this is an HLS stream (.m3u8) and use HLS.js if needed
    if (currentStreamUrl.includes('.m3u8') && typeof Hls !== 'undefined' && Hls.isSupported()) {
        // Destroy existing HLS instance if any
        if (window.hls) {
            window.hls.destroy();
        }
        
        // Create new HLS instance
        window.hls = new Hls({
            enableWorker: false,
            lowLatencyMode: false,
            backBufferLength: 90
        });
        
        window.hls.loadSource(currentStreamUrl);
        window.hls.attachMedia(customVideo);
        
        window.hls.on(Hls.Events.MANIFEST_PARSED, () => {
            console.log('[HLS] Manifest parsed, ready to play');
        });
        
        window.hls.on(Hls.Events.ERROR, (event, data) => {
            console.error('[HLS] Error:', data);
            if (data.fatal) {
                if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                    console.log('[HLS] Network error, trying to recover...');
                    window.hls.startLoad();
                } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                    console.log('[HLS] Media error, trying to recover...');
                    window.hls.recoverMediaError();
                }
            }
        });
    } else {
        // Ensure any previous HLS instance is destroyed
        if (window.hls) {
            window.hls.destroy();
            window.hls = null;
        }
        
        // Set video source directly
        if (customVideo && videoSource) {
            videoSource.setAttribute('src', currentStreamUrl);
            customVideo.load();
        }
    }
    
    // Load subtitle if available
    if (currentSubtitleUrl) {
        loadSubtitleInCustomPlayer(currentSubtitleUrl);
    }
    
    // Resume from saved position if available
    if (resumeInfo && typeof resumeInfo.position === 'number' && resumeInfo.position > 10) {
        customVideo.currentTime = resumeInfo.position;
    }
}

function closeCustomPlayer() {
    customPlayerContainer.classList.remove('active');
    customPlayerContainer.style.display = 'none';
    
    // Pause and cleanup
    if (customVideo) {
        customVideo.pause();
    }
    
    // Destroy HLS instance if exists
    if (window.hls) {
        window.hls.destroy();
        window.hls = null;
    }
}

// ===== PLAYER OVERLAY (MPV PLAYER CONTAINER) =====

function showPlayer() {
    const mpvPlayerContainer = document.getElementById('mpvPlayerContainer');
    if (mpvPlayerContainer) {
        mpvPlayerContainer.classList.add('active');
    }
}

async function closePlayer(showNotif = true) {
    const mpvPlayerContainer = document.getElementById('mpvPlayerContainer');
    if (mpvPlayerContainer) {
        mpvPlayerContainer.classList.remove('active');
    }
    
    // Invalidate any ongoing Debrid polling loops
    debridFlowSession++;
    
    // Cleanup debrid torrent if one is active
    if (currentDebridTorrentId) {
        console.log('[UI][Debrid] Cleaning up torrent:', currentDebridTorrentId);
        try {
            await fetch(`${API_BASE_URL}/debrid/cleanup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: currentDebridTorrentId })
            });
            console.log('[UI][Debrid] Torrent cleanup complete');
        } catch (e) {
            console.warn('[UI][Debrid] Cleanup failed:', e?.message);
        }
        currentDebridTorrentId = null;
    }
    
    // Stop ALL torrents - this will shut down the engine completely
    console.log('[UI] Stopping all torrents...');
    try {
        const res = await fetch(`${API_BASE_URL}/alt-stop-all`, { method: 'POST' });
        console.log('[UI] Stop all response:', res.status);
    } catch (e) {
        console.warn('[UI] Error stopping all torrents:', e);
    }
    
    currentTorrentData = null;
    
    // Clear cache when file picker closes
    if (window.electronAPI?.clearCache) {
        try {
            const result = await window.electronAPI.clearCache();
            console.log('[UI] Cache cleared:', result.message);
            if (showNotif) {
                showNotification('Player closed and cache cleared.');
            }
        } catch (e) {
            console.warn('[UI] Error clearing cache:', e);
            if (showNotif) {
                showNotification('Player closed');
            }
        }
    } else if (showNotif) {
        showNotification('Player closed');
    }
    
    // Cleanup subtitle if present
    try {
        if (currentSubtitleFile) {
            await fetch(`${API_BASE_URL}/subtitles/delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: currentSubtitleFile })
            });
        }
    } catch {}
}

// ===== FILE DISPLAY AND SELECTION =====

function displayFiles(videos, subtitles) {
    const mpvLoading = document.getElementById('mpvLoading');
    const fileList = document.getElementById('fileList');
    const subtitleList = document.getElementById('subtitleList');
    const subtitleControls = document.getElementById('subtitleControls');
    const playerTitle = document.getElementById('playerTitle');
    
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

            if (aSeason !== bSeason) {
                return aSeason - bSeason;
            }
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

        let hoverTimer;
        item.addEventListener('mouseenter', () => {
            hoverTimer = setTimeout(() => {
                const tooltip = document.createElement('div');
                tooltip.className = 'file-name-tooltip';
                tooltip.textContent = file.name;
                item.appendChild(tooltip);
            }, 3000);
        });

        item.addEventListener('mouseleave', () => {
            clearTimeout(hoverTimer);
            const tooltip = item.querySelector('.file-name-tooltip');
            if (tooltip) tooltip.remove();
        });

        item.addEventListener('click', async () => {
            const isAltEngine = currentTorrentData._isAltEngine || false;
            const baseUrl = window.API_BASE_URL || 'http://localhost:6987/api';
            const streamUrl = isAltEngine 
                ? `${baseUrl}/alt-stream-file?hash=${currentTorrentData.infoHash}&file=${file.index}`
                : `${baseUrl}/stream-file?hash=${currentTorrentData.infoHash}&file=${file.index}`;
            const prepareUrl = isAltEngine
                ? `${baseUrl}/alt-prepare-file?hash=${currentTorrentData.infoHash}&file=${file.index}`
                : `${baseUrl}/prepare-file?hash=${currentTorrentData.infoHash}&file=${file.index}`;
            
            currentStreamUrl = streamUrl;
            currentSelectedVideoName = baseName(file.name);
            if (playerTitle) playerTitle.textContent = currentSelectedVideoName;
            
            // Compute resume key and prefetch resume info
            try {
                resumeKey = `webtorrent:${currentTorrentData.infoHash}:${file.index}`;
                resumeInfo = await fetchResume(resumeKey);
            } catch(_) {}
            
            const mpvControls = document.getElementById('mpvControls');
            if (mpvControls) mpvControls.style.display = 'flex';
            
            // Ask backend to begin downloading the selected file
            try {
                await fetch(prepareUrl);
            } catch (_) {}
            showNotification(`Selected: ${currentSelectedVideoName}. Click Play Now or Open in MPV to start.`);
        });
        if (fileList) fileList.appendChild(item);
    });

    if (subtitles.length > 0 && subtitleControls && subtitleList) {
        subtitleControls.style.display = 'flex';
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
                showNotification(`Selected subtitle: ${sub.name}`);
            });
            subtitleList.appendChild(subItem);
        });
    }
}

// ===== UTILITY FUNCTIONS =====

function copyStreamUrl() {
    if (!currentStreamUrl) {
        showNotification('No file selected to play');
        return;
    }
    navigator.clipboard.writeText(currentStreamUrl).then(() => {
        showNotification('Stream URL copied to clipboard');
    });
}

function downloadSubtitles() {
    if (!currentSubtitleUrl) {
        showNotification('No subtitle selected');
        return;
    }
    window.open(currentSubtitleUrl);
}

function copyMagnet(magnet) {
    navigator.clipboard.writeText(magnet).then(() => {
        showNotification('Magnet link copied to clipboard');
    });
}

function baseName(path) {
    return path.split('/').pop().split('\\').pop();
}

// Export functions for use in other modules
window.openInMPV = openInMPV;
window.openInVLC = openInVLC;
window.openCustomPlayer = openCustomPlayer;
window.closeCustomPlayer = closeCustomPlayer;
window.showPlayer = showPlayer;
window.closePlayer = closePlayer;
window.displayFiles = displayFiles;
window.copyStreamUrl = copyStreamUrl;
window.downloadSubtitles = downloadSubtitles;
window.copyMagnet = copyMagnet;

console.log('[Player] Player functions module loaded');
