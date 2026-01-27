// Anime Module

// Helper to get API base URL
function getAnimeApiUrl(endpoint) {
    const baseUrl = window.API_BASE_URL || 'http://localhost:6987/api';
    if (endpoint.startsWith('/')) {
        return baseUrl + endpoint;
    }
    return baseUrl + '/' + endpoint;
}

let animeList = [];
let currentAnime = null;
let animeOffset = 0;
let animeIsLoading = false;
let animeHasMore = true;
let animeIsSearching = false;
let animeSearchQuery = '';
let animeBaseUrl = (window.API_BASE_URL || 'http://localhost:6987/api').replace('/api', '') + '/anime';
let animeInitialized = false;

async function initializeAnime() {
    // Prevent re-initialization
    if (animeInitialized) {
        console.log('[Anime] Already initialized, skipping');
        return;
    }
    animeInitialized = true;
    console.log('[Anime] Initializing anime module...');
    
    const animeSearchInput = document.getElementById('animeSearchInput');
    const animeGrid = document.getElementById('animeGrid');
    const animeLoadingIndicator = document.getElementById('animeLoadingIndicator');
    const animeDetailsModal = document.getElementById('animeDetailsModal');
    const animeModalClose = document.getElementById('animeModalClose');
    const animeFindTorrentsBtn = document.getElementById('animeFindTorrentsBtn');
    const animeTorrentsContainer = document.getElementById('animeTorrentsContainer');
    const animeRefreshTorrents = document.getElementById('animeRefreshTorrents');
    const animeTorrentKeywordFilter = document.getElementById('animeTorrentKeywordFilter');
    
    let searchTimeout = null;
    
    // Load trending anime on init
    loadTrendingAnime();
    
    // Setup infinite scroll
    const mainElement = document.querySelector('main');
    if (mainElement) {
        mainElement.addEventListener('scroll', () => {
            const animePage = document.getElementById('anime-page');
            if (!animePage || animePage.style.display === 'none') return;
            
            const scrollBottom = mainElement.scrollTop + mainElement.clientHeight;
            const threshold = mainElement.scrollHeight - 300;
            
            if (scrollBottom >= threshold && !animeIsLoading && animeHasMore) {
                if (animeIsSearching) {
                    searchAnime(animeSearchQuery, true);
                } else {
                    loadTrendingAnime(true);
                }
            }
        });
    }
    
    // Search functionality
    if (animeSearchInput) {
        animeSearchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            const query = animeSearchInput.value.trim();
            
            if (!query) {
                animeIsSearching = false;
                animeSearchQuery = '';
                animeOffset = 0;
                animeHasMore = true;
                loadTrendingAnime();
                return;
            }
            
            searchTimeout = setTimeout(() => {
                animeIsSearching = true;
                animeSearchQuery = query;
                animeOffset = 0;
                animeHasMore = true;
                searchAnime(query);
            }, 500);
        });
        
        animeSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = animeSearchInput.value.trim();
                if (query) {
                    animeIsSearching = true;
                    animeSearchQuery = query;
                    animeOffset = 0;
                    animeHasMore = true;
                    searchAnime(query);
                }
            }
        });
    }
    
    // Modal close
    if (animeModalClose) {
        animeModalClose.addEventListener('click', () => {
            if (animeDetailsModal) animeDetailsModal.classList.remove('active');
            if (animeTorrentsContainer) animeTorrentsContainer.style.display = 'none';
            const animeRealmSourcesContainer = document.getElementById('animeRealmSourcesContainer');
            if (animeRealmSourcesContainer) animeRealmSourcesContainer.style.display = 'none';
            const animeRealmSourcesList = document.getElementById('animeRealmSourcesList');
            if (animeRealmSourcesList) animeRealmSourcesList.innerHTML = '';
            const animeTorrentsList = document.getElementById('animeTorrentsList');
            if (animeTorrentsList) animeTorrentsList.innerHTML = '';
        });
    }
    
    if (animeDetailsModal) {
        animeDetailsModal.addEventListener('click', (e) => {
            if (e.target === animeDetailsModal) {
                animeDetailsModal.classList.remove('active');
                if (animeTorrentsContainer) animeTorrentsContainer.style.display = 'none';
                const animeRealmSourcesContainer = document.getElementById('animeRealmSourcesContainer');
                if (animeRealmSourcesContainer) animeRealmSourcesContainer.style.display = 'none';
                const animeRealmSourcesList = document.getElementById('animeRealmSourcesList');
                if (animeRealmSourcesList) animeRealmSourcesList.innerHTML = '';
                const animeTorrentsList = document.getElementById('animeTorrentsList');
                if (animeTorrentsList) animeTorrentsList.innerHTML = '';
            }
        });
    }
    
    // Find torrents button
    if (animeFindTorrentsBtn) {
        animeFindTorrentsBtn.addEventListener('click', async () => {
            if (!currentAnime) return;
            if (animeTorrentsContainer) animeTorrentsContainer.style.display = 'block';
            const animeRealmSourcesContainer = document.getElementById('animeRealmSourcesContainer');
            if (animeRealmSourcesContainer) animeRealmSourcesContainer.style.display = 'none';
            if (typeof loadAnimeTorrents === 'function') {
                await loadAnimeTorrents(currentAnime.title.romaji || currentAnime.title.english);
            }
        });
    }
    
    // Realm sources button
    const animeRealmSourcesBtn = document.getElementById('animeRealmSourcesBtn');
    const animeDirectStreamBtn = document.getElementById('animeDirectStreamBtn');
    const animeRealmSourcesContainer = document.getElementById('animeRealmSourcesContainer');
    const animeRealmSourcesList = document.getElementById('animeRealmSourcesList');
    const animeRefreshRealmSources = document.getElementById('animeRefreshRealmSources');
    
    // Direct Stream button
    if (animeDirectStreamBtn) {
        animeDirectStreamBtn.addEventListener('click', () => {
            if (!currentAnime) return;
            
            const seasonSelector = document.getElementById('animeSeasonSelector');
            const episodeSelector = document.getElementById('animeEpisodeSelector');
            let episodeNumber = episodeSelector ? episodeSelector.value : null;
            const seasonNumber = seasonSelector ? seasonSelector.value : null;
            
            if (!episodeNumber || currentAnime.episodes === 1 || currentAnime.format === 'MOVIE') {
                episodeNumber = '1';
            } else if (seasonNumber && typeof calculateAbsoluteEpisode === 'function') {
                episodeNumber = calculateAbsoluteEpisode(seasonNumber, episodeNumber).toString();
            }
            
            const anilistId = currentAnime.id;
            const realmUrl = `https://www.animerealms.org/en/watch/${anilistId}/${episodeNumber}`;
            
            console.log('[Direct Stream] URL:', realmUrl);
            
            if (animeRealmSourcesList && animeRealmSourcesContainer) {
                animeRealmSourcesContainer.style.display = 'block';
                if (animeTorrentsContainer) animeTorrentsContainer.style.display = 'none';
                
                animeRealmSourcesList.innerHTML = `
                    <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
                        <h3 style="color: #10b981; margin: 0 0 1rem 0; font-size: 1.1rem;">
                            <i class="fas fa-external-link-alt"></i> Direct Stream
                        </h3>
                        <iframe src="${realmUrl}" style="width: 100%; height: 600px; border: none; border-radius: 6px; background: #000;" allowfullscreen="true" allow="fullscreen; accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture;"></iframe>
                    </div>
                `;
            }
        });
    }
    
    if (animeRealmSourcesBtn) {
        animeRealmSourcesBtn.addEventListener('click', async () => {
            if (!currentAnime) return;
            const seasonSelector = document.getElementById('animeSeasonSelector');
            const episodeSelector = document.getElementById('animeEpisodeSelector');
            let episodeNumber = episodeSelector ? episodeSelector.value : null;
            const seasonNumber = seasonSelector ? seasonSelector.value : null;
            
            if (!episodeNumber || currentAnime.episodes === 1 || currentAnime.format === 'MOVIE') {
                episodeNumber = '1';
            } else if (seasonNumber && typeof calculateAbsoluteEpisode === 'function') {
                episodeNumber = calculateAbsoluteEpisode(seasonNumber, episodeNumber).toString();
            }
            
            if (animeRealmSourcesContainer) animeRealmSourcesContainer.style.display = 'block';
            if (animeTorrentsContainer) animeTorrentsContainer.style.display = 'none';
            if (typeof loadRealmSources === 'function') {
                await loadRealmSources(currentAnime.id, episodeNumber);
            }
        });
    }
    
    // Refresh Realm sources
    if (animeRefreshRealmSources) {
        animeRefreshRealmSources.addEventListener('click', async () => {
            if (!currentAnime) return;
            const seasonSelector = document.getElementById('animeSeasonSelector');
            const episodeSelector = document.getElementById('animeEpisodeSelector');
            let episodeNumber = episodeSelector ? episodeSelector.value : null;
            const seasonNumber = seasonSelector ? seasonSelector.value : null;
            
            if (!episodeNumber || currentAnime.episodes === 1 || currentAnime.format === 'MOVIE') {
                episodeNumber = '1';
            } else if (seasonNumber && typeof calculateAbsoluteEpisode === 'function') {
                episodeNumber = calculateAbsoluteEpisode(seasonNumber, episodeNumber).toString();
            }
            
            if (typeof loadRealmSources === 'function') {
                await loadRealmSources(currentAnime.id, episodeNumber);
            }
        });
    }
    
    // Refresh torrents
    if (animeRefreshTorrents) {
        animeRefreshTorrents.addEventListener('click', async () => {
            if (!currentAnime) return;
            if (typeof loadAnimeTorrents === 'function') {
                await loadAnimeTorrents(currentAnime.title.romaji || currentAnime.title.english);
            }
        });
    }
    
    // Torrent keyword filter
    if (animeTorrentKeywordFilter) {
        animeTorrentKeywordFilter.addEventListener('input', () => {
            if (typeof filterAnimeTorrents === 'function') filterAnimeTorrents();
        });
    }
    
    // Custom search functionality
    const animeCustomSearchInput = document.getElementById('animeCustomSearchInput');
    const animeCustomSearchBtn = document.getElementById('animeCustomSearchBtn');
    
    if (animeCustomSearchBtn) {
        animeCustomSearchBtn.addEventListener('click', async () => {
            const query = animeCustomSearchInput ? animeCustomSearchInput.value.trim() : '';
            if (query && typeof searchAnimeCustomQuery === 'function') {
                await searchAnimeCustomQuery(query);
            }
        });
    }
    
    if (animeCustomSearchInput) {
        animeCustomSearchInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                const query = animeCustomSearchInput.value.trim();
                if (query && typeof searchAnimeCustomQuery === 'function') {
                    await searchAnimeCustomQuery(query);
                }
            }
        });
    }
}

