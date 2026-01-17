// Main App Initialization
// This file initializes the app and sets up event listeners

document.addEventListener('DOMContentLoaded', async () => {
    console.log('[App] Initializing PlayTorrio...');
    
    // Load settings
    if (typeof loadSettings === 'function') {
        await loadSettings();
    }
    
    // Check Trakt status
    if (typeof checkTraktStatus === 'function') {
        await checkTraktStatus();
    }
    
    // Initialize one-time setup functions
    if (typeof initBooks === 'function') initBooks();
    if (typeof initMusic === 'function') initMusic();
    if (typeof initDownloader === 'function') initDownloader();
    if (typeof initGamesLibrary === 'function') initGamesLibrary();
    if (typeof initIptvSourceSelector === 'function') initIptvSourceSelector();
    if (typeof initServers === 'function') initServers();
    if (typeof initHiFiRanking === 'function') initHiFiRanking();
    
    // Initialize routing
    initializeRouting();
    
    // Set up event listeners (from event-listeners.js)
    if (typeof setupEventListeners === 'function') {
        setupEventListeners();
    }
    
    // Set up infinite scroll for all pages
    setupInfiniteScroll();
    
    console.log('[App] PlayTorrio initialized successfully');
});

// Setup infinite scroll for various pages
function setupInfiniteScroll() {
    const mainElement = document.querySelector('main');
    if (!mainElement) return;
    
    // Debounce function to prevent too many calls
    let scrollTimeout = null;
    let lastLoadTime = 0;
    const MIN_LOAD_INTERVAL = 500; // Minimum time between loads
    
    const checkAndLoadMore = () => {
        const now = Date.now();
        if (now - lastLoadTime < MIN_LOAD_INTERVAL) return;
        
        const hash = window.location.hash || '#/';
        
        // Genre details page infinite scroll
        if (hash.startsWith('#/genre/')) {
            const genreResultsGrid = document.getElementById('genreResultsGrid');
            const genreLoadingIndicator = document.getElementById('genreLoadingIndicator');
            
            if (genreResultsGrid && !window.isLoading) {
                // Check if we need more content - either near bottom OR not enough content to fill screen
                const gridRect = genreResultsGrid.getBoundingClientRect();
                const viewportHeight = window.innerHeight;
                const needsMore = gridRect.bottom < viewportHeight + 500;
                
                if (needsMore && typeof loadGenreItems === 'function') {
                    console.log('[App] Loading more genre items (grid bottom:', gridRect.bottom, 'viewport:', viewportHeight, ')');
                    lastLoadTime = now;
                    loadGenreItems();
                }
            }
        }
        
        // Home page infinite scroll (grid mode)
        if (hash === '#/' || hash === '') {
            const moviesGrid = document.getElementById('moviesGrid');
            if (moviesGrid && moviesGrid.style.display !== 'none' && !window.isLoading) {
                const gridRect = moviesGrid.getBoundingClientRect();
                const viewportHeight = window.innerHeight;
                const needsMore = gridRect.bottom < viewportHeight + 500;
                
                if (needsMore && typeof loadMovies === 'function') {
                    console.log('[App] Loading more movies...');
                    lastLoadTime = now;
                    loadMovies();
                }
            }
        }
    };
    
    const scrollHandler = () => {
        // Clear previous timeout
        if (scrollTimeout) clearTimeout(scrollTimeout);
        
        // Debounce scroll events
        scrollTimeout = setTimeout(checkAndLoadMore, 100);
    };
    
    // Add scroll listeners to both main and window
    mainElement.addEventListener('scroll', scrollHandler);
    window.addEventListener('scroll', scrollHandler);
    
    // Also trigger on resize (in case viewport changes)
    window.addEventListener('resize', scrollHandler);
    
    // Check periodically if we need more content (for large screens where scroll doesn't trigger)
    setInterval(() => {
        const hash = window.location.hash || '#/';
        if (hash.startsWith('#/genre/') || hash === '#/' || hash === '') {
            checkAndLoadMore();
        }
    }, 1000);
    
    console.log('[App] Infinite scroll setup complete');
}

