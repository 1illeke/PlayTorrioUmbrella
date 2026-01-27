// Movies Loading and Display Functions
// This file handles loading movies from TMDB and displaying them in the grid

// State variables
let isLoading = false;
let currentPage = 1;
let currentCategory = 'all';
let allMoviesCache = [];
let currentSort = 'popularity';
let currentFilter = 'all';
let lastSearchResults = [];
let lastSearchQuery = '';
let isSearchMode = false;

// Current content being viewed (for modals)
let currentContent = null;
let currentMediaType = null;
let currentSelectedVideoName = '';
let resumeKey = '';

// Torrent/Provider state
let selectedProvider = 'jackett';
let lastSearchedSeason = null;
let lastSearchedEpisode = null;
let currentSeason = null;
let torrentsLoaded = false;
let currentMovie = null;

// Streaming mode state (true = embedded servers, false = torrents)
let useStreamingMode = localStorage.getItem('useStreamingServers') === 'true';
let selectedEmbeddedServer = localStorage.getItem('selectedEmbeddedServer') || 'Videasy';

// ===== EMBEDDED SERVERS (same as basicmode) =====
const embeddedServers = {
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
    'VeloraTV': (type, id, season, episode) =>
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

// ===== MOVIE LOADING FUNCTIONS =====

async function loadMovies(category = 'all') {
    if (isLoading) return;
    isLoading = true;
    
    const loadingIndicator = document.getElementById('loadingIndicator');
    const moviesGrid = document.getElementById('moviesGrid');
    
    if (loadingIndicator) loadingIndicator.style.display = 'block';
    
    // Reset cache if it's the first page
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
        if (typeof showNotification === 'function') {
            showNotification('Failed to load movies', 'error');
        }
    }

    isLoading = false;
    if (loadingIndicator) loadingIndicator.style.display = 'none';
}

// Search for movies and shows
async function searchMovies(query) {
    if (isLoading) return;
    isLoading = true;
    
    const moviesGrid = document.getElementById('moviesGrid');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const slidersContainer = document.getElementById('slidersContainer');
    const heroSection = document.getElementById('heroSection');
    const backBtn = document.getElementById('backToHomeBtn');
    
    // Hide sliders and show grid for search results (new UI)
    if (document.body.classList.contains('ui-new')) {
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
        
        // Store search results and set search mode
        lastSearchResults = data.results || [];
        lastSearchQuery = query;
        isSearchMode = true;
        
        displayMovies(data.results);
    } catch (error) {
        console.error('Error searching movies:', error);
        if (typeof showNotification === 'function') {
            showNotification('Search failed', 'error');
        }
    }

    isLoading = false;
    if (loadingIndicator) loadingIndicator.style.display = 'none';
}

// Display movies in the grid
function displayMovies(movies, append = true) {
    const moviesGrid = document.getElementById('moviesGrid');
    if (!moviesGrid) return;
    
    // Hide loading indicator on home page with sliders
    const loadingIndicator = document.getElementById('loadingIndicator');
    const isHomePage = window.location.hash === '' || window.location.hash === '#/' || window.location.hash === '#/home';
    const slidersContainer = document.getElementById('slidersContainer');
    const hasSliders = slidersContainer && slidersContainer.style.display !== 'none';
    
    if (isHomePage && hasSliders && loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }
    
    // Cache movies for sorting/filtering
    if (!append) {
        allMoviesCache = [...movies];
    } else {
        allMoviesCache = [...allMoviesCache, ...movies];
    }
    
    // Apply current sort and filter
    let filteredMovies = applySortAndFilter([...movies]);
    
    // Build in a fragment to minimize reflows
    const frag = document.createDocumentFragment();
    for (const movie of filteredMovies) {
        if (!movie.poster_path) continue;
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.dataset.rating = movie.vote_average || 0;
        card.dataset.date = movie.release_date || movie.first_air_date || '';
        const mediaType = movie.media_type || 'movie';
        
        const year = (movie.release_date || movie.first_air_date || '').substring(0, 4);
        const titleSafe = (movie.title || movie.name || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const posterUrl = `https://image.tmdb.org/t/p/w342${movie.poster_path}`;
        
        // Only show Done Watching button for movies (not TV shows)
        const doneBtnHTML = mediaType === 'movie'
            ? `<button class="done-watching-btn" data-id="${movie.id}" data-type="${mediaType}" data-title="${titleSafe}" data-poster="${movie.poster_path}" data-year="${year}" data-rating="${movie.vote_average || 0}">
                <i class="fas fa-check"></i>
              </button>`
            : '';
        
        card.innerHTML = `
            <button class="add-to-list-btn" data-id="${movie.id}" data-type="${mediaType}" data-title="${titleSafe}" data-poster="${movie.poster_path}" data-year="${year}" data-rating="${movie.vote_average || 0}">
                <i class="fas fa-plus"></i>
            </button>
            ${doneBtnHTML}
            <img loading="lazy" decoding="async" src="${posterUrl}" alt="${movie.title || movie.name}" class="movie-poster">
            <div class="movie-info">
                <h3 class="movie-title">${movie.title || movie.name}</h3>
                <p class="movie-year">${year}</p>
            </div>
            <div class="movie-rating">
                <i class="fas fa-star"></i> ${Number(movie.vote_average || 0).toFixed(1)}
            </div>
        `;
        
        // Add click handler for add to list button
        const addBtn = card.querySelector('.add-to-list-btn');
        if (addBtn) {
            addBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const btn = e.currentTarget;
                const id = parseInt(btn.dataset.id);
                const type = btn.dataset.type;
                const title = btn.dataset.title.replace(/&quot;/g, '"');
                const poster = btn.dataset.poster;
                const yr = btn.dataset.year;
                const rating = parseFloat(btn.dataset.rating);
                
                await toggleMyList(e, id, type, title, poster, yr, rating);
            });
        }
        
        // Add click handler for done watching button
        const doneBtn = card.querySelector('.done-watching-btn');
        if (doneBtn) {
            doneBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const btn = e.currentTarget;
                const id = parseInt(btn.dataset.id);
                const type = btn.dataset.type;
                const title = btn.dataset.title.replace(/&quot;/g, '"');
                const poster = btn.dataset.poster;
                const yr = btn.dataset.year;
                const rating = parseFloat(btn.dataset.rating);
                
                await toggleDoneWatching(e, id, type, title, poster, yr, rating);
            });
        }
        
        // Add click handler for opening details modal
        card.addEventListener('click', () => openDetailsModal(movie, movie.media_type || null));
        frag.appendChild(card);
    }
    moviesGrid.appendChild(frag);

    // Cap total DOM nodes in perf-mode
    try {
        if (document.body.classList.contains('perf-mode')) {
            const MAX_CARDS = 300;
            while (moviesGrid.children.length > MAX_CARDS) {
                moviesGrid.removeChild(moviesGrid.firstElementChild);
            }
        }
    } catch(_) {}
}

