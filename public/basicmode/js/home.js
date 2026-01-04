// Basic Mode Home Logic
import {
  getPopularMovies,
  getTrendingMovies,
  getTopRatedMovies,
  getPopularTVShows,
  getTrendingTVShows,
  getTopRatedTVShows,
  getImageUrl,
  searchMulti,
  getGenresList
} from './api.js';
import { getJackettKey, setJackettKey, getJackettSettings } from './jackett.js';
import { getInstalledAddons, installAddon, removeAddon } from './addons.js';
import { initComics } from './comics.js';
import { initDebridUI, initNodeMPVUI, initSponsorUI, loadSponsorVisibility, initTorrentEngineUI } from './debrid.js';

// DOM Elements
let contentRows, searchResultsContainer, searchGrid, searchInput, searchSourceSelect, heroSection, heroBackdrop, heroTitle, heroOverview, heroInfoBtn;
let settingsBtn, settingsModal, settingsContent, closeSettingsBtn, saveSettingsBtn, jackettApiInput, jackettUrlInput;
let addonManifestInput, installAddonBtn, installedAddonsList, addonItemTemplate;
let rowTemplate, cardTemplate;
let genresSection, genresList, catalogsSection, catalogsList;

const syncHomeElements = () => {
    contentRows = document.getElementById('content-rows');
    searchResultsContainer = document.getElementById('search-results-container');
    searchGrid = document.getElementById('search-grid');
    searchInput = document.getElementById('search-input');
    searchSourceSelect = document.getElementById('search-source-select');
    heroSection = document.getElementById('hero-section');
    heroBackdrop = document.getElementById('hero-backdrop');
    heroTitle = document.getElementById('hero-title');
    heroOverview = document.getElementById('hero-overview');
    heroInfoBtn = document.getElementById('hero-info-btn');

    settingsBtn = document.getElementById('settings-btn');
    settingsModal = document.getElementById('settings-modal');
    settingsContent = document.getElementById('settings-content');
    closeSettingsBtn = document.getElementById('close-settings');
    saveSettingsBtn = document.getElementById('save-settings');
    jackettApiInput = document.getElementById('jackett-api-input');
    jackettUrlInput = document.getElementById('jackett-url-input');

    addonManifestInput = document.getElementById('addon-manifest-input');
    installAddonBtn = document.getElementById('install-addon-btn');
    installedAddonsList = document.getElementById('installed-addons-list');
    addonItemTemplate = document.getElementById('addon-item-template');

    rowTemplate = document.getElementById('poster-row-template');
    cardTemplate = document.getElementById('poster-card-template');
    
    genresSection = document.getElementById('genres-section');
    genresList = document.getElementById('genres-list');
    catalogsSection = document.getElementById('catalogs-section');
    catalogsList = document.getElementById('catalogs-list');
};

// Navigation Logic
window.showSection = (section) => {
    console.log('Showing section:', section);
    syncHomeElements();
    
    const comicsSection = document.getElementById('comics-section');
    const mainSearchContainer = searchInput ? searchInput.closest('.relative.group') : null;
    
    // Hide everything first
    if (heroSection) heroSection.classList.add('hidden');
    if (contentRows) contentRows.classList.add('hidden');
    if (comicsSection) comicsSection.classList.add('hidden');
    if (searchResultsContainer) searchResultsContainer.classList.add('hidden');
    if (genresSection) genresSection.classList.add('hidden');
    if (catalogsSection) catalogsSection.classList.add('hidden');
    
    // Deactivate all nav links
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active', 'text-white'));

    if (section === 'home') {
        if (heroSection) heroSection.classList.remove('hidden');
        if (contentRows) contentRows.classList.remove('hidden');
        if (mainSearchContainer) mainSearchContainer.classList.remove('hidden');
        document.querySelector('.nav-link[onclick*="home"]')?.classList.add('active', 'text-white');
    } else if (section === 'comics') {
        if (comicsSection) {
            comicsSection.classList.remove('hidden');
            initComics();
        }
        if (mainSearchContainer) mainSearchContainer.classList.add('hidden');
        document.querySelector('.nav-link[onclick*="comics"]')?.classList.add('active', 'text-white');
    } else if (section === 'genres') {
        if (genresSection) {
            genresSection.classList.remove('hidden');
            initGenres();
        }
        if (mainSearchContainer) mainSearchContainer.classList.add('hidden');
        document.querySelector('.nav-link[onclick*="genres"]')?.classList.add('active', 'text-white');
    } else if (section === 'catalogs') {
        if (catalogsSection) {
            catalogsSection.classList.remove('hidden');
            initCatalogs();
        }
        if (mainSearchContainer) mainSearchContainer.classList.add('hidden');
        document.querySelector('.nav-link[onclick*="catalogs"]')?.classList.add('active', 'text-white');
    }
};

