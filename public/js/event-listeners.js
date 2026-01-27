// Event Listeners Setup
// This file handles all event listener initialization

function setupEventListeners() {
    console.log('[EventListeners] Setting up event listeners...');
    
    // ===== SIDEBAR NAVIGATION =====
    setupSidebarNavigation();
    
    // ===== HEADER BUTTONS =====
    setupHeaderButtons();
    
    // ===== FLOATING NAVIGATION =====
    setupFloatingNavigation();
    
    // ===== FLOATING SETTINGS MENU =====
    setupFloatingSettingsMenu();
    
    // ===== CUSTOM TITLE BAR =====
    setupTitleBar();
    
    // ===== MODALS =====
    setupModalListeners();
    
    // ===== SETTINGS =====
    setupSettingsListeners();
    
    // ===== DEBRID =====
    setupDebridEventListeners();
    
    // ===== AUTO-UPDATER =====
    setupAutoUpdaterListener();
    
    // ===== GENRE PAGE =====
    setupGenrePageListeners();
    
    // ===== CATEGORY BUTTONS (All/Movies/TV Shows) =====
    setupCategoryButtons();
    
    // ===== IPTV =====
    if (typeof initIptvEventListeners === 'function') {
        initIptvEventListeners();
    }
    if (typeof initIptvSourceSelector === 'function') {
        initIptvSourceSelector();
    }
    
    // ===== MUSIC =====
    if (typeof setupMusicPageButtons === 'function') {
        setupMusicPageButtons();
    }
    
    console.log('[EventListeners] All event listeners set up');
}

// ===== FLOATING SETTINGS MENU =====
function setupFloatingSettingsMenu() {
    const floatingBtn = document.getElementById('floatingSettingsBtn');
    const floatingMenu = document.getElementById('floatingSettingsMenu');
    
    if (!floatingBtn || !floatingMenu) return;
    
    // Toggle menu on button click
    floatingBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        floatingBtn.classList.toggle('active');
        floatingMenu.classList.toggle('active');
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.floating-settings-container')) {
            floatingBtn.classList.remove('active');
            floatingMenu.classList.remove('active');
        }
    });
    
    // Handle menu item clicks
    const menuItems = floatingMenu.querySelectorAll('.floating-menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            const page = item.dataset.page;
            
            // Close menu
            floatingBtn.classList.remove('active');
            floatingMenu.classList.remove('active');
            
            // Navigate to page
            switch (page) {
                case 'home':
                    window.location.hash = '#/';
                    break;
                case 'genres':
                    window.location.hash = '#/genres';
                    break;
                case 'my-list':
                    window.location.hash = '#/my-list';
                    break;
                case 'done-watching':
                    window.location.hash = '#/done-watching';
                    break;
                case 'trakt':
                    window.location.hash = '#/trakt';
                    break;
                case 'iptv':
                    window.location.hash = '#/iptv';
                    break;
                case 'books':
                    window.location.hash = '#/books';
                    break;
                case 'audiobooks':
                    window.location.hash = '#/audiobooks';
                    break;
                case 'anime':
                    window.location.hash = '#/anime';
                    break;
                case 'comics':
                    window.location.hash = '#/comics';
                    break;
                case 'manga':
                    window.location.hash = '#/manga';
                    break;
                case 'music':
                    window.location.hash = '#/music';
                    break;
                case 'downloader':
                    window.location.hash = '#/downloader';
                    break;
                case 'settings':
                    window.location.hash = '#/settings';
                    break;
                default:
                    console.log('[FloatingMenu] Unknown page:', page);
            }
        });
    });
    
    console.log('[EventListeners] Floating settings menu set up');
}