// Apply sort and filter to movies
function applySortAndFilter(movies) {
    let filtered = [...movies];
    
    // Apply filter
    if (currentFilter === 'hd') {
        filtered = filtered.filter(m => (m.vote_average || 0) >= 7);
    } else if (currentFilter === '4k') {
        filtered = filtered.filter(m => (m.vote_average || 0) >= 8);
    }
    
    // Apply sort
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

// Refresh display with current sort/filter
function refreshDisplay() {
    const moviesGrid = document.getElementById('moviesGrid');
    if (moviesGrid) moviesGrid.innerHTML = '';
    displayMovies(allMoviesCache, false);
}

// ===== DETAILS MODAL FUNCTIONS =====

async function openDetailsModal(item, mediaType = null) {
    console.log('[Movies] Opening details modal for:', item.title || item.name, 'addonId:', item._addonId);
    
    const detailsModal = document.getElementById('detailsModal');
    if (!detailsModal) {
        console.error('[Movies] Details modal not found');
        return;
    }
    
    // Check if this is an addon item
    const isAddonItem = !!item._addonId;
    
    // Determine media type
    const type = mediaType || item.media_type || item.type || (item.first_air_date ? 'tv' : 'movie');
    currentMediaType = type;
    currentContent = item;
    currentMovie = item;
    
    // If addon item, try to fetch/use cached metadata
    if (isAddonItem) {
        console.log('[Movies] Addon item detected, checking for cached metadata');
        const cachedMeta = sessionStorage.getItem(`addon_meta_${item._addonId}_${item.id}`);
        if (cachedMeta) {
            try {
                const meta = JSON.parse(cachedMeta);
                console.log('[Movies] Using cached addon metadata:', meta);
                // Merge cached metadata with item
                item = {
                    ...item,
                    title: meta.name || item.title,
                    name: meta.name || item.name,
                    overview: meta.description || item.overview,
                    poster_path: meta.poster || item.poster_path,
                    backdrop_path: meta.background || item.backdrop_path,
                    vote_average: meta.imdbRating || item.vote_average,
                    release_date: meta.releaseInfo || item.release_date,
                    first_air_date: meta.releaseInfo || item.first_air_date,
                    genres: meta.genre || item.genres,
                    _stremioMeta: meta
                };
                currentContent = item;
                currentMovie = item;
            } catch (e) {
                console.error('[Movies] Error parsing cached metadata:', e);
            }
        }
    }
    
    // Reset torrent state
    torrentsLoaded = false;
    lastSearchedSeason = null;
    lastSearchedEpisode = null;
    currentSeason = null;
    
    // Hide torrents container initially
    const torrentsContainer = document.getElementById('torrentsContainer');
    if (torrentsContainer) {
        torrentsContainer.style.display = 'none';
    }
    const torrentsList = document.getElementById('torrentsList');
    if (torrentsList) {
        torrentsList.innerHTML = '';
    }
    
    // Reset provider selection
    selectedProvider = 'jackett';
    window.selectedProvider = selectedProvider;
    document.querySelectorAll('.provider-btn').forEach(btn => {
        if (btn.dataset.provider === 'jackett') {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Populate addon buttons from installed Stremio addons
    if (typeof populateAddonButtons === 'function') {
        populateAddonButtons();
    }
    
    // Show modal - need both display and active class for pointer-events
    detailsModal.style.display = 'flex';
    detailsModal.classList.add('active');
    detailsModal.style.opacity = '1';
    detailsModal.style.pointerEvents = 'auto';
    document.body.style.overflow = 'hidden';
    
    // Update modal content
    const modalBackdrop = document.getElementById('modalBackdrop');
    const modalPoster = document.getElementById('modalPoster');
    const modalTitle = document.getElementById('modalTitle');
    const modalRating = document.getElementById('modalRating');
    const modalYear = document.getElementById('modalYear');
    const modalRuntime = document.getElementById('modalRuntime');
    const modalTagline = document.getElementById('modalTagline');
    const modalOverview = document.getElementById('modalOverview');
    const seasonsContainer = document.getElementById('seasonsContainer');
    
    // Set basic info
    if (modalBackdrop) {
        const backdropPath = item.backdrop_path || item.poster_path;
        modalBackdrop.src = backdropPath ? 
            (backdropPath.startsWith('http') ? backdropPath : `https://image.tmdb.org/t/p/w1280${backdropPath}`) : '';
    }
    if (modalPoster) {
        const posterPath = item.poster_path || item.backdrop_path;
        modalPoster.src = posterPath ? 
            (posterPath.startsWith('http') ? posterPath : `https://image.tmdb.org/t/p/w500${posterPath}`) : '';
    }
    if (modalTitle) {
        modalTitle.textContent = item.title || item.name || 'Unknown';
    }
    if (modalRating) {
        modalRating.textContent = Number(item.vote_average || 0).toFixed(1);
    }
    if (modalYear) {
        modalYear.textContent = (item.release_date || item.first_air_date || '').substring(0, 4);
    }
    if (modalOverview) {
        modalOverview.textContent = item.overview || 'No overview available.';
    }
    if (modalRuntime) {
        modalRuntime.textContent = '';
    }
    if (modalTagline) {
        modalTagline.textContent = '';
    }
    
    // Hide seasons container initially (will show for TV)
    if (seasonsContainer) {
        seasonsContainer.style.display = 'none';
    }
    
    // Fetch full details (skip for addon items as we already have metadata)
    if (!isAddonItem) {
        try {
            const details = await fetchTmdbDetailsById(type, item.id);
            if (details) {
                currentContent = { ...item, ...details };
                currentMovie = currentContent;
                
                if (modalRuntime) {
                    if (type === 'movie' && details.runtime) {
                        modalRuntime.textContent = `${details.runtime} min`;
                    } else if (type === 'tv' && details.episode_run_time && details.episode_run_time.length > 0) {
                        modalRuntime.textContent = `${details.episode_run_time[0]} min/ep`;
                    }
                }
                if (modalTagline && details.tagline) {
                    modalTagline.textContent = details.tagline;
                }
                
                // Load cast
                if (details.credits && details.credits.cast) {
                    displayCast(details.credits.cast.slice(0, 10));
                }
                
                // Load similar content
                loadSimilarContent(type, item.id);
                
                // Show seasons for TV shows
                if (type === 'tv' && details.seasons) {
                    displaySeasons(details.seasons, item.id);
                }
            }
        } catch (error) {
            console.error('[Movies] Error fetching TMDB details:', error);
        }
    } else {
        console.log('[Movies] Skipping TMDB fetch for addon item');
        // For addon items, we don't have cast/similar/seasons from TMDB
        // Just use what we have from the cached metadata
    }
    
    // Update button texts based on streaming mode
    updateStreamingModeButtons();
    
    // Update done watching button state
    await loadDoneWatching();
    const modalDoneWatchingBtn = document.getElementById('modalDoneWatchingBtn');
    if (modalDoneWatchingBtn) {
        const isDone = doneWatchingCache.some(i => 
            i.id === item.id && (i.mediaType === type || i.media_type === type)
        );
        modalDoneWatchingBtn.classList.toggle('is-done', isDone);
        modalDoneWatchingBtn.style.background = isDone ? '#22c55e' : '';
        modalDoneWatchingBtn.title = isDone ? 'Remove from Done Watching' : 'Mark as Done Watching';
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
    
    // Restore body scroll
    document.body.style.overflow = 'auto';
    
    // Reset provider selection to default
    selectedProvider = 'jackett';
    window.selectedProvider = selectedProvider;
    document.querySelectorAll('.provider-btn').forEach(btn => {
        if (btn.dataset.provider === 'jackett') {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Reset tracked search parameters
    lastSearchedSeason = null;
    lastSearchedEpisode = null;
    
    // Hide torrents container
    const torrentsContainer = document.getElementById('torrentsContainer');
    if (torrentsContainer) {
        torrentsContainer.style.display = 'none';
    }
    
    currentContent = null;
    currentMediaType = null;
    currentMovie = null;
}

function displayCast(cast) {
    const castGrid = document.getElementById('castGrid');
    if (!castGrid) return;
    
    castGrid.innerHTML = '';
    
    for (const person of cast) {
        const castCard = document.createElement('div');
        castCard.className = 'cast-card';
        castCard.innerHTML = `
            <img src="${person.profile_path ? `https://image.tmdb.org/t/p/w185${person.profile_path}` : 'https://via.placeholder.com/185x278?text=No+Image'}" 
                 alt="${person.name}" class="cast-photo">
            <div class="cast-name">${person.name}</div>
            <div class="cast-character">${person.character || ''}</div>
        `;
        castGrid.appendChild(castCard);
    }
}

async function loadSimilarContent(type, id) {
    const similarGrid = document.getElementById('similarGrid');
    if (!similarGrid) return;
    
    similarGrid.innerHTML = '';
    
    try {
        const response = await fetch(`https://api.themoviedb.org/3/${type}/${id}/similar?api_key=${TMDB_API_KEY}`);
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            for (const item of data.results.slice(0, 5)) {
                if (!item.poster_path) continue;
                
                const card = document.createElement('div');
                card.className = 'movie-card';
                card.innerHTML = `
                    <img src="https://image.tmdb.org/t/p/w300${item.poster_path}" alt="${item.title || item.name}" class="movie-poster" style="height: 225px;">
                    <div class="movie-info">
                        <h3 class="movie-title">${item.title || item.name}</h3>
                    </div>
                `;
                card.addEventListener('click', () => openDetailsModal(item, type));
                similarGrid.appendChild(card);
            }
        }
    } catch (error) {
        console.error('[Movies] Error loading similar content:', error);
    }
}

function displaySeasons(seasons, showId) {
    const seasonsContainer = document.getElementById('seasonsContainer');
    const seasonSelector = document.getElementById('seasonSelector');
    
    if (!seasonsContainer || !seasonSelector) return;
    
    // Filter out specials (season 0) unless it's the only season
    const filteredSeasons = seasons.filter(s => s.season_number > 0);
    const displaySeasons = filteredSeasons.length > 0 ? filteredSeasons : seasons;
    
    if (displaySeasons.length === 0) {
        seasonsContainer.style.display = 'none';
        return;
    }
    
    seasonsContainer.style.display = 'block';
    seasonSelector.innerHTML = '';
    
    for (const season of displaySeasons) {
        const btn = document.createElement('button');
        btn.className = 'season-btn';
        btn.textContent = season.name || `Season ${season.season_number}`;
        btn.dataset.seasonNumber = season.season_number;
        
        // Mark first season as active
        if (season.season_number === (displaySeasons[0]?.season_number || 1)) {
            btn.classList.add('active');
            currentSeason = season.season_number;
        }
        
        btn.addEventListener('click', () => {
            currentSeason = season.season_number;
            document.querySelectorAll('.season-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadEpisodes(showId, currentSeason);
            
            // Show torrents container and fetch torrents for the season
            const torrentsContainer = document.getElementById('torrentsContainer');
            if (torrentsContainer) torrentsContainer.style.display = 'block';
            fetchTorrents(currentSeason);
        });
        
        seasonSelector.appendChild(btn);
    }
    
    // Load first season episodes
    if (displaySeasons.length > 0) {
        loadEpisodes(showId, displaySeasons[0].season_number);
    }
}

async function loadEpisodes(showId, seasonNumber) {
    const episodesGrid = document.getElementById('episodesGrid');
    if (!episodesGrid) return;
    
    episodesGrid.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading episodes...</div>';
    
    // Load done episodes from localStorage (cross-platform)
    let doneEpisodes = {};
    try {
        const stored = localStorage.getItem('doneWatchingEpisodes');
        if (stored) {
            doneEpisodes = JSON.parse(stored);
        }
    } catch (e) {
        console.error('[Movies] Error loading done episodes:', e);
        doneEpisodes = {};
    }
    
    try {
        const response = await fetch(`https://api.themoviedb.org/3/tv/${showId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}`);
        const data = await response.json();
        
        episodesGrid.innerHTML = '';
        
        if (data.episodes && data.episodes.length > 0) {
            for (const episode of data.episodes) {
                const episodeCard = document.createElement('div');
                episodeCard.className = 'episode-card';
                
                // Check if this episode is marked as done watching
                const episodeKey = `${showId}-${seasonNumber}-${episode.episode_number}`;
                const isDone = !!doneEpisodes[episodeKey];
                
                console.log(`[Movies] Episode ${episodeKey} isDone:`, isDone);
                
                episodeCard.innerHTML = `
                    <div class="episode-img-container" style="position: relative;">
                        <img src="${episode.still_path ? `https://image.tmdb.org/t/p/w300${episode.still_path}` : 'https://via.placeholder.com/300x169?text=No+Image'}" 
                             alt="${episode.name}" class="episode-img">
                        <button class="episode-done-btn ${isDone ? 'is-done' : ''}" 
                                data-show-id="${showId}" 
                                data-season="${seasonNumber}" 
                                data-episode="${episode.episode_number}"
                                data-episode-name="${(episode.name || '').replace(/"/g, '&quot;')}"
                                title="${isDone ? 'Remove from Done Watching' : 'Mark as Done Watching'}"
                                style="position: absolute; top: 5px; right: 5px; width: 28px; height: 28px; border-radius: 50%; border: none; background: ${isDone ? '#22c55e' : 'rgba(0,0,0,0.7)'}; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; z-index: 5;">
                            <i class="fas fa-check" style="font-size: 12px;"></i>
                        </button>
                    </div>
                    <div class="episode-info">
                        <h4 class="episode-title">E${episode.episode_number}: ${episode.name || `Episode ${episode.episode_number}`}</h4>
                        <p class="episode-date">${episode.air_date || ''}</p>
                    </div>
                `;
                
                // Add click handler for done watching button
                const doneBtn = episodeCard.querySelector('.episode-done-btn');
                doneBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    await toggleEpisodeDoneWatching(e, showId, seasonNumber, episode.episode_number, episode.name || `Episode ${episode.episode_number}`);
                });
                
                // Add click handler for episode selection (on the card, not the button)
                episodeCard.addEventListener('click', (e) => {
                    // Don't trigger if clicking the done button
                    if (e.target.closest('.episode-done-btn')) return;
                    
                    console.log('[Movies] Episode clicked! Season:', seasonNumber, 'Episode:', episode.episode_number);
                    
                    // Remove selected class from all episodes
                    document.querySelectorAll('.episode-card').forEach(c => c.classList.remove('selected'));
                    episodeCard.classList.add('selected');
                    
                    // Show torrents for this episode
                    showTorrents(e, seasonNumber, episode.episode_number);
                });
                
                episodesGrid.appendChild(episodeCard);
            }
        } else {
            episodesGrid.innerHTML = '<div class="empty-message">No episodes found.</div>';
        }
    } catch (error) {
        console.error('[Movies] Error loading episodes:', error);
        episodesGrid.innerHTML = '<div class="error-message">Failed to load episodes.</div>';
    }
}

// Toggle episode done watching status
async function toggleEpisodeDoneWatching(event, showId, seasonNumber, episodeNumber, episodeName) {
    event.stopPropagation();
    
    // Simple key format: showId-season-episode
    const episodeKey = `${showId}-${seasonNumber}-${episodeNumber}`;
    
    // Load from localStorage (cross-platform, always works)
    let doneEpisodes = {};
    try {
        const stored = localStorage.getItem('doneWatchingEpisodes');
        if (stored) {
            doneEpisodes = JSON.parse(stored);
        }
    } catch (e) {
        console.error('[Movies] Error loading done episodes:', e);
        doneEpisodes = {};
    }
    
    const btn = event.currentTarget;
    let isDone;
    
    if (doneEpisodes[episodeKey]) {
        // Remove from list
        delete doneEpisodes[episodeKey];
        isDone = false;
        if (typeof showNotification === 'function') {
            showNotification(`Removed S${seasonNumber}E${episodeNumber} from Done Watching`, 'info');
        }
    } else {
        // Add to list - store TMDB ID and episode info
        doneEpisodes[episodeKey] = {
            showId: showId,
            season: seasonNumber,
            episode: episodeNumber,
            episodeName: episodeName,
            watchedAt: Date.now()
        };
        isDone = true;
        if (typeof showNotification === 'function') {
            showNotification(`Marked S${seasonNumber}E${episodeNumber} as Done Watching`, 'success');
        }
    }
    
    // Save to localStorage
    localStorage.setItem('doneWatchingEpisodes', JSON.stringify(doneEpisodes));
    
    // Also try to save to Electron storage if available
    if (window.electronAPI && window.electronAPI.doneWatchingWrite) {
        try {
            // Convert to array format for compatibility
            const episodeArray = Object.values(doneEpisodes);
            await window.electronAPI.doneWatchingWrite(episodeArray);
        } catch (e) {
            console.error('[Movies] Error saving to Electron:', e);
        }
    }
    
    // Update button appearance immediately
    btn.classList.toggle('is-done', isDone);
    btn.style.background = isDone ? '#22c55e' : 'rgba(0,0,0,0.7)';
    btn.title = isDone ? 'Remove from Done Watching' : 'Mark as Done Watching';
    
    console.log('[Movies] Episode toggled:', { episodeKey, isDone });
}

// ===== MY LIST FUNCTIONS =====

async function toggleMyList(event, id, mediaType, title, posterPath, year, rating) {
    event.stopPropagation();
    
    // Load current list from cache/storage
    await loadMyList();
    
    const existingIndex = myListCache.findIndex(item => 
        item.id === id && (item.mediaType === mediaType || item.media_type === mediaType)
    );
    
    if (existingIndex > -1) {
        // Remove from list
        myListCache.splice(existingIndex, 1);
        if (typeof showNotification === 'function') {
            showNotification(`Removed "${title}" from My List`, 'info');
        }
    } else {
        // Add to list
        myListCache.push({
            id,
            mediaType,
            media_type: mediaType,
            title,
            posterPath,
            poster_path: posterPath,
            year,
            rating,
            vote_average: rating,
            addedAt: Date.now()
        });
        if (typeof showNotification === 'function') {
            showNotification(`Added "${title}" to My List`, 'success');
        }
    }
    
    // Save to Electron storage
    await saveMyList();
    
    // Also save to localStorage as backup
    localStorage.setItem('myList', JSON.stringify(myListCache));
    
    // Update button appearance
    const btn = event.currentTarget;
    const icon = btn.querySelector('i');
    const wasInList = existingIndex > -1; // Was it in the list before toggle?
    const isNowInList = !wasInList; // Is it in the list now?
    
    if (icon) {
        icon.className = isNowInList ? 'fas fa-check' : 'fas fa-plus';
    }
    btn.classList.toggle('in-list', isNowInList);
    
    // Update button title
    btn.title = isNowInList ? 'Remove from My List' : 'Add to My List';
}

async function toggleDoneWatching(event, id, mediaType, title, posterPath, year, rating) {
    event.stopPropagation();
    
    // Load current list from cache/storage
    await loadDoneWatching();
    
    const existingIndex = doneWatchingCache.findIndex(item => 
        item.id === id && (item.mediaType === mediaType || item.media_type === mediaType)
    );
    
    if (existingIndex > -1) {
        // Remove from list
        doneWatchingCache.splice(existingIndex, 1);
        if (typeof showNotification === 'function') {
            showNotification(`Removed "${title}" from Done Watching`, 'info');
        }
    } else {
        // Add to list
        doneWatchingCache.push({
            id,
            mediaType,
            media_type: mediaType,
            title,
            posterPath,
            poster_path: posterPath,
            year,
            rating,
            vote_average: rating,
            watchedAt: Date.now(),
            completed_date: new Date().toISOString()
        });
        if (typeof showNotification === 'function') {
            showNotification(`Marked "${title}" as Done Watching`, 'success');
        }
    }
    
    // Save to Electron storage
    await saveDoneWatching();
    
    // Also save to localStorage as backup
    localStorage.setItem('doneWatching', JSON.stringify(doneWatchingCache));
    
    // Update button appearance
    const btn = event.currentTarget;
    const icon = btn.querySelector('i');
    const wasInList = existingIndex > -1; // Was it in the list before toggle?
    const isNowDone = !wasInList; // Is it marked as done now?
    
    if (icon) {
        icon.className = isNowDone ? 'fas fa-check-double' : 'fas fa-check';
    }
    btn.classList.toggle('is-done', isNowDone);
    
    // Update button title
    btn.title = isNowDone ? 'Remove from Done Watching' : 'Mark as Done Watching';
}

// ===== NEW UI FUNCTIONS =====

async function initializeNewUI() {
    if (!document.body.classList.contains('ui-new')) return;
    
    console.log('[Movies] Initializing New UI...');
    
    const heroSection = document.getElementById('heroSection');
    const slidersContainer = document.getElementById('slidersContainer');
    const moviesGrid = document.getElementById('moviesGrid');
    
    // Try to load hero and sliders
    try {
        if (heroSection) heroSection.style.display = 'block';
        if (slidersContainer) slidersContainer.style.display = 'block';
        if (moviesGrid) moviesGrid.style.display = 'none';
        
        // Load data for hero and sliders
        await Promise.all([
            loadHeroContent(),
            loadSliders()
        ]);
        
        // Setup slider navigation
        setupSliderNavigation();
        
        console.log('[Movies] New UI initialized with hero and sliders');
    } catch (error) {
        console.error('[Movies] Error initializing new UI, falling back to grid:', error);
        // Fallback to grid view
        if (heroSection) heroSection.style.display = 'none';
        if (slidersContainer) slidersContainer.style.display = 'none';
        if (moviesGrid) moviesGrid.style.display = 'grid';
        await loadMovies(currentCategory);
    }
}

async function loadHeroContent() {
    try {
        const response = await fetch(`https://api.themoviedb.org/3/trending/all/day?api_key=${TMDB_API_KEY}`);
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            const heroItem = data.results[Math.floor(Math.random() * Math.min(5, data.results.length))];
            displayHero(heroItem);
        }
    } catch (error) {
        console.error('Error loading hero content:', error);
    }
}

function displayHero(item) {
    const heroBackdrop = document.getElementById('heroBackdrop');
    const heroTitle = document.getElementById('heroTitle');
    const heroOverview = document.getElementById('heroOverview');
    const heroYear = document.getElementById('heroYear');
    const heroRatingValue = document.getElementById('heroRatingValue');
    const heroPlayBtn = document.getElementById('heroPlayBtn');
    const heroInfoBtn = document.getElementById('heroInfoBtn');
    
    if (item.backdrop_path && heroBackdrop) {
        heroBackdrop.src = `https://image.tmdb.org/t/p/w1280${item.backdrop_path}`;
    }
    if (heroTitle) {
        heroTitle.textContent = item.title || item.name || '';
    }
    if (heroOverview) {
        heroOverview.textContent = item.overview || '';
    }
    if (heroYear) {
        heroYear.textContent = (item.release_date || item.first_air_date || '').substring(0, 4);
    }
    if (heroRatingValue) {
        heroRatingValue.textContent = Number(item.vote_average || 0).toFixed(1);
    }
    
    // Set up hero buttons
    if (heroPlayBtn) {
        heroPlayBtn.onclick = () => openDetailsModal(item, item.media_type);
    }
    if (heroInfoBtn) {
        heroInfoBtn.onclick = () => openDetailsModal(item, item.media_type);
    }
}

async function loadSliders() {
    const slidersContainer = document.getElementById('slidersContainer');
    if (!slidersContainer) return;
    
    // Define slider categories
    const sliderConfigs = [
        { title: 'Trending Movies', endpoint: 'trending/movie/week' },
        { title: 'Trending TV Shows', endpoint: 'trending/tv/week' },
        { title: 'Popular Movies', endpoint: 'movie/popular' },
        { title: 'Top Rated', endpoint: 'movie/top_rated' }
    ];
    
    slidersContainer.innerHTML = '';
    
    for (const config of sliderConfigs) {
        try {
            const response = await fetch(`https://api.themoviedb.org/3/${config.endpoint}?api_key=${TMDB_API_KEY}`);
            const data = await response.json();
            
            if (data.results && data.results.length > 0) {
                const slider = createSlider(config.title, data.results);
                slidersContainer.appendChild(slider);
            }
        } catch (error) {
            console.error(`Error loading ${config.title}:`, error);
        }
    }
}

function createSlider(title, items) {
    const sliderSection = document.createElement('div');
    sliderSection.className = 'slider-section';
    
    sliderSection.innerHTML = `
        <div class="slider-header">
            <h2 class="slider-title">${title}</h2>
            <div class="slider-nav">
                <button class="slider-arrow slider-arrow-left"><i class="fas fa-chevron-left"></i></button>
                <button class="slider-arrow slider-arrow-right"><i class="fas fa-chevron-right"></i></button>
            </div>
        </div>
        <div class="slider-container">
            <div class="slider-track"></div>
        </div>
    `;
    
    const track = sliderSection.querySelector('.slider-track');
    
    for (const item of items) {
        if (!item.poster_path) continue;
        
        const year = (item.release_date || item.first_air_date || '').substring(0, 4);
        const rating = Number(item.vote_average || 0).toFixed(1);
        const mediaType = item.media_type || (item.first_air_date ? 'tv' : 'movie');
        const titleSafe = (item.title || item.name || '').replace(/'/g, "\\'");
        
        // Only show Done Watching button for movies (not TV shows)
        const doneBtnHTML = mediaType === 'movie'
            ? `<button class="done-watching-btn" data-id="${item.id}" data-type="${mediaType}" data-title="${titleSafe}" data-poster="${item.poster_path}" data-year="${year}" data-rating="${item.vote_average || 0}" title="Done Watching">
                <i class="fas fa-check"></i>
              </button>`
            : '';
        
        const card = document.createElement('div');
        card.className = 'slider-item';
        card.innerHTML = `
            <button class="add-to-list-btn" data-id="${item.id}" data-type="${mediaType}" data-title="${titleSafe}" data-poster="${item.poster_path}" data-year="${year}" data-rating="${item.vote_average || 0}" title="Add to My List">
                <i class="fas fa-plus"></i>
            </button>
            ${doneBtnHTML}
            <img src="https://image.tmdb.org/t/p/w342${item.poster_path}" alt="${item.title || item.name}" class="slider-poster">
            <div class="slider-info">
                <div class="slider-item-title">${item.title || item.name}</div>
                <div class="slider-item-meta">
                    <span class="slider-rating"><i class="fas fa-star"></i> ${rating}</span>
                    <span class="slider-year">${year}</span>
                </div>
            </div>
        `;
        
        // Add click handler for add to list button
        const addBtn = card.querySelector('.add-to-list-btn');
        if (addBtn) {
            addBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const btn = e.currentTarget;
                const id = parseInt(btn.dataset.id);
                const type = btn.dataset.type;
                const title = btn.dataset.title;
                const poster = btn.dataset.poster;
                const year = btn.dataset.year;
                const rating = parseFloat(btn.dataset.rating);
                
                await toggleMyList(e, id, type, title, poster, year, rating);
            });
        }
        
        // Add click handler for done watching button
        const doneBtn = card.querySelector('.done-watching-btn');
        if (doneBtn) {
            doneBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const btn = e.currentTarget;
                const id = parseInt(btn.dataset.id);
                const type = btn.dataset.type;
                const title = btn.dataset.title;
                const poster = btn.dataset.poster;
                const year = btn.dataset.year;
                const rating = parseFloat(btn.dataset.rating);
                
                await toggleDoneWatching(e, id, type, title, poster, year, rating);
            });
        }
        
        card.addEventListener('click', () => openDetailsModal(item, item.media_type));
        track.appendChild(card);
    }
    
    return sliderSection;
}

function setupSliderNavigation() {
    document.querySelectorAll('.slider-section').forEach(section => {
        const container = section.querySelector('.slider-container');
        const prevBtn = section.querySelector('.slider-arrow-left');
        const nextBtn = section.querySelector('.slider-arrow-right');
        
        if (prevBtn && container) {
            prevBtn.addEventListener('click', () => {
                container.scrollBy({ left: -400, behavior: 'smooth' });
            });
        }
        
        if (nextBtn && container) {
            nextBtn.addEventListener('click', () => {
                container.scrollBy({ left: 400, behavior: 'smooth' });
            });
        }
        
        // Update arrow states based on scroll position
        if (container) {
            container.addEventListener('scroll', () => {
                updateArrowStates(container);
            });
            // Initial state
            updateArrowStates(container);
        }
    });
}

function updateArrowStates(container) {
    const section = container.closest('.slider-section');
    if (!section) return;
    
    const leftArrow = section.querySelector('.slider-arrow-left');
    const rightArrow = section.querySelector('.slider-arrow-right');
    
    const scrollLeft = container.scrollLeft;
    const maxScroll = container.scrollWidth - container.clientWidth;
    
    if (leftArrow) {
        if (scrollLeft <= 0) {
            leftArrow.classList.add('disabled');
        } else {
            leftArrow.classList.remove('disabled');
        }
    }
    
    if (rightArrow) {
        if (scrollLeft >= maxScroll - 10) {
            rightArrow.classList.add('disabled');
        } else {
            rightArrow.classList.remove('disabled');
        }
    }
}

// ===== INITIALIZATION =====

// Initialize movies on page load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[Movies] Initializing movies module...');
    
    // Set up modal close button
    const modalClose = document.getElementById('modalClose');
    if (modalClose) {
        modalClose.addEventListener('click', closeDetailsModal);
    }
    
    // Set up modal done watching button
    const modalDoneWatchingBtn = document.getElementById('modalDoneWatchingBtn');
    if (modalDoneWatchingBtn) {
        modalDoneWatchingBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (!currentContent) return;
            
            const mediaType = currentMediaType || 'movie';
            const id = currentContent.id;
            const title = currentContent.title || currentContent.name || 'Unknown';
            const posterPath = currentContent.poster_path || '';
            const year = (currentContent.release_date || currentContent.first_air_date || '').substring(0, 4);
            const rating = currentContent.vote_average || 0;
            
            // For movies, toggle the whole movie
            // For TV shows, this marks the show itself (user can mark individual episodes separately)
            await toggleDoneWatching(e, id, mediaType, title, posterPath, year, rating);
            
            // Update button appearance
            await loadDoneWatching();
            const isDone = doneWatchingCache.some(item => 
                item.id === id && (item.mediaType === mediaType || item.media_type === mediaType)
            );
            modalDoneWatchingBtn.classList.toggle('is-done', isDone);
            modalDoneWatchingBtn.style.background = isDone ? '#22c55e' : '';
            modalDoneWatchingBtn.title = isDone ? 'Remove from Done Watching' : 'Mark as Done Watching';
        });
    }
    
    // Close modal when clicking outside
    const detailsModal = document.getElementById('detailsModal');
    if (detailsModal) {
        detailsModal.addEventListener('click', (e) => {
            if (e.target === detailsModal) {
                closeDetailsModal();
            }
        });
    }
    
    // Set up search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = searchInput.value.trim();
                if (query) {
                    searchMovies(query);
                }
            }
        });
        
        // Also handle input event for real-time search (debounced)
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();
            if (query.length >= 3) {
                searchTimeout = setTimeout(() => {
                    searchMovies(query);
                }, 500);
            }
        });
    }
    
    // Set up back to home button
    const backToHomeBtn = document.getElementById('backToHomeBtn');
    if (backToHomeBtn) {
        backToHomeBtn.addEventListener('click', () => {
            isSearchMode = false;
            lastSearchQuery = '';
            lastSearchResults = [];
            
            const searchInput = document.getElementById('searchInput');
            if (searchInput) searchInput.value = '';
            
            // Show sliders and hero, hide grid
            const slidersContainer = document.getElementById('slidersContainer');
            const heroSection = document.getElementById('heroSection');
            const moviesGrid = document.getElementById('moviesGrid');
            
            if (slidersContainer) slidersContainer.style.display = 'block';
            if (heroSection) heroSection.style.display = 'block';
            if (moviesGrid) moviesGrid.style.display = 'none';
            if (backToHomeBtn) backToHomeBtn.style.display = 'none';
        });
    }
    
    // Initialize based on UI mode
    if (document.body.classList.contains('ui-new')) {
        await initializeNewUI();
    } else {
        // Old UI - load movies directly
        await loadMovies(currentCategory);
    }
    
    // Set up infinite scroll
    window.addEventListener('scroll', () => {
        if (isLoading || isSearchMode) return;
        
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight;
        const clientHeight = document.documentElement.clientHeight;
        
        if (scrollTop + clientHeight >= scrollHeight - 500) {
            loadMovies(currentCategory);
        }
    });
    
    console.log('[Movies] Movies module initialized');
});

// ===== GENRES PAGE FUNCTIONS =====

// State variables for genres
let genresMap = new Map();
let genresLoaded = false;
let currentGenre = null;
let currentGenreType = 'movie';
let genreCurrentPage = 1;

async function ensureGenresLoaded() {
    if (genresLoaded) return;
    try {
        const genresLoading = document.getElementById('genresLoading');
        if (genresLoading) genresLoading.style.display = 'block';
        
        // Fetch movie and tv genres
        const [movieRes, tvRes] = await Promise.all([
            fetch(`https://api.themoviedb.org/3/genre/movie/list?api_key=${TMDB_API_KEY}`),
            fetch(`https://api.themoviedb.org/3/genre/tv/list?api_key=${TMDB_API_KEY}`)
        ]);
        const [movieData, tvData] = await Promise.all([movieRes.json(), tvRes.json()]);
        const map = new Map();
        (movieData.genres || []).forEach(g => {
            const key = g.name.toLowerCase();
            map.set(key, { name: g.name, movieId: g.id, tvId: null });
        });
        (tvData.genres || []).forEach(g => {
            const key = g.name.toLowerCase();
            if (map.has(key)) {
                map.get(key).tvId = g.id;
            } else {
                map.set(key, { name: g.name, movieId: null, tvId: g.id });
            }
        });
        genresMap = map;
        genresLoaded = true;
        
        if (genresLoading) genresLoading.style.display = 'none';
    } catch (e) {
        console.error('[Movies] Error loading genres:', e);
        const genresLoading = document.getElementById('genresLoading');
        if (genresLoading) genresLoading.style.display = 'none';
    }
}

