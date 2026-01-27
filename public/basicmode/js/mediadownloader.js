// Media Downloader Module
// Supports 111477 (TMDB-based) and AcerMovies sources

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

let currentSource = '111477';
let currentType = 'movie';
let currentTmdbData = null;

// DOM Elements
let mdlGrid, mdlLoading, mdlEmpty, mdlSearchInput, mdlSearchBtn;
let mdlDetailsModal, mdlModalPoster, mdlModalTitle, mdlModalInfo, mdlModalClose;
let mdlEpisodeSelector, mdlSeasonSelect, mdlEpisodeSelect, mdlFetchEpisodeBtn;
let mdlFilesList, mdlFilesLoading;
let acerQualityModal, acerModalPoster, acerModalTitle, acerModalInfo, acerModalClose;
let acerQualityList, acerQualityLoading;

const syncElements = () => {
    mdlGrid = document.getElementById('mdl-grid');
    mdlLoading = document.getElementById('mdl-loading');
    mdlEmpty = document.getElementById('mdl-empty');
    mdlSearchInput = document.getElementById('mdl-search-input');
    mdlSearchBtn = document.getElementById('mdl-search-btn');
    
    mdlDetailsModal = document.getElementById('mdl-details-modal');
    mdlModalPoster = document.getElementById('mdl-modal-poster');
    mdlModalTitle = document.getElementById('mdl-modal-title');
    mdlModalInfo = document.getElementById('mdl-modal-info');
    mdlModalClose = document.getElementById('mdl-modal-close');
    mdlEpisodeSelector = document.getElementById('mdl-episode-selector');
    mdlSeasonSelect = document.getElementById('mdl-season-select');
    mdlEpisodeSelect = document.getElementById('mdl-episode-select');
    mdlFetchEpisodeBtn = document.getElementById('mdl-fetch-episode-btn');
    mdlFilesList = document.getElementById('mdl-files-list');
    mdlFilesLoading = document.getElementById('mdl-files-loading');
    
    acerQualityModal = document.getElementById('acer-quality-modal');
    acerModalPoster = document.getElementById('acer-modal-poster');
    acerModalTitle = document.getElementById('acer-modal-title');
    acerModalInfo = document.getElementById('acer-modal-info');
    acerModalClose = document.getElementById('acer-modal-close');
    acerQualityList = document.getElementById('acer-quality-list');
    acerQualityLoading = document.getElementById('acer-quality-loading');
};

// Initialize Media Downloader
export function initMediaDownloader() {
    syncElements();
    setupEventListeners();
    showEmptyState();
}

function setupEventListeners() {
    // Source toggle buttons
    document.querySelectorAll('.mdl-source-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentSource = btn.dataset.source;
            updateSourceButtons();
            clearResults();
        });
    });
    
    // Type toggle buttons (111477 only)
    document.querySelectorAll('.mdl-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentType = btn.dataset.type;
            updateTypeButtons();
            clearResults();
        });
    });
    
    // Search
    if (mdlSearchBtn) {
        mdlSearchBtn.addEventListener('click', handleSearch);
    }
    if (mdlSearchInput) {
        mdlSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSearch();
        });
    }
    
    // Modal close buttons
    if (mdlModalClose) {
        mdlModalClose.addEventListener('click', () => {
            mdlDetailsModal.classList.add('hidden');
        });
    }
    if (acerModalClose) {
        acerModalClose.addEventListener('click', () => {
            acerQualityModal.classList.add('hidden');
        });
    }
    
    // Season/Episode selectors
    if (mdlSeasonSelect) {
        mdlSeasonSelect.addEventListener('change', populateEpisodes);
    }
    if (mdlFetchEpisodeBtn) {
        mdlFetchEpisodeBtn.addEventListener('click', fetchTVEpisode);
    }
    
    // Click outside modal to close
    [mdlDetailsModal, acerQualityModal].forEach(modal => {
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.classList.add('hidden');
            });
        }
    });
}

function updateSourceButtons() {
    document.querySelectorAll('.mdl-source-btn').forEach(btn => {
        if (btn.dataset.source === currentSource) {
            btn.classList.add('bg-cyan-600', 'text-white', 'shadow-lg', 'shadow-cyan-500/25');
            btn.classList.remove('text-gray-400', 'hover:text-white', 'hover:bg-white/5');
        } else {
            btn.classList.remove('bg-cyan-600', 'text-white', 'shadow-lg', 'shadow-cyan-500/25');
            btn.classList.add('text-gray-400', 'hover:text-white', 'hover:bg-white/5');
        }
    });
    
    // Show/hide type toggle based on source
    const typeToggle = document.getElementById('mdl-type-toggle');
    if (typeToggle) {
        typeToggle.style.display = currentSource === '111477' ? 'flex' : 'none';
    }
}

