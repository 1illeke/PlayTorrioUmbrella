// Basic Mode Manga Logic

const API = window.location.origin;

let mangaSource = 'comix'; // 'comix' or 'weebcentral'
let mangaCurrentPage = 1;
let mangaCurrentGenre = null;
let mangaCurrentQuery = '';
let mangaIsLoading = false;
let mangaHasMore = true;
let mangaZoomLevel = 100;

// Drag to scroll state
let isDragging = false;
let startX, startY, scrollLeft, scrollTop;

// Current reading state for progress tracking
let currentMangaId = null;
let currentChapterId = null;
let currentPageIndex = 0;

// DOM Elements
let mangaGrid, mangaSearchInput, mangaGenreSelect, mangaLoading, mangaEmpty;
let mangaComixBtn, mangaWeebBtn, mangaSavedBtn, mangaSearchBtn;
let mangaChaptersModal, mangaModalClose, mangaModalCover, mangaModalTitle, mangaModalCount, mangaChaptersList;

// Comics reader elements (reused)
let comicsReaderOverlay, comicsReaderPages, comicsReaderTitle, comicsReaderChapter, comicsReaderClose;
let comicsZoomIn, comicsZoomOut, comicsFullscreen;

// Reading progress functions - using shared key format for main app compatibility
const MANGA_PROGRESS_KEY = 'pt_manga_reading_progress_v1';
const SAVED_MANGA_KEY = 'pt_saved_manga_v1';

function getMangaProgressKey(mangaId, chapterId) {
    return `${mangaSource}_${mangaId}_${chapterId}`;
}

function getAllMangaProgress() {
    try {
        return JSON.parse(localStorage.getItem(MANGA_PROGRESS_KEY) || '{}');
    } catch {
        return {};
    }
}

function setAllMangaProgress(data) {
    localStorage.setItem(MANGA_PROGRESS_KEY, JSON.stringify(data));
}

function saveMangaProgress(mangaId, chapterId, pageIndex) {
    const key = getMangaProgressKey(mangaId, chapterId);
    const allProgress = getAllMangaProgress();
    allProgress[key] = { pageIndex, timestamp: Date.now() };
    setAllMangaProgress(allProgress);
}

function loadMangaProgress(mangaId, chapterId) {
    const key = getMangaProgressKey(mangaId, chapterId);
    const allProgress = getAllMangaProgress();
    return allProgress[key] ? allProgress[key].pageIndex : 0;
}

// Saved manga functions - shared with main app
function getSavedManga() {
    try {
        return JSON.parse(localStorage.getItem(SAVED_MANGA_KEY) || '[]');
    } catch {
        return [];
    }
}

function setSavedManga(list) {
    localStorage.setItem(SAVED_MANGA_KEY, JSON.stringify(list));
}

function isMangaSaved(uniqueId) {
    return getSavedManga().some(m => String(m.uniqueId) === String(uniqueId));
}

function toggleSaveManga(manga) {
    const list = getSavedManga();
    const idx = list.findIndex(m => String(m.uniqueId) === String(manga.uniqueId));
    
    if (idx >= 0) {
        list.splice(idx, 1);
        return false; // Removed
    } else {
        // Add provider info for cross-app compatibility
        const mangaToSave = { ...manga, provider: mangaSource };
        list.unshift(mangaToSave);
        return true; // Added
    }
}

function getMangaUniqueId(manga) {
    if (mangaSource === 'comix') {
        return `comix_${manga.hash_id || manga.manga_id || manga.id}`;
    } else {
        return `weeb_${manga.seriesId || manga.id}`;
    }
}

