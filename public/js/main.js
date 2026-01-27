// Main Application JavaScript
// Extracted from original index.html - contains all core functionality

// ============================================================================
// GLOBAL STATE VARIABLES
// ============================================================================
let isLoading = false;
let currentPage = 1;
let currentCategory = 'all';
let allMoviesCache = [];
let currentSort = 'popularity';
let currentFilter = 'all';
let lastSearchResults = [];
let lastSearchQuery = '';
let isSearchMode = false;
let currentContent = null;
let currentMediaType = null;
let torrentsLoaded = false;
let activeRoute = 'home';

// ============================================================================
// SHOW/HIDE PAGE FUNCTIONS
// ============================================================================
function showHomePage() {
    window.location.hash = '#/';
}

function showGenresPage() {
    window.location.hash = '#/genres';
}

function showCatalogsPage() {
    window.location.hash = '#/catalogs';
}

function showCustomMagnetModal() {
    const modal = document.getElementById('custom-magnet-modal');
    const input = document.getElementById('custom-magnet-input');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
        modal.style.opacity = '1';
        modal.style.pointerEvents = 'auto';
        if (input) {
            input.value = '';
            setTimeout(() => input.focus(), 100);
        }
    }
}

function showMyListPage() {
    window.location.hash = '#/my-list';
}

function showDoneWatchingPage() {
    window.location.hash = '#/done-watching';
}

function showTraktPage() {
    window.location.hash = '#/trakt';
}

function showLiveTvPage() {
    window.location.hash = '#/livetv';
}

function showIptvPage() {
    window.location.hash = '#/iptv';
    try { updateIptvActionButton(); } catch(_) {}
}

function showBooksPage() {
    window.location.hash = '#/books';
}

function showAudioBooksPage() {
    window.location.hash = '#/audiobooks';
    if (typeof loadInitialAudioBooks === 'function') {
        loadInitialAudioBooks();
    }
}

function showBookTorrioPage() {
    window.location.hash = '#/booktorrio';
}

function showAnimePage() {
    window.location.hash = '#/anime';
}

function showComicsPage() {
    window.location.hash = '#/comics';
}

function showMangaPage() {
    window.location.hash = '#/manga';
}

function showMusicPage() {
    window.location.hash = '#/music';
}

function showGamesDownloaderPage() {
    window.location.hash = '#/games-downloader';
}

function showMiniGamesPage() {
    window.location.hash = '#/minigames';
}

function showDownloaderPage() {
    window.location.hash = '#/downloader';
}

// ============================================================================
// CATALOGS PAGE
// ============================================================================
async function initializeCatalogs() {
    console.log('[Catalogs] initializeCatalogs called');
    const catalogsGrid = document.getElementById('catalogsGrid');
    if (!catalogsGrid) {
        console.error('[Catalogs] catalogsGrid element not found!');
        return;
    }
    
    console.log('[Catalogs] catalogsGrid found, loading...');
    catalogsGrid.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading catalogs...</div>';
    
    try {
        console.log('[Catalogs] Fetching addons from /api/stremio/addons');
        const response = await fetch('/api/stremio/addons');
        const addons = await response.json();
        console.log('[Catalogs] Received addons:', addons);
        
        catalogsGrid.innerHTML = '';
        let found = false;

        addons.forEach(addon => {
            console.log('[Catalogs] Processing addon:', addon.manifest.name, 'catalogs:', addon.manifest.catalogs);
            if (addon.manifest.catalogs && addon.manifest.catalogs.length > 0) {
                const validCatalogs = addon.manifest.catalogs.filter(cat => cat.type === 'movie' || cat.type === 'series');
                console.log('[Catalogs] Valid catalogs for', addon.manifest.name, ':', validCatalogs);
                
                if (validCatalogs.length > 0) {
                    found = true;
                    
                    // Add addon header
                    const header = document.createElement('div');
                    header.style.cssText = 'grid-column: 1 / -1; display: flex; align-items: center; gap: 1rem; margin: 1.5rem 0 1rem;';
                    header.innerHTML = `
                        <div style="height: 1px; background: rgba(255,255,255,0.1); flex: 1;"></div>
                        <span style="color: rgba(255,255,255,0.6); font-weight: bold; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em;">${addon.manifest.name}</span>
                        <div style="height: 1px; background: rgba(255,255,255,0.1); flex: 1;"></div>
                    `;
                    catalogsGrid.appendChild(header);

                    validCatalogs.forEach(cat => {
                        const btn = document.createElement('a');
                        const catName = cat.name || cat.id;
                        
                        btn.href = `#/catalog?addon=${addon.manifest.id}&catalog=${cat.id}&type=${cat.type}&name=${encodeURIComponent(addon.manifest.name + ' - ' + catName)}`;
                        btn.className = 'genre-card';
                        btn.style.cssText = 'display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; padding: 1.5rem; min-height: 100px; text-align: center; cursor: pointer;';
                        
                        btn.innerHTML = `
                            <span style="font-size: 1.1rem; font-weight: 500;">${catName}</span>
                            <span style="font-size: 0.75rem; color: rgba(255,255,255,0.5); text-transform: capitalize; background: rgba(0,0,0,0.3); padding: 0.25rem 0.5rem; border-radius: 9999px;">${cat.type}</span>
                        `;
                        
                        console.log('[Catalogs] Created catalog button:', catName, 'href:', btn.href);
                        catalogsGrid.appendChild(btn);
                    });
                }
            }
        });
        
        if (!found) {
            console.log('[Catalogs] No catalogs found');
            catalogsGrid.innerHTML = '<div class="loading" style="grid-column: 1 / -1;"><i class="fas fa-info-circle"></i> No addon catalogs found. Install addons from Settings.</div>';
        } else {
            console.log('[Catalogs] Successfully loaded catalogs');
        }
    } catch (error) {
        console.error('[Catalogs] Error loading:', error);
        catalogsGrid.innerHTML = '<div class="loading" style="grid-column: 1 / -1; color: #ef4444;"><i class="fas fa-exclamation-triangle"></i> Error loading catalogs</div>';
    }
}