function updateTypeButtons() {
    document.querySelectorAll('.mdl-type-btn').forEach(btn => {
        if (btn.dataset.type === currentType) {
            btn.classList.add('bg-blue-600', 'text-white', 'shadow-lg', 'shadow-blue-500/25');
            btn.classList.remove('text-gray-400', 'hover:text-white', 'hover:bg-white/5');
        } else {
            btn.classList.remove('bg-blue-600', 'text-white', 'shadow-lg', 'shadow-blue-500/25');
            btn.classList.add('text-gray-400', 'hover:text-white', 'hover:bg-white/5');
        }
    });
}

function showEmptyState() {
    if (mdlEmpty) mdlEmpty.classList.remove('hidden');
    if (mdlGrid) mdlGrid.innerHTML = '';
    if (mdlLoading) mdlLoading.classList.add('hidden');
}

function clearResults() {
    if (mdlGrid) mdlGrid.innerHTML = '';
    showEmptyState();
}

async function handleSearch() {
    const query = mdlSearchInput?.value?.trim();
    if (!query) return;
    
    if (mdlEmpty) mdlEmpty.classList.add('hidden');
    if (mdlLoading) mdlLoading.classList.remove('hidden');
    if (mdlGrid) mdlGrid.innerHTML = '';
    
    try {
        if (currentSource === '111477') {
            await search111477(query);
        } else {
            await searchAcerMovies(query);
        }
    } catch (error) {
        console.error('Search error:', error);
        if (mdlGrid) {
            mdlGrid.innerHTML = `<div class="col-span-full text-center text-red-500 py-8">Error: ${error.message}</div>`;
        }
    } finally {
        if (mdlLoading) mdlLoading.classList.add('hidden');
    }
}

// ============================================================================
// 111477 Functions (TMDB-based)
// ============================================================================

async function search111477(query) {
    // Search TMDB for movies or TV shows using the aio endpoints
    const searchType = currentType === 'movie' ? 'movie' : 'tv';
    const response = await fetch(`/aio/search/${searchType}?q=${encodeURIComponent(query)}`);
    
    if (!response.ok) throw new Error('TMDB search failed');
    
    const data = await response.json();
    const results = data.results || [];
    
    if (results.length === 0) {
        if (mdlEmpty) mdlEmpty.classList.remove('hidden');
        return;
    }
    
    renderTmdbResults(results);
}

function renderTmdbResults(results) {
    if (!mdlGrid) return;
    mdlGrid.innerHTML = '';
    
    results.forEach(item => {
        const card = document.createElement('div');
        card.className = 'group cursor-pointer';
        
        const posterUrl = item.poster_path 
            ? `${TMDB_IMAGE_BASE}${item.poster_path}`
            : 'https://via.placeholder.com/500x750/1a1a2e/ffffff?text=No+Poster';
        
        const title = item.title || item.name;
        const year = (item.release_date || item.first_air_date || '').split('-')[0];
        const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
        
        card.innerHTML = `
            <div class="aspect-[2/3] rounded-xl overflow-hidden mb-2 relative bg-gray-800 border border-transparent group-hover:border-cyan-500/50 transition-all">
                <img src="${posterUrl}" alt="${title}" class="w-full h-full object-cover" loading="lazy" onerror="this.src='https://via.placeholder.com/500x750/1a1a2e/ffffff?text=No+Poster'">
                <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                    <span class="text-white text-sm font-medium">Click to view files</span>
                </div>
                <div class="absolute top-2 right-2 bg-black/70 px-2 py-1 rounded text-xs text-yellow-400 font-bold">
                    ⭐ ${rating}
                </div>
            </div>
            <h3 class="text-sm font-medium text-white truncate group-hover:text-cyan-400 transition-colors">${title}</h3>
            <p class="text-xs text-gray-500">${year}</p>
        `;
        
        card.addEventListener('click', () => open111477Details(item));
        mdlGrid.appendChild(card);
    });
}

