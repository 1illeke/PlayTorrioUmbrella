// ===== IPTV FUNCTIONALITY =====
// Handles IPTV page, Xtream Codes integration, M3U playlists

// Helper to get API base URL
function getIptvApiUrl(endpoint) {
    const baseUrl = window.API_BASE_URL || 'http://localhost:6987/api';
    if (endpoint.startsWith('/')) {
        return baseUrl + endpoint;
    }
    return baseUrl + '/' + endpoint;
}

// IPTV State
const xtreamState = {
    base: '',
    username: '',
    password: '',
    tab: 'live', // 'live' | 'vod' | 'series'
    active: false,
    mode: 'none', // 'none' | 'xtream' | 'm3u'
    liveCategories: [],
    vodCategories: [],
    seriesCategories: [],
    lastStreams: [],
    m3u: { items: [], categories: [] },
    displayedIndex: 0,
    pageSize: 50,
};

let xtreamHls = null;

// ===== IPTV PAGE NAVIGATION =====

function showIptvPage() {
    window.location.hash = '#/iptv';
    try { updateIptvActionButton(); } catch(_) {}
}

function reloadIptvPage() {
    const iptvIframe = document.getElementById('iptv-iframe');
    const iptvSelector = document.getElementById('iptv-source-select');
    if (iptvIframe) {
        // Get current selected source URL
        const currentSrc = iptvSelector ? iptvSelector.value : 'https://iptvplaytorrio.pages.dev/';
        // Clear the src first to force a complete reload
        iptvIframe.src = 'about:blank';
        // Use a timeout to ensure the blank page loads before setting the new src
        setTimeout(() => {
            iptvIframe.src = currentSrc;
            // Auto-scroll the IPTV page itself (not the iframe content) to show the iframe
            setTimeout(() => {
                const iptvPageEl = document.getElementById('iptv-page');
                if (iptvPageEl) {
                    // Scroll the main page to focus on the iframe area
                    iptvIframe.scrollIntoView({ 
                        behavior: 'smooth',
                        block: 'start'
                    });
                    console.log('[IPTV] Auto-scrolled IPTV page to show iframe');
                }
            }, 300); // Quick scroll after iframe starts loading
        }, 100);
        console.log('[IPTV] Page reloaded fresh with source:', currentSrc);
    }
}

// IPTV source selector handler
function initIptvSourceSelector() {
    const iptvSelector = document.getElementById('iptv-source-select');
    const iptvIframe = document.getElementById('iptv-iframe');
    
    if (iptvSelector && iptvIframe) {
        iptvSelector.addEventListener('change', (event) => {
            const selectedUrl = event.target.value;
            const selectedOption = event.target.selectedOptions[0];
            const isExternal = selectedOption.hasAttribute('data-external');
            
            console.log('[IPTV] Switching to source:', selectedUrl, 'external:', isExternal);
            
            if (isExternal) {
                // Open in external browser for sites that don't allow embedding
                if (window.electronAPI?.openExternal) {
                    window.electronAPI.openExternal(selectedUrl);
                    showNotification('Opening IPTV Web App in browser...', 'info');
                    // Reset dropdown to previous working option
                    setTimeout(() => {
                        iptvSelector.value = 'https://iptvplaytorrio.pages.dev/';
                    }, 100);
                }
            } else {
                // Show loading indication
                iptvIframe.style.opacity = '0.5';
                
                // Clear and load new source
                iptvIframe.src = 'about:blank';
                setTimeout(() => {
                    iptvIframe.src = selectedUrl;
                    iptvIframe.style.opacity = '1';
                    showNotification('Loading IPTV source...', 'info');
                }, 100);
            }
        });

        // Add error handling for iframe loading
        iptvIframe.addEventListener('load', () => {
            console.log('[IPTV] Iframe loaded successfully');
            iptvIframe.style.opacity = '1';
        });

        iptvIframe.addEventListener('error', (e) => {
            console.error('[IPTV] Iframe failed to load:', e);
            showNotification('Failed to load IPTV source. Site may block embedding.', 'error');
            iptvIframe.style.opacity = '1';
        });
        
        console.log('[IPTV] Source selector initialized');
    }
}

function clearIptvPage() {
    const iptvIframe = document.getElementById('iptv-iframe');
    if (iptvIframe) {
        // Clear the iframe to stop any ongoing streams
        iptvIframe.src = 'about:blank';
        console.log('[IPTV] Page cleared - stopping all streams');
    }
}

// ===== XTREAM CODES INTEGRATION =====

function disableIptvIframe() {
    try {
        const iptvIframe = document.getElementById('iptv-iframe');
        if (iptvIframe) {
            iptvIframe.src = 'about:blank';
            iptvIframe.style.display = 'none';
            console.log('[IPTV] Default iframe disabled (custom Xtream active)');
        }
    } catch(_) {}
}

function enableIptvIframe() {
    try {
        const iptvIframe = document.getElementById('iptv-iframe');
        if (iptvIframe) {
            iptvIframe.style.display = '';
            if (!iptvIframe.src || iptvIframe.src === 'about:blank') {
                iptvIframe.src = 'https://iptvplaytorrio.pages.dev/';
            }
            console.log('[IPTV] Default iframe enabled');
        }
    } catch(_) {}
}

