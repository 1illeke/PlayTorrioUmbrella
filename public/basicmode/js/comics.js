// Basic Mode Comics Logic

const API = window.location.origin; 

// Full Genre Map from api.cjs
const COMICS_GENRE_MAP = {
    "One Shots & TPBs": 17,
    "Marvel Comics": 34,
    "Boom Studios": 35,
    "Dynamite": 36,
    "Rebellion": 37,
    "Dark Horse": 38,
    "IDW": 39,
    "Archie": 40,
    "Graphic India": 41,
    "Darby Pop": 42,
    "Oni Press": 43,
    "Icon Comics": 44,
    "United Plankton": 45,
    "Udon": 46,
    "Image Comics": 47,
    "Valiant": 48,
    "Vertigo": 49,
    "Devils Due": 50,
    "Aftershock Comics": 51,
    "Antartic Press": 52,
    "Action Lab": 53,
    "American Mythology": 54,
    "Zenescope": 55,
    "Top Cow": 56,
    "Hermes Press": 57,
    "451": 58,
    "Black Mask": 59,
    "Chapterhouse Comics": 60,
    "Red 5": 61,
    "Heavy Metal": 62,
    "Bongo": 63,
    "Top Shelf": 64,
    "Bubble": 65,
    "Boundless": 66,
    "Avatar Press": 67,
    "Space Goat Productions": 68,
    "BroadSword Comics": 69,
    "AAM-Markosia": 70,
    "Fantagraphics": 71,
    "Aspen": 72,
    "American Gothic Press": 73,
    "Vault": 74,
    "215 Ink": 75,
    "Abstract Studio": 76,
    "Albatross": 77,
    "ARH Comix": 78,
    "Legendary Comics": 79,
    "Monkeybrain": 80,
    "Joe Books": 81,
    "MAD": 82,
    "Comics Experience": 83,
    "Alterna Comics": 84,
    "Lion Forge": 85,
    "Benitez": 86,
    "Storm King": 87,
    "Sucker": 88,
    "Amryl Entertainment": 89,
    "Ahoy Comics": 90,
    "Mad Cave": 91,
    "Coffin Comics": 92,
    "Magnetic Press": 93,
    "Ablaze": 94,
    "Europe Comics": 95,
    "Humanoids": 96,
    "TKO": 97,
    "Soleil": 98,
    "SAF Comics": 99,
    "Scholastic": 100,
    "AWA Studios": 101,
    "Stranger Comics": 102,
    "Inverse": 103,
    "Virus": 104,
    "Black Panel Press": 105,
    "Scout Comics": 106,
    "Source Point Press": 107,
    "First Second": 108,
    "DSTLRY": 109,
    "Yen Press": 110,
    "Alien Books": 111
};

let comicsMode = 'home'; 
let comicsCurrentPage = 1;
let comicsCurrentGenre = null;
let comicsCurrentQuery = '';
let comicsIsLoading = false;
let comicsHasMore = true;
let comicsZoomLevel = 100;

// Drag to scroll state
let isDragging = false;
let startX, startY, scrollLeft, scrollTop;

// DOM Elements
let comicsGrid, comicsSearchInput, comicsGenreSelect, comicsBackBtn, comicsSavedBtn, comicsLoading;
let comicsReaderOverlay, comicsReaderPages, comicsReaderTitle, comicsReaderChapter, comicsReaderClose;
let comicsZoomIn, comicsZoomOut, comicsFullscreen, mainNav;

