// Streaming Servers Module
// Handles server selection and video player for streaming services

// Server state
let currentMediaData = null;
let selectedServer = localStorage.getItem('selectedServer') || 'Videasy';

// DOM elements
let serverSelectionModal, serverSelectionBack, serverDropdown, serverWatchBtn, serverTorrentBtn;
let videoPlayerModal, videoPlayerBack, videoPlayerFrame, videoPlayerFullscreen;
let serverVideoSection, serverVideoFrame, serverVideoClose, serverVideoTitle;

function initServers() {
    // Get DOM elements
    serverSelectionModal = document.getElementById('server-selection-modal');
    serverSelectionBack = document.getElementById('server-selection-back');
    serverDropdown = document.getElementById('server-dropdown');
    serverWatchBtn = document.getElementById('server-watch-btn');
    serverTorrentBtn = document.getElementById('server-torrent-btn');
    
    videoPlayerModal = document.getElementById('video-player-modal');
    videoPlayerBack = document.getElementById('video-player-back');
    videoPlayerFrame = document.getElementById('video-player-frame');
    videoPlayerFullscreen = document.getElementById('video-player-fullscreen');
    
    serverVideoSection = document.getElementById('server-video-section');
    serverVideoFrame = document.getElementById('server-video-frame');
    serverVideoClose = document.getElementById('server-video-close');
    serverVideoTitle = document.getElementById('server-video-title');
    
    // Populate server dropdown
    if (serverDropdown) {
        serverDropdown.innerHTML = '';
        Object.keys(serverConfigs).forEach(serverName => {
            const option = document.createElement('option');
            option.value = serverName;
            option.textContent = serverName;
            if (serverName === selectedServer) {
                option.selected = true;
            }
            serverDropdown.appendChild(option);
        });
    }
    
    setupServerEventListeners();
    console.log('[Servers] Module initialized');
}