// Persistent IPTV settings helpers
async function iptvLoadSettings() {
    try {
        const resp = await fetch(getIptvApiUrl('iptv/settings'), { cache: 'no-store' });
        const data = await resp.json();
        return data?.iptv || { lastMode: 'iframe', rememberCreds: false, xtream: { base: '', username: '', password: '' }, m3u: { url: '' } };
    } catch {
        // Fallback to localStorage for backward compatibility
        try {
            const saved = JSON.parse(localStorage.getItem('xtreamCodesCreds') || '{}');
            return { lastMode: 'iframe', rememberCreds: !!(saved.base || saved.username || saved.password), xtream: { base: saved.base||'', username: saved.username||'', password: saved.password||'' }, m3u: { url: '' } };
        } catch { return { lastMode: 'iframe', rememberCreds: false, xtream: { base: '', username: '', password: '' }, m3u: { url: '' } }; }
    }
}

async function iptvSaveSettings(patch = {}) {
    try {
        await fetch(getIptvApiUrl('iptv/settings'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
    } catch (e) {
        console.warn('[IPTV] Failed to save settings', e);
    }
}

// Auto-restore IPTV state from saved settings on app load
async function xtreamAutoLogin(base, username, password) {
    try {
        let apiBase = xtreamNormalizeBase(base);
        const loginParams = `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
        async function attemptLogin(baseUrl) {
            const url = getIptvApiUrl(`proxy/xtream?base=${encodeURIComponent(baseUrl)}&params=${encodeURIComponent(loginParams)}`);
            const resp = await fetch(url, { cache: 'no-store' });
            if (!resp.ok) throw new Error('Server returned ' + resp.status);
            const data = await resp.json();
            return { data, baseUrl };
        }
        let { data, baseUrl } = await attemptLogin(apiBase);
        if (!data || data.nonJson || (!data.user_info && !data.server_info)) {
            try {
                const flipped = apiBase.startsWith('https://') ? apiBase.replace(/^https:\/\//i, 'http://') : apiBase.replace(/^http:\/\//i, 'https://');
                const retry = await attemptLogin(flipped);
                if (retry?.data && !retry.data.nonJson && (retry.data.user_info || retry.data.server_info)) {
                    data = retry.data; baseUrl = retry.baseUrl; apiBase = flipped;
                }
            } catch {}
        }
        if (!data || data.nonJson) throw new Error('Non-JSON response');
        if (data.user_info && String(data.user_info.status).toLowerCase() !== 'active') throw new Error('Account is not active');
        xtreamState.base = apiBase; xtreamState.username = username; xtreamState.password = password; xtreamState.tab = 'live';
        xtreamState.active = true; xtreamState.mode = 'xtream';
        await xtreamLoadAllCategories();
        try { clearIptvPage(); disableIptvIframe(); } catch(_) {}
        hideXtreamLoginModal();
        showXtreamBrowser();
        await xtreamRenderCurrentTab();
        updateIptvActionButton();
        showNotification('Xtream Codes connected (restored)', 'success');
    } catch (e) {
        console.warn('[XTREAM] auto-login failed:', e?.message || e);
        // Fall back to iframe to keep UI usable
        try { enableIptvIframe(); } catch(_) {}
        updateIptvActionButton();
    }
}

async function iptvAutoRestore() {
    try {
        const saved = await iptvLoadSettings();
        const mode = saved?.lastMode || 'iframe';
        if (mode === 'iframe') {
            try { enableIptvIframe(); hideXtreamBrowser(); } catch(_) {}
            updateIptvActionButton();
            return;
        }
        if (mode === 'm3u' && saved?.m3u?.url) {
            await loadM3UFromUrl(saved.m3u.url);
            return;
        }
        if (mode === 'xtream' && saved?.rememberCreds && saved?.xtream?.base && saved?.xtream?.username && saved?.xtream?.password) {
            await xtreamAutoLogin(saved.xtream.base, saved.xtream.username, saved.xtream.password);
            return;
        }
        // Default fallback
        try { enableIptvIframe(); hideXtreamBrowser(); } catch(_) {}
        updateIptvActionButton();
    } catch (e) {
        console.warn('[IPTV] auto-restore failed:', e?.message || e);
        try { enableIptvIframe(); hideXtreamBrowser(); } catch(_) {}
        updateIptvActionButton();
    }
}

function xtreamNormalizeBase(url) {
    if (!url) return '';
    let u = (url + '').trim();
    // Add scheme if missing
    if (!/^https?:\/\//i.test(u)) u = 'http://' + u;
    // Remove query/fragment for base
    try { const tmp = new URL(u); u = tmp.origin + tmp.pathname; } catch {}
    // Strip common portal/file suffixes
    u = u.replace(/\/+$/, '');
    u = u.replace(/\/(player_api\.php|xmltv\.php|get\.php)$/i, '');
    u = u.replace(/\/(c|panel_api|client_area)\/?$/i, '');
    // Final trim of trailing slashes
    u = u.replace(/\/+$/, '');
    return u;
}

async function showXtreamLoginModal(prefill = true) {
    const modal = document.getElementById('xtream-login-modal');
    if (!modal) return;
    // prefill from storage
    if (prefill) {
        try {
            const saved = await iptvLoadSettings();
            const baseEl = document.getElementById('xtream-base-url');
            const userEl = document.getElementById('xtream-username');
            const passEl = document.getElementById('xtream-password');
            const remEl = document.getElementById('xtream-remember');
            const m3uEl = document.getElementById('xtream-m3u-url');
            if (saved?.xtream) {
                if (saved.rememberCreds) {
                    if (baseEl) baseEl.value = saved.xtream.base || '';
                    if (userEl) userEl.value = saved.xtream.username || '';
                    if (passEl) passEl.value = saved.xtream.password || '';
                }
                if (remEl) remEl.checked = !!saved.rememberCreds;
            }
            if (m3uEl && saved?.m3u?.url) m3uEl.value = saved.m3u.url;
        } catch(_) {}
    }
    modal.style.display = 'flex';
}

function hideXtreamLoginModal() {
    const modal = document.getElementById('xtream-login-modal');
    if (modal) modal.style.display = 'none';
}

function showXtreamBrowser() {
    const inline = document.getElementById('xtream-inline');
    const grid = document.getElementById('xtream-grid');
    const empty = document.getElementById('xtream-empty');
    const search = document.getElementById('xtream-search');
    const cat = document.getElementById('xtream-category-select');
    if (inline) inline.style.display = 'block';
    if (grid) grid.innerHTML = '';
    if (empty) empty.style.display = '';
    if (search) search.value = '';
    if (cat) cat.innerHTML = '<option value="">All Categories</option>';
}

function hideXtreamBrowser() {
    const inline = document.getElementById('xtream-inline');
    if (inline) inline.style.display = 'none';
}

function ensureHlsScriptLoaded() {
    return new Promise((resolve, reject) => {
        if (window.Hls) return resolve();
        const existing = document.getElementById('hlsjs-script');
        if (existing) {
            existing.addEventListener('load', () => resolve());
            existing.addEventListener('error', () => reject(new Error('Failed to load hls.js')));
            return;
        }
        const s = document.createElement('script');
        s.id = 'hlsjs-script';
        s.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('Failed to load hls.js'));
        document.head.appendChild(s);
    });
}

async function showXtreamPlayer(title, url) {
    const modal = document.getElementById('xtream-player-modal');
    const video = document.getElementById('xtream-video');
    const label = document.getElementById('xtream-player-title');
    const openBtn = document.getElementById('xtream-open-external');
    const openMpvBtn = document.getElementById('xtream-open-mpv');
    const openIinaBtn = document.getElementById('xtream-open-iina');
    const openVlcBtn = document.getElementById('xtream-open-vlc');
    if (!modal || !video) return;
    // reset any previous playback and hls instance
    try { video.pause(); } catch(_) {}
    try { if (xtreamHls) { xtreamHls.destroy(); xtreamHls = null; } } catch(_) {}
    video.removeAttribute('src');
    video.load();
    video.crossOrigin = 'anonymous';
    if (label) label.textContent = title || 'Playing';

    // Toggle buttons per platform
    const platform = window.electronAPI?.platform;
    if (openMpvBtn) {
        openMpvBtn.style.display = 'inline-flex'; // Show on all platforms
        openMpvBtn.innerHTML = '<i class="fas fa-play"></i> Play Now';
    }
    if (openIinaBtn) openIinaBtn.style.display = (platform === 'darwin') ? 'inline-flex' : 'none';

    // External open buttons
    if (openBtn) {
        openBtn.onclick = () => {
            if (window.electronAPI?.openExternal) window.electronAPI.openExternal(url);
            else window.open(url, '_blank');
        };
    }
    if (openMpvBtn) {
        openMpvBtn.onclick = async () => {
            try {
                // Integrated HTML5 player (replaces mpv.js)
                if (window.electronAPI && window.electronAPI.spawnMpvjsPlayer) {
                    const payload = { url };
                    const result = await window.electronAPI.spawnMpvjsPlayer(payload);
                    if (!result || !result.success) {
                        showNotification(result?.message || 'Failed to launch player');
                    }
                    return;
                }
                showNotification('Integrated player not available');
            } catch (e) {
                showNotification('Failed to launch player: ' + (e?.message || e));
            }
        };
    }
    if (openIinaBtn) {
        openIinaBtn.onclick = async () => {
            try {
                if (!window.electronAPI || !window.electronAPI.openInIINA) {
                    showNotification('IINA integration not available in this environment');
                    return;
                }
                const data = { streamUrl: url };
                const result = await window.electronAPI.openInIINA(data);
                if (!result || !result.success) {
                    showNotification(result?.message || 'Failed to launch IINA');
                }
            } catch (e) {
                showNotification('Failed to launch IINA: ' + (e?.message || e));
            }
        };
    }
    
    // VLC button handler
    if (openVlcBtn) {
        openVlcBtn.style.display = 'inline-flex';
        openVlcBtn.onclick = async () => {
            try {
                if (window.electronAPI && window.electronAPI.openVLCDirect) {
                    const result = await window.electronAPI.openVLCDirect(url);
                    if (!result || !result.success) {
                        showNotification(result?.message || 'Failed to launch VLC', 'error');
                    }
                    return;
                }
                if (window.electronAPI && window.electronAPI.openInVLC) {
                    const result = await window.electronAPI.openInVLC({ streamUrl: url });
                    if (!result || !result.success) {
                        showNotification(result?.message || 'Failed to launch VLC', 'error');
                    }
                    return;
                }
                showNotification('VLC integration not available', 'error');
            } catch (e) {
                showNotification('Failed to launch VLC: ' + (e?.message || e), 'error');
            }
        };
    }

    // Show modal
    modal.style.display = 'flex';

    // Attempt to play the stream
    try {
        await ensureHlsScriptLoaded();
        if (url.includes('.m3u8') && window.Hls && window.Hls.isSupported()) {
            xtreamHls = new window.Hls();
            xtreamHls.loadSource(url);
            xtreamHls.attachMedia(video);
            xtreamHls.on(window.Hls.Events.MANIFEST_PARSED, () => {
                video.play().catch(e => console.warn('[XTREAM] Autoplay blocked:', e));
            });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = url;
            video.addEventListener('loadedmetadata', () => {
                video.play().catch(e => console.warn('[XTREAM] Autoplay blocked:', e));
            });
        } else {
            video.src = url;
            video.play().catch(e => console.warn('[XTREAM] Autoplay blocked:', e));
        }
    } catch (e) {
        console.error('[XTREAM] Player error:', e);
        showNotification('Failed to load stream: ' + (e?.message || e), 'error');
    }
}

function hideXtreamPlayer() {
    const modal = document.getElementById('xtream-player-modal');
    const video = document.getElementById('xtream-video');
    if (modal) modal.style.display = 'none';
    if (video) {
        try { video.pause(); } catch(_) {}
        video.removeAttribute('src');
        video.load();
    }
    if (xtreamHls) {
        try { xtreamHls.destroy(); } catch(_) {}
        xtreamHls = null;
    }
}

// Export functions to window
window.showIptvPage = showIptvPage;
window.reloadIptvPage = reloadIptvPage;
window.initIptvSourceSelector = initIptvSourceSelector;
window.clearIptvPage = clearIptvPage;
window.disableIptvIframe = disableIptvIframe;
window.enableIptvIframe = enableIptvIframe;
window.iptvLoadSettings = iptvLoadSettings;
window.iptvSaveSettings = iptvSaveSettings;
window.xtreamAutoLogin = xtreamAutoLogin;
window.iptvAutoRestore = iptvAutoRestore;
window.xtreamNormalizeBase = xtreamNormalizeBase;
window.showXtreamLoginModal = showXtreamLoginModal;
window.hideXtreamLoginModal = hideXtreamLoginModal;
window.showXtreamBrowser = showXtreamBrowser;
window.hideXtreamBrowser = hideXtreamBrowser;
window.ensureHlsScriptLoaded = ensureHlsScriptLoaded;
window.showXtreamPlayer = showXtreamPlayer;
window.hideXtreamPlayer = hideXtreamPlayer;
window.xtreamState = xtreamState;

console.log('[IPTV] IPTV module loaded');


// ===== XTREAM CODES ADDITIONAL FUNCTIONS =====

async function xtreamLogin() {
    const baseEl = document.getElementById('xtream-base-url');
    const userEl = document.getElementById('xtream-username');
    const passEl = document.getElementById('xtream-password');
    const remember = document.getElementById('xtream-remember')?.checked;
    const status = document.getElementById('xtream-login-status');
    const btn = document.getElementById('xtream-login-submit');

    const base = xtreamNormalizeBase(baseEl.value);
    const username = (userEl.value || '').trim();
    const password = (passEl.value || '').trim();
    if (!base || !username || !password) {
        if (status) status.textContent = 'Please fill all fields.';
        return;
    }

    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...'; }
    if (status) status.textContent = 'Contacting server...';
    try {
        let apiBase = xtreamNormalizeBase(base);
        const loginParams = `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;

        async function attemptLogin(baseUrl) {
            const url = getIptvApiUrl(`proxy/xtream?base=${encodeURIComponent(baseUrl)}&params=${encodeURIComponent(loginParams)}`);
            const resp = await fetch(url, { cache: 'no-store' });
            if (!resp.ok) throw new Error('Server returned ' + resp.status);
            const data = await resp.json();
            return { data, baseUrl };
        }

        let { data, baseUrl } = await attemptLogin(apiBase);
        // If non-JSON or invalid, retry once with scheme flipped (http<->https)
        if (!data || data.nonJson || (!data.user_info && !data.server_info)) {
            try {
                const flipped = apiBase.startsWith('https://')
                    ? apiBase.replace(/^https:\/\//i, 'http://')
                    : apiBase.replace(/^http:\/\//i, 'https://');
                const retry = await attemptLogin(flipped);
                if (retry?.data && !retry.data.nonJson && (retry.data.user_info || retry.data.server_info)) {
                    data = retry.data; baseUrl = retry.baseUrl; apiBase = flipped;
                }
            } catch {}
        }

        if (!data || data.nonJson) {
            const detail = data?.contentType ? ` (${data.contentType}${data.status ? ', ' + data.status : ''})` : '';
            throw new Error('Server returned non-JSON response' + detail);
        }
        if (!data.user_info && !data.server_info) throw new Error('Invalid response');
        if (data.user_info && String(data.user_info.status).toLowerCase() !== 'active') {
            throw new Error('Account is not active');
        }
        xtreamState.base = apiBase; xtreamState.username = username; xtreamState.password = password; xtreamState.tab = 'live';
        xtreamState.active = true; xtreamState.mode = 'xtream';
        // persist settings (respect remember toggle for credentials)
        if (remember) {
            await iptvSaveSettings({ lastMode: 'xtream', rememberCreds: true, xtream: { base, username, password } });
        } else {
            await iptvSaveSettings({ lastMode: 'xtream', rememberCreds: false, xtream: { base: '', username: '', password: '' } });
        }
        if (status) status.textContent = 'Login successful. Loading categories...';
        await xtreamLoadAllCategories();
        // Disable the default IPTV iframe when using custom Xtream
        try { clearIptvPage(); disableIptvIframe(); } catch(_) {}
        hideXtreamLoginModal();
        showXtreamBrowser();
        await xtreamRenderCurrentTab();
        showNotification('Xtream Codes connected', 'success');
        updateIptvActionButton();
    } catch (e) {
        console.error('[XTREAM] Login error:', e);
        if (status) status.textContent = 'Login failed: ' + (e?.message || 'Unknown error');
        showNotification('Xtream login failed: ' + (e?.message || 'Unknown error'), 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login'; }
    }
}

// M3U/M3U8 Support
function parseM3U(text) {
    const lines = (text || '').split(/\r?\n/);
    const items = [];
    let current = null;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        if (line.startsWith('#EXTINF:')) {
            // Parse attributes from EXTINF
            const attrPart = line.substring(line.indexOf(',') > -1 ? 0 : line.length);
            const name = line.substring(line.indexOf(',') + 1).trim();
            const attrs = {};
            const attrRegex = /(\w[\w-]*)=\"([^\"]*)\"/g;
            let m;
            while ((m = attrRegex.exec(line)) !== null) {
                attrs[m[1]] = m[2];
            }
            current = {
                name: name || attrs['tvg-name'] || attrs['channel-name'] || 'Channel',
                logo: attrs['tvg-logo'] || '',
                group: attrs['group-title'] || 'Other',
                url: ''
            };
        } else if (!line.startsWith('#') && current) {
            current.url = line;
            items.push(current);
            current = null;
        }
    }
    // Build categories
    const cats = Array.from(new Set(items.map(it => it.group || 'Other'))).sort();
    return { items, categories: cats };
}

async function loadM3UFromUrl(url) {
    const status = document.getElementById('xtream-login-status');
    try {
        if (status) status.textContent = 'Loading playlist...';
        const proxyUrl = getIptvApiUrl(`proxy/fetch-text?url=${encodeURIComponent(url)}`);
        const resp = await fetch(proxyUrl, { cache: 'no-store' });
        if (!resp.ok) throw new Error('Playlist request failed: ' + resp.status);
        const text = await resp.text();
        const parsed = parseM3U(text);
        if (!parsed.items.length) throw new Error('No channels found in playlist');
        xtreamState.m3u = parsed;
        xtreamState.tab = 'live';
        xtreamState.active = true; xtreamState.mode = 'm3u';
        // persist last mode and playlist URL
        await iptvSaveSettings({ lastMode: 'm3u', m3u: { url } });
        // Disable default IPTV iframe
        try { clearIptvPage(); disableIptvIframe(); } catch(_) {}
        hideXtreamLoginModal();
        showXtreamBrowser();
        await xtreamRenderCurrentTab();
        updateIptvActionButton();
        showNotification(`Loaded ${parsed.items.length} playlist items`, 'success');
    } catch (e) {
        console.error('[M3U] Load error:', e);
        if (status) status.textContent = 'Failed to load playlist: ' + (e?.message || 'Unknown error');
        showNotification('Failed to load playlist: ' + (e?.message || 'Unknown error'), 'error');
    }
}

function isDirectMediaUrl(u) {
    try {
        const url = (u || '').toLowerCase();
        return /\.(m3u8|mp4|mp3|aac|m4a|ts|webm|mkv|mov|avi)(\?|$)/.test(url);
    } catch { return false; }
}

async function xtreamFetch(pathParams) {
    const { base, username, password } = xtreamState;
    const qs = `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}${pathParams ? '&' + pathParams : ''}`;
    async function attempt(baseUrl) {
        const url = getIptvApiUrl(`proxy/xtream?base=${encodeURIComponent(baseUrl)}&params=${encodeURIComponent(qs)}`);
        const resp = await fetch(url, { cache: 'no-store' });
        if (!resp.ok) throw new Error('Request failed: ' + resp.status);
        const data = await resp.json();
        return { data, baseUrl };
    }
    let { data, baseUrl } = await attempt(base);
    if (!data || data.nonJson) {
        try {
            const flipped = base.startsWith('https://') ? base.replace(/^https:\/\//i, 'http://') : base.replace(/^http:\/\//i, 'https://');
            const retry = await attempt(flipped);
            if (retry?.data && !retry.data.nonJson) { data = retry.data; baseUrl = retry.baseUrl; }
        } catch {}
    }
    if (!data || data.nonJson) {
        const detail = data?.contentType ? ` (${data.contentType}${data.status ? ', ' + data.status : ''})` : '';
        throw new Error('Xtream API returned non-JSON' + detail);
    }
    return data;
}

async function xtreamLoadAllCategories() {
    try {
        const [live, vod, series] = await Promise.all([
            xtreamFetch('action=get_live_categories').catch(()=>[]),
            xtreamFetch('action=get_vod_categories').catch(()=>[]),
            xtreamFetch('action=get_series_categories').catch(()=>[])
        ]);
        xtreamState.liveCategories = Array.isArray(live) ? live : [];
        xtreamState.vodCategories = Array.isArray(vod) ? vod : [];
        xtreamState.seriesCategories = Array.isArray(series) ? series : [];
    } catch (e) {
        console.warn('[XTREAM] Failed to load some categories:', e);
    }
}

function xtreamPopulateCategories() {
    const select = document.getElementById('xtream-category-select');
    if (!select) return;
    const tab = xtreamState.tab;
    let cats = [];
    if (xtreamState.mode === 'm3u') {
        // Only one logical tab: live
        cats = (xtreamState.m3u?.categories) || [];
    } else {
        if (tab === 'live') cats = xtreamState.liveCategories; else if (tab === 'vod') cats = xtreamState.vodCategories; else cats = xtreamState.seriesCategories;
    }
    const current = select.value;
    select.innerHTML = '<option value="">All Categories</option>';
    
    // Show all categories - dropdown will naturally scroll
    if (xtreamState.mode === 'm3u') {
        cats.forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            select.appendChild(opt);
        });
    } else {
        cats.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.category_id;
            opt.textContent = c.category_name || ('Category ' + c.category_id);
            select.appendChild(opt);
        });
    }
    // try keep selection if exists
    if ([...select.options].some(o => o.value === current)) select.value = current;
}

function xtreamBuildStreamUrl(kind, stream) {
    const { base, username, password } = xtreamState;
    if (!stream) return '';
    if (xtreamState.mode === 'm3u') {
        return stream.url || '';
    }
    const id = stream.stream_id || stream.series_id || stream.id;
    if (kind === 'live') {
        const ext = (stream?.container_extension) ? stream.container_extension.replace(/^\./,'') : 'm3u8';
        return `${base}/live/${encodeURIComponent(username)}/${encodeURIComponent(password)}/${id}.${ext}`;
    } else if (kind === 'vod') {
        const ext = (stream?.container_extension) ? stream.container_extension.replace(/^\./,'') : 'mp4';
        return `${base}/movie/${encodeURIComponent(username)}/${encodeURIComponent(password)}/${id}.${ext}`;
    }
    return '';
}

async function xtreamLoadStreamsForCurrentTab(categoryId = '') {
    const tab = xtreamState.tab;
    try {
        let list = [];
        if (xtreamState.mode === 'm3u') {
            const all = (xtreamState.m3u?.items) || [];
            if (!categoryId) list = all;
            else list = all.filter(it => (it.group || '') === categoryId);
        } else if (tab === 'live') {
            const p = categoryId ? `action=get_live_streams&category_id=${encodeURIComponent(categoryId)}` : 'action=get_live_streams';
            list = await xtreamFetch(p);
        } else if (tab === 'vod') {
            const p = categoryId ? `action=get_vod_streams&category_id=${encodeURIComponent(categoryId)}` : 'action=get_vod_streams';
            list = await xtreamFetch(p);
        } else {
            const p = categoryId ? `action=get_series&category_id=${encodeURIComponent(categoryId)}` : 'action=get_series';
            list = await xtreamFetch(p);
        }
        xtreamState.lastStreams = Array.isArray(list) ? list : [];
        // Initialize pagination
        xtreamState.displayedIndex = 0;
        xtreamState.pageSize = 50; // Load 50 items at a time
    } catch (e) {
        console.error('[XTREAM] Load streams error:', e);
        xtreamState.lastStreams = [];
    }
}

async function xtreamShowSeriesEpisodes(seriesId) {
    try {
        const info = await xtreamFetch(`action=get_series_info&series_id=${encodeURIComponent(seriesId)}`);
        const episodesData = (info?.episodes) ? Object.values(info.episodes).flat() : [];
        if (!episodesData.length) { showNotification('No episodes found', 'info'); return; }
        
        // Group episodes by season
        const seasonMap = {};
        episodesData.forEach(ep => {
            const season = ep.season || '1';
            if (!seasonMap[season]) seasonMap[season] = [];
            seasonMap[season].push(ep);
        });
        
        // Render season cards with collapsible episodes
        const grid = document.getElementById('xtream-grid');
        if (!grid) return;
        grid.innerHTML = '';
        
        const seasons = Object.keys(seasonMap).sort((a, b) => parseInt(a) - parseInt(b));
        
        seasons.forEach(seasonNum => {
            const episodes = seasonMap[seasonNum];
            const seasonCard = document.createElement('div');
            seasonCard.className = 'music-card';
            seasonCard.style.gridColumn = '1 / -1'; // Full width
            seasonCard.style.cursor = 'pointer';
            seasonCard.style.background = 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(37,99,235,0.05))';
            seasonCard.style.border = '1px solid rgba(59,130,246,0.3)';
            
            const seasonId = `season-${seriesId}-${seasonNum}`;
            seasonCard.innerHTML = `
                <div style="padding:1rem;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <h3 style="color:#fff; margin:0; font-size:1.1rem;">
                            <i class="fas fa-tv" style="color:#3b82f6;"></i> Season ${seasonNum}
                            <span style="color:#9ca3af; font-size:0.9rem; margin-left:0.5rem;">(${episodes.length} episodes)</span>
                        </h3>
                        <button class="season-toggle" data-season-id="${seasonId}" style="background:rgba(59,130,246,0.2); border:1px solid rgba(59,130,246,0.4); color:#3b82f6; padding:0.4rem 0.8rem; border-radius:6px; cursor:pointer;">
                            <i class="fas fa-chevron-down"></i> Show Episodes
                        </button>
                    </div>
                    <div id="${seasonId}" style="display:none; margin-top:1rem;">
                        <div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:0.75rem;"></div>
                    </div>
                </div>
            `;
            grid.appendChild(seasonCard);
            
            // Add toggle functionality
            const toggleBtn = seasonCard.querySelector('.season-toggle');
            const episodesContainer = seasonCard.querySelector(`#${seasonId}`);
            const episodesGrid = episodesContainer.querySelector('div');
            
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isHidden = episodesContainer.style.display === 'none';
                
                if (isHidden) {
                    // Render episodes if not already rendered
                    if (episodesGrid.children.length === 0) {
                        episodes.forEach(ep => {
                            const name = `E${ep.episode_num} - ${ep.title || 'Episode'}`;
                            const url = `${xtreamState.base}/series/${encodeURIComponent(xtreamState.username)}/${encodeURIComponent(xtreamState.password)}/${ep.id}.${(ep.container_extension || 'mp4').replace(/^\./,'')}`;
                            
                            const epCard = document.createElement('div');
                            epCard.style.cssText = 'background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); border-radius:8px; padding:0.75rem; display:flex; flex-direction:column; gap:0.5rem;';
                            epCard.innerHTML = `
                                <div style="color:#fff; font-weight:600; font-size:0.9rem;">${name}</div>
                                <div style="display:flex; gap:0.4rem; flex-wrap:wrap;">
                                    <button class="btn" style="padding:.3rem .6rem; border:none; border-radius:6px; background:linear-gradient(135deg,#10b981,#059669); color:#fff; cursor:pointer; font-size:0.85rem;" data-action="play" data-url="${url}" data-name="${name.replace(/"/g,'&quot;')}">
                                        <i class="fas fa-play"></i> Play
                                    </button>
                                    <button class="btn" style="padding:.3rem .6rem; border:none; border-radius:6px; background:linear-gradient(135deg,#3b82f6,#2563eb); color:#fff; cursor:pointer; font-size:0.85rem;" data-action="open" data-url="${url}">
                                        <i class="fas fa-external-link-alt"></i>
                                    </button>
                                    <button class="btn" style="padding:.3rem .6rem; border:none; border-radius:6px; background:rgba(255,255,255,.1); color:#fff; cursor:pointer; font-size:0.85rem;" data-action="copy" data-url="${url}">
                                        <i class="fas fa-copy"></i>
                                    </button>
                                </div>
                            `;
                            episodesGrid.appendChild(epCard);
                        });
                        
                        // Wire episode buttons
                        episodesGrid.querySelectorAll('[data-action="play"]').forEach(b => b.addEventListener('click', (e) => {
                            const url = e.currentTarget.getAttribute('data-url');
                            const name = e.currentTarget.getAttribute('data-name');
                            if (!url) { showNotification('No stream URL found', 'error'); return; }
                            showXtreamPlayer(name, url);
                        }));
                        episodesGrid.querySelectorAll('[data-action="open"]').forEach(b => b.addEventListener('click', (e) => {
                            const url = e.currentTarget.getAttribute('data-url');
                            if (!url) { showNotification('No stream URL found', 'error'); return; }
                            if (window.electronAPI?.openExternal) window.electronAPI.openExternal(url); else window.open(url, '_blank');
                        }));
                        episodesGrid.querySelectorAll('[data-action="copy"]').forEach(b => b.addEventListener('click', async (e) => {
                            const url = e.currentTarget.getAttribute('data-url');
                            try { await navigator.clipboard.writeText(url); showNotification('Stream URL copied', 'success'); } catch { showNotification('Copy failed', 'error'); }
                        }));
                    }
                    episodesContainer.style.display = '';
                    toggleBtn.innerHTML = '<i class="fas fa-chevron-up"></i> Hide Episodes';
                } else {
                    episodesContainer.style.display = 'none';
                    toggleBtn.innerHTML = '<i class="fas fa-chevron-down"></i> Show Episodes';
                }
            });
        });
        
    } catch (e) {
        console.error('[XTREAM] Series info error:', e);
        showNotification('Failed to load episodes: ' + (e?.message || 'Unknown'), 'error');
    }
}

