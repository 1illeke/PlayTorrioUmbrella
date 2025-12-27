import { 
    getMovieDetails, 
    getTVShowDetails, 
    getSeasonEpisodes, 
    getImageUrl,
    getMovieImages,
    getTVShowImages,
    getEpisodeImages,
    getExternalIds
} from './api.js';
import { searchJackett, getJackettKey, setJackettKey } from './jackett.js';
import { getInstalledAddons, installAddon, removeAddon, fetchAddonStreams, parseAddonStream } from './addons.js';
import { initDebridUI, getDebridSettings } from './debrid.js';

const params = new URLSearchParams(window.location.search);
const type = params.get('type');
const id = params.get('id');

if (!type || !id) {
    window.location.href = 'index.html';
}

const isTV = type === 'tv';
let currentDetails = null;
let currentSeason = 1;
let currentEpisode = null;
let currentImdbId = null;
let allSources = [];
let currentProvider = 'jackett';

// DOM Elements
const loadingOverlay = document.getElementById('loading-overlay');
const contentContainer = document.getElementById('content-container');
const backdropImage = document.getElementById('backdrop-image');
const addonTabsContainer = document.getElementById('addon-tabs');
const screenshotsContainer = document.getElementById('screenshots-container');
const screenshotsGrid = document.getElementById('screenshots-grid');
const imageModal = document.getElementById('image-modal');
const modalImage = document.getElementById('modal-image');
const closeImageModal = document.getElementById('close-image-modal');

const hideImageModal = () => {
    imageModal.classList.add('opacity-0');
    setTimeout(() => {
        imageModal.classList.add('hidden');
        modalImage.src = '';
    }, 300);
};

if (closeImageModal) {
    closeImageModal.addEventListener('click', hideImageModal);
}

if (imageModal) {
    imageModal.addEventListener('click', (e) => {
        if (e.target === imageModal || e.target.closest('.relative') === null) {
            hideImageModal();
        }
    });
}

const sortSelect = document.getElementById('sort-select');
const qualityFilter = document.getElementById('quality-filter');
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const settingsContent = document.getElementById('settings-content');
const closeSettingsBtn = document.getElementById('close-settings');
const saveSettingsBtn = document.getElementById('save-settings');
const toggleConsoleBtn = document.getElementById('toggle-console-btn');
const jackettApiInput = document.getElementById('jackett-api-input');
const addonManifestInput = document.getElementById('addon-manifest-input');
const installAddonBtn = document.getElementById('install-addon-btn');
const installedAddonsList = document.getElementById('installed-addons-list');
const addonItemTemplate = document.getElementById('addon-item-template');
const seasonSection = document.getElementById('season-section');
const seasonList = document.getElementById('season-list');
const episodeSection = document.getElementById('episode-section');
const episodeGrid = document.getElementById('episode-grid');
const episodesTitle = document.getElementById('episodes-title');
const sourcesSection = document.getElementById('sources-section');
const sourcesList = document.getElementById('sources-list');
const selectEpisodeMsg = document.getElementById('select-episode-msg');
const sourcesTitle = document.getElementById('sources-title');
const seasonBtnTemplate = document.getElementById('season-btn-template');
const episodeCardTemplate = document.getElementById('episode-card-template');
const sourceCardTemplate = document.getElementById('source-card-template');

const renderAddonTabs = async () => {
    if (!addonTabsContainer) return;
    addonTabsContainer.innerHTML = '';
    
    const allAddons = await getInstalledAddons();
    
    // Filter out subtitle-only addons. 
    // We only want addons that provide 'stream' resources.
    const addons = allAddons.filter(addon => {
        const resources = addon.manifest?.resources || [];
        return resources.some(r => 
            r === 'stream' || (typeof r === 'object' && r.name === 'stream')
        );
    });
    
    const jackettTab = document.createElement('button');
    jackettTab.className = `px-4 py-1.5 rounded-full text-xs font-bold transition-all ${currentProvider === 'jackett' ? 'bg-purple-600 text-white shadow-lg' : 'bg-gray-800 text-gray-400 hover:text-white'}`;
    jackettTab.textContent = 'Jackett';
    jackettTab.onclick = async () => {
        currentProvider = 'jackett';
        await renderAddonTabs();
        await renderSources();
    };
    addonTabsContainer.appendChild(jackettTab);

    addons.forEach(addon => {
        const tab = document.createElement('button');
        const addonId = addon.manifest?.id || addon.id;
        const addonName = addon.manifest?.name || addon.name;
        const addonLogo = addon.manifest?.logo || addon.logo;

        tab.className = `px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${currentProvider === addonId ? 'bg-purple-600 text-white shadow-lg' : 'bg-gray-800 text-gray-400 hover:text-white'}`;
        if (addonLogo) {
            const img = document.createElement('img');
            img.src = addonLogo;
            img.className = 'w-3 h-3 object-contain';
            tab.appendChild(img);
        }
        const nameSpan = document.createElement('span');
        nameSpan.textContent = addonName;
        tab.appendChild(nameSpan);

        tab.onclick = async () => {
            currentProvider = addonId;
            await renderAddonTabs();
            await renderSources();
        };
        addonTabsContainer.appendChild(tab);
    });
};