const initGenres = async () => {
    if (!genresList || genresList.children.length > 0) return; // Already loaded
    
    try {
        const genres = await getGenresList();
        genres.forEach(genre => {
            const btn = document.createElement('a');
            btn.href = `grid.html?type=genre&id=${genre.id}&name=${encodeURIComponent(genre.name)}`;
            btn.className = 'px-6 py-3 rounded-xl bg-gray-800 border border-gray-700 hover:border-purple-500 hover:bg-gray-700 text-white font-medium transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg hover:shadow-purple-500/20';
            btn.textContent = genre.name;
            genresList.appendChild(btn);
        });
    } catch (e) {
        console.error('Failed to load genres', e);
        if (genresList) genresList.innerHTML = '<div class="text-red-500">Failed to load genres</div>';
    }
};

const initCatalogs = async () => {
    if (!catalogsList) return;
    catalogsList.innerHTML = '';
    
    try {
        const addons = await getInstalledAddons();
        let found = false;

        addons.forEach(addon => {
            if (addon.manifest.catalogs && addon.manifest.catalogs.length > 0) {
                // Filter valid catalogs first
                const validCatalogs = addon.manifest.catalogs.filter(cat => cat.type === 'movie' || cat.type === 'series');
                
                if (validCatalogs.length > 0) {
                    found = true;
                    
                    // Add Addon Header/Separator
                    const header = document.createElement('div');
                    header.className = 'w-full flex items-center gap-4 mt-6 mb-4 px-4 col-span-full';
                    header.innerHTML = `
                        <div class="h-px bg-gray-700 flex-1"></div>
                        <span class="text-gray-400 font-bold uppercase text-xs tracking-wider">${addon.manifest.name}</span>
                        <div class="h-px bg-gray-700 flex-1"></div>
                    `;
                    catalogsList.appendChild(header);

                    validCatalogs.forEach(cat => {
                        const btn = document.createElement('a');
                        const catName = cat.name || cat.id;
                        // Use a cleaner name for the title
                        const btnName = `${catName}`; 
                        
                        btn.href = `grid.html?type=addon&addonId=${addon.manifest.id}&catalogId=${cat.id}&catalogType=${cat.type}&name=${encodeURIComponent(addon.manifest.name + ' - ' + catName)}`;
                        btn.className = 'px-6 py-4 rounded-xl bg-gray-800/80 border border-gray-700 hover:border-purple-500 hover:bg-gray-700 text-white font-medium transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg hover:shadow-purple-500/20 flex flex-col items-center justify-center gap-1 text-center min-h-[80px]';
                        
                        btn.innerHTML = `
                            <span class="text-lg">${catName}</span>
                            <span class="text-xs text-gray-500 capitalize bg-black/30 px-2 py-0.5 rounded-full">${cat.type}</span>
                        `;
                        
                        catalogsList.appendChild(btn);
                    });
                }
            }
        });
        
        if (!found) {
            catalogsList.innerHTML = '<div class="text-gray-500 col-span-full text-center py-10">No addon catalogs found. Install addons from Settings.</div>';
        }
        
    } catch (e) {
        console.error('Failed to load catalogs', e);
        if (catalogsList) catalogsList.innerHTML = '<div class="text-red-500 col-span-full text-center">Failed to load catalogs</div>';
    }
};