// ===== CATEGORY BUTTONS (All/Movies/TV Shows on Home Page) =====
function setupCategoryButtons() {
    const categoryButtons = document.querySelectorAll('.category[data-category]');
    
    categoryButtons.forEach(btn => {
        btn.addEventListener('click', async () => {
            const category = btn.dataset.category;
            console.log('[EventListeners] Category clicked:', category);
            
            // Update active state
            categoryButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Check if we're in search mode (use the global isSearchMode from movies.js)
            const inSearchMode = window.isSearchMode === true;
            
            if (inSearchMode && window.lastSearchResults && window.lastSearchResults.length > 0) {
                // Filter search results
                console.log('[EventListeners] Filtering search results by:', category);
                
                const moviesGrid = document.getElementById('moviesGrid');
                if (moviesGrid) moviesGrid.innerHTML = '';
                
                let filtered = window.lastSearchResults;
                
                if (category === 'movie') {
                    filtered = window.lastSearchResults.filter(item => 
                        item.media_type === 'movie' || (!item.media_type && item.release_date)
                    );
                } else if (category === 'tv') {
                    filtered = window.lastSearchResults.filter(item => 
                        item.media_type === 'tv' || (!item.media_type && item.first_air_date)
                    );
                }
                // 'all' shows everything
                
                if (typeof displayMovies === 'function') {
                    displayMovies(filtered, false);
                }
            } else {
                // Not in search mode - load from TMDB
                
                // Update global category
                if (typeof window.currentCategory !== 'undefined') {
                    window.currentCategory = category;
                }
                
                // Reset page
                window.currentPage = 1;
                
                // Hide sliders and show grid for filtered view
                const slidersContainer = document.getElementById('slidersContainer');
                const heroSection = document.getElementById('heroSection');
                const moviesGrid = document.getElementById('moviesGrid');
                const backBtn = document.getElementById('backToHomeBtn');
                
                if (category === 'all') {
                    // Show sliders view for "All"
                    if (slidersContainer) slidersContainer.style.display = 'block';
                    if (heroSection) heroSection.style.display = 'block';
                    if (moviesGrid) moviesGrid.style.display = 'none';
                    if (backBtn) backBtn.style.display = 'none';
                    
                    // Reload sliders if needed
                    if (typeof initializeNewUI === 'function') {
                        initializeNewUI();
                    }
                } else {
                    // Show grid view for Movies or TV Shows
                    if (slidersContainer) slidersContainer.style.display = 'none';
                    if (heroSection) heroSection.style.display = 'none';
                    if (moviesGrid) {
                        moviesGrid.style.display = 'grid';
                        moviesGrid.innerHTML = '';
                    }
                    if (backBtn) backBtn.style.display = 'block';
                    
                    // Load filtered content
                    if (typeof loadMovies === 'function') {
                        await loadMovies(category);
                    }
                }
            }
        });
    });
    
    console.log('[EventListeners] Category buttons set up:', categoryButtons.length);
}

// ===== GENRE PAGE LISTENERS =====
function setupGenrePageListeners() {
    const toggleMoviesBtn = document.getElementById('toggleMovies');
    const toggleTVBtn = document.getElementById('toggleTV');
    
    if (toggleMoviesBtn) {
        toggleMoviesBtn.addEventListener('click', () => {
            if (typeof setGenreType === 'function') {
                setGenreType('movie');
            }
            // Update active state
            toggleMoviesBtn.classList.add('active');
            if (toggleTVBtn) toggleTVBtn.classList.remove('active');
        });
    }
    
    if (toggleTVBtn) {
        toggleTVBtn.addEventListener('click', () => {
            if (typeof setGenreType === 'function') {
                setGenreType('tv');
            }
            // Update active state
            toggleTVBtn.classList.add('active');
            if (toggleMoviesBtn) toggleMoviesBtn.classList.remove('active');
        });
    }
}

