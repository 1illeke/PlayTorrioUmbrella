// Comics Module

const API = "http://localhost:6987";

// State
let comicsCurrentPage = 1;
let comicsIsLoading = false;
let comicsHasMore = true;
let comicsIsSearchMode = false;
let comicsPageActive = false;

let comicsCurrentView = "browse";
let comicsCurrentComic = null;
let comicsMode = "home";
let comicsCurrentGenre = null;

// Comics Storage
const SAVED_COMICS_KEY = 'pt_saved_comics_v1';
function getSavedComics() {
    try { return JSON.parse(localStorage.getItem(SAVED_COMICS_KEY) || '[]'); } catch { return []; }
}
function setSavedComics(list) {
    localStorage.setItem(SAVED_COMICS_KEY, JSON.stringify(list));
}
function isComicSaved(slug) {
    return getSavedComics().some(c => c.slug === slug);
}
function toggleSaveComic(event, comic) {
    event.stopPropagation();
    const list = getSavedComics();
    const idx = list.findIndex(c => c.slug === comic.slug);
    const btn = event.currentTarget;
    
    if (idx >= 0) {
        list.splice(idx, 1);
        btn.classList.remove('in-list');
        btn.innerHTML = '<i class="fas fa-plus"></i>';
        if (typeof showNotification === 'function') showNotification('Removed from Saved Comics', 'info');
    } else {
        list.unshift(comic);
        btn.classList.add('in-list');
        btn.innerHTML = '<i class="fas fa-check"></i>';
        if (typeof showNotification === 'function') showNotification('Added to Saved Comics', 'success');
    }
    setSavedComics(list);
}

// Genre map
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

function showComicsView(view) {
    comicsCurrentView = view;

    const grid = document.getElementById("comics-container");
    const issues = document.getElementById("comics-issues-container");
    const reader = document.getElementById("comics-reader-container");
    const loadMore = document.getElementById("comics-load-more-container");
    const back = document.getElementById("comics-back-btn");
    const loading = document.getElementById("comics-loading");
    const zoomIn = document.getElementById("comics-zoom-in-btn");
    const zoomOut = document.getElementById("comics-zoom-out-btn");
    const fullscreenBtn = document.getElementById("comics-fullscreen-btn");

    if (!grid || !issues || !reader || !loadMore || !back || !loading) return;

    grid.style.display = view === "browse" ? "grid" : "none";
    issues.style.display = view === "issues" ? "block" : "none";
    reader.style.display = view === "reader" ? "block" : "none";
    loadMore.style.display = (view === "browse" && comicsMode !== "saved") ? "block" : "none";
    back.style.display = view !== "browse" ? "inline-block" : "none";
    loading.style.display = view === "browse" ? "block" : "none";
    
    if (zoomIn) zoomIn.style.display = view === "reader" ? "inline-block" : "none";
    if (zoomOut) zoomOut.style.display = view === "reader" ? "inline-block" : "none";
    if (fullscreenBtn) fullscreenBtn.style.display = view === "reader" ? "inline-block" : "none";
}

function initializeComics() {
    console.log("[COMICS] initializeComics called");
    comicsPageActive = true;

    const container = document.getElementById("comics-container");
    if (!container) {
        console.log("[COMICS] comics-container not found");
        return;
    }

    if (container.children.length === 0) {
        comicsCurrentPage = 1;
        comicsHasMore = true;
        comicsIsSearchMode = false;
        comicsMode = "home";
        comicsCurrentGenre = null;
        showComicsView("browse");
        loadComicsAll(comicsCurrentPage);
    }
}

async function loadComicsAll(page) {
    if (comicsIsLoading || !comicsHasMore || comicsIsSearchMode) return;

    const loader = document.getElementById("comics-loading");
    if (!loader) return;

    comicsIsLoading = true;
    loader.style.display = "block";
    loader.textContent = "Loading…";

    try {
        let url = "";

        if (comicsMode === "home") {
            url = `${API}/comics/all?page=${page}`;
        } else if (comicsMode === "genre" && comicsCurrentGenre) {
            url = `${API}/comics/genres/${comicsCurrentGenre}?page=${page}`;
        } else {
            comicsIsLoading = false;
            loader.style.display = "none";
            return;
        }

        const res = await fetch(url);
        const data = await res.json();

        const list = data.results || [];

        if (data.success && list.length > 0) {
            list.forEach(addComicToGrid);
            comicsCurrentPage++;
        } else {
            comicsHasMore = false;
            loader.textContent = "No more comics.";
        }
    } catch (err) {
        console.error("[COMICS] Failed to load comics:", err);
        loader.textContent = "Error loading comics.";
    }

    comicsIsLoading = false;
    loader.style.display = comicsHasMore ? "none" : "block";
}