function syncElements() {
    comicsGrid = document.getElementById('comics-grid');
    comicsSearchInput = document.getElementById('comics-search-input');
    comicsGenreSelect = document.getElementById('comics-genre-select');
    comicsBackBtn = document.getElementById('comics-back-btn');
    comicsSavedBtn = document.getElementById('comics-saved-btn');
    comicsLoading = document.getElementById('comics-loading');
    comicsReaderOverlay = document.getElementById('comics-reader-overlay');
    comicsReaderPages = document.getElementById('comics-reader-pages');
    comicsReaderTitle = document.getElementById('comics-reader-title');
    comicsReaderChapter = document.getElementById('comics-reader-chapter');
    comicsReaderClose = document.getElementById('comics-reader-close');
    comicsZoomIn = document.getElementById('comics-zoom-in');
    comicsZoomOut = document.getElementById('comics-zoom-out');
    comicsFullscreen = document.getElementById('comics-fullscreen');
    mainNav = document.getElementById('main-nav');

    if (comicsReaderPages) {
        comicsReaderPages.style.cursor = 'grab';
        comicsReaderPages.style.userSelect = 'none';
        comicsReaderPages.style.webkitUserSelect = 'none';
    }
}

export function initComics() {
    syncElements();
    setupEventListeners();
    
    if (comicsGrid && comicsGrid.children.length === 0) {
        resetComicsView();
    }
}

function updateZoom() {
    if (!comicsReaderPages) return;
    const images = comicsReaderPages.querySelectorAll('img');
    images.forEach(img => {
        img.style.maxWidth = `${comicsZoomLevel}%`;
        img.style.width = `${comicsZoomLevel}%`;
    });
}

function setupEventListeners() {
    if (comicsSearchInput && !comicsSearchInput.dataset.hooked) {
        comicsSearchInput.dataset.hooked = "true";
        comicsSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = e.target.value.trim();
                if (query) searchComics(query);
                else resetComicsView();
            }
        });
    }

    if (comicsReaderPages && !comicsReaderPages.dataset.dragHooked) {
        comicsReaderPages.dataset.dragHooked = "true";
        
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

    if (comicsZoomIn && !comicsZoomIn.dataset.hooked) {
        comicsZoomIn.dataset.hooked = "true";
        comicsZoomIn.addEventListener('click', () => {
            if (comicsZoomLevel < 200) {
                comicsZoomLevel += 10;
                updateZoom();
            }
        });
    }

    if (comicsZoomOut && !comicsZoomOut.dataset.hooked) {
        comicsZoomOut.dataset.hooked = "true";
        comicsZoomOut.addEventListener('click', () => {
            if (comicsZoomLevel > 50) {
                comicsZoomLevel -= 10;
                updateZoom();
            }
        });
    }

    if (comicsFullscreen && !comicsFullscreen.dataset.hooked) {
        comicsFullscreen.dataset.hooked = "true";
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

    if (comicsGenreSelect && !comicsGenreSelect.dataset.hooked) {
        comicsGenreSelect.dataset.hooked = "true";
        comicsGenreSelect.innerHTML = '<option value="">All Genres</option>';
        Object.keys(COMICS_GENRE_MAP).sort().forEach(name => {
            const id = COMICS_GENRE_MAP[name];
            const option = document.createElement('option');
            option.value = id;
            option.textContent = name;
            comicsGenreSelect.appendChild(option);
        });
        comicsGenreSelect.addEventListener('change', (e) => {
            const genreId = e.target.value;
            if (genreId) loadComicsByGenre(genreId);
            else resetComicsView();
        });
    }

    if (comicsSavedBtn && !comicsSavedBtn.dataset.hooked) {
        comicsSavedBtn.dataset.hooked = "true";
        comicsSavedBtn.addEventListener('click', loadSavedComics);
    }

    if (comicsBackBtn && !comicsBackBtn.dataset.hooked) {
        comicsBackBtn.dataset.hooked = "true";
        comicsBackBtn.addEventListener('click', () => {
            const details = document.getElementById('comics-details-view');
            if (details) details.style.display = 'none';
            comicsGrid.style.display = 'grid';
            comicsBackBtn.classList.add('hidden');
            if (comicsMode === 'details') comicsMode = 'home'; 
        });
    }

    if (comicsReaderClose && !comicsReaderClose.dataset.hooked) {
        comicsReaderClose.dataset.hooked = "true";
        comicsReaderClose.addEventListener('click', closeReader);
    }

    if (!window.comicsScrollHooked) {
        window.comicsScrollHooked = true;
        window.addEventListener('scroll', () => {
            const section = document.getElementById('comics-section');
            if (!section || section.classList.contains('hidden')) return;
            if (comicsReaderOverlay && comicsReaderOverlay.style.display === 'flex') return;
            if (comicsIsLoading || !comicsHasMore) return;
            if (comicsMode === 'search' || comicsMode === 'saved') return;
            if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
                loadMoreComics();
            }
        });
    }
}