// ===== SIDEBAR NAVIGATION =====
function setupSidebarNavigation() {
    // Sidebar close/toggle buttons
    const sidebar = document.querySelector('.app-sidebar') || document.getElementById('appSidebar');
    const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
    const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
    const mainContent = document.querySelector('.app-main');
    
    console.log('[Sidebar] Setting up sidebar toggle. Sidebar:', !!sidebar, 'CloseBtn:', !!sidebarCloseBtn, 'ToggleBtn:', !!sidebarToggleBtn);
    
    if (sidebarCloseBtn && sidebar) {
        sidebarCloseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log('[Sidebar] Close button clicked');
            sidebar.classList.add('sidebar-hidden');
            if (mainContent) mainContent.classList.add('sidebar-collapsed');
            if (sidebarToggleBtn) sidebarToggleBtn.style.display = 'flex';
            localStorage.setItem('sidebarHidden', 'true');
        });
    }
    
    if (sidebarToggleBtn && sidebar) {
        sidebarToggleBtn.addEventListener('click', () => {
            console.log('[Sidebar] Toggle button clicked');
            sidebar.classList.remove('sidebar-hidden');
            if (mainContent) mainContent.classList.remove('sidebar-collapsed');
            sidebarToggleBtn.style.display = 'none';
            localStorage.setItem('sidebarHidden', 'false');
        });
        
        // Check saved state
        if (localStorage.getItem('sidebarHidden') === 'true') {
            sidebar.classList.add('sidebar-hidden');
            if (mainContent) mainContent.classList.add('sidebar-collapsed');
            sidebarToggleBtn.style.display = 'flex';
        } else {
            sidebarToggleBtn.style.display = 'none';
        }
    }
    
    const sidebarNavItems = document.querySelectorAll('.nav-item[data-page]');
    sidebarNavItems.forEach(item => {
        item.addEventListener('click', () => {
            const page = item.dataset.page;
            
            // Update active state
            sidebarNavItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            // Navigate to page
            switch (page) {
                case 'home':
                    window.location.hash = '#/';
                    break;
                case 'genres':
                    window.location.hash = '#/genres';
                    break;
                case 'catalogs':
                    window.location.hash = '#/catalogs';
                    break;
                case 'my-list':
                    window.location.hash = '#/my-list';
                    break;
                case 'done-watching':
                    window.location.hash = '#/done-watching';
                    break;
                case 'trakt':
                    window.location.hash = '#/trakt';
                    break;
                case 'livetv':
                    window.location.hash = '#/livetv';
                    break;
                case 'iptv':
                    window.location.hash = '#/iptv';
                    break;
                case 'custom-servers':
                    window.location.hash = '#/custom-servers';
                    break;
                case 'books':
                    window.location.hash = '#/books';
                    break;
                case 'audiobooks':
                    window.location.hash = '#/audiobooks';
                    break;
                case 'booktorrio':
                    window.location.hash = '#/booktorrio';
                    break;
                case 'anime':
                    window.location.hash = '#/anime';
                    break;
                case 'comics':
                    window.location.hash = '#/comics';
                    break;
                case 'manga':
                    window.location.hash = '#/manga';
                    break;
                case 'music':
                    window.location.hash = '#/music';
                    break;
                case 'games-downloader':
                    window.location.hash = '#/games-downloader';
                    break;
                case 'minigames':
                    window.location.hash = '#/minigames';
                    break;
                case 'downloader':
                    window.location.hash = '#/downloader';
                    break;
                default:
                    console.log('[Nav] Unknown page:', page);
            }
        });
    });
    
    // Sidebar Clear Cache button
    const sidebarClearCache = document.getElementById('sidebarClearCache');
    if (sidebarClearCache) {
        sidebarClearCache.addEventListener('click', async () => {
            if (window.electronAPI?.clearCache) {
                const result = await window.electronAPI.clearCache();
                if (typeof showNotification === 'function') {
                    showNotification(result.message, result.success ? 'success' : 'error');
                }
            }
        });
    }
    
    // Sidebar Settings button
    const sidebarSettings = document.getElementById('sidebarSettings');
    if (sidebarSettings) {
        sidebarSettings.addEventListener('click', () => {
            if (typeof showSettingsModal === 'function') {
                showSettingsModal();
            }
        });
    }
    
    console.log('[EventListeners] Sidebar navigation set up');
}