// Hero Logic
const initHero = async () => {
  try {
    const data = await getTrendingMovies();
    const results = data.results || [];
    const heroItem = results[Math.floor(Math.random() * Math.min(results.length, 5))];
    
    if (heroItem && heroBackdrop) {
      heroBackdrop.style.backgroundImage = `url(${getImageUrl(heroItem.backdrop_path, 'original')})`;
      heroTitle.textContent = heroItem.title || heroItem.name;
      heroOverview.textContent = heroItem.overview;
      heroInfoBtn.href = `details.html?type=${heroItem.media_type || 'movie'}&id=${heroItem.id}`;
      
      heroSection.classList.remove('opacity-0');
      setTimeout(() => {
        heroBackdrop.classList.remove('scale-105');
      }, 100);
    }
  } catch (e) {
    console.error("Hero init failed", e);
    heroSection?.classList.add('hidden');
  }
};

let currentSearchResults = [];
let currentFilter = 'all';

const filterButtons = document.querySelectorAll('.filter-btn');

// Debounce utility
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

const createPosterCard = (item, mediaType, isGrid = false) => {
  if (!cardTemplate) return document.createElement('div');
  const clone = cardTemplate.content.cloneNode(true);
  const link = clone.querySelector('.poster-link');
  const img = clone.querySelector('.poster-img');
  const title = clone.querySelector('.poster-title');
  const date = clone.querySelector('.poster-date');
  const ratingValue = clone.querySelector('.rating-value');

  // If media_type is inside item (from search), use it. Fallback to passed mediaType.
  let type = item.media_type || mediaType || (item.title ? 'movie' : 'tv');
  // Normalize 'series' to 'tv'
  if (type === 'series') type = 'tv';
  
  // Skip people or other non-watchable types if they sneak in
  if (type !== 'movie' && type !== 'tv') return null;

  // Build the link - include addonId if present
  if (item._addonId) {
    link.href = `details.html?type=${type}&id=${encodeURIComponent(item.id)}&addonId=${item._addonId}`;
  } else {
    link.href = `details.html?type=${type}&id=${item.id}`;
  }

  // Adjust classes for grid view vs row view
  if (isGrid) {
      link.classList.remove('w-[160px]', 'md:w-[180px]', 'lg:w-[200px]', 'flex-shrink-0');
      link.classList.add('w-full');
  }
  
  // Handle poster - could be TMDB path or full URL from addon
  if (item.poster_path) {
    if (item.poster_path.startsWith('http')) {
      img.src = item.poster_path;
    } else {
      img.src = getImageUrl(item.poster_path, 'w500');
    }
  } else {
    img.src = 'https://via.placeholder.com/500x750/1a1a2e/ffffff?text=No+Poster';
  }
  img.alt = item.title || item.name;

  title.textContent = item.title || item.name;
  
  const releaseDate = item.release_date || item.first_air_date;
  date.textContent = releaseDate ? String(releaseDate).split('-')[0] : '';
  
  if (ratingValue) {
      ratingValue.textContent = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
  }

  return clone;
};

const renderSearchResults = () => {
    if (!searchGrid) return;
    searchGrid.innerHTML = '';
    const noResults = document.getElementById('no-results');
    
    let filteredResults = currentSearchResults;
    if (currentFilter !== 'all') {
        filteredResults = currentSearchResults.filter(item => item.media_type === currentFilter);
    }

    if (filteredResults.length === 0) {
        if (currentSearchResults.length > 0) {
             // We have results but filtered them all out
             searchGrid.innerHTML = `<div class="col-span-full text-center text-gray-400 py-8">No ${currentFilter === 'movie' ? 'movies' : 'TV shows'} found in these results.</div>`;
        } else if (noResults) {
             noResults.classList.remove('hidden');
        }
    } else {
        if (noResults) noResults.classList.add('hidden');
        filteredResults.forEach(item => {
            const card = createPosterCard(item, null, true); // true for isGrid
            if (card) searchGrid.appendChild(card);
        });
    }
};

