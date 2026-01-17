// ===== GAMES DOWNLOADER FUNCTIONALITY =====
// Handles game search, browsing, and library management

// Helper to get API base URL
function getGamesApiUrl(endpoint) {
    const baseUrl = window.API_BASE_URL || 'http://localhost:6987/api';
    if (endpoint.startsWith('/')) {
        return baseUrl + endpoint;
    }
    return baseUrl + '/' + endpoint;
}

// TorBox supported hosts list (based on TorBox documentation)
const TORBOX_SUPPORTED_HOSTS = [
    'buzzheavier.com', 'bzzhr.co', 'bzz.lol',  // BuzzHeavier and mirrors
    'gofile.io',
    '1fichier.com',
    'mediafire.com',
    'pixeldrain.com',
    'dropbox.com',
    'mega.nz', 'mega.co.nz',
    'rapidgator.net',
    'uploaded.net', 'ul.to',
    'turbobit.net',
    'nitroflare.com',
    'katfile.com',
    'filefactory.com',
    'ddownload.com',
    'filestore.me'
];

function isTorBoxSupported(url) {
    try {
        const hostname = new URL(url).hostname.toLowerCase();
        return TORBOX_SUPPORTED_HOSTS.some(h => hostname.includes(h));
    } catch {
        return false;
    }
}

// Games Downloader page functions
function showGamesDownloaderPage() {
    window.location.hash = '#/games-downloader';
}

async function loadGameCategories() {
    try {
        console.log('[GAMES] Loading categories...');
        const categorySelect = document.getElementById('games-category-select');
        
        if (!categorySelect) {
            console.error('[GAMES] Category select element not found');
            return;
        }

        // Hardcoded categories list
        const categories = [
            "Action",
            "Adventure",
            "Anime",
            "Building",
            "First-person Shooter Games",
            "Horror",
            "Indie",
            "Multiplayer",
            "Nudity",
            "Open World",
            "Racing",
            "Role-playing game",
            "Sci-fi",
            "Shooters",
            "Simulation",
            "Sports",
            "Strategy",
            "Survival",
            "Uncategorized",
            "Virtual Reality"
        ];

        // Populate dropdown
        categorySelect.innerHTML = '<option value="" style="background: var(--bg-secondary); color: var(--secondary); padding: 0.5rem; font-weight: 500;">Select a category...</option>';
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            option.style.cssText = 'background: var(--card-bg); color: var(--light); padding: 0.5rem; font-weight: 500;';
            categorySelect.appendChild(option);
        });
        
        console.log('[GAMES] Categories populated in dropdown:', categories.length);
    } catch (error) {
        console.error('[GAMES] Failed to load categories:', error);
    }
}

async function browseByCategory(category) {
    const statusEl = document.getElementById('games-search-status');
    const resultsSection = document.getElementById('games-results-section');
    const emptyState = document.getElementById('games-empty-state');
    const resultsGrid = document.getElementById('games-results-grid');
    const resultsCount = document.getElementById('games-results-count');

    try {
        statusEl.textContent = `Loading ${category} games...`;
        statusEl.style.color = '#8b5cf6';
        emptyState.style.display = 'none';

        const response = await fetch(getGamesApiUrl(`games/category/${encodeURIComponent(category)}`));
        if (!response.ok) throw new Error('Failed to load category');

        const data = await response.json();
        
        if (!data.games || data.games.length === 0) {
            statusEl.textContent = `No games found in ${category}`;
            statusEl.style.color = '#ef4444';
            emptyState.style.display = '';
            return;
        }

        // Store games and display first 20
        window.allGames = data.games;
        window.currentGameIndex = 0;
        window.gamesPerLoad = 20;
        
        resultsGrid.innerHTML = '';
        resultsSection.style.display = '';
        loadMoreGames();

    } catch (error) {
        console.error('Browse by category error:', error);
        statusEl.style.color = '#ef4444';
        emptyState.style.display = '';
    }
}