window.initializeCatalogs = initializeCatalogs;

// ============================================================================
// MOVIE LOADING FUNCTIONS
// ============================================================================
async function loadMovies(category = 'all') {
    if (isLoading) return;
    isLoading = true;
    
    const loadingIndicator = document.getElementById('loadingIndicator');
    const moviesGrid = document.getElementById('moviesGrid');
    
    if (loadingIndicator) loadingIndicator.style.display = 'block';
    
    if (currentPage === 1) {
        allMoviesCache = [];
    }
    
    try {
        let url;
        if (category === 'all') {
            url = `https://api.themoviedb.org/3/trending/all/week?api_key=${TMDB_API_KEY}&page=${currentPage}`;
        } else {
            url = `https://api.themoviedb.org/3/trending/${category}/week?api_key=${TMDB_API_KEY}&page=${currentPage}`;
        }
        const response = await fetch(url);
        const data = await response.json();
        displayMovies(data.results, currentPage > 1);
        currentPage++;
    } catch (error) {
        console.error('Error fetching movies:', error);
    }

    isLoading = false;
    if (loadingIndicator) loadingIndicator.style.display = 'none';
}

async function searchMovies(query) {
    if (isLoading) return;
    isLoading = true;
    
    const moviesGrid = document.getElementById('moviesGrid');
    const loadingIndicator = document.getElementById('loadingIndicator');
    
    if (document.body.classList.contains('ui-new')) {
        const slidersContainer = document.getElementById('slidersContainer');
        const heroSection = document.getElementById('heroSection');
        const backBtn = document.getElementById('backToHomeBtn');
        if (slidersContainer) slidersContainer.style.display = 'none';
        if (heroSection) heroSection.style.display = 'none';
        if (backBtn) backBtn.style.display = 'block';
        if (moviesGrid) moviesGrid.style.display = 'grid';
    }
    
    if (moviesGrid) moviesGrid.innerHTML = '';
    if (loadingIndicator) loadingIndicator.style.display = 'block';

    try {
        const response = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&page=1`);
        const data = await response.json();
        
        lastSearchResults = data.results || [];
        lastSearchQuery = query;
        isSearchMode = true;
        
        displayMovies(data.results);
    } catch (error) {
        console.error('Error searching movies:', error);
    }

    isLoading = false;
    if (loadingIndicator) loadingIndicator.style.display = 'none';
}

function displayMovies(movies, append = true) {
    const moviesGrid = document.getElementById('moviesGrid');
    if (!moviesGrid) return;
    
    if (!append) {
        allMoviesCache = [...movies];
    } else {
        allMoviesCache = [...allMoviesCache, ...movies];
    }
    
    let filteredMovies = applySortAndFilter([...movies]);
    const frag = document.createDocumentFragment();
    
    for (const movie of filteredMovies) {
        if (!movie.poster_path) continue;
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.dataset.rating = movie.vote_average || 0;
        card.dataset.date = movie.release_date || movie.first_air_date || '';
        const mediaType = movie.media_type || 'movie';
        const doneBtnHTML = mediaType === 'movie'
            ? `<button class="done-watching-btn" onclick="toggleDoneWatching(event, ${movie.id}, '${mediaType}', '${(movie.title || movie.name || '').replace(/'/g, "\\'")}', '${movie.poster_path}', '${(movie.release_date || movie.first_air_date || '').substring(0, 4)}', ${movie.vote_average || 0})">
                <i class="fas fa-check"></i>
              </button>`
            : '';
        const year = (movie.release_date || movie.first_air_date || '').substring(0, 4);
        const titleSafe = (movie.title || movie.name || '').replace(/'/g, "\\'");
        const posterUrl = `https://image.tmdb.org/t/p/w342${movie.poster_path}`;
        card.innerHTML = `
            <button class="add-to-list-btn" onclick="toggleMyList(event, ${movie.id}, '${mediaType}', '${titleSafe}', '${movie.poster_path}', '${year}', ${movie.vote_average || 0})">
                <i class="fas fa-plus"></i>
            </button>
            ${doneBtnHTML}
            <img loading="lazy" decoding="async" src="${posterUrl}" alt="${titleSafe}" class="movie-poster">
            <div class="movie-info">
                <h3 class="movie-title">${movie.title || movie.name}</h3>
                <p class="movie-year">${year}</p>
            </div>
            <div class="movie-rating">
                <i class="fas fa-star"></i> ${Number(movie.vote_average || 0).toFixed(1)}
            </div>
        `;
        card.addEventListener('click', () => openDetailsModal(movie, movie.media_type || null));
        frag.appendChild(card);
    }
    moviesGrid.appendChild(frag);

    try {
        if (document.body.classList.contains('perf-mode')) {
            const MAX_CARDS = 300;
            while (moviesGrid.children.length > MAX_CARDS) {
                moviesGrid.removeChild(moviesGrid.firstElementChild);
            }
        }
    } catch(_) {}
}