function syncElements() {
    mangaGrid = document.getElementById('manga-grid');
    mangaSearchInput = document.getElementById('manga-search-input');
    mangaGenreSelect = document.getElementById('manga-genre-select');
    mangaLoading = document.getElementById('manga-loading');
    mangaEmpty = document.getElementById('manga-empty');
    mangaComixBtn = document.getElementById('manga-comix-btn');
    mangaWeebBtn = document.getElementById('manga-weeb-btn');
    mangaSavedBtn = document.getElementById('manga-saved-btn');
    mangaSearchBtn = document.getElementById('manga-search-btn');
    
    mangaChaptersModal = document.getElementById('manga-chapters-modal');
    mangaModalClose = document.getElementById('manga-modal-close');
    mangaModalCover = document.getElementById('manga-modal-cover');
    mangaModalTitle = document.getElementById('manga-modal-title');
    mangaModalCount = document.getElementById('manga-modal-count');
    mangaChaptersList = document.getElementById('manga-chapters-list');
    
    // Reuse comics reader
    comicsReaderOverlay = document.getElementById('comics-reader-overlay');
    comicsReaderPages = document.getElementById('comics-reader-pages');
    comicsReaderTitle = document.getElementById('comics-reader-title');
    comicsReaderChapter = document.getElementById('comics-reader-chapter');
    comicsReaderClose = document.getElementById('comics-reader-close');
    comicsZoomIn = document.getElementById('comics-zoom-in');
    comicsZoomOut = document.getElementById('comics-zoom-out');
    comicsFullscreen = document.getElementById('comics-fullscreen');
}

export function initManga() {
    syncElements();
    setupEventListeners();
    setupReaderControls();
    
    if (mangaGrid && mangaGrid.children.length === 0) {
        loadGenres();
        loadManga();
    }
}

function updateZoom() {
    if (!comicsReaderPages) return;
    const images = comicsReaderPages.querySelectorAll('.manga-page');
    images.forEach(img => {
        img.style.maxWidth = `${mangaZoomLevel}%`;
        img.style.width = `${mangaZoomLevel}%`;
    });
}

function setupReaderControls() {
    // Zoom in
    if (comicsZoomIn && !comicsZoomIn.dataset.mangaHooked) {
        comicsZoomIn.dataset.mangaHooked = 'true';
        comicsZoomIn.addEventListener('click', () => {
            if (mangaZoomLevel < 200) {
                mangaZoomLevel += 10;
                updateZoom();
            }
        });
    }
    
    // Zoom out
    if (comicsZoomOut && !comicsZoomOut.dataset.mangaHooked) {
        comicsZoomOut.dataset.mangaHooked = 'true';
        comicsZoomOut.addEventListener('click', () => {
            if (mangaZoomLevel > 50) {
                mangaZoomLevel -= 10;
                updateZoom();
            }
        });
    }
    
    // Fullscreen
    if (comicsFullscreen && !comicsFullscreen.dataset.mangaHooked) {
        comicsFullscreen.dataset.mangaHooked = 'true';
        comicsFullscreen.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                comicsReaderOverlay.requestFullscreen().catch(err => {
                    console.error(`Error attempting to enable full-screen mode: ${err.message}`);
                });
            } else {
                document.exitFullscreen();
            }
        });
    }
    
    // Drag to scroll
    if (comicsReaderPages && !comicsReaderPages.dataset.mangaDragHooked) {
        comicsReaderPages.dataset.mangaDragHooked = 'true';
        comicsReaderPages.style.cursor = 'grab';
        comicsReaderPages.style.userSelect = 'none';
        comicsReaderPages.style.webkitUserSelect = 'none';
        
        comicsReaderPages.addEventListener('mousedown', (e) => {
            isDragging = true;
            comicsReaderPages.style.cursor = 'grabbing';
            startX = e.clientX - comicsReaderPages.offsetLeft;
            startY = e.clientY - comicsReaderPages.offsetTop;
            scrollLeft = comicsReaderPages.scrollLeft;
            scrollTop = comicsReaderPages.scrollTop;
        });

        comicsReaderPages.addEventListener('mouseleave', () => {
            isDragging = false;
            comicsReaderPages.style.cursor = 'grab';
        });

        comicsReaderPages.addEventListener('mouseup', () => {
            isDragging = false;
            comicsReaderPages.style.cursor = 'grab';
        });

        comicsReaderPages.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            const x = e.clientX - comicsReaderPages.offsetLeft;
            const y = e.clientY - comicsReaderPages.offsetTop;
            const walkX = (x - startX) * 1.5;
            const walkY = (y - startY) * 1.5;
            comicsReaderPages.scrollLeft = scrollLeft - walkX;
            comicsReaderPages.scrollTop = scrollTop - walkY;
        });
    }
}