const updateFilterButtons = (selectedFilter) => {
    filterButtons.forEach(btn => {
        const filter = btn.dataset.filter;
        if (filter === selectedFilter) {
            btn.classList.remove('text-gray-400', 'hover:text-white', 'hover:bg-white/5');
            btn.classList.add('bg-primary-purple', 'text-white', 'shadow-lg', 'shadow-purple-500/25');
        } else {
            btn.classList.add('text-gray-400', 'hover:text-white', 'hover:bg-white/5');
            btn.classList.remove('bg-primary-purple', 'text-white', 'shadow-lg', 'shadow-purple-500/25');
        }
    });
};

filterButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        currentFilter = btn.dataset.filter;
        updateFilterButtons(currentFilter);
        renderSearchResults();
    });
});

const updateSearchSources = async () => {
    if (!searchSourceSelect) return;
    
    const addons = await getInstalledAddons();
    const currentVal = searchSourceSelect.value;
    
    // Clear except TMDB
    searchSourceSelect.innerHTML = '<option value="tmdb">TMDB</option>';
    
    addons.forEach(addon => {
        // Check if addon explicitly supports search
        let supportsSearch = false;
        
        if (addon.manifest.catalogs) {
            supportsSearch = addon.manifest.catalogs.some(c => 
                c.extra && c.extra.some(e => e.name === 'search')
            );
        }
        
        // Legacy support check
        if (!supportsSearch && addon.manifest.extraSupported) {
            supportsSearch = addon.manifest.extraSupported.includes('search');
        }

        if (supportsSearch) {
            const option = document.createElement('option');
            option.value = `addon:${addon.manifest.id}`;
            option.textContent = addon.manifest.name;
            searchSourceSelect.appendChild(option);
        }
    });
    
    if (currentVal && searchSourceSelect.querySelector(`option[value="${currentVal}"]`)) {
        searchSourceSelect.value = currentVal;
    }
};

const searchAddon = async (addonId, query) => {
    const addons = await getInstalledAddons();
    const addon = addons.find(a => a.manifest.id === addonId);
    if (!addon) throw new Error('Addon not found');

    let url = addon.url.replace('/manifest.json', '');
    if (url.endsWith('/')) url = url.slice(0, -1);

    // Try to find a catalog that supports search
    let searchCatalog = null;
    if (addon.manifest.catalogs) {
        searchCatalog = addon.manifest.catalogs.find(c => 
            c.extra && c.extra.some(e => e.name === 'search')
        );
    }

    if (!searchCatalog) {
        // Fallback: Check if we can search specific types
        const types = addon.manifest.types || ['movie', 'series'];
        let results = [];
        
        for (const type of types) {
            try {
                // If the addon doesn't explicitly advertise search but has catalogs, we try standard endpoint
                const targetUrl = `${url}/catalog/${type}/${addon.manifest.catalogs?.[0]?.id || 'search'}/search=${encodeURIComponent(query)}.json`;
                const res = await fetch(targetUrl);
                const data = await res.json();
                if (data.metas && data.metas.length > 0) {
                    results = [...results, ...data.metas];
                }
            } catch (e) {
                console.warn(`Search failed for type ${type} on addon ${addonId}`, e);
            }
        }
        return { results: results.map(m => ({...m, media_type: m.type})) };
    } else {
        const targetUrl = `${url}/catalog/${searchCatalog.type}/${searchCatalog.id}/search=${encodeURIComponent(query)}.json`;
        const res = await fetch(targetUrl);
        const data = await res.json();
        return { results: (data.metas || []).map(m => ({...m, media_type: m.type})) };
    }
};