const renderDetails = (data) => {
    if (data.backdrop_path) {
        backdropImage.style.backgroundImage = `url(${getImageUrl(data.backdrop_path, 'w1280')})`;
        backdropImage.classList.remove('opacity-0');
    }
    const poster = document.getElementById('detail-poster');
    if (poster) poster.src = getImageUrl(data.poster_path, 'w500');
    
    const title = document.getElementById('detail-title');
    if (title) title.textContent = data.title || data.name;
    
    const date = data.release_date || data.first_air_date;
    const yearEl = document.getElementById('detail-year');
    if (yearEl) yearEl.textContent = date ? date.split('-')[0] : '';
    
    const runtime = data.runtime || (data.episode_run_time ? data.episode_run_time[0] : 0);
    const runtimeEl = document.getElementById('detail-runtime');
    if (runtime && runtimeEl) {
        runtimeEl.textContent = `${runtime} min`;
        const sep = document.querySelector('.separator');
        if (sep) sep.classList.remove('hidden');
    }
    
    const ratingEl = document.getElementById('detail-rating');
    if (ratingEl) ratingEl.textContent = data.vote_average ? data.vote_average.toFixed(1) : 'N/A';
    
    const genresEl = document.getElementById('detail-genres');
    if (data.genres && genresEl) {
        genresEl.innerHTML = '';
        data.genres.forEach(genre => {
            const span = document.createElement('span');
            span.className = 'px-3 py-1 bg-purple-600/20 text-purple-300 rounded-full text-sm border border-purple-500/30';
            span.textContent = genre.name;
            genresEl.appendChild(span);
        });
    }
    const director = data.credits?.crew?.find(c => c.job === 'Director')?.name;
    const dirEl = document.getElementById('detail-director');
    if (director && dirEl) {
        dirEl.textContent = director;
        const dirContainer = document.getElementById('detail-director-container');
        if (dirContainer) dirContainer.classList.remove('hidden');
    }
    const overviewEl = document.getElementById('detail-overview');
    if (overviewEl) overviewEl.textContent = data.overview || 'No description available.';
    
    const castEl = document.getElementById('detail-cast');
    if (data.credits?.cast && castEl) {
        castEl.innerHTML = '';
        data.credits.cast.slice(0, 8).forEach(member => {
            const span = document.createElement('span');
            span.className = 'px-3 py-1.5 bg-gray-800/60 text-gray-300 rounded-full text-sm hover:bg-gray-700 transition-colors cursor-default';
            span.textContent = member.name;
            castEl.appendChild(span);
        });
    }
};

const loadScreenshots = async () => {
    try {
        const fetchFn = isTV ? getTVShowImages : getMovieImages;
        const data = await fetchFn(id);
        const images = data.backdrops || [];
        
        if (images.length > 0) {
            screenshotsContainer.classList.remove('hidden');
            screenshotsGrid.innerHTML = '';
            
            images.slice(0, 4).forEach((img) => {
                const url = getImageUrl(img.file_path, 'w500');
                const fullUrl = getImageUrl(img.file_path, 'original');
                
                const div = document.createElement('div');
                div.className = 'aspect-video rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-purple-500 transition-all transform hover:scale-[1.02] bg-gray-800';
                div.innerHTML = `<img src="${url}" class="w-full h-full object-cover" loading="lazy">`;
                
                div.onclick = () => {
                    modalImage.src = fullUrl;
                    imageModal.classList.remove('hidden');
                    requestAnimationFrame(() => {
                        imageModal.classList.remove('opacity-0');
                    });
                };
                
                screenshotsGrid.appendChild(div);
            });
        }
    } catch (e) {
        console.warn('Failed to load screenshots:', e);
    }
};