function updateIptvActionButton() {
    const btn = document.getElementById('iptv-custom-btn');
    if (!btn) return;
    if (xtreamState.active) {
        btn.innerHTML = '<i class="fas fa-exchange-alt"></i> Use PlayTorrio IPTV';
        btn.title = 'Switch back to the default IPTV page';
    } else {
        btn.innerHTML = '<i class="fas fa-user-lock"></i> Custom IPTV (Xtream Codes)';
        btn.title = 'Login with your Xtream Codes provider';
    }
}

function iptvActionButtonClick() {
    if (xtreamState.active) {
        // Switch back to default IPTV
        try { hideXtreamBrowser(); } catch(_) {}
        try { hideXtreamPlayer(); } catch(_) {}
        try { enableIptvIframe(); } catch(_) {}
        xtreamState.active = false;
        // persist last mode
        iptvSaveSettings({ lastMode: 'iframe' });
        updateIptvActionButton();
        showNotification('Switched to PlayTorrio IPTV', 'success');
    } else {
        // Open login for custom Xtream
        showXtreamLoginModal(true);
    }
}

// Export additional functions
window.xtreamLogin = xtreamLogin;
window.parseM3U = parseM3U;
window.loadM3UFromUrl = loadM3UFromUrl;
window.isDirectMediaUrl = isDirectMediaUrl;
window.xtreamFetch = xtreamFetch;
window.xtreamLoadAllCategories = xtreamLoadAllCategories;
window.xtreamPopulateCategories = xtreamPopulateCategories;
window.xtreamBuildStreamUrl = xtreamBuildStreamUrl;
window.xtreamLoadStreamsForCurrentTab = xtreamLoadStreamsForCurrentTab;
window.xtreamShowSeriesEpisodes = xtreamShowSeriesEpisodes;
window.updateIptvActionButton = updateIptvActionButton;
window.iptvActionButtonClick = iptvActionButtonClick;