function setupEventListeners() {
    // Source toggle
    if (mangaComixBtn && !mangaComixBtn.dataset.hooked) {
        mangaComixBtn.dataset.hooked = 'true';
        mangaComixBtn.addEventListener('click', () => switchSource('comix'));
    }
    if (mangaWeebBtn && !mangaWeebBtn.dataset.hooked) {
        mangaWeebBtn.dataset.hooked = 'true';
        mangaWeebBtn.addEventListener('click', () => switchSource('weebcentral'));
    }
    if (mangaSavedBtn && !mangaSavedBtn.dataset.hooked) {
        mangaSavedBtn.dataset.hooked = 'true';
        mangaSavedBtn.addEventListener('click', () => switchSource('saved'));
    }
    
    // Search
    if (mangaSearchInput && !mangaSearchInput.dataset.hooked) {
        mangaSearchInput.dataset.hooked = 'true';
        mangaSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = e.target.value.trim();
                if (query) searchManga(query);
                else resetManga();
            }
        });
    }
    if (mangaSearchBtn && !mangaSearchBtn.dataset.hooked) {
        mangaSearchBtn.dataset.hooked = 'true';
        mangaSearchBtn.addEventListener('click', () => {
            const query = mangaSearchInput?.value.trim();
            if (query) searchManga(query);
            else resetManga();
        });
    }
    
    // Genre select (Comix only)
    if (mangaGenreSelect && !mangaGenreSelect.dataset.hooked) {
        mangaGenreSelect.dataset.hooked = 'true';
        mangaGenreSelect.addEventListener('change', (e) => {
            const genreId = e.target.value;
            if (genreId) loadMangaByGenre(genreId);
            else resetManga();
        });
    }
    
    // Modal close
    if (mangaModalClose && !mangaModalClose.dataset.hooked) {
        mangaModalClose.dataset.hooked = 'true';
        mangaModalClose.addEventListener('click', closeChaptersModal);
    }
    
    // Comics reader close button - add manga-specific handler
    if (comicsReaderClose && !comicsReaderClose.dataset.mangaHooked) {
        comicsReaderClose.dataset.mangaHooked = 'true';
        comicsReaderClose.addEventListener('click', closeMangaReader);
    }
    
    // Infinite scroll
    if (!window.mangaScrollHooked) {
        window.mangaScrollHooked = true;
        window.addEventListener('scroll', () => {
            const section = document.getElementById('manga-section');
            if (!section || section.classList.contains('hidden')) return;
            if (comicsReaderOverlay && comicsReaderOverlay.style.display === 'flex') return;
            if (mangaIsLoading || !mangaHasMore) return;
            if (mangaCurrentQuery) return; // No infinite scroll for search
            if (mangaSource === 'saved') return; // No infinite scroll for saved
            if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
                loadMoreManga();
            }
        });
    }
}

function switchSource(source) {
    if (mangaSource === source) return;
    mangaSource = source;
    
    // Update button styles
    const btns = document.querySelectorAll('.manga-source-btn');
    btns.forEach(btn => {
        if (btn.dataset.source === source) {
            btn.classList.add('bg-pink-600', 'text-white', 'shadow-lg', 'shadow-pink-500/25');
            btn.classList.remove('text-gray-400', 'hover:text-white', 'hover:bg-white/5');
        } else {
            btn.classList.remove('bg-pink-600', 'text-white', 'shadow-lg', 'shadow-pink-500/25');
            btn.classList.add('text-gray-400', 'hover:text-white', 'hover:bg-white/5');
        }
    });
    
    // Show/hide genre select and search (only for Comix, hide for saved)
    if (mangaGenreSelect) {
        mangaGenreSelect.style.display = source === 'comix' ? 'block' : 'none';
        mangaGenreSelect.value = '';
    }
    
    // Hide search for saved view
    const searchContainer = mangaSearchInput?.closest('.flex.items-center');
    if (searchContainer) {
        searchContainer.style.display = source === 'saved' ? 'none' : 'flex';
    }
    
    if (source === 'saved') {
        loadSavedManga();
    } else {
        resetManga();
    }
}