async function searchGames(query) {
    const statusEl = document.getElementById('games-search-status');
    const resultsSection = document.getElementById('games-results-section');
    const emptyState = document.getElementById('games-empty-state');
    const resultsGrid = document.getElementById('games-results-grid');
    const resultsCount = document.getElementById('games-results-count');

    if (!query || !query.trim()) {
        statusEl.textContent = 'Please enter a game name';
        statusEl.style.color = '#ef4444';
        return;
    }

    try {
        statusEl.textContent = 'Searching...';
        statusEl.style.color = '#8b5cf6';
        resultsSection.style.display = 'none';
        emptyState.style.display = 'none';

        const response = await fetch(getGamesApiUrl(`games/search/${encodeURIComponent(query)}`));
        if (!response.ok) throw new Error('Search failed');

        const data = await response.json();
        
        if (!data.games || data.games.length === 0) {
            statusEl.textContent = 'No games found';
            statusEl.style.color = '#ef4444';
            emptyState.style.display = '';
            return;
        }

        // Display results
        statusEl.textContent = `Found ${data.count} game${data.count !== 1 ? 's' : ''}`;
        statusEl.style.color = '#10b981';
        resultsCount.textContent = `${data.count} game${data.count !== 1 ? 's' : ''}`;
        
        resultsGrid.innerHTML = '';
        data.games.forEach(game => {
            const card = document.createElement('div');
            card.className = 'music-card';
            card.style.cursor = 'default';
            
            // Get image URL and game title for library
            const imageUrl = game.imgID 
                ? getGamesApiUrl(`games/image/${game.imgID}`)
                : 'https://via.placeholder.com/300x400?text=No+Image';
            const gameTitle = game.game || game.name || 'Unknown Game';
            const gameSize = game.size || '';
            
            // Handle new API structure - download_links is an object with arrays
            let downloadLinksHtml = '';
            if (game.download_links && typeof game.download_links === 'object') {
                const links = [];
                
                // Iterate through all link types (1fichier, buzzheavier, megadb, etc.)
                Object.keys(game.download_links).forEach(linkType => {
                    const urls = game.download_links[linkType];
                    if (Array.isArray(urls)) {
                        urls.forEach((url, index) => {
                            // Add protocol if missing
                            const fullUrl = url.startsWith('//') ? 'https:' + url : url;
                            const displayName = linkType.charAt(0).toUpperCase() + linkType.slice(1) + (urls.length > 1 ? ` ${index + 1}` : '');
                            links.push({name: displayName, url: fullUrl, provider: linkType});
                        });
                    } else if (typeof urls === 'string') {
                        const fullUrl = urls.startsWith('//') ? 'https:' + urls : urls;
                        const displayName = linkType.charAt(0).toUpperCase() + linkType.slice(1);
                        links.push({name: displayName, url: fullUrl, provider: linkType});
                    }
                });
                
                if (links.length > 0) {
                    downloadLinksHtml = links.map(link => {
                        const torboxSupported = isTorBoxSupported(link.url);
                        const bgColor = torboxSupported ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #6b7280, #4b5563)';
                        const torboxIcon = torboxSupported ? '<i class="fas fa-bolt" style="color:#fbbf24;margin-right:2px;" title="TorBox Supported"></i>' : '<i class="fas fa-external-link-alt" style="margin-right:2px;" title="Opens in Browser"></i>';
                        const tooltip = torboxSupported ? 'TorBox supported - Click to download in-app' : 'Opens in browser (not supported by TorBox)';
                        return `
                        <button class="game-download-link" data-url="${link.url}" data-name="${gameTitle.replace(/"/g, '&quot;')}" data-image="${imageUrl}" data-size="${gameSize}" data-provider="${link.provider}" data-torbox="${torboxSupported}" style="padding: 0.4rem 0.8rem; background: ${bgColor}; border: none; border-radius: 6px; color: white; font-size: 0.85rem; cursor: pointer; margin: 0.2rem; transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'" title="${tooltip}">
                            ${torboxIcon} ${link.name}
                        </button>
                    `;
                    }).join('');
                }
            }
            
            if (!downloadLinksHtml) {
                downloadLinksHtml = '<span style="color: var(--secondary); font-size: 0.85rem;">No download links available</span>';
            }
            
            // Format categories
            const categories = Array.isArray(game.category) 
                ? game.category.join(', ')
                : (game.category || 'N/A');

            card.innerHTML = `
                <div class="music-cover">
                    <img loading="lazy" src="${imageUrl}" alt="${gameTitle}" onerror="this.src='https://via.placeholder.com/300x400?text=No+Image'">
                </div>
                <div class="music-info">
                    <div class="music-title">${gameTitle}</div>
                    <div class="music-artist" style="color: #8b5cf6;">${categories}</div>
                    ${game.size ? `<div style="color: var(--secondary); font-size: 0.85rem; margin: 0.3rem 0;"><i class="fas fa-hdd"></i> Size: ${game.size}</div>` : ''}
                    ${game.version ? `<div style="color: var(--secondary); font-size: 0.85rem; margin: 0.3rem 0;"><i class="fas fa-tag"></i> Version: ${game.version}</div>` : ''}
                    ${game.description ? `<div style="color: var(--secondary); font-size: 0.85rem; margin: 0.5rem 0; line-height: 1.4;">${game.description.substring(0, 150)}${game.description.length > 150 ? '...' : ''}</div>` : ''}
                    <div class="music-actions" style="flex-wrap: wrap; margin-top: 0.5rem;">
                        ${downloadLinksHtml}
                    </div>
                </div>
            `;
            resultsGrid.appendChild(card);
        });

        // Add click handlers to download links - left click adds to library, right click opens in browser
        resultsGrid.querySelectorAll('.game-download-link').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                const url = e.currentTarget.getAttribute('data-url');
                const name = e.currentTarget.getAttribute('data-name');
                const image = e.currentTarget.getAttribute('data-image');
                const size = e.currentTarget.getAttribute('data-size');
                const provider = e.currentTarget.getAttribute('data-provider');
                if (url) {
                    addGameToLibrary(url, name, image, size, provider);
                }
            });
            btn.addEventListener('contextmenu', async (e) => {
                e.preventDefault();
                const url = e.currentTarget.getAttribute('data-url');
                if (url && window.electronAPI?.openExternal) {
                    await window.electronAPI.openExternal(url);
                    showNotification('Opening in browser...', 'info');
                }
            });
        });

        resultsSection.style.display = '';
        emptyState.style.display = 'none';

    } catch (error) {
        console.error('Games search error:', error);
        statusEl.textContent = 'Search failed. Please try again.';
        statusEl.style.color = '#ef4444';
        emptyState.style.display = '';
    }
}

