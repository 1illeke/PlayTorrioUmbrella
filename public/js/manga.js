// Manga Module - WeebCentral and Comix Integration

// Helper to get API base URL
function getMangaApiUrl(endpoint) {
    const baseUrl = window.API_BASE_URL || 'http://localhost:6987/api';
    if (endpoint.startsWith('/')) {
        return baseUrl + endpoint;
    }
    return baseUrl + '/' + endpoint;
}

let mangaIsLoading = false;
let mangaIsSearching = false;
let mangaSearchQuery = '';
let mangaSource = 'weebcentral';
let mangaOffset = 1;
let mangaHasMore = true;
let mangaList = [];
let mangaInitialized = false;
let currentManga = null;

// Manga Storage
const SAVED_MANGA_KEY = 'pt_saved_manga_v1';
function getSavedManga() {
    try { return JSON.parse(localStorage.getItem(SAVED_MANGA_KEY) || '[]'); } catch { return []; }
}
function setSavedManga(list) {
    localStorage.setItem(SAVED_MANGA_KEY, JSON.stringify(list));
}
function isMangaSaved(uniqueId) {
    return getSavedManga().some(m => m.uniqueId === uniqueId);
}
function toggleSaveManga(event, manga) {
    event.stopPropagation();
    const list = getSavedManga();
    const idx = list.findIndex(m => m.uniqueId === manga.uniqueId);
    const btn = event.currentTarget;
    
    if (idx >= 0) {
        list.splice(idx, 1);
        btn.classList.remove('in-list');
        btn.innerHTML = '<i class="fas fa-plus"></i>';
        if (typeof showNotification === 'function') showNotification('Removed from Saved', 'info');
    } else {
        list.unshift(manga);
        btn.classList.add('in-list');
        btn.innerHTML = '<i class="fas fa-check"></i>';
        if (typeof showNotification === 'function') showNotification('Added to Saved', 'success');
    }
    setSavedManga(list);
}

// Reading Progress Storage
const MANGA_PROGRESS_KEY = 'pt_manga_progress_v1';
function saveMangaReadingProgress(provider, mangaId, chapterId, pageIndex) {
    try {
        const key = `${provider}_${mangaId}_${chapterId}`;
        const progress = JSON.parse(localStorage.getItem(MANGA_PROGRESS_KEY) || '{}');
        progress[key] = { pageIndex, timestamp: Date.now() };
        localStorage.setItem(MANGA_PROGRESS_KEY, JSON.stringify(progress));
    } catch (e) {
        console.error('[Manga] Failed to save progress:', e);
    }
}

function loadMangaReadingProgress(provider, mangaId, chapterId) {
    try {
        const key = `${provider}_${mangaId}_${chapterId}`;
        const progress = JSON.parse(localStorage.getItem(MANGA_PROGRESS_KEY) || '{}');
        return progress[key]?.pageIndex || 0;
    } catch (e) {
        return 0;
    }
}