function loadSavedManga() {
    mangaCurrentPage = 1;
    mangaCurrentGenre = null;
    mangaCurrentQuery = '';
    mangaHasMore = false;
    if (mangaGrid) mangaGrid.innerHTML = '';
    if (mangaSearchInput) mangaSearchInput.value = '';
    hideEmpty();
    
    const saved = getSavedManga();
    if (saved.length === 0) {
        showEmpty();
        if (mangaEmpty) {
            mangaEmpty.querySelector('p').textContent = 'No saved manga yet';
        }
        return;
    }
    
    renderManga(saved, true); // true = is saved view
}

function resetManga() {
    mangaCurrentPage = 1;
    mangaCurrentGenre = null;
    mangaCurrentQuery = '';
    mangaHasMore = true;
    if (mangaGrid) mangaGrid.innerHTML = '';
    if (mangaSearchInput) mangaSearchInput.value = '';
    loadManga();
}

async function loadGenres() {
    if (!mangaGenreSelect) return;
    
    // Only load if not already loaded
    if (mangaGenreSelect.options.length > 1) return;
    
    try {
        const res = await fetch(`${API}/api/comix/genres`);
        const data = await res.json();
        const isSuccess = data.success || data.status === 'success';
        
        if (isSuccess && data.genres) {
            // Genres is an object {id: name}, not an array
            const genres = data.genres;
            Object.keys(genres).forEach(id => {
                const opt = document.createElement('option');
                opt.value = id;
                opt.textContent = genres[id];
                mangaGenreSelect.appendChild(opt);
            });
        }
    } catch (e) {
        console.error('Failed to load manga genres:', e);
    }
}

async function loadManga() {
    if (mangaIsLoading) return;
    mangaIsLoading = true;
    showLoading(true);
    hideEmpty();
    
    try {
        let url;
        if (mangaSource === 'comix') {
            url = `${API}/api/comix/manga/all?page=${mangaCurrentPage}`;
        } else {
            url = `${API}/api/manga/all?page=${mangaCurrentPage}`;
        }
        
        const res = await fetch(url);
        const data = await res.json();
        
        // Handle both {success: true} and {status: "success"} formats
        const isSuccess = data.success || data.status === 'success';
        
        if (isSuccess) {
            const items = data.data || data.manga || [];
            if (items.length > 0) {
                renderManga(items);
                mangaHasMore = items.length >= 20;
            } else {
                mangaHasMore = false;
                if (mangaCurrentPage === 1) showEmpty();
            }
        } else {
            if (mangaCurrentPage === 1) showEmpty();
        }
    } catch (e) {
        console.error('Error loading manga:', e);
        if (mangaCurrentPage === 1) showEmpty();
    } finally {
        mangaIsLoading = false;
        showLoading(false);
    }
}

async function searchManga(query) {
    mangaCurrentQuery = query;
    mangaCurrentPage = 1;
    mangaHasMore = false;
    if (mangaGrid) mangaGrid.innerHTML = '';
    mangaIsLoading = true;
    showLoading(true);
    hideEmpty();
    
    try {
        let url;
        if (mangaSource === 'comix') {
            url = `${API}/api/comix/manga/search/${encodeURIComponent(query)}?page=1`;
        } else {
            url = `${API}/api/manga/search?q=${encodeURIComponent(query)}`;
        }
        
        const res = await fetch(url);
        const data = await res.json();
        
        const isSuccess = data.success || data.status === 'success';
        
        if (isSuccess) {
            const items = data.data || data.manga || [];
            if (items.length > 0) {
                renderManga(items);
            } else {
                showEmpty();
            }
        } else {
            showEmpty();
        }
    } catch (e) {
        console.error('Error searching manga:', e);
        showEmpty();
    } finally {
        mangaIsLoading = false;
        showLoading(false);
    }
}