function resetComicsView() {
    comicsMode = 'home';
    comicsCurrentPage = 1;
    comicsCurrentGenre = null;
    comicsCurrentQuery = '';
    comicsHasMore = true;
    if (comicsGrid) comicsGrid.innerHTML = '';
    if (comicsBackBtn) comicsBackBtn.classList.add('hidden');
    loadComics(1);
}

async function loadComics(page) {
    if (comicsIsLoading) return;
    comicsIsLoading = true;
    showLoading(true);
    try {
        const res = await fetch(`${API}/comics/all?page=${page}`);
        const data = await res.json();
        const items = data.results || data.comics || [];
        if (data.success && items.length > 0) {
            renderComics(items);
            comicsHasMore = items.length > 0;
        } else {
            comicsHasMore = false;
        }
    } catch (e) {
        console.error('Error loading comics:', e);
    } finally {
        comicsIsLoading = false;
        showLoading(false);
    }
}

async function searchComics(query) {
    comicsMode = 'search';
    comicsCurrentQuery = query;
    comicsGrid.innerHTML = '';
    comicsIsLoading = true;
    showLoading(true);
    try {
        const res = await fetch(`${API}/comics/search/${encodeURIComponent(query)}`);
        const data = await res.json();
        const items = data.results || data.comics || [];
        if (data.success && items.length > 0) {
            renderComics(items);
            comicsHasMore = false; 
        } else {
            comicsGrid.innerHTML = '<div class="col-span-full text-center text-gray-500 py-10">No results found.</div>';
        }
    } catch (e) {
        console.error('Error searching comics:', e);
    } finally {
        comicsIsLoading = false;
        showLoading(false);
    }
}

async function loadComicsByGenre(genreId) {
    comicsMode = 'genre';
    comicsCurrentGenre = genreId;
    comicsCurrentPage = 1;
    comicsGrid.innerHTML = '';
    comicsIsLoading = true;
    showLoading(true);
    try {
        const res = await fetch(`${API}/comics/genres/${genreId}?page=1`);
        const data = await res.json();
        const items = data.results || data.comics || [];
        if (data.success && items.length > 0) {
            renderComics(items);
            comicsHasMore = data.results.length > 0;
        } else {
            comicsGrid.innerHTML = '<div class="col-span-full text-center text-gray-500 py-10">No comics found for this genre.</div>';
            comicsHasMore = false;
        }
    } catch (e) {
        console.error('Error loading genre:', e);
    } finally {
        comicsIsLoading = false;
        showLoading(false);
    }
}

async function loadMoreComics() {
    comicsCurrentPage++;
    if (comicsMode === 'home') {
        loadComics(comicsCurrentPage);
    } else if (comicsMode === 'genre' && comicsCurrentGenre) {
        try {
            const res = await fetch(`${API}/comics/genres/${comicsCurrentGenre}?page=${comicsCurrentPage}`);
            const data = await res.json();
            const items = data.results || data.comics || [];
            if (data.success && items.length > 0) renderComics(items);
            else comicsHasMore = false;
        } catch(e) {
            comicsHasMore = false;
        }
    }
}