async function loadTrendingAnime(append = false) {
    if (animeIsLoading) return;
    animeIsLoading = true;
    
    const animeGrid = document.getElementById('animeGrid');
    const animeLoadingIndicator = document.getElementById('animeLoadingIndicator');
    
    if (!append && animeGrid) {
        animeGrid.innerHTML = '';
        animeOffset = 0;
    }
    
    if (animeLoadingIndicator) animeLoadingIndicator.style.display = 'block';
    
    try {
        const query = `
            query ($page: Int, $perPage: Int) {
                Page(page: $page, perPage: $perPage) {
                    media(type: ANIME, sort: TRENDING_DESC) {
                        id
                        title {
                            romaji
                            english
                        }
                        coverImage {
                            large
                        }
                        bannerImage
                        averageScore
                        episodes
                        format
                        genres
                        seasonYear
                        description
                    }
                }
            }
        `;
        
        const page = Math.floor(animeOffset / 20) + 1;
        const variables = { page, perPage: 20 };
        
        const response = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ query, variables })
        });
        
        const data = await response.json();
        const anime = data.data.Page.media;
        console.log('[Anime] Loaded', anime.length, 'anime items');
        
        if (append) {
            animeList = [...animeList, ...anime];
        } else {
            animeList = anime;
        }
        
        if (anime.length < 20) {
            animeHasMore = false;
        }
        
        if (animeGrid) {
            console.log('[Anime] Adding cards to grid:', animeGrid);
            anime.forEach(item => {
                const card = createAnimeCard(item);
                animeGrid.appendChild(card);
            });
            console.log('[Anime] Grid now has', animeGrid.children.length, 'children');
        } else {
            console.error('[Anime] animeGrid element not found!');
        }
        
        animeOffset += anime.length;
    } catch (error) {
        console.error('Error loading trending anime:', error);
    } finally {
        if (animeLoadingIndicator) animeLoadingIndicator.style.display = 'none';
        animeIsLoading = false;
    }
}