function renderGenres() {
    const genresGrid = document.getElementById('genresGrid');
    if (!genresGrid) return;
    
    genresGrid.innerHTML = '';
    const entries = Array.from(genresMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    entries.forEach(g => {
        const card = document.createElement('div');
        card.className = 'genre-card';
        card.innerHTML = `
            <div class="genre-info">
                <div class="genre-title">${g.name}</div>
                <div class="genre-availability">
                    ${g.movieId ? '<span class="genre-chip"><i class="fas fa-film"></i> Movie</span>' : ''}
                    ${g.tvId ? '<span class="genre-chip"><i class="fas fa-tv"></i> TV</span>' : ''}
                </div>
            </div>
        `;
        card.addEventListener('click', () => {
            window.location.hash = `#/genre/${encodeURIComponent(g.name)}`;
        });
        genresGrid.appendChild(card);
    });
}

function setGenreToggleActive() {
    const toggleMoviesBtn = document.getElementById('toggleMovies');
    const toggleTVBtn = document.getElementById('toggleTV');
    if (toggleMoviesBtn) toggleMoviesBtn.classList.toggle('active', currentGenreType === 'movie');
    if (toggleTVBtn) toggleTVBtn.classList.toggle('active', currentGenreType === 'tv');
}

async function openGenreDetails(genreName) {
    const genreTitleEl = document.getElementById('genreTitleEl');
    const genreResultsGrid = document.getElementById('genreResultsGrid');
    const genreEmptyMessage = document.getElementById('genreEmptyMessage');
    
    const key = genreName.toLowerCase();
    currentGenre = genresMap.get(key);
    if (!currentGenre) {
        // If genre map not found (edge case), reload genres and try again
        await ensureGenresLoaded();
        currentGenre = genresMap.get(key);
    }
    if (!currentGenre) {
        if (genreTitleEl) genreTitleEl.textContent = genreName;
        if (genreResultsGrid) genreResultsGrid.innerHTML = '';
        if (genreEmptyMessage) genreEmptyMessage.style.display = 'block';
        return;
    }

    if (genreTitleEl) genreTitleEl.textContent = currentGenre.name;

    // Default type preference: movie if available, else tv
    currentGenreType = currentGenre.movieId ? 'movie' : 'tv';
    setGenreToggleActive();

    // Reset results grid
    if (genreResultsGrid) genreResultsGrid.innerHTML = '';
    if (genreEmptyMessage) genreEmptyMessage.style.display = 'none';
    genreCurrentPage = 1;

    await loadGenreItems();
}

function setGenreType(type) {
    const genreResultsGrid = document.getElementById('genreResultsGrid');
    const genreEmptyMessage = document.getElementById('genreEmptyMessage');
    
    currentGenreType = type;
    setGenreToggleActive();
    // Reset and reload
    if (genreResultsGrid) genreResultsGrid.innerHTML = '';
    if (genreEmptyMessage) genreEmptyMessage.style.display = 'none';
    genreCurrentPage = 1;
    isLoading = false;
    loadGenreItems();
}

async function loadGenreItems() {
    if (isLoading) return;
    const genreId = currentGenreType === 'movie' ? currentGenre.movieId : currentGenre.tvId;
    if (!genreId) {
        const genreEmptyMessage = document.getElementById('genreEmptyMessage');
        if (genreEmptyMessage) genreEmptyMessage.style.display = 'block';
        return;
    }
    isLoading = true;
    const genreLoadingIndicator = document.getElementById('genreLoadingIndicator');
    if (genreLoadingIndicator) genreLoadingIndicator.style.display = 'block';
    
    try {
        const url = `https://api.themoviedb.org/3/discover/${currentGenreType}?api_key=${TMDB_API_KEY}&with_genres=${genreId}&sort_by=popularity.desc&page=${genreCurrentPage}`;
        const res = await fetch(url);
        const data = await res.json();
        const items = data.results || [];
        if (genreCurrentPage === 1 && items.length === 0) {
            const genreEmptyMessage = document.getElementById('genreEmptyMessage');
            if (genreEmptyMessage) genreEmptyMessage.style.display = 'block';
        } else {
            displayGenreItems(items, currentGenreType);
            genreCurrentPage++;
        }
    } catch (e) {
        console.error('[Movies] Error loading genre items:', e);
    } finally {
        isLoading = false;
        if (genreLoadingIndicator) genreLoadingIndicator.style.display = 'none';
    }
}

function displayGenreItems(items, mediaType) {
    const genreResultsGrid = document.getElementById('genreResultsGrid');
    if (!genreResultsGrid) return;
    
    items.forEach(item => {
        if (!item.poster_path) return;
        const card = document.createElement('div');
        card.className = 'movie-card';
        const title = item.title || item.name || 'Untitled';
        const titleSafe = title.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const year = (item.release_date || item.first_air_date || '').substring(0, 4);
        const rating = (item.vote_average || 0).toFixed(1);
        
        // Only show Done Watching button for movies (not TV shows)
        const doneBtnHTML = mediaType === 'movie'
            ? `<button class="done-watching-btn" data-id="${item.id}" data-type="${mediaType}" data-title="${titleSafe}" data-poster="${item.poster_path}" data-year="${year}" data-rating="${item.vote_average || 0}">
                <i class="fas fa-check"></i>
              </button>`
            : '';
        
        card.innerHTML = `
            <button class="add-to-list-btn" data-id="${item.id}" data-type="${mediaType}" data-title="${titleSafe}" data-poster="${item.poster_path}" data-year="${year}" data-rating="${item.vote_average || 0}">
                <i class="fas fa-plus"></i>
            </button>
            ${doneBtnHTML}
            <img loading="lazy" decoding="async" src="https://image.tmdb.org/t/p/w342${item.poster_path}" alt="${title}" class="movie-poster">
            <div class="movie-info">
                <h3 class="movie-title">${title}</h3>
                <p class="movie-year">${year}</p>
            </div>
            <div class="movie-rating">
                <i class="fas fa-star"></i> ${rating}
            </div>
        `;
        
        // Add click handler for add to list button
        const addBtn = card.querySelector('.add-to-list-btn');
        if (addBtn) {
            addBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const btn = e.currentTarget;
                await toggleMyList(e, parseInt(btn.dataset.id), btn.dataset.type, btn.dataset.title.replace(/&quot;/g, '"'), btn.dataset.poster, btn.dataset.year, parseFloat(btn.dataset.rating));
            });
        }
        
        // Add click handler for done watching button
        const doneBtn = card.querySelector('.done-watching-btn');
        if (doneBtn) {
            doneBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const btn = e.currentTarget;
                await toggleDoneWatching(e, parseInt(btn.dataset.id), btn.dataset.type, btn.dataset.title.replace(/&quot;/g, '"'), btn.dataset.poster, btn.dataset.year, parseFloat(btn.dataset.rating));
            });
        }
        
        card.addEventListener('click', () => openDetailsModal(item, mediaType));
        genreResultsGrid.appendChild(card);
    });
}

// ===== MY LIST PAGE FUNCTIONS =====

let myListCache = [];

async function loadMyList() {
    try {
        if (window.electronAPI && window.electronAPI.myListRead) {
            const response = await window.electronAPI.myListRead();
            // Handle both { success, data } format and direct array format
            if (response && response.data && Array.isArray(response.data)) {
                myListCache = response.data;
            } else if (Array.isArray(response)) {
                myListCache = response;
            } else {
                myListCache = [];
            }
            // Deduplicate by id+mediaType
            const seen = new Set();
            myListCache = myListCache.filter(item => {
                const key = `${item.id}_${item.mediaType || item.media_type}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
        }
        console.log('[Movies] Loaded myListCache:', myListCache.length, 'items');
        return myListCache;
    } catch (error) {
        console.error('[Movies] Error loading my list:', error);
        myListCache = [];
        return [];
    }
}

async function saveMyList() {
    try {
        if (window.electronAPI && window.electronAPI.myListWrite) {
            await window.electronAPI.myListWrite(myListCache);
            console.log('[Movies] Saved myListCache:', myListCache.length, 'items');
        }
    } catch (error) {
        console.error('[Movies] Error saving my list:', error);
    }
}

async function displayMyList() {
    const myListGrid = document.getElementById('myListGrid');
    const myListLoading = document.getElementById('myListLoading');
    const myListEmpty = document.getElementById('myListEmpty');
    
    if (!myListGrid) return;
    
    if (myListLoading) myListLoading.style.display = 'block';
    myListGrid.innerHTML = '';
    
    await loadMyList();
    
    if (myListLoading) myListLoading.style.display = 'none';
    
    if (myListCache.length === 0) {
        if (myListEmpty) myListEmpty.style.display = 'block';
        return;
    }
    
    if (myListEmpty) myListEmpty.style.display = 'none';
    
    myListCache.forEach(item => {
        const card = document.createElement('div');
        card.className = 'movie-card';
        const title = item.title || 'Untitled';
        const titleSafe = title.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const year = item.year || '';
        const rating = (item.rating || item.vote_average || 0).toFixed(1);
        const mediaType = item.mediaType || item.media_type || 'movie';
        const posterPath = item.posterPath || item.poster_path || '';
        
        card.innerHTML = `
            <button class="add-to-list-btn in-list" data-id="${item.id}" data-type="${mediaType}" data-title="${titleSafe}" data-poster="${posterPath}" data-year="${year}" data-rating="${item.rating || item.vote_average || 0}">
                <i class="fas fa-check"></i>
            </button>
            <img loading="lazy" decoding="async" src="https://image.tmdb.org/t/p/w342${posterPath}" alt="${title}" class="movie-poster">
            <div class="movie-info">
                <h3 class="movie-title">${title}</h3>
                <p class="movie-year">${year}</p>
            </div>
            <div class="movie-rating">
                <i class="fas fa-star"></i> ${rating}
            </div>
        `;
        
        // Add click handler for add to list button (to remove from list)
        const addBtn = card.querySelector('.add-to-list-btn');
        if (addBtn) {
            addBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const btn = e.currentTarget;
                await toggleMyList(e, parseInt(btn.dataset.id), btn.dataset.type, btn.dataset.title.replace(/&quot;/g, '"'), btn.dataset.poster, btn.dataset.year, parseFloat(btn.dataset.rating));
                // Refresh the list after removing
                displayMyList();
            });
        }
        
        card.addEventListener('click', () => openDetailsModal(item, mediaType));
        myListGrid.appendChild(card);
    });
}

// ===== DONE WATCHING PAGE FUNCTIONS =====

let doneWatchingCache = [];

async function loadDoneWatching() {
    try {
        if (window.electronAPI && window.electronAPI.doneWatchingRead) {
            const response = await window.electronAPI.doneWatchingRead();
            // Handle both { success, data } format and direct array format
            if (response && response.data && Array.isArray(response.data)) {
                doneWatchingCache = response.data;
            } else if (Array.isArray(response)) {
                doneWatchingCache = response;
            } else {
                doneWatchingCache = [];
            }
        }
        console.log('[Movies] Loaded doneWatchingCache:', doneWatchingCache.length, 'items', doneWatchingCache);
        return doneWatchingCache;
    } catch (error) {
        console.error('[Movies] Error loading done watching:', error);
        doneWatchingCache = [];
        return [];
    }
}

async function saveDoneWatching() {
    try {
        if (window.electronAPI && window.electronAPI.doneWatchingWrite) {
            await window.electronAPI.doneWatchingWrite(doneWatchingCache);
            console.log('[Movies] Saved doneWatchingCache:', doneWatchingCache.length, 'items', doneWatchingCache);
        }
    } catch (error) {
        console.error('[Movies] Error saving done watching:', error);
    }
}

async function displayDoneWatching() {
    const doneWatchingGrid = document.getElementById('doneWatchingGrid');
    const doneWatchingLoading = document.getElementById('doneWatchingLoading');
    const doneWatchingEmpty = document.getElementById('doneWatchingEmpty');
    
    if (!doneWatchingGrid) return;
    
    if (doneWatchingLoading) doneWatchingLoading.style.display = 'block';
    doneWatchingGrid.innerHTML = '';
    
    // Load from localStorage (cross-platform)
    let doneEpisodes = {};
    try {
        const stored = localStorage.getItem('doneWatchingEpisodes');
        if (stored) {
            doneEpisodes = JSON.parse(stored);
        }
    } catch (e) {
        console.error('[Movies] Error loading done episodes:', e);
        doneEpisodes = {};
    }
    
    // Also load movies from old system
    await loadDoneWatching();
    
    if (doneWatchingLoading) doneWatchingLoading.style.display = 'none';
    
    const episodeCount = Object.keys(doneEpisodes).length;
    const movieCount = doneWatchingCache.filter(item => {
        const mediaType = item.mediaType || item.media_type || 'movie';
        return mediaType === 'movie';
    }).length;
    
    if (episodeCount === 0 && movieCount === 0) {
        if (doneWatchingEmpty) doneWatchingEmpty.style.display = 'block';
        return;
    }
    
    if (doneWatchingEmpty) doneWatchingEmpty.style.display = 'none';
    
    // Group TV episodes by show ID
    const grouped = {};
    
    for (const [key, episode] of Object.entries(doneEpisodes)) {
        const showId = episode.showId;
        if (!grouped[showId]) {
            grouped[showId] = {
                showId: showId,
                episodes: []
            };
        }
        grouped[showId].episodes.push(episode);
    }
    
    // Display movies first
    const movies = doneWatchingCache.filter(item => {
        const mediaType = item.mediaType || item.media_type || 'movie';
        return mediaType === 'movie';
    });
    
    for (const item of movies) {
        const card = document.createElement('div');
        card.className = 'movie-card';
        const title = item.title || 'Untitled';
        const titleSafe = title.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const year = item.year || '';
        const rating = (item.rating || item.vote_average || 0).toFixed(1);
        const posterPath = item.posterPath || item.poster_path || '';
        
        card.innerHTML = `
            <button class="done-watching-btn is-done" data-id="${item.id}" data-type="movie" data-title="${titleSafe}" data-poster="${posterPath}" data-year="${year}" data-rating="${item.rating || item.vote_average || 0}">
                <i class="fas fa-check"></i>
            </button>
            <img loading="lazy" decoding="async" src="https://image.tmdb.org/t/p/w342${posterPath}" alt="${title}" class="movie-poster">
            <div class="movie-info">
                <h3 class="movie-title">${title}</h3>
                <p class="movie-year">${year}</p>
            </div>
            <div class="movie-rating">
                <i class="fas fa-star"></i> ${rating}
            </div>
        `;
        
        const doneBtn = card.querySelector('.done-watching-btn');
        if (doneBtn) {
            doneBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const btn = e.currentTarget;
                await toggleDoneWatching(e, parseInt(btn.dataset.id), btn.dataset.type, btn.dataset.title.replace(/&quot;/g, '"'), btn.dataset.poster, btn.dataset.year, parseFloat(btn.dataset.rating));
                displayDoneWatching();
            });
        }
        
        card.addEventListener('click', () => openDetailsModal(item, 'movie'));
        doneWatchingGrid.appendChild(card);
    }
    
    // Fetch and display TV shows from TMDB
    for (const [showId, data] of Object.entries(grouped)) {
        try {
            // Fetch show details from TMDB
            const response = await fetch(`https://api.themoviedb.org/3/tv/${showId}?api_key=${TMDB_API_KEY}`);
            const show = await response.json();
            
            const card = document.createElement('div');
            card.className = 'movie-card';
            const title = show.name || show.title || 'Unknown Show';
            const year = show.first_air_date ? new Date(show.first_air_date).getFullYear() : '';
            const episodeCount = data.episodes.length;
            const posterPath = show.poster_path || '';
            
            card.innerHTML = `
                <button class="done-watching-btn is-done" 
                        data-show-id="${showId}" 
                        data-type="tv"
                        title="Remove all episodes from Done Watching"
                        style="position: absolute; top: 10px; right: 10px; width: 35px; height: 35px; border-radius: 50%; border: none; background: #22c55e; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; z-index: 10;">
                    <i class="fas fa-check"></i>
                </button>
                <img loading="lazy" decoding="async" src="https://image.tmdb.org/t/p/w342${posterPath}" alt="${title}" class="movie-poster">
                <div class="movie-info">
                    <h3 class="movie-title">${title}</h3>
                    <p class="movie-year">${year}</p>
                    <p class="episode-count">${episodeCount} episode${episodeCount > 1 ? 's' : ''} watched</p>
                </div>
            `;
            
            // Add click handler for done watching button (removes all episodes)
            const doneBtn = card.querySelector('.done-watching-btn');
            if (doneBtn) {
                doneBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if (confirm(`Remove all ${episodeCount} episode${episodeCount > 1 ? 's' : ''} of "${title}" from Done Watching?`)) {
                        // Remove all episodes of this show from localStorage
                        let doneEpisodes = {};
                        try {
                            const stored = localStorage.getItem('doneWatchingEpisodes');
                            if (stored) {
                                doneEpisodes = JSON.parse(stored);
                            }
                        } catch (e) {}
                        
                        // Filter out episodes from this show
                        const filtered = {};
                        for (const [key, episode] of Object.entries(doneEpisodes)) {
                            if (String(episode.showId) !== String(showId)) {
                                filtered[key] = episode;
                            }
                        }
                        
                        localStorage.setItem('doneWatchingEpisodes', JSON.stringify(filtered));
                        
                        if (typeof showNotification === 'function') {
                            showNotification(`Removed all episodes of "${title}" from Done Watching`, 'success');
                        }
                        displayDoneWatching();
                    }
                });
            }
            
            // Store the fetched show data for the modal
            const showData = { ...show, id: showId };
            card.addEventListener('click', (e) => {
                // Don't open modal if clicking the done button
                if (e.target.closest('.done-watching-btn')) return;
                openDetailsModal(showData, 'tv');
            });
            doneWatchingGrid.appendChild(card);
        } catch (error) {
            console.error(`[Movies] Error fetching show ${showId}:`, error);
            
            // Show a placeholder card even if fetch fails
            const card = document.createElement('div');
            card.className = 'movie-card';
            const episodeCount = data.episodes.length;
            
            card.innerHTML = `
                <button class="done-watching-btn is-done" 
                        data-show-id="${showId}" 
                        data-type="tv"
                        title="Remove all episodes from Done Watching"
                        style="position: absolute; top: 10px; right: 10px; width: 35px; height: 35px; border-radius: 50%; border: none; background: #22c55e; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; z-index: 10;">
                    <i class="fas fa-check"></i>
                </button>
                <div class="movie-poster" style="background: #1d1233; display: flex; align-items: center; justify-content: center; height: 300px;">
                    <i class="fas fa-tv" style="font-size: 3rem; opacity: 0.3;"></i>
                </div>
                <div class="movie-info">
                    <h3 class="movie-title">TV Show (ID: ${showId})</h3>
                    <p class="episode-count">${episodeCount} episode${episodeCount > 1 ? 's' : ''} watched</p>
                </div>
            `;
            
            // Add click handler for done watching button
            const doneBtn = card.querySelector('.done-watching-btn');
            if (doneBtn) {
                doneBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if (confirm(`Remove all ${episodeCount} episode${episodeCount > 1 ? 's' : ''} from Done Watching?`)) {
                        let doneEpisodes = {};
                        try {
                            const stored = localStorage.getItem('doneWatchingEpisodes');
                            if (stored) {
                                doneEpisodes = JSON.parse(stored);
                            }
                        } catch (e) {}
                        
                        const filtered = {};
                        for (const [key, episode] of Object.entries(doneEpisodes)) {
                            if (String(episode.showId) !== String(showId)) {
                                filtered[key] = episode;
                            }
                        }
                        
                        localStorage.setItem('doneWatchingEpisodes', JSON.stringify(filtered));
                        
                        if (typeof showNotification === 'function') {
                            showNotification(`Removed all episodes from Done Watching`, 'success');
                        }
                        displayDoneWatching();
                    }
                });
            }
            
            doneWatchingGrid.appendChild(card);
        }
    }
}

async function clearDoneWatching() {
    if (!confirm('Are you sure you want to clear your entire Done Watching list?')) return;
    
    doneWatchingCache = [];
    await saveDoneWatching();
    
    // Refresh display if on done watching page
    if (window.location.hash === '#/done-watching') {
        await displayDoneWatching();
    }
    
    if (typeof showNotification === 'function') {
        showNotification('Done Watching list cleared');
    }
}

// ===== TORRENT FUNCTIONS =====

// Show torrents for the current content
function showTorrents(event, season = null, episode = null) {
    console.log('[Movies] showTorrents called with season:', season, 'episode:', episode);
    
    // Check streaming servers setting
    const streamingMode = localStorage.getItem('useStreamingServers') === 'true';
    console.log('[Movies] Streaming mode:', streamingMode);
    
    // Check if streaming servers mode is enabled
    if (streamingMode) {
        console.log('[Movies] Streaming servers enabled, showing server selection');
        showStreamingServerSelection(season, episode);
        return;
    }
    
    console.log('[Movies] Streaming servers disabled, showing torrents');
    
    // Show torrents container
    const torrentsContainer = document.getElementById('torrentsContainer');
    if (torrentsContainer) {
        torrentsContainer.style.display = 'block';
    }
    
    // Reset loaded state for new searches
    torrentsLoaded = false;
    fetchTorrents(season, episode);
}

// Show streaming server selection instead of torrents
function showStreamingServerSelection(season = null, episode = null) {
    console.log('[Movies] showStreamingServerSelection called with:', { season, episode });
    
    if (!currentContent) {
        console.error('[Movies] No currentContent available');
        if (typeof showNotification === 'function') {
            showNotification('No content selected', 'error');
        }
        return;
    }

    // Update the tracked season/episode for embedded servers
    if (season) lastSearchedSeason = season;
    if (episode) lastSearchedEpisode = episode;
    
    // Use the embedded servers UI directly
    showEmbeddedServersUI();
}

// ===== TORRENT DISPLAY FUNCTIONS =====
// State variables for torrent display
let allTorrents = [];
let torrentsPage = 1;
const torrentsPerPage = 20;
let torrentSortMode = 'seeders';
let torrentSizeFilter = 'all';