// Server configurations
const serverConfigs = {
    'CinemaOS': (type, id, season, episode) =>
        type === 'movie'
            ? `https://cinemaos.tech/player/${id}`
            : `https://cinemaos.tech/player/${id}/${season}/${episode}`,
    'Videasy': (type, id, season, episode) =>
        type === 'movie'
            ? `https://player.videasy.net/movie/${id}`
            : `https://player.videasy.net/tv/${id}/${season}/${episode}`,
    'Vidlink': (type, id, season, episode) =>
        type === 'movie'
            ? `https://vidlink.pro/movie/${id}`
            : `https://vidlink.pro/tv/${id}/${season}/${episode}`,
    'LunaStream': (type, id, season, episode) =>
        type === 'movie'
            ? `https://lunastream.fun/watch/movie/${id}`
            : `https://lunastream.fun/watch/tv/${id}/${season}/${episode}`,
    'VidRock': (type, id, season, episode) =>
        type === 'movie'
            ? `https://vidrock.net/movie/${id}`
            : `https://vidrock.net/tv/${id}/${season}/${episode}`,
    'HexaWatch': (type, id, season, episode) =>
        type === 'movie'
            ? `https://hexa.watch/watch/movie/${id}`
            : `https://hexa.watch/watch/tv/${id}/${season}/${episode}`,
    'FMovies': (type, id, season, episode) =>
        type === 'movie'
            ? `https://www.fmovies.gd/watch/movie/${id}`
            : `https://www.fmovies.gd/watch/tv/${id}/${season}/${episode}`,
    'Xprime': (type, id, season, episode) =>
        type === 'movie'
            ? `https://xprime.tv/watch/${id}`
            : `https://xprime.tv/watch/${id}/${season}/${episode}`,
    'Vidnest': (type, id, season, episode) =>
        type === 'movie'
            ? `https://vidnest.fun/movie/${id}`
            : `https://vidnest.fun/tv/${id}/${season}/${episode}`,
    'veloratv': (type, id, season, episode) =>
        type === 'movie'
            ? `https://veloratv.ru/watch/movie/${id}`
            : `https://veloratv.ru/watch/tv/${id}/${season}/${episode}`,
    'Vidfast 1': (type, id, season, episode) =>
        type === 'movie'
            ? `https://vidfast.pro/movie/${id}`
            : `https://vidfast.pro/tv/${id}/${season}/${episode}`,
    'Vidfast 2': (type, id, season, episode) =>
        type === 'movie'
            ? `https://vidfast.to/embed/movie/${id}`
            : `https://vidfast.to/embed/tv/${id}/${season}/${episode}`,
    '111Movies': (type, id, season, episode) =>
        type === 'movie'
            ? `https://111movies.com/movie/${id}`
            : `https://111movies.com/tv/${id}/${season}/${episode}`,
    'VidSrc 1': (type, id, season, episode) =>
        type === 'movie'
            ? `https://vidsrc.wtf/api/1/movie/?id=${id}&color=e01621`
            : `https://vidsrc.wtf/api/1/tv/?id=${id}&s=${season}&e=${episode}&color=e01621`,
    'VidSrc 2': (type, id, season, episode) =>
        type === 'movie'
            ? `https://vidsrc.wtf/api/2/movie/?id=${id}&color=e01621`
            : `https://vidsrc.wtf/api/2/tv/?id=${id}&s=${season}&e=${episode}&color=e01621`,
    'VidSrc 3': (type, id, season, episode) =>
        type === 'movie'
            ? `https://vidsrc.wtf/api/3/movie/?id=${id}&color=e01621`
            : `https://vidsrc.wtf/api/3/tv/?id=${id}&s=${season}&e=${episode}&color=e01621`,
    'VidSrc 4': (type, id, season, episode) =>
        type === 'movie'
            ? `https://vidsrc.wtf/api/4/movie/?id=${id}&color=e01621`
            : `https://vidsrc.wtf/api/4/tv/?id=${id}&s=${season}&e=${episode}&color=e01621`,
    'PrimeSrc': (type, id, season, episode) =>
        type === 'movie'
            ? `https://primesrc.me/embed/movie?tmdb=${id}`
            : `https://primesrc.me/embed/tv?tmdb=${id}&season=${season}&episode=${episode}`,
    'MovieClub': (type, id, season, episode) =>
        type === 'movie'
            ? `https://moviesapi.club/movie/${id}`
            : `https://moviesapi.club/tv/${id}-${season}-${episode}`,
    'MapleTV': (type, id, season, episode) =>
        type === 'movie'
            ? `https://mapple.uk/watch/movie/${id}`
            : `https://mapple.uk/watch/tv/${id}-${season}-${episode}`,
    '2Embed': (type, id, season, episode) =>
        `https://multiembed.mov/?video_id=${id}&tmdb=1&media_type=${type}${type === 'tv' ? `&season=${season}&episode=${episode}` : ''}`,
    'SmashyStream': (type, id, season, episode) =>
        type === 'movie'
            ? `https://player.smashy.stream/movie/${id}`
            : `https://player.smashy.stream/tv/${id}?s=${season}&e=${episode}`,
    'Autoembed': (type, id, season, episode) =>
        type === 'movie'
            ? `https://player.autoembed.cc/embed/movie/${id}`
            : `https://player.autoembed.cc/embed/tv/${id}/${season}/${episode}`,
    'GoDrivePlayer': (type, id, season, episode) =>
        type === 'movie'
            ? `https://godriveplayer.com/player.php?imdb=${id}`
            : `https://godriveplayer.com/player.php?type=tv&tmdb=${id}&season=${season}&episode=${episode}`,
    'VidWTF Premium': (type, id, season, episode) =>
        type === 'movie'
            ? `https://vidsrc.wtf/api/4/movie/?id=${id}&color=e01621`
            : `https://vidsrc.wtf/api/4/tv/?id=${id}&s=${season}&e=${episode}&color=e01621`,
    'CinemaOS Embed': (type, id, season, episode) =>
        type === 'movie'
            ? `https://cinemaos.tech/embed/movie/${id}`
            : `https://cinemaos.tech/embed/tv/${id}/${season}/${episode}`,
    'GDrivePlayer API': (type, id, season, episode) =>
        type === 'movie'
            ? `https://databasegdriveplayer.xyz/player.php?tmdb=${id}`
            : `https://database.gdriveplayer.us/player.php?type=series&tmdb=${id}&season=${season}&episode=${episode}`,
    'Nontongo': (type, id, season, episode) =>
        type === 'movie'
            ? `https://nontongo.win/embed/movie/${id}`
            : `https://nontongo.win/embed/tv/${id}/${season}/${episode}`,
    'SpencerDevs': (type, id, season, episode) =>
        type === 'movie'
            ? `https://spencerdevs.xyz/movie/${id}`
            : `https://spencerdevs.xyz/tv/${id}/${season}/${episode}`,
    'VidAPI': (type, id, season, episode) =>
        type === 'movie'
            ? `https://vidapi.xyz/embed/movie/${id}`
            : `https://vidapi.xyz/embed/tv/${id}/${season}/${episode}`,
    'Vidify': (type, id, season, episode) =>
        type === 'movie'
            ? `https://vidify.top/embed/movie/${id}`
            : `https://vidify.top/embed/tv/${id}/${season}/${episode}`,
    'VidSrc CX': (type, id, season, episode) =>
        type === 'movie'
            ? `https://vidsrc.cx/embed/movie/${id}`
            : `https://vidsrc.cx/embed/tv/${id}/${season}/${episode}`,
    'VidSrc ME': (type, id, season, episode) =>
        type === 'movie'
            ? `https://vidsrc.me/embed/movie/${id}`
            : `https://vidsrc.me/embed/tv/${id}/${season}/${episode}`,
    'VidSrc TO': (type, id, season, episode) =>
        type === 'movie'
            ? `https://vidsrc.to/embed/movie/${id}`
            : `https://vidsrc.to/embed/tv/${id}/${season}/${episode}`,
    'VidSrc VIP': (type, id, season, episode) =>
        type === 'movie'
            ? `https://vidsrc.vip/embed/movie/${id}`
            : `https://vidsrc.vip/embed/tv/${id}/${season}/${episode}`,
    'VixSrc': (type, id, season, episode) =>
        type === 'movie'
            ? `https://vixsrc.to/movie/${id}/`
            : `https://vixsrc.to/tv/${id}/${season}/${episode}/`
};