async function searchAnime(query, append = false) {
    if (animeIsLoading) return;
    animeIsLoading = true;
    
    const animeGrid = document.getElementById('animeGrid');
    const animeLoadingIndicator = document.getElementById('animeLoadingIndicator');
    
    if (!append && animeGrid) {
        animeGrid.innerHTML = '';
        animeOffset = 0;
    }
    
    if (animeLoadingIndicator) animeLoadingIndicator.style.display = 'block';
    
    try {
        const graphqlQuery = `
            query ($search: String, $page: Int, $perPage: Int) {
                Page(page: $page, perPage: $perPage) {
                    media(type: ANIME, search: $search, sort: POPULARITY_DESC) {
                        id
                        title {
                            romaji
                            english
                        }
                        coverImage {
                            large
                        }
                        bannerImage
                        averageScore
                        episodes
                        format
                        genres
                        seasonYear
                        description
                    }
                }
            }
        `;
        
        const page = Math.floor(animeOffset / 20) + 1;
        const variables = { search: query, page, perPage: 20 };
        
        const response = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ query: graphqlQuery, variables })
        });
        
        const data = await response.json();
        const anime = data.data.Page.media;
        
        if (append) {
            animeList = [...animeList, ...anime];
        } else {
            animeList = anime;
        }
        
        if (anime.length < 20) {
            animeHasMore = false;
        }
        
        if (animeGrid) {
            anime.forEach(item => {
                const card = createAnimeCard(item);
                animeGrid.appendChild(card);
            });
        }
        
        animeOffset += anime.length;
    } catch (error) {
        console.error('Error searching anime:', error);
    } finally {
        if (animeLoadingIndicator) animeLoadingIndicator.style.display = 'none';
        animeIsLoading = false;
    }
}