// ===== HEADER BUTTONS =====
function setupHeaderButtons() {
    // Genres button
    const genresBtn = document.getElementById('genresBtn');
    if (genresBtn) {
        genresBtn.addEventListener('click', () => {
            window.location.hash = '#/genres';
        });
    }
    
    // My List button
    const myListBtn = document.getElementById('myListBtn');
    if (myListBtn) {
        myListBtn.addEventListener('click', () => {
            window.location.hash = '#/my-list';
        });
    }
    
    // Done Watching button
    const doneWatchingBtn = document.getElementById('doneWatchingBtn');
    if (doneWatchingBtn) {
        doneWatchingBtn.addEventListener('click', () => {
            window.location.hash = '#/done-watching';
        });
    }
    
    // Clear Cache button
    const clearCacheBtn = document.getElementById('clearCacheBtn');
    if (clearCacheBtn) {
        clearCacheBtn.addEventListener('click', async () => {
            if (window.electronAPI?.clearCache) {
                const result = await window.electronAPI.clearCache();
                if (typeof showNotification === 'function') {
                    showNotification(result.message, result.success ? 'success' : 'error');
                }
            } else {
                if (typeof showNotification === 'function') {
                    showNotification('Cache clearing not available in browser', 'info');
                }
            }
        });
    }
    
    // Discord button
    const discordBtn = document.getElementById('discordBtn');
    if (discordBtn) {
        discordBtn.addEventListener('click', async () => {
            const url = 'https://discord.gg/bbkVHRHnRk';
            try {
                if (window.electronAPI?.openExternal) {
                    await window.electronAPI.openExternal(url);
                } else {
                    window.open(url, '_blank', 'noopener');
                }
                if (typeof showNotification === 'function') {
                    showNotification('Opening Discord...', 'success');
                }
            } catch (err) {
                console.error('Failed to open Discord:', err);
            }
        });
    }
    
    // Donate button
    const donateBtn = document.getElementById('donateBtn');
    if (donateBtn) {
        donateBtn.addEventListener('click', async () => {
            const url = 'https://ko-fi.com/ayman228x';
            try {
                if (window.electronAPI?.openExternal) {
                    await window.electronAPI.openExternal(url);
                } else {
                    window.open(url, '_blank', 'noopener');
                }
                if (typeof showNotification === 'function') {
                    showNotification('Opening Ko-fi...', 'success');
                }
            } catch (err) {
                console.error('Failed to open Ko-fi:', err);
            }
        });
    }
    
    // Settings button (header) - removed, use sidebar settings instead
    
    // Refresh button
    const refreshBtn = document.getElementById('quickRefresh');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            window.location.reload();
        });
    }
    
    console.log('[EventListeners] Header buttons set up');
}

// ===== FLOATING NAVIGATION =====
function setupFloatingNavigation() {
    const floatingNavContainer = document.getElementById('floatingNavContainer');
    const floatingNavBtn = document.getElementById('floatingNavBtn');
    const floatingNavMenu = document.getElementById('floatingNavMenu');
    
    if (floatingNavBtn && floatingNavContainer) {
        floatingNavBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            floatingNavContainer.classList.toggle('active');
        });
    }
    
    if (floatingNavMenu) {
        floatingNavMenu.addEventListener('click', (e) => {
            const item = e.target.closest('.floating-nav-item');
            if (item && !item.href) {
                const action = item.getAttribute('data-action');
                if (floatingNavContainer) {
                    floatingNavContainer.classList.remove('active');
                }
                
                switch (action) {
                    case 'settings':
                        if (typeof showSettingsModal === 'function') showSettingsModal();
                        break;
                    case 'home':
                        window.location.hash = '#/';
                        break;
                    case 'genres':
                        window.location.hash = '#/genres';
                        break;
                    case 'my-list':
                        window.location.hash = '#/my-list';
                        break;
                    case 'done-watching':
                        window.location.hash = '#/done-watching';
                        break;
                    case 'trakt':
                        window.location.hash = '#/trakt';
                        break;
                    case 'livetv':
                        window.location.hash = '#/livetv';
                        break;
                    case 'iptv':
                        window.location.hash = '#/iptv';
                        break;
                    case 'books':
                        window.location.hash = '#/books';
                        break;
                    case 'audiobooks':
                        window.location.hash = '#/audiobooks';
                        break;
                    case 'booktorrio':
                        window.location.hash = '#/booktorrio';
                        break;
                    case 'anime':
                        window.location.hash = '#/anime';
                        break;
                    case 'comics':
                        window.location.hash = '#/comics';
                        break;
                    case 'manga':
                        window.location.hash = '#/manga';
                        break;
                    case 'music':
                        window.location.hash = '#/music';
                        break;
                    case 'games-downloader':
                        window.location.hash = '#/games-downloader';
                        break;
                    case 'minigames':
                        window.location.hash = '#/minigames';
                        break;
                    case 'downloader':
                        window.location.hash = '#/downloader';
                        break;
                }
            }
        });
    }
    
    // Close floating nav when clicking outside
    document.addEventListener('click', (e) => {
        if (floatingNavContainer && !floatingNavContainer.contains(e.target)) {
            floatingNavContainer.classList.remove('active');
        }
    });
    
    console.log('[EventListeners] Floating navigation set up');
}