async function open111477Details(item) {
    currentTmdbData = item;
    const isTV = currentType === 'tv';
    
    // Set modal info
    const posterUrl = item.poster_path 
        ? `${TMDB_IMAGE_BASE}${item.poster_path}`
        : 'https://via.placeholder.com/500x750/1a1a2e/ffffff?text=No+Poster';
    
    if (mdlModalPoster) mdlModalPoster.src = posterUrl;
    if (mdlModalTitle) mdlModalTitle.textContent = item.title || item.name;
    if (mdlModalInfo) {
        const year = (item.release_date || item.first_air_date || '').split('-')[0];
        mdlModalInfo.textContent = `${year} • ${isTV ? 'TV Show' : 'Movie'}`;
    }
    
    // Show/hide episode selector
    if (mdlEpisodeSelector) {
        mdlEpisodeSelector.classList.toggle('hidden', !isTV);
    }
    
    // Clear files list
    if (mdlFilesList) mdlFilesList.innerHTML = '';
    
    // Show modal
    if (mdlDetailsModal) mdlDetailsModal.classList.remove('hidden');
    
    if (isTV) {
        // Fetch TV show details to get seasons
        await fetchTVDetails(item.id);
    } else {
        // Fetch movie files directly
        await fetchMovieFiles(item.id);
    }
}

async function fetchTVDetails(tmdbId) {
    if (mdlFilesLoading) mdlFilesLoading.classList.remove('hidden');
    
    try {
        const response = await fetch(`/aio/tv/${tmdbId}`);
        if (!response.ok) throw new Error('Failed to fetch TV details');
        
        const data = await response.json();
        const seasons = data.seasons || [];
        
        // Populate season selector
        if (mdlSeasonSelect) {
            mdlSeasonSelect.innerHTML = '';
            seasons.filter(s => s.season_number > 0).forEach(season => {
                const option = document.createElement('option');
                option.value = season.season_number;
                option.textContent = `Season ${season.season_number} (${season.episode_count} eps)`;
                mdlSeasonSelect.appendChild(option);
            });
            
            // Store season data for episode population
            mdlSeasonSelect.dataset.seasons = JSON.stringify(seasons);
            mdlSeasonSelect.dataset.numberOfSeasons = data.number_of_seasons || seasons.length;
            populateEpisodes();
        }
    } catch (error) {
        console.error('Error fetching TV details:', error);
        if (mdlFilesList) {
            mdlFilesList.innerHTML = `<div class="text-red-500 text-center py-4">Error: ${error.message}</div>`;
        }
    } finally {
        if (mdlFilesLoading) mdlFilesLoading.classList.add('hidden');
    }
}

async function populateEpisodes() {
    if (!mdlSeasonSelect || !mdlEpisodeSelect) return;
    
    const seasons = JSON.parse(mdlSeasonSelect.dataset.seasons || '[]');
    const selectedSeason = parseInt(mdlSeasonSelect.value);
    const season = seasons.find(s => s.season_number === selectedSeason);
    
    mdlEpisodeSelect.innerHTML = '';
    
    if (season && season.episode_count) {
        for (let i = 1; i <= season.episode_count; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `Episode ${i}`;
            mdlEpisodeSelect.appendChild(option);
        }
    } else if (currentTmdbData) {
        // Fetch season details to get episode count
        try {
            const response = await fetch(`/aio/tv/${currentTmdbData.id}/season/${selectedSeason}`);
            if (response.ok) {
                const seasonData = await response.json();
                const episodes = seasonData.episodes || [];
                episodes.forEach((ep, idx) => {
                    const option = document.createElement('option');
                    option.value = ep.episode_number || (idx + 1);
                    option.textContent = `Episode ${ep.episode_number || (idx + 1)}${ep.name ? ': ' + ep.name : ''}`;
                    mdlEpisodeSelect.appendChild(option);
                });
            }
        } catch (e) {
            console.error('Error fetching season details:', e);
            // Fallback to 20 episodes
            for (let i = 1; i <= 20; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = `Episode ${i}`;
                mdlEpisodeSelect.appendChild(option);
            }
        }
    }
}

async function fetchTVEpisode() {
    if (!currentTmdbData) return;
    
    const season = mdlSeasonSelect?.value;
    const episode = mdlEpisodeSelect?.value;
    
    if (!season || !episode) return;
    
    if (mdlFilesLoading) mdlFilesLoading.classList.remove('hidden');
    if (mdlFilesList) mdlFilesList.innerHTML = '';
    
    try {
        const response = await fetch(`/111477/api/tmdb/tv/${currentTmdbData.id}/season/${season}/episode/${episode}`);
        if (!response.ok) throw new Error('Failed to fetch episode files');
        
        const data = await response.json();
        renderFiles(data);
    } catch (error) {
        console.error('Error fetching episode:', error);
        if (mdlFilesList) {
            mdlFilesList.innerHTML = `<div class="text-red-500 text-center py-4">Error: ${error.message}</div>`;
        }
    } finally {
        if (mdlFilesLoading) mdlFilesLoading.classList.add('hidden');
    }
}