async function browseAllGames() {
    const statusEl = document.getElementById('games-search-status');
    const resultsSection = document.getElementById('games-results-section');
    const emptyState = document.getElementById('games-empty-state');
    const resultsGrid = document.getElementById('games-results-grid');
    const resultsCount = document.getElementById('games-results-count');

    try {
        statusEl.textContent = 'Loading games...';
        statusEl.style.color = '#8b5cf6';
        emptyState.style.display = 'none';

        const response = await fetch(getGamesApiUrl('games/all'));
        if (!response.ok) throw new Error('Failed to load games');

        const data = await response.json();
        
        if (!data.games || data.games.length === 0) {
            statusEl.textContent = 'No games available';
            statusEl.style.color = '#ef4444';
            emptyState.style.display = '';
            return;
        }

        // Store games and display first 20
        window.allGames = data.games;
        window.currentGameIndex = 0;
        window.gamesPerLoad = 20;
        
        statusEl.textContent = `Loaded ${data.count} games`;
        statusEl.style.color = '#10b981';
        resultsCount.textContent = `${data.count} games`;
        
        resultsGrid.innerHTML = '';
        resultsSection.style.display = '';
        loadMoreGames();

    } catch (error) {
        console.error('Browse all games error:', error);
        statusEl.textContent = 'Failed to load games. Please try again.';
        statusEl.style.color = '#ef4444';
        emptyState.style.display = '';
    }
}

// Export functions
window.isTorBoxSupported = isTorBoxSupported;
window.showGamesDownloaderPage = showGamesDownloaderPage;
window.loadGameCategories = loadGameCategories;
window.browseByCategory = browseByCategory;
window.searchGames = searchGames;
window.browseAllGames = browseAllGames;

// Initialize event listeners for games page
function initGamesEventListeners() {
    // Search button
    const searchBtn = document.getElementById('games-search-btn');
    const searchInput = document.getElementById('games-search-input');
    
    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', () => {
            const query = searchInput.value.trim();
            if (query) {
                searchGames(query);
            }
        });
        
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = searchInput.value.trim();
                if (query) {
                    searchGames(query);
                }
            }
        });
    }
    
    // Category dropdown
    const categorySelect = document.getElementById('games-category-select');
    if (categorySelect) {
        categorySelect.addEventListener('change', (e) => {
            const category = e.target.value;
            if (category) {
                browseByCategory(category);
            }
        });
    }
    
    // Browse all button
    const browseAllBtn = document.getElementById('games-browse-all-btn');
    if (browseAllBtn) {
        browseAllBtn.addEventListener('click', () => {
            if (typeof browseAllGames === 'function') {
                browseAllGames();
            }
        });
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGamesEventListeners);
} else {
    initGamesEventListeners();
}

