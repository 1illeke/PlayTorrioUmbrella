// Utility Functions
// This file contains general utility functions used throughout the app

// Cache for filename to TMDB lookups
const filenameTmdbCache = new Map();

// ===== FILE NAME UTILITIES =====

function baseName(p) {
    try {
        return String(p || '').split(/[\\\/]/).pop();
    } catch(_) {
        return p || '';
    }
}

// ===== FILE SIZE FORMATTING =====

function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return 'Unknown Size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
}

// ===== QUALITY EXTRACTION =====

function extractQuality(filename) {
    const qualities = ['2160p', '4K', '1080p', '720p', '480p', '360p'];
    for (const q of qualities) {
        if (filename.includes(q)) {
            return q;
        }
    }
    // Check for other indicators
    if (filename.match(/BluRay|Blu-Ray/i)) return 'BluRay';
    if (filename.match(/WEBRip|WEB-DL/i)) return 'WEB';
    if (filename.match(/HDTV/i)) return 'HDTV';
    return 'Unknown';
}

// ===== FILENAME PARSING =====

function parseFromFilename(name = '') {
    try {
        const base = String(name).replace(/\.[^.]+$/,'');
        const cleaned = base
            .replace(/[\[\(].*?[\)\]]/g, ' ')
            .replace(/[_]+/g,' ')
            .replace(/\s{2,}/g,' ')
            .trim();
        const patterns = [
            { re: /(s)(\d{1,2})[ ._-]*e(\d{1,3})/i, season: 2, episode: 3 },
            { re: /\b(\d{1,2})[xX](\d{1,3})\b/, season: 1, episode: 2 },
            { re: /\b(\d{1,2})[ ._-]+(\d{1,2})\b/, season: 1, episode: 2 },
        ];
        let season = null, episode = null, title = cleaned, m = null, idx = -1;
        for (const p of patterns) {
            const mm = cleaned.match(p.re);
            if (mm) {
                const sVal = parseInt(mm[p.season], 10);
                const eVal = parseInt(mm[p.episode], 10);
                if (!isNaN(sVal) && !isNaN(eVal) && sVal <= 99 && eVal <= 999) {
                    season = sVal;
                    episode = eVal;
                    m = mm;
                    idx = mm.index;
                    break;
                }
            }
        }
        if (m && idx >= 0) title = cleaned.slice(0, idx).replace(/[-_.]+$/,'').trim();
        title = title
            .replace(/\b(\d{3,4}p|4k|bluray|web[- ]?dl|webrip|bdrip|hdr|dv|x264|x265|hevc|h264)\b/ig, '')
            .replace(/\s{2,}/g,' ')
            .trim();
        const type = season && episode ? 'tv' : 'movie';
        return { title, season, episode, type };
    } catch {
        return { title: '', season: null, episode: null, type: 'movie' };
    }
}

async function getTmdbFromFilename(filename) {
    if (!filename) return null;
    if (filenameTmdbCache.has(filename)) return filenameTmdbCache.get(filename);
    const parsed = parseFromFilename(filename);
    const result = { id: null, type: parsed.type, season: parsed.season, episode: parsed.episode, title: parsed.title };
    if (!parsed.title) {
        filenameTmdbCache.set(filename, result);
        return result;
    }
    try {
        const endpoint = parsed.type === 'tv' ? 'search/tv' : 'search/movie';
        const url = `https://api.themoviedb.org/3/${endpoint}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(parsed.title)}`;
        const resp = await fetch(url);
        if (resp.ok) {
            const data = await resp.json();
            const items = Array.isArray(data.results) ? data.results : [];
            if (items.length) {
                result.id = items[0].id;
            }
        }
    } catch {}
    filenameTmdbCache.set(filename, result);
    return result;
}

// ===== TIME FORMATTING =====

function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
}

// ===== STRING UTILITIES =====

function truncate(str, maxLength) {
    if (!str || str.length <= maxLength) return str;
    return str.substring(0, maxLength - 3) + '...';
}