function applySortAndFilter(movies) {
    let filtered = [...movies];
    
    if (currentFilter === 'hd') {
        filtered = filtered.filter(m => (m.vote_average || 0) >= 7);
    } else if (currentFilter === '4k') {
        filtered = filtered.filter(m => (m.vote_average || 0) >= 8);
    }
    
    if (currentSort === 'rating') {
        filtered.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
    } else if (currentSort === 'date') {
        filtered.sort((a, b) => {
            const dateA = new Date(a.release_date || a.first_air_date || 0);
            const dateB = new Date(b.release_date || b.first_air_date || 0);
            return dateB - dateA;
        });
    }
    
    return filtered;
}

function refreshDisplay() {
    const moviesGrid = document.getElementById('moviesGrid');
    if (moviesGrid) moviesGrid.innerHTML = '';
    displayMovies(allMoviesCache, false);
}

// ============================================================================
// DETAILS MODAL
// ============================================================================
async function openDetailsModal(movie, forcedType = null) {
    currentContent = movie;
    
    if (forcedType) {
        currentMediaType = forcedType === 'tv' ? 'tv' : 'movie';
    } else {
        if (movie.media_type) {
            currentMediaType = movie.media_type === 'tv' ? 'tv' : 'movie';
        } else {
            currentMediaType = movie.name && !movie.title ? 'tv' : 'movie';
        }
    }
    
    console.log('[MODAL] Opening modal for:', movie.title || movie.name, 'Type:', currentMediaType);
    
    const detailsModal = document.getElementById('detailsModal');
    const modalBackdrop = document.getElementById('modalBackdrop');
    const modalPoster = document.getElementById('modalPoster');
    const modalTitle = document.getElementById('modalTitle');
    const modalRating = document.getElementById('modalRating');
    const modalYear = document.getElementById('modalYear');
    const modalOverview = document.getElementById('modalOverview');
    const torrentsContainer = document.getElementById('torrentsContainer');
    const torrentsList = document.getElementById('torrentsList');
    
    torrentsLoaded = false;
    if (torrentsContainer) torrentsContainer.style.display = 'none';
    if (torrentsList) torrentsList.innerHTML = '';

    if (modalBackdrop) {
        modalBackdrop.src = (movie.backdrop_path && movie.backdrop_path.startsWith('http')) 
            ? movie.backdrop_path 
            : `https://image.tmdb.org/t/p/w1280${movie.backdrop_path || movie.poster_path || ''}`;
    }
    if (modalPoster) {
        modalPoster.src = (movie.poster_path && movie.poster_path.startsWith('http')) 
            ? movie.poster_path 
            : `https://image.tmdb.org/t/p/w342${movie.poster_path || movie.backdrop_path || ''}`;
    }
    if (modalTitle) modalTitle.textContent = movie.title || movie.name || 'Untitled';
    if (modalRating) modalRating.textContent = Number(movie.vote_average || 0).toFixed(1);
    if (modalYear) modalYear.textContent = (movie.release_date || movie.first_air_date || '').substring(0, 4);
    if (modalOverview) modalOverview.textContent = movie.overview || '';

    if (detailsModal) {
        detailsModal.style.display = 'flex';
        detailsModal.classList.add('active');
        detailsModal.style.opacity = '1';
        detailsModal.style.pointerEvents = 'auto';
    }
}