function showServerSelection(mediaData) {
    currentMediaData = mediaData;
    window.currentMediaData = mediaData; // Also set on window for compatibility
    
    if (serverSelectionModal) {
        serverSelectionModal.style.display = 'flex';
    }
    
    // Set dropdown to saved server
    if (serverDropdown) {
        serverDropdown.value = selectedServer;
    }
    
    console.log('[Servers] Showing server selection for:', mediaData);
}

function hideServerSelection() {
    if (serverSelectionModal) {
        serverSelectionModal.style.display = 'none';
    }
}

function getStreamingUrl(mediaData, serverName) {
    console.log('[Servers] Generating URL for server:', serverName, 'media:', mediaData);
    
    const serverFunction = serverConfigs[serverName];
    if (!serverFunction) {
        console.error('[Servers] Server not found:', serverName);
        return null;
    }

    const url = serverFunction(
        mediaData.type,
        mediaData.id,
        mediaData.season,
        mediaData.episode
    );
    
    console.log('[Servers] Generated URL:', url);
    return url;
}

function showVideoPlayer(streamUrl, title) {
    console.log('[Servers] Opening video player:', title);
    
    if (!serverVideoSection || !serverVideoFrame) {
        console.error('[Servers] Video player elements not found');
        return;
    }
    
    // Show the video player
    serverVideoSection.style.display = 'block';
    
    // Set title
    if (serverVideoTitle) {
        serverVideoTitle.textContent = title;
    }
    
    // Load stream in iframe
    serverVideoFrame.src = streamUrl;
    
    // Setup URL monitoring
    setupUrlMonitoring(serverVideoFrame, streamUrl);
    
    // Hide server selection modal
    hideServerSelection();
    
    // Update Discord presence
    if (typeof updateDiscordForStreaming === 'function') {
        updateDiscordForStreaming(title);
    }
}