// ===== TITLE BAR =====
function setupTitleBar() {
    const minimizeBtn = document.getElementById('minimizeBtn');
    const maximizeBtn = document.getElementById('maximizeBtn');
    const closeBtn = document.getElementById('closeBtn');
    
    if (minimizeBtn && window.electronAPI) {
        minimizeBtn.addEventListener('click', () => {
            window.electronAPI.minimizeWindow();
        });
    }
    
    if (maximizeBtn && window.electronAPI) {
        maximizeBtn.addEventListener('click', () => {
            window.electronAPI.maximizeWindow();
        });
    }
    
    if (closeBtn && window.electronAPI) {
        closeBtn.addEventListener('click', () => {
            window.electronAPI.closeWindow();
        });
    }
    
    console.log('[EventListeners] Title bar set up');
}

// ===== MODAL LISTENERS =====
function setupModalListeners() {
    // Discord Modal
    const discordClose = document.getElementById('discordClose');
    const discordJoinBtn = document.getElementById('discordJoinBtn');
    const discordDontShowBtn = document.getElementById('discordDontShowBtn');
    
    if (discordClose) {
        discordClose.addEventListener('click', () => {
            if (typeof hideDiscordModal === 'function') hideDiscordModal();
        });
    }
    
    if (discordJoinBtn) {
        discordJoinBtn.addEventListener('click', async () => {
            const url = 'https://discord.gg/bbkVHRHnRk';
            try {
                if (window.electronAPI?.openExternal) {
                    await window.electronAPI.openExternal(url);
                } else {
                    window.open(url, '_blank', 'noopener');
                }
                localStorage.setItem('pt_discord_dismissed_v1', 'true');
                if (typeof hideDiscordModal === 'function') hideDiscordModal();
                if (typeof showNotification === 'function') showNotification('Opening Discord...', 'success');
            } catch (err) {
                console.error('Failed to open Discord:', err);
            }
        });
    }
    
    if (discordDontShowBtn) {
        discordDontShowBtn.addEventListener('click', () => {
            localStorage.setItem('pt_discord_dismissed_v1', 'true');
            if (typeof hideDiscordModal === 'function') hideDiscordModal();
            if (typeof showNotification === 'function') showNotification("We'll stop showing this.", 'success');
        });
    }
    
    // Chromecast Device Modal
    const closeChromecastModal = document.getElementById('close-chromecast-modal');
    if (closeChromecastModal) {
        closeChromecastModal.addEventListener('click', () => {
            const modal = document.getElementById('chromecast-device-modal');
            if (modal) {
                modal.style.display = 'none';
                modal.classList.remove('active');
            }
        });
    }
    
    // Custom Magnet Modal
    const customMagnetModal = document.getElementById('custom-magnet-modal');
    const closeCustomMagnetBtn = document.getElementById('close-custom-magnet-modal');
    const cancelCustomMagnetBtn = document.getElementById('cancel-custom-magnet-btn');
    const playCustomMagnetBtn = document.getElementById('play-custom-magnet-btn');
    const customMagnetInput = document.getElementById('custom-magnet-input');

    const closeCustomMagnetModal = () => {
        if (customMagnetModal) {
            customMagnetModal.style.display = 'none';
            customMagnetModal.classList.remove('active');
            customMagnetModal.style.opacity = '0';
            customMagnetModal.style.pointerEvents = 'none';
        }
        if (customMagnetInput) customMagnetInput.value = '';
    };

    if (closeCustomMagnetBtn) {
        closeCustomMagnetBtn.addEventListener('click', closeCustomMagnetModal);
    }

    if (cancelCustomMagnetBtn) {
        cancelCustomMagnetBtn.addEventListener('click', closeCustomMagnetModal);
    }

    if (customMagnetModal) {
        customMagnetModal.addEventListener('click', (e) => {
            if (e.target === customMagnetModal) {
                closeCustomMagnetModal();
            }
        });
    }

    if (playCustomMagnetBtn && customMagnetInput) {
        playCustomMagnetBtn.addEventListener('click', async () => {
            const magnetLink = customMagnetInput.value.trim();
            
            if (!magnetLink) {
                if (typeof showNotification === 'function') {
                    showNotification('Please enter a magnet link', 'error');
                } else {
                    alert('Please enter a magnet link');
                }
                return;
            }

            if (!magnetLink.startsWith('magnet:')) {
                if (typeof showNotification === 'function') {
                    showNotification('Invalid magnet link. Must start with "magnet:"', 'error');
                } else {
                    alert('Invalid magnet link. Must start with "magnet:"');
                }
                return;
            }

            closeCustomMagnetModal();

            // Call the streaming module with the magnet link
            // This will show the file selector and handle debrid automatically
            if (typeof window.startStream === 'function') {
                await window.startStream(magnetLink);
            } else {
                // Fallback: show error
                if (typeof showNotification === 'function') {
                    showNotification('Streaming module not loaded. Please try again.', 'error');
                } else {
                    alert('Streaming module not loaded. Please try again.');
                }
            }
        });

        // Enter key to play
        customMagnetInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                playCustomMagnetBtn.click();
            }
        });
    }
    
    console.log('[EventListeners] Modal listeners set up');
}

