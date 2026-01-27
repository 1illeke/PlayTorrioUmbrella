// Torrent Provider Functions
// This file handles torrent provider integrations (Comet, MovieBox, 111477, XDmovies, Nuvio, etc.)
console.log('[Torrents] Loading torrents.js...');

// Global API base URL
const API_BASE_URL = window.API_BASE_URL || 'http://localhost:6987/api';

// Access global variables from other modules via window
// These are defined in movies.js, config.js, streaming.js and exported to window
const TMDB_API_KEY = window.TMDB_API_KEY || 'c3515fdc674ea2bd7b514f4bc3616a4a';

// Helper getters for global state (these are set by movies.js)
function getCurrentContent() { return window.currentContent; }
function getCurrentMediaType() { return window.currentMediaType; }
function getLastSearchedSeason() { return window.lastSearchedSeason; }
function getLastSearchedEpisode() { return window.lastSearchedEpisode; }
function getCurrentSeason() { return window.currentSeason; }
function getUseDebrid() { return window.useDebrid || false; }

// Local state for streaming (these are set locally and used by chromecast etc.)
let currentStreamUrl = null;
let currentSelectedVideoName = null;

// Helper to get API base URL
function getTorrentsApiUrl(endpoint) {
    const baseUrl = window.API_BASE_URL || 'http://localhost:6987/api';
    if (endpoint.startsWith('/')) {
        return baseUrl + endpoint;
    }
    return baseUrl + '/' + endpoint;
}

// Global variables for torrent management
let allNuvioStreams = [];
let currentTorrentData = null;
let currentDebridTorrentId = null;
let debridFlowSession = 0;

// Helper function to play stream respecting player settings
// Uses spawnMpvjsPlayer which handles all player types (playtorrio, nodempv, builtin) internally
async function playStreamWithSelectedPlayer(url, options = {}) {
    const { tmdbId, seasonNum, episodeNum, isDebrid, name, type, showName, provider, providerUrl, quality } = options;
    
    try {
        const API_BASE_URL = window.API_BASE_URL || 'http://localhost:6987/api';
        
        // Use spawnMpvjsPlayer which handles player type selection internally (in main.js)
        // This prevents double-opening issues by centralizing player logic
        if (window.electronAPI?.spawnMpvjsPlayer) {
            console.log('[Player] Using spawnMpvjsPlayer (handles player type internally)');
            const res = await window.electronAPI.spawnMpvjsPlayer({
                url,
                tmdbId: tmdbId || '',
                seasonNum: seasonNum || null,
                episodeNum: episodeNum || null,
                isDebrid: isDebrid || false,
                type: type || (seasonNum ? 'tv' : 'movie'),
                showName: showName || name || '',
                provider: provider || null,
                providerUrl: providerUrl || null,
                quality: quality || null
            });
            if (res?.success) {
                if (typeof showNotification === 'function') showNotification('Player launched');
                return true;
            } else if (res?.message) {
                console.warn('[Player] spawnMpvjsPlayer returned message:', res.message);
                // Don't alert, just fall through to HTML5 player
            }
        }
        
        // Fallback to HTML5 player if Electron API not available
        console.log('[Player] Fallback to Built-in HTML5 player');
        
        // Build player URL with query params for HTML5 player
        const params = new URLSearchParams();
        if (url) params.append('url', url);
        if (tmdbId) params.append('tmdbId', tmdbId);
        if (seasonNum) params.append('seasonNum', seasonNum);
        if (episodeNum) params.append('episodeNum', episodeNum);
        if (name) params.append('title', name);
        
        const playerUrl = `${API_BASE_URL.replace('/api', '')}/player.html?${params.toString()}`;
        
        // Use the playerOverlay (HTML5 player) if available
        if (window.playerOverlay) {
            window.playerOverlay.open(playerUrl, null, false);
            return true;
        } else {
            // Fallback: open in new window
            window.open(playerUrl, '_blank');
            return true;
        }
    } catch (e) {
        console.error('[Player] Error:', e);
        if (typeof showNotification === 'function') showNotification('Error launching player: ' + e.message, 'error');
        return false;
    }
}

window.playStreamWithSelectedPlayer = playStreamWithSelectedPlayer;

// Helper function to check if torrent title matches specific season/episode
function getEpisodeMatchScore(title, season, episode) {
    if (!season || !episode || !title) return 0;
    
    const titleLower = title.toLowerCase();
    const s = parseInt(season);
    const e = parseInt(episode);
    
    // Create patterns for different episode naming formats
    const patterns = [
        // S01E01 format (most common)
        new RegExp(`s0*${s}[\\s._-]*e0*${e}(?!\\d)`, 'i'),
        // S01.E01 format
        new RegExp(`s0*${s}\\.e0*${e}(?!\\d)`, 'i'),
        // 1x01 format
        new RegExp(`(?:^|\\D)${s}x0*${e}(?!\\d)`, 'i'),
        // Season 1 Episode 1 format (written out)
        new RegExp(`season[\\s._-]*0*${s}[\\s._-]*episode[\\s._-]*0*${e}(?!\\d)`, 'i'),
        // Ep1S1 or E1S1 format
        new RegExp(`e(?:p)?0*${e}s0*${s}(?!\\d)`, 'i'),
        // S1Ep1 format
        new RegExp(`s0*${s}ep0*${e}(?!\\d)`, 'i'),
        // [1-01] or (1-01) format
        new RegExp(`[\\[\\(]0*${s}[\\s._-]0*${e}[\\]\\)]`, 'i')
    ];
    
    // Check if any pattern matches
    for (let i = 0; i < patterns.length; i++) {
        if (patterns[i].test(titleLower)) {
            // Return higher score for exact matches (based on pattern priority)
            // First pattern (S01E01) gets highest bonus
            return 1000 - (i * 10);
        }
    }
    
    return 0; // No match
}

// Export the function
window.getEpisodeMatchScore = getEpisodeMatchScore;

// ===== NUVIO STREAMING PROVIDER =====