const handleSearch = async (query) => {
  const q = (query || '').trim();
  if (!q) {
    showSection('home');
    return;
  }

  syncHomeElements();
  
  if (heroSection) heroSection.classList.add('hidden');
  if (contentRows) contentRows.classList.add('hidden');
  const comicsSection = document.getElementById('comics-section');
  if (comicsSection) comicsSection.classList.add('hidden');
  if (searchResultsContainer) searchResultsContainer.classList.remove('hidden');
  
  const noResults = document.getElementById('no-results');
  if (noResults) noResults.classList.add('hidden');
  
  // Reset filter to 'all' on new search
  currentFilter = 'all';
  updateFilterButtons('all');
  
  if (searchGrid) {
    searchGrid.innerHTML = '<div class="col-span-full text-center py-8"><div class="inline-block w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div></div>';

    try {
        let results = [];
        const source = searchSourceSelect ? searchSourceSelect.value : 'tmdb';

        if (source === 'tmdb') {
            const data = await searchMulti(q);
            results = data.results || [];
            // Store valid results
            currentSearchResults = results.filter(item => item.media_type === 'movie' || item.media_type === 'tv');
        } else if (source.startsWith('addon:')) {
            const addonId = source.replace('addon:', '');
            const data = await searchAddon(addonId, q);
            // Map addon results to common format if needed
            currentSearchResults = (data.results || []).map(item => {
                // Normalize type: 'series' -> 'tv'
                let mediaType = item.type || item.media_type || 'movie';
                if (mediaType === 'series') mediaType = 'tv';
                
                return {
                    id: item.id, // Stremio ID (e.g. tt12345 or kitsu:123)
                    title: item.name,
                    name: item.name,
                    poster_path: item.poster, // Full URL
                    media_type: mediaType,
                    release_date: item.releaseInfo || item.year, // rough approx
                    vote_average: item.imdbRating ? parseFloat(item.imdbRating) : null,
                    _addonId: addonId // Include addon ID for proper linking
                };
            });
        }
        
        renderSearchResults();

    } catch (error) {
        console.error('Search failed:', error);
        searchGrid.innerHTML = `<div class="col-span-full text-center text-red-500">Error loading results: ${error.message}</div>`;
    }
  }
};

const createRow = async (title, fetchFn, mediaType) => {
  try {
    const data = await fetchFn();
    const items = data.results || [];
    
    if (items.length === 0) return;

    if (!rowTemplate) return;
    const rowClone = rowTemplate.content.cloneNode(true);
    rowClone.querySelector('.row-title').textContent = title;
    
    const postersContainer = rowClone.querySelector('.row-posters');
    items.forEach(item => {
      const card = createPosterCard(item, mediaType);
      if (card) postersContainer.appendChild(card);
    });

    // Scroll Logic
    const scrollLeftBtn = rowClone.querySelector('.scroll-left');
    const scrollRightBtn = rowClone.querySelector('.scroll-right');
    const rowContainer = rowClone.querySelector('.row-container');

    const updateScrollButtons = () => {
        const { scrollLeft, scrollWidth, clientWidth } = postersContainer;
        
        if (scrollLeft > 0) {
            scrollLeftBtn.classList.remove('opacity-0', 'pointer-events-none');
            scrollLeftBtn.classList.add('group-hover/row:opacity-100');
        } else {
            scrollLeftBtn.classList.add('opacity-0', 'pointer-events-none');
            scrollLeftBtn.classList.remove('group-hover/row:opacity-100');
        }

        if (scrollLeft < scrollWidth - clientWidth - 10) {
             scrollRightBtn.classList.remove('opacity-0', 'pointer-events-none');
             scrollRightBtn.classList.add('group-hover/row:opacity-100');
        } else {
             scrollRightBtn.classList.add('opacity-0', 'pointer-events-none');
             scrollRightBtn.classList.remove('group-hover/row:opacity-100');
        }
    };

    if (postersContainer) {
        postersContainer.addEventListener('scroll', updateScrollButtons);
        
        if (scrollLeftBtn) {
            scrollLeftBtn.addEventListener('click', () => {
                const scrollAmount = postersContainer.clientWidth * 0.8;
                postersContainer.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
            });
        }

        if (scrollRightBtn) {
            scrollRightBtn.addEventListener('click', () => {
                const scrollAmount = postersContainer.clientWidth * 0.8;
                postersContainer.scrollBy({ left: scrollAmount, behavior: 'smooth' });
            });
        }
        
        // Wait for layout
        setTimeout(updateScrollButtons, 100);
    }

    if (contentRows) {
        contentRows.appendChild(rowClone);
        
        // Trigger animation
        setTimeout(() => {
            // Re-query the appended element to remove opacity class
            // But since rowClone is a fragment, we need to rely on the fact we appended it.
            // The rowContainer inside the fragment is now in the DOM.
            // However, we can't easily select it.
            // Easier approach: select all rows and animate them.
        }, 50);
    }

  } catch (error) {
    console.error(`Failed to load row: ${title}`, error);
  }
};