const renderSources = async () => {
    if (isTV && !currentEpisode) {
        sourcesList.innerHTML = '';
        sourcesList.classList.add('hidden');
        selectEpisodeMsg.classList.remove('hidden');
        return;
    }
    sourcesList.innerHTML = '<div class="col-span-full text-center py-12"><div class="inline-block w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div><p class="text-gray-500 text-sm mt-4">Searching for sources...</p></div>';
    sourcesList.classList.remove('hidden');
    selectEpisodeMsg.classList.add('hidden');
    if (isTV) {
        sourcesTitle.innerHTML = currentEpisode ? `Available Sources <span class="text-gray-500 text-sm font-normal">— S${String(currentSeason).padStart(2, '0')}E${String(currentEpisode).padStart(2, '0')}</span>` : `Available Sources <span class="text-gray-500 text-sm font-normal">— Season ${currentSeason} Pack</span>`;
    }
    try {
        if (currentProvider === 'jackett') {
            let queries = [];
            const metadata = { title: currentDetails.title || currentDetails.name, type: type, year: (currentDetails.release_date || currentDetails.first_air_date || '').split('-')[0] };
            if (isTV) {
                const s = String(currentSeason).padStart(2, '0');
                metadata.season = currentSeason;
                if (currentEpisode) {
                    const e = String(currentEpisode).padStart(2, '0');
                    queries.push(`${currentDetails.name} S${s}E${e}`);
                    queries.push(`${currentDetails.name} S${s}`);
                    metadata.episode = currentEpisode;
                } else {
                    queries.push(`${currentDetails.name} S${s}`);
                    metadata.episode = null;
                }
            } else {
                queries.push(`${currentDetails.title} ${metadata.year}`);
            }
            try {
                allSources = await searchJackett(queries, metadata);
            } catch (err) {
                if (err.message === 'JACKETT_CONNECTION_ERROR') {
                    sourcesList.innerHTML = `
                        <div class="col-span-full text-center py-12 px-6">
                            <div class="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h3 class="text-white font-bold text-lg mb-2">Jackett Connection Failed</h3>
                            <p class="text-gray-400 text-sm max-w-md mx-auto">
                                Jackett is not installed, turned off, or the API key is incorrect. 
                                Please ensure Jackett is running and configured correctly in Settings.
                            </p>
                        </div>`;
                    return;
                }
                throw err; // Re-throw if it's a different error
            }
        } else {
            console.log(`[Sources] Fetching for addon provider: ${currentProvider}`);
            const addons = await getInstalledAddons();
            const addon = addons.find(a => (a.manifest?.id || a.id) === currentProvider);
            
            if (!addon) {
                 console.error('[Sources] Addon not found in installed list:', currentProvider);
                 console.log('[Sources] Available addons:', addons.map(a => a.manifest?.id || a.id));
                 sourcesList.innerHTML = '<div class="text-center py-12 text-red-500">Addon not found (check console).</div>';
                 return;
            }

            console.log('[Sources] Found addon:', addon.manifest?.name || addon.name);

            try {
                const imdbId = currentImdbId;
                
                if (imdbId) {
                    let stremioId = isTV 
                        ? (currentEpisode ? `${imdbId}:${currentSeason}:${currentEpisode}` : `${imdbId}:${currentSeason}:1`) 
                        : imdbId;
                        
                    console.log(`[Sources] Constructed Stremio ID: ${stremioId} (isTV: ${isTV})`);
                    
                    const resourceType = isTV ? 'series' : 'movie';
                    console.log(`[Sources] Calling fetchAddonStreams with type=${resourceType}, id=${stremioId}`);
                    
                    const streams = await fetchAddonStreams(addon, resourceType, stremioId);
                    console.log(`[Sources] fetchAddonStreams returned ${streams.length} items`);
                    
                    const addonName = addon.manifest?.name || addon.name;
                    allSources = streams.map(s => parseAddonStream(s, addonName));
                    
                    if (allSources.length === 0) {
                        console.warn('[Sources] No streams found from addon.');
                    }
                } else {
                    console.warn('[Sources] No IMDB ID found in external_ids response for this TMDB ID.');
                    sourcesList.innerHTML = '<div class="text-center py-12 text-gray-500">No IMDB ID found. Cannot fetch from Stremio addons.</div>';
                    return;
                }
            } catch (err) {
                console.error('[Sources] Error in addon fetch loop:', err);
                sourcesList.innerHTML = `<div class="text-center py-12 text-red-500">Error: ${err.message}</div>`;
                return;
            }
        }
        displaySources(allSources);
        handleSortAndFilter();
    } catch (e) {
        console.error('Error fetching sources:', e);
        sourcesList.innerHTML = `<div class="text-center py-12 text-red-500">Error: ${e.message}</div>`;
    }
};