async function fetchNuvioStreams(season = null, episode = null) {
    const currentContent = getCurrentContent();
    const currentMediaType = getCurrentMediaType();
    if (!currentContent) return;

    const torrentsList = document.getElementById('torrentsList');
    torrentsList.innerHTML = '<div class="loading"><i class="fas fa-spinner"></i> Searching Nuvio...</div>';

    try {
        const tmdbId = currentContent.id;
        const mediaType = currentMediaType; // 'movie' or 'tv'

        // Get IMDB ID from TMDB
        const externalIdsUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}/external_ids?api_key=${TMDB_API_KEY}`;
        const externalIdsRes = await fetch(externalIdsUrl);
        if (!externalIdsRes.ok) throw new Error('Failed to get IMDB ID from TMDB');
        
        const externalIds = await externalIdsRes.json();
        const imdbId = externalIds.imdb_id;
        
        if (!imdbId) {
            throw new Error('No IMDB ID found for this content');
        }

        // Febbox JWT token for Nuvio (supports custom UI token)
        const defaultFebboxToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE3NTU5MzQ2NzcsIm5iZiI6MTc1NTkzNDY3NywiZXhwIjoxNzg3MDM4Njk3LCJkYXRhIjp7InVpZCI6OTY3OTA3LCJ0b2tlbiI6ImRjZTBiZTUyNzgzODU1Njg5ZjNlMjBhZTIzODU2YzlkIn19.yAuVwTgLyO7sTH5rOi_-UaVAHqO0YzUkykXgQC2ci2E';
        const savedToken = (localStorage.getItem('febboxToken') || '').trim();
        const febboxToken = savedToken || defaultFebboxToken;

        // Build new Nuviostreams URL with cookies, region, providers
        const base = 'https://nuviostreams.hayd.uk';
        const cookiesSeg = `cookies=${encodeURIComponent(JSON.stringify([febboxToken]))}`;
        const regionSeg = 'region=UK3';
        const providersSeg = 'providers=showbox,vidzee,vidsrc,vixsrc,mp4hydra,uhdmovies,moviesmod,4khdhub,topmovies';
        let nuvioExternalUrl;
        if (mediaType === 'movie') {
            nuvioExternalUrl = `${base}/${cookiesSeg}/${regionSeg}/${providersSeg}/stream/movie/${encodeURIComponent(imdbId)}.json`;
        } else if (season && episode) {
            nuvioExternalUrl = `${base}/${cookiesSeg}/${regionSeg}/${providersSeg}/stream/series/${encodeURIComponent(imdbId)}:${encodeURIComponent(season)}:${encodeURIComponent(episode)}.json`;
        } else {
            throw new Error('Season and episode required for TV shows');
        }

        console.log('[Nuvio] Trying direct URL:', nuvioExternalUrl);

        let data = null;
        let responseOk = false;
        try {
            const response = await fetch(nuvioExternalUrl);
            responseOk = response.ok;
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            data = await response.json();
        } catch (directErr) {
            console.warn('[Nuvio] Direct fetch failed, falling back to backend proxy:', directErr?.message || directErr);
            // Fallback to existing backend proxy if available
            let proxyUrl;
            if (mediaType === 'movie') {
                proxyUrl = `${API_BASE_URL}/nuvio/stream/movie/${imdbId}?cookie=ui%3D${encodeURIComponent(febboxToken)}&region=US`;
            } else {
                proxyUrl = `${API_BASE_URL}/nuvio/stream/series/${imdbId}:${season}:${episode}?cookie=ui%3D${encodeURIComponent(febboxToken)}&region=US`;
            }
            console.log('[Nuvio] Fetching via proxy:', proxyUrl);
            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error(`Proxy Nuvio error: ${response.statusText}`);
            data = await response.json();
            responseOk = true;
        }
        if (!responseOk || !data) throw new Error('Failed to load Nuvio streams');
        const streams = data.streams || [];
        
        console.log('[Nuvio] Found', streams.length, 'streams');

        if (streams.length === 0) {
            torrentsList.innerHTML = '<div class="error-message"><i class="fas fa-info-circle"></i> No Nuvio streams found</div>';
            return;
        }

        // Reorder streams: all MoviesMod first (1080p preferred), then others in original order
        const withIndex = streams.map((s, i) => ({ s, i }));
        const mmRegex = /moviesmod/i;
        const p1080 = /1080p/i;
        withIndex.sort((a, b) => {
            const aMM = mmRegex.test(a.s?.name || '') || mmRegex.test(a.s?.title || '');
            const bMM = mmRegex.test(b.s?.name || '') || mmRegex.test(b.s?.title || '');
            if (aMM && !bMM) return -1;
            if (!aMM && bMM) return 1;
            if (aMM && bMM) {
                const a1080 = p1080.test(a.s?.name || '') || p1080.test(a.s?.title || '');
                const b1080 = p1080.test(b.s?.name || '') || p1080.test(b.s?.title || '');
                if (a1080 && !b1080) return -1;
                if (!a1080 && b1080) return 1;
            }
            return a.i - b.i;
        });
        const prioritizedStreams = withIndex.map(x => x.s);

        // Cache streams globally and add size info for sorting
        allNuvioStreams = prioritizedStreams.map(stream => {
            const sizeMatch = (stream.title || '').match(/([\d.]+)\s*(GB|MB)/i);
            let sizeBytes = 0;
            if (sizeMatch) {
                const num = parseFloat(sizeMatch[1]);
                const unit = sizeMatch[2].toUpperCase();
                sizeBytes = unit === 'GB' ? num * 1024 * 1024 * 1024 : num * 1024 * 1024;
            }
            return { ...stream, sizeBytes };
        });

        // Display Nuvio streams as direct play buttons
        displayNuvioStreams(allNuvioStreams);

    } catch (error) {
        console.error('[Nuvio] Error:', error);
        torrentsList.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-triangle"></i> Nuvio Error: ${error.message}</div>`;
    }
}