function createAnimeCard(anime) {
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.style.cursor = 'pointer';
    card.style.position = 'relative';
    card.style.zIndex = '1';
    
    const title = anime.title.english || anime.title.romaji;
    const coverImage = anime.coverImage.large || '/placeholder.jpg';
    const rating = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : 'N/A';
    const year = anime.seasonYear || 'N/A';
    
    card.innerHTML = `
        <img loading="lazy" decoding="async" src="${coverImage}" alt="${title}" class="movie-poster">
        <div class="movie-info">
            <h3 class="movie-title">${title}</h3>
            <p class="movie-year">${year}</p>
        </div>
        <div class="movie-rating">
            <i class="fas fa-star"></i> ${rating}
        </div>
    `;
    
    // Store anime data on the card element for debugging
    card.dataset.animeId = anime.id;
    card.dataset.animeTitle = title;
    
    // Use onclick with explicit window reference
    card.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('[Anime] Card clicked:', title, 'ID:', anime.id);
        
        // Call showAnimeDetails - it's defined in this file
        if (typeof window.showAnimeDetails === 'function') {
            window.showAnimeDetails(anime);
        } else {
            console.error('[Anime] showAnimeDetails not found on window!');
            // Try calling it directly
            showAnimeDetails(anime);
        }
    };
    
    console.log('[Anime] Created card for:', title, 'with onclick:', typeof card.onclick);
    return card;
}

// Export functions
window.initializeAnime = initializeAnime;
window.loadTrendingAnime = loadTrendingAnime;
window.searchAnime = searchAnime;
window.createAnimeCard = createAnimeCard;

// Export state using getters/setters
Object.defineProperty(window, 'currentAnime', {
    get: function() { return currentAnime; },
    set: function(val) { currentAnime = val; }
});

// ===== ANIME DETAILS MODAL =====

function showAnimeDetails(anime) {
    console.log('[Anime] showAnimeDetails called with:', anime?.title?.english || anime?.title?.romaji);
    currentAnime = anime;
    const animeDetailsModal = document.getElementById('animeDetailsModal');
    console.log('[Anime] Modal element:', animeDetailsModal);
    const animeModalTitle = document.getElementById('animeModalTitle');
    const animeModalPoster = document.getElementById('animeModalPoster');
    const animeModalBackdrop = document.getElementById('animeModalBackdrop');
    const animeModalRating = document.getElementById('animeModalRating');
    const animeModalYear = document.getElementById('animeModalYear');
    const animeModalEpisodes = document.getElementById('animeModalEpisodes');
    const animeModalGenres = document.getElementById('animeModalGenres');
    const animeModalOverview = document.getElementById('animeModalOverview');
    const animeTorrentsContainer = document.getElementById('animeTorrentsContainer');
    const animeRealmSourcesContainer = document.getElementById('animeRealmSourcesContainer');
    const animeRealmSourcesList = document.getElementById('animeRealmSourcesList');
    const animeSeasonEpisodeContainer = document.getElementById('animeSeasonEpisodeContainer');
    
    // Clear previous content
    const animeTorrentsList = document.getElementById('animeTorrentsList');
    if (animeTorrentsList) animeTorrentsList.innerHTML = '';
    if (animeRealmSourcesList) animeRealmSourcesList.innerHTML = '';
    
    // Clear stored subtitles from previous anime
    Object.keys(window).forEach(key => {
        if (key.startsWith('realmSubtitles_')) {
            delete window[key];
        }
    });
    
    const title = anime.title.english || anime.title.romaji;
    const rating = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : 'N/A';
    const year = anime.seasonYear || 'N/A';
    const episodes = anime.episodes ? `${anime.episodes} Episodes` : 'N/A';
    const genres = anime.genres ? anime.genres.join(', ') : 'N/A';
    const description = anime.description ? anime.description.replace(/<[^>]*>/g, '') : 'No description available.';
    
    if (animeModalTitle) animeModalTitle.textContent = title;
    if (animeModalPoster) animeModalPoster.src = anime.coverImage.large || '/placeholder.jpg';
    if (animeModalBackdrop) animeModalBackdrop.src = anime.bannerImage || anime.coverImage.large || '/placeholder.jpg';
    if (animeModalRating) animeModalRating.textContent = rating;
    if (animeModalYear) animeModalYear.textContent = year;
    if (animeModalEpisodes) animeModalEpisodes.textContent = episodes;
    if (animeModalGenres) animeModalGenres.textContent = genres;
    if (animeModalOverview) animeModalOverview.textContent = description;
    
    // Check if it's a series (has episodes) or a movie
    const isMovie = !anime.episodes || anime.episodes === 1 || anime.format === 'MOVIE';
    
    if (animeSeasonEpisodeContainer) {
        if (isMovie) {
            // Hide season/episode selector for movies
            animeSeasonEpisodeContainer.style.display = 'none';
        } else {
            // Show season/episode selector for series
            animeSeasonEpisodeContainer.style.display = 'block';
            setupAnimeSeasonEpisodeSelectors(anime.episodes);
        }
    }
    
    if (animeTorrentsContainer) animeTorrentsContainer.style.display = 'none';
    if (animeRealmSourcesContainer) animeRealmSourcesContainer.style.display = 'none';
    if (animeDetailsModal) {
        console.log('[Anime] Adding active class to modal');
        animeDetailsModal.classList.add('active');
        console.log('[Anime] Modal classes after:', animeDetailsModal.className);
    } else {
        console.error('[Anime] Modal element not found!');
    }
}

