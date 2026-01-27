// Catalogs Module
// Handles Stremio addon catalog browsing

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
        console.log('[Catalogs] Fetching addons from /api/addons');
        const response = await fetch('/api/addons');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('[Catalogs] Received data:', data);
        
        // Handle both array and object responses
        const addons = Array.isArray(data) ? data : (data.addons || []);
        console.log('[Catalogs] Addons array:', addons);
        
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
// CATALOG BROWSE PAGE
// ============================================================================
let catalogBrowseState = {
    addonId: null,
    catalogId: null,
    catalogType: null,
    catalogName: null,
    skip: 0,
    hasMore: true,
    isLoading: false,
    loadedIds: new Set()
};

async function initializeCatalogBrowse(addonId, catalogId, catalogType, catalogName) {
    console.log('[CatalogBrowse] initializeCatalogBrowse called with:', { addonId, catalogId, catalogType, catalogName });
    
    // Reset state
    catalogBrowseState = {
        addonId,
        catalogId,
        catalogType,
        catalogName,
        skip: 0,
        hasMore: true,
        isLoading: false,
        loadedIds: new Set()
    };
    
    const titleEl = document.getElementById('catalogBrowseTitle');
    const gridEl = document.getElementById('catalogBrowseGrid');
    const loadingEl = document.getElementById('catalogBrowseLoading');
    const backBtn = document.getElementById('catalogBackBtn');
    
    console.log('[CatalogBrowse] Elements found:', { 
        titleEl: !!titleEl, 
        gridEl: !!gridEl, 
        loadingEl: !!loadingEl, 
        backBtn: !!backBtn 
    });
    
    if (titleEl) {
        titleEl.innerHTML = `<i class="fas fa-th"></i> <span>${catalogName || 'Catalog'}</span>`;
    }
    
    if (gridEl) {
        gridEl.innerHTML = '';
    }
    
    if (loadingEl) {
        loadingEl.style.display = 'block';
    }
    
    if (backBtn) {
        backBtn.onclick = () => {
            console.log('[CatalogBrowse] Back button clicked');
            window.location.hash = '#/catalogs';
        };
    }
    
    // Load first page
    console.log('[CatalogBrowse] Loading first page...');
    await loadCatalogItems();
    
    // Setup infinite scroll
    setupCatalogInfiniteScroll();
}

async function loadCatalogItems() {
    if (catalogBrowseState.isLoading || !catalogBrowseState.hasMore) return;
    
    catalogBrowseState.isLoading = true;
    const loadingEl = document.getElementById('catalogBrowseLoading');
    if (loadingEl) loadingEl.style.display = 'block';
    
    try {
        const response = await fetch('/api/addons');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const addonsData = await response.json();
        const addons = Array.isArray(addonsData) ? addonsData : (addonsData.addons || []);
        const addon = addons.find(a => a.manifest.id === catalogBrowseState.addonId);
        
        
        if (!addon) throw new Error('Addon not found');
        
        let url = addon.url.replace('/manifest.json', '');
        if (url.endsWith('/')) url = url.slice(0, -1);
        
        let targetUrl = `${url}/catalog/${catalogBrowseState.catalogType}/${catalogBrowseState.catalogId}`;
        
        if (catalogBrowseState.skip > 0) {
            targetUrl += `/skip=${catalogBrowseState.skip}`;
        }
        
        targetUrl += '.json';
        
        console.log('[CatalogBrowse] Fetching:', targetUrl);
        const res = await fetch(targetUrl);
        const catalogData = await res.json();
        
        const items = catalogData.metas || [];
        
        if (items.length === 0) {
            catalogBrowseState.hasMore = false;
            if (loadingEl) loadingEl.style.display = 'none';
            catalogBrowseState.isLoading = false;
            return;
        }
        
        const gridEl = document.getElementById('catalogBrowseGrid');
        let newItemsCount = 0;
        
        items.forEach(item => {
            // Set type from catalog type
            if (!item.type) item.type = catalogBrowseState.catalogType;
            let itemType = item.type;
            
            // Deduplication
            const dedupKey = `${itemType}_${item.id}`;
            if (catalogBrowseState.loadedIds.has(dedupKey)) return;
            catalogBrowseState.loadedIds.add(dedupKey);
            newItemsCount++;
            
            // Create movie card
            const card = createCatalogCard(item, itemType, catalogBrowseState.addonId);
            if (card && gridEl) {
                gridEl.appendChild(card);
            }
        });
        
        if (newItemsCount === 0) {
            catalogBrowseState.hasMore = false;
            if (loadingEl) loadingEl.style.display = 'none';
            catalogBrowseState.isLoading = false;
            return;
        }
        
        catalogBrowseState.skip += items.length;
        catalogBrowseState.isLoading = false;
        if (loadingEl) loadingEl.style.display = 'none';
        
    } catch (error) {
        console.error('[CatalogBrowse] Error loading items:', error);
        catalogBrowseState.isLoading = false;
        catalogBrowseState.hasMore = false;
        if (loadingEl) {
            loadingEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error loading catalog';
            loadingEl.style.color = '#ef4444';
        }
    }
}