window.initGamesEventListeners = initGamesEventListeners;

console.log('[GAMES] Games module loaded');


// ===== GAMES LIBRARY FUNCTIONALITY =====

let gamesLibraryRefreshInterval = null;

function loadMoreGames() {
    const statusEl = document.getElementById('games-search-status');
    const resultsSection = document.getElementById('games-results-section');
    const resultsGrid = document.getElementById('games-results-grid');
    const resultsCount = document.getElementById('games-results-count');

    if (!window.allGames || window.allGames.length === 0) return;

    const startIndex = window.currentGameIndex;
    const endIndex = Math.min(startIndex + window.gamesPerLoad, window.allGames.length);
    const gamesToLoad = window.allGames.slice(startIndex, endIndex);

    // Display status
    statusEl.textContent = `Showing ${endIndex} of ${window.allGames.length} games`;
    statusEl.style.color = '#10b981';
    resultsCount.textContent = `${endIndex} / ${window.allGames.length} games`;

    gamesToLoad.forEach(game => {
        const card = document.createElement('div');
        card.className = 'music-card';
        card.style.cursor = 'default';
        
        const imageUrl = game.imgID 
            ? getGamesApiUrl(`games/image/${game.imgID}`)
            : 'https://via.placeholder.com/300x400?text=No+Image';
        const gameTitle = game.game || game.name || 'Unknown Game';
        const gameSize = game.size || '';
        
        let downloadLinksHtml = '';
        if (game.download_links && typeof game.download_links === 'object') {
            const links = [];
            
            Object.keys(game.download_links).forEach(linkType => {
                const urls = game.download_links[linkType];
                if (Array.isArray(urls)) {
                    urls.forEach((url, index) => {
                        const fullUrl = url.startsWith('//') ? 'https:' + url : url;
                        const displayName = linkType.charAt(0).toUpperCase() + linkType.slice(1) + (urls.length > 1 ? ` ${index + 1}` : '');
                        links.push({name: displayName, url: fullUrl, provider: linkType});
                    });
                } else if (typeof urls === 'string') {
                    const fullUrl = urls.startsWith('//') ? 'https:' + urls : urls;
                    const displayName = linkType.charAt(0).toUpperCase() + linkType.slice(1);
                    links.push({name: displayName, url: fullUrl, provider: linkType});
                }
            });
            
            if (links.length > 0) {
                downloadLinksHtml = links.map(link => {
                    const torboxSupported = isTorBoxSupported(link.url);
                    const bgColor = torboxSupported ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #6b7280, #4b5563)';
                    const torboxIcon = torboxSupported ? '<i class="fas fa-bolt" style="color:#fbbf24;margin-right:2px;" title="TorBox Supported"></i>' : '<i class="fas fa-external-link-alt" style="margin-right:2px;" title="Opens in Browser"></i>';
                    const tooltip = torboxSupported ? 'TorBox supported - Click to download in-app' : 'Opens in browser (not supported by TorBox)';
                    return `
                    <button class="game-download-link" data-url="${link.url}" data-name="${gameTitle.replace(/"/g, '&quot;')}" data-image="${imageUrl}" data-size="${gameSize}" data-provider="${link.provider}" data-torbox="${torboxSupported}" style="padding: 0.4rem 0.8rem; background: ${bgColor}; border: none; border-radius: 6px; color: white; font-size: 0.85rem; cursor: pointer; margin: 0.2rem; transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'" title="${tooltip}">
                        ${torboxIcon} ${link.name}
                    </button>
                `;
                }).join('');
            }
        }
        
        if (!downloadLinksHtml) {
            downloadLinksHtml = '<span style="color: var(--secondary); font-size: 0.85rem;">No download links available</span>';
        }
        
        const categories = Array.isArray(game.category) 
            ? game.category.join(', ')
            : (game.category || 'N/A');

        card.innerHTML = `
            <div class="music-cover">
                <img loading="lazy" src="${imageUrl}" alt="${gameTitle}" onerror="this.onerror=null; this.src='https://via.placeholder.com/300x400?text=${encodeURIComponent(gameTitle)}'">
            </div>
            <div class="music-info">
                <div class="music-title">${gameTitle}</div>
                <div class="music-artist" style="color: #8b5cf6;">${categories}</div>
                ${game.size ? `<div style="color: var(--secondary); font-size: 0.85rem; margin: 0.3rem 0;"><i class="fas fa-hdd"></i> Size: ${game.size}</div>` : ''}
                ${game.version ? `<div style="color: var(--secondary); font-size: 0.85rem; margin: 0.3rem 0;"><i class="fas fa-tag"></i> Version: ${game.version}</div>` : ''}
                ${game.description ? `<div style="color: var(--secondary); font-size: 0.85rem; margin: 0.5rem 0; line-height: 1.4;">${game.description.substring(0, 150)}${game.description.length > 150 ? '...' : ''}</div>` : ''}
                <div class="music-actions" style="flex-wrap: wrap; margin-top: 0.5rem;">
                    ${downloadLinksHtml}
                </div>
            </div>
        `;
        resultsGrid.appendChild(card);
    });

    // Add click handlers
    resultsGrid.querySelectorAll('.game-download-link').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const url = e.currentTarget.getAttribute('data-url');
            const name = e.currentTarget.getAttribute('data-name');
            const image = e.currentTarget.getAttribute('data-image');
            const size = e.currentTarget.getAttribute('data-size');
            const provider = e.currentTarget.getAttribute('data-provider');
            if (url) {
                addGameToLibrary(url, name, image, size, provider);
            }
        });
        btn.addEventListener('contextmenu', async (e) => {
            e.preventDefault();
            const url = e.currentTarget.getAttribute('data-url');
            if (url && window.electronAPI?.openExternal) {
                await window.electronAPI.openExternal(url);
                showNotification('Opening in browser...', 'info');
            }
        });
    });

    window.currentGameIndex = endIndex;

    // Show/hide Load More button
    let loadMoreBtn = document.getElementById('games-load-more-btn');
    if (!loadMoreBtn) {
        loadMoreBtn = document.createElement('button');
        loadMoreBtn.id = 'games-load-more-btn';
        loadMoreBtn.innerHTML = '<i class="fas fa-arrow-down"></i> Load More Games';
        loadMoreBtn.style.cssText = 'display: block; margin: 2rem auto; padding: 0.75rem 2rem; background: linear-gradient(135deg, #f97316, #ea580c); border: none; border-radius: 8px; color: white; font-weight: 600; cursor: pointer; transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); font-size: 1rem;';
        loadMoreBtn.onmouseover = () => loadMoreBtn.style.transform = 'scale(1.05)';
        loadMoreBtn.onmouseout = () => loadMoreBtn.style.transform = 'scale(1)';
        loadMoreBtn.onclick = loadMoreGames;
        resultsGrid.parentElement.appendChild(loadMoreBtn);
    }

    if (window.currentGameIndex >= window.allGames.length) {
        loadMoreBtn.style.display = 'none';
    } else {
        loadMoreBtn.style.display = 'block';
    }

    resultsSection.style.display = '';
    document.getElementById('games-empty-state').style.display = 'none';
}