function setupUrlMonitoring(iframe, expectedUrl) {
    if (!iframe) return;
    
    // Extract domain pattern from expected URL
    const urlObj = new URL(expectedUrl);
    const domain = urlObj.hostname;
    const pattern = new RegExp(`^https?://(www\\.)?${domain.replace(/\./g, '\\.')}`);
    
    console.log('[Servers] Setting up URL monitoring for domain:', domain);
    
    // Clear any existing monitor
    if (iframe.monitorInterval) {
        clearInterval(iframe.monitorInterval);
    }
    
    // Periodic URL checking
    const monitorInterval = setInterval(() => {
        try {
            if (!iframe || !iframe.contentWindow || !iframe.parentNode) {
                clearInterval(monitorInterval);
                return;
            }
            
            const currentUrl = iframe.contentWindow.location.href;
            
            if (currentUrl && !pattern.test(currentUrl)) {
                console.error('[Servers] URL violation detected:', currentUrl);
                clearInterval(monitorInterval);
                closeVideoPlayer();
                return;
            }
        } catch (e) {
            // CORS protection - iframe is still on streaming site
        }
    }, 1000);
    
    iframe.monitorInterval = monitorInterval;
}

function closeVideoPlayer() {
    console.log('[Servers] Closing video player');
    
    // Clear Discord presence
    if (typeof clearDiscordPresence === 'function') {
        clearDiscordPresence();
    }
    
    if (serverVideoSection) {
        serverVideoSection.style.display = 'none';
    }
    
    if (serverVideoFrame) {
        // Clear monitoring
        if (serverVideoFrame.monitorInterval) {
            clearInterval(serverVideoFrame.monitorInterval);
        }
        
        serverVideoFrame.src = 'about:blank';
    }
    
    if (serverVideoTitle) {
        serverVideoTitle.textContent = 'Player Closed';
    }
}

function setupServerEventListeners() {
    if (serverSelectionBack) {
        serverSelectionBack.addEventListener('click', hideServerSelection);
    }

    if (serverDropdown) {
        serverDropdown.addEventListener('change', (e) => {
            selectedServer = e.target.value;
            localStorage.setItem('selectedServer', selectedServer);
            console.log('[Servers] Selected server:', selectedServer);
        });
    }

    if (serverWatchBtn) {
        serverWatchBtn.addEventListener('click', () => {
            const mediaData = currentMediaData || window.currentMediaData;
            
            if (!mediaData) {
                showNotification('No media selected', 'error');
                return;
            }
            
            const currentSelectedServer = serverDropdown ? serverDropdown.value : selectedServer;
            const streamUrl = getStreamingUrl(mediaData, currentSelectedServer);
            
            if (streamUrl) {
                const title = `${mediaData.title} - ${currentSelectedServer}`;
                showVideoPlayer(streamUrl, title);
            } else {
                showNotification('Failed to generate streaming URL', 'error');
            }
        });
    }

    if (serverTorrentBtn) {
        serverTorrentBtn.addEventListener('click', () => {
            localStorage.setItem('useStreamingServers', 'false');
            
            const useStreamingServersToggles = document.querySelectorAll('#useStreamingServersToggle');
            useStreamingServersToggles.forEach(toggle => {
                toggle.checked = false;
            });
            
            hideServerSelection();
            
            if (currentMediaData && currentMediaData.fallbackToTorrent) {
                currentMediaData.fallbackToTorrent();
            }
        });
    }

    if (serverVideoClose) {
        serverVideoClose.addEventListener('click', closeVideoPlayer);
    }
}

console.log('[Servers] Streaming servers module loaded');


// Export all functions to window
window.initServers = initServers;
window.showServerSelection = showServerSelection;
window.hideServerSelection = hideServerSelection;
window.getStreamingUrl = getStreamingUrl;
window.showVideoPlayer = showVideoPlayer;
window.setupUrlMonitoring = setupUrlMonitoring;
window.closeVideoPlayer = closeVideoPlayer;
window.setupServerEventListeners = setupServerEventListeners;

console.log('[Servers] Servers module loaded and exported');