function setupAnimeSeasonEpisodeSelectors(totalEpisodes) {
    const seasonSelector = document.getElementById('animeSeasonSelector');
    const episodeSelector = document.getElementById('animeEpisodeSelector');
    
    if (!seasonSelector || !episodeSelector) return;
    
    // Clear existing options
    seasonSelector.innerHTML = '<option value="">All Seasons</option>';
    episodeSelector.innerHTML = '<option value="">All Episodes</option>';
    
    // Remove old event listeners by cloning and replacing
    const newSeasonSelector = seasonSelector.cloneNode(false);
    const newEpisodeSelector = episodeSelector.cloneNode(false);
    
    const defaultSeasonOption = document.createElement('option');
    defaultSeasonOption.value = '';
    defaultSeasonOption.textContent = 'All Seasons';
    defaultSeasonOption.style.background = '#1a1a2e';
    defaultSeasonOption.style.color = 'var(--light)';
    newSeasonSelector.appendChild(defaultSeasonOption);
    
    const defaultEpisodeOption = document.createElement('option');
    defaultEpisodeOption.value = '';
    defaultEpisodeOption.textContent = 'All Episodes';
    defaultEpisodeOption.style.background = '#1a1a2e';
    defaultEpisodeOption.style.color = 'var(--light)';
    newEpisodeSelector.appendChild(defaultEpisodeOption);
    
    seasonSelector.parentNode.replaceChild(newSeasonSelector, seasonSelector);
    episodeSelector.parentNode.replaceChild(newEpisodeSelector, episodeSelector);
    
    // Estimate number of seasons (typical anime season is ~12-13 or 24-26 episodes)
    const estimatedSeasons = totalEpisodes ? Math.min(Math.ceil(totalEpisodes / 12), 4) : 1;
    
    // Populate season selector
    for (let i = 1; i <= estimatedSeasons; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `Season ${i}`;
        option.style.background = '#1a1a2e';
        option.style.color = 'var(--light)';
        option.style.fontWeight = '500';
        newSeasonSelector.appendChild(option);
    }
    
    // Populate episode selector (up to total episodes or 100, whichever is smaller)
    const maxEpisodes = totalEpisodes ? Math.min(totalEpisodes, 100) : 50;
    for (let i = 1; i <= maxEpisodes; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `Episode ${i}`;
        option.style.background = '#1a1a2e';
        option.style.color = 'var(--light)';
        option.style.fontWeight = '500';
        newEpisodeSelector.appendChild(option);
    }
    
    // Add event listeners
    newSeasonSelector.addEventListener('change', () => {
        const animeTorrentsContainer = document.getElementById('animeTorrentsContainer');
        if (animeTorrentsContainer && animeTorrentsContainer.style.display !== 'none') {
            loadAnimeTorrents(currentAnime.title.romaji || currentAnime.title.english);
        }
    });
    
    newEpisodeSelector.addEventListener('change', () => {
        const animeTorrentsContainer = document.getElementById('animeTorrentsContainer');
        if (animeTorrentsContainer && animeTorrentsContainer.style.display !== 'none') {
            loadAnimeTorrents(currentAnime.title.romaji || currentAnime.title.english);
        }
    });
}

function calculateAbsoluteEpisode(season, episode) {
    // Simple calculation: assume 12 episodes per season
    const seasonNum = parseInt(season) || 1;
    const episodeNum = parseInt(episode) || 1;
    return ((seasonNum - 1) * 12) + episodeNum;
}

function generateAnimeSearchQueries(animeTitle, season, episode) {
    const queries = [];
    const cleanTitle = animeTitle.replace(/[^\w\s]/g, ' ').trim();
    
    if (season && episode) {
        // Specific episode search
        const seasonStr = String(season).padStart(2, '0');
        const episodeStr = String(episode).padStart(2, '0');
        queries.push(`${cleanTitle} S${seasonStr}E${episodeStr}`);
        queries.push(`${cleanTitle} ${episode}`);
        queries.push(`${cleanTitle} Episode ${episode}`);
    } else if (season) {
        // Season search
        const seasonStr = String(season).padStart(2, '0');
        queries.push(`${cleanTitle} S${seasonStr}`);
        queries.push(`${cleanTitle} Season ${season}`);
    } else {
        // General search
        queries.push(cleanTitle);
        queries.push(`${cleanTitle} 1080p`);
    }
    
    return queries;
}