// ===== SETTINGS LISTENERS =====
function setupSettingsListeners() {
    const settingsClose = document.getElementById('settingsClose');
    const cancelSettings = document.getElementById('cancelSettings');
    const saveSettingsBtn = document.getElementById('saveSettings');
    
    if (settingsClose) {
        settingsClose.addEventListener('click', () => {
            if (typeof hideSettingsModal === 'function') hideSettingsModal();
        });
    }
    
    if (cancelSettings) {
        cancelSettings.addEventListener('click', () => {
            if (typeof hideSettingsModal === 'function') hideSettingsModal();
        });
    }
    
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', () => {
            if (typeof saveSettings_ === 'function') {
                saveSettings_();
            } else if (typeof saveSettings === 'function') {
                saveSettings();
            }
        });
    }
    
    // Cache folder browse buttons
    if (window.electronAPI && window.electronAPI.selectCacheFolder) {
        const selectCacheBtns = document.querySelectorAll('#selectCacheBtn');
        selectCacheBtns.forEach(btn => btn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                const result = await window.electronAPI.selectCacheFolder();
                if (result.success && result.path) {
                    document.querySelectorAll('#cacheLocation').forEach(input => { input.value = result.path; });
                }
            } catch (error) {
                console.error('Error selecting cache folder:', error);
            }
        }));
    }
    
    // Theme selector
    document.querySelectorAll('#themeSelector').forEach(selector => {
        selector.addEventListener('change', (e) => {
            if (typeof applyTheme === 'function') applyTheme(e.target.value);
            if (typeof showNotification === 'function') {
                showNotification(`Theme changed to ${e.target.options[e.target.selectedIndex].text}`, 'success');
            }
        });
    });
    
    console.log('[EventListeners] Settings listeners set up');
}


// ===== DEBRID EVENT LISTENERS =====
function setupDebridEventListeners() {
    const useDebridToggle = document.getElementById('useDebridToggle');
    const debridProviderSel = document.getElementById('debridProvider');
    
    if (useDebridToggle || debridProviderSel) {
        const onDebridChange = async () => {
            // Get visible useDebridToggle
            const useDebridToggles = document.querySelectorAll('#useDebridToggle');
            let enabled = false;
            for (const toggle of useDebridToggles) {
                if (toggle.offsetParent !== null) {
                    enabled = !!toggle.checked;
                    break;
                }
            }
            
            // Get visible debridProvider
            const debridProviders = document.querySelectorAll('#debridProvider');
            let provider = 'realdebrid';
            for (const select of debridProviders) {
                if (select.offsetParent !== null) {
                    provider = select.value;
                    break;
                }
            }
            
            try {
                const res = await fetch(`${API_BASE_URL}/settings`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ useDebrid: enabled, debridProvider: provider })
                });
                if (res.ok) {
                    useDebrid = enabled;
                    debridProvider = provider;
                    
                    // Toggle provider-specific UI blocks
                    const isRD = provider === 'realdebrid';
                    const isAD = provider === 'alldebrid';
                    const isTB = provider === 'torbox';
                    const isPM = provider === 'premiumize';
                    
                    document.querySelectorAll('#rdClientIdGroup').forEach(el => el.style.display = isRD ? '' : 'none');
                    document.querySelectorAll('#rdButtons').forEach(el => el.style.display = isRD ? '' : 'none');
                    document.querySelectorAll('#adSection').forEach(el => el.style.display = isAD ? '' : 'none');
                    document.querySelectorAll('#tbSection').forEach(el => el.style.display = isTB ? '' : 'none');
                    document.querySelectorAll('#pmSection').forEach(el => el.style.display = isPM ? '' : 'none');
                    
                    if (typeof showNotification === 'function') showNotification('Debrid settings saved.');
                }
            } catch (err) {
                console.error('Error saving debrid settings:', err);
                if (typeof showNotification === 'function') showNotification('Failed to save debrid settings', 'error');
            }
        };
        
        // Add event listeners
        document.querySelectorAll('#useDebridToggle').forEach(toggle => {
            toggle.addEventListener('change', onDebridChange);
        });
        
        document.querySelectorAll('#debridProvider').forEach(select => {
            select.addEventListener('change', onDebridChange);
        });
    }
    
    console.log('[EventListeners] Debrid listeners set up');
}