async function initializeManga() {
    if (mangaInitialized) {
        console.log('[Manga] Already initialized, skipping');
        return;
    }
    
    console.log('[Manga] Initializing manga module...');
    
    const mangaSearchInput = document.getElementById('mangaSearchInput');
    const mangaGrid = document.getElementById('mangaGrid');
    const mangaLoadingIndicator = document.getElementById('mangaLoadingIndicator');
    const mangaDetailsModal = document.getElementById('mangaDetailsModal');
    const mangaDetailsClose = document.getElementById('mangaDetailsClose');
    const mangaReaderPage = document.getElementById('manga-reader-page');
    const mangaReaderBack = document.getElementById('mangaReaderBack');
    const mangaFullscreenBtn = document.getElementById('mangaFullscreenBtn');
    
    const mangaZoomIn = document.getElementById('mangaZoomIn');
    const mangaZoomOut = document.getElementById('mangaZoomOut');
    const mangaReaderPages = document.getElementById('mangaReaderPages');
    let currentMangaZoom = 1200;

    if (mangaZoomIn) {
        mangaZoomIn.addEventListener('click', () => {
            currentMangaZoom += 200;
            if (mangaReaderPages) mangaReaderPages.style.maxWidth = `${currentMangaZoom}px`;
        });
    }
    
    if (mangaZoomOut) {
        mangaZoomOut.addEventListener('click', () => {
            if (currentMangaZoom > 400) {
                currentMangaZoom -= 200;
                if (mangaReaderPages) mangaReaderPages.style.maxWidth = `${currentMangaZoom}px`;
            }
        });
    }

    if (mangaFullscreenBtn) {
        mangaFullscreenBtn.addEventListener('click', () => {
            if (typeof toggleReaderFullscreen === 'function') toggleReaderFullscreen();
        });
    }

    const weebcentralBtn = document.getElementById('weebcentral-btn');
    const comixBtn = document.getElementById('comix-btn');
    const mangaCategoriesContainer = document.getElementById('manga-categories-container');
    const mangaCategoriesDropdown = document.getElementById('manga-categories-dropdown');
    const mangaSourceSubtitle = document.getElementById('manga-source-subtitle');
    const mangaSavedBtn = document.getElementById('manga-saved-btn');
    
    if (weebcentralBtn) {
        weebcentralBtn.addEventListener('click', () => {
            if (mangaSource === 'weebcentral') return;
            mangaSource = 'weebcentral';
            weebcentralBtn.classList.add('active');
            if (comixBtn) comixBtn.classList.remove('active');
            if (mangaSavedBtn) mangaSavedBtn.classList.remove('active');
            if (mangaCategoriesContainer) mangaCategoriesContainer.style.display = 'none';
            if (mangaSourceSubtitle) mangaSourceSubtitle.textContent = 'Read manga from WeebCentral';
            clearMangaGridAndSearch();
            loadTrendingManga();
        });
    }

    if (comixBtn) {
        comixBtn.addEventListener('click', () => {
            if (mangaSource === 'comix') return;
            mangaSource = 'comix';
            if (comixBtn) comixBtn.classList.add('active');
            if (weebcentralBtn) weebcentralBtn.classList.remove('active');
            if (mangaSavedBtn) mangaSavedBtn.classList.remove('active');
            if (mangaCategoriesContainer) mangaCategoriesContainer.style.display = 'block';
            if (mangaSourceSubtitle) mangaSourceSubtitle.textContent = 'Read manga from Comix';
            clearMangaGridAndSearch();
            loadComixGenres();
            loadTrendingManga();
        });
    }

    if (mangaSavedBtn) {
        mangaSavedBtn.addEventListener('click', () => {
            if (mangaSource === 'saved') return;
            mangaSource = 'saved';
            mangaSavedBtn.classList.add('active');
            if (weebcentralBtn) weebcentralBtn.classList.remove('active');
            if (comixBtn) comixBtn.classList.remove('active');
            if (mangaCategoriesContainer) mangaCategoriesContainer.style.display = 'none';
            if (mangaSourceSubtitle) mangaSourceSubtitle.textContent = 'Your Saved Manga';
            clearMangaGridAndSearch();
            loadSavedMangaView();
        });
    }

    if (mangaCategoriesDropdown) {
        mangaCategoriesDropdown.addEventListener('change', () => {
            clearMangaGridAndSearch();
            loadTrendingManga();
        });
    }

    function clearMangaGridAndSearch() {
        if (mangaGrid) mangaGrid.innerHTML = '';
        if (mangaSearchInput) mangaSearchInput.value = '';
        mangaOffset = 1;
        mangaHasMore = true;
        mangaIsSearching = false;
        mangaSearchQuery = '';
        mangaList = [];
    }

    async function loadComixGenres() {
        try {
            const response = await fetch(getMangaApiUrl('comix/genres'));
            const data = await response.json();
            if (data.status === 'success' && mangaCategoriesDropdown) {
                mangaCategoriesDropdown.innerHTML = '<option value="">All Categories</option>';
                for (const genreId in data.genres) {
                    const option = document.createElement('option');
                    option.value = genreId;
                    option.textContent = data.genres[genreId];
                    mangaCategoriesDropdown.appendChild(option);
                }
            }
        } catch (error) {
            console.error('[Manga] Error loading comix genres:', error);
        }
    }

    let searchTimeout = null;
    
    loadTrendingManga();
    setupMangaInfiniteScroll();
    
    if (mangaSearchInput) {
        mangaSearchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            const query = mangaSearchInput.value.trim();
            
            if (!query) {
                mangaIsSearching = false;
                mangaSearchQuery = '';
                mangaOffset = 1;
                mangaHasMore = true;
                mangaList = [];
                loadTrendingManga();
                return;
            }
            
            searchTimeout = setTimeout(() => {
                searchManga(query);
            }, 500);
        });
        
        mangaSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = mangaSearchInput.value.trim();
                if (query) {
                    clearTimeout(searchTimeout);
                    searchManga(query);
                }
            }
        });
    }
    
    if (mangaDetailsClose) {
        mangaDetailsClose.addEventListener('click', () => {
            if (mangaDetailsModal) mangaDetailsModal.style.display = 'none';
        });
    }
    
    if (mangaReaderBack) {
        mangaReaderBack.addEventListener('click', () => {
            if (window.currentMangaReadingContext) {
                const ctx = window.currentMangaReadingContext;
                const pages = document.querySelectorAll('.manga-reader-page');
                if (pages.length > 0) {
                    const viewportCenter = window.innerHeight / 3;
                    let closestPage = 0;
                    let closestDistance = Infinity;
                    pages.forEach((img, index) => {
                        const rect = img.getBoundingClientRect();
                        const imgCenter = rect.top + rect.height / 2;
                        const distance = Math.abs(imgCenter - viewportCenter);
                        if (distance < closestDistance) {
                            closestDistance = distance;
                            closestPage = index;
                        }
                    });
                    saveMangaReadingProgress(ctx.provider, ctx.mangaId, ctx.chapterId, closestPage);
                }
                window.currentMangaReadingContext = null;
            }
            if (window.mangaScrollTracker) {
                window.removeEventListener('scroll', window.mangaScrollTracker);
                window.mangaScrollTracker = null;
            }
            if (mangaReaderPage) mangaReaderPage.style.display = 'none';
            const mangaPage = document.getElementById('manga-page');
            if (mangaPage) mangaPage.style.display = '';
        });
    }
    
    function setupMangaInfiniteScroll() {
        const mainElement = document.querySelector('main');
        const mangaPage = document.getElementById('manga-page');
        
        if (!mainElement) return;
        
        mainElement.addEventListener('scroll', () => {
            if (!mangaPage || mangaPage.style.display === 'none') return;
            if (mangaIsLoading || !mangaHasMore) return;
            
            const scrollHeight = mainElement.scrollHeight;
            const scrollTop = mainElement.scrollTop;
            const clientHeight = mainElement.clientHeight;
            
            if (scrollHeight - scrollTop - clientHeight < 500) {
                if (mangaIsSearching) {
                    searchManga(mangaSearchQuery, true);
                } else {
                    loadTrendingManga(true);
                }
            }
        });
    }
    
    function loadSavedMangaView() {
        const saved = getSavedManga();
        if (!mangaGrid) return;
        if (saved.length === 0) {
            mangaGrid.innerHTML = '<p style="text-align: center; color: var(--gray); grid-column: 1 / -1; padding: 2rem;">No saved manga yet.</p>';
            return;
        }
        displayManga(saved, false);
    }

    async function loadTrendingManga(append = false) {
        if (mangaIsLoading) return;
        
        mangaIsLoading = true;
        if (mangaLoadingIndicator) mangaLoadingIndicator.style.display = 'block';
        
        if (!append) {
            if (mangaGrid) mangaGrid.innerHTML = '';
            mangaOffset = 1;
            mangaHasMore = true;
            mangaList = [];
        }
        
        try {
            let url;
            if (mangaSource === 'comix') {
                const category = mangaCategoriesDropdown ? mangaCategoriesDropdown.value : '';
                if (category) {
                    url = getMangaApiUrl(`comix/manga/genre/${category}?page=${mangaOffset}`);
                } else {
                    url = getMangaApiUrl(`comix/manga/all?page=${mangaOffset}`);
                }
            } else {
                url = getMangaApiUrl(`manga/all?page=${mangaOffset}`);
            }
            const response = await fetch(url);
            const data = await response.json();
            
            let dataToDisplay = [];
            if (mangaSource === 'comix' && data.status === 'success') {
                dataToDisplay = data.data;
            } else if (mangaSource === 'weebcentral' && data.success) {
                dataToDisplay = data.data;
            }

            if (append) {
                mangaList = [...mangaList, ...dataToDisplay];
            } else {
                mangaList = dataToDisplay;
            }
            
            displayManga(dataToDisplay, append);
            
            mangaOffset += 1;
            mangaHasMore = dataToDisplay.length >= 20;
        } catch (error) {
            console.error('Error loading trending manga:', error);
            if (!append && mangaGrid) {
                mangaGrid.innerHTML = '<p style="text-align: center; color: var(--gray); grid-column: 1 / -1;">Failed to load manga. Please try again.</p>';
            }
        } finally {
            if (mangaLoadingIndicator) mangaLoadingIndicator.style.display = 'none';
            mangaIsLoading = false;
        }
    }
    
    async function searchManga(query, append = false) {
        if (mangaIsLoading) return;
        
        mangaIsLoading = true;
        if (mangaLoadingIndicator) mangaLoadingIndicator.style.display = 'block';
        mangaIsSearching = true;
        mangaSearchQuery = query;
        
        if (!append) {
            if (mangaGrid) mangaGrid.innerHTML = '';
            mangaOffset = 1;
            mangaHasMore = true;
            mangaList = [];
        }
        
        try {
            let url;
            if (mangaSource === 'comix') {
                url = getMangaApiUrl(`comix/manga/search/${encodeURIComponent(query)}?page=${mangaOffset}`);
            } else {
                url = getMangaApiUrl(`manga/search?q=${encodeURIComponent(query)}`);
            }
            const response = await fetch(url);
            const data = await response.json();
            
            let dataToDisplay = [];
            if (mangaSource === 'comix' && data.status === 'success') {
                dataToDisplay = data.data;
            } else if (mangaSource === 'weebcentral' && data.success) {
                dataToDisplay = data.data;
            }

            if (append) {
                mangaList = [...mangaList, ...dataToDisplay];
            } else {
                mangaList = dataToDisplay;
            }

            if (!append && mangaList.length === 0 && mangaGrid) {
                mangaGrid.innerHTML = '<p style="text-align: center; color: var(--gray); grid-column: 1 / -1;">No manga found.</p>';
            } else {
                displayManga(dataToDisplay, append);
            }
            
            mangaOffset += 1;
            mangaHasMore = dataToDisplay.length >= 20;
        } catch (error) {
            console.error('Error searching manga:', error);
            if (!append && mangaGrid) {
                mangaGrid.innerHTML = '<p style="text-align: center; color: var(--gray); grid-column: 1 / -1;">Search failed. Please try again.</p>';
            }
        } finally {
            if (mangaLoadingIndicator) mangaLoadingIndicator.style.display = 'none';
            mangaIsLoading = false;
        }
    }
    
    function displayManga(mangaArray, append = false) {
        if (!mangaGrid) return;
        
        if (!append) {
            mangaGrid.innerHTML = '';
        }
        
        mangaArray.forEach(manga => {
            if (!manga.provider) manga.provider = mangaSource;
            if (!manga.uniqueId) {
                manga.uniqueId = manga.provider === 'comix' ? (manga.manga_id || manga.hash_id) : (manga.id || manga.seriesId);
            }

            const title = manga.name || 'Unknown Title';
            const coverUrl = manga.poster || '';
            const isSaved = isMangaSaved(manga.uniqueId);
            
            const card = document.createElement('div');
            card.className = 'movie-card';
            card.style.cursor = 'pointer';
            
            card.innerHTML = `
                <button class="add-to-list-btn ${isSaved ? 'in-list' : ''}" title="${isSaved ? 'Remove from Saved' : 'Save Manga'}">
                    <i class="fas ${isSaved ? 'fa-check' : 'fa-plus'}"></i>
                </button>
                <img src="${coverUrl || 'https://via.placeholder.com/256x384?text=No+Cover'}" alt="${title}" class="movie-poster" style="object-fit: cover;">
                <div class="movie-info">
                    <h3 class="movie-title">${title}</h3>
                    <p class="movie-year">Manga</p>
                </div>
                <div class="movie-rating" style="background: #ec4899;">
                    <i class="fas fa-book"></i> Read
                </div>
            `;
            
            const saveBtn = card.querySelector('.add-to-list-btn');
            saveBtn.addEventListener('click', (e) => {
                toggleSaveManga(e, manga);
            });

            card.addEventListener('click', (e) => {
                if (e.target.closest('.add-to-list-btn')) return;
                showMangaDetails(manga);
            });
            mangaGrid.appendChild(card);
        });
    }
    
    async function showMangaDetails(manga) {
        currentManga = manga;
        const title = manga.name || 'Unknown Title';
        const description = manga.description || 'Tap to read';
        
        const provider = manga.provider || mangaSource;
        const author = provider === 'comix' ? 'Comix' : 'WeebCentral';
        const coverUrl = manga.poster || '';
        
        const titleEl = document.getElementById('mangaDetailsTitle');
        const authorEl = document.getElementById('mangaDetailsAuthor');
        const statusEl = document.getElementById('mangaDetailsStatus');
        const descEl = document.getElementById('mangaDetailsDescription');
        const coverEl = document.getElementById('mangaDetailsCover');
        
        if (titleEl) titleEl.textContent = title;
        if (authorEl) authorEl.textContent = `Source: ${author}`;

        if (statusEl) {
            if (provider === 'comix') {
                statusEl.textContent = `Manga ID: ${manga.manga_id}`;
            } else {
                statusEl.textContent = `Series ID: ${manga.seriesId}`;
            }
        }

        if (descEl) descEl.textContent = description;
        if (coverEl) coverEl.src = coverUrl || 'https://via.placeholder.com/300x450?text=No+Cover';
        
        const tagsContainer = document.getElementById('mangaDetailsTags');
        if (tagsContainer) tagsContainer.innerHTML = '';
        
        if (provider === 'comix') {
            await loadMangaChapters(manga.hash_id, null, 'comix');
        } else {
            await loadMangaChapters(manga.seriesId || manga.id, manga.latestChapterId, 'weebcentral');
        }

        if (mangaDetailsModal) mangaDetailsModal.style.display = 'block';
    }
    
    async function loadMangaChapters(id, latestChapterId, provider) {
        const chaptersList = document.getElementById('mangaChaptersList');
        if (!chaptersList) return;
        
        chaptersList.innerHTML = '<p style="text-align: center; color: white; grid-column: 1 / -1;">Loading chapters...</p>';
        
        if (!provider) provider = mangaSource;
        
        try {
            let url;
            if (provider === 'comix') {
                url = getMangaApiUrl(`comix/chapters/${id}`);
            } else {
                url = getMangaApiUrl(`manga/chapters?seriesId=${encodeURIComponent(id)}&latestChapterId=${encodeURIComponent(latestChapterId || 'latest')}`);
            }
            const response = await fetch(url);
            const data = await response.json();
            
            chaptersList.innerHTML = '';
            let chapters = [];
            if (provider === 'comix' && data.status === 'success') {
                chapters = data.data;
            } else if (provider === 'weebcentral' && data.success) {
                chapters = data.data;
            }

            if (chapters && chapters.length > 0) {
                chapters.forEach(chapter => {
                    let chapterTitle, chapterId, seriesId;
                    if (provider === 'comix') {
                        chapterTitle = `Chapter ${chapter.number}` + (chapter.name ? `: ${chapter.name}` : '');
                        chapterId = chapter.chapter_id;
                        seriesId = id;
                    } else {
                        chapterTitle = chapter.name || '?';
                        chapterId = chapter.id;
                        seriesId = id;
                    }

                    const chapterCard = document.createElement('div');
                    chapterCard.style.cssText = 'background: rgba(255,255,255,0.1); padding: 1rem; border-radius: 8px; cursor: pointer; transition: all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); border: 1px solid rgba(236, 72, 153, 0.3);';
                    
                    chapterCard.innerHTML = `
                        <div style="font-weight: 600; color: #ec4899; margin-bottom: 0.25rem;">${chapterTitle}</div>
                        <div style="font-size: 0.85rem; color: #9ca3af;">Click to read</div>
                    `;
                    
                    chapterCard.addEventListener('mouseenter', () => {
                        chapterCard.style.background = 'rgba(236, 72, 153, 0.2)';
                        chapterCard.style.transform = 'translateX(4px)';
                    });
                    
                    chapterCard.addEventListener('mouseleave', () => {
                        chapterCard.style.background = 'rgba(255,255,255,0.1)';
                        chapterCard.style.transform = 'translateX(0)';
                    });
                    
                    chapterCard.addEventListener('click', async () => {
                        readMangaChapter(seriesId, chapterId, chapterTitle, provider);
                    });
                    
                    chaptersList.appendChild(chapterCard);
                });
            } else {
                chaptersList.innerHTML = '<p style="text-align: center; color: white; grid-column: 1 / -1;">No chapters available.</p>';
            }
        } catch (error) {
            console.error('Error loading chapters:', error);
            chaptersList.innerHTML = '<p style="text-align: center; color: white; grid-column: 1 / -1;">Failed to load chapters.</p>';
        }
    }
    
    async function readMangaChapter(id, chapterId, chapterTitle, provider) {
        if (mangaDetailsModal) mangaDetailsModal.style.display = 'none';
        const mangaPage = document.getElementById('manga-page');
        if (mangaPage) mangaPage.style.display = 'none';
        
        if (mangaReaderPage) mangaReaderPage.style.display = 'block';
        const titleEl = document.getElementById('mangaReaderTitle');
        const pagesEl = document.getElementById('mangaReaderPages');
        const loadingEl = document.getElementById('mangaReaderLoading');
        
        if (titleEl) titleEl.textContent = chapterTitle;
        if (pagesEl) pagesEl.innerHTML = '';
        if (loadingEl) loadingEl.style.display = 'block';
        
        if (!provider) provider = mangaSource;

        window.currentMangaReadingContext = { provider, mangaId: id, chapterId };

        try {
            let url;
            if (provider === 'comix') {
                url = getMangaApiUrl(`comix/manga/chapters/${id}/${chapterId}`);
            } else {
                url = getMangaApiUrl(`chapter/pages?chapterId=${encodeURIComponent(chapterId)}`);
            }

            const response = await fetch(url);
            const data = await response.json();
            
            if (loadingEl) loadingEl.style.display = 'none';

            let pages = [];
            if (provider === 'comix' && data.status === 'success') {
                pages = data.pages;
            } else if (provider === 'weebcentral' && data.success) {
                pages = data.pages;
            }

            if (pages && pages.length > 0 && pagesEl) {
                const savedPageIndex = loadMangaReadingProgress(provider, id, chapterId);
                
                pages.forEach((pageUrl, index) => {
                    const img = document.createElement('img');
                    img.src = pageUrl;
                    img.style.width = '100%';
                    img.style.marginBottom = '0.5rem';
                    img.className = 'manga-reader-page';
                    img.dataset.pageIndex = index;
                    img.loading = index <= savedPageIndex + 3 ? 'eager' : 'lazy';
                    pagesEl.appendChild(img);
                });
                
                if (savedPageIndex > 0) {
                    const targetImg = pagesEl.querySelector(`img[data-page-index="${savedPageIndex}"]`);
                    if (targetImg) {
                        const scrollToSaved = () => {
                            targetImg.scrollIntoView({ behavior: 'instant', block: 'start' });
                        };
                        if (targetImg.complete) {
                            setTimeout(scrollToSaved, 100);
                        } else {
                            targetImg.addEventListener('load', scrollToSaved, { once: true });
                        }
                    }
                }
                
                setupMangaReaderProgressTracking(pagesEl, provider, id, chapterId);
            } else if (pagesEl) {
                pagesEl.innerHTML = '<p style="color: #ef4444;">Could not load chapter pages.</p>';
            }
        } catch (error) {
            console.error('Error reading chapter:', error);
            if (loadingEl) loadingEl.innerHTML = '<p style="color: #ef4444;">Failed to load chapter. Please try again.</p>';
        }
    }
    
    function setupMangaReaderProgressTracking(container, provider, mangaId, chapterId) {
        let currentPageIndex = 0;
        let saveTimeout = null;
        
        const trackScroll = () => {
            const pages = container.querySelectorAll('.manga-reader-page');
            const viewportCenter = window.innerHeight / 3;
            
            let closestPage = 0;
            let closestDistance = Infinity;
            
            pages.forEach((img, index) => {
                const rect = img.getBoundingClientRect();
                const imgCenter = rect.top + rect.height / 2;
                const distance = Math.abs(imgCenter - viewportCenter);
                
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestPage = index;
                }
            });
            
            if (closestPage !== currentPageIndex) {
                currentPageIndex = closestPage;
                if (saveTimeout) clearTimeout(saveTimeout);
                saveTimeout = setTimeout(() => {
                    saveMangaReadingProgress(provider, mangaId, chapterId, currentPageIndex);
                }, 500);
            }
        };
        
        if (window.mangaScrollTracker) {
            window.removeEventListener('scroll', window.mangaScrollTracker);
        }
        window.mangaScrollTracker = trackScroll;
        window.addEventListener('scroll', trackScroll);
    }
    
    mangaInitialized = true;
}

window.initializeManga = initializeManga;
window.getSavedManga = getSavedManga;
window.setSavedManga = setSavedManga;
window.isMangaSaved = isMangaSaved;
window.toggleSaveManga = toggleSaveManga;
window.saveMangaReadingProgress = saveMangaReadingProgress;
window.loadMangaReadingProgress = loadMangaReadingProgress;

console.log('[Manga] Module loaded');