// Display Nuvio streams (direct play, not torrents)
function displayNuvioStreams(streams) {
    const torrentsList = document.getElementById('torrentsList');
    
    if (!streams || streams.length === 0) {
        torrentsList.innerHTML = '<div class="error-message"><i class="fas fa-info-circle"></i> No streams available</div>';
        return;
    }

    // Apply size filter first
    let filteredStreams = streams.slice();
    if (typeof torrentSizeFilter === 'string' && torrentSizeFilter !== 'all') {
        console.log('[Nuvio] Applying size filter:', torrentSizeFilter);
        filteredStreams = filteredStreams.filter(stream => bytesMatchesSizeFilter(stream.sizeBytes));
        console.log('[Nuvio] After filter:', filteredStreams.length, 'of', streams.length, 'streams remain');
    }

    if (filteredStreams.length === 0) {
        torrentsList.innerHTML = '<p>No streams match your size filter.</p>';
        return;
    }

    // Apply sorting if sort mode is size-based
    let sortedStreams = filteredStreams.slice();
    const mode = (typeof torrentSortMode === 'string') ? torrentSortMode : 'seeders';
    
    if (mode === 'size-asc') {
        console.log('[Nuvio] Sorting by size ascending');
        sortedStreams.sort((a, b) => (a.sizeBytes || 0) - (b.sizeBytes || 0));
    } else if (mode === 'size-desc') {
        console.log('[Nuvio] Sorting by size descending');
        sortedStreams.sort((a, b) => (b.sizeBytes || 0) - (a.sizeBytes || 0));
    }

    torrentsList.innerHTML = '';
    
    sortedStreams.forEach((stream, index) => {
        const streamDiv = document.createElement('div');
        streamDiv.className = 'torrent-item';
        streamDiv.style.cursor = 'default';
        
        const name = stream.name || `Stream ${index + 1}`;
        const title = stream.title || '';
        const url = stream.url;
        
        const titleLines = title.split('\n');
        const mainTitle = titleLines[0] || '';
        const details = titleLines[1] || '';
        
        const isMacOS = window.electronAPI?.platform === 'darwin';
        const vlcButtonHtml = isMacOS ? '' : `
            <button class="torrent-btn vlc-nuvio-btn" data-url="${url}" data-name="${name}">
                <i class="fas fa-external-link-alt"></i> Open in VLC
            </button>
        `;
        
        streamDiv.innerHTML = `
            <div class="torrent-info">
                <div class="torrent-name">${name}</div>
                ${mainTitle ? `<div style="color: var(--gray); font-size: 0.85rem; margin: 0.25rem 0;">${mainTitle}</div>` : ''}
                ${details ? `<div class="torrent-details"><span>${details}</span></div>` : ''}
            </div>
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                <button class="torrent-btn play-nuvio-btn" data-url="${url}" data-name="${name}">
                    <i class="fas fa-play"></i> Play Now
                </button>
                <button class="torrent-btn mpv-nuvio-btn" data-url="${url}" data-name="${name}">
                    <i class="fas fa-external-link-alt"></i> Open in MPV
                </button>
                ${vlcButtonHtml}
                <button class="torrent-btn cast-nuvio-btn" data-url="${url}" data-name="${name}">
                    <i class="fas fa-tv"></i> Cast
                </button>
                <button class="torrent-btn copy-nuvio-btn" data-url="${url}" data-name="${name}">
                    <i class="fas fa-copy"></i> Copy Link
                </button>
            </div>
        `;
        
        torrentsList.appendChild(streamDiv);
    });

    // Add event listeners for Nuvio buttons
    attachNuvioEventListeners();
}

function attachNuvioEventListeners() {
    document.querySelectorAll('.play-nuvio-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const url = btn.dataset.url;
            const name = btn.dataset.name;
            await playNuvioStream(url, name);
        });
    });

    document.querySelectorAll('.mpv-nuvio-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const url = btn.dataset.url;
            const name = btn.dataset.name;
            openNuvioInMPV(url, name);
        });
    });

    document.querySelectorAll('.vlc-nuvio-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const url = btn.dataset.url;
            const name = btn.dataset.name;
            openNuvioInVLC(url, name);
        });
    });

    document.querySelectorAll('.cast-nuvio-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const url = btn.dataset.url;
            const name = btn.dataset.name;
            currentStreamUrl = url;
            currentSelectedVideoName = name;
            if (typeof showChromecastDevicePicker === 'function') {
                await showChromecastDevicePicker();
            } else {
                showNotification('Chromecast not available', 'error');
            }
        });
    });

    document.querySelectorAll('.copy-nuvio-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const url = btn.dataset.url;
            const name = btn.dataset.name;
            await navigator.clipboard.writeText(url);
            showNotification(`Stream link copied: ${name}`, 'success');
        });
    });
}

async function playNuvioStream(url, name) {
    try {
        const currentContent = getCurrentContent();
        const currentMediaType = getCurrentMediaType();
        const lastSearchedSeason = getLastSearchedSeason();
        const lastSearchedEpisode = getLastSearchedEpisode();
        const useDebrid = getUseDebrid();
        
        currentStreamUrl = url;
        currentSelectedVideoName = name;
        
        const tmdbId = currentContent?.id?.toString() || '';
        let seasonNum = null;
        let episodeNum = null;
        if (currentMediaType === 'tv' && lastSearchedSeason && lastSearchedEpisode) {
            seasonNum = String(lastSearchedSeason);
            episodeNum = String(lastSearchedEpisode);
        }

        await playStreamWithSelectedPlayer(url, {
            tmdbId,
            seasonNum,
            episodeNum,
            isDebrid: useDebrid,
            name
        });
    } catch (error) {
        console.error('[Nuvio] Play error:', error);
        showNotification('Failed to play stream', 'error');
    }
}

async function openNuvioInMPV(url, name) {
    try {
        if (!window.electronAPI || !window.electronAPI.openInMPV) {
            showNotification('MPV integration not available', 'error');
            return;
        }
        
        currentStreamUrl = url;
        currentSelectedVideoName = name;
        
        const data = {
            streamUrl: url,
            infoHash: null,
            startSeconds: undefined
        };
        
        const result = await window.electronAPI.openInMPV(data);
        if (result.success) {
            showNotification('Opened in MPV', 'success');
        } else {
            showNotification(`MPV Error: ${result.message}`, 'error');
        }
    } catch (error) {
        console.error('[Nuvio] MPV open error:', error);
        showNotification('Failed to open in MPV', 'error');
    }
}