const initRows = async () => {
  if (contentRows) contentRows.innerHTML = '';
  
  // First, load Continue Watching row if there are items
  await createContinueWatchingRow();
  
  // Ordered execution to maintain order on page
  const rows = [
    { title: 'Trending Movies', fetchFn: getTrendingMovies, mediaType: 'movie' },
    { title: 'Trending Series', fetchFn: getTrendingTVShows, mediaType: 'tv' },
    { title: 'Popular Movies', fetchFn: getPopularMovies, mediaType: 'movie' },
    { title: 'Popular Series', fetchFn: getPopularTVShows, mediaType: 'tv' },
    { title: 'Top Rated Movies', fetchFn: getTopRatedMovies, mediaType: 'movie' },
    { title: 'Top Rated Series', fetchFn: getTopRatedTVShows, mediaType: 'tv' },
  ];

  for (const row of rows) {
      await createRow(row.title, row.fetchFn, row.mediaType);
  }
  
  const loadingIndicator = document.getElementById('loading-indicator');
  if(loadingIndicator) loadingIndicator.remove();
  
  // Animate rows after creation
  setTimeout(() => {
      document.querySelectorAll('.row-container').forEach((row, i) => {
          setTimeout(() => {
              row.classList.remove('opacity-0', 'translate-y-4');
          }, i * 100);
      });
  }, 100);
};

// Continue Watching Row
const createContinueWatchingRow = async () => {
    try {
        const response = await fetch('/api/resume/all');
        if (!response.ok) return;
        
        const items = await response.json();
        if (!Array.isArray(items) || items.length === 0) return;
        
        if (!rowTemplate) return;
        const rowClone = rowTemplate.content.cloneNode(true);
        rowClone.querySelector('.row-title').textContent = '⏱️ Continue Watching';
        
        const postersContainer = rowClone.querySelector('.row-posters');
        
        items.forEach(item => {
            if (!item.tmdb_id || !item.media_type) return;
            
            const card = document.createElement('a');
            card.className = 'poster-link block flex-shrink-0 w-[160px] md:w-[180px] lg:w-[200px] group relative cursor-pointer';
            
            // Build URL with source info for replay
            const params = new URLSearchParams({
                type: item.media_type,
                id: item.tmdb_id
            });
            if (item.season) params.append('season', item.season);
            if (item.episode) params.append('episode', item.episode);
            if (item.sourceInfo) params.append('sourceInfo', JSON.stringify(item.sourceInfo));
            
            card.href = `details.html?${params.toString()}`;
            
            const progress = item.duration > 0 ? ((item.position / item.duration) * 100).toFixed(0) : 0;
            const posterUrl = item.poster_path 
                ? `https://image.tmdb.org/t/p/w342${item.poster_path}`
                : 'https://via.placeholder.com/342x513/1a1a2e/ffffff?text=No+Image';
            
            // Episode info for TV shows
            let episodeInfo = '';
            if (item.media_type === 'tv' && item.season && item.episode) {
                episodeInfo = `S${item.season}E${item.episode}`;
            } else if (item.media_type === 'tv' && item.season) {
                episodeInfo = `Season ${item.season}`;
            }
            
            card.innerHTML = `
                <div class="aspect-[2/3] rounded-xl overflow-hidden mb-2 relative poster-shadow transition-all duration-300 group-hover:shadow-purple-500/40 group-hover:shadow-2xl border border-transparent group-hover:border-purple-500/30">
                    <img src="${posterUrl}" alt="${item.title}" loading="lazy" class="w-full h-full object-cover">
                    <!-- Progress bar -->
                    <div class="absolute bottom-0 left-0 right-0 h-1 bg-gray-800">
                        <div class="h-full bg-purple-500" style="width: ${progress}%"></div>
                    </div>
                    <!-- Overlay -->
                    <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-4 text-center">
                        <span class="text-white font-bold mb-2 flex items-center gap-1">
                            <svg class="w-4 h-4 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z"/>
                            </svg>
                            ${progress}%
                        </span>
                        ${episodeInfo ? `<span class="text-gray-300 text-sm mb-2">${episodeInfo}</span>` : ''}
                        <button class="bg-primary-purple text-white px-4 py-2 rounded-full text-sm font-medium transform scale-0 group-hover:scale-100 transition-transform duration-300 delay-100">
                            Continue
                        </button>
                    </div>
                </div>
                <h3 class="text-white font-medium truncate group-hover:text-primary-purple transition-colors">${item.title}</h3>
                <p class="text-gray-500 text-sm">${episodeInfo || (item.media_type === 'movie' ? 'Movie' : 'TV Show')}</p>
            `;
            
            postersContainer.appendChild(card);
        });
        
        // Scroll Logic
        const scrollLeftBtn = rowClone.querySelector('.scroll-left');
        const scrollRightBtn = rowClone.querySelector('.scroll-right');
        
        const updateScrollButtons = () => {
            const { scrollLeft, scrollWidth, clientWidth } = postersContainer;
            
            if (scrollLeft > 0) {
                scrollLeftBtn.classList.remove('opacity-0', 'pointer-events-none');
                scrollLeftBtn.classList.add('group-hover/row:opacity-100');
            } else {
                scrollLeftBtn.classList.add('opacity-0', 'pointer-events-none');
                scrollLeftBtn.classList.remove('group-hover/row:opacity-100');
            }

            if (scrollLeft < scrollWidth - clientWidth - 10) {
                scrollRightBtn.classList.remove('opacity-0', 'pointer-events-none');
                scrollRightBtn.classList.add('group-hover/row:opacity-100');
            } else {
                scrollRightBtn.classList.add('opacity-0', 'pointer-events-none');
                scrollRightBtn.classList.remove('group-hover/row:opacity-100');
            }
        };

        if (postersContainer) {
            postersContainer.addEventListener('scroll', updateScrollButtons);
            
            if (scrollLeftBtn) {
                scrollLeftBtn.addEventListener('click', () => {
                    const scrollAmount = postersContainer.clientWidth * 0.8;
                    postersContainer.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
                });
            }

            if (scrollRightBtn) {
                scrollRightBtn.addEventListener('click', () => {
                    const scrollAmount = postersContainer.clientWidth * 0.8;
                    postersContainer.scrollBy({ left: scrollAmount, behavior: 'smooth' });
                });
            }
            
            setTimeout(updateScrollButtons, 100);
        }

        if (contentRows) {
            contentRows.appendChild(rowClone);
        }
        
    } catch (error) {
        console.error('[Continue Watching] Failed to load:', error);
    }
};