function createCatalogCard(item, itemType, addonId) {
    const card = document.createElement('div');
    card.className = 'movie-card';
    
    const poster = item.poster || item.poster_path || 'https://via.placeholder.com/500x750/1a1a2e/ffffff?text=No+Poster';
    const title = item.name || item.title || 'Untitled';
    const year = item.releaseInfo ? item.releaseInfo.substring(0, 4) : (item.year || '');
    const rating = item.imdbRating ? parseFloat(item.imdbRating) : (item.vote_average || 0);
    
    const posterUrl = poster.startsWith('http') ? poster : `https://image.tmdb.org/t/p/w342${poster}`;
    
    card.innerHTML = `
        <img loading="lazy" decoding="async" src="${posterUrl}" alt="${title}" class="movie-poster">
        <div class="movie-info">
            <h3 class="movie-title">${title}</h3>
            <p class="movie-year">${year}</p>
        </div>
        <div class="movie-rating">
            <i class="fas fa-star"></i> ${rating ? Number(rating).toFixed(1) : 'N/A'}
        </div>
    `;
    
    card.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('[CatalogCard] Card clicked! Opening modal for:', item.id);
        
        // Cache metadata before opening modal
        const catalogMeta = {
            id: item.id,
            name: item.name || item.title,
            poster: item.poster || item.poster_path,
            background: item.background || item.backdrop_path || item.poster || item.poster_path,
            logo: item.logo,
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
        sessionStorage.setItem(`addon_meta_${addonId}_${item.id}`, JSON.stringify(catalogMeta));
        
        // Create a movie object compatible with openDetailsModal
        const movieObj = {
            id: item.id,
            title: item.name || item.title,
            name: item.name || item.title,
            poster_path: poster,
            backdrop_path: item.background || item.backdrop_path || poster,
            overview: item.description || item.overview || '',
            vote_average: rating || 0,
            release_date: item.releaseInfo || item.year || '',
            first_air_date: item.releaseInfo || item.year || '',
            media_type: itemType,
            _addonId: addonId
        };
        
        console.log('[CatalogCard] Calling openDetailsModal with:', movieObj);
        
        // Open the details modal using the existing function
        if (typeof window.openDetailsModal === 'function') {
            window.openDetailsModal(movieObj, itemType);
        } else {
            console.error('[CatalogBrowse] openDetailsModal function not found');
        }
    });
    
    return card;
}

function setupCatalogInfiniteScroll() {
    const mainElement = document.querySelector('main');
    if (!mainElement) return;
    
    let scrollTimeout = null;
    
    const checkAndLoadMore = () => {
        const hash = window.location.hash || '';
        if (!hash.startsWith('#/catalog?')) return;
        
        const loadingEl = document.getElementById('catalogBrowseLoading');
        if (!loadingEl) return;
        
        const rect = loadingEl.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        
        if (rect.top < viewportHeight + 500 && !catalogBrowseState.isLoading && catalogBrowseState.hasMore) {
            console.log('[CatalogBrowse] Loading more items...');
            loadCatalogItems();
        }
    };
    
    const scrollHandler = () => {
        if (scrollTimeout) clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(checkAndLoadMore, 100);
    };
    
    mainElement.addEventListener('scroll', scrollHandler);
    window.addEventListener('scroll', scrollHandler);
    window.addEventListener('resize', scrollHandler);
}

window.initializeCatalogBrowse = initializeCatalogBrowse;

console.log('[Catalogs] Catalogs module loaded');