async function openNuvioInVLC(url, name) {
    try {
        const currentContent = getCurrentContent();
        const currentMediaType = getCurrentMediaType();
        const currentSeason = getCurrentSeason();
        
        if (!window.electronAPI || !window.electronAPI.openInVLC) {
            showNotification('VLC integration not available', 'error');
            return;
        }
        
        currentStreamUrl = url;
        currentSelectedVideoName = name;

        const title = currentContent?.title || currentContent?.name || 'Video';
        const seasonNum = (currentMediaType === 'tv' && currentSeason) ? currentSeason : null;
        updateDiscordForStreaming(title, 'Nuvio', seasonNum);

        const data = {
            streamUrl: url,
            infoHash: null,
            startSeconds: undefined
        };
        const result = await window.electronAPI.openInVLC(data);
        if (result?.success) {
            showNotification('Opened in VLC', 'success');
        } else {
            showNotification(`VLC Error: ${result?.message || 'Unknown error'}`, 'error');
        }
    } catch (error) {
        console.error('[Nuvio] VLC open error:', error);
        showNotification('Failed to open in VLC', 'error');
    }
}

// ===== COMET API PROVIDER =====

async function fetchCometTorrents(season = null, episode = null) {
    const currentContent = getCurrentContent();
    const currentMediaType = getCurrentMediaType();
    if (!currentContent) return;

    const torrentsList = document.getElementById('torrentsList');
    torrentsList.innerHTML = '<div class="loading"><i class="fas fa-spinner"></i> Searching Comet...</div>';

    try {
        const tmdbId = currentContent.id;
        const mediaType = currentMediaType;

        const externalIdsUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}/external_ids?api_key=${TMDB_API_KEY}`;
        const externalIdsRes = await fetch(externalIdsUrl);
        if (!externalIdsRes.ok) throw new Error('Failed to get IMDB ID from TMDB');
        
        const externalIds = await externalIdsRes.json();
        const imdbId = externalIds.imdb_id;
        
        if (!imdbId) throw new Error('No IMDB ID found for this content');

        const cometConfig = 'eyJtYXhSZXN1bHRzUGVyUmVzb2x1dGlvbiI6MCwibWF4U2l6ZSI6MCwiY2FjaGVkT25seSI6dHJ1ZSwicmVtb3ZlVHJhc2giOnRydWUsInJlc3VsdEZvcm1hdCI6WyJhbGwiXSwiZGVicmlkU2VydmljZSI6InRvcnJlbnQiLCJkZWJyaWRBcGlLZXkiOiIiLCJkZWJyaWRTdHJlYW1Qcm94eVBhc3N3b3JkIjoiIiwibGFuZ3VhZ2VzIjp7ImV4Y2x1ZGUiOltdLCJwcmVmZXJyZWQiOlsiZW4iXX0sInJlc29sdXRpb25zIjp7fSwib3B0aW9ucyI6eyJyZW1vdmVfcmFua3NfdW5kZXIiOi0xMDAwMDAwMDAwMCwiYWxsb3dfZW5nbGlzaF9pbl9sYW5ndWFnZXMiOmZhbHNlLCJyZW1vdmVfdW5rbm93bl9sYW5ndWFnZXMiOmZhbHNlfX0=';

        let cometUrl;
        if (mediaType === 'movie') {
            cometUrl = `${API_BASE_URL}/comet/stream/movie/${imdbId}?config=${cometConfig}`;
        } else if (season && episode) {
            cometUrl = `${API_BASE_URL}/comet/stream/series/${imdbId}:${season}:${episode}?config=${cometConfig}`;
        } else {
            throw new Error('Season and episode required for TV shows');
        }

        const response = await fetch(cometUrl);
        if (!response.ok) throw new Error(`Comet error: ${response.statusText}`);
        
        const data = await response.json();
        const streams = data.streams || [];

        if (streams.length === 0) {
            torrentsList.innerHTML = '<div class="error-message"><i class="fas fa-info-circle"></i> No Comet torrents found</div>';
            return;
        }

        const torrents = streams.map(stream => {
            const infoHash = stream.infoHash;
            const sources = stream.sources || [];
            const name = stream.name || 'Unknown';
            const displayTitle = (stream.behaviorHints && stream.behaviorHints.filename) ? stream.behaviorHints.filename : name;
            const fileName = displayTitle;
            const fileIdx = stream.fileIdx !== undefined ? stream.fileIdx : 0;
            
            let magnetLink = `magnet:?xt=urn:btih:${infoHash}&dn=${encodeURIComponent(fileName)}`;
            sources.forEach(tracker => {
                magnetLink += `&tr=${encodeURIComponent(tracker)}`;
            });
            if (fileIdx > 0) {
                magnetLink += `&so=${fileIdx}`;
            }
            
            let sizeBytes = 0;
            if (stream.behaviorHints && stream.behaviorHints.videoSize) {
                sizeBytes = stream.behaviorHints.videoSize;
            }
            
            return {
                title: displayTitle,
                magnet: magnetLink,
                seeders: 0,
                size: sizeBytes,
                description: stream.description || ''
            };
        }).filter(Boolean);

        displayTorrents(torrents, season, episode);

    } catch (error) {
        console.error('[Comet] Error:', error);
        torrentsList.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-triangle"></i> Comet Error: ${error.message}</div>`;
    }
}

// ===== MOVIEBOX PROVIDER =====

async function fetchMovieBoxStreams(season = null, episode = null) {
    const currentContent = getCurrentContent();
    const currentMediaType = getCurrentMediaType();
    if (!currentContent) return;

    const torrentsList = document.getElementById('torrentsList');
    torrentsList.innerHTML = '<div class="loading"><i class="fas fa-spinner"></i> Searching MovieBox...</div>';

    try {
        const tmdbId = currentContent.id;
        const mediaType = currentMediaType;

        let apiUrl;
        if (mediaType === "movie") {
            apiUrl = getTorrentsApiUrl(`astra/${encodeURIComponent(tmdbId)}`);
        } else if (season && episode) {
            apiUrl = getTorrentsApiUrl(`tv/${encodeURIComponent(tmdbId)}/${encodeURIComponent(season)}/${encodeURIComponent(episode)}`);
        } else {
            throw new Error("Season and episode required for TV shows");
        }

        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`MovieBox API error: ${response.statusText}`);

        const data = await response.json();
        if (!data?.Astra?.playlist || !Array.isArray(data.Astra.playlist)) {
            torrentsList.innerHTML = '<div class="error-message"><i class="fas fa-info-circle"></i> No MovieBox streams found</div>';
            return;
        }

        const playlist = data.Astra.playlist;

        if (playlist.length === 0) {
            torrentsList.innerHTML = '<div class="error-message"><i class="fas fa-info-circle"></i> No MovieBox streams found</div>';
            return;
        }

        const processedFiles = playlist.map(item => {
            const quality = item.resolution + "p";
            return {
                name: `MovieBox ${quality}`,
                quality: quality,
                sizeFormatted: "Unknown Size",
                sizeBytes: 0,
                url: item.url,
                streamLink: item.url
            };
        });

        window._last111477Files = processedFiles;
        render111477Files(processedFiles);

    } catch (error) {
        console.error("[MovieBox] Error:", error);
        torrentsList.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-triangle"></i> MovieBox Error: ${error.message}</div>`;
    }
}