// Helper function to check if torrent title matches specific season/episode
function getEpisodeMatchScore(title, season, episode) {
    if (!season || !episode || !title) return 0;
    const titleLower = title.toLowerCase();
    const s = parseInt(season);
    const e = parseInt(episode);
    const patterns = [
        new RegExp(`s0*${s}[\\s._-]*e0*${e}(?!\\d)`, 'i'),
        new RegExp(`s0*${s}\\.e0*${e}(?!\\d)`, 'i'),
        new RegExp(`(?:^|\\D)${s}x0*${e}(?!\\d)`, 'i'),
        new RegExp(`season[\\s._-]*0*${s}[\\s._-]*episode[\\s._-]*0*${e}(?!\\d)`, 'i'),
    ];
    for (let i = 0; i < patterns.length; i++) {
        if (patterns[i].test(titleLower)) return 1000 - (i * 10);
    }
    return 0;
}

// Helper: size filter matcher
function bytesMatchesSizeFilter(bytes) {
    const n = Number(bytes) || 0;
    switch (torrentSizeFilter) {
        case 'gte-1g': return n >= (1024 ** 3);
        case 'gte-2g': return n >= (2 * 1024 ** 3);
        case '2-4g': return n >= (2 * 1024 ** 3) && n < (4 * 1024 ** 3);
        case '4-8g': return n >= (4 * 1024 ** 3) && n < (8 * 1024 ** 3);
        case 'gte-8g': return n >= (8 * 1024 ** 3);
        default: return true;
    }
}

// Display torrents
function displayTorrents(torrents, season = null, episode = null) {
    console.log('[displayTorrents] Called with', torrents?.length || 0, 'torrents');
    if (season && episode && currentMediaType === 'tv') {
        allTorrents = (torrents || []).map(t => ({
            ...t,
            episodeMatchScore: getEpisodeMatchScore(t.title, season, episode)
        }));
    } else {
        allTorrents = (torrents || []).slice();
    }
    torrentsPage = 1;
    renderTorrentsPage();
}

function renderTorrentsPage() {
    const torrentsList = document.getElementById('torrentsList');
    if (!torrentsList) {
        console.error('[RENDER] torrentsList element NOT FOUND!');
        return;
    }
    torrentsList.innerHTML = '';
    
    const isTvEp = currentMediaType === 'tv' && lastSearchedSeason && lastSearchedEpisode;
    const toSort = (allTorrents || []).slice();
    
    console.log('[RENDER] Total torrents:', toSort.length);
    
    toSort.sort((a, b) => {
        if (isTvEp) {
            const ea = Number(a.episodeMatchScore || 0);
            const eb = Number(b.episodeMatchScore || 0);
            if (eb !== ea) return eb - ea;
        }
        const mode = torrentSortMode || 'seeders';
        if (mode === 'size-asc') return (a.size || 0) - (b.size || 0);
        if (mode === 'size-desc') return (b.size || 0) - (a.size || 0);
        return (b.seeders || 0) - (a.seeders || 0);
    });
    
    // Apply keyword filter
    let filteredTorrents = toSort;
    const keywordEl = document.getElementById('torrentKeywordFilter');
    const keyword = keywordEl ? keywordEl.value.trim().toLowerCase() : '';
    if (keyword) {
        filteredTorrents = toSort.filter(t => (t.title || '').toLowerCase().includes(keyword));
    }

    // Apply size filter
    if (torrentSizeFilter && torrentSizeFilter !== 'all') {
        filteredTorrents = filteredTorrents.filter(t => bytesMatchesSizeFilter(t.size));
    }
    
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
                <p class="torrent-name">${torrent.title}</p>
                <div class="torrent-details">
                    <span><i class="fas fa-arrow-up"></i> ${torrent.seeders || 0}</span>
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
            // Direct stream URL (111477, Nuvio, etc.) - play immediately
            if (torrent.url) {
                playButton.addEventListener('click', () => {
                    playDirectStream(torrent.url, torrent.title);
                });
            }
            // Magnet link - show file picker
            else if (torrent.magnet) {
                playButton.addEventListener('click', () => {
                    if (typeof window.startStream === 'function') {
                        window.startStream(torrent.magnet);
                    } else {
                        console.error('startStream not available');
                        if (typeof showNotification === 'function') showNotification('Streaming not available', 'error');
                    }
                });
            } 
            // Torrent file URL - resolve to magnet first
            else if (torrent.torrentFileUrl) {
                playButton.addEventListener('click', () => {
                    if (typeof window.handleTorrentFileUrl === 'function') {
                        window.handleTorrentFileUrl(torrent);
                    } else {
                        console.error('handleTorrentFileUrl not available');
                        if (typeof showNotification === 'function') showNotification('Torrent file handling not available', 'error');
                    }
                });
            }
        }
        
        const copyButton = item.querySelector('.btn-copy');
        if (copyButton) {
            if (torrent.url) {
                copyButton.addEventListener('click', () => {
                    navigator.clipboard.writeText(torrent.url).then(() => {
                        if (typeof showNotification === 'function') showNotification('Stream URL copied');
                    });
                });
            } else if (torrent.magnet) {
                copyButton.addEventListener('click', () => {
                    navigator.clipboard.writeText(torrent.magnet).then(() => {
                        if (typeof showNotification === 'function') showNotification('Magnet link copied');
                    });
                });
            } else if (torrent.torrentFileUrl) {
                copyButton.addEventListener('click', () => {
                    navigator.clipboard.writeText(torrent.torrentFileUrl).then(() => {
                        if (typeof showNotification === 'function') showNotification('Torrent URL copied');
                    });
                });
            }
        }

        torrentsList.appendChild(item);
    });

    renderTorrentPagination(filteredTorrents.length);
}

function renderTorrentPagination(totalCount) {
    const torrentsList = document.getElementById('torrentsList');
    if (!torrentsList) return;
    
    const totalPages = Math.ceil(totalCount / torrentsPerPage);
    if (totalPages <= 1) return;

    const paginationContainer = document.createElement('div');
    paginationContainer.className = 'torrent-pagination';

    const prevBtn = document.createElement('button');
    prevBtn.innerHTML = '<i class="fas fa-arrow-left"></i>';
    prevBtn.disabled = torrentsPage === 1;
    prevBtn.addEventListener('click', () => {
        if (torrentsPage > 1) { torrentsPage--; renderTorrentsPage(); }
    });

    const nextBtn = document.createElement('button');
    nextBtn.innerHTML = '<i class="fas fa-arrow-right"></i>';
    nextBtn.disabled = torrentsPage === totalPages;
    nextBtn.addEventListener('click', () => {
        if (torrentsPage < totalPages) { torrentsPage++; renderTorrentsPage(); }
    });

    const pageInfo = document.createElement('span');
    pageInfo.textContent = `Page ${torrentsPage} of ${totalPages}`;

    paginationContainer.appendChild(prevBtn);
    paginationContainer.appendChild(pageInfo);
    paginationContainer.appendChild(nextBtn);
    torrentsList.appendChild(paginationContainer);
}

// Export torrent display functions
window.displayTorrents = displayTorrents;
window.renderTorrentsPage = renderTorrentsPage;
window.getEpisodeMatchScore = getEpisodeMatchScore;
window.bytesMatchesSizeFilter = bytesMatchesSizeFilter;

// ===== PROVIDER FUNCTIONS =====

// Comet Provider
async function fetchCometTorrents(season = null, episode = null) {
    const torrentsList = document.getElementById('torrentsList');
    if (torrentsList) torrentsList.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Searching Comet...</div>';

    try {
        const tmdbId = currentContent.id;
        const mediaType = currentMediaType;
        const API_BASE_URL = window.API_BASE_URL || 'http://localhost:6987/api';

        const externalIdsUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}/external_ids?api_key=${TMDB_API_KEY}`;
        const externalIdsRes = await fetch(externalIdsUrl);
        if (!externalIdsRes.ok) throw new Error('Failed to get IMDB ID');
        const externalIds = await externalIdsRes.json();
        const imdbId = externalIds.imdb_id;
        if (!imdbId) throw new Error('No IMDB ID found');

        const cometConfig = 'eyJtYXhSZXN1bHRzUGVyUmVzb2x1dGlvbiI6MCwibWF4U2l6ZSI6MCwiY2FjaGVkT25seSI6dHJ1ZSwicmVtb3ZlVHJhc2giOnRydWUsInJlc3VsdEZvcm1hdCI6WyJhbGwiXSwiZGVicmlkU2VydmljZSI6InRvcnJlbnQiLCJkZWJyaWRBcGlLZXkiOiIiLCJkZWJyaWRTdHJlYW1Qcm94eVBhc3N3b3JkIjoiIiwibGFuZ3VhZ2VzIjp7ImV4Y2x1ZGUiOltdLCJwcmVmZXJyZWQiOlsiZW4iXX0sInJlc29sdXRpb25zIjp7fSwib3B0aW9ucyI6eyJyZW1vdmVfcmFua3NfdW5kZXIiOi0xMDAwMDAwMDAwMCwiYWxsb3dfZW5nbGlzaF9pbl9sYW5ndWFnZXMiOmZhbHNlLCJyZW1vdmVfdW5rbm93bl9sYW5ndWFnZXMiOmZhbHNlfX0=';
        let cometUrl = mediaType === 'movie' 
            ? `${API_BASE_URL}/comet/stream/movie/${imdbId}?config=${cometConfig}`
            : `${API_BASE_URL}/comet/stream/series/${imdbId}:${season}:${episode}?config=${cometConfig}`;

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
            const displayTitle = stream.behaviorHints?.filename || stream.name || 'Unknown';
            let magnetLink = `magnet:?xt=urn:btih:${infoHash}&dn=${encodeURIComponent(displayTitle)}`;
            sources.forEach(tracker => magnetLink += `&tr=${encodeURIComponent(tracker)}`);
            return { title: displayTitle, magnet: magnetLink, seeders: 0, size: stream.behaviorHints?.videoSize || 0 };
        }).filter(Boolean);

        console.log('[Comet] Got', torrents.length, 'torrents');
        displayTorrents(torrents, season, episode);
    } catch (error) {
        console.error('[Comet] Error:', error);
        if (torrentsList) torrentsList.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-triangle"></i> Comet Error: ${error.message}</div>`;
    }
}

// MovieBox Provider
async function fetchMovieBoxStreams(season = null, episode = null) {
    const torrentsList = document.getElementById('torrentsList');
    if (torrentsList) torrentsList.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Searching MovieBox...</div>';

    try {
        const tmdbId = currentContent.id;
        const API_BASE_URL = window.API_BASE_URL || 'http://localhost:6987/api';
        let apiUrl = currentMediaType === 'movie' 
            ? `${API_BASE_URL}/astra/${tmdbId}`
            : `${API_BASE_URL}/tv/${tmdbId}/${season}/${episode}`;

        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`MovieBox error: ${response.statusText}`);
        const data = await response.json();

        if (!data?.Astra?.playlist?.length) {
            torrentsList.innerHTML = '<div class="error-message"><i class="fas fa-info-circle"></i> No MovieBox streams found</div>';
            return;
        }

        const torrents = data.Astra.playlist.map(item => ({
            title: `MovieBox ${item.resolution}p`,
            streamUrl: item.url,
            seeders: 0,
            size: 0
        }));

        console.log('[MovieBox] Got', torrents.length, 'streams');
        displayMovieBoxStreams(torrents);
    } catch (error) {
        console.error('[MovieBox] Error:', error);
        if (torrentsList) torrentsList.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-triangle"></i> MovieBox Error: ${error.message}</div>`;
    }
}

function displayMovieBoxStreams(streams) {
    const torrentsList = document.getElementById('torrentsList');
    if (!torrentsList) return;
    torrentsList.innerHTML = '';

    streams.forEach(stream => {
        const item = document.createElement('div');
        item.className = 'torrent-item';
        item.innerHTML = `
            <div class="torrent-info"><p class="torrent-name">${stream.title}</p></div>
            <div class="torrent-actions">
                <button class="btn-play torrent-btn"><i class="fas fa-play"></i> Play</button>
                <button class="btn-copy torrent-btn"><i class="fas fa-copy"></i> Copy</button>
            </div>
        `;
        item.querySelector('.btn-play').addEventListener('click', () => {
            if (window.electronAPI?.spawnMpvjsPlayer) {
                window.electronAPI.spawnMpvjsPlayer({ url: stream.streamUrl });
            } else {
                window.open(stream.streamUrl, '_blank');
            }
        });
        item.querySelector('.btn-copy').addEventListener('click', () => {
            navigator.clipboard.writeText(stream.streamUrl);
            if (typeof showNotification === 'function') showNotification('Stream URL copied');
        });
        torrentsList.appendChild(item);
    });
}

// 111477 Provider
async function fetch111477Streams(season = null, episode = null) {
    const torrentsList = document.getElementById('torrentsList');
    if (torrentsList) torrentsList.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Searching 111477...</div>';

    try {
        const tmdbId = currentContent.id;
        let apiUrl = currentMediaType === 'movie'
            ? `http://localhost:6987/111477/api/tmdb/movie/${tmdbId}`
            : `http://localhost:6987/111477/api/tmdb/tv/${tmdbId}/season/${season}/episode/${episode}`;

        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`111477 error: ${response.statusText}`);
        const data = await response.json();

        let allFiles = [];
        if (Array.isArray(data?.results)) {
            data.results.forEach(r => { if (r.success && Array.isArray(r.files)) allFiles = allFiles.concat(r.files); });
        } else if (Array.isArray(data?.files)) {
            allFiles = data.files;
        }

        if (allFiles.length === 0) {
            torrentsList.innerHTML = '<div class="error-message"><i class="fas fa-info-circle"></i> No 111477 streams found</div>';
            return;
        }

        console.log('[111477] Got', allFiles.length, 'files');
        display111477Files(allFiles);
    } catch (error) {
        console.error('[111477] Error:', error);
        if (torrentsList) torrentsList.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-triangle"></i> 111477 Error: ${error.message}</div>`;
    }
}

function display111477Files(files) {
    const torrentsList = document.getElementById('torrentsList');
    if (!torrentsList) return;
    torrentsList.innerHTML = '';

    files.forEach(file => {
        const item = document.createElement('div');
        item.className = 'torrent-item';
        const sizeGB = ((file.size || 0) / 1024 / 1024 / 1024).toFixed(2);
        item.innerHTML = `
            <div class="torrent-info">
                <p class="torrent-name">${file.name || 'Unknown'}</p>
                <div class="torrent-details"><span><i class="fas fa-database"></i> ${sizeGB} GB</span></div>
            </div>
            <div class="torrent-actions">
                <button class="btn-play torrent-btn"><i class="fas fa-play"></i> Play</button>
                <button class="btn-copy torrent-btn"><i class="fas fa-copy"></i> Copy</button>
            </div>
        `;
        item.querySelector('.btn-play').addEventListener('click', () => {
            const url = file.streamLink || file.url;
            if (window.electronAPI?.spawnMpvjsPlayer) {
                window.electronAPI.spawnMpvjsPlayer({ url });
            } else {
                window.open(url, '_blank');
            }
        });
        item.querySelector('.btn-copy').addEventListener('click', () => {
            navigator.clipboard.writeText(file.streamLink || file.url);
            if (typeof showNotification === 'function') showNotification('Link copied');
        });
        torrentsList.appendChild(item);
    });
}

// XDmovies Provider
async function fetchXDMoviesStreams(season = null, episode = null) {
    const torrentsList = document.getElementById('torrentsList');
    if (torrentsList) torrentsList.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Searching XDmovies...</div>';

    if (currentMediaType === 'tv') {
        torrentsList.innerHTML = '<div class="error-message"><i class="fas fa-info-circle"></i> XDmovies is for movies only</div>';
        return;
    }

    try {
        const API_BASE_URL = window.API_BASE_URL || 'http://localhost:6987/api';
        const response = await fetch(`${API_BASE_URL}/xdmovies/${currentContent.id}`);
        if (!response.ok) throw new Error(`XDmovies error: ${response.statusText}`);
        const data = await response.json();

        if (!data.success || !data.downloads?.length) {
            torrentsList.innerHTML = '<div class="error-message"><i class="fas fa-info-circle"></i> No XDmovies streams found</div>';
            return;
        }

        console.log('[XDmovies] Got', data.downloads.length, 'downloads');
        displayXDMoviesStreams(data.downloads);
    } catch (error) {
        console.error('[XDmovies] Error:', error);
        if (torrentsList) torrentsList.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-triangle"></i> XDmovies Error: ${error.message}</div>`;
    }
}

function displayXDMoviesStreams(downloads) {
    const torrentsList = document.getElementById('torrentsList');
    if (!torrentsList) return;
    torrentsList.innerHTML = '';

    downloads.forEach(download => {
        const item = document.createElement('div');
        item.className = 'torrent-item';
        item.innerHTML = `
            <div class="torrent-info">
                <p class="torrent-name">${download.title || 'Download'}</p>
                <div class="torrent-details"><span>${download.size || 'Unknown size'}</span></div>
            </div>
            <div class="torrent-actions"></div>
        `;
        const actions = item.querySelector('.torrent-actions');
        (download.serverLinks || []).forEach(server => {
            const btn = document.createElement('button');
            btn.className = 'torrent-btn';
            btn.innerHTML = `<i class="fas fa-play"></i> ${server.name}`;
            btn.addEventListener('click', () => {
                if (window.electronAPI?.spawnMpvjsPlayer) {
                    window.electronAPI.spawnMpvjsPlayer({ url: server.url });
                } else {
                    window.open(server.url, '_blank');
                }
            });
            actions.appendChild(btn);
        });
        torrentsList.appendChild(item);
    });
}

// Nuvio Provider
async function fetchNuvioStreams(season = null, episode = null) {
    const torrentsList = document.getElementById('torrentsList');
    if (torrentsList) torrentsList.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Searching Nuvio...</div>';

    try {
        const tmdbId = currentContent.id;
        const mediaType = currentMediaType;

        const externalIdsUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}/external_ids?api_key=${TMDB_API_KEY}`;
        const externalIdsRes = await fetch(externalIdsUrl);
        if (!externalIdsRes.ok) throw new Error('Failed to get IMDB ID');
        const externalIds = await externalIdsRes.json();
        const imdbId = externalIds.imdb_id;
        if (!imdbId) throw new Error('No IMDB ID found');

        const febboxToken = localStorage.getItem('febboxToken') || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE3NTU5MzQ2NzcsIm5iZiI6MTc1NTkzNDY3NywiZXhwIjoxNzg3MDM4Njk3LCJkYXRhIjp7InVpZCI6OTY3OTA3LCJ0b2tlbiI6ImRjZTBiZTUyNzgzODU1Njg5ZjNlMjBhZTIzODU2YzlkIn19.yAuVwTgLyO7sTH5rOi_-UaVAHqO0YzUkykXgQC2ci2E';
        const base = 'https://nuviostreams.hayd.uk';
        const cookiesSeg = `cookies=${encodeURIComponent(JSON.stringify([febboxToken]))}`;
        
        let nuvioUrl = mediaType === 'movie'
            ? `${base}/${cookiesSeg}/region=UK3/providers=showbox,vidzee,vidsrc/stream/movie/${imdbId}.json`
            : `${base}/${cookiesSeg}/region=UK3/providers=showbox,vidzee,vidsrc/stream/series/${imdbId}:${season}:${episode}.json`;

        const response = await fetch(nuvioUrl);
        if (!response.ok) throw new Error(`Nuvio error: ${response.statusText}`);
        const data = await response.json();
        const streams = data.streams || [];

        if (streams.length === 0) {
            torrentsList.innerHTML = '<div class="error-message"><i class="fas fa-info-circle"></i> No Nuvio streams found</div>';
            return;
        }

        console.log('[Nuvio] Got', streams.length, 'streams');
        displayNuvioStreams(streams);
    } catch (error) {
        console.error('[Nuvio] Error:', error);
        if (torrentsList) torrentsList.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-triangle"></i> Nuvio Error: ${error.message}</div>`;
    }
}

function displayNuvioStreams(streams) {
    const torrentsList = document.getElementById('torrentsList');
    if (!torrentsList) return;
    torrentsList.innerHTML = '';

    streams.forEach((stream, i) => {
        const item = document.createElement('div');
        item.className = 'torrent-item';
        const name = stream.name || `Stream ${i + 1}`;
        const title = (stream.title || '').split('\n')[0];
        item.innerHTML = `
            <div class="torrent-info">
                <p class="torrent-name">${name}</p>
                ${title ? `<div class="torrent-details"><span>${title}</span></div>` : ''}
            </div>
            <div class="torrent-actions">
                <button class="btn-play torrent-btn"><i class="fas fa-play"></i> Play</button>
                <button class="btn-copy torrent-btn"><i class="fas fa-copy"></i> Copy</button>
            </div>
        `;
        item.querySelector('.btn-play').addEventListener('click', () => {
            if (window.electronAPI?.spawnMpvjsPlayer) {
                window.electronAPI.spawnMpvjsPlayer({ url: stream.url });
            } else {
                window.open(stream.url, '_blank');
            }
        });
        item.querySelector('.btn-copy').addEventListener('click', () => {
            navigator.clipboard.writeText(stream.url);
            if (typeof showNotification === 'function') showNotification('Stream URL copied');
        });
        torrentsList.appendChild(item);
    });
}