async function loadAnimeTorrents(animeTitle) {
    const animeTorrentsList = document.getElementById('animeTorrentsList');
    const seasonSelector = document.getElementById('animeSeasonSelector');
    const episodeSelector = document.getElementById('animeEpisodeSelector');
    
    if (!animeTorrentsList) return;
    
    const selectedSeason = seasonSelector ? seasonSelector.value : '';
    const selectedEpisode = episodeSelector ? episodeSelector.value : '';
    
    // Generate search queries with multiple variants
    const searchQueries = generateAnimeSearchQueries(animeTitle, selectedSeason, selectedEpisode);
    
    // Show loading state
    animeTorrentsList.innerHTML = `<div class="loading"><i class="fas fa-spinner fa-spin"></i> Searching Nyaa with ${searchQueries.length} query variants...</div>`;
    
    try {
        // Collect all results first
        const allTorrents = [];
        const seenMagnets = new Set();
        
        // Execute all searches in parallel
        const searchResults = await Promise.all(
            searchQueries.map(async (query) => {
                try {
                    const response = await fetch(`${animeBaseUrl}/api/${encodeURIComponent(query)}`);
                    const data = await response.json();
                    return data.results || [];
                } catch (err) {
                    console.error(`Error searching for "${query}":`, err);
                    return [];
                }
            })
        );
        
        // Combine all results
        searchResults.forEach(results => {
            results.forEach(torrent => {
                if (!seenMagnets.has(torrent.magnetLink)) {
                    seenMagnets.add(torrent.magnetLink);
                    allTorrents.push(torrent);
                }
            });
        });
        
        // Check if we found anything
        if (allTorrents.length === 0) {
            animeTorrentsList.innerHTML = '<p style="text-align: center; color: var(--light); padding: 2rem;">No torrents found. Try selecting different season/episode options.</p>';
            return;
        }
        
        // Sort by seeders (highest first)
        allTorrents.sort((a, b) => (b.seeders || 0) - (a.seeders || 0));
        
        // Store original torrents for filtering
        animeTorrentsList.dataset.allTorrents = JSON.stringify(allTorrents);
        
        // Display all results
        displayAnimeTorrents(allTorrents);
        
    } catch (error) {
        console.error('[Anime] Error loading torrents:', error);
        animeTorrentsList.innerHTML = `<p style="text-align: center; color: #ef4444; padding: 2rem;">Error loading torrents: ${error.message}</p>`;
    }
}

function displayAnimeTorrents(torrents) {
    const animeTorrentsList = document.getElementById('animeTorrentsList');
    if (!animeTorrentsList) return;
    
    animeTorrentsList.innerHTML = '';
    
    torrents.forEach(torrent => {
        const item = document.createElement('div');
        item.className = 'torrent-item';
        item.innerHTML = `
            <div class="torrent-info">
                <p class="torrent-name">${torrent.name || 'Unknown'}</p>
                <div class="torrent-details">
                    <span><i class="fas fa-arrow-up"></i> ${torrent.seeders || 0}</span>
                    <span><i class="fas fa-arrow-down"></i> ${torrent.leechers || 0}</span>
                    <span><i class="fas fa-database"></i> ${torrent.size || 'N/A'}</span>
                </div>
            </div>
            <div class="torrent-actions">
                <button class="btn-play torrent-btn"><i class="fas fa-play"></i> Play</button>
                <button class="btn-copy torrent-btn"><i class="fas fa-copy"></i> Copy</button>
            </div>
        `;
        
        const playBtn = item.querySelector('.btn-play');
        if (playBtn && torrent.magnetLink) {
            playBtn.addEventListener('click', () => {
                if (typeof startStream === 'function') {
                    startStream(torrent.magnetLink);
                }
            });
        }
        
        const copyBtn = item.querySelector('.btn-copy');
        if (copyBtn && torrent.magnetLink) {
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(torrent.magnetLink).then(() => {
                    if (typeof showNotification === 'function') {
                        showNotification('Magnet link copied to clipboard', 'success');
                    }
                });
            });
        }
        
        animeTorrentsList.appendChild(item);
    });
}

function filterAnimeTorrents() {
    const animeTorrentsList = document.getElementById('animeTorrentsList');
    const filterInput = document.getElementById('animeTorrentKeywordFilter');
    
    if (!animeTorrentsList || !filterInput) return;
    
    const keyword = filterInput.value.toLowerCase().trim();
    const allTorrentsData = animeTorrentsList.dataset.allTorrents;
    
    if (!allTorrentsData) return;
    
    try {
        const allTorrents = JSON.parse(allTorrentsData);
        const filtered = keyword 
            ? allTorrents.filter(t => (t.name || '').toLowerCase().includes(keyword))
            : allTorrents;
        displayAnimeTorrents(filtered);
    } catch (e) {
        console.error('[Anime] Error filtering torrents:', e);
    }
}