async function fetchMovieFiles(tmdbId) {
    if (mdlFilesLoading) mdlFilesLoading.classList.remove('hidden');
    if (mdlFilesList) mdlFilesList.innerHTML = '';
    
    try {
        const response = await fetch(`/111477/api/tmdb/movie/${tmdbId}`);
        if (!response.ok) throw new Error('Failed to fetch movie files');
        
        const data = await response.json();
        renderFiles(data);
    } catch (error) {
        console.error('Error fetching movie files:', error);
        if (mdlFilesList) {
            mdlFilesList.innerHTML = `<div class="text-red-500 text-center py-4">Error: ${error.message}</div>`;
        }
    } finally {
        if (mdlFilesLoading) mdlFilesLoading.classList.add('hidden');
    }
}

function renderFiles(data) {
    if (!mdlFilesList) return;
    
    if (!data.success || !data.results || data.results.length === 0) {
        mdlFilesList.innerHTML = '<div class="text-gray-400 text-center py-4">No files found for this title.</div>';
        return;
    }
    
    mdlFilesList.innerHTML = '';
    
    // Count total files
    let totalFiles = 0;
    data.results.forEach(result => {
        if (result.files) totalFiles += result.files.length;
    });
    
    // Add summary header
    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'mb-4 pb-4 border-b border-gray-700';
    summaryDiv.innerHTML = `
        <div class="flex items-center justify-between">
            <span class="text-sm text-gray-400">Found <span class="text-cyan-400 font-bold">${totalFiles}</span> file(s) from <span class="text-cyan-400 font-bold">${data.results.length}</span> source(s)</span>
            ${data.dualSearchPerformed ? '<span class="text-xs bg-purple-600/20 text-purple-400 px-2 py-1 rounded">Multiple variants searched</span>' : ''}
        </div>
    `;
    mdlFilesList.appendChild(summaryDiv);
    
    data.results.forEach((result, resultIndex) => {
        if (!result.files || result.files.length === 0) return;
        
        // Add source header if multiple results
        if (data.results.length > 1) {
            const sourceHeader = document.createElement('div');
            sourceHeader.className = 'mt-4 mb-2 flex items-center gap-2';
            const variantLabel = result.searchVariant ? result.searchVariant.replace(/_/g, ' ') : `Source ${resultIndex + 1}`;
            sourceHeader.innerHTML = `
                <span class="text-xs font-bold text-gray-500 uppercase tracking-wider">${variantLabel}</span>
                <span class="text-xs text-gray-600">(${result.files.length} file${result.files.length > 1 ? 's' : ''})</span>
            `;
            mdlFilesList.appendChild(sourceHeader);
        }
        
        result.files.forEach(file => {
            const fileCard = document.createElement('div');
            fileCard.className = 'bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:border-cyan-500/50 transition-all mb-2';
            
            // Escape HTML in filename for title attribute
            const escapedName = file.name.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            
            fileCard.innerHTML = `
                <div class="flex items-start justify-between gap-4">
                    <div class="flex-1 min-w-0">
                        <h4 class="text-sm font-medium text-white break-words" title="${escapedName}">${file.name}</h4>
                        <p class="text-xs text-gray-400 mt-1">${file.sizeFormatted || formatBytes(file.sizeBytes)}</p>
                    </div>
                    <button class="download-btn flex-shrink-0 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                        </svg>
                        Download
                    </button>
                </div>
            `;
            
            const downloadBtn = fileCard.querySelector('.download-btn');
            downloadBtn.addEventListener('click', () => {
                if (window.electronAPI?.openExternal) {
                    window.electronAPI.openExternal(file.url);
                } else {
                    window.open(file.url, '_blank');
                }
            });
            
            mdlFilesList.appendChild(fileCard);
        });
    });
}

// ============================================================================
// AcerMovies Functions
// ============================================================================

let currentAcerSeriesType = 'movie';