// ===== 111477 PROVIDER =====

async function fetch111477Streams(season = null, episode = null) {
    const currentContent = getCurrentContent();
    const currentMediaType = getCurrentMediaType();
    if (!currentContent) return;

    const torrentsList = document.getElementById('torrentsList');
    torrentsList.innerHTML = '<div class="loading"><i class="fas fa-spinner"></i> Searching 111477...</div>';

    try {
        const tmdbId = currentContent.id;
        const mediaType = currentMediaType;

        let apiUrl;
        if (mediaType === 'movie') {
            apiUrl = `http://localhost:6987/111477/api/tmdb/movie/${encodeURIComponent(tmdbId)}`;
        } else if (season && episode) {
            apiUrl = `http://localhost:6987/111477/api/tmdb/tv/${encodeURIComponent(tmdbId)}/season/${encodeURIComponent(season)}/episode/${encodeURIComponent(episode)}`;
        } else {
            throw new Error('Season and episode required for TV shows');
        }

        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`111477 API error: ${response.statusText}`);
        
        const data = await response.json();
        
        let allFiles = [];
        if (Array.isArray(data?.results)) {
            data.results.forEach(result => {
                if (result.success && Array.isArray(result.files)) {
                    allFiles = allFiles.concat(result.files);
                }
            });
        } else if (Array.isArray(data?.files)) {
            allFiles = data.files;
        }

        if (allFiles.length === 0) {
            torrentsList.innerHTML = '<div class="error-message"><i class="fas fa-info-circle"></i> No 111477 streams found</div>';
            return;
        }

        function extractQuality(filename) {
            const qualities = ['2160p', '4K', '1080p', '720p', '480p', '360p'];
            for (const q of qualities) {
                if (filename.includes(q)) return q;
            }
            if (filename.match(/BluRay|Blu-Ray/i)) return 'BluRay';
            if (filename.match(/WEBRip|WEB-DL/i)) return 'WEB';
            if (filename.match(/HDTV/i)) return 'HDTV';
            return 'Unknown';
        }

        function formatFileSize(bytes) {
            if (!bytes || bytes === 0) return 'Unknown Size';
            const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(1024));
            return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
        }

        const processedFiles = allFiles.map(file => {
            const fileName = file.name || '';
            const quality = extractQuality(fileName);
            const sizeBytes = parseInt(file.size) || 0;
            const sizeFormatted = formatFileSize(sizeBytes);
            
            return {
                ...file,
                quality: quality,
                sizeFormatted: sizeFormatted,
                sizeBytes: sizeBytes
            };
        });

        window._last111477Files = processedFiles;
        render111477Files(processedFiles);

    } catch (error) {
        console.error('[111477] Error:', error);
        torrentsList.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-triangle"></i> 111477 Error: ${error.message}</div>`;
    }
}

// Helper: size filter matcher
function bytesMatchesSizeFilter(bytes) {
    const n = Number(bytes) || 0;
    try {
        switch (torrentSizeFilter) {
            case 'gte-1g': return n >= (1024 ** 3);
            case 'gte-2g': return n >= (2 * 1024 ** 3);
            case '2-4g':  return n >= (2 * 1024 ** 3) && n < (4 * 1024 ** 3);
            case '4-8g':  return n >= (4 * 1024 ** 3) && n < (8 * 1024 ** 3);
            case 'gte-8g': return n >= (8 * 1024 ** 3);
            case 'all':
            default: return true;
        }
    } catch(_) {
        return true;
    }
}

// Render helper for 111477 files
function render111477Files(files) {
    const torrentsList = document.getElementById('torrentsList');
    torrentsList.innerHTML = '';
    let list = (files || []).slice();
    try {
        const mode = (typeof torrentSortMode === 'string') ? torrentSortMode : 'seeders';
        list = list.filter(f => bytesMatchesSizeFilter(f.sizeBytes));
        if (mode === 'size-desc') list.sort((a,b) => (Number(b.sizeBytes||0) - Number(a.sizeBytes||0)));
        else list.sort((a,b) => (Number(a.sizeBytes||0) - Number(b.sizeBytes||0)));
    } catch(_) {}

    list.forEach(file => {
        const item = document.createElement('div');
        item.className = 'torrent-item';
        item.style.display = 'flex';
        item.style.justifyContent = 'space-between';
        item.style.alignItems = 'center';
        item.style.padding = '1rem';

        const infoDiv = document.createElement('div');
        infoDiv.style.flex = '1';
        infoDiv.style.minWidth = '0';

        const name = document.createElement('div');
        name.style.fontWeight = '500';
        name.style.marginBottom = '0.25rem';
        name.textContent = file.name || 'Unknown';

        const details = document.createElement('div');
        details.style.fontSize = '0.85rem';
        details.style.opacity = '0.7';
        details.textContent = `${file.quality} • ${file.sizeFormatted}`;

        infoDiv.appendChild(name);
        infoDiv.appendChild(details);

        const buttonsDiv = document.createElement('div');
        buttonsDiv.style.display = 'flex';
        buttonsDiv.style.gap = '0.5rem';
        buttonsDiv.style.marginLeft = '1rem';

        const playBtn = document.createElement('button');
        playBtn.className = 'btn';
        playBtn.innerHTML = '<i class="fas fa-play"></i> Play';
        playBtn.onclick = async () => {
            try {
                const currentContent = getCurrentContent();
                const currentMediaType = getCurrentMediaType();
                const lastSearchedSeason = getLastSearchedSeason();
                const lastSearchedEpisode = getLastSearchedEpisode();
                const useDebrid = getUseDebrid();
                
                const tmdbId = currentContent?.id?.toString() || '';
                let seasonNum = null;
                let episodeNum = null;
                if (currentMediaType === 'tv' && lastSearchedSeason && lastSearchedEpisode) {
                    seasonNum = String(lastSearchedSeason);
                    episodeNum = String(lastSearchedEpisode);
                }
                
                await playStreamWithSelectedPlayer(file.streamLink || file.url, {
                    tmdbId,
                    seasonNum,
                    episodeNum,
                    isDebrid: useDebrid,
                    name: file.name
                });
            } catch (error) {
                console.error('[111477] Play error:', error);
                showNotification('Failed to play stream', 'error');
            }
        };

        const copyBtn = document.createElement('button');
        copyBtn.className = 'btn';
        copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy';
        copyBtn.onclick = async () => {
            await navigator.clipboard.writeText(file.streamLink || file.url);
            showNotification('Link copied', 'success');
        };

        buttonsDiv.appendChild(playBtn);
        buttonsDiv.appendChild(copyBtn);

        item.appendChild(infoDiv);
        item.appendChild(buttonsDiv);
        torrentsList.appendChild(item);
    });
}