async function loadMangaByGenre(genreId) {
    mangaCurrentGenre = genreId;
    mangaCurrentPage = 1;
    mangaCurrentQuery = '';
    mangaHasMore = true;
    if (mangaGrid) mangaGrid.innerHTML = '';
    mangaIsLoading = true;
    showLoading(true);
    hideEmpty();
    
    try {
        const res = await fetch(`${API}/api/comix/manga/genre/${genreId}?page=1`);
        const data = await res.json();
        
        const isSuccess = data.success || data.status === 'success';
        
        if (isSuccess) {
            const items = data.data || data.manga || [];
            if (items.length > 0) {
                renderManga(items);
                mangaHasMore = items.length >= 20;
            } else {
                showEmpty();
            }
        } else {
            showEmpty();
        }
    } catch (e) {
        console.error('Error loading manga by genre:', e);
        showEmpty();
    } finally {
        mangaIsLoading = false;
        showLoading(false);
    }
}

async function loadMoreManga() {
    mangaCurrentPage++;
    
    if (mangaCurrentGenre && mangaSource === 'comix') {
        mangaIsLoading = true;
        showLoading(true);
        try {
            const res = await fetch(`${API}/api/comix/manga/genre/${mangaCurrentGenre}?page=${mangaCurrentPage}`);
            const data = await res.json();
            const isSuccess = data.success || data.status === 'success';
            const items = data.data || data.manga || [];
            if (isSuccess && items.length > 0) {
                renderManga(items);
                mangaHasMore = items.length >= 20;
            } else {
                mangaHasMore = false;
            }
        } catch (e) {
            mangaHasMore = false;
        } finally {
            mangaIsLoading = false;
            showLoading(false);
        }
    } else {
        loadManga();
    }
}

function renderManga(items, isSavedView = false) {
    if (!mangaGrid || !Array.isArray(items)) return;
    
    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'poster-link block w-full group relative cursor-pointer';
        
        const title = item.name || item.title || 'Unknown';
        const cover = item.poster || item.cover || item.image || '';
        
        // Generate unique ID for save functionality
        let uniqueId;
        const provider = item.provider || mangaSource;
        if (provider === 'comix') {
            uniqueId = `comix_${item.hash_id || item.manga_id || item.id}`;
        } else if (provider === 'weebcentral') {
            uniqueId = `weeb_${item.seriesId || item.id}`;
        } else {
            uniqueId = item.uniqueId || `${provider}_${item.id}`;
        }
        
        // Add uniqueId to item for later use
        item.uniqueId = uniqueId;
        
        const isSaved = isMangaSaved(uniqueId);
        
        card.innerHTML = `
            <div class="aspect-[2/3] rounded-xl overflow-hidden mb-2 relative poster-shadow transition-all duration-300 group-hover:shadow-pink-500/40 group-hover:shadow-2xl border border-transparent group-hover:border-pink-500/30">
                <img src="${cover}" alt="${title}" loading="lazy" class="w-full h-full object-cover bg-gray-800">
                <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-4 text-center gap-2">
                    <button class="manga-read-btn bg-pink-600 text-white px-4 py-2 rounded-full text-sm font-medium transform scale-0 group-hover:scale-100 transition-transform duration-300 delay-100">
                        Read
                    </button>
                </div>
                <button class="manga-save-btn absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all ${isSaved ? 'bg-pink-600 text-white' : 'bg-black/60 text-gray-300 hover:bg-pink-600 hover:text-white'}" title="${isSaved ? 'Remove from saved' : 'Save manga'}">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                </button>
            </div>
            <h3 class="text-white font-medium truncate group-hover:text-pink-400 transition-colors text-sm">${title}</h3>
        `;
        
        // Read button click
        const readBtn = card.querySelector('.manga-read-btn');
        readBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showChaptersModal(item);
        });
        
        // Card click (also opens chapters)
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.manga-save-btn')) {
                showChaptersModal(item);
            }
        });
        
        // Save button click
        const saveBtn = card.querySelector('.manga-save-btn');
        saveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const list = getSavedManga();
            const idx = list.findIndex(m => String(m.uniqueId) === String(uniqueId));
            
            if (idx >= 0) {
                // Remove from saved
                list.splice(idx, 1);
                saveBtn.classList.remove('bg-pink-600', 'text-white');
                saveBtn.classList.add('bg-black/60', 'text-gray-300');
                
                // If in saved view, remove the card
                if (isSavedView) {
                    card.remove();
                    if (mangaGrid.children.length === 0) {
                        showEmpty();
                        if (mangaEmpty) {
                            mangaEmpty.querySelector('p').textContent = 'No saved manga yet';
                        }
                    }
                }
            } else {
                // Add to saved
                const mangaToSave = { ...item, provider: item.provider || mangaSource };
                list.unshift(mangaToSave);
                saveBtn.classList.add('bg-pink-600', 'text-white');
                saveBtn.classList.remove('bg-black/60', 'text-gray-300');
            }
            
            setSavedManga(list);
        });
        
        mangaGrid.appendChild(card);
    });
}