// Export provider functions
window.fetchCometTorrents = fetchCometTorrents;
window.fetchMovieBoxStreams = fetchMovieBoxStreams;
window.fetch111477Streams = fetch111477Streams;
window.fetchXDMoviesStreams = fetchXDMoviesStreams;
window.fetchNuvioStreams = fetchNuvioStreams;

// Fetch torrents from the backend
async function fetchTorrents(season = null, episode = null) {
    if (!currentContent) {
        if (typeof showNotification === 'function') {
            showNotification('Select a movie/show first');
        }
        return;
    }

    // Track last searched parameters for provider switching
    lastSearchedSeason = season;
    lastSearchedEpisode = episode;

    console.log('[Movies] fetchTorrents called with provider:', selectedProvider, 'season:', season, 'episode:', episode);

    // Check selected provider first
    if (selectedProvider === 'comet') {
        console.log('[Provider] Routing to Comet');
        return fetchCometTorrents(season, episode);
    } else if (selectedProvider === '111477') {
        console.log('[Provider] Routing to 111477');
        return fetch111477Streams(season, episode);
    } else if (selectedProvider === 'moviebox') {
        console.log('[Provider] Routing to MovieBox');
        return fetchMovieBoxStreams(season, episode);
    } else if (selectedProvider === 'xdmovies') {
        console.log('[Provider] Routing to XDmovies');
        return fetchXDMoviesStreams(season, episode);
    } else if (selectedProvider === 'aiostreams') {
        console.log('[Provider] Routing to AIOStreams');
        if (typeof window.fetchAiostreamsStreams === 'function') {
            return window.fetchAiostreamsStreams(season, episode);
        }
    } else if (selectedProvider === 'nuvio') {
        console.log('[Provider] Routing to Nuvio');
        return fetchNuvioStreams(season, episode);
    }

    // Check if selected provider is a Stremio addon
    if (typeof isAddonProvider === 'function' && isAddonProvider(selectedProvider)) {
        console.log('[Provider] Routing to Stremio addon:', selectedProvider);
        const addon = await getAddonByProviderId(selectedProvider);
        if (addon) {
            return fetchAddonProviderStreams(addon, season, episode);
        } else {
            console.error('[Provider] Addon not found:', selectedProvider);
        }
    }

    // Default providers: jackett, torrentio, torrentless
    const torrentsList = document.getElementById('torrentsList');
    if (torrentsList) {
        torrentsList.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Searching...</div>';
    }
    torrentsLoaded = true;

    // Check settings for torrent source
    let useTorrentless = false;
    let torrentSource = 'torrentio';
    try {
        const API_BASE_URL = window.API_BASE_URL || 'http://localhost:6987/api';
        const res = await fetch(`${API_BASE_URL}/settings`);
        if (res.ok) {
            const settings = await res.json();
            useTorrentless = !!settings.useTorrentless;
            torrentSource = settings.torrentSource || 'torrentio';
        }
    } catch (e) {
        console.error('[Movies] Failed to load settings:', e);
    }

    // Handle explicit provider overrides
    if (selectedProvider === 'torrentio') {
        return fetchTorrentioTorrents(season, episode);
    } else if (selectedProvider === 'torrentless') {
        return fetchTorrentlessTorrents(season, episode);
    } else if (selectedProvider === 'jackett') {
        return fetchJackettTorrents(season, episode);
    } else if (selectedProvider === 'prowlarr') {
        return fetchProwlarrTorrents(season, episode);
    }

    // Default behavior based on settings
    if (useTorrentless) {
        if (torrentSource === 'torrentio') {
            return fetchTorrentioTorrents(season, episode);
        } else {
            return fetchTorrentlessTorrents(season, episode);
        }
    } else {
        return fetchJackettTorrents(season, episode);
    }
}

// Fetch from Torrentio
async function fetchTorrentioTorrents(season, episode) {
    const torrentsList = document.getElementById('torrentsList');
    if (torrentsList) {
        torrentsList.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Searching Torrentio...</div>';
    }

    try {
        const tmdbId = currentContent.id;
        const mediaType = currentMediaType;
        
        // Get IMDB ID from TMDB
        const externalIdsUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}/external_ids?api_key=${TMDB_API_KEY}`;
        const externalIdsRes = await fetch(externalIdsUrl);
        if (!externalIdsRes.ok) throw new Error('Failed to get IMDB ID from TMDB');
        
        const externalIds = await externalIdsRes.json();
        const imdbId = externalIds.imdb_id;
        
        if (!imdbId) throw new Error('No IMDB ID found for this content');

        let torrentioUrl;
        if (mediaType === 'movie') {
            torrentioUrl = `http://localhost:6987/torrentio/api/${imdbId}`;
        } else if (season && episode) {
            torrentioUrl = `http://localhost:6987/torrentio/api/${imdbId}/${season}/${episode}`;
        } else {
            throw new Error('Season and episode required for TV shows');
        }

        const response = await fetch(torrentioUrl);
        if (!response.ok) throw new Error(`Torrentio error: ${response.statusText}`);
        
        const data = await response.json();
        const streams = data.streams || [];
        
        const torrents = streams.map(stream => {
            const magnetLink = stream.magnetLink || (stream.infoHash ? `magnet:?xt=urn:btih:${stream.infoHash}` : null);
            if (!magnetLink) return null;
            
            const titleMatch = (stream.title || '').match(/👤\s*(\d+)/);
            const sizeMatch = (stream.title || '').match(/💾\s*([\d.]+\s*[KMGT]B)/i);
            const seeders = titleMatch ? parseInt(titleMatch[1]) : 0;
            const sizeStr = sizeMatch ? sizeMatch[1] : '0 B';
            
            let sizeBytes = 0;
            const sizeParts = sizeStr.match(/([\d.]+)\s*([KMGT]?B)/i);
            if (sizeParts) {
                const num = parseFloat(sizeParts[1]);
                const unit = sizeParts[2].toUpperCase();
                const multipliers = { 'B': 1, 'KB': 1024, 'MB': 1024**2, 'GB': 1024**3, 'TB': 1024**4 };
                sizeBytes = Math.round(num * (multipliers[unit] || 1));
            }
            
            return { 
                title: (stream.title || stream.name || '').split('\n')[0], 
                magnet: magnetLink, 
                seeders, 
                size: sizeBytes 
            };
        }).filter(Boolean);

        console.log('[Torrentio] Converted', torrents.length, 'torrents');
        displayTorrents(torrents, season, episode);
    } catch (error) {
        console.error('[Torrentio] Error:', error);
        if (torrentsList) {
            torrentsList.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-triangle"></i> Torrentio Error: ${error.message}</div>`;
        }
    }
}

// Fetch from Torrentless (in-app scraper)
async function fetchTorrentlessTorrents(season, episode) {
    const torrentsList = document.getElementById('torrentsList');
    if (torrentsList) {
        torrentsList.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Searching PlayTorrio...</div>';
    }

    try {
        let query = currentContent.title || currentContent.name;
        if (currentMediaType === 'movie') {
            const year = (currentContent.release_date || '').substring(0, 4);
            if (year) query = `${query} ${year}`;
        } else if (currentMediaType === 'tv') {
            if (season && episode) {
                const seasonStr = String(season).padStart(2, '0');
                const episodeStr = String(episode).padStart(2, '0');
                query = `${query} S${seasonStr}E${episodeStr}`;
            } else if (season) {
                const seasonStr = String(season).padStart(2, '0');
                query = `${query} S${seasonStr}`;
            }
        }

        const torrentlessUrl = `http://localhost:6987/torrentless/api/search?q=${encodeURIComponent(query)}&page=1`;
        const response = await fetch(torrentlessUrl);
        if (!response.ok) throw new Error(`PlayTorrio error: ${response.statusText}`);
        
        const data = await response.json();
        const items = data.items || [];
        
        const torrents = items.map(item => {
            const seeders = parseInt((item.seeds || '0').replace(/,/g, ''), 10) || 0;
            
            let sizeBytes = 0;
            if (item.size) {
                const sizeParts = item.size.match(/([\d.]+)\s*([KMGT]?B)/i);
                if (sizeParts) {
                    const num = parseFloat(sizeParts[1]);
                    const unit = sizeParts[2].toUpperCase();
                    const multipliers = { 'B': 1, 'KB': 1024, 'MB': 1024**2, 'GB': 1024**3, 'TB': 1024**4 };
                    sizeBytes = Math.round(num * (multipliers[unit] || 1));
                }
            }
            
            return { 
                title: item.name,
                magnet: item.magnet, 
                seeders, 
                size: sizeBytes
            };
        });

        console.log('[Torrentless] Converted', torrents.length, 'torrents');
        displayTorrents(torrents, season, episode);
    } catch (error) {
        console.error('[Torrentless] Error:', error);
        if (torrentsList) {
            torrentsList.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-triangle"></i> PlayTorrio Error: ${error.message}</div>`;
        }
    }
}

// Fetch from Jackett
async function fetchJackettTorrents(season, episode) {
    const torrentsList = document.getElementById('torrentsList');
    if (torrentsList) {
        torrentsList.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Searching Jackett...</div>';
    }

    try {
        let query = currentContent.title || currentContent.name;
        if (currentMediaType === 'movie') {
            const year = (currentContent.release_date || '').substring(0, 4);
            if (year) query = `${query} ${year}`;
        } else if (currentMediaType === 'tv') {
            if (season && episode) {
                const seasonStr = String(season).padStart(2, '0');
                const episodeStr = String(episode).padStart(2, '0');
                query = `${query} S${seasonStr}.E${episodeStr}`;
            } else if (season) {
                const seasonStr = String(season).padStart(2, '0');
                query = `${query} S${seasonStr}`;
            }
        }

        const API_BASE_URL = window.API_BASE_URL || 'http://localhost:6987/api';
        const showTitle = currentContent.title || currentContent.name;
        const jackettUrl = `${API_BASE_URL}/torrents?q=${encodeURIComponent(query)}&title=${encodeURIComponent(showTitle)}&season=${season||''}&episode=${episode||''}`;
        console.log('[Jackett] Fetching:', jackettUrl);
        
        const response = await fetch(jackettUrl);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        
        const torrents = await response.json();
        console.log('[Jackett] Got', torrents?.length || 0, 'torrents from API');
        displayTorrents(torrents, season, episode);
    } catch (error) {
        console.error('[Jackett] Error:', error);
        if (torrentsList) {
            torrentsList.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-triangle"></i> Jackett Error: ${error.message}</div>`;
        }
    }
}

// Fetch from Prowlarr
async function fetchProwlarrTorrents(season, episode) {
    const torrentsList = document.getElementById('torrentsList');
    if (torrentsList) {
        torrentsList.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Searching Prowlarr...</div>';
    }

    try {
        let query = currentContent.title || currentContent.name;
        if (currentMediaType === 'movie') {
            const year = (currentContent.release_date || '').substring(0, 4);
            if (year) query = `${query} ${year}`;
        } else if (currentMediaType === 'tv') {
            if (season && episode) {
                const seasonStr = String(season).padStart(2, '0');
                const episodeStr = String(episode).padStart(2, '0');
                query = `${query} S${seasonStr}.E${episodeStr}`;
            } else if (season) {
                const seasonStr = String(season).padStart(2, '0');
                query = `${query} S${seasonStr}`;
            }
        }

        const API_BASE_URL = window.API_BASE_URL || 'http://localhost:6987/api';
        const showTitle = currentContent.title || currentContent.name;
        const prowlarrUrl = `${API_BASE_URL}/torrents?q=${encodeURIComponent(query)}&title=${encodeURIComponent(showTitle)}&season=${season||''}&episode=${episode||''}&useProwlarr=true`;
        console.log('[Prowlarr] Fetching:', prowlarrUrl);
        
        const response = await fetch(prowlarrUrl);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        
        const torrents = await response.json();
        console.log('[Prowlarr] Got', torrents?.length || 0, 'torrents from API');
        displayTorrents(torrents, season, episode);
    } catch (error) {
        console.error('[Prowlarr] Error:', error);
        if (torrentsList) {
            torrentsList.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-triangle"></i> Prowlarr Error: ${error.message}</div>`;
        }
    }
}

// Export torrent functions
window.showTorrents = showTorrents;
window.showStreamingServerSelection = showStreamingServerSelection;
window.fetchTorrents = fetchTorrents;
window.fetchTorrentioTorrents = fetchTorrentioTorrents;
window.fetchTorrentlessTorrents = fetchTorrentlessTorrents;
window.fetchJackettTorrents = fetchJackettTorrents;
window.fetchProwlarrTorrents = fetchProwlarrTorrents;

// Export state variables for use in other modules
Object.defineProperty(window, 'selectedProvider', {
    get: function() { return selectedProvider; },
    set: function(val) { selectedProvider = val; }
});
Object.defineProperty(window, 'lastSearchedSeason', {
    get: function() { return lastSearchedSeason; },
    set: function(val) { lastSearchedSeason = val; }
});
Object.defineProperty(window, 'lastSearchedEpisode', {
    get: function() { return lastSearchedEpisode; },
    set: function(val) { lastSearchedEpisode = val; }
});
Object.defineProperty(window, 'currentSeason', {
    get: function() { return currentSeason; },
    set: function(val) { currentSeason = val; }
});
Object.defineProperty(window, 'currentContent', {
    get: function() { return currentContent; },
    set: function(val) { currentContent = val; }
});
Object.defineProperty(window, 'currentMediaType', {
    get: function() { return currentMediaType; },
    set: function(val) { currentMediaType = val; }
});
Object.defineProperty(window, 'currentMovie', {
    get: function() { return currentMovie; },
    set: function(val) { currentMovie = val; }
});
Object.defineProperty(window, 'isLoading', {
    get: function() { return isLoading; },
    set: function(val) { isLoading = val; }
});

// Export functions for use in other modules
window.loadMovies = loadMovies;
window.searchMovies = searchMovies;
window.displayMovies = displayMovies;
window.openDetailsModal = openDetailsModal;
window.closeDetailsModal = closeDetailsModal;
window.toggleMyList = toggleMyList;
window.toggleDoneWatching = toggleDoneWatching;
window.toggleEpisodeDoneWatching = toggleEpisodeDoneWatching;
window.initializeNewUI = initializeNewUI;
window.loadHeroContent = loadHeroContent;
window.loadSliders = loadSliders;
window.setupSliderNavigation = setupSliderNavigation;
window.updateArrowStates = updateArrowStates;
window.refreshDisplay = refreshDisplay;
window.ensureGenresLoaded = ensureGenresLoaded;
window.renderGenres = renderGenres;
window.openGenreDetails = openGenreDetails;
window.setGenreType = setGenreType;
window.loadGenreItems = loadGenreItems;
window.displayGenreItems = displayGenreItems;
window.loadMyList = loadMyList;
window.saveMyList = saveMyList;
window.displayMyList = displayMyList;
window.loadDoneWatching = loadDoneWatching;
window.saveDoneWatching = saveDoneWatching;
window.displayDoneWatching = displayDoneWatching;
window.clearDoneWatching = clearDoneWatching;

// Export cache variables for use in other modules (e.g., trakt.js)
Object.defineProperty(window, 'myListCache', {
    get: function() { return myListCache; },
    set: function(val) { myListCache = val; }
});
Object.defineProperty(window, 'doneWatchingCache', {
    get: function() { return doneWatchingCache; },
    set: function(val) { doneWatchingCache = val; }
});

// Export search state for category filtering
Object.defineProperty(window, 'isSearchMode', {
    get: function() { return isSearchMode; },
    set: function(val) { isSearchMode = val; }
});
Object.defineProperty(window, 'lastSearchResults', {
    get: function() { return lastSearchResults; },
    set: function(val) { lastSearchResults = val; }
});
Object.defineProperty(window, 'currentPage', {
    get: function() { return currentPage; },
    set: function(val) { currentPage = val; }
});
Object.defineProperty(window, 'currentCategory', {
    get: function() { return currentCategory; },
    set: function(val) { currentCategory = val; }
});

console.log('[Movies] Movies module loaded');

// ===== MODAL BUTTON HANDLERS =====

// Initialize modal button handlers
// Guard to prevent duplicate initialization
let modalButtonsInitialized = false;

