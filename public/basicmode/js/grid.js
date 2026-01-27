import { getDiscover, getPersonDetails, getPersonCredits, getImageUrl } from './api.js';
import { getInstalledAddons } from './addons.js';

const params = new URLSearchParams(window.location.search);
const type = params.get('type'); // 'genre' or 'person' or 'addon'
const id = params.get('id');
const name = params.get('name');
const addonId = params.get('addonId');
const catalogId = params.get('catalogId');
const catalogType = params.get('catalogType');
const searchQuery = params.get('search'); // For addon catalog search

const pageTitle = document.getElementById('page-title');
const contentGrid = document.getElementById('content-grid');
const loadingSpinner = document.getElementById('loading-spinner');
const profileImageContainer = document.getElementById('profile-image-container');
const profileImage = document.getElementById('profile-image');
const pageDescription = document.getElementById('page-description');
const cardTemplate = document.getElementById('poster-card-template');
const filterButtons = document.querySelectorAll('.filter-btn');

let isLoading = false;
let currentFilter = 'all'; // 'all', 'movie', 'tv'
let allPersonCredits = []; 
let hasMorePages = true;
const loadedItemIds = new Set();

// Pagination state
let moviePage = 1;
let tvPage = 1;
let movieHasMore = true;
let tvHasMore = true;
let addonSkip = 0;

// Init
const init = async () => {
    if (!type) {
        window.location.href = 'index.html';
        return;
    }

    pageTitle.textContent = name || 'Browse';
    document.title = `${name || 'Browse'} - PlayTorrio`;

    if (type === 'person') {
        await initPersonView();
    } else if (type === 'genre') {
        await initGenreView();
    } else if (type === 'addon') {
        await initAddonView();
    }

    // Filters
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.dataset.filter;
            if (filter === currentFilter) return;

            // UI Update
            filterButtons.forEach(b => {
                b.classList.remove('active', 'bg-primary-purple', 'text-white', 'shadow-lg');
                b.classList.add('text-gray-400', 'bg-white/5');
            });
            btn.classList.add('active', 'bg-primary-purple', 'text-white', 'shadow-lg');
            btn.classList.remove('text-gray-400', 'bg-white/5');

            currentFilter = filter;
            resetGrid();
            
            if (type === 'person') {
                renderPersonCredits();
            } else {
                fetchGenreContent();
            }
        });
    });

    // Infinite Scroll
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !isLoading && hasMorePages) {
            if (type === 'genre') {
                fetchGenreContent();
            } else if (type === 'addon') {
                fetchAddonContent();
            } else if (type === 'person') {
                // Client side chunking logic could go here
            }
        }
    }, { rootMargin: '400px' }); // Increased margin to trigger sooner

    if (loadingSpinner) observer.observe(loadingSpinner);
};

const resetGrid = () => {
    contentGrid.innerHTML = '';
    moviePage = 1;
    tvPage = 1;
    movieHasMore = true;
    tvHasMore = true;
    hasMorePages = true;
    addonSkip = 0;
    loadedItemIds.clear();
    if (loadingSpinner) loadingSpinner.style.display = 'flex';
};

// --- PERSON VIEW ---
const initPersonView = async () => {
    profileImageContainer.classList.remove('hidden');
    try {
        // Fetch Details
        const details = await getPersonDetails(id);
        profileImage.src = getImageUrl(details.profile_path, 'w500');
        if (details.biography) {
            pageDescription.textContent = details.biography;
            pageDescription.classList.remove('hidden');
            pageDescription.classList.add('line-clamp-3');
            pageDescription.onclick = () => pageDescription.classList.toggle('line-clamp-3');
        }

        // Fetch Credits
        const data = await getPersonCredits(id);
        // Sort by popularity desc
        allPersonCredits = (data.cast || []).sort((a, b) => b.popularity - a.popularity);
        
        // Dedup
        const seen = new Set();
        allPersonCredits = allPersonCredits.filter(item => {
            const k = `${item.media_type}_${item.id}`;
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
        });

        renderPersonCredits();
        if (loadingSpinner) loadingSpinner.style.display = 'none';
        hasMorePages = false;

    } catch (e) {
        console.error('Person fetch failed', e);
    }
};

const renderPersonCredits = () => {
    contentGrid.innerHTML = '';
    
    const filtered = allPersonCredits.filter(item => {
        if (currentFilter === 'all') return true;
        return item.media_type === currentFilter;
    });

    filtered.forEach(item => {
        const card = createCard(item);
        if (card) contentGrid.appendChild(card);
    });
};

