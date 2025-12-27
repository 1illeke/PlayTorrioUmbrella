// Basic Mode Home Logic
import {
  getPopularMovies,
  getTrendingMovies,
  getTopRatedMovies,
  getPopularTVShows,
  getTrendingTVShows,
  getTopRatedTVShows,
  getImageUrl,
  searchMulti
} from './api.js';
import { getJackettKey, setJackettKey } from './jackett.js';
import { getInstalledAddons, installAddon, removeAddon } from './addons.js';
import { initComics } from './comics.js';
import { initDebridUI } from './debrid.js';

// DOM Elements
let contentRows, searchResultsContainer, searchGrid, searchInput, heroSection, heroBackdrop, heroTitle, heroOverview, heroInfoBtn;
let settingsBtn, settingsModal, settingsContent, closeSettingsBtn, saveSettingsBtn, jackettApiInput;
let addonManifestInput, installAddonBtn, installedAddonsList, addonItemTemplate;
let rowTemplate, cardTemplate;

const syncHomeElements = () => {
    contentRows = document.getElementById('content-rows');
    searchResultsContainer = document.getElementById('search-results-container');
    searchGrid = document.getElementById('search-grid');
    searchInput = document.getElementById('search-input');
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

    addonManifestInput = document.getElementById('addon-manifest-input');
    installAddonBtn = document.getElementById('install-addon-btn');
    installedAddonsList = document.getElementById('installed-addons-list');
    addonItemTemplate = document.getElementById('addon-item-template');

    rowTemplate = document.getElementById('poster-row-template');
    cardTemplate = document.getElementById('poster-card-template');
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
  const type = item.media_type || mediaType || (item.title ? 'movie' : 'tv');
  
  // Skip people or other non-watchable types if they sneak in
  if (type !== 'movie' && type !== 'tv') return null;

  link.href = `details.html?type=${type}&id=${item.id}`;

  // Adjust classes for grid view vs row view
  if (isGrid) {
      link.classList.remove('w-[160px]', 'md:w-[180px]', 'lg:w-[200px]', 'flex-shrink-0');
      link.classList.add('w-full');
  }
  
  if (item.poster_path) {
    img.src = getImageUrl(item.poster_path, 'w500');
  } else {
    img.src = 'https://via.placeholder.com/500x750/1a1a2e/ffffff?text=No+Poster';
  }
  img.alt = item.title || item.name;

  title.textContent = item.title || item.name;
  
  const releaseDate = item.release_date || item.first_air_date;
  date.textContent = releaseDate ? releaseDate.split('-')[0] : '';
  
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
        const data = await searchMulti(q);
        const results = data.results || [];
        
        // Store valid results
        currentSearchResults = results.filter(item => item.media_type === 'movie' || item.media_type === 'tv');
        
        renderSearchResults();

    } catch (error) {
        console.error('Search failed:', error);
        searchGrid.innerHTML = '<div class="col-span-full text-center text-red-500">Error loading results</div>';
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
};

// Settings Logic
const openSettings = async () => {
    jackettApiInput.value = await getJackettKey() || '';
    await renderAddonsList();
    await initDebridUI();
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
    initRows();
    initWelcomePopup();
    
    // Listeners
    settingsBtn?.addEventListener('click', openSettings);
    closeSettingsBtn?.addEventListener('click', closeSettings);
    settingsModal?.addEventListener('click', (e) => {
        if (e.target === settingsModal) closeSettings();
    });

    saveSettingsBtn?.addEventListener('click', async () => {
        const key = jackettApiInput.value.trim();
        if (key) {
            await setJackettKey(key);
            closeSettings();
        }
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