// ===== AUTO-UPDATER LISTENER =====
function setupAutoUpdaterListener() {
    if (window.electronAPI && window.electronAPI.onUpdateAvailable) {
        window.electronAPI.onUpdateAvailable((info) => {
            console.log('Update available:', info);
            
            // Create modal
            const modal = document.createElement('div');
            modal.className = 'modal active';
            modal.style.cssText = 'display: flex; z-index: 9999; background: rgba(0, 0, 0, 0.8); backdrop-filter: blur(10px);';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 500px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border: 2px solid rgba(124, 58, 237, 0.5); border-radius: 20px; padding: 2rem; box-shadow: 0 20px 60px rgba(124, 58, 237, 0.3);">
                    <div style="width: 80px; height: 80px; background: rgba(124, 58, 237, 0.2); border-radius: 50%; display: flex; align-items: center; justify-center; margin: 0 auto 1.5rem;">
                        <svg style="width: 40px; height: 40px; color: #7c3aed;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                    </div>
                    <h2 style="font-size: 1.75rem; font-weight: bold; color: white; text-align: center; margin-bottom: 0.5rem;">Update Available!</h2>
                    <p style="color: rgba(255, 255, 255, 0.7); text-align: center; margin-bottom: 2rem;">Version <span style="color: white; font-weight: bold;">${info.version}</span> is ready to download.</p>
                    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                        <button id="update-download-btn" class="btn" style="width: 100%; padding: 0.875rem; background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); color: white; font-weight: bold; border-radius: 12px; border: none; cursor: pointer; transition: all 0.3s; box-shadow: 0 4px 15px rgba(124, 58, 237, 0.4); display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                            <span>Download Now</span>
                            <svg style="width: 20px; height: 20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                        </button>
                        <button id="update-later-btn" style="width: 100%; padding: 0.5rem; background: transparent; color: rgba(255, 255, 255, 0.5); font-size: 0.875rem; font-weight: 500; border: none; cursor: pointer; transition: color 0.3s;">
                            Remind Me Later
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            
            // Add hover effect to download button
            const downloadBtn = document.getElementById('update-download-btn');
            downloadBtn.addEventListener('mouseenter', () => {
                downloadBtn.style.transform = 'translateY(-2px)';
                downloadBtn.style.boxShadow = '0 6px 20px rgba(124, 58, 237, 0.5)';
            });
            downloadBtn.addEventListener('mouseleave', () => {
                downloadBtn.style.transform = 'translateY(0)';
                downloadBtn.style.boxShadow = '0 4px 15px rgba(124, 58, 237, 0.4)';
            });
            
            // Add hover effect to later button
            const laterBtn = document.getElementById('update-later-btn');
            laterBtn.addEventListener('mouseenter', () => {
                laterBtn.style.color = 'rgba(255, 255, 255, 0.8)';
            });
            laterBtn.addEventListener('mouseleave', () => {
                laterBtn.style.color = 'rgba(255, 255, 255, 0.5)';
            });
            
            // Download button click handler
            downloadBtn.onclick = () => {
                if (window.electronAPI.openExternal) {
                    window.electronAPI.openExternal(info.downloadUrl);
                }
                modal.remove();
            };
            
            // Later button click handler
            laterBtn.onclick = () => {
                modal.remove();
            };
        });
        
        console.log('[EventListeners] Auto-updater listener set up');
    }
}

// Export the main setup function
window.setupEventListeners = setupEventListeners;

console.log('[EventListeners] Event listeners module loaded');