function closeDetailsModal() {
    const detailsModal = document.getElementById('detailsModal');
    if (detailsModal) {
        detailsModal.style.display = 'none';
        detailsModal.classList.remove('active');
        detailsModal.style.opacity = '0';
        detailsModal.style.pointerEvents = 'none';
    }
    currentContent = null;
    currentMediaType = null;
}

// ============================================================================
// MY LIST / DONE WATCHING
// ============================================================================
function toggleMyList(event, id, mediaType, title, posterPath, year, rating) {
    event.stopPropagation();
    
    const myList = JSON.parse(localStorage.getItem('myList') || '[]');
    const existingIndex = myList.findIndex(item => item.id === id && item.mediaType === mediaType);
    
    if (existingIndex > -1) {
        myList.splice(existingIndex, 1);
        showNotification(`Removed "${title}" from My List`, 'info');
    } else {
        myList.push({ id, mediaType, title, posterPath, year, rating, addedAt: Date.now() });
        showNotification(`Added "${title}" to My List`, 'success');
    }
    
    localStorage.setItem('myList', JSON.stringify(myList));
    
    const btn = event.currentTarget;
    const icon = btn.querySelector('i');
    if (icon) {
        icon.className = existingIndex > -1 ? 'fas fa-plus' : 'fas fa-check';
    }
}

function toggleDoneWatching(event, id, mediaType, title, posterPath, year, rating) {
    event.stopPropagation();
    
    const doneList = JSON.parse(localStorage.getItem('doneWatching') || '[]');
    const existingIndex = doneList.findIndex(item => item.id === id && item.mediaType === mediaType);
    
    if (existingIndex > -1) {
        doneList.splice(existingIndex, 1);
        showNotification(`Removed "${title}" from Done Watching`, 'info');
    } else {
        doneList.push({ id, mediaType, title, posterPath, year, rating, watchedAt: Date.now() });
        showNotification(`Marked "${title}" as Done Watching`, 'success');
    }
    
    localStorage.setItem('doneWatching', JSON.stringify(doneList));
    
    const btn = event.currentTarget;
    const icon = btn.querySelector('i');
    if (icon) {
        icon.className = existingIndex > -1 ? 'fas fa-check' : 'fas fa-check-double';
    }
}

// ============================================================================
// EXPORT FUNCTIONS FOR GLOBAL USE
// ============================================================================
window.showHomePage = showHomePage;
window.showGenresPage = showGenresPage;
window.showCatalogsPage = showCatalogsPage;
window.showCustomMagnetModal = showCustomMagnetModal;
window.showMyListPage = showMyListPage;
window.showDoneWatchingPage = showDoneWatchingPage;
window.showTraktPage = showTraktPage;
window.showLiveTvPage = showLiveTvPage;
window.showIptvPage = showIptvPage;
window.showBooksPage = showBooksPage;
window.showAudioBooksPage = showAudioBooksPage;
window.showBookTorrioPage = showBookTorrioPage;
window.showAnimePage = showAnimePage;
window.showComicsPage = showComicsPage;
window.showMangaPage = showMangaPage;
window.showMusicPage = showMusicPage;
window.showGamesDownloaderPage = showGamesDownloaderPage;
window.showMiniGamesPage = showMiniGamesPage;
window.showDownloaderPage = showDownloaderPage;
window.loadMovies = loadMovies;
window.searchMovies = searchMovies;
window.displayMovies = displayMovies;
window.applySortAndFilter = applySortAndFilter;
window.refreshDisplay = refreshDisplay;
window.openDetailsModal = openDetailsModal;
window.closeDetailsModal = closeDetailsModal;
window.toggleMyList = toggleMyList;
window.toggleDoneWatching = toggleDoneWatching;

console.log('[Main] Main application module loaded and exported');