// Addon UI Logic
const renderAddonsList = async () => {
    if (!installedAddonsList) return;
    installedAddonsList.innerHTML = '';
    const addons = await getInstalledAddons();
    
    addons.forEach(addon => {
        const clone = addonItemTemplate.content.cloneNode(true);
        const name = addon.manifest?.name || addon.name || 'Unknown Addon';
        const logo = addon.manifest?.logo || addon.logo;
        const id = addon.manifest?.id || addon.id;

        clone.querySelector('.addon-name').textContent = name;
        const logoEl = clone.querySelector('.addon-logo');
        if (logo) logoEl.src = logo;
        else logoEl.src = 'https://via.placeholder.com/32/1a1a2e/ffffff?text=A';

        clone.querySelector('.remove-addon-btn').onclick = async () => {
            await removeAddon(id);
            renderAddonsList();
        };
        installedAddonsList.appendChild(clone);
    });
    // Update search sources whenever addon list is refreshed
    updateSearchSources();
};

// Settings Logic
const openSettings = async () => {
    jackettApiInput.value = await getJackettKey() || '';
    const settings = await getJackettSettings();
    if (jackettUrlInput) jackettUrlInput.value = settings.jackettUrl || '';
    await renderAddonsList();
    await initDebridUI();
    await initNodeMPVUI();
    await initSponsorUI();
    await initTorrentEngineUI();
    settingsModal.classList.remove('hidden');
    requestAnimationFrame(() => {
        settingsModal.classList.remove('opacity-0');
        settingsContent.classList.remove('scale-95');
        settingsContent.classList.add('scale-100');
    });
};