function initializeRouting() {
    
    console.log('[App] Infinite scroll setup complete');
}

function initializeRouting() {
    // Handle hash changes for navigation
    window.addEventListener('hashchange', handleRouteChange);
    
    // Handle initial route
    handleRouteChange();
}

async function handleRouteChange() {
    const hash = window.location.hash || '#/';
    console.log('[App] Route changed to:', hash);
    
    // Hide all pages
    const pages = document.querySelectorAll('[id$="Page"], [id$="-page"]');
    pages.forEach(page => {
        if (page) page.style.display = 'none';
    });
    
    // Handle genre detail pages (e.g., #/genre/Action)
    if (hash.startsWith('#/genre/')) {
        const genreName = decodeURIComponent(hash.substring(8));
        showPage('genreDetailsPage');
        if (typeof openGenreDetails === 'function') await openGenreDetails(genreName);
        return;
    }
    
    // Show the appropriate page based on hash and initialize if needed
    switch (hash) {
        case '#/':
            showPage('homePage');
            if (typeof initializeNewUI === 'function') initializeNewUI();
            break;
        case '#/genres':
            showPage('genresPage');
            if (typeof ensureGenresLoaded === 'function') await ensureGenresLoaded();
            if (typeof renderGenres === 'function') renderGenres();
            break;
        case '#/my-list':
            showPage('myListPage');
            if (typeof displayMyList === 'function') await displayMyList();
            break;
        case '#/done-watching':
            showPage('doneWatchingPage');
            if (typeof displayDoneWatching === 'function') await displayDoneWatching();
            break;
        case '#/trakt':
            showPage('trakt-page');
            if (typeof initializeTraktPage === 'function') initializeTraktPage();
            break;
        case '#/settings':
            showPage('settings-page');
            if (typeof initializeSettingsPage === 'function') initializeSettingsPage();
            if (typeof loadSettings === 'function') loadSettings();
            break;
        case '#/livetv':
            showPage('livetv-page');
            if (typeof initLiveTv === 'function') initLiveTv();
            break;
        case '#/iptv':
            showPage('iptv-page');
            break;
        case '#/books':
            showPage('books-page');
            if (typeof initializeBooks === 'function') initializeBooks();
            break;
        case '#/audiobooks':
            showPage('audiobooks-page');
            if (typeof initializeAudioBooks === 'function') initializeAudioBooks();
            break;
        case '#/booktorrio':
            showPage('booktorrio-page');
            if (typeof initializeBookTorrio === 'function') initializeBookTorrio();
            break;
        case '#/anime':
            showPage('anime-page');
            if (typeof initializeAnime === 'function') initializeAnime();
            break;
        case '#/comics':
            showPage('comics-page');
            if (typeof initializeComics === 'function') initializeComics();
            break;
        case '#/manga':
            showPage('manga-page');
            if (typeof initializeManga === 'function') initializeManga();
            break;
        case '#/music':
            showPage('music-page');
            if (typeof initMusic === 'function') initMusic();
            if (typeof setupMusicPageButtons === 'function') setupMusicPageButtons();
            break;
        case '#/games-downloader':
            showPage('games-downloader-page');
            if (typeof loadGameCategories === 'function') loadGameCategories();
            break;
        case '#/minigames':
            showPage('minigames-page');
            break;
        case '#/downloader':
            showPage('downloader-page');
            if (typeof initDownloader === 'function') initDownloader();
            break;
        default:
            showPage('homePage');
            if (typeof initializeNewUI === 'function') initializeNewUI();
    }
}

function showPage(pageId) {
    const page = document.getElementById(pageId);
    if (page) {
        page.style.display = 'block';
    }
}

// Export functions
window.initializeRouting = initializeRouting;
window.handleRouteChange = handleRouteChange;
window.showPage = showPage;

console.log('[App] Main app module loaded');