function slugify(str) {
    return str
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// ===== DEBOUNCE UTILITY =====

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ===== ARRAY UTILITIES =====

function chunk(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}

function unique(array) {
    return [...new Set(array)];
}

// ===== OBJECT UTILITIES =====

function deepClone(obj) {
    try {
        return JSON.parse(JSON.stringify(obj));
    } catch {
        return obj;
    }
}

// Export functions for use in other modules
window.baseName = baseName;
window.formatFileSize = formatFileSize;
window.extractQuality = extractQuality;
window.parseFromFilename = parseFromFilename;
window.getTmdbFromFilename = getTmdbFromFilename;
window.formatTime = formatTime;
window.truncate = truncate;
window.slugify = slugify;
window.debounce = debounce;
window.chunk = chunk;
window.unique = unique;
window.deepClone = deepClone;

// ===== DISCORD FUNCTIONS =====

let discordStreamingActive = false;

async function isDiscordActivityEnabled() {
    try {
        const API_BASE_URL = window.API_BASE_URL || 'http://localhost:6987';
        const res = await fetch(`${API_BASE_URL}/settings`);
        if (res.ok) {
            const settings = await res.json();
            return settings.discordActivity !== false; // Default to true if not set
        }
    } catch (e) {
        console.warn('[Discord] Could not check activity setting:', e);
    }
    return true; // Default to enabled
}

async function updateDiscordForStreaming(contentTitle, provider = 'PlayTorrio', season = null) {
    if (!window.electronAPI?.updateDiscordPresence) return;
    
    // Check if Discord activity is enabled
    const activityEnabled = await isDiscordActivityEnabled();
    if (!activityEnabled) {
        // Clear Discord presence if disabled
        if (discordStreamingActive) {
            try {
                await window.electronAPI.updateDiscordPresence(null);
                discordStreamingActive = false;
            } catch (e) {
                console.error('[Discord] Failed to clear presence:', e);
            }
        }
        return;
    }
    
    try {
        discordStreamingActive = true;
        
        // For TV shows, append season info (no episode number)
        let displayTitle = contentTitle;
        if (season !== null && season !== undefined) {
            displayTitle = `${contentTitle} - Season ${season}`;
        }
        
        const details = `Watching: ${displayTitle}`;
        const state = `via ${provider}`;
        
        await window.electronAPI.updateDiscordPresence({
            details,
            state,
            startTimestamp: new Date(),
            largeImageKey: 'icon',
            largeImageText: 'PlayTorrio App',
            smallImageKey: 'play',
            smallImageText: 'Streaming',
            buttons: [
                { label: 'Download App', url: 'https://github.com/ayman708-UX/PlayTorrio' }
            ]
        });
    } catch (e) {
        console.error('[Discord] Failed to update streaming presence:', e);
    }
}

async function clearDiscordPresence() {
    if (!window.electronAPI?.clearDiscordPresence) return;
    try {
        await window.electronAPI.clearDiscordPresence();
        discordStreamingActive = false;
    } catch (error) {
        console.error('[Discord] Error clearing presence:', error);
    }
}

function hideDiscordModal() {
    const discordModal = document.getElementById('discordModal');
    if (discordModal) {
        discordModal.style.display = 'none';
    }
}

// Export Discord functions
window.isDiscordActivityEnabled = isDiscordActivityEnabled;
window.updateDiscordForStreaming = updateDiscordForStreaming;
window.clearDiscordPresence = clearDiscordPresence;
window.hideDiscordModal = hideDiscordModal;

// ===== API KEY FUNCTIONS =====

async function loadCurrentApiKey() {
    try {
        const API_BASE_URL = window.API_BASE_URL || 'http://localhost:6987';
        const response = await fetch(`${API_BASE_URL}/api/get-api-key`);
        if (response.ok) {
            const data = await response.json();
            // Update ALL elements with id currentApiKey (there are duplicates in modal and settings page)
            const currentApiKeyEls = document.querySelectorAll('#currentApiKey');
            currentApiKeyEls.forEach(el => {
                if (data.hasApiKey) {
                    el.textContent = `API key configured`;
                    el.style.color = '#10b981';
                } else {
                    el.textContent = 'No API key configured';
                    el.style.color = '#ef4444';
                }
            });
            window.hasApiKey = data.hasApiKey;
        }
    } catch (error) {
        console.error('[API] Error loading API key status:', error);
    }
}

async function loadCurrentProwlarrApiKey() {
    try {
        const API_BASE_URL = window.API_BASE_URL || 'http://localhost:6987';
        const response = await fetch(`${API_BASE_URL}/api/get-prowlarr-api-key`);
        if (response.ok) {
            const data = await response.json();
            // Update ALL elements with id currentProwlarrApiKey
            const currentProwlarrApiKeyEls = document.querySelectorAll('#currentProwlarrApiKey');
            currentProwlarrApiKeyEls.forEach(el => {
                if (data.hasApiKey) {
                    el.textContent = `API key configured`;
                    el.style.color = '#10b981';
                } else {
                    el.textContent = 'No API key configured';
                    el.style.color = '#ef4444';
                }
            });
            window.hasProwlarrApiKey = data.hasApiKey;
        }
    } catch (error) {
        console.error('[API] Error loading Prowlarr API key status:', error);
    }
}

// Export additional functions
window.loadCurrentApiKey = loadCurrentApiKey;
window.loadCurrentProwlarrApiKey = loadCurrentProwlarrApiKey;

// ===== READER FULLSCREEN FUNCTION =====

function toggleReaderFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(e => {
            console.error(`Error attempting to enable full-screen mode: ${e.message} (${e.name})`);
        });
        document.body.classList.add('reader-fullscreen-mode');
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
        document.body.classList.remove('reader-fullscreen-mode');
    }
}

// Listen for fullscreen change event to handle ESC key
document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
        document.body.classList.remove('reader-fullscreen-mode');
        const comicsBtn = document.getElementById('comics-fullscreen-btn');
        const mangaBtn = document.getElementById('mangaFullscreenBtn');
        if (comicsBtn) comicsBtn.innerHTML = '<i class="fas fa-expand"></i>';
        if (mangaBtn) mangaBtn.innerHTML = '<i class="fas fa-expand"></i>';
    } else {
        const comicsBtn = document.getElementById('comics-fullscreen-btn');
        const mangaBtn = document.getElementById('mangaFullscreenBtn');
        if (comicsBtn) comicsBtn.innerHTML = '<i class="fas fa-compress"></i>';
        if (mangaBtn) mangaBtn.innerHTML = '<i class="fas fa-compress"></i>';
    }
});

window.toggleReaderFullscreen = toggleReaderFullscreen;

console.log('[Utils] Utility functions module loaded');