// --- GENRE VIEW ---
const initGenreView = async () => {
    fetchGenreContent();
};

const fetchGenreContent = async () => {
    if (isLoading || !hasMorePages) return;
    isLoading = true;
    
    try {
        let items = [];
        const promises = [];
        const types = [];

        // Determine what to fetch
        if ((currentFilter === 'all' || currentFilter === 'movie') && movieHasMore) {
            promises.push(getDiscover('movie', { with_genres: id, page: moviePage }));
            types.push('movie');
        }
        
        if ((currentFilter === 'all' || currentFilter === 'tv') && tvHasMore) {
            promises.push(getDiscover('tv', { with_genres: id, page: tvPage }));
            types.push('tv');
        }

        if (promises.length === 0) {
            hasMorePages = false;
            if (loadingSpinner) loadingSpinner.style.display = 'none';
            isLoading = false;
            return;
        }

        const results = await Promise.all(promises);
        
        results.forEach((res, index) => {
            const mediaType = types[index];
            if (res.results && res.results.length > 0) {
                // Add media_type to each item since TMDB discover doesn't include it
                const itemsWithType = res.results.map(item => ({
                    ...item,
                    media_type: mediaType
                }));
                items.push(...itemsWithType);
                if (mediaType === 'movie') moviePage++;
                if (mediaType === 'tv') tvPage++;
            } else {
                if (mediaType === 'movie') movieHasMore = false;
                if (mediaType === 'tv') tvHasMore = false;
            }
        });

        // Check if we are completely done
        if (!movieHasMore && !tvHasMore) {
            hasMorePages = false;
            if (loadingSpinner) loadingSpinner.style.display = 'none';
        }
        
        // If "All" filter and we only got empty results for both, hide spinner
        if (currentFilter === 'all' && items.length === 0 && !movieHasMore && !tvHasMore) {
             hasMorePages = false;
             if (loadingSpinner) loadingSpinner.style.display = 'none';
             isLoading = false;
             return;
        } else if (items.length === 0 && hasMorePages) {
             // Retrying won't help if empty, but maybe we just hit end of one type
             // If we got 0 items but still have pages (e.g. one type has pages but returned 0? unlikely)
             // Just continue.
        }

        // Sort merged results by popularity
        items.sort((a, b) => b.popularity - a.popularity);

        items.forEach(item => {
            const card = createCard(item);
            if (card) contentGrid.appendChild(card);
        });

        isLoading = false;

        // If content is too short to scroll, try fetching next page immediately
        if (document.body.scrollHeight <= window.innerHeight && hasMorePages) {
             fetchGenreContent();
        }

    } catch (e) {
        console.error('Genre fetch failed', e);
        contentGrid.innerHTML = `<div class="col-span-full text-center text-red-500 py-8">Failed to load content. Please try again.</div>`;
        isLoading = false;
        hasMorePages = false;
        if (loadingSpinner) loadingSpinner.style.display = 'none';
    }
};

// --- ADDON VIEW ---
const initAddonView = async () => {
    // Hide filters for addon view as catalogs are type-specific
    const filterButtons = document.querySelectorAll('.filter-btn');
    if (filterButtons.length > 0) {
        const filterContainer = filterButtons[0].parentElement;
        if (filterContainer) {
            filterContainer.classList.add('hidden');
        }
    }
    fetchAddonContent();
};