// ===== XDMOVIES PROVIDER =====

async function fetchXDMoviesStreams(season = null, episode = null) {
    const currentContent = getCurrentContent();
    const currentMediaType = getCurrentMediaType();
    if (!currentContent) return;

    const torrentsList = document.getElementById('torrentsList');
    torrentsList.innerHTML = '<div class="loading"><i class="fas fa-spinner"></i> Searching XDmovies...</div>';

    try {
        if (currentMediaType === 'tv') {
            torrentsList.innerHTML = '<div class="error-message"><i class="fas fa-info-circle"></i> XDmovies is for movies only, not TV shows.</div>';
            return;
        }

        const tmdbId = currentContent.id;
        const apiUrl = getTorrentsApiUrl(`xdmovies/${encodeURIComponent(tmdbId)}`);

        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`XDmovies API error: ${response.statusText}`);
        
        const data = await response.json();
        
        if (!data.success || !data.downloads) {
            torrentsList.innerHTML = `<div class="error-message"><i class="fas fa-info-circle"></i> ${data.message || 'No XDmovies streams found'}</div>`;
            return;
        }

        const downloads = data.downloads || [];

        if (downloads.length === 0) {
            torrentsList.innerHTML = '<div class="error-message"><i class="fas fa-info-circle"></i> No XDmovies streams found</div>';
            return;
        }

        torrentsList.innerHTML = '';
        downloads.forEach((download, idx) => {
            const div = document.createElement('div');
            div.className = 'torrent-item';
            div.style.display = 'flex';
            div.style.flexDirection = 'column';
            div.style.padding = '1rem';
            div.style.marginBottom = '0.5rem';

            const title = document.createElement('div');
            title.style.fontWeight = '500';
            title.style.marginBottom = '0.5rem';
            title.textContent = download.title || `Download ${idx + 1}`;

            const sizeInfo = document.createElement('div');
            sizeInfo.style.fontSize = '0.85rem';
            sizeInfo.style.opacity = '0.7';
            sizeInfo.style.marginBottom = '0.5rem';
            sizeInfo.textContent = download.size || 'Unknown Size';

            const buttonsDiv = document.createElement('div');
            buttonsDiv.style.display = 'flex';
            buttonsDiv.style.flexWrap = 'wrap';
            buttonsDiv.style.gap = '0.5rem';

            const serverLinks = download.serverLinks || [];
            if (serverLinks.length === 0) {
                const noServerMsg = document.createElement('div');
                noServerMsg.style.fontSize = '0.9rem';
                noServerMsg.style.opacity = '0.6';
                noServerMsg.textContent = 'No playable links available';
                buttonsDiv.appendChild(noServerMsg);
            } else {
                serverLinks.forEach(server => {
                    const btn = document.createElement('button');
                    btn.className = 'btn';
                    btn.style.padding = '0.5rem 1rem';
                    btn.style.fontSize = '0.9rem';
                    btn.innerHTML = `<i class="fas fa-play"></i> ${server.name}`;
                    btn.onclick = async (e) => {
                        e.stopPropagation();
                        if (!server.url) {
                            showNotification('No URL available for this server');
                            return;
                        }
                        try {
                            const currentContent = getCurrentContent();
                            const useDebrid = getUseDebrid();
                            
                            const movieTitle = currentContent?.title || currentContent?.name || 'Movie';
                            updateDiscordForStreaming(movieTitle, 'XDmovies', null);
                            
                            const tmdbId = currentContent?.id?.toString() || '';
                            await playStreamWithSelectedPlayer(server.url, {
                                tmdbId,
                                seasonNum: null,
                                episodeNum: null,
                                isDebrid: useDebrid,
                                name: server.name
                            });
                        } catch (error) {
                            console.error('[XDmovies] Player error:', error);
                            showNotification('Failed to open player: ' + error.message, 'error');
                        }
                    };
                    buttonsDiv.appendChild(btn);
                });
            }

            div.appendChild(title);
            div.appendChild(sizeInfo);
            div.appendChild(buttonsDiv);
            torrentsList.appendChild(div);
        });
    } catch (error) {
        console.error('[XDmovies] Error:', error);
        torrentsList.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-triangle"></i> XDmovies Error: ${error.message}</div>`;
    }
}

// ===== TORRENT DISPLAY AND PAGINATION =====

// State variables for torrent display
let allTorrents = [];
let torrentsPage = 1;
let torrentsPerPage = 10;
let torrentSortMode = 'seeders';
let torrentSizeFilter = 'all';
let torrentKeywordFilter = null;

function displayTorrents(torrents, season = null, episode = null) {
    console.log('[displayTorrents] Called with', torrents?.length || 0, 'torrents, season:', season, 'episode:', episode);
    const currentMediaType = getCurrentMediaType();
    console.log('[displayTorrents] currentMediaType:', currentMediaType);
    // Compute episode match scores if TV ep context; actual sorting applied in renderTorrentsPage based on current sort mode
    if (season && episode && currentMediaType === 'tv') {
        allTorrents = (torrents || []).map(t => ({
            ...t,
            episodeMatchScore: getEpisodeMatchScore(t.title, season, episode)
        }));
    } else {
        allTorrents = (torrents || []).slice();
    }
    console.log('[displayTorrents] allTorrents set to', allTorrents.length, 'items');
    torrentsPage = 1;
    renderTorrentsPage();
}