function initGamesLibrary() {
    const browseTab = document.getElementById('games-browse-tab');
    const libraryTab = document.getElementById('games-library-tab');
    const browseSection = document.getElementById('games-browse-section');
    const librarySection = document.getElementById('games-library-section');
    const openFolderBtn = document.getElementById('games-open-folder-btn');
    const refreshLibraryBtn = document.getElementById('games-refresh-library-btn');
    
    if (browseTab && libraryTab) {
        browseTab.addEventListener('click', () => {
            browseTab.style.background = 'linear-gradient(135deg, #8b5cf6, #7c3aed)';
            browseTab.style.border = 'none';
            browseTab.style.color = 'white';
            libraryTab.style.background = 'rgba(139,92,246,0.2)';
            libraryTab.style.border = '2px solid rgba(139,92,246,0.3)';
            libraryTab.style.color = '#a78bfa';
            browseSection.style.display = 'block';
            librarySection.style.display = 'none';
            stopLibraryRefresh();
        });
        
        libraryTab.addEventListener('click', () => {
            libraryTab.style.background = 'linear-gradient(135deg, #8b5cf6, #7c3aed)';
            libraryTab.style.border = 'none';
            libraryTab.style.color = 'white';
            browseTab.style.background = 'rgba(139,92,246,0.2)';
            browseTab.style.border = '2px solid rgba(139,92,246,0.3)';
            browseTab.style.color = '#a78bfa';
            browseSection.style.display = 'none';
            librarySection.style.display = 'block';
            loadGamesLibrary();
            startLibraryRefresh();
        });
    }
    
    if (openFolderBtn) {
        openFolderBtn.addEventListener('click', async () => {
            try {
                const resp = await fetch(getGamesApiUrl('game-downloads/open-folder'));
                const data = await resp.json();
                if (data.folder && window.electronAPI?.openPath) {
                    await window.electronAPI.openPath(data.folder);
                } else if (data.folder && window.electronAPI?.openExternal) {
                    await window.electronAPI.openExternal('file://' + data.folder);
                }
            } catch (e) {
                showNotification('Could not open folder', 'error');
            }
        });
    }
    
    if (refreshLibraryBtn) {
        refreshLibraryBtn.addEventListener('click', () => loadGamesLibrary());
    }
    
    checkTorBoxStatus();
}