async function showChaptersModal(manga) {
    syncElements();
    if (!mangaChaptersModal) return;
    
    const title = manga.name || manga.title || 'Unknown';
    const cover = manga.poster || manga.cover || manga.image || '';
    
    // Use provider from manga if available (for saved items), else use current source
    const provider = manga.provider || mangaSource;
    
    mangaModalTitle.textContent = title;
    mangaModalCover.src = cover;
    mangaModalCount.textContent = 'Loading chapters...';
    mangaChaptersList.querySelector('.grid').innerHTML = '<div class="col-span-full flex justify-center py-8"><div class="w-8 h-8 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin"></div></div>';
    
    mangaChaptersModal.classList.remove('hidden');
    
    try {
        let chapters = [];
        
        if (provider === 'comix') {
            const hashId = manga.hash_id || manga.id;
            const res = await fetch(`${API}/api/comix/chapters/${hashId}`);
            const data = await res.json();
            const isSuccess = data.success || data.status === 'success';
            if (isSuccess) {
                chapters = data.chapters || data.data || [];
            }
        } else {
            // WeebCentral: use seriesId field, not id
            const seriesId = manga.seriesId || manga.series_id || manga.id;
            const latestChapterId = manga.latestChapterId || manga.latest_chapter_id || '';
            const res = await fetch(`${API}/api/manga/chapters?seriesId=${seriesId}&latestChapterId=${latestChapterId || ''}`);
            const data = await res.json();
            if (data.success) {
                chapters = data.data || data.chapters || [];
            }
        }
        
        mangaModalCount.textContent = `${chapters.length} chapters`;
        
        if (chapters.length === 0) {
            mangaChaptersList.querySelector('.grid').innerHTML = '<div class="col-span-full text-center text-gray-500 py-8">No chapters found</div>';
            return;
        }
        
        const grid = mangaChaptersList.querySelector('.grid');
        grid.innerHTML = '';
        
        chapters.forEach(ch => {
            const btn = document.createElement('button');
            btn.className = 'p-3 bg-gray-800 hover:bg-pink-600/20 border border-gray-700 hover:border-pink-500/50 rounded-lg text-left transition-all group';
            
            const chapterNum = ch.chapter || ch.number || ch.name || 'Ch';
            const chapterTitle = ch.title || '';
            
            btn.innerHTML = `
                <div class="text-sm font-medium text-white group-hover:text-pink-300 truncate">${typeof chapterNum === 'number' ? `Chapter ${chapterNum}` : chapterNum}</div>
                ${chapterTitle && chapterTitle !== chapterNum ? `<div class="text-xs text-gray-500 truncate">${chapterTitle}</div>` : ''}
            `;
            
            btn.addEventListener('click', () => {
                closeChaptersModal();
                loadMangaPages(manga, ch, provider);
            });
            
            grid.appendChild(btn);
        });
        
    } catch (e) {
        console.error('Error loading chapters:', e);
        mangaChaptersList.querySelector('.grid').innerHTML = '<div class="col-span-full text-center text-red-500 py-8">Failed to load chapters</div>';
    }
}