function renderComics(comics) {
    if (!Array.isArray(comics)) return;
    comics.forEach(comic => {
        const card = document.createElement('div');
        card.className = 'poster-link block flex-shrink-0 w-full group relative cursor-pointer';
        const title = comic.name || comic.title || 'Unknown Title';
        const rawCover = comic.poster_url || comic.thumbnail || comic.cover;
        const coverUrl = rawCover ? `${API}/comics-proxy?url=${encodeURIComponent(rawCover)}` : '';
        
        let slug = comic.slug;
        if (!slug && comic.url) {
            const parts = comic.url.split('/');
            slug = parts.pop() || parts.pop();
        }
        if (!slug) slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        comic.slug = slug;

        card.innerHTML = `
            <div class="aspect-[2/3] rounded-xl overflow-hidden mb-2 relative poster-shadow transition-all duration-300 group-hover:shadow-purple-500/40 group-hover:shadow-2xl border border-transparent group-hover:border-purple-500/30">
                <img src="${coverUrl}" alt="${title}" loading="lazy" class="poster-img w-full h-full object-cover">
                <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-4 text-center">
                    <button class="bg-primary-purple text-white px-4 py-2 rounded-full text-sm font-medium transform scale-0 group-hover:scale-100 transition-transform duration-300 delay-100">
                        Read
                    </button>
                </div>
            </div>
            <h3 class="poster-title text-white font-medium truncate group-hover:text-primary-purple transition-colors text-sm">${title}</h3>
        `;
        card.addEventListener('click', () => showComicDetails(comic));
        comicsGrid.appendChild(card);
    });
}

async function showComicDetails(comic) {
    comicsGrid.style.display = 'none';
    comicsBackBtn.classList.remove('hidden');
    comicsMode = 'details';
    let detailsView = document.getElementById('comics-details-view');
    if (!detailsView) {
        detailsView = document.createElement('div');
        detailsView.id = 'comics-details-view';
        detailsView.className = 'w-full max-w-6xl mx-auto p-6';
        document.getElementById('comics-section').insertBefore(detailsView, comicsLoading);
    }
    detailsView.style.display = 'block';
    detailsView.innerHTML = '<div class="flex justify-center p-10"><div class="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div></div>';
    try {
        console.log('[COMICS] Fetching chapters for slug:', comic.slug);
        const res = await fetch(`${API}/comics/chapters/${comic.slug}`);
        const data = await res.json();
        if (data.success) {
            const info = data.comic || comic;
            const chapters = data.chapters || [];
            const title = info.title || info.name || comic.name || comic.title;
            const desc = info.description || info.desc || 'No description available.';
            const rawCover = info.thumbnail || info.cover || info.poster_url || comic.poster_url;
            const coverUrl = rawCover ? `${API}/comics-proxy?url=${encodeURIComponent(rawCover)}` : '';
            detailsView.innerHTML = `
                <div class="flex flex-col md:flex-row gap-8">
                    <div class="w-full md:w-1/3 max-w-[300px] flex-shrink-0">
                        <img src="${coverUrl}" class="w-full rounded-xl shadow-2xl border border-white/10">
                    </div>
                    <div class="flex-1">
                        <div class="flex items-center justify-between mb-2">
                            <h1 class="text-3xl font-bold text-white">${title}</h1>
                        </div>
                        <div class="flex flex-wrap gap-2 mb-4">
                            ${info.genres ? info.genres.map(g => `<span class="px-2 py-1 bg-white/10 rounded-md text-xs">${g}</span>`).join('') : ''}
                        </div>
                        <p class="text-gray-300 mb-6 leading-relaxed">${desc}</p>
                        <h3 class="text-xl font-bold text-white mb-4">Chapters (${chapters.length})</h3>
                        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                            ${chapters.map(ch => `
                                <button class="chapter-btn p-3 bg-white/5 hover:bg-purple-600/20 border border-white/5 hover:border-purple-500/50 rounded-lg text-left transition-all group" 
                                    data-slug="${info.slug || comic.slug}" data-chapter="${ch.chapter}" data-title="${title.replace(/"/g,'&quot;')}" data-chname="${(ch.name || '').replace(/"/g,'&quot;')}">
                                    <div class="text-sm font-medium text-white group-hover:text-purple-300 truncate">Chapter ${ch.chapter}</div>
                                    <div class="text-xs text-gray-500 truncate">${ch.name || ''}</div>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
            detailsView.querySelectorAll('.chapter-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    console.log('[COMICS] Chapter clicked:', btn.dataset.chapter);
                    loadPages(btn.dataset.slug, btn.dataset.chapter, btn.dataset.title, btn.dataset.chname);
                });
            });
        } else {
            detailsView.innerHTML = `<div class="text-center text-red-400 p-10">Failed to load chapters.</div>`;
        }
    } catch (e) {
        console.error('[COMICS] Error loading details:', e);
        detailsView.innerHTML = `<div class="text-center text-red-400 p-10">Error loading details: ${e.message}</div>`;
    }
}