async function loadRealmSources(anilistId, episodeNumber) {
    const animeRealmSourcesList = document.getElementById('animeRealmSourcesList');
    if (!animeRealmSourcesList) return;
    
    if (!anilistId || !episodeNumber) {
        animeRealmSourcesList.innerHTML = '<p style="text-align: center; color: #ff4444; padding: 2rem;">Please select an episode first</p>';
        return;
    }
    
    // Show loading
    animeRealmSourcesList.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading Realm sources...</p></div>';
    
    try {
        const response = await fetch(getAnimeApiUrl(`realm/${anilistId}/${episodeNumber}`));
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }
        
        const data = await response.json();
        console.log('[Realm] Sources data:', data);
        
        displayRealmSources(data);
        
    } catch (error) {
        console.error('[Realm] Error loading sources:', error);
        animeRealmSourcesList.innerHTML = '<p style="text-align: center; color: #ff4444; padding: 2rem;">Error loading sources. Make sure the server is running.</p>';
    }
}

function displayRealmSources(sourcesData) {
    const animeRealmSourcesList = document.getElementById('animeRealmSourcesList');
    animeRealmSourcesList.innerHTML = '';
    
    let hasAnySources = false;
    
    // Iterate through each provider
    Object.keys(sourcesData).forEach(providerName => {
        const provider = sourcesData[providerName];
        
        // Skip if error or not found or no streams
        if (provider.error || provider.notFound || !provider.streams || provider.streams.length === 0) {
            return;
        }
        
        hasAnySources = true;
        
        // Create provider section
        const providerSection = document.createElement('div');
        providerSection.style.marginBottom = '1.5rem';
        
        const providerTitle = document.createElement('h4');
        providerTitle.style.cssText = 'color: #8b5cf6; font-size: 1.1rem; margin-bottom: 0.75rem; text-transform: capitalize; font-weight: 600;';
        providerTitle.innerHTML = `<i class="fas fa-play-circle"></i> ${providerName.replace(/-/g, ' ')}`;
        providerSection.appendChild(providerTitle);
        
        // Display streams
        provider.streams.forEach((stream, streamIndex) => {
            const streamItem = document.createElement('div');
            streamItem.className = 'torrent-item';
            streamItem.style.marginBottom = '0.5rem';
            
            const qualityLabel = stream.quality || 'auto';
            const streamUrl = stream.url;
            
            // Get referer - always use animerealms.org for all providers to ensure CDN access
            let referer = 'https://www.animerealms.org/';
            
            // Store subtitles for this provider if available
            const subsKey = `${providerName}_${streamIndex}`;
            if (provider.subtitles && provider.subtitles.length > 0) {
                window[`realmSubtitles_${subsKey}`] = provider.subtitles;
            }
            
            const hasSubtitles = provider.subtitles && provider.subtitles.length > 0;
            const subsText = hasSubtitles ? ` • ${provider.subtitles.length} subs` : '';
            
            streamItem.innerHTML = `
                <div class="torrent-info">
                    <div class="torrent-title">${providerName.replace(/-/g, ' ')} - ${qualityLabel}</div>
                    <div class="torrent-meta">
                        <span class="torrent-size">
                            <i class="fas fa-server"></i> Proxied${subsText}
                        </span>
                    </div>
                </div>
                <div class="torrent-actions">
                    <button class="btn btn-primary play-realm-btn">
                        <i class="fas fa-play"></i> Play
                    </button>
                </div>
            `;
            
            // Add click handler for play button
            const playBtn = streamItem.querySelector('.play-realm-btn');
            playBtn.addEventListener('click', () => {
                playRealmStream(streamUrl, referer, `${providerName} - ${qualityLabel}`, subsKey);
            });
            
            providerSection.appendChild(streamItem);
        });
        
        animeRealmSourcesList.appendChild(providerSection);
    });
    
    if (!hasAnySources) {
        animeRealmSourcesList.innerHTML = '<p style="text-align: center; color: var(--light); padding: 2rem; opacity: 0.7;">No sources found for this episode</p>';
    }
}