const handleSortAndFilter = () => {
    if (!allSources.length) return;

    let filtered = [...allSources];

    // Quality Filter
    const quality = qualityFilter.value;
    if (quality !== 'all') {
        filtered = filtered.filter(s => s.quality === quality);
    }

    // Sort
    const sort = sortSelect.value;
    filtered.sort((a, b) => {
        // Cached Priority (contains ⚡ emoji)
        const aCached = a.indexer.includes('⚡') || a.title.includes('⚡');
        const bCached = b.indexer.includes('⚡') || b.title.includes('⚡');
        
        if (aCached && !bCached) return -1;
        if (!aCached && bCached) return 1;

        if (sort === 'seeders') return b.seeders - a.seeders;
        if (sort === 'size-desc') return b.sizeBytes - a.sizeBytes;
        if (sort === 'size-asc') return a.sizeBytes - b.sizeBytes;
        if (sort === 'quality') {
            const qMap = { '4K': 4, '1080p': 3, '720p': 2, '480p': 1, 'Unknown': 0 };
            return qMap[b.quality] - qMap[a.quality] || b.seeders - a.seeders;
        }
        return 0;
    });

    displaySources(filtered);
};

sortSelect?.addEventListener('change', handleSortAndFilter);
qualityFilter?.addEventListener('change', handleSortAndFilter);

const matchEpisodeFile = (files, season, episode) => {
    if (!files || !files.length) return null;
    const s = parseInt(season);
    const e = parseInt(episode);
    
    console.log(`[Matching] TARGET: S${s}E${e}`);

    const scoredFiles = files.map(file => {
        const fullPath = (file.path || file.filename || file.name || '').toLowerCase();
        const fileName = fullPath.split('/').pop();
        let score = 0;
        
        // Disqualify non-video/junk immediately - Expanded formats
        if (!fullPath.match(/\.(mp4|mkv|avi|mov|wmv|flv|webm|m4v|mpg|mpeg)$/i) || fullPath.includes('sample') || fullPath.includes('trailer')) {
            return { file, score: -1000000, reason: 'Invalid type or sample' };
        }

        // --- PHASE 1: Filename Analysis (Ultra High Priority) ---
        
        // Exact SxxExx or XxXX patterns
        const exactPatterns = [
            { p: new RegExp(`s0*${s}e0*${e}\\b`, 'i'), b: 50000 },
            { p: new RegExp(`\\b${s}x0*${e}\\b`, 'i'), b: 50000 },
            { p: new RegExp(`season\\s*${s}\\s*episode\\s*${e}\\b`, 'i'), b: 50000 },
            { p: new RegExp(`\\b0*${s}x0*${e}\\b`, 'i'), b: 50000 },
            { p: new RegExp(`s0*${s}\\.e0*${e}\\b`, 'i'), b: 50000 }, // S02.E01
            { p: new RegExp(`\\[${s}x${e}\\]`, 'i'), b: 50000 },       // [2x01]
            { p: new RegExp(`\\b${s}${String(e).padStart(2, '0')}\\b`, 'i'), b: 10000 } // 201 for S02E01
        ];

        for (const item of exactPatterns) {
            if (item.p.test(fileName)) score += item.b;
        }

        // Catch-all Episode markers in filename
        const epMarkers = [
            { p: new RegExp(`e0*${e}\\b`, 'i'), b: 5000 },
            { p: new RegExp(`ep\\.?\\s*0*${e}\\b`, 'i'), b: 5000 },
            { p: new RegExp(`episode\\s*0*${e}\\b`, 'i'), b: 5000 },
            { p: new RegExp(`#\\s*0*${e}\\b`, 'i'), b: 5000 },
            { p: new RegExp(`\\-\\s*0*${e}\\b`, 'i'), b: 5000 },
            { p: new RegExp(`\\b0*${e}\\b`, 'i'), b: 2000 },
            { p: new RegExp(`\\[0*${e}\\]`, 'i'), b: 5000 },
            { p: new RegExp(`_0*${e}_`, 'i'), b: 5000 }, // episode in underscores
            { p: new RegExp(`\\s0*${e}\\s`, 'i'), b: 2000 } // standalone number with spaces
        ];

        for (const item of epMarkers) {
            if (item.p.test(fileName)) score += item.b;
        }

        // Season boost (if season is present and matches)
        const seasonMarkers = [
            new RegExp(`s0*${s}\\b`, 'i'),
            new RegExp(`season\\s*${s}\\b`, 'i'),
            new RegExp(`\\[s0*${s}\\]`, 'i')
        ];
        for (const p of seasonMarkers) {
            if (p.test(fileName)) score += 1000;
        }

        // --- PHASE 2: Path Analysis (Low Priority) ---
        if (new RegExp(`s0*${s}e0*${e}\\b`, 'i').test(fullPath)) score += 100;
        if (new RegExp(`season\\s*${s}`, 'i').test(fullPath)) score += 50;

        // --- PHASE 3: THE "ABSOLUTE ZERO" DISQUALIFIER ---
        
        // Disqualify if it has an explicit WRONG episode marker in filename
        // Regex looks for E01, Ep 01, 2x01, Episode 01
        const allEpTags = fileName.match(/e(\d+)|ep\s*(\d+)|\b(\d+)x(\d+)\b|episode\s*(\d+)/gi);
        if (allEpTags) {
            const hasCorrectEp = allEpTags.some(tag => {
                const nums = tag.match(/\d+/g);
                const foundEp = parseInt(nums[nums.length - 1]);
                return foundEp === e;
            });
            const hasWrongEp = allEpTags.some(tag => {
                const nums = tag.match(/\d+/g);
                const foundEp = parseInt(nums[nums.length - 1]);
                return foundEp !== e;
            });

            if (hasWrongEp && !hasCorrectEp) {
                score -= 1000000;
                return { file, score, name: fileName, reason: 'Wrong episode tag' };
            }
        }

        // Disqualify if it has an explicit WRONG season marker anywhere
        const allSeasonTags = fullPath.match(/s(\d+)|season\s*(\d+)/gi);
        if (allSeasonTags) {
            const hasCorrectSeason = allSeasonTags.some(tag => {
                const num = parseInt(tag.replace(/\D/g, ''));
                return num === s;
            });
            const hasWrongSeason = allSeasonTags.some(tag => {
                const num = parseInt(tag.replace(/\D/g, ''));
                return num !== s;
            });
            if (hasWrongSeason && !hasCorrectSeason) {
                score -= 1000000;
                return { file, score, name: fileName, reason: 'Wrong season tag' };
            }
        }

        return { file, score, name: fileName };
    });

    scoredFiles.sort((a, b) => b.score - a.score);
    
    // Log top 3 for debugging
    console.log('[Matching] Top Candidates:');
    scoredFiles.slice(0, 3).forEach((cand, idx) => {
        console.log(`  ${idx+1}. ${cand.name} (Score: ${cand.score})${cand.reason ? ' - ' + cand.reason : ''}`);
    });

    const best = scoredFiles[0];

    if (best && best.score > 0) {
        console.log(`[Matching] SUCCESS: Picked "${best.name}" (Score: ${best.score})`);
        return best.file;
    }

    console.warn(`[Matching] FAILED: No accurate match found for S${s}E${e}`);
    return null;
};