const fetchAddonContent = async () => {
    if (isLoading || !hasMorePages) return;
    isLoading = true;

    try {
        const addons = await getInstalledAddons();
        const addon = addons.find(a => a.manifest.id === addonId);
        
        if (!addon) throw new Error('Addon not found');

        let url = addon.url.replace('/manifest.json', '');
        if (url.endsWith('/')) url = url.slice(0, -1);

        // Construct catalog URL. Stremio pagination often uses 'skip={n}' in extra path or query
        // Standard: /catalog/{type}/{id}/skip={skip}.json
        // With search: /catalog/{type}/{id}/search={query}.json
        let targetUrl = `${url}/catalog/${catalogType}/${catalogId}`;
        
        // Add search parameter if present
        if (searchQuery) {
            targetUrl += `/search=${encodeURIComponent(searchQuery)}`;
        }
        
        if (addonSkip > 0) {
            targetUrl += `/skip=${addonSkip}`;
        }
        
        targetUrl += '.json';
        
        console.log('[Addon Catalog] Fetching:', targetUrl);
        const res = await fetch(targetUrl);
        const data = await res.json();
        
        const items = data.metas || [];
        
        if (items.length === 0) {
            hasMorePages = false;
            if (loadingSpinner) loadingSpinner.style.display = 'none';
            isLoading = false;
            return;
        }

        // Enhance items with TMDB data if they have IMDB IDs but no titles
        const enhancedItems = await Promise.all(items.map(async (item) => {
            // If item has IMDB ID but no title, try to get title from TMDB
            if (item.id && item.id.startsWith('tt') && !item.title && !item.name) {
                try {
                    const { findByExternalId } = await import('./api.js');
                    const findResults = await findByExternalId(item.id, 'imdb_id');
                    
                    let tmdbResult = null;
                    if (item.type === 'movie' && findResults.movie_results && findResults.movie_results.length > 0) {
                        tmdbResult = findResults.movie_results[0];
                    } else if ((item.type === 'tv' || item.type === 'series') && findResults.tv_results && findResults.tv_results.length > 0) {
                        tmdbResult = findResults.tv_results[0];
                    }
                    
                    if (tmdbResult) {
                        // Enhance the item with TMDB data while keeping addon-specific fields
                        return {
                            ...item,
                            tmdb_id: tmdbResult.id, // Store TMDB ID for proper linking
                            title: tmdbResult.title,
                            name: tmdbResult.name,
                            overview: tmdbResult.overview,
                            release_date: tmdbResult.release_date,
                            first_air_date: tmdbResult.first_air_date,
                            vote_average: tmdbResult.vote_average,
                            // Keep original poster if available, otherwise use TMDB
                            poster: item.poster || (tmdbResult.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbResult.poster_path}` : null)
                        };
                    }
                } catch (e) {
                    console.warn('[Addon] Failed to enhance item with TMDB data:', item.id, e);
                }
            }
            return item;
        }));

        let newItemsCount = 0;
        enhancedItems.forEach(item => {
            // Set type from catalog type, normalize 'series' to 'tv'
            if (!item.type) item.type = catalogType;
            let itemType = item.type;
            if (itemType === 'series') itemType = 'tv';
            
            // Deduplication logic - use same key format as createCard
            const dedupKey = `${itemType}_${item.id}`;
            if (loadedItemIds.has(dedupKey)) return;
            // Don't add to loadedItemIds here - createCard will do it
            newItemsCount++;

            item._addonId = addonId;
            const card = createCard(item);
            if (card) contentGrid.appendChild(card);
        });

        if (newItemsCount === 0) {
            // Received items but all were duplicates. Assume end of list or stuck loop.
            hasMorePages = false;
            if (loadingSpinner) loadingSpinner.style.display = 'none';
            isLoading = false;
            return;
        }

        addonSkip += items.length; // Always increment skip by fetched amount to progress
        
        isLoading = false;
        
        // If content is too short, try fetching more
        if (document.body.scrollHeight <= window.innerHeight && hasMorePages) {
             fetchAddonContent();
        }

    } catch (e) {
        console.error('Addon fetch failed', e);
        isLoading = false;
        hasMorePages = false;
        if (loadingSpinner) loadingSpinner.style.display = 'none';
        contentGrid.innerHTML += `<div class="col-span-full text-center text-red-500">Error loading catalog: ${e.message}</div>`;
    }
};

const createCard = (item) => {
    // Normalization - handle both TMDB and addon poster formats
    let poster;
    if (item.poster_path) {
        // TMDB format
        poster = getImageUrl(item.poster_path, 'w500');
    } else if (item.poster) {
        // Direct URL from addon
        poster = item.poster;
    } else {
        // Fallback placeholder
        poster = 'https://via.placeholder.com/500x750/1a1a2e/ffffff?text=No+Poster';
    }
    
    let titleText = item.title || item.name;
    
    // If no title and ID looks like IMDB ID, try to get title from TMDB
    if (!titleText && item.id && item.id.startsWith('tt')) {
        titleText = item.id; // Use IMDB ID as temporary title
        
        // For addon items with IMDB IDs, we could potentially fetch the title from TMDB
        // but for now, just use the IMDB ID as a fallback
    }
    
    let itemType = item.media_type || item.type;
    
    // If still no type, try to infer from properties
    if (!itemType) {
        // Movies have 'title', TV shows have 'name' and 'first_air_date'
        if (item.title) {
            itemType = 'movie';
        } else if (item.first_air_date || item.name) {
            itemType = 'tv';
        } else {
            itemType = 'movie'; // Default fallback
        }
    }
    
    // For addon items, keep 'series' as-is (Stremio protocol uses 'series')
    // For TMDB items, normalize 'series' to 'tv'
    if (itemType === 'series' && !item._addonId) {
        itemType = 'tv';
    }
    
    const itemId = item.id;
    const rating = item.vote_average || (item.imdbRating ? parseFloat(item.imdbRating) : null);
    const dateText = item.release_date || item.first_air_date || (item.releaseInfo ? item.releaseInfo.substring(0, 4) : '') || (item.year ? item.year.toString() : '');

    if (!poster && !titleText) return null;
    
    // Deduplication check for genre view
    const dedupKey = `${itemType}_${itemId}`;
    if (loadedItemIds.has(dedupKey)) return null;
    loadedItemIds.add(dedupKey);
    
    const clone = cardTemplate.content.cloneNode(true);
    const link = clone.querySelector('.poster-link');
    const img = clone.querySelector('.poster-img');
    const title = clone.querySelector('.poster-title');
    const date = clone.querySelector('.poster-date');
    const ratingValue = clone.querySelector('.rating-value');

    // For addon items, check if ID is an IMDB ID (starts with 'tt')
    // If so, we need to convert it to TMDB ID for proper details page functionality
    if (item._addonId) {
        // Store catalog metadata in sessionStorage for addons that don't support /meta endpoint
        const catalogMeta = {
            id: item.id,
            name: item.name || item.title,
            // Support both Stremio format (poster) and TMDB format (poster_path)
            poster: item.poster || item.poster_path,
            background: item.background || item.backdrop_path || item.poster || item.poster_path,
            logo: item.logo,
            // Support both formats
            description: item.description || item.overview,
            genre: item.genre || item.genres || [],
            type: item.type || itemType,
            releaseInfo: item.releaseInfo || item.release_date || item.first_air_date,
            imdbRating: item.imdbRating || item.vote_average,
            runtime: item.runtime,
            director: item.director,
            cast: item.cast,
            videos: item.videos,
            behaviorHints: item.behaviorHints,
            posterShape: item.posterShape
        };
        
        // If the item has a TMDB ID from enhancement, use that for the link
        if (item.tmdb_id) {
            link.href = `details.html?type=${itemType}&id=${item.tmdb_id}`;
        } else if (item.id && item.id.startsWith('tt')) {
            // IMDB ID - need to convert to TMDB ID on click
            link.href = `details.html?type=${itemType}&id=${encodeURIComponent(itemId)}&addonId=${item._addonId}`;
            
            // Add click handler to convert IMDB ID to TMDB ID
            link.addEventListener('click', async (e) => {
                e.preventDefault();
                
                try {
                    console.log('[Grid] Converting IMDB ID to TMDB ID:', itemId);
                    const { findByExternalId } = await import('./api.js');
                    const findResults = await findByExternalId(itemId, 'imdb_id');
                    
                    let tmdbResult = null;
                    if (itemType === 'movie' && findResults.movie_results && findResults.movie_results.length > 0) {
                        tmdbResult = findResults.movie_results[0];
                    } else if ((itemType === 'tv' || itemType === 'series') && findResults.tv_results && findResults.tv_results.length > 0) {
                        tmdbResult = findResults.tv_results[0];
                    }
                    
                    if (tmdbResult) {
                        console.log('[Grid] Found TMDB match:', tmdbResult.title || tmdbResult.name, tmdbResult.id);
                        // Navigate to details page with TMDB ID
                        const finalType = itemType === 'series' ? 'tv' : itemType;
                        window.location.href = `details.html?type=${finalType}&id=${tmdbResult.id}`;
                    } else {
                        console.warn('[Grid] No TMDB match found for IMDB ID:', itemId);
                        alert('Could not find this content on TMDB.');
                    }
                } catch (error) {
                    console.error('[Grid] TMDB lookup error:', error);
                    alert('Failed to lookup content: ' + error.message);
                }
            });
        } else {
            // Regular addon ID
            link.href = `details.html?type=${itemType}&id=${encodeURIComponent(itemId)}&addonId=${item._addonId}`;
        }
        
        // Cache metadata for addon details page
        console.log('[Grid] Caching addon metadata for:', itemId);
        console.log('[Grid] Cached metadata:', catalogMeta);
        sessionStorage.setItem(`addon_meta_${item._addonId}_${itemId}`, JSON.stringify(catalogMeta));
    } else {
        link.href = `details.html?type=${itemType}&id=${itemId}`;
    }
    
    img.src = poster;
    img.alt = titleText;
    img.onload = () => img.classList.remove('opacity-0');

    title.textContent = titleText;
    date.textContent = dateText;
    
    if (ratingValue) {
        ratingValue.textContent = rating ? rating.toFixed(1) : 'N/A';
    }

    return clone;
};

document.addEventListener('DOMContentLoaded', init);