function startLibraryRefresh() {
    stopLibraryRefresh();
    gamesLibraryRefreshInterval = setInterval(() => loadGamesLibrary(true), 2000);
}

function stopLibraryRefresh() {
    if (gamesLibraryRefreshInterval) {
        clearInterval(gamesLibraryRefreshInterval);
        gamesLibraryRefreshInterval = null;
    }
}

async function checkTorBoxStatus() {
    try {
        const resp = await fetch(getGamesApiUrl('game-downloads/torbox-status'));
        const data = await resp.json();
        const statusEl = document.getElementById('games-torbox-status');
        if (statusEl) {
            if (data.hasTorBox) {
                statusEl.style.display = 'block';
                statusEl.style.background = 'rgba(16,185,129,0.1)';
                statusEl.style.border = '1px solid rgba(16,185,129,0.3)';
                statusEl.innerHTML = '<i class="fas fa-bolt" style="color:#10b981"></i> <span style="color:#10b981">TorBox Premium enabled</span> - Downloads will use TorBox for faster speeds';
            } else {
                statusEl.style.display = 'block';
                statusEl.style.background = 'rgba(251,191,36,0.1)';
                statusEl.style.border = '1px solid rgba(251,191,36,0.3)';
                statusEl.innerHTML = '<i class="fas fa-info-circle" style="color:#fbbf24"></i> <span style="color:#fbbf24">Direct download mode</span> - <a href="#" onclick="showSection(\'settings\');return false;" style="color:#8b5cf6">Login to TorBox</a> for faster downloads';
            }
        }
    } catch (e) {}
}

async function loadGamesLibrary(silent = false) {
    const grid = document.getElementById('games-library-grid');
    const emptyState = document.getElementById('games-library-empty');
    const countBadge = document.getElementById('games-library-count');
    
    try {
        const resp = await fetch(getGamesApiUrl('game-downloads/library'));
        const data = await resp.json();
        
        if (!data.downloads || data.downloads.length === 0) {
            grid.innerHTML = '';
            emptyState.style.display = 'block';
            countBadge.textContent = '0';
            countBadge.style.display = 'none';
            return;
        }
        
        emptyState.style.display = 'none';
        
        // Update count badge
        const activeCount = data.downloads.filter(d => d.status === 'downloading' || d.status === 'pending').length;
        countBadge.textContent = activeCount;
        if (activeCount > 0) {
            countBadge.style.display = 'inline';
        } else {
            countBadge.style.display = 'none';
        }
        
        // Render downloads
        grid.innerHTML = data.downloads.map(dl => renderDownloadCard(dl)).join('');
        
        // Attach event handlers
        grid.querySelectorAll('.game-dl-pause').forEach(btn => {
            btn.addEventListener('click', () => pauseGameDownload(btn.dataset.id));
        });
        grid.querySelectorAll('.game-dl-resume').forEach(btn => {
            btn.addEventListener('click', () => resumeGameDownload(btn.dataset.id));
        });
        grid.querySelectorAll('.game-dl-remove').forEach(btn => {
            btn.addEventListener('click', () => removeGameDownload(btn.dataset.id));
        });
        grid.querySelectorAll('.game-dl-folder').forEach(btn => {
            btn.addEventListener('click', async () => {
                const filePath = btn.dataset.path;
                if (filePath && window.electronAPI?.showFolderInExplorer) {
                    const folderPath = filePath.substring(0, filePath.lastIndexOf(filePath.includes('/') ? '/' : '\\'));
                    await window.electronAPI.showFolderInExplorer(folderPath);
                }
            });
        });
        
    } catch (e) {
        if (!silent) showNotification('Failed to load library', 'error');
    }
}