const resolveTorrent = async (url, title) => {
    if (!url || !url.startsWith('http')) return url;
    try {
        const res = await fetch(`/api/resolve-torrent-file?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`);
        const data = await res.json();
        return data.magnet || url;
    } catch (err) {
        console.error('Failed to resolve torrent:', err);
        return url;
    }
};

const displaySources = (sources) => {
    sourcesList.innerHTML = '';
    if (sources.length === 0) {
        sourcesList.innerHTML = '<div class="text-center py-12 text-gray-500">No sources found matching your criteria.</div>';
        return;
    }
    
    sources.forEach((source, index) => {
        const clone = sourceCardTemplate.content.cloneNode(true);
        const card = clone.querySelector('.source-card');
        
        // Resolution color logic
        let resColor = 'from-gray-500 to-gray-600';
        if (source.quality === '4K') resColor = 'from-yellow-500 to-orange-500';
        else if (source.quality === '1080p') resColor = 'from-purple-500 to-pink-500';
        else if (source.quality === '720p') resColor = 'from-blue-500 to-cyan-500';

        const resBadge = clone.querySelector('.res-badge');
        resBadge.className = `res-badge text-white text-sm px-3 py-1 rounded-full font-bold bg-gradient-to-r ${resColor}`;
        resBadge.textContent = source.quality;

        clone.querySelector('.codec-badge').textContent = source.codec;

        if (source.hdr) {
            const hdrBadge = clone.querySelector('.hdr-badge');
            hdrBadge.textContent = source.hdr;
            hdrBadge.classList.remove('hidden');
            const hdrColors = source.hdr.includes('Dolby') ? 'bg-gradient-to-r from-pink-500 to-purple-500' : 'bg-gradient-to-r from-yellow-500 to-orange-500';
            hdrBadge.className = `hdr-badge text-white text-xs px-2 py-0.5 rounded-full font-medium ${hdrColors}`;
        }

        clone.querySelector('.release-name').textContent = source.title;
        clone.querySelector('.seeders-count').textContent = source.seeders;
        clone.querySelector('.file-size').textContent = source.size;
        clone.querySelector('.provider-name').textContent = source.indexer;

        const link = source.magnet || source.link;

        // Copy button logic
        const copyBtn = clone.querySelector('.copy-btn');
        copyBtn.onclick = async (e) => {
            e.stopPropagation();
            if (link) {
                let finalLink = link;
                if (link.startsWith('http')) {
                    const originalIcon = copyBtn.innerHTML;
                    copyBtn.innerHTML = '<div class="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>';
                    finalLink = await resolveTorrent(link, source.title);
                    copyBtn.innerHTML = originalIcon;
                }
                navigator.clipboard.writeText(finalLink).then(() => {
                    const originalIcon = copyBtn.innerHTML;
                    copyBtn.innerHTML = '<svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>';
                    setTimeout(() => copyBtn.innerHTML = originalIcon, 2000);
                });
            }
        };

        // Play button logic
        const playBtn = clone.querySelector('.play-btn');
        playBtn.onclick = async () => {
            if (!link) return;

            let activeLink = link;
            if (link.startsWith('http')) {
                const originalContent = playBtn.innerHTML;
                playBtn.innerHTML = '<div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>';
                playBtn.disabled = true;
                activeLink = await resolveTorrent(link, source.title);
                playBtn.innerHTML = originalContent;
                playBtn.disabled = false;
            }

            // Check if we should use Debrid or WebTorrent
            const debridSettings = await getDebridSettings();
            
            // Extract Target S/E from UI text as requested by user
            let targetS = currentSeason;
            let targetE = currentEpisode;
            const sourcesTitle = document.getElementById('sources-title');
            if (sourcesTitle && isTV) {
                const titleText = sourcesTitle.innerText;
                const match = titleText.match(/S(\d+)E(\d+)/i);
                if (match) {
                    targetS = parseInt(match[1]);
                    targetE = parseInt(match[2]);
                    console.log(`[UI-MATCH] Found target from UI: S${targetS}E${targetE}`);
                }
            }

            if (debridSettings.useDebrid && debridSettings.debridAuth) {
                console.log(`[Debrid] Preparing magnet: ${source.title}`);
                try {
                    const res = await fetch('/api/debrid/prepare', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ magnet: activeLink })
                    });
                    const data = await res.json();
                    
                    if (data && data.info) {
                        const info = data.info;
                        const files = info.files || [];
                        
                        console.log(`--- DEBRID FILE LIST (${debridSettings.debridProvider}): ${info.filename || data.name || 'Torrent'} ---`);
                        
                        let targetFile = null;
                        if (isTV && targetE) {
                            targetFile = matchEpisodeFile(files, targetS, targetE);
                        } else {
                            // For movies, pick the largest file
                            targetFile = files.sort((a, b) => (b.bytes || b.size || 0) - (a.bytes || a.size || 0))[0];
                        }

                        if (targetFile) {
                            const fileName = targetFile.path || targetFile.filename || targetFile.name || `File ${targetFile.id}`;
                            const fileSize = targetFile.bytes || targetFile.size || 0;
                            console.log(`[TARGET MATCHED] ${fileName} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);
                            
                            // Unrestrict the specific file link
                            let fileLink = (targetFile.links && targetFile.links[0]) || null;
                            
                            // Real-Debrid Fallback: links are in info.links, not per-file
                            if (!fileLink && debridSettings.debridProvider === 'realdebrid' && info.links && info.links.length > 0) {
                                // The links array in RD corresponds 1:1 to selected files.
                                // We need to find the index of our targetFile among only the SELECTED files.
                                const selectedFiles = files.filter(f => f.selected === 1);
                                const linkIndex = selectedFiles.indexOf(targetFile);
                                
                                if (linkIndex !== -1 && info.links[linkIndex]) {
                                    fileLink = info.links[linkIndex];
                                    console.log(`[Debrid] RD Link matched via selected-index [${linkIndex}]: ${fileLink}`);
                                } else {
                                    console.warn('[Debrid] Target file not found in selected files list or link missing.');
                                }
                            }

                            if (fileLink) {
                                console.log('[Debrid] Unrestricting target file link...');
                                const unres = await fetch('/api/debrid/link', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ link: fileLink })
                                });
                                const unresData = await unres.json();
                                if (unresData.url) {
                                    console.log(`[FINAL STREAM LINK] ${unresData.url}`);
                                    if (window.electronAPI?.spawnMpvjsPlayer) {
                                        window.electronAPI.spawnMpvjsPlayer({
                                            url: unresData.url,
                                            tmdbId: id,
                                            imdbId: currentImdbId,
                                            seasonNum: targetS,
                                            episodeNum: targetE,
                                            type: type,
                                            isDebrid: true,
                                            isBasicMode: true
                                        });
                                    } else if (window.electronAPI?.openMPVDirect) {
                                        window.electronAPI.openMPVDirect(unresData.url);
                                    } else {
                                        window.open(unresData.url, '_blank');
                                    }
                                } else {
                                    console.error('[Debrid] Failed to unrestrict link:', unresData.error);
                                    alert('Failed to get stream link: ' + (unresData.error || 'Unknown error'));
                                }
                            } else {
                                console.warn('[Debrid] No direct link available for this file yet.');
                                alert('This file is not yet ready for streaming on the debrid provider.');
                            }
                        } else {
                            console.error('[Debrid] No matching file found in torrent.');
                            alert('Could not find the correct episode in this torrent.');
                        }

                        // List all files anyway for console visibility
                        files.forEach((file, i) => {
                            const fileName = file.path || file.filename || file.name || `File ${file.id || i+1}`;
                            const fileSize = file.bytes || file.size || 0;
                            console.log(`  [File ${i+1}] ${fileName} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);
                        });
                        console.log(`-------------------------------------------`);
                    } else if (data.error) {
                        console.error('[Debrid] Error:', data.error);
                        alert('Debrid error: ' + data.error);
                    }
                } catch (err) {
                    console.error('[Debrid] Error preparing torrent:', err);
                    alert('Error preparing torrent: ' + err.message);
                }
            } else {
                // WebTorrent Path: Fetch metadata and list files
                console.log(`[WebTorrent] Fetching metadata for: ${source.title}`);
                try {
                    const res = await fetch(`/api/torrent-files?magnet=${encodeURIComponent(activeLink)}`);
                    const data = await res.json();
                    
                    if (data) {
                        console.log(`--- WEBTORRENT DATA RECEIVED: ${data.name} ---`);
                        const allFiles = [...(data.videoFiles || []), ...(data.subtitleFiles || [])];
                        
                        let targetFile = null;
                        if (isTV && targetE) {
                            targetFile = matchEpisodeFile(allFiles, targetS, targetE);
                        } else {
                            targetFile = data.videoFiles && data.videoFiles[0];
                        }

                        if (targetFile) {
                            console.log(`[TARGET MATCHED] ${targetFile.name} (${(targetFile.size / 1024 / 1024).toFixed(2)} MB)`);
                            console.log(`[WebTorrent] Starting stream for file index: ${targetFile.index}`);
                            
                            // Trigger prepare-file and then open player
                            const streamUrl = `${window.location.origin}/api/stream-file?hash=${data.infoHash}&file=${targetFile.index}`;
                            fetch(`/api/prepare-file?hash=${data.infoHash}&file=${targetFile.index}`);
                            
                            if (window.electronAPI?.spawnMpvjsPlayer) {
                                window.electronAPI.spawnMpvjsPlayer({
                                    url: streamUrl,
                                    tmdbId: id,
                                    imdbId: currentImdbId,
                                    seasonNum: targetS,
                                    episodeNum: targetE,
                                    type: type,
                                    isDebrid: false,
                                    isBasicMode: true
                                });
                            } else if (window.electronAPI?.openMPVDirect) {
                                window.electronAPI.openMPVDirect(streamUrl);
                            } else {
                                window.open(streamUrl, '_blank');
                            }
                        }

                        if (data.videoFiles) {
                            data.videoFiles.forEach((file, i) => {
                                console.log(`  [Video ${i+1}] ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
                            });
                        }
                        console.log(`-------------------------------------------`);
                    }
                } catch (err) {
                    console.error('[WebTorrent] Error fetching torrent info:', err);
                }
            }
        };

        // Animation delay
        setTimeout(() => {
            if(card) card.classList.remove('opacity-0', 'translate-x-4');
        }, index * 50);

        sourcesList.appendChild(clone);
    });
};

const loadEpisodes = async (seasonNum) => {
    episodeGrid.innerHTML = '<div class="col-span-full text-center text-gray-500 py-4">Loading episodes...</div>';
    try {
        const data = await getSeasonEpisodes(id, seasonNum);
        episodeGrid.innerHTML = '';
        episodesTitle.textContent = `Episodes (${data.episodes.length})`;
        data.episodes.forEach((episode) => {
            const clone = episodeCardTemplate.content.cloneNode(true);
            const btn = clone.querySelector('.episode-btn');
            if (episode.still_path) {
                const img = clone.querySelector('.episode-img');
                img.src = getImageUrl(episode.still_path, 'w300');
                img.classList.remove('hidden');
                clone.querySelector('.episode-placeholder').classList.add('hidden');
            }
            clone.querySelector('.episode-number').textContent = episode.episode_number;
            clone.querySelector('.episode-name').textContent = episode.name;
            btn.onclick = () => {
                document.querySelectorAll('.episode-btn').forEach(b => {
                    b.classList.remove('ring-2', 'ring-purple-500');
                    b.querySelector('.episode-overlay').classList.remove('opacity-100');
                });
                btn.classList.add('ring-2', 'ring-purple-500');
                btn.querySelector('.episode-overlay').classList.add('opacity-100');
                currentEpisode = episode.episode_number;
                renderSources();
            };
            episodeGrid.appendChild(clone);
        });
    } catch (e) {
        episodeGrid.innerHTML = '<div class="col-span-full text-red-500">Failed to load episodes.</div>';
    }
};

const init = async () => {
    // Settings Modal
    if (settingsBtn) {
        settingsBtn.onclick = () => {
            settingsModal.classList.remove('hidden');
            setTimeout(() => settingsModal.classList.remove('opacity-0'), 10);
        };
    }

    if (closeSettingsBtn) {
        closeSettingsBtn.onclick = () => {
            settingsModal.classList.add('opacity-0');
            setTimeout(() => settingsModal.classList.add('hidden'), 300);
        };
    }

    if (saveSettingsBtn) {
        saveSettingsBtn.onclick = async () => {
            const key = jackettApiInput.value.trim();
            if (key) {
                await setJackettKey(key);
            }
            settingsModal.classList.add('opacity-0');
            setTimeout(() => settingsModal.classList.add('hidden'), 300);
        };
    }

    // Console Toggle
    if (toggleConsoleBtn) {
        toggleConsoleBtn.onclick = () => {
            if (window.electronAPI?.toggleDevTools) window.electronAPI.toggleDevTools();
        };
    }

    try {
        const fetchFn = isTV ? getTVShowDetails : getMovieDetails;
        const data = await fetchFn(id);
        currentDetails = data;
        
        // Fetch IMDB ID once for global use
        try {
            const extIds = await getExternalIds(id, type);
            currentImdbId = extIds.imdb_id;
            console.log('[Details] Fetched IMDB ID:', currentImdbId);
        } catch (e) {
            console.warn('[Details] Failed to fetch external IDs:', e.message);
        }

        renderDetails(data);
        loadScreenshots();
        await renderAddonTabs();

        if (isTV) {
            seasonSection.classList.remove('hidden');
            episodeSection.classList.remove('hidden');
            const regularSeasons = data.seasons.filter(s => s.season_number > 0);
            regularSeasons.forEach(season => {
                const clone = seasonBtnTemplate.content.cloneNode(true);
                const btn = clone.querySelector('.season-btn');
                btn.textContent = `Season ${season.season_number}`;
                btn.onclick = () => {
                    document.querySelectorAll('.season-btn').forEach(b => b.classList.remove('bg-purple-600', 'text-white'));
                    btn.classList.add('bg-purple-600', 'text-white');
                    currentSeason = season.season_number;
                    currentEpisode = null;
                    sourcesList.classList.add('hidden');
                    selectEpisodeMsg.classList.remove('hidden');
                    loadEpisodes(currentSeason);
                };
                if (season.season_number === (regularSeasons[0]?.season_number || 1)) {
                    btn.classList.add('bg-purple-600', 'text-white');
                    currentSeason = season.season_number;
                    loadEpisodes(currentSeason);
                }
                seasonList.appendChild(clone);
            });
        } else {
            renderSources();
        }

        loadingOverlay.classList.add('opacity-0');
        setTimeout(() => loadingOverlay.remove(), 300);
        contentContainer.classList.remove('hidden');
        requestAnimationFrame(() => {
            contentContainer.classList.remove('opacity-0');
            document.querySelectorAll('#poster-anim-target, #info-anim-target, #right-panel-anim-target, #detail-overview, #cast-container, #screenshots-container').forEach(el => {
               el.classList.remove('opacity-0', 'translate-y-4', 'translate-x-4'); 
            });
        });
    } catch (error) {
        console.error("[DETAILS] Init failed:", error);
        loadingOverlay.innerHTML = '<p class="text-red-500">Failed to load content. Please try again.</p>';
    }
};

document.addEventListener('DOMContentLoaded', init);