function initializeModalButtons() {
    // Prevent duplicate event listeners by only initializing once
    if (modalButtonsInitialized) {
        console.log('[Movies] Modal buttons already initialized, skipping');
        return;
    }
    modalButtonsInitialized = true;
    
    const watchNowBtn = document.getElementById('watchNowBtn');
    const useStreamsBtn = document.getElementById('useStreamsBtn');
    const watchTrailerBtn = document.getElementById('watchTrailerBtn');
    const modalClose = document.getElementById('modalClose');
    const refreshTorrents = document.getElementById('refreshTorrents');
    const torrentSortSelect = document.getElementById('torrentSortSelect');
    const torrentSizeFilterSelect = document.getElementById('torrentSizeFilterSelect');
    const torrentKeywordFilter = document.getElementById('torrentKeywordFilter');
    
    // Watch Now button - behavior depends on streaming mode
    if (watchNowBtn) {
        watchNowBtn.addEventListener('click', (e) => {
            console.log('[Movies] Watch button clicked! Streaming mode:', useStreamingMode);
            try {
                if (useStreamingMode) {
                    // Show embedded servers
                    showEmbeddedServersUI();
                } else {
                    // Show torrents
                    showTorrents(e);
                    // Auto-scroll to provider buttons
                    setTimeout(() => {
                        const pb = document.querySelector('.provider-buttons');
                        if (pb) pb.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 200);
                }
            } catch (error) {
                console.error('[Movies] Error in Watch Now handler:', error);
            }
        });
    }
    
    // Toggle button - switches between streaming mode and torrent mode
    if (useStreamsBtn) {
        useStreamsBtn.addEventListener('click', () => {
            // Toggle the mode
            useStreamingMode = !useStreamingMode;
            localStorage.setItem('useStreamingServers', useStreamingMode ? 'true' : 'false');
            
            // Update button texts
            updateStreamingModeButtons();
            
            if (typeof showNotification === 'function') {
                showNotification(useStreamingMode ? 'Switched to Direct Streams mode' : 'Switched to Torrents mode', 'info');
            }
        });
    }
    
    // Watch Trailer button
    if (watchTrailerBtn) {
        watchTrailerBtn.addEventListener('click', async () => {
            if (!currentContent) return;
            
            const trailerModal = document.getElementById('trailerModal');
            const trailerModalTitle = document.getElementById('trailerModalTitle');
            const trailerContainer = document.getElementById('trailerContainer');
            const trailerPlaceholder = document.getElementById('trailerPlaceholder');
            
            if (!trailerModal) return;
            
            // Show trailer modal with loading state
            trailerModal.classList.add('active');
            trailerModal.style.display = 'flex';
            if (trailerModalTitle) {
                trailerModalTitle.textContent = `${currentContent.title || currentContent.name || 'Trailer'} - Trailer`;
            }
            if (trailerPlaceholder) {
                trailerPlaceholder.innerHTML = `
                    <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
                    <p>Loading trailer...</p>
                `;
                trailerPlaceholder.style.display = 'flex';
            }
            
            // Remove any existing iframe
            if (trailerContainer) {
                const existingIframe = trailerContainer.querySelector('iframe');
                if (existingIframe) existingIframe.remove();
            }
            
            try {
                // Fetch videos from TMDB
                const videosUrl = `https://api.themoviedb.org/3/${currentMediaType}/${currentContent.id}/videos?api_key=${TMDB_API_KEY}`;
                const response = await fetch(videosUrl);
                const data = await response.json();
                const videos = data.results || [];
                
                // Find the best trailer
                const trailer = videos.find(v => 
                    v.site === 'YouTube' && 
                    v.type === 'Trailer' && 
                    v.official === true
                ) || videos.find(v => v.site === 'YouTube' && v.type === 'Trailer') || videos[0];
                
                if (trailer && trailer.site === 'YouTube') {
                    if (trailerPlaceholder) trailerPlaceholder.style.display = 'none';
                    if (trailerContainer) {
                        const iframe = document.createElement('iframe');
                        iframe.style.cssText = 'width: 100%; height: 100%; border: 0;';
                        iframe.src = `https://www.youtube.com/embed/${trailer.key}?autoplay=1`;
                        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
                        iframe.allowFullscreen = true;
                        trailerContainer.appendChild(iframe);
                    }
                } else {
                    if (trailerPlaceholder) {
                        trailerPlaceholder.innerHTML = `
                            <i class="fas fa-exclamation-circle" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
                            <p>No trailer available</p>
                        `;
                    }
                }
            } catch (error) {
                console.error('[Movies] Error loading trailer:', error);
                if (trailerPlaceholder) {
                    trailerPlaceholder.innerHTML = `
                        <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
                        <p>Failed to load trailer</p>
                    `;
                }
            }
        });
    }
    
    // Trailer modal close
    const trailerModalClose = document.getElementById('trailerModalClose');
    if (trailerModalClose) {
        trailerModalClose.addEventListener('click', () => {
            const trailerModal = document.getElementById('trailerModal');
            const trailerContainer = document.getElementById('trailerContainer');
            if (trailerModal) {
                trailerModal.classList.remove('active');
                trailerModal.style.display = 'none';
            }
            // Stop video playback
            if (trailerContainer) {
                const iframe = trailerContainer.querySelector('iframe');
                if (iframe) iframe.src = '';
            }
        });
    }
    
    // Close modal button
    if (modalClose) {
        modalClose.addEventListener('click', closeDetailsModal);
    }
    
    // Close modal when clicking outside (on backdrop)
    const detailsModal = document.getElementById('detailsModal');
    if (detailsModal) {
        detailsModal.addEventListener('click', (e) => {
            if (e.target === detailsModal) {
                closeDetailsModal();
            }
        });
    }
    
    // Close trailer modal on backdrop click
    const trailerModal = document.getElementById('trailerModal');
    if (trailerModal) {
        trailerModal.addEventListener('click', (e) => {
            if (e.target === trailerModal) {
                trailerModal.classList.remove('active');
                trailerModal.style.display = 'none';
                const trailerContainer = document.getElementById('trailerContainer');
                if (trailerContainer) {
                    const iframe = trailerContainer.querySelector('iframe');
                    if (iframe) iframe.src = '';
                }
            }
        });
    }
    
    // Refresh torrents button
    if (refreshTorrents) {
        refreshTorrents.addEventListener('click', () => {
            torrentsLoaded = false;
            fetchTorrents(lastSearchedSeason, lastSearchedEpisode);
        });
    }
    
    // Sort selector for torrents
    if (torrentSortSelect) {
        const handleSortChange = () => {
            const newMode = torrentSortSelect.value || 'seeders';
            console.log('[SORT] Changing to', newMode);
            window.torrentSortMode = newMode;
            
            // Re-render based on active provider
            if (selectedProvider === 'nuvio' && window.allNuvioStreams?.length > 0) {
                if (typeof displayNuvioStreams === 'function') displayNuvioStreams(window.allNuvioStreams);
            } else if (selectedProvider === '111477' && window._last111477Files) {
                if (typeof render111477Files === 'function') render111477Files(window._last111477Files);
            } else {
                if (typeof renderTorrentsPage === 'function') renderTorrentsPage();
            }
        };
        torrentSortSelect.addEventListener('change', handleSortChange);
        torrentSortSelect.addEventListener('input', handleSortChange);
    }
    
    // Size filter selector for torrents
    if (torrentSizeFilterSelect) {
        const handleSizeFilterChange = () => {
            window.torrentSizeFilter = torrentSizeFilterSelect.value || 'all';
            console.log('[FILTER] Size filter changed to:', window.torrentSizeFilter);
            
            // Re-render based on active provider
            if (selectedProvider === 'nuvio' && window.allNuvioStreams?.length > 0) {
                if (typeof displayNuvioStreams === 'function') displayNuvioStreams(window.allNuvioStreams);
            } else if (selectedProvider === '111477' && window._last111477Files) {
                if (typeof render111477Files === 'function') render111477Files(window._last111477Files);
            } else {
                if (typeof renderTorrentsPage === 'function') renderTorrentsPage();
            }
        };
        torrentSizeFilterSelect.addEventListener('change', handleSizeFilterChange);
        torrentSizeFilterSelect.addEventListener('input', handleSizeFilterChange);
    }
    
    // Keyword filter for torrents
    if (torrentKeywordFilter) {
        torrentKeywordFilter.addEventListener('input', () => {
            if (typeof renderTorrentsPage === 'function') renderTorrentsPage();
        });
    }
    
    // Provider buttons
    document.querySelectorAll('.provider-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active state
            document.querySelectorAll('.provider-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update selected provider
            selectedProvider = btn.dataset.provider;
            window.selectedProvider = selectedProvider;
            console.log('[Provider] Switched to:', selectedProvider);

            // Show a searching indicator immediately
            const tl = document.getElementById('torrentsList');
            if (tl) {
                const label = selectedProvider === 'moviebox' ? 'MovieBox' :
                              selectedProvider === 'nuvio' ? 'Nuvio' :
                              selectedProvider === 'comet' ? 'Comet' :
                              selectedProvider === '111477' ? '111477' :
                              selectedProvider === 'xdmovies' ? 'XDmovies' :
                              selectedProvider === 'aiostreams' ? 'AIOStreams' :
                              selectedProvider === 'torrentio' ? 'Torrentio' :
                              selectedProvider === 'torrentless' ? 'PlayTorrio' :
                              selectedProvider === 'jackett' ? 'Jackett' :
                              selectedProvider === 'prowlarr' ? 'Prowlarr' : 'torrents';
                tl.innerHTML = `<div class="loading"><i class="fas fa-spinner fa-spin"></i> Searching ${label}...</div>`;
            }

            // Fetch with new provider using last searched parameters
            torrentsLoaded = false;
            if (selectedProvider === 'moviebox' && typeof fetchMovieBoxStreams === 'function') {
                fetchMovieBoxStreams(lastSearchedSeason, lastSearchedEpisode);
            } else {
                fetchTorrents(lastSearchedSeason, lastSearchedEpisode);
            }
        });
    });
    
    console.log('[Movies] Modal button handlers initialized');
}

// ===== STREAMING FUNCTIONS =====
// These are included here to ensure they're always available

// Player state for streaming (some may already be declared at top)
let currentTorrentData = null;
let currentStreamUrl = null;
let currentStreamHash = null;  // Track current torrent hash for cleanup
let currentStreamIsAltEngine = false;  // Track if using alt engine
// currentSelectedVideoName already declared at top
let currentSubtitleUrl = null;
let currentSubtitles = [];

// Main streaming function
async function startStream(magnet) {
    console.log('[Streaming] startStream called with magnet:', magnet?.substring(0, 50) + '...');
    
    if (!magnet || !magnet.startsWith('magnet:')) {
        if (typeof showNotification === 'function') showNotification('Invalid magnet link', 'error');
        return;
    }
    
    const API_BASE_URL = window.API_BASE_URL || 'http://localhost:6987/api';
    
    // Get DOM elements
    const mpvPlayerContainer = document.getElementById('mpvPlayerContainer');
    const mpvLoading = document.getElementById('mpvLoading');
    const mpvControls = document.getElementById('mpvControls');
    const fileList = document.getElementById('fileList');
    const subtitleList = document.getElementById('subtitleList');
    const subtitleControls = document.getElementById('subtitleControls');
    const playerTitle = document.getElementById('playerTitle');
    const streamSourceBadge = document.getElementById('streamSourceBadge');
    const customSourceBadge = document.getElementById('customSourceBadge');
    
    console.log('[Streaming] DOM elements:', {
        mpvPlayerContainer: !!mpvPlayerContainer,
        mpvLoading: !!mpvLoading,
        fileList: !!fileList,
        playerTitle: !!playerTitle
    });
    
    // Check Debrid settings
    let useDebrid = false;
    let debridAuth = null;
    let debridProvider = 'realdebrid';
    
    try {
        const res = await fetch(`${API_BASE_URL}/settings`);
        if (res.ok) {
            const settings = await res.json();
            useDebrid = settings.useDebrid || false;
            debridAuth = settings.debridAuth || null;
            debridProvider = settings.debridProvider || 'realdebrid';
        }
    } catch (e) {
        console.warn('[Streaming] Could not load debrid state:', e);
    }
    
    const providerNames = {
        'realdebrid': 'Real-Debrid',
        'alldebrid': 'AllDebrid',
        'torbox': 'TorBox',
        'premiumize': 'Premiumize'
    };
    const providerLabel = providerNames[debridProvider] || 'Debrid';
    
    console.log('[Streaming] Starting stream with settings:', { useDebrid, debridAuth, debridProvider });
    
    // If Debrid is enabled but not authenticated, prompt login
    if (useDebrid && !debridAuth) {
        console.warn('[Streaming] Debrid enabled but not logged in');
        if (typeof showNotification === 'function') showNotification(`${providerLabel} is enabled but you are not logged in. Please log in to continue.`);
        window.location.hash = '#/settings';
        return;
    }
    
    // Show player
    if (mpvPlayerContainer) {
        mpvPlayerContainer.classList.add('active');
        mpvPlayerContainer.style.display = 'flex';
        
        // Add close button handler
        const closePlayerBtn = document.getElementById('closePlayerBtn');
        if (closePlayerBtn) {
            closePlayerBtn.onclick = async () => {
                console.log('[FilePicker] Close button clicked - stopping engine and clearing cache');
                mpvPlayerContainer.classList.remove('active');
                mpvPlayerContainer.style.display = 'none';
                
                // Stop ALL torrents - this will shut down the engine completely
                console.log('[FilePicker] Calling /api/alt-stop-all...');
                try {
                    const API_BASE_URL = window.API_BASE_URL || 'http://localhost:6987';
                    const res = await fetch(`${API_BASE_URL}/api/alt-stop-all`, { method: 'POST' });
                    const data = await res.json();
                    console.log('[FilePicker] Stop all response:', res.status, data);
                } catch (e) {
                    console.warn('[FilePicker] Error stopping all torrents:', e);
                }
                
                currentStreamUrl = null;
                currentTorrentData = null;
                
                // Clear cache when file picker closes
                if (window.electronAPI?.clearCache) {
                    try {
                        console.log('[FilePicker] Clearing cache via IPC...');
                        const result = await window.electronAPI.clearCache();
                        console.log('[FilePicker] Cache cleared:', result.message);
                    } catch (e) {
                        console.warn('[FilePicker] Error clearing cache:', e);
                    }
                }
                
                if (typeof showNotification === 'function') showNotification('Player closed');
            };
        }
        
        // Add player button handlers
        const copyStreamBtn = document.getElementById('copyStreamBtn');
        const playNowBtn = document.getElementById('playNowBtn');
        const openMPVBtn = document.getElementById('openMPVBtn');
        const openVLCBtn = document.getElementById('openVLCBtn');
        
        if (copyStreamBtn) copyStreamBtn.onclick = copyStreamUrl;
        if (playNowBtn) playNowBtn.onclick = handlePlayNowClick;
        if (openMPVBtn) openMPVBtn.onclick = handleOpenMPVClick;
        if (openVLCBtn) openVLCBtn.onclick = handleOpenVLCClick;
    }
    
    // Debrid flow
    if (useDebrid && debridAuth && magnet && magnet.startsWith('magnet:')) {
        console.log('[Streaming] Using Debrid path');
        
        try {
            // Show loading state
            if (mpvLoading) mpvLoading.style.display = 'flex';
            if (mpvControls) mpvControls.style.display = 'none';
            if (fileList) fileList.innerHTML = '';
            if (subtitleList) subtitleList.innerHTML = '';
            if (subtitleControls) subtitleControls.style.display = 'none';
            if (playerTitle) playerTitle.textContent = `Preparing ${providerLabel}…`;
            
            // Add magnet to Debrid
            console.log('[Streaming][Debrid] Preparing magnet...');
            const prep = await fetch(`${API_BASE_URL}/debrid/prepare`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ magnet })
            });
            
            if (!prep.ok) {
                let notif = 'Debrid prepare failed';
                try {
                    const txt = await prep.text();
                    console.error('[Streaming][Debrid] prepare failed', txt);
                    try {
                        const ej = JSON.parse(txt);
                        if (ej && ej.code === 'RD_PREMIUM_REQUIRED') {
                            notif = `${providerLabel} premium is required. Disable Debrid in Settings to use WebTorrent instead.`;
                        } else if (ej && ej.code === 'DEBRID_UNAUTH') {
                            notif = `${providerLabel} authentication invalid. Please login again.`;
                        } else if (ej && ej.error) {
                            notif = ej.error;
                        }
                    } catch { /* not json */ }
                } catch { /* ignore */ }
                showNotification(notif);
                if (mpvLoading) mpvLoading.style.display = 'none';
                return;
            }
            
            const prepj = await prep.json();
            let rdId = prepj.id;
            let info = prepj.info || null;
            
            // If files not ready, poll for them
            if (!info || !Array.isArray(info.files) || !info.files.length) {
                await new Promise(r => setTimeout(r, 900));
                const fres = await fetch(`${API_BASE_URL}/debrid/files?id=${encodeURIComponent(rdId)}`);
                if (fres.ok) info = await fres.json();
            }
            
            let files = (info && info.files) || [];
            // Poll a few times if files not ready
            if (!files.length) {
                for (let i = 0; i < 8; i++) {
                    await new Promise(r => setTimeout(r, 1000));
                    try {
                        const rf = await fetch(`${API_BASE_URL}/debrid/files?id=${encodeURIComponent(rdId)}`);
                        if (rf.ok) {
                            const ij = await rf.json();
                            files = (ij && ij.files) || [];
                            if (files.length) break;
                        }
                    } catch {}
                }
            }
            
            // Render files
            if (mpvLoading) mpvLoading.style.display = 'none';
            if (fileList) fileList.innerHTML = '';
            
            const isCached = info?.status === 'downloaded';
            const statusPrefix = isCached ? '✅ Cached' : '⬇️ Downloading';
            if (playerTitle) playerTitle.textContent = `${statusPrefix} - ${info?.filename || providerLabel}`;
            
            if (!isCached) {
                showNotification(`${providerLabel}: Torrent not cached. Downloading to cloud...`, 'info');
            } else {
                showNotification(`${providerLabel}: Torrent is cached and ready!`, 'success');
            }
            
            const rdVideos = files.filter(f => /\.(mp4|mkv|avi|mov)$/i.test(f.path || f.filename || ''));
            const rdSubs = files.filter(f => /\.(srt|vtt)$/i.test(f.path || f.filename || ''));
            
            const displayName = (f) => (f.path || f.filename || 'file');
            const displaySize = (f) => ((f.bytes || f.size || 0) / 1024 / 1024).toFixed(2) + ' MB';
            
            // Status badge helper
            const statusBadgeHtml = (file) => {
                const cached = (info?.status === 'downloaded') || (file && file.cached === true) || (Array.isArray(file.links) && file.links.length > 0);
                const label = cached ? 'Cached' : 'Not cached';
                const bg = cached ? 'background:#198754;' : 'background:#6c757d;';
                return `<span class="source-badge rd-cache-badge" style="${bg} margin-left:6px;">${label}</span>`;
            };
            
            // Wait for file links helper
            async function waitForRdLinks(id, fileId, { timeoutMs = 30000, intervalMs = 1500 } = {}) {
                const start = Date.now();
                while (Date.now() - start < timeoutMs) {
                    try {
                        const fres = await fetch(`${API_BASE_URL}/debrid/files?id=${encodeURIComponent(id)}`);
                        if (!fres.ok) {
                            await new Promise(r => setTimeout(r, intervalMs));
                            continue;
                        }
                        const info = await fres.json();
                        const list = Array.isArray(info?.files) ? info.files : [];
                        const found = list.find(x => String(x.id || x.file) === String(fileId));
                        if (found && Array.isArray(found.links) && found.links.length) {
                            return found.links[0];
                        }
                    } catch {}
                    await new Promise(r => setTimeout(r, intervalMs));
                }
                return null;
            }
            
            // File click handler
            const createFileClickHandler = (f, currentRdId, subs) => {
                return async (event) => {
                    try {
                        const clickedItem = event?.currentTarget;
                        
                        // Select this file
                        try {
                            console.log('[Streaming][Debrid] select-files', { id: currentRdId, file: String(f.id || f.file) });
                            const selectRes = await fetch(`${API_BASE_URL}/debrid/select-files`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id: currentRdId, files: String(f.id || f.file) })
                            });
                            if (!selectRes.ok) {
                                const errText = await selectRes.text();
                                console.warn('[Streaming][Debrid] select-files failed', errText);
                            }
                        } catch(e) { console.warn('[Streaming][Debrid] select-files exception', e?.message); }
                        
                        // Get link
                        let link = Array.isArray(f.links) && f.links.length ? f.links[0] : null;
                        if (!link) {
                            showNotification(`Not cached yet on ${providerLabel}. Waiting to cache…`);
                            if (mpvLoading) mpvLoading.style.display = 'flex';
                            link = await waitForRdLinks(currentRdId, (f.id || f.file));
                            if (link && clickedItem) {
                                try {
                                    const badge = clickedItem.querySelector('.rd-cache-badge');
                                    if (badge) { badge.textContent = 'Cached'; badge.style.background = '#198754'; }
                                } catch {}
                            }
                        }
                        
                        if (!link) {
                            showNotification('Still not cached. Try again later or disable Debrid to use WebTorrent.');
                            if (mpvLoading) mpvLoading.style.display = 'none';
                            return;
                        }
                        
                        // Unrestrict the link
                        const unres = await fetch(`${API_BASE_URL}/debrid/link`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ link })
                        });
                        
                        if (!unres.ok) {
                            console.error('[Streaming][Debrid] unrestrict failed', await unres.text());
                            showNotification('Failed to get stream link');
                            if (mpvLoading) mpvLoading.style.display = 'none';
                            return;
                        }
                        
                        const uj = await unres.json();
                        if (!uj?.url) {
                            console.error('[Streaming][Debrid] unrestrict response missing url', uj);
                            showNotification('Invalid Debrid URL');
                            if (mpvLoading) mpvLoading.style.display = 'none';
                            return;
                        }
                        
                        // Store stream URL
                        currentStreamUrl = uj.url;
                        
                        const fname = (f.path || f.filename || '').split('/').pop();
                        if (playerTitle) playerTitle.textContent = fname || displayName(f);
                        
                        // Update source badges
                        if (streamSourceBadge) {
                            streamSourceBadge.textContent = 'Debrid';
                            streamSourceBadge.classList.remove('webtorrent');
                            streamSourceBadge.classList.add('debrid');
                        }
                        if (customSourceBadge) {
                            customSourceBadge.textContent = 'Debrid';
                            customSourceBadge.classList.remove('webtorrent');
                            customSourceBadge.classList.add('debrid');
                        }
                        
                        if (mpvControls) mpvControls.style.display = 'flex';
                        if (mpvLoading) mpvLoading.style.display = 'none';
                        showNotification(`Ready via ${providerLabel}`);
                        
                    } catch (e) {
                        console.error('[Streaming][Debrid] file play failed', e);
                        showNotification('Failed to prepare Debrid file');
                        if (mpvLoading) mpvLoading.style.display = 'none';
                    }
                };
            };
            
            // Render video files
            rdVideos.forEach((f) => {
                const item = document.createElement('div');
                item.className = 'file-item';
                item.innerHTML = `<p class="file-name">${displayName(f)} ${statusBadgeHtml(f)}</p><p class="file-size">(${displaySize(f)})</p>`;
                item.addEventListener('click', createFileClickHandler(f, rdId, rdSubs));
                fileList.appendChild(item);
            });
            
            // Render subtitles if any
            if (rdSubs.length && subtitleControls && subtitleList) {
                subtitleControls.style.display = 'flex';
                subtitleList.innerHTML = '';
                rdSubs.forEach((s) => {
                    const subItem = document.createElement('div');
                    subItem.className = 'subtitle-item';
                    const langDiv = document.createElement('div');
                    langDiv.className = 'subtitle-lang';
                    langDiv.textContent = displayName(s);
                    subItem.appendChild(langDiv);
                    subItem.addEventListener('click', async () => {
                        try {
                            const l = Array.isArray(s.links) && s.links.length ? s.links[0] : null;
                            if (!l) return;
                            const su = await fetch(`${API_BASE_URL}/debrid/link`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ link: l })
                            });
                            if (!su.ok) return;
                            const suj = await su.json();
                            if (suj?.url) {
                                currentSubtitleUrl = suj.url;
                                showNotification('Subtitle ready');
                            }
                        } catch(e) { console.warn('[Streaming][Debrid] sub attach failed', e?.message); }
                    });
                    subtitleList.appendChild(subItem);
                });
            }
            
            return; // Debrid path handled fully
            
        } catch (e) {
            console.error('[Streaming][Debrid] flow failed', e?.message);
            showNotification('Debrid path failed. Falling back to WebTorrent.');
            if (mpvLoading) mpvLoading.style.display = 'none';
            // Fall through to WebTorrent
        }
    }
    
    // WebTorrent flow
    console.log('[Streaming] Using WebTorrent path');
    
    if (mpvLoading) mpvLoading.style.display = 'flex';
    if (mpvControls) mpvControls.style.display = 'none';
    if (fileList) fileList.innerHTML = '';
    if (subtitleList) subtitleList.innerHTML = '';
    if (subtitleControls) subtitleControls.style.display = 'none';
    if (playerTitle) playerTitle.textContent = 'Loading torrent info...';
    
    try {
        // Check which engine to use
        let engineConfig = { engine: 'stremio', instances: 1 };
        try {
            const cfgRes = await fetch(`${API_BASE_URL}/torrent-engine/config`);
            if (cfgRes.ok) engineConfig = await cfgRes.json();
        } catch(e) { console.warn('[Streaming] Config fetch failed, using stremio'); }
        
        const isAltEngine = engineConfig.engine !== 'stremio';
        const engineNames = { stremio: 'Stremio', webtorrent: 'WebTorrent', torrentstream: 'TorrentStream', hybrid: 'Hybrid' };
        const engineName = engineNames[engineConfig.engine] || 'Stremio';
        
        console.log('[Streaming] Using engine:', engineConfig.engine, 'isAlt:', isAltEngine);
        
        // Use appropriate endpoint based on engine
        const baseUrl = 'http://localhost:6987';
        const filesUrl = isAltEngine 
            ? `${baseUrl}/api/alt-torrent-files?magnet=${encodeURIComponent(magnet)}`
            : `${API_BASE_URL}/torrent-files?magnet=${encodeURIComponent(magnet)}`;
        
        console.log('[Streaming] Fetching files from:', filesUrl);
        const response = await fetch(filesUrl);
        
        if (!response.ok) {
            throw new Error('Failed to get torrent files');
        }
        
        const data = await response.json();
        currentTorrentData = data;
        currentTorrentData._isAltEngine = isAltEngine;
        
        console.log('[Streaming] Got torrent data:', data);
        
        if (playerTitle) playerTitle.textContent = data.name || 'Selected Torrent';
        
        // Display files
        if (mpvLoading) mpvLoading.style.display = 'none';
        if (fileList) fileList.innerHTML = '';
        
        const videos = data.videoFiles || [];
        const subtitles = data.subtitleFiles || [];
        
        // Sort videos by season and episode
        videos.sort((a, b) => {
            const regex = /(S|s)(\d+)(E|e)(\d+)|(\d+)x(\d+)|(\d+)-(\d+)/;
            const aMatch = a.name.match(regex);
            const bMatch = b.name.match(regex);
            
            if (aMatch && bMatch) {
                const aSeason = parseInt(aMatch[2] || aMatch[5] || aMatch[7], 10);
                const aEpisode = parseInt(aMatch[4] || aMatch[6] || aMatch[8], 10);
                const bSeason = parseInt(bMatch[2] || bMatch[5] || bMatch[7], 10);
                const bEpisode = parseInt(bMatch[4] || bMatch[6] || bMatch[8], 10);
                
                if (aSeason !== bSeason) return aSeason - bSeason;
                return aEpisode - bEpisode;
            }
            return a.name.localeCompare(b.name);
        });
        
        videos.forEach(file => {
            const item = document.createElement('div');
            item.className = 'file-item';
            item.innerHTML = `
                <p class="file-name">${file.name}</p>
                <p class="file-size">(${(file.size / 1024 / 1024).toFixed(2)} MB)</p>
            `;
            
            item.addEventListener('click', async () => {
                // Use appropriate endpoint based on engine
                const streamUrl = isAltEngine 
                    ? `${baseUrl}/api/alt-stream-file?hash=${currentTorrentData.infoHash}&file=${file.index}`
                    : `${API_BASE_URL}/stream-file?hash=${currentTorrentData.infoHash}&file=${file.index}`;
                const prepareUrl = isAltEngine
                    ? `${baseUrl}/api/alt-prepare-file?hash=${currentTorrentData.infoHash}&file=${file.index}`
                    : `${API_BASE_URL}/prepare-file?hash=${currentTorrentData.infoHash}&file=${file.index}`;
                
                currentStreamUrl = streamUrl;
                currentSelectedVideoName = file.name.split(/[/\\]/).pop();
                if (playerTitle) playerTitle.textContent = currentSelectedVideoName;
                
                if (mpvControls) mpvControls.style.display = 'flex';
                
                // Ask backend to begin downloading the selected file
                try {
                    console.log('[Streaming] Preparing file:', prepareUrl);
                    await fetch(prepareUrl);
                } catch (_) {}
                
                if (typeof showNotification === 'function') {
                    showNotification(`Selected: ${currentSelectedVideoName}. Click Play Now or Open in MPV to start.`);
                }
            });
            
            if (fileList) fileList.appendChild(item);
        });
        
        // Handle subtitles
        if (subtitles && subtitles.length > 0) {
            if (subtitleControls) subtitleControls.style.display = 'flex';
            if (subtitleList) {
                subtitleList.innerHTML = '';
                subtitleList.classList.add('subtitle-list');
                currentSubtitles = subtitles;
                
                subtitles.forEach(sub => {
                    const subItem = document.createElement('div');
                    subItem.className = 'subtitle-item';
                    
                    const langDiv = document.createElement('div');
                    langDiv.className = 'subtitle-lang';
                    langDiv.textContent = sub.name;
                    subItem.appendChild(langDiv);
                    
                    subItem.addEventListener('click', async () => {
                        document.querySelectorAll('.subtitle-item').forEach(item => {
                            item.classList.remove('selected');
                        });
                        subItem.classList.add('selected');
                        
                        currentSubtitleUrl = `${API_BASE_URL}/subtitle-file?hash=${currentTorrentData.infoHash}&file=${sub.index}`;
                        if (typeof showNotification === 'function') showNotification(`Selected subtitle: ${sub.name}`);
                    });
                    
                    subtitleList.appendChild(subItem);
                });
            }
        }
        
        // Set source badges
        if (streamSourceBadge) { 
            streamSourceBadge.textContent = engineName; 
            streamSourceBadge.classList.remove('debrid'); 
            streamSourceBadge.classList.add('webtorrent'); 
        }
        if (customSourceBadge) { 
            customSourceBadge.textContent = engineName; 
            customSourceBadge.classList.remove('debrid'); 
            customSourceBadge.classList.add('webtorrent'); 
        }
        
        if (typeof showNotification === 'function') showNotification('Files ready! Click to play.');
        
    } catch (error) {
        console.error('[Streaming] WebTorrent stream error:', error);
        if (typeof showNotification === 'function') showNotification('Streaming error: ' + error.message, 'error');
        if (mpvLoading) mpvLoading.style.display = 'none';
    }
}