function renderTorrentsPage() {
    const currentMediaType = getCurrentMediaType();
    const lastSearchedSeason = getLastSearchedSeason();
    const lastSearchedEpisode = getLastSearchedEpisode();
    
    const torrentsList = document.getElementById('torrentsList');
    if (!torrentsList) {
        console.error('[RENDER] torrentsList element NOT FOUND!');
        return;
    }
    
    console.log('[RENDER] allTorrents has', allTorrents?.length || 0, 'items');
    
    torrentsList.innerHTML = '';
    
    console.log('[RENDER] Starting renderTorrentsPage with sort mode:', torrentSortMode);
    
    // Apply sorting according to mode (keeping episode match priority for TV episodes)
    const isTvEp = currentMediaType === 'tv' && lastSearchedSeason && lastSearchedEpisode;
    const toSort = (allTorrents || []).slice();
    
    console.log('[RENDER] Total torrents to sort:', toSort.length, 'isTvEp:', isTvEp);
    
    toSort.sort((a, b) => {
        // TV episode exact match priority (always first)
        if (isTvEp) {
            const ea = Number(a.episodeMatchScore || 0);
            const eb = Number(b.episodeMatchScore || 0);
            if (eb !== ea) return eb - ea; // primary: episode match
        }
        
        // Apply selected sort mode
        const mode = (typeof torrentSortMode === 'string') ? torrentSortMode : 'seeders';
        
        if (mode === 'size-asc') {
            const sa = Number(a.size || 0);
            const sb = Number(b.size || 0);
            return sa - sb; // smallest first
        } else if (mode === 'size-desc') {
            const sa = Number(a.size || 0);
            const sb = Number(b.size || 0);
            return sb - sa; // largest first
        } else {
            // default: seeders desc
            const seeda = Number(a.seeders || 0);
            const seedb = Number(b.seeders || 0);
            return seedb - seeda;
        }
    });
    
    console.log('[RENDER] After sort, first 3 torrents:');
    toSort.slice(0, 3).forEach((t, i) => {
        console.log(`  ${i+1}. Size: ${((t.size||0)/1024/1024/1024).toFixed(2)}GB, Seeds: ${t.seeders}, Title: ${t.title?.substring(0, 50)}`);
    });
    
    // Apply keyword filter
    let filteredTorrents = toSort;
    const keywordEl = document.getElementById('torrentKeywordFilter');
    const keyword = keywordEl ? keywordEl.value.trim().toLowerCase() : '';
    if (keyword) {
        filteredTorrents = toSort.filter(t => 
            (t.title || '').toLowerCase().includes(keyword)
        );
    }

    // Apply size filter
    try {
        const sizeFilterEl = document.getElementById('torrentSizeFilter');
        if (sizeFilterEl && sizeFilterEl.value !== 'all') {
            torrentSizeFilter = sizeFilterEl.value;
            filteredTorrents = filteredTorrents.filter(t => bytesMatchesSizeFilter(t.size));
        }
    } catch(_) {}
    
    if (filteredTorrents.length === 0) {
        torrentsList.innerHTML = keyword 
            ? '<p>No torrents match your filter.</p>' 
            : '<p>No torrents found. Try enabling <strong>Streaming Servers</strong> in the app settings for more sources.</p>';
        return;
    }

    const start = (torrentsPage - 1) * torrentsPerPage;
    const end = start + torrentsPerPage;
    const paginatedTorrents = filteredTorrents.slice(start, end);

    paginatedTorrents.forEach(torrent => {
        const item = document.createElement('div');
        item.className = 'torrent-item';
        item.innerHTML = `
            <div class="torrent-info">
                <p class="torrent-name">
                    ${torrent.title}
                    <span class="cached-badge" style="display:none; padding: 2px 6px; border-radius: 4px; font-size: 0.8em; margin-left: 8px;"></span>
                </p>
                <div class="torrent-details">
                    <span><i class="fas fa-arrow-up"></i> ${torrent.seeders}</span>
                    <span><i class="fas fa-database"></i> ${((torrent.size || 0) / 1024 / 1024 / 1024).toFixed(2)} GB</span>
                </div>
            </div>
            <div class="torrent-actions">
                <button class="btn-play torrent-btn"><i class="fas fa-play"></i> Play</button>
                <button class="btn-copy torrent-btn"><i class="fas fa-copy"></i> Copy</button>
            </div>
        `;

        const playButton = item.querySelector('.btn-play');
        if (playButton) {
            if (torrent.streamUrl) {
                 playButton.addEventListener('click', async (e) => {
                     e.stopPropagation();
                     try {
                         const currentContent = getCurrentContent();
                         const currentMediaType = getCurrentMediaType();
                         const lastSearchedSeason = getLastSearchedSeason();
                         const lastSearchedEpisode = getLastSearchedEpisode();
                         const currentSeason = getCurrentSeason();
                         const useDebrid = getUseDebrid();
                         
                         const tmdbId = currentContent?.id?.toString() || '';
                         let seasonNum = null;
                         let episodeNum = null;
                         
                         // Determine season/episode if TV show
                         if (currentMediaType === 'tv') {
                             if (lastSearchedSeason && lastSearchedEpisode) {
                                 seasonNum = String(lastSearchedSeason);
                                 episodeNum = String(lastSearchedEpisode);
                             } else if (currentSeason) {
                                 // Fallback if lastSearched vars aren't set but currentSeason is
                                 seasonNum = String(currentSeason);
                                 // Try to parse episode from title if not explicit
                                 const epMatch = (torrent.title || '').match(/[E|e](\d+)/);
                                 if (epMatch) episodeNum = epMatch[1];
                             }
                         }

                         await playStreamWithSelectedPlayer(torrent.streamUrl, {
                             tmdbId,
                             seasonNum,
                             episodeNum,
                             isDebrid: useDebrid,
                             name: torrent.title
                         });
                     } catch (err) {
                         console.error('[Addon] Play Now error:', err);
                         if (typeof showNotification === 'function') showNotification('Failed to play: ' + (err?.message || 'Unknown error'));
                     }
                 });
            } else if (torrent.magnet) {
                playButton.addEventListener('click', () => {
                    if (typeof startStream === 'function') startStream(torrent.magnet);
                });
            } else if (torrent.torrentFileUrl) {
                playButton.addEventListener('click', () => {
                    if (typeof handleTorrentFileUrl === 'function') handleTorrentFileUrl(torrent);
                });
            }
        }
        
        const copyButton = item.querySelector('.btn-copy');
        if(copyButton) {
            if (torrent.streamUrl) {
                 copyButton.addEventListener('click', () => {
                     navigator.clipboard.writeText(torrent.streamUrl).then(() => {
                         if (typeof showNotification === 'function') showNotification('Stream URL copied to clipboard');
                     });
                 });
            } else if (torrent.magnet) {
                copyButton.addEventListener('click', () => {
                    if (typeof copyMagnet === 'function') copyMagnet(torrent.magnet);
                });
            } else if (torrent.torrentFileUrl) {
                copyButton.addEventListener('click', () => {
                    navigator.clipboard.writeText(torrent.torrentFileUrl).then(() => {
                        if (typeof showNotification === 'function') showNotification('Torrent file URL copied to clipboard');
                    });
                });
            }
        }

        torrentsList.appendChild(item);
    });

    renderTorrentPagination();
}