// Initialize IPTV event listeners
function initIptvEventListeners() {
    // Xtream login modal buttons
    const closeLogin = document.getElementById('xtream-login-close');
    const cancelLogin = document.getElementById('xtream-login-cancel');
    const submitLogin = document.getElementById('xtream-login-submit');
    const loadM3UBtn = document.getElementById('xtream-load-m3u');
    const customIptvBtn = document.getElementById('iptv-custom-btn');
    const xtreamPlayerClose = document.getElementById('xtream-player-close');

    if (closeLogin) closeLogin.addEventListener('click', hideXtreamLoginModal);
    if (cancelLogin) cancelLogin.addEventListener('click', hideXtreamLoginModal);
    if (submitLogin) submitLogin.addEventListener('click', xtreamLogin);
    
    // M3U load button
    if (loadM3UBtn) {
        loadM3UBtn.addEventListener('click', () => {
            const m3uUrlEl = document.getElementById('xtream-m3u-url');
            const url = (m3uUrlEl?.value || '').trim();
            if (!url) {
                if (typeof showNotification === 'function') showNotification('Enter an M3U URL', 'warning');
                return;
            }
            loadM3UFromUrl(url);
        });
    }

    // Custom IPTV button
    if (customIptvBtn) {
        customIptvBtn.addEventListener('click', iptvActionButtonClick);
    }

    // Xtream player close button
    if (xtreamPlayerClose) {
        xtreamPlayerClose.addEventListener('click', hideXtreamPlayer);
    }

    // Tab buttons for Xtream browser
    const tabBtns = document.querySelectorAll('.xtream-tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            const tab = btn.dataset.tab;
            if (!tab) return;
            xtreamState.tab = tab;
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            await xtreamRenderCurrentTab();
        });
    });

    // Category select
    const categorySelect = document.getElementById('xtream-category-select');
    if (categorySelect) {
        categorySelect.addEventListener('change', async () => {
            await xtreamRenderCurrentTab();
        });
    }

    // Search input
    const searchInput = document.getElementById('xtream-search');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            xtreamRenderGrid();
        });
    }

    console.log('[IPTV] Event listeners initialized');
}