function closeChaptersModal() {
    if (mangaChaptersModal) {
        mangaChaptersModal.classList.add('hidden');
    }
}

function closeMangaReader() {
    // Save progress before closing
    if (currentMangaId && currentChapterId) {
        const oldSource = mangaSource;
        mangaSource = window.currentMangaProvider || mangaSource;
        saveMangaProgress(currentMangaId, currentChapterId, currentPageIndex);
        mangaSource = oldSource;
    }
    
    if (comicsReaderOverlay) {
        comicsReaderOverlay.classList.add('hidden');
        comicsReaderOverlay.style.display = 'none';
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
        }
    }
    document.body.style.overflow = '';
    if (comicsReaderPages) {
        comicsReaderPages.innerHTML = '';
        comicsReaderPages.dataset.trackingHooked = ''; // Reset tracking hook
    }
    mangaZoomLevel = 100;
    
    // Reset current reading state
    currentMangaId = null;
    currentChapterId = null;
    currentPageIndex = 0;
    window.currentMangaProvider = null;
}

async function loadMangaPages(manga, chapter, provider) {
    syncElements();
    if (!comicsReaderOverlay) {
        console.error('Comics reader overlay not found');
        return;
    }
    
    // Use provider from parameter or manga object or current source
    const actualProvider = provider || manga.provider || mangaSource;
    
    const title = manga.name || manga.title || 'Unknown';
    const chapterNum = chapter.chapter || chapter.number || chapter.name || '';
    
    // Set current reading state for progress tracking
    currentMangaId = actualProvider === 'comix' ? (manga.hash_id || manga.id) : (manga.seriesId || manga.id);
    currentChapterId = chapter.id || chapter.chapter_id;
    currentPageIndex = 0;
    
    // Store provider for progress saving
    window.currentMangaProvider = actualProvider;
    
    comicsReaderOverlay.classList.remove('hidden');
    comicsReaderOverlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    comicsReaderTitle.textContent = title;
    comicsReaderChapter.textContent = typeof chapterNum === 'number' ? `Chapter ${chapterNum}` : chapterNum;
    comicsReaderPages.innerHTML = '<div class="flex justify-center items-center h-screen"><div class="w-12 h-12 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin"></div></div>';
    
    try {
        let pages = [];
        
        if (actualProvider === 'comix') {
            const hashId = manga.hash_id || manga.id;
            const chapterId = chapter.id || chapter.chapter_id;
            const res = await fetch(`${API}/api/comix/manga/chapters/${hashId}/${chapterId}`);
            const data = await res.json();
            const isSuccess = data.success || data.status === 'success';
            if (isSuccess) {
                pages = data.pages || [];
            }
        } else {
            // WeebCentral: chapter.id is the chapter ID
            const chapterId = chapter.id;
            const res = await fetch(`${API}/api/chapter/pages?chapterId=${chapterId}`);
            const data = await res.json();
            if (data.success) {
                pages = data.pages || [];
            }
        }
        
        if (pages.length === 0) {
            comicsReaderPages.innerHTML = '<div class="text-center text-white mt-20">No pages found</div>';
            return;
        }
        
        // Load saved progress (use actualProvider for key)
        const oldSource = mangaSource;
        mangaSource = actualProvider; // Temporarily set for progress key
        const savedPageIndex = loadMangaProgress(currentMangaId, currentChapterId);
        mangaSource = oldSource; // Restore
        currentPageIndex = Math.min(savedPageIndex, pages.length - 1);
        
        comicsReaderPages.innerHTML = '';
        
        // Create all page images with data-page-index attribute
        pages.forEach((page, index) => {
            const img = document.createElement('img');
            // Handle both string URLs and objects with url property
            img.src = typeof page === 'string' ? page : (page.url || page.image || page);
            img.className = 'manga-page block mx-auto mb-4 rounded-lg shadow-lg';
            img.style.maxWidth = `${mangaZoomLevel}%`;
            img.style.width = `${mangaZoomLevel}%`;
            img.draggable = false;
            img.loading = index <= currentPageIndex + 3 ? 'eager' : 'lazy'; // Eagerly load pages up to saved position
            img.dataset.pageIndex = index;
            img.onerror = () => { img.style.display = 'none'; };
            comicsReaderPages.appendChild(img);
        });
        
        // Scroll to saved page after images start loading
        if (currentPageIndex > 0) {
            // Wait for the target image to load before scrolling
            const targetImg = comicsReaderPages.querySelector(`img[data-page-index="${currentPageIndex}"]`);
            if (targetImg) {
                const scrollToSavedPage = () => {
                    targetImg.scrollIntoView({ behavior: 'instant', block: 'start' });
                    // Adjust for header
                    comicsReaderPages.scrollTop -= 60;
                };
                
                if (targetImg.complete) {
                    scrollToSavedPage();
                } else {
                    targetImg.addEventListener('load', scrollToSavedPage, { once: true });
                }
            }
        } else {
            comicsReaderPages.scrollTop = 0;
        }
        
        // Set up scroll tracking to save progress
        setupPageTracking(actualProvider);
        
    } catch (e) {
        console.error('Error loading manga pages:', e);
        comicsReaderPages.innerHTML = `<div class="text-center text-red-400 mt-20">Error loading pages: ${e.message}</div>`;
    }
}