// Handle torrent file URL (for torrents without magnet links)
async function handleTorrentFileUrl(torrent) {
    if (!torrent || !torrent.torrentFileUrl) return;
    
    const API_BASE_URL = window.API_BASE_URL || 'http://localhost:6987/api';
    
    if (typeof showNotification === 'function') showNotification('Resolving torrent file...', 'info');
    try {
        const response = await fetch(`${API_BASE_URL}/resolve-torrent-file?url=${encodeURIComponent(torrent.torrentFileUrl)}&title=${encodeURIComponent(torrent.title)}`);
        const data = await response.json();
        
        if (response.ok && data.magnet) {
            if (typeof showNotification === 'function') showNotification('Torrent resolved, starting stream...', 'success');
            await startStream(data.magnet);
        } else {
            throw new Error(data.error || 'Failed to resolve torrent file');
        }
    } catch (error) {
        console.error('[Streaming] Error resolving torrent file:', error);
        if (typeof showNotification === 'function') showNotification(error.message, 'error');
    }
}

// Play direct stream URL (for 111477, Nuvio, etc.)
function playDirectStream(url, title) {
    if (!url) {
        if (typeof showNotification === 'function') showNotification('No stream URL available', 'error');
        return;
    }
    
    console.log('[Streaming] Playing direct stream:', url);
    currentStreamUrl = url;
    currentSelectedVideoName = title || 'Video';
    
    // Use playStreamWithSelectedPlayer which respects player settings
    if (typeof window.playStreamWithSelectedPlayer === 'function') {
        const tmdbId = currentContent?.id?.toString() || '';
        let seasonNum = null;
        let episodeNum = null;
        
        if (currentMediaType === 'tv') {
            // Try to get season/episode from UI state
            const seasonEl = document.querySelector('.season-item.active');
            const episodeEl = document.querySelector('.episode-item.active');
            if (seasonEl) seasonNum = seasonEl.dataset.season;
            if (episodeEl) episodeNum = episodeEl.dataset.episode;
        }
        
        window.playStreamWithSelectedPlayer(url, {
            tmdbId: tmdbId,
            seasonNum: seasonNum,
            episodeNum: episodeNum,
            isDebrid: false,
            name: title || 'Video',
            type: currentMediaType || 'movie'
        });
    } else if (window.electronAPI && typeof window.electronAPI.spawnMpvjsPlayer === 'function') {
        // Fallback to direct Electron API call
        const tmdbId = currentContent?.id?.toString() || '';
        let seasonNum = null;
        let episodeNum = null;
        
        if (currentMediaType === 'tv') {
            const seasonEl = document.querySelector('.season-item.active');
            const episodeEl = document.querySelector('.episode-item.active');
            if (seasonEl) seasonNum = seasonEl.dataset.season;
            if (episodeEl) episodeNum = episodeEl.dataset.episode;
        }
        
        window.electronAPI.spawnMpvjsPlayer({
            url: url,
            tmdbId: tmdbId,
            seasonNum: seasonNum,
            episodeNum: episodeNum,
            isDebrid: false
        }).then(result => {
            if (result?.success) {
                if (typeof showNotification === 'function') showNotification('Player launched');
            } else if (result?.message) {
                alert(result.message);
            } else {
                window.open(url, '_blank');
            }
        }).catch(err => {
            console.error('[Streaming] Player error:', err);
            window.open(url, '_blank');
        });
    } else {
        // No player API available - open in new tab
        if (typeof showNotification === 'function') showNotification('Opening stream...', 'info');
        window.open(url, '_blank');
    }
}

// Copy stream URL to clipboard
function copyStreamUrl() {
    if (currentStreamUrl) {
        navigator.clipboard.writeText(currentStreamUrl).then(() => {
            if (typeof showNotification === 'function') showNotification('Stream URL copied to clipboard');
        });
    } else {
        if (typeof showNotification === 'function') showNotification('No stream URL to copy', 'error');
    }
}

// Handle Play Now button click
async function handlePlayNowClick() {
    if (!currentStreamUrl) {
        if (typeof showNotification === 'function') showNotification('No file selected to play');
        return;
    }
    
    console.log('[Streaming] Play Now clicked, URL:', currentStreamUrl);
    
    // Get season/episode from currentFileInfo (set in streaming.js when file is selected)
    // This uses parseFromFilename() which extracts S01E05 etc from torrent filenames
    let seasonNum = null;
    let episodeNum = null;
    
    // First try to get from currentFileInfo (extracted from torrent filename)
    if (window.currentFileInfo) {
        seasonNum = window.currentFileInfo.season;
        episodeNum = window.currentFileInfo.episode;
        console.log(`[Streaming] Using extracted S${seasonNum}E${episodeNum} from filename`);
    }
    
    // Fallback: try to extract from currentSelectedVideoName
    if (!seasonNum && currentMediaType === 'tv' && currentSelectedVideoName) {
        const match = currentSelectedVideoName.match(/[Ss](\d+)[Ee](\d+)/);
        if (match) {
            seasonNum = match[1];
            episodeNum = match[2];
            console.log(`[Streaming] Fallback extracted S${seasonNum}E${episodeNum} from video name`);
        }
    }
    
    const tmdbId = currentContent?.id?.toString() || '';
    const imdbId = currentContent?.external_ids?.imdb_id || null;
    
    // Try to use Electron MPV player if available
    if (window.electronAPI && typeof window.electronAPI.spawnMpvjsPlayer === 'function') {
        try {
            // Fetch subtitles for the player (like basicmode does)
            let subtitles = [];
            if (tmdbId) {
                try {
                    subtitles = await fetchSubtitlesForPlayer(tmdbId, imdbId, seasonNum, episodeNum, currentMediaType || 'movie');
                    console.log(`[Streaming] Fetched ${subtitles.length} subtitles for player`);
                } catch (e) {
                    console.warn('[Streaming] Failed to fetch subtitles:', e);
                }
            }
            
            const result = await window.electronAPI.spawnMpvjsPlayer({
                url: currentStreamUrl,
                tmdbId: tmdbId,
                imdbId: imdbId,
                seasonNum: seasonNum,
                episodeNum: episodeNum,
                isDebrid: false,
                subtitles: subtitles,
                type: currentMediaType || 'movie'
            });
            
            if (result?.success) {
                if (typeof showNotification === 'function') showNotification('Player launched');
            } else if (result?.message) {
                alert(result.message);
            } else {
                if (typeof showNotification === 'function') showNotification('Failed to launch player');
            }
        } catch (err) {
            console.error('[Streaming] Play Now error:', err);
            if (typeof showNotification === 'function') showNotification('Error launching player: ' + err.message, 'error');
        }
    } else {
        // No Electron API - open in new tab
        if (typeof showNotification === 'function') showNotification('Opening stream in new tab...', 'info');
        window.open(currentStreamUrl, '_blank');
    }
}

// Handle Open in MPV button click
async function handleOpenMPVClick() {
    if (!currentStreamUrl) {
        if (typeof showNotification === 'function') showNotification('No file selected');
        return;
    }
    
    console.log('[Streaming] Open in MPV clicked, URL:', currentStreamUrl);
    
    if (window.electronAPI && typeof window.electronAPI.openMPVDirect === 'function') {
        try {
            const result = await window.electronAPI.openMPVDirect(currentStreamUrl);
            if (result?.success) {
                if (typeof showNotification === 'function') showNotification('Opening in MPV...', 'success');
            } else {
                if (typeof showNotification === 'function') showNotification(result?.message || 'Failed to open in MPV', 'error');
            }
        } catch (err) {
            console.error('[Streaming] MPV error:', err);
            if (typeof showNotification === 'function') showNotification('Failed to open in MPV: ' + err.message, 'error');
        }
    } else {
        if (typeof showNotification === 'function') showNotification('MPV not available - opening in browser', 'info');
        window.open(currentStreamUrl, '_blank');
    }
}

// Handle Open in VLC button click
async function handleOpenVLCClick() {
    if (!currentStreamUrl) {
        if (typeof showNotification === 'function') showNotification('No file selected');
        return;
    }
    
    console.log('[Streaming] Open in VLC clicked, URL:', currentStreamUrl);
    
    if (window.electronAPI && typeof window.electronAPI.openVLC === 'function') {
        try {
            const result = await window.electronAPI.openVLC(currentStreamUrl);
            if (result?.success) {
                if (typeof showNotification === 'function') showNotification('Opening in VLC...', 'success');
            } else {
                if (typeof showNotification === 'function') showNotification(result?.message || 'Failed to open in VLC', 'error');
            }
        } catch (err) {
            console.error('[Streaming] VLC error:', err);
            if (typeof showNotification === 'function') showNotification('Failed to open in VLC: ' + err.message, 'error');
        }
    } else {
        // Try VLC protocol handler
        const vlcUrl = `vlc://${currentStreamUrl}`;
        if (typeof showNotification === 'function') showNotification('Trying to open in VLC...', 'info');
        window.open(vlcUrl, '_blank');
    }
}

// Initialize player button handlers
// NOTE: Button handlers are set dynamically in startStream() when the player opens
// This function is kept for backwards compatibility but does nothing
function initPlayerButtons() {
    // Handlers are now set in startStream() to avoid duplicate event listeners
    console.log('[Streaming] Player buttons will be initialized when player opens');
}

// Initialize player buttons when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPlayerButtons);
} else {
    initPlayerButtons();
}

// Fetch subtitles for player (similar to basicmode's fetchSubtitlesForPlayer)
// Fetches from Wyzie and installed Stremio subtitle addons
async function fetchSubtitlesForPlayer(tmdbId, imdbId, seasonNum, episodeNum, mediaType) {
    const subtitles = [];
    const TIMEOUT = 5000; // 5 seconds max
    
    console.log(`[Subtitles] Fetching for TMDB:${tmdbId}, S${seasonNum}E${episodeNum}, type:${mediaType}`);
    
    // Create a promise that resolves with current subtitles after timeout
    const timeoutPromise = new Promise(resolve => {
        setTimeout(() => {
            console.log('[Subtitles] Timeout reached, returning what we have');
            resolve('timeout');
        }, TIMEOUT);
    });
    
    // Fetch subtitles with timeout
    const fetchPromise = (async () => {
        const fetchPromises = [];
        
        // 1. Fetch from Wyzie
        if (tmdbId) {
            fetchPromises.push((async () => {
                try {
                    let wyzieUrl = `https://sub.wyzie.ru/search?id=${tmdbId}`;
                    if (seasonNum && episodeNum) wyzieUrl += `&season=${seasonNum}&episode=${episodeNum}`;
                    
                    console.log(`[Subtitles] Fetching from Wyzie: ${wyzieUrl}`);
                    const res = await fetch(wyzieUrl);
                    const wyzieData = await res.json();
                    
                    if (wyzieData && wyzieData.length > 0) {
                        wyzieData.forEach(sub => {
                            if (sub.url) {
                                subtitles.push({
                                    provider: 'Wyzie',
                                    name: sub.display || sub.languageName || 'Unknown',
                                    url: sub.url
                                });
                            }
                        });
                        console.log(`[Subtitles] Got ${wyzieData.length} from Wyzie`);
                    }
                } catch (e) {
                    console.warn('[Subtitles] Wyzie fetch error:', e);
                }
            })());
        }
        
        // 2. Fetch from installed Stremio addons (if available)
        fetchPromises.push((async () => {
            try {
                const API_BASE_URL = window.API_BASE_URL || 'http://localhost:6987/api';
                const addonsRes = await fetch(`${API_BASE_URL}/stremio/addons`);
                if (!addonsRes.ok) return;
                
                const addons = await addonsRes.json();
                
                const addonPromises = addons.map(async (addon) => {
                    const resources = addon.manifest?.resources || [];
                    const hasSubtitles = resources.some(r => 
                        (typeof r === 'string' && r === 'subtitles') ||
                        (typeof r === 'object' && r?.name === 'subtitles')
                    );
                    
                    if (!hasSubtitles) return;
                    
                    try {
                        let baseUrl = addon.url.replace('/manifest.json', '');
                        if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
                        
                        // Need IMDB ID for Stremio addons - try to get it if we don't have it
                        let useImdbId = imdbId;
                        if (!useImdbId && tmdbId) {
                            try {
                                const imdbRes = await fetch(`${API_BASE_URL}/tmdb-to-imdb?tmdbId=${tmdbId}&type=${mediaType}`);
                                if (imdbRes.ok) {
                                    const imdbData = await imdbRes.json();
                                    useImdbId = imdbData.imdbId;
                                }
                            } catch (e) {}
                        }
                        
                        if (!useImdbId) return;
                        
                        const resourceId = mediaType === 'tv' && seasonNum && episodeNum
                            ? `${useImdbId}:${seasonNum}:${episodeNum}`
                            : useImdbId;
                        
                        const endpoint = `${baseUrl}/subtitles/${mediaType}/${encodeURIComponent(resourceId)}.json`;
                        const res = await fetch(endpoint);
                        
                        if (res.ok) {
                            const data = await res.json();
                            const addonSubs = data.subtitles || [];
                            const addonName = addon.manifest?.name || 'Addon';
                            
                            addonSubs.forEach(sub => {
                                if (sub.url) {
                                    subtitles.push({
                                        provider: addonName,
                                        name: sub.lang || sub.language || 'Unknown',
                                        url: sub.url
                                    });
                                }
                            });
                        }
                    } catch (e) {
                        // Addon doesn't support subtitles for this content
                    }
                });
                
                await Promise.allSettled(addonPromises);
            } catch (e) {
                console.warn('[Subtitles] Addon fetch error:', e);
            }
        })());
        
        await Promise.allSettled(fetchPromises);
        return 'done';
    })();
    
    // Race between fetch and timeout
    await Promise.race([fetchPromise, timeoutPromise]);
    
    console.log(`[Subtitles] Returning ${subtitles.length} subtitles`);
    return subtitles;
}

// Export streaming functions
window.startStream = startStream;
window.handleTorrentFileUrl = handleTorrentFileUrl;
window.playDirectStream = playDirectStream;
window.copyStreamUrl = copyStreamUrl;
window.handlePlayNowClick = handlePlayNowClick;
window.handleOpenMPVClick = handleOpenMPVClick;
window.handleOpenVLCClick = handleOpenVLCClick;
window.fetchSubtitlesForPlayer = fetchSubtitlesForPlayer;

console.log('[Movies] Streaming functions loaded');

// Update watch button text based on streaming mode
function updateWatchButtonText() {
    const watchNowBtn = document.getElementById('watchNowBtn');
    const useStreamsBtn = document.getElementById('useStreamsBtn');
    if (!watchNowBtn) return;
    
    const btnTitle = watchNowBtn.querySelector('.btn-title');
    const btnSubtitle = watchNowBtn.querySelector('.btn-subtitle');
    
    // Update based on current streaming mode
    if (useStreamingMode) {
        if (btnTitle) btnTitle.textContent = 'Watch Now';
        if (btnSubtitle) btnSubtitle.textContent = 'Stream directly';
    } else {
        if (btnTitle) btnTitle.textContent = 'Find Media';
        if (btnSubtitle) btnSubtitle.textContent = 'Search torrents & streams';
    }
}