const closeSettings = () => {
    settingsModal.classList.add('opacity-0');
    settingsContent.classList.remove('scale-100');
    settingsContent.classList.add('scale-95');
    setTimeout(() => {
        settingsModal.classList.add('hidden');
    }, 300);
};

// Welcome Popup Logic
const initWelcomePopup = () => {
    const popup = document.getElementById('welcome-popup');
    const closeBtn = document.getElementById('close-welcome');
    const dontShowBtn = document.getElementById('dont-show-welcome');
    
    if (!popup) return;

    // Check if user has already dismissed the popup
    const hideWelcome = localStorage.getItem('hide_welcome_basic');
    if (hideWelcome === 'true') return;

    // Show popup with a slight delay
    setTimeout(() => {
        popup.classList.remove('hidden');
        requestAnimationFrame(() => {
            popup.classList.add('visible');
            popup.classList.remove('opacity-0');
        });
    }, 1000);

    const closePopup = () => {
        popup.classList.remove('visible');
        popup.classList.add('opacity-0');
        setTimeout(() => popup.classList.add('hidden'), 300);
    };

    closeBtn?.addEventListener('click', closePopup);
    dontShowBtn?.addEventListener('click', () => {
        localStorage.setItem('hide_welcome_basic', 'true');
        closePopup();
    });
};

// Init
document.addEventListener('DOMContentLoaded', () => {
    syncHomeElements();
    initHero();
    updateSearchSources(); // Initial load of search sources
    initRows();
    initWelcomePopup();
    loadSponsorVisibility(); // Load sponsor visibility on startup
    
    // Listeners
    settingsBtn?.addEventListener('click', openSettings);
    closeSettingsBtn?.addEventListener('click', closeSettings);
    settingsModal?.addEventListener('click', (e) => {
        if (e.target === settingsModal) closeSettings();
    });

    saveSettingsBtn?.addEventListener('click', async () => {
        const key = jackettApiInput.value.trim();
        const url = jackettUrlInput ? jackettUrlInput.value.trim() : null;

        if (key && !key.includes('*')) {
            await setJackettKey(key);
        }

        if (url !== null) {
            try {
                await fetch('/api/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ jackettUrl: url })
                });
            } catch (e) {
                console.error("Failed to save Jackett URL", e);
            }
        }

        closeSettings();
    });

    installAddonBtn?.addEventListener('click', async () => {
        const url = addonManifestInput.value.trim();
        if (!url) return;
        installAddonBtn.disabled = true;
        try {
            await installAddon(url);
            addonManifestInput.value = '';
            renderAddonsList();
        } catch (e) {
            alert(e.message || "Failed to install addon");
        } finally {
            installAddonBtn.disabled = false;
        }
    });

    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSearch(e.target.value);
            }
        });
    }

    // Default to home section
    showSection('home');
});

// Update Listener
if (window.electronAPI && window.electronAPI.onUpdateAvailable) {
    window.electronAPI.onUpdateAvailable((info) => {
        console.log('Update available:', info);
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm';
        modal.innerHTML = `
            <div class="bg-[#14141f] border border-purple-500/50 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl transform scale-100 transition-transform duration-300">
                <div class="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mb-6 mx-auto">
                    <svg class="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                </div>
                <h2 class="text-2xl font-bold text-white text-center mb-2">Update Available!</h2>
                <p class="text-gray-400 text-center mb-6">Version <span class="text-white font-bold">${info.version}</span> is ready to download.</p>
                <div class="flex flex-col gap-3">
                    <button id="update-download-btn" class="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2">
                        <span>Download Now</span>
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                    </button>
                    <button id="update-later-btn" class="w-full py-2 text-gray-500 hover:text-gray-300 text-sm font-medium transition-colors">
                        Remind Me Later
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        document.getElementById('update-download-btn').onclick = () => {
             if (window.electronAPI.openExternal) {
                 window.electronAPI.openExternal(info.downloadUrl);
             }
             modal.remove();
        };
        
        document.getElementById('update-later-btn').onclick = () => {
            modal.remove();
        };
    });
}