function renderDownloadCard(dl) {
    const statusColors = {
        'pending': '#fbbf24',
        'downloading': '#3b82f6',
        'paused': '#f97316',
        'completed': '#10b981',
        'error': '#ef4444'
    };
    const statusIcons = {
        'pending': 'fa-clock',
        'downloading': 'fa-download',
        'paused': 'fa-pause',
        'completed': 'fa-check-circle',
        'error': 'fa-exclamation-circle'
    };
    
    const color = statusColors[dl.status] || '#6b7280';
    const icon = statusIcons[dl.status] || 'fa-question';
    const speed = dl.speed > 0 ? formatSpeed(dl.speed) : '';
    const size = dl.totalBytes > 0 ? formatBytes(dl.totalBytes) : (dl.gameSize || 'Unknown size');
    const downloaded = dl.downloadedBytes > 0 ? formatBytes(dl.downloadedBytes) : '0 B';
    
    let actions = '';
    if (dl.status === 'downloading') {
        actions = `<button class="game-dl-pause" data-id="${dl.id}" style="padding:0.4rem 0.8rem;background:#f97316;border:none;border-radius:6px;color:white;cursor:pointer;font-size:0.85rem;"><i class="fas fa-pause"></i> Pause</button>`;
    } else if (dl.status === 'paused' || dl.status === 'error') {
        actions = `<button class="game-dl-resume" data-id="${dl.id}" style="padding:0.4rem 0.8rem;background:#10b981;border:none;border-radius:6px;color:white;cursor:pointer;font-size:0.85rem;"><i class="fas fa-play"></i> Resume</button>`;
    }
    if (dl.filePath) {
        actions += `<button class="game-dl-folder" data-path="${dl.filePath}" style="padding:0.4rem 0.8rem;background:#3b82f6;border:none;border-radius:6px;color:white;cursor:pointer;font-size:0.85rem;margin-left:0.5rem;" title="Open file location"><i class="fas fa-folder-open"></i></button>`;
    }
    actions += `<button class="game-dl-remove" data-id="${dl.id}" style="padding:0.4rem 0.8rem;background:#ef4444;border:none;border-radius:6px;color:white;cursor:pointer;font-size:0.85rem;margin-left:0.5rem;"><i class="fas fa-trash"></i></button>`;
    
    return `
        <div style="background:rgba(20,20,31,0.8);border:1px solid rgba(139,92,246,0.2);border-radius:12px;padding:1rem;display:flex;gap:1rem;align-items:center;">
            <div style="width:80px;height:80px;border-radius:8px;overflow:hidden;flex-shrink:0;background:#1a1a2e;">
                ${dl.gameImage ? `<img src="${dl.gameImage}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'">` : '<i class="fas fa-gamepad" style="font-size:2rem;color:#8b5cf6;display:flex;align-items:center;justify-content:center;height:100%;"></i>'}
            </div>
            <div style="flex:1;min-width:0;">
                <div style="font-weight:600;color:var(--light);margin-bottom:0.3rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${dl.gameName}</div>
                <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;">
                    <i class="fas ${icon}" style="color:${color}"></i>
                    <span style="color:${color};font-size:0.85rem;text-transform:capitalize;">${dl.status}</span>
                    ${speed ? `<span style="color:var(--secondary);font-size:0.8rem;">• ${speed}</span>` : ''}
                    ${dl.useTorBox ? '<span style="color:#10b981;font-size:0.75rem;background:rgba(16,185,129,0.2);padding:0.1rem 0.4rem;border-radius:4px;">TorBox</span>' : ''}
                </div>
                <div style="background:rgba(139,92,246,0.2);border-radius:4px;height:6px;overflow:hidden;margin-bottom:0.5rem;">
                    <div style="background:linear-gradient(90deg,#8b5cf6,#7c3aed);height:100%;width:${dl.progress}%;transition:width 0.3s;"></div>
                </div>
                <div style="display:flex;justify-content:space-between;font-size:0.8rem;color:var(--secondary);">
                    <span>${downloaded} / ${size}</span>
                    <span>${dl.progress}%</span>
                </div>
                <div style="margin-top:0.5rem;">${actions}</div>
                ${dl.error ? `<div style="color:#ef4444;font-size:0.8rem;margin-top:0.3rem;">${dl.error}</div>` : ''}
            </div>
        </div>
    `;
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatSpeed(bytesPerSec) {
    return formatBytes(bytesPerSec) + '/s';
}

async function pauseGameDownload(id) {
    try {
        await fetch(getGamesApiUrl(`game-downloads/pause/${id}`), { method: 'POST' });
        loadGamesLibrary();
    } catch (e) {
        showNotification('Failed to pause download', 'error');
    }
}

async function resumeGameDownload(id) {
    try {
        await fetch(getGamesApiUrl(`game-downloads/resume/${id}`), { method: 'POST' });
        loadGamesLibrary();
    } catch (e) {
        showNotification('Failed to resume download', 'error');
    }
}

async function removeGameDownload(id) {
    if (!confirm('Remove this download? The file will also be deleted.')) return;
    try {
        const grid = document.getElementById('games-library-grid');
        const cardToRemove = grid.querySelector(`[data-id="${id}"]`)?.closest('div[style*="background"]');
        if (cardToRemove) {
            cardToRemove.style.opacity = '0.5';
            cardToRemove.style.pointerEvents = 'none';
        }
        
        try {
            await fetch(getGamesApiUrl(`game-downloads/pause/${id}`), { method: 'POST' });
        } catch (e) {}
        
        await new Promise(r => setTimeout(r, 200));
        
        const deleteResp = await fetch(getGamesApiUrl(`game-downloads/${id}?deleteFile=true`), { method: 'DELETE' });
        const deleteData = await deleteResp.json();
        
        if (!deleteResp.ok || !deleteData.success) {
            throw new Error(deleteData.error || 'Delete failed');
        }
        
        await new Promise(r => setTimeout(r, 100));
        await loadGamesLibrary();
        
        showNotification('Download removed', 'success');
    } catch (e) {
        console.error('[GameDownloads] Remove error:', e);
        showNotification('Failed to remove download', 'error');
        await loadGamesLibrary();
    }
}

async function addGameToLibrary(url, gameName, gameImage, gameSize, provider) {
    try {
        const torboxSupported = isTorBoxSupported(url);
        
        if (!torboxSupported) {
            if (window.electronAPI?.openExternal) {
                await window.electronAPI.openExternal(url);
                showNotification(`Opening "${gameName}" in browser - This host is not supported by TorBox`, 'info');
            } else {
                window.open(url, '_blank');
                showNotification(`Opening "${gameName}" in new tab - This host is not supported by TorBox`, 'info');
            }
            return;
        }
        
        const torboxResp = await fetch(getGamesApiUrl('game-downloads/torbox-status'));
        const torboxData = await torboxResp.json();
        
        if (!torboxData.hasTorBox) {
            if (window.electronAPI?.openExternal) {
                await window.electronAPI.openExternal(url);
                showNotification(`Opening "${gameName}" in browser - Login to TorBox for in-app downloads`, 'info');
            } else {
                window.open(url, '_blank');
                showNotification(`Opening "${gameName}" in new tab - Login to TorBox for in-app downloads`, 'info');
            }
            return;
        }
        
        const resp = await fetch(getGamesApiUrl('game-downloads/add'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, gameName, gameImage, gameSize, provider })
        });
        const data = await resp.json();
        if (data.success) {
            showNotification(`Added "${gameName}" to library. Download started!`, 'success');
            loadGamesLibrary();
        } else {
            showNotification(data.error || 'Failed to add to library', 'error');
        }
    } catch (e) {
        showNotification('Failed to add to library', 'error');
    }
}

// Export additional functions
window.loadMoreGames = loadMoreGames;
window.initGamesLibrary = initGamesLibrary;
window.startLibraryRefresh = startLibraryRefresh;
window.stopLibraryRefresh = stopLibraryRefresh;
window.checkTorBoxStatus = checkTorBoxStatus;
window.loadGamesLibrary = loadGamesLibrary;
window.renderDownloadCard = renderDownloadCard;
window.formatBytes = formatBytes;
window.formatSpeed = formatSpeed;
window.pauseGameDownload = pauseGameDownload;
window.resumeGameDownload = resumeGameDownload;
window.removeGameDownload = removeGameDownload;
window.addGameToLibrary = addGameToLibrary;