// Update both buttons based on streaming mode
function updateStreamingModeButtons() {
    const watchNowBtn = document.getElementById('watchNowBtn');
    const useStreamsBtn = document.getElementById('useStreamsBtn');
    
    // Update Watch Now button
    if (watchNowBtn) {
        const btnTitle = watchNowBtn.querySelector('.btn-title');
        const btnSubtitle = watchNowBtn.querySelector('.btn-subtitle');
        
        if (useStreamingMode) {
            if (btnTitle) btnTitle.textContent = 'Watch Now';
            if (btnSubtitle) btnSubtitle.textContent = 'Stream directly';
        } else {
            if (btnTitle) btnTitle.textContent = 'Find Media';
            if (btnSubtitle) btnSubtitle.textContent = 'Search torrents & streams';
        }
    }
    
    // Update toggle button
    if (useStreamsBtn) {
        const btnTitle = useStreamsBtn.querySelector('.btn-title');
        const btnSubtitle = useStreamsBtn.querySelector('.btn-subtitle');
        
        if (useStreamingMode) {
            // Currently in streaming mode, button should offer torrents
            if (btnTitle) btnTitle.textContent = 'Use Torrents';
            if (btnSubtitle) btnSubtitle.textContent = 'Switch to torrent sources';
        } else {
            // Currently in torrent mode, button should offer streaming
            if (btnTitle) btnTitle.textContent = 'Direct Streams';
            if (btnSubtitle) btnSubtitle.textContent = 'No downloads needed';
        }
    }
}

// Show embedded servers UI as a beautiful fullscreen overlay modal
function showEmbeddedServersUI() {
    if (!currentContent) {
        if (typeof showNotification === 'function') showNotification('No content selected', 'error');
        return;
    }
    
    // Get content info
    const tmdbId = currentContent.id;
    const mediaType = currentMediaType || 'movie';
    const season = lastSearchedSeason || currentSeason || 1;
    const episode = lastSearchedEpisode || 1;
    const title = currentContent.title || currentContent.name || 'Unknown';
    const overview = currentContent.overview || 'No description available.';
    const posterPath = currentContent.poster_path;
    const backdropPath = currentContent.backdrop_path;
    const year = (currentContent.release_date || currentContent.first_air_date || '').substring(0, 4);
    const rating = currentContent.vote_average ? Number(currentContent.vote_average).toFixed(1) : 'N/A';
    
    // Remove existing overlay if present
    const existingOverlay = document.getElementById('streamingServerOverlay');
    if (existingOverlay) existingOverlay.remove();
    
    // Create server options HTML
    let serverOptionsHtml = '';
    Object.keys(embeddedServers).forEach(serverName => {
        const selected = serverName === selectedEmbeddedServer ? 'selected' : '';
        serverOptionsHtml += `<option value="${serverName}" ${selected}>${serverName}</option>`;
    });
    
    // Create the fullscreen overlay
    const overlay = document.createElement('div');
    overlay.id = 'streamingServerOverlay';
    overlay.innerHTML = `
        <style>
            #streamingServerOverlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.95);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.3s ease;
                overflow-y: auto;
                padding: 20px;
                box-sizing: border-box;
            }
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            .streaming-modal {
                background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%);
                border-radius: 20px;
                max-width: 600px;
                width: 100%;
                box-shadow: 0 25px 80px rgba(0, 0, 0, 0.8), 0 0 40px rgba(138, 43, 226, 0.2);
                overflow: hidden;
                animation: slideUp 0.4s ease;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
            @keyframes slideUp {
                from { transform: translateY(30px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            .streaming-modal-header {
                position: relative;
                height: 200px;
                overflow: hidden;
            }
            .streaming-modal-backdrop {
                width: 100%;
                height: 100%;
                object-fit: cover;
                filter: brightness(0.4);
            }
            .streaming-modal-close {
                position: absolute;
                top: 15px;
                right: 15px;
                background: rgba(0, 0, 0, 0.6);
                border: none;
                color: white;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 1.2rem;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
                backdrop-filter: blur(10px);
            }
            .streaming-modal-close:hover {
                background: rgba(255, 255, 255, 0.2);
                transform: scale(1.1);
            }
            .streaming-modal-poster-container {
                position: absolute;
                bottom: -60px;
                left: 30px;
                display: flex;
                align-items: flex-end;
                gap: 20px;
            }
            .streaming-modal-poster {
                width: 120px;
                height: 180px;
                border-radius: 12px;
                object-fit: cover;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
                border: 3px solid rgba(255, 255, 255, 0.2);
            }
            .streaming-modal-title-area {
                padding-bottom: 10px;
            }
            .streaming-modal-title {
                font-size: 1.5rem;
                font-weight: 700;
                color: white;
                margin: 0;
                text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
            }
            .streaming-modal-meta {
                display: flex;
                gap: 15px;
                margin-top: 5px;
                font-size: 0.9rem;
                color: rgba(255, 255, 255, 0.7);
            }
            .streaming-modal-meta span {
                display: flex;
                align-items: center;
                gap: 5px;
            }
            .streaming-modal-meta .rating {
                color: #ffd700;
            }
            .streaming-modal-body {
                padding: 80px 30px 30px 30px;
            }
            .streaming-modal-overview {
                color: rgba(255, 255, 255, 0.8);
                font-size: 0.95rem;
                line-height: 1.6;
                margin-bottom: 25px;
                max-height: 100px;
                overflow-y: auto;
            }
            .streaming-modal-episode-info {
                background: rgba(138, 43, 226, 0.15);
                border: 1px solid rgba(138, 43, 226, 0.3);
                border-radius: 10px;
                padding: 12px 15px;
                margin-bottom: 20px;
                color: #b388ff;
                font-size: 0.9rem;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .streaming-modal-episode-info i {
                font-size: 1.1rem;
            }
            .streaming-server-selector {
                margin-bottom: 25px;
            }
            .streaming-server-selector label {
                display: block;
                color: rgba(255, 255, 255, 0.9);
                font-size: 0.9rem;
                font-weight: 600;
                margin-bottom: 10px;
            }
            .streaming-server-select {
                width: 100%;
                padding: 14px 18px;
                border-radius: 12px;
                background: rgba(255, 255, 255, 0.05);
                border: 2px solid rgba(255, 255, 255, 0.1);
                color: white;
                font-size: 1rem;
                cursor: pointer;
                transition: all 0.2s ease;
                appearance: none;
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
                background-repeat: no-repeat;
                background-position: right 15px center;
                background-size: 18px;
            }
            .streaming-server-select:hover {
                border-color: rgba(138, 43, 226, 0.5);
                background-color: rgba(255, 255, 255, 0.08);
            }
            .streaming-server-select:focus {
                outline: none;
                border-color: #8a2be2;
                box-shadow: 0 0 0 3px rgba(138, 43, 226, 0.2);
            }
            .streaming-server-select option {
                background: #1a1a2e;
                color: white;
                padding: 10px;
            }
            .streaming-watch-btn {
                width: 100%;
                padding: 16px 24px;
                border-radius: 12px;
                background: linear-gradient(135deg, #8a2be2 0%, #6a1b9a 100%);
                border: none;
                color: white;
                font-size: 1.1rem;
                font-weight: 600;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(138, 43, 226, 0.4);
            }
            .streaming-watch-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(138, 43, 226, 0.5);
                background: linear-gradient(135deg, #9b4dca 0%, #7b1fa2 100%);
            }
            .streaming-watch-btn:active {
                transform: translateY(0);
            }
            .streaming-watch-btn i {
                font-size: 1.2rem;
            }
            .streaming-player-container {
                margin-top: 20px;
                border-radius: 12px;
                overflow: hidden;
                background: #000;
                display: none;
            }
            .streaming-player-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 15px;
                background: rgba(0, 0, 0, 0.8);
            }
            .streaming-player-title {
                color: white;
                font-size: 0.9rem;
                font-weight: 500;
            }
            .streaming-player-close {
                background: none;
                border: none;
                color: rgba(255, 255, 255, 0.7);
                cursor: pointer;
                padding: 5px;
                transition: color 0.2s;
            }
            .streaming-player-close:hover {
                color: white;
            }
            .streaming-player-frame {
                width: 100%;
                aspect-ratio: 16/9;
                border: none;
            }
            .streaming-torrent-fallback {
                text-align: center;
                margin-top: 15px;
                padding-top: 15px;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
            }
            .streaming-torrent-fallback button {
                background: transparent;
                border: 1px solid rgba(255, 255, 255, 0.3);
                color: rgba(255, 255, 255, 0.7);
                padding: 10px 20px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 0.9rem;
                transition: all 0.2s ease;
            }
            .streaming-torrent-fallback button:hover {
                background: rgba(255, 255, 255, 0.1);
                color: white;
                border-color: rgba(255, 255, 255, 0.5);
            }
        </style>
        <div class="streaming-modal">
            <div class="streaming-modal-header">
                <img class="streaming-modal-backdrop" src="${backdropPath ? `https://image.tmdb.org/t/p/w780${backdropPath}` : (posterPath ? `https://image.tmdb.org/t/p/w780${posterPath}` : '')}" alt="">
                <button class="streaming-modal-close" id="streamingModalClose">
                    <i class="fas fa-times"></i>
                </button>
                <div class="streaming-modal-poster-container">
                    <img class="streaming-modal-poster" src="${posterPath ? `https://image.tmdb.org/t/p/w342${posterPath}` : 'https://via.placeholder.com/120x180?text=No+Poster'}" alt="${title}">
                    <div class="streaming-modal-title-area">
                        <h2 class="streaming-modal-title">${title}</h2>
                        <div class="streaming-modal-meta">
                            ${year ? `<span><i class="fas fa-calendar"></i> ${year}</span>` : ''}
                            <span class="rating"><i class="fas fa-star"></i> ${rating}</span>
                            <span><i class="fas fa-film"></i> ${mediaType === 'tv' ? 'TV Show' : 'Movie'}</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="streaming-modal-body">
                <p class="streaming-modal-overview">${overview}</p>
                ${mediaType === 'tv' ? `
                    <div class="streaming-modal-episode-info">
                        <i class="fas fa-tv"></i>
                        <span>Season ${season}, Episode ${episode}</span>
                    </div>
                ` : ''}
                <div class="streaming-server-selector">
                    <label><i class="fas fa-server"></i> Select Streaming Server</label>
                    <select class="streaming-server-select" id="streamingServerSelect">
                        ${serverOptionsHtml}
                    </select>
                </div>
                <button class="streaming-watch-btn" id="streamingWatchBtn">
                    <i class="fas fa-play"></i>
                    Watch Now
                </button>
                <div class="streaming-player-container" id="streamingPlayerContainer">
                    <div class="streaming-player-header">
                        <span class="streaming-player-title" id="streamingPlayerTitle"></span>
                        <button class="streaming-player-close" id="streamingPlayerClose">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <iframe class="streaming-player-frame" id="streamingPlayerFrame" allowfullscreen></iframe>
                </div>
                <div class="streaming-torrent-fallback">
                    <button id="streamingUseTorrents">
                        <i class="fas fa-magnet"></i> Use Torrents Instead
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Event listeners
    const closeBtn = document.getElementById('streamingModalClose');
    const serverSelect = document.getElementById('streamingServerSelect');
    const watchBtn = document.getElementById('streamingWatchBtn');
    const playerContainer = document.getElementById('streamingPlayerContainer');
    const playerFrame = document.getElementById('streamingPlayerFrame');
    const playerTitle = document.getElementById('streamingPlayerTitle');
    const playerClose = document.getElementById('streamingPlayerClose');
    const useTorrentsBtn = document.getElementById('streamingUseTorrents');
    
    // Close modal
    closeBtn.addEventListener('click', () => {
        if (playerFrame) playerFrame.src = 'about:blank';
        overlay.remove();
    });
    
    // Close on backdrop click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            if (playerFrame) playerFrame.src = 'about:blank';
            overlay.remove();
        }
    });
    
    // Server selection change
    serverSelect.addEventListener('change', (e) => {
        selectedEmbeddedServer = e.target.value;
        localStorage.setItem('selectedEmbeddedServer', selectedEmbeddedServer);
    });
    
    // Watch button
    watchBtn.addEventListener('click', () => {
        const server = embeddedServers[selectedEmbeddedServer];
        if (!server) {
            if (typeof showNotification === 'function') showNotification('Server not found', 'error');
            return;
        }
        
        const url = server(mediaType, tmdbId, season, episode);
        console.log('[Movies] Opening embedded server:', selectedEmbeddedServer, url);
        
        playerFrame.src = url;
        playerContainer.style.display = 'block';
        playerTitle.textContent = `${title} - ${selectedEmbeddedServer}`;
        
        // Scroll player into view
        playerContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    
    // Close player
    playerClose.addEventListener('click', () => {
        playerFrame.src = 'about:blank';
        playerContainer.style.display = 'none';
    });
    
    // Use torrents fallback
    useTorrentsBtn.addEventListener('click', () => {
        overlay.remove();
        useStreamingMode = false;
        localStorage.setItem('useStreamingServers', 'false');
        updateStreamingModeButtons();
        showTorrents(null, season, episode);
    });
    
    // ESC key to close
    const handleEsc = (e) => {
        if (e.key === 'Escape') {
            if (playerFrame) playerFrame.src = 'about:blank';
            overlay.remove();
            document.removeEventListener('keydown', handleEsc);
        }
    };
    document.addEventListener('keydown', handleEsc);
}

// Initialize button states on page load
function initStreamingModeButtons() {
    useStreamingMode = localStorage.getItem('useStreamingServers') === 'true';
    updateStreamingModeButtons();
}

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initializeModalButtons();
        initStreamingModeButtons();
    });
} else {
    initializeModalButtons();
    initStreamingModeButtons();
}

// Export functions
window.initializeModalButtons = initializeModalButtons;
window.updateWatchButtonText = updateWatchButtonText;
window.updateStreamingModeButtons = updateStreamingModeButtons;
window.showEmbeddedServersUI = showEmbeddedServersUI;
window.embeddedServers = embeddedServers;

console.log('[Movies] Modal button handlers initialized');


// ===== STREMIO ADDON INTEGRATION =====

// Populate addon buttons in the details modal
async function populateAddonButtons() {
    const container = document.getElementById('addonProviderButtons');
    if (!container) {
        console.log('[Addons] addonProviderButtons container not found');
        return;
    }
    
    container.innerHTML = ''; // Clear existing addon buttons
    
    try {
        // Get installed addons using the function from settings.js
        if (typeof window.getInstalledAddons !== 'function') {
            console.log('[Addons] getInstalledAddons function not available');
            return;
        }
        
        const allAddons = await window.getInstalledAddons();
        console.log('[Addons] Found', allAddons.length, 'installed addons');
        
        // Filter to only show addons that provide 'stream' resources
        const streamAddons = allAddons.filter(addon => {
            const resources = addon.manifest?.resources || [];
            const hasStream = resources.some(r => {
                if (typeof r === 'string') return r === 'stream';
                if (typeof r === 'object' && r !== null) return r.name === 'stream';
                return false;
            });
            const hasStreamDirect = Array.isArray(resources) && resources.includes('stream');
            return hasStream || hasStreamDirect;
        });
        
        console.log('[Addons] Found', streamAddons.length, 'stream-capable addons');
        
        // Create buttons for each addon
        streamAddons.forEach(addon => {
            const addonId = addon.manifest?.id || addon.id;
            const addonName = addon.manifest?.name || addon.name || 'Unknown';
            const addonLogo = addon.manifest?.logo || addon.logo;
            
            const btn = document.createElement('button');
            btn.className = 'provider-btn';
            btn.dataset.provider = addonId;
            btn.dataset.isAddon = 'true';
            
            // Add logo if available
            if (addonLogo) {
                btn.innerHTML = `<img src="${addonLogo}" style="width: 16px; height: 16px; object-fit: contain; margin-right: 4px; vertical-align: middle;"> ${addonName}`;
            } else {
                btn.innerHTML = `<i class="fas fa-puzzle-piece"></i> ${addonName}`;
            }
            
            // Add click handler
            btn.addEventListener('click', () => {
                // Update active state
                document.querySelectorAll('.provider-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Update selected provider
                selectedProvider = addonId;
                window.selectedProvider = selectedProvider;
                console.log('[Provider] Switched to addon:', addonId);
                
                // Show searching indicator
                const tl = document.getElementById('torrentsList');
                if (tl) {
                    tl.innerHTML = `<div class="loading"><i class="fas fa-spinner fa-spin"></i> Searching ${addonName}...</div>`;
                }
                
                // Fetch streams from addon
                torrentsLoaded = false;
                fetchAddonProviderStreams(addon, lastSearchedSeason, lastSearchedEpisode);
            });
            
            container.appendChild(btn);
        });
        
    } catch (e) {
        console.error('[Addons] Error populating addon buttons:', e);
    }
}

// Fetch streams from a Stremio addon
async function fetchAddonProviderStreams(addon, season, episode) {
    const torrentsList = document.getElementById('torrentsList');
    const addonName = addon.manifest?.name || addon.name || 'Addon';
    
    if (torrentsList) {
        torrentsList.innerHTML = `<div class="loading"><i class="fas fa-spinner fa-spin"></i> Searching ${addonName}...</div>`;
    }
    
    try {
        // Get IMDB ID from TMDB
        const tmdbId = currentContent?.id;
        const mediaType = currentMediaType;
        
        if (!tmdbId) {
            throw new Error('No content selected');
        }
        
        // Fetch external IDs to get IMDB ID
        const externalIdsUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}/external_ids?api_key=${TMDB_API_KEY}`;
        const externalIdsRes = await fetch(externalIdsUrl);
        if (!externalIdsRes.ok) throw new Error('Failed to get IMDB ID from TMDB');
        
        const externalIds = await externalIdsRes.json();
        const imdbId = externalIds.imdb_id;
        
        if (!imdbId) {
            throw new Error('No IMDB ID found for this content');
        }
        
        // Construct Stremio ID
        const isTV = mediaType === 'tv';
        let stremioId;
        if (isTV) {
            const s = season || currentSeason || 1;
            const e = episode || 1;
            stremioId = `${imdbId}:${s}:${e}`;
        } else {
            stremioId = imdbId;
        }
        
        const resourceType = isTV ? 'series' : 'movie';
        console.log(`[Addons] Fetching streams from ${addonName} for ${resourceType}/${stremioId}`);
        
        // Use the fetchAddonStreams function from settings.js
        if (typeof window.fetchAddonStreams !== 'function') {
            throw new Error('fetchAddonStreams function not available');
        }
        
        const streams = await window.fetchAddonStreams(addon, resourceType, stremioId);
        console.log(`[Addons] Got ${streams.length} streams from ${addonName}`);
        
        if (streams.length === 0) {
            if (torrentsList) {
                torrentsList.innerHTML = `<div class="empty-message"><i class="fas fa-info-circle"></i> No streams found from ${addonName}</div>`;
            }
            return;
        }
        
        // Parse streams to standard format
        const torrents = streams.map(stream => {
            const parsed = window.parseAddonStream(stream, addonName);
            
            // Determine if this is a direct URL or magnet link
            const isMagnet = parsed.magnet && parsed.magnet.startsWith('magnet:');
            const isDirectUrl = parsed.magnet && !parsed.magnet.startsWith('magnet:');
            
            return {
                title: parsed.title,
                magnet: isMagnet ? parsed.magnet : null,
                url: isDirectUrl ? parsed.magnet : (stream.url && !stream.url.startsWith('magnet:') ? stream.url : null),
                seeders: parsed.seeders,
                size: parsed.sizeBytes,
                indexer: parsed.indexer,
                quality: parsed.quality
            };
        });
        
        // Display torrents
        displayTorrents(torrents, season, episode);
        
    } catch (error) {
        console.error(`[Addons] Error fetching from ${addonName}:`, error);
        if (torrentsList) {
            torrentsList.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-triangle"></i> ${addonName} Error: ${error.message}</div>`;
        }
    }
}

// Check if a provider is an addon
function isAddonProvider(providerId) {
    const btn = document.querySelector(`.provider-btn[data-provider="${providerId}"]`);
    return btn && btn.dataset.isAddon === 'true';
}

// Get addon by provider ID
async function getAddonByProviderId(providerId) {
    if (typeof window.getInstalledAddons !== 'function') return null;
    
    const addons = await window.getInstalledAddons();
    return addons.find(a => (a.manifest?.id || a.id) === providerId);
}

// Export addon functions
window.populateAddonButtons = populateAddonButtons;
window.fetchAddonProviderStreams = fetchAddonProviderStreams;
window.isAddonProvider = isAddonProvider;
window.getAddonByProviderId = getAddonByProviderId;

console.log('[Movies] Addon integration loaded');