async function loadPages(slug, chapter, comicTitle, chapterTitle) {
    syncElements(); // Re-sync to ensure overlay is found
    if (!comicsReaderOverlay) {
        console.error('[COMICS] Reader overlay not found in DOM!');
        // Fallback search
        const overlay = document.getElementById('comics-reader-overlay');
        if (overlay) comicsReaderOverlay = overlay;
        else return;
    }
    
    comicsReaderOverlay.classList.remove('hidden');
    comicsReaderOverlay.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Prevent background scroll
    if (mainNav) mainNav.style.display = 'none';

    comicsReaderPages.innerHTML = '<div class="flex justify-center items-center h-screen"><div class="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div></div>';
    comicsReaderTitle.textContent = comicTitle;
    comicsReaderChapter.textContent = chapterTitle || `Chapter ${chapter}`;
    
    try {
        console.log('[COMICS] Fetching pages for:', slug, 'chapter:', chapter);
        const res = await fetch(`${API}/comics/pages/${slug}/${chapter}`);
        const data = await res.json();
        if (data.success && data.pages) {
            comicsReaderPages.innerHTML = '';
            data.pages.forEach(page => {
                const img = document.createElement('img');
                img.src = `${API}/comics-proxy?url=${encodeURIComponent(page.url)}`;
                img.className = 'block mx-auto mb-4 rounded-lg shadow-lg';
                img.style.maxWidth = `${comicsZoomLevel}%`;
                img.style.width = `${comicsZoomLevel}%`;
                img.draggable = false;
                img.loading = 'lazy';
                img.onerror = () => { img.style.display = 'none'; };
                comicsReaderPages.appendChild(img);
            });
            comicsReaderPages.scrollTop = 0;
        } else {
            comicsReaderPages.innerHTML = '<div class="text-center text-white mt-20">No pages found.</div>';
        }
    } catch (e) {
        console.error('[COMICS] Error loading pages:', e);
        comicsReaderPages.innerHTML = `<div class="text-center text-red-400 mt-20">Error loading pages: ${e.message}</div>`;
    }
}

function closeReader() {
    if (comicsReaderOverlay) {
        comicsReaderOverlay.classList.add('hidden');
        comicsReaderOverlay.style.display = 'none';
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
        }
    }
    document.body.style.overflow = ''; // Restore scroll
    if (mainNav) mainNav.style.display = 'flex';
    if (comicsReaderPages) comicsReaderPages.innerHTML = '';
    comicsZoomLevel = 100; // Reset zoom
}

function showLoading(show) {
    if (comicsLoading) {
        comicsLoading.style.display = show ? 'flex' : 'none';
        if (show) comicsLoading.classList.remove('hidden');
        else comicsLoading.classList.add('hidden');
    }
}

function getSavedComics() {
    try {
        return JSON.parse(localStorage.getItem('saved_comics') || '[]');
    } catch (e) {
        return [];
    }
}

function loadSavedComics() {
    comicsMode = 'saved';
    if (comicsGrid) comicsGrid.innerHTML = '';
    const saved = getSavedComics();
    if (saved.length === 0) {
        if (comicsGrid) comicsGrid.innerHTML = '<div class="col-span-full text-center text-gray-500 py-10">No saved comics yet.</div>';
    } else {
        renderComics(saved);
    }
}