async function playRealmStream(url, referer, title, subsKey) {
    console.log('[Realm] Playing stream:', { url, referer, title, subsKey });
    
    // Get subtitles if available
    const subtitles = subsKey ? window[`realmSubtitles_${subsKey}`] : null;
    if (subtitles && subtitles.length > 0) {
        console.log('[Realm] Passing subtitles to player:', subtitles);
    }
    
    // Close the anime modal
    const animeDetailsModal = document.getElementById('animeDetailsModal');
    if (animeDetailsModal) animeDetailsModal.classList.remove('active');
    
    // If there's a referer, use proxy
    let playUrl = url;
    if (referer) {
        playUrl = getAnimeApiUrl(`realm/proxy?url=${encodeURIComponent(url)}&referer=${encodeURIComponent(referer)}`);
        console.log('[Realm] Using proxy URL:', playUrl);
    }
    
    // Get current anime info
    const tmdbId = currentAnime?.id?.toString() || '';
    const episodeSelector = document.getElementById('animeEpisodeSelector');
    const episodeNum = episodeSelector ? episodeSelector.value : null;
    
    // Check if we have electronAPI (Electron app)
    if (window.electronAPI && window.electronAPI.platform) {
        const platform = window.electronAPI.platform;
        
        try {
            if (platform === 'win32') {
                // Windows: Use mpv.js player
                const res = await window.electronAPI.spawnMpvjsPlayer({
                    url: playUrl,
                    tmdbId,
                    seasonNum: null,
                    episodeNum,
                    subtitles: subtitles || null,
                    isDebrid: window.useDebrid || false
                });
                
                if (res?.success) {
                    console.log('[Realm] mpv.js player started successfully');
                } else {
                    console.error('[Realm] mpv.js failed:', res?.message);
                    if (typeof showNotification === 'function') {
                        showNotification(res?.message || 'Failed to start player', 'error');
                    }
                }
            } else if (platform === 'darwin') {
                // macOS: Use IINA
                const res = await window.electronAPI.openInIINA({
                    streamUrl: playUrl
                });
                
                if (res?.success) {
                    console.log('[Realm] IINA started successfully');
                } else {
                    console.error('[Realm] IINA failed:', res?.message);
                    if (typeof showNotification === 'function') {
                        showNotification(res?.message || 'IINA not installed. Please download from https://iina.io', 'error');
                    }
                }
            } else {
                // Linux: Use MPV
                const res = await window.electronAPI.openMpvDirect(playUrl);
                
                if (res?.success) {
                    console.log('[Realm] MPV started successfully');
                } else {
                    console.error('[Realm] MPV failed:', res?.message);
                    if (typeof showNotification === 'function') {
                        showNotification(res?.message || 'MPV not installed. Please install mpv: sudo apt install mpv', 'error');
                    }
                }
            }
        } catch (error) {
            console.error('[Realm] Error launching player:', error);
            if (typeof showNotification === 'function') {
                showNotification('Failed to launch player: ' + error.message, 'error');
            }
        }
    } else {
        // Browser fallback - open in new tab
        window.open(playUrl, '_blank');
    }
}

async function searchAnimeCustomQuery(query) {
    const animeTorrentsList = document.getElementById('animeTorrentsList');
    const animeTorrentsContainer = document.getElementById('animeTorrentsContainer');
    const animeRealmSourcesContainer = document.getElementById('animeRealmSourcesContainer');
    
    if (!animeTorrentsList) return;
    
    // Show torrents container, hide realm sources
    if (animeTorrentsContainer) animeTorrentsContainer.style.display = 'block';
    if (animeRealmSourcesContainer) animeRealmSourcesContainer.style.display = 'none';
    
    animeTorrentsList.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Searching...</div>';
    
    try {
        const response = await fetch(`${animeBaseUrl}/api/${encodeURIComponent(query)}`);
        const data = await response.json();
        const results = data.results || [];
        
        if (results.length === 0) {
            animeTorrentsList.innerHTML = '<p style="text-align: center; color: var(--light); padding: 2rem;">No results found.</p>';
            return;
        }
        
        // Sort by seeders
        results.sort((a, b) => (b.seeders || 0) - (a.seeders || 0));
        
        // Store for filtering
        animeTorrentsList.dataset.allTorrents = JSON.stringify(results);
        
        displayAnimeTorrents(results);
    } catch (error) {
        console.error('[Anime] Custom search error:', error);
        animeTorrentsList.innerHTML = `<p style="text-align: center; color: #ef4444; padding: 2rem;">Error: ${error.message}</p>`;
    }
}

// Export additional functions
window.showAnimeDetails = showAnimeDetails;
window.setupAnimeSeasonEpisodeSelectors = setupAnimeSeasonEpisodeSelectors;
window.calculateAbsoluteEpisode = calculateAbsoluteEpisode;
window.generateAnimeSearchQueries = generateAnimeSearchQueries;
window.loadAnimeTorrents = loadAnimeTorrents;
window.displayAnimeTorrents = displayAnimeTorrents;
window.filterAnimeTorrents = filterAnimeTorrents;
window.loadRealmSources = loadRealmSources;
window.displayRealmSources = displayRealmSources;
window.playRealmStream = playRealmStream;
window.searchAnimeCustomQuery = searchAnimeCustomQuery;

console.log('[Anime] Module loaded, showAnimeDetails exported:', typeof window.showAnimeDetails);