function setupPageTracking(provider) {
    if (!comicsReaderPages || comicsReaderPages.dataset.trackingHooked) return;
    comicsReaderPages.dataset.trackingHooked = 'true';
    
    let saveTimeout = null;
    
    comicsReaderPages.addEventListener('scroll', () => {
        if (!currentMangaId || !currentChapterId) return;
        
        // Find which page is currently most visible
        const pages = comicsReaderPages.querySelectorAll('.manga-page');
        const containerRect = comicsReaderPages.getBoundingClientRect();
        const containerCenter = containerRect.top + containerRect.height / 3; // Use top third as reference
        
        let closestPage = 0;
        let closestDistance = Infinity;
        
        pages.forEach((img, index) => {
            const rect = img.getBoundingClientRect();
            const imgCenter = rect.top + rect.height / 2;
            const distance = Math.abs(imgCenter - containerCenter);
            
            if (distance < closestDistance) {
                closestDistance = distance;
                closestPage = index;
            }
        });
        
        if (closestPage !== currentPageIndex) {
            currentPageIndex = closestPage;
            
            // Debounce saving to avoid too many writes
            if (saveTimeout) clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                // Use stored provider for saving
                const oldSource = mangaSource;
                mangaSource = window.currentMangaProvider || provider || mangaSource;
                saveMangaProgress(currentMangaId, currentChapterId, currentPageIndex);
                mangaSource = oldSource;
            }, 500);
        }
    });
}

function showLoading(show) {
    if (mangaLoading) {
        mangaLoading.style.display = show ? 'flex' : 'none';
        if (show) mangaLoading.classList.remove('hidden');
        else mangaLoading.classList.add('hidden');
    }
}

function showEmpty() {
    if (mangaEmpty) {
        mangaEmpty.classList.remove('hidden');
    }
}

function hideEmpty() {
    if (mangaEmpty) {
        mangaEmpty.classList.add('hidden');
    }
}