async function searchComicsNew(query) {
    if (!query.trim()) return;

    const container = document.getElementById("comics-container");
    const loader = document.getElementById("comics-loading");
    const browseBtn = document.getElementById("comics-browse-btn");

    comicsMode = "search";
    comicsIsSearchMode = true;
    comicsHasMore = false;
    comicsCurrentPage = 1;

    if (container) container.innerHTML = "";
    if (loader) {
        loader.style.display = "block";
        loader.textContent = "Searching…";
    }
    if (browseBtn) browseBtn.style.display = "inline-block";

    showComicsView("browse");

    try {
        const res = await fetch(`${API}/comics/search/${encodeURIComponent(query)}`);
        const data = await res.json();

        const list = data.results || [];

        if (data.success && list.length > 0) {
            list.forEach(addComicToGrid);
            loader.textContent = `Found ${list.length} result(s).`;
        } else {
            loader.innerHTML = `<span style="color:#f44">No results found.</span>`;
        }
    } catch (error) {
        console.error("[COMICS] Search error:", error);
        loader.innerHTML = `<span style="color:#f44">Error during search.</span>`;
    }
}

function addComicToGrid(item) {
    const container = document.getElementById("comics-container");
    if (!container) return;

    const slug = item.url.split("/comic/")[1];
    const poster = `${API}/comics-proxy?url=${encodeURIComponent(item.poster_url)}`;
    const isSaved = isComicSaved(slug);

    const div = document.createElement("div");
    div.className = "movie-card";
    div.style.cssText = `
        background: var(--card-bg);
        border-radius: 12px;
        overflow: hidden;
        transition: all 0.3s ease;
        cursor: pointer;
        border: 1px solid rgba(249, 115, 22, 0.2);
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;

    div.innerHTML = `
        <button class="add-to-list-btn ${isSaved ? 'in-list' : ''}" title="${isSaved ? 'Remove from Saved' : 'Save Comic'}">
            <i class="fas ${isSaved ? 'fa-check' : 'fa-plus'}"></i>
        </button>
        <img src="${poster}" 
             alt="${item.name}"
             style="width:100%;height:300px;object-fit:cover;display:block;"
             onerror="this.style.display='none'">
        <div style="padding: 12px; font-size: 14px; font-weight: 600; text-align: center; color: var(--light); min-height: 48px; display:flex; align-items:center; justify-content:center;">
            ${item.name}
        </div>
    `;

    div.onmouseenter = () => {
        div.style.transform = "translateY(-6px)";
        div.style.borderColor = "#f97316";
        div.style.boxShadow = "0 8px 20px rgba(249,115,22,0.5)";
    };
    div.onmouseleave = () => {
        div.style.transform = "translateY(0)";
        div.style.borderColor = "rgba(249,115,22,0.2)";
        div.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
    };

    const saveBtn = div.querySelector('.add-to-list-btn');
    saveBtn.addEventListener('click', (e) => {
        toggleSaveComic(e, { slug: slug, name: item.name, poster_url: item.poster_url, url: item.url });
    });

    div.addEventListener('click', (e) => {
        if (e.target.closest('.add-to-list-btn')) return;
        loadChapters(slug, item.name);
    });

    container.appendChild(div);
}

async function loadChapters(slug, title) {
    comicsCurrentComic = { slug, title };

    showComicsView("issues");

    const box = document.getElementById("comics-issues-container");
    if (!box) return;

    box.innerHTML = `<div style="padding:20px;color:#aaa;text-align:center;">Loading chapters…</div>`;

    try {
        const res = await fetch(`${API}/comics/chapters/${slug}`);
        const data = await res.json();

        box.innerHTML = "";

        if (!data.success || !data.chapters || !data.chapters.length) {
            box.innerHTML = `<div style="color:#f44;text-align:center;">No chapters found.</div>`;
            return;
        }

        if (title) {
            const h2 = document.createElement("h2");
            h2.textContent = title;
            h2.style.cssText = "text-align:center;margin-bottom:15px;color:#fff;";
            box.appendChild(h2);
        }

        data.chapters.forEach(ch => {
            const row = document.createElement("div");
            row.className = "comics-chapter-item";
            row.style.cssText = `
                background: var(--card-bg);
                border-radius: 8px;
                padding: 10px 14px;
                margin-bottom: 8px;
                cursor: pointer;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border: 1px solid rgba(249,115,22,0.25);
                transition: all 0.2s ease;
            `;

            const left = document.createElement("span");
            left.textContent = ch.name || `Chapter ${ch.chapter}`;
            left.style.color = "var(--light)";
            left.style.fontWeight = "600";
            left.style.fontSize = "14px";

            const right = document.createElement("span");
            right.textContent = ch.date || "";
            right.style.color = "#9ca3af";
            right.style.fontSize = "12px";

            row.appendChild(left);
            row.appendChild(right);

            row.onmouseenter = () => {
                row.style.background = "rgba(249,115,22,0.15)";
                row.style.borderColor = "#f97316";
                row.style.transform = "translateX(6px)";
            };
            row.onmouseleave = () => {
                row.style.background = "var(--card-bg)";
                row.style.borderColor = "rgba(249,115,22,0.25)";
                row.style.transform = "translateX(0)";
            };

            row.onclick = () => loadPages(slug, ch.chapter, title, ch.name);

            box.appendChild(row);
        });

    } catch (err) {
        console.error("[COMICS] Error loading chapters:", err);
        box.innerHTML = `<div style="color:#f44;text-align:center;">Error loading chapters.</div>`;
    }
}

async function loadPages(slug, chapter, comicTitle, chapterTitle) {
    showComicsView("reader");

    const reader = document.getElementById("comics-reader-container");
    if (!reader) return;

    reader.innerHTML = `
        <h2 style="text-align:center;margin-bottom:10px;color:#fff;">
            ${comicTitle || slug}
        </h2>
        <p style="text-align:center;margin-bottom:20px;color:#9ca3af;font-size:14px;">
            ${chapterTitle ? chapterTitle : "Chapter " + chapter}
        </p>
        <div style="text-align:center;padding:20px;color:#888;" id="comics-page-loader">
            Loading pages…
        </div>
    `;

    try {
        const res = await fetch(`${API}/comics/pages/${slug}/${chapter}`);
        const data = await res.json();

        const loader = document.getElementById("comics-page-loader");

        if (!data.success || !data.pages || !data.pages.length) {
            if (loader) loader.textContent = "No pages found.";
            return;
        }

        if (loader) loader.remove();

        data.pages.forEach(p => {
            const img = document.createElement("img");
            img.src = `${API}/comics-proxy?url=${encodeURIComponent(p.url)}`;
            img.style.cssText = "width:100%;margin-bottom:10px;border-radius:10px;";
            img.loading = "lazy";
            img.onerror = () => { img.style.display = "none"; };
            reader.appendChild(img);
        });
    } catch (err) {
        console.error("[COMICS] Error loading pages:", err);
        const loader = document.getElementById("comics-page-loader");
        if (loader) {
            loader.textContent = "Error loading pages.";
            loader.style.color = "#f44";
        } else {
            reader.innerHTML += `<div style="color:#f44;text-align:center;">Error loading pages.</div>`;
        }
    }
}

function handleComicsScroll() {
    if (!comicsPageActive) return;
    if (comicsCurrentView !== "browse") return;
    if (comicsIsSearchMode) return;
    if (comicsMode === "saved") return;

    const scrollBottom = window.innerHeight + window.scrollY;
    const docHeight = document.body.offsetHeight;

    if (scrollBottom >= docHeight - 300) {
        loadComicsAll(comicsCurrentPage);
    }
}

let comicsScrollTimeout;
window.addEventListener("scroll", () => {
    if (comicsScrollTimeout) clearTimeout(comicsScrollTimeout);
    comicsScrollTimeout = setTimeout(handleComicsScroll, 120);
});

// UI Wiring
(function wireComicsUI() {
    const searchInput = document.getElementById("comics-search-input");
    const browseBtn = document.getElementById("comics-browse-btn");
    const backBtn = document.getElementById("comics-back-btn");
    const loadMoreBtn = document.getElementById("comics-load-more-btn");
    const homeBtn = document.getElementById("comics-home-btn");
    const savedBtn = document.getElementById("comics-saved-btn");
    const genresSelect = document.getElementById("comics-genres-dropdown");

    if (genresSelect) {
        genresSelect.innerHTML = `<option value="">Genres</option>`;
        Object.entries(COMICS_GENRE_MAP).forEach(([name, id]) => {
            const opt = document.createElement("option");
            opt.value = String(id);
            opt.textContent = name;
            genresSelect.appendChild(opt);
        });

        genresSelect.addEventListener("change", () => {
            const val = genresSelect.value;
            const container = document.getElementById("comics-container");
            const loader = document.getElementById("comics-loading");

            if (!val) {
                comicsMode = "home";
                comicsCurrentGenre = null;
                comicsIsSearchMode = false;
                comicsHasMore = true;
                comicsCurrentPage = 1;
                if (container) container.innerHTML = "";
                if (loader) loader.textContent = "Loading…";
                showComicsView("browse");
                loadComicsAll(comicsCurrentPage);
                return;
            }

            comicsMode = "genre";
            comicsCurrentGenre = Number(val);
            comicsIsSearchMode = false;
            comicsHasMore = true;
            comicsCurrentPage = 1;

            if (container) container.innerHTML = "";
            if (loader) loader.textContent = "Loading…";

            showComicsView("browse");
            loadComicsAll(comicsCurrentPage);
        });
    }

    if (searchInput) {
        let debounceId = null;

        searchInput.addEventListener("input", () => {
            if (debounceId) clearTimeout(debounceId);
            const q = searchInput.value.trim();

            if (!q) {
                comicsMode = "home";
                comicsIsSearchMode = false;
                comicsHasMore = true;
                comicsCurrentPage = 1;
                const container = document.getElementById("comics-container");
                const loader = document.getElementById("comics-loading");
                if (container) container.innerHTML = "";
                if (loader) loader.textContent = "Loading…";
                showComicsView("browse");
                loadComicsAll(comicsCurrentPage);
                return;
            }

            debounceId = setTimeout(() => searchComicsNew(q), 600);
        });
    }

    if (backBtn) {
        backBtn.addEventListener("click", () => {
            if (comicsCurrentView === "reader") {
                showComicsView("issues");
            } else if (comicsCurrentView === "issues") {
                showComicsView("browse");
            }
        });
    }

    if (loadMoreBtn) {
        loadMoreBtn.addEventListener("click", () => {
            loadComicsAll(comicsCurrentPage);
        });
    }

    if (homeBtn) {
        homeBtn.addEventListener("click", () => {
            comicsMode = "home";
            comicsCurrentGenre = null;
            comicsIsSearchMode = false;
            comicsHasMore = true;
            comicsCurrentPage = 1;
            const container = document.getElementById("comics-container");
            const loader = document.getElementById("comics-loading");
            if (container) container.innerHTML = "";
            if (loader) loader.textContent = "Loading…";
            if (genresSelect) genresSelect.value = "";
            showComicsView("browse");
            loadComicsAll(comicsCurrentPage);
        });
    }

    if (savedBtn) {
        savedBtn.addEventListener("click", () => {
            comicsMode = "saved";
            comicsIsSearchMode = false;
            comicsHasMore = false;
            const container = document.getElementById("comics-container");
            const loader = document.getElementById("comics-loading");
            if (container) container.innerHTML = "";
            if (loader) loader.style.display = "none";
            showComicsView("browse");
            
            const saved = getSavedComics();
            if (saved.length === 0) {
                if (container) container.innerHTML = '<p style="text-align:center;color:#888;grid-column:1/-1;padding:2rem;">No saved comics yet.</p>';
            } else {
                saved.forEach(addComicToGrid);
            }
        });
    }

    // Comics Zoom Controls
    let comicsZoom = 1000;
    const readerContainer = document.getElementById("comics-reader-container");
    const zoomInBtn = document.getElementById("comics-zoom-in-btn");
    const zoomOutBtn = document.getElementById("comics-zoom-out-btn");
    const fullscreenBtn = document.getElementById("comics-fullscreen-btn");

    if (zoomInBtn) {
        zoomInBtn.addEventListener("click", () => {
            comicsZoom += 200;
            if (readerContainer) readerContainer.style.maxWidth = `${comicsZoom}px`;
        });
    }
    if (zoomOutBtn) {
        zoomOutBtn.addEventListener("click", () => {
            if (comicsZoom > 400) comicsZoom -= 200;
            if (readerContainer) readerContainer.style.maxWidth = `${comicsZoom}px`;
        });
    }
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener("click", () => {
            if (typeof toggleReaderFullscreen === 'function') toggleReaderFullscreen();
        });
    }
})();

window.initializeComics = initializeComics;
window.loadComicsAll = loadComicsAll;
window.searchComicsNew = searchComicsNew;
window.getSavedComics = getSavedComics;
window.setSavedComics = setSavedComics;
window.isComicSaved = isComicSaved;
window.toggleSaveComic = toggleSaveComic;

console.log('[Comics] Module loaded');