async function searchAcerMovies(query) {
    const response = await fetch(`/api/acermovies/search/${encodeURIComponent(query)}`);
    
    if (!response.ok) throw new Error('AcerMovies search failed');
    
    const data = await response.json();
    const results = data.searchResult || [];
    
    if (results.length === 0) {
        if (mdlEmpty) mdlEmpty.classList.remove('hidden');
        return;
    }
    
    renderAcerResults(results);
}

function renderAcerResults(results) {
    if (!mdlGrid) return;
    mdlGrid.innerHTML = '';
    
    results.forEach(item => {
        const card = document.createElement('div');
        card.className = 'group cursor-pointer';
        
        const posterUrl = item.image || 'https://via.placeholder.com/500x750/1a1a2e/ffffff?text=No+Poster';
        
        card.innerHTML = `
            <div class="aspect-[2/3] rounded-xl overflow-hidden mb-2 relative bg-gray-800 border border-transparent group-hover:border-cyan-500/50 transition-all">
                <img src="${posterUrl}" alt="${item.title}" class="w-full h-full object-cover" loading="lazy" onerror="this.src='https://via.placeholder.com/500x750/1a1a2e/ffffff?text=No+Poster'">
                <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                    <span class="text-white text-sm font-medium">Click to view options</span>
                </div>
            </div>
            <h3 class="text-sm font-medium text-white line-clamp-2 group-hover:text-cyan-400 transition-colors">${item.title}</h3>
        `;
        
        card.addEventListener('click', () => openAcerDetails(item));
        mdlGrid.appendChild(card);
    });
}

async function openAcerDetails(item) {
    // Set modal info
    if (acerModalPoster) acerModalPoster.src = item.image || 'https://via.placeholder.com/500x750/1a1a2e/ffffff?text=No+Poster';
    if (acerModalTitle) acerModalTitle.textContent = item.title;
    if (acerModalInfo) acerModalInfo.textContent = '';
    
    // Clear and show loading
    if (acerQualityList) acerQualityList.innerHTML = '';
    if (acerQualityLoading) acerQualityLoading.classList.remove('hidden');
    
    // Show modal
    if (acerQualityModal) acerQualityModal.classList.remove('hidden');
    
    try {
        const response = await fetch(`/api/acermovies/sourceQuality?url=${encodeURIComponent(item.url)}`);
        if (!response.ok) throw new Error('Failed to fetch quality options');
        
        const data = await response.json();
        const qualities = data.sourceQualityList || [];
        const meta = data.meta || {};
        currentAcerSeriesType = meta.type || 'movie';
        
        if (acerModalInfo) {
            acerModalInfo.textContent = currentAcerSeriesType === 'series' ? 'TV Series' : 'Movie';
        }
        
        renderAcerQualityOptions(qualities);
    } catch (error) {
        console.error('Error fetching quality options:', error);
        if (acerQualityList) {
            acerQualityList.innerHTML = `<div class="text-red-500 text-center py-4">Error: ${error.message}</div>`;
        }
    } finally {
        if (acerQualityLoading) acerQualityLoading.classList.add('hidden');
    }
}