function renderTorrentPagination() {
    const torrentsList = document.getElementById('torrentsList');
    if (!torrentsList) return;
    
    // Apply same keyword filter for pagination count
    let filteredTorrents = allTorrents;
    const keywordEl = document.getElementById('torrentKeywordFilter');
    const keyword = keywordEl ? keywordEl.value.trim().toLowerCase() : '';
    if (keyword) {
        filteredTorrents = allTorrents.filter(t => 
            (t.title || '').toLowerCase().includes(keyword)
        );
    }

    // Apply size filter as well for accurate page count
    try {
        const sizeFilterEl = document.getElementById('torrentSizeFilter');
        if (sizeFilterEl && sizeFilterEl.value !== 'all') {
            filteredTorrents = filteredTorrents.filter(t => bytesMatchesSizeFilter(t.size));
        }
    } catch(_) {}
    
    const totalPages = Math.ceil(filteredTorrents.length / torrentsPerPage);
    if (totalPages <= 1) {
        return;
    }

    const paginationContainer = document.createElement('div');
    paginationContainer.className = 'torrent-pagination';

    const prevBtn = document.createElement('button');
    prevBtn.innerHTML = '<i class="fas fa-arrow-left"></i>';
    prevBtn.disabled = torrentsPage === 1;
    prevBtn.addEventListener('click', () => {
        if (torrentsPage > 1) {
            torrentsPage--;
            renderTorrentsPage();
        }
    });

    const nextBtn = document.createElement('button');
    nextBtn.innerHTML = '<i class="fas fa-arrow-right"></i>';
    nextBtn.disabled = torrentsPage === totalPages;
    nextBtn.addEventListener('click', () => {
        if (torrentsPage < totalPages) {
            torrentsPage++;
            renderTorrentsPage();
        }
    });

    const pageInfo = document.createElement('span');
    pageInfo.textContent = `Page ${torrentsPage} of ${totalPages}`;

    paginationContainer.appendChild(prevBtn);
    paginationContainer.appendChild(pageInfo);
    paginationContainer.appendChild(nextBtn);

    torrentsList.appendChild(paginationContainer);
}

function bytesMatchesSizeFilter(bytes) {
    const gb = (bytes || 0) / 1024 / 1024 / 1024;
    switch (torrentSizeFilter) {
        case 'gte-1g': return gb >= 1;
        case 'gte-2g': return gb >= 2;
        case '2-4g': return gb >= 2 && gb < 4;
        case '4-8g': return gb >= 4 && gb < 8;
        case 'gte-8g': return gb >= 8;
        default: return true;
    }
}

async function handleTorrentFileUrl(torrent) {
    if (!torrent || !torrent.torrentFileUrl) return;

    if (typeof showNotification === 'function') showNotification('Resolving torrent file...', 'info');
    try {
        const API_BASE_URL = window.API_BASE_URL || 'http://localhost:6987';
        const response = await fetch(`${API_BASE_URL}/resolve-torrent-file?url=${encodeURIComponent(torrent.torrentFileUrl)}&title=${encodeURIComponent(torrent.title)}`);
        const data = await response.json();

        if (response.ok && data.magnet) {
            if (typeof showNotification === 'function') showNotification('Torrent resolved, starting stream...', 'success');
            if (typeof startStream === 'function') await startStream(data.magnet);
        } else {
            throw new Error(data.error || 'Failed to resolve torrent file');
        }
    } catch (error) {
        console.error('Error resolving torrent file:', error);
        if (typeof showNotification === 'function') showNotification(error.message, 'error');
    }
}

// Export functions for use in other modules
window.fetchNuvioStreams = fetchNuvioStreams;
window.fetchCometTorrents = fetchCometTorrents;
window.fetchMovieBoxStreams = fetchMovieBoxStreams;
window.fetch111477Streams = fetch111477Streams;
window.fetchXDMoviesStreams = fetchXDMoviesStreams;
window.displayNuvioStreams = displayNuvioStreams;
window.render111477Files = render111477Files;
window.displayTorrents = displayTorrents;
window.renderTorrentsPage = renderTorrentsPage;
window.renderTorrentPagination = renderTorrentPagination;
window.bytesMatchesSizeFilter = bytesMatchesSizeFilter;
window.handleTorrentFileUrl = handleTorrentFileUrl;
window.getEpisodeMatchScore = getEpisodeMatchScore;

console.log('[Torrents] Exported displayTorrents:', typeof window.displayTorrents);

// Export state variables
Object.defineProperty(window, 'allTorrents', {
    get: function() { return allTorrents; },
    set: function(val) { allTorrents = val; }
});
Object.defineProperty(window, 'allNuvioStreams', {
    get: function() { return allNuvioStreams; },
    set: function(val) { allNuvioStreams = val; }
});
Object.defineProperty(window, 'torrentSortMode', {
    get: function() { return torrentSortMode; },
    set: function(val) { torrentSortMode = val; }
});
Object.defineProperty(window, 'torrentSizeFilter', {
    get: function() { return torrentSizeFilter; },
    set: function(val) { torrentSizeFilter = val; }
});

console.log('[Torrents] Torrent provider functions module loaded');