// Render current tab content
async function xtreamRenderCurrentTab() {
    const categorySelect = document.getElementById('xtream-category-select');
    const categoryId = categorySelect?.value || '';
    
    xtreamPopulateCategories();
    await xtreamLoadStreamsForCurrentTab(categoryId);
    xtreamRenderGrid();
}

// Render grid with current streams
function xtreamRenderGrid() {
    const grid = document.getElementById('xtream-grid');
    const empty = document.getElementById('xtream-empty');
    const searchInput = document.getElementById('xtream-search');
    
    if (!grid) return;
    
    const searchTerm = (searchInput?.value || '').toLowerCase().trim();
    let streams = xtreamState.lastStreams || [];
    
    // Filter by search
    if (searchTerm) {
        streams = streams.filter(s => {
            const name = (s.name || s.stream_display_name || '').toLowerCase();
            return name.includes(searchTerm);
        });
    }
    
    grid.innerHTML = '';
    
    if (streams.length === 0) {
        if (empty) empty.style.display = 'block';
        return;
    }
    
    if (empty) empty.style.display = 'none';
    
    // Paginate - show first batch
    const toShow = streams.slice(0, xtreamState.displayedIndex + xtreamState.pageSize);
    
    toShow.forEach(stream => {
        const card = document.createElement('div');
        card.className = 'music-card';
        card.style.cursor = 'pointer';
        
        const name = stream.name || stream.stream_display_name || 'Channel';
        const logo = stream.stream_icon || stream.logo || '';
        const kind = xtreamState.tab;
        
        card.innerHTML = `
            <div class="music-cover" style="background:#1a1a2e;">
                ${logo ? `<img loading="lazy" src="${logo}" alt="${name}" style="object-fit:contain;">` : '<i class="fas fa-tv" style="font-size:2rem; color:#666;"></i>'}
            </div>
            <div class="music-info">
                <div class="music-title">${name}</div>
                <div class="music-actions">
                    <button class="xtream-play-btn" data-kind="${kind}" data-id="${stream.stream_id || stream.series_id || ''}" data-name="${name.replace(/"/g,'&quot;')}">
                        <i class="fas fa-play"></i> Play
                    </button>
                </div>
            </div>
        `;
        
        grid.appendChild(card);
    });
    
    // Wire play buttons
    grid.querySelectorAll('.xtream-play-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const kind = btn.dataset.kind;
            const name = btn.dataset.name;
            const id = btn.dataset.id;
            
            if (kind === 'series') {
                await xtreamShowSeriesEpisodes(id);
                return;
            }
            
            const stream = xtreamState.lastStreams.find(s => String(s.stream_id || s.series_id) === String(id));
            if (!stream) {
                if (typeof showNotification === 'function') showNotification('Stream not found', 'error');
                return;
            }
            
            let url;
            if (xtreamState.mode === 'm3u') {
                url = stream.url;
            } else {
                url = xtreamBuildStreamUrl(kind, stream);
            }
            
            if (!url) {
                if (typeof showNotification === 'function') showNotification('No stream URL', 'error');
                return;
            }
            
            showXtreamPlayer(name, url);
        });
    });
    
    // Add load more button if needed
    if (toShow.length < streams.length) {
        const loadMoreBtn = document.createElement('button');
        loadMoreBtn.className = 'btn';
        loadMoreBtn.style.cssText = 'grid-column: 1 / -1; padding: 1rem; background: linear-gradient(135deg, #3b82f6, #2563eb); border: none; border-radius: 8px; color: #fff; cursor: pointer;';
        loadMoreBtn.innerHTML = `<i class="fas fa-plus"></i> Load More (${streams.length - toShow.length} remaining)`;
        loadMoreBtn.addEventListener('click', () => {
            xtreamState.displayedIndex += xtreamState.pageSize;
            xtreamRenderGrid();
        });
        grid.appendChild(loadMoreBtn);
    }
}

window.initIptvEventListeners = initIptvEventListeners;
window.xtreamRenderCurrentTab = xtreamRenderCurrentTab;
window.xtreamRenderGrid = xtreamRenderGrid;