function renderAcerQualityOptions(qualities) {
    if (!acerQualityList) return;
    
    if (qualities.length === 0) {
        acerQualityList.innerHTML = '<div class="text-gray-400 text-center py-4">No quality options found.</div>';
        return;
    }
    
    acerQualityList.innerHTML = '';
    
    qualities.forEach(qItem => {
        // Fix for items having .link instead of .url
        if (qItem.link && !qItem.url) qItem.url = qItem.link;
        
        const qualityCard = document.createElement('div');
        qualityCard.className = 'bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:border-cyan-500/50 transition-all';
        
        const qualityBadge = qItem.quality || '';
        const hasBatch = qItem.batchUrl && qItem.batchUrl.trim() !== '';
        const hasEpisodes = qItem.episodesUrl && qItem.episodesUrl.trim() !== '';
        const hasDirectUrl = qItem.url && qItem.url.trim() !== '';
        
        let buttonsHtml = '';
        
        if (currentAcerSeriesType === 'movie' || currentAcerSeriesType === 'episode' || hasDirectUrl) {
            // Direct download button
            buttonsHtml = `
                <button class="select-btn flex-shrink-0 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold rounded-lg transition-colors" data-action="direct">
                    Select
                </button>
            `;
        } else {
            // Series - show batch and/or episodes buttons
            if (hasBatch) {
                buttonsHtml += `
                    <button class="batch-btn flex-shrink-0 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded-lg transition-colors" data-action="batch">
                        Season Pack
                    </button>
                `;
            }
            if (hasEpisodes) {
                buttonsHtml += `
                    <button class="episodes-btn flex-shrink-0 px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold rounded-lg transition-colors" data-action="episodes">
                        Episodes
                    </button>
                `;
            }
        }
        
        qualityCard.innerHTML = `
            <div class="flex items-center justify-between gap-4">
                <div class="flex-1 min-w-0">
                    <h4 class="text-sm font-medium text-white break-words">${qItem.title || 'Unknown Quality'}</h4>
                    ${qualityBadge ? `<span class="inline-block mt-2 px-2 py-1 bg-cyan-600/20 text-cyan-400 text-xs font-bold rounded">${qualityBadge}</span>` : ''}
                </div>
                <div class="flex gap-2 flex-wrap justify-end">
                    ${buttonsHtml}
                </div>
            </div>
        `;
        
        // Add event listeners
        const selectBtn = qualityCard.querySelector('.select-btn');
        const batchBtn = qualityCard.querySelector('.batch-btn');
        const episodesBtn = qualityCard.querySelector('.episodes-btn');
        
        if (selectBtn) {
            selectBtn.addEventListener('click', () => {
                selectBtn.innerHTML = '<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>';
                selectBtn.disabled = true;
                resolveFinalUrl(qItem.url, currentAcerSeriesType === 'episode' ? 'episode' : 'movie', selectBtn);
            });
        }
        
        if (batchBtn) {
            batchBtn.addEventListener('click', () => {
                batchBtn.innerHTML = '<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>';
                batchBtn.disabled = true;
                resolveFinalUrl(qItem.batchUrl, 'batch', batchBtn);
            });
        }
        
        if (episodesBtn) {
            episodesBtn.addEventListener('click', () => {
                episodesBtn.innerHTML = '<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>';
                episodesBtn.disabled = true;
                showAcerEpisodes(qItem);
            });
        }
        
        acerQualityList.appendChild(qualityCard);
    });
}

async function showAcerEpisodes(qItem) {
    try {
        const response = await fetch(`/api/acermovies/sourceEpisodes?url=${encodeURIComponent(qItem.episodesUrl)}`);
        if (!response.ok) throw new Error('Failed to fetch episodes');
        
        const data = await response.json();
        const episodes = data.sourceEpisodes || [];
        
        if (episodes.length === 0) {
            alert('No episodes found.');
            return;
        }
        
        // Map link to url for each episode and render as quality options
        const mappedEpisodes = episodes.map(ep => ({
            ...ep,
            url: ep.link || ep.url,
            quality: ''
        }));
        
        // Change series type to episode for proper handling
        currentAcerSeriesType = 'episode';
        
        // Re-render the quality list with episodes
        renderAcerQualityOptions(mappedEpisodes);
        
    } catch (error) {
        console.error('Error fetching episodes:', error);
        alert(`Failed to load episodes: ${error.message}`);
    }
}

async function resolveFinalUrl(url, seriesType, buttonEl) {
    try {
        const response = await fetch(`/api/acermovies/sourceUrl?url=${encodeURIComponent(url)}&seriesType=${seriesType}`);
        if (!response.ok) throw new Error('Failed to resolve download link');
        
        const data = await response.json();
        const finalUrl = data.sourceUrl || '';
        
        if (!finalUrl) {
            buttonEl.textContent = 'Select';
            buttonEl.disabled = false;
            alert('No final download link returned.');
            return;
        }
        
        // Change button to Download
        buttonEl.innerHTML = `
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
            Download
        `;
        buttonEl.disabled = false;
        buttonEl.className = buttonEl.className.replace('bg-cyan-600', 'bg-green-600').replace('hover:bg-cyan-500', 'hover:bg-green-500').replace('bg-purple-600', 'bg-green-600').replace('hover:bg-purple-500', 'hover:bg-green-500');
        
        // Replace click handler - use electronAPI for Electron, fallback to window.open
        buttonEl.onclick = () => {
            if (window.electronAPI?.openExternal) {
                window.electronAPI.openExternal(finalUrl);
            } else {
                window.open(finalUrl, '_blank');
            }
        };
        
    } catch (error) {
        console.error('Error resolving final URL:', error);
        buttonEl.textContent = 'Select';
        buttonEl.disabled = false;
        alert(`Failed to resolve download link: ${error.message}`);
    }
}

// ============================================================================
// Utility Functions
// ============================================================================

function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
