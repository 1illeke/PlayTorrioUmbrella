// Downloader Functions
// This file handles media downloader functionality (111477 + AcerMovies)

const DOWNLOADER_BASE_URL = 'http://localhost:6987';

// Use global TMDB_API_KEY from config.js
function getTmdbApiKey() {
    return window.TMDB_API_KEY || 'c3515fdc674ea2bd7b514f4bc3616a4a';
}

let downloaderType = 'movies'; // 'movies' | 'tv'
let currentDownloaderProvider = '111477'; // '111477' | 'acermovies'

// ===== 111477 PROVIDER =====

async function runDownloaderSearch(q) {
    const downloaderResults = document.getElementById('downloaderResults');
    const downloaderEmpty = document.getElementById('downloaderEmpty');
    if (!downloaderResults || !downloaderEmpty) {
        console.error('[Downloader] Missing DOM elements');
        return;
    }
    
    const query = (q || '').trim();
    downloaderResults.innerHTML = '';
    downloaderResults.classList.remove('single');
    
    if (!query) {
        downloaderEmpty.style.display = '';
        downloaderEmpty.textContent = 'Type a search above to see results.';
        return;
    }
    downloaderEmpty.style.display = 'none';
    console.log('[Downloader] Searching 111477 for:', query);
    
    try {
        let results = [];
        // Try local 111477 service first
        try {
            const url = `${DOWNLOADER_BASE_URL}/111477/api/tmdb/search/${encodeURIComponent(query)}`;
            console.log('[Downloader] Fetching:', url);
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                results = Array.isArray(data?.results) ? data.results : [];
                console.log('[Downloader] 111477 results:', results.length);
            }
        } catch (e) {
            console.log('[Downloader] 111477 failed, trying TMDB fallback');
        }
        
        if (!results.length) {
            // Fallback: direct TMDB (movies + TV)
            const [mRes, tvRes] = await Promise.all([
                fetch(`https://api.themoviedb.org/3/search/movie?api_key=${getTmdbApiKey()}&query=${encodeURIComponent(query)}&page=1&include_adult=false`),
                fetch(`https://api.themoviedb.org/3/search/tv?api_key=${getTmdbApiKey()}&query=${encodeURIComponent(query)}&page=1&include_adult=false`)
            ]);
            const [mData, tvData] = [await mRes.json(), await tvRes.json()];
            const mResults = Array.isArray(mData?.results) ? mData.results.map(r => ({
                title: r.title,
                posterPath: r.poster_path ? `https://image.tmdb.org/t/p/w500${r.poster_path}` : '',
                releaseDate: r.release_date || '',
                year: r.release_date ? String(r.release_date).slice(0,4) : '',
                tmdbId: r.id,
                mediaType: 'movie'
            })) : [];
            const tvResults = Array.isArray(tvData?.results) ? tvData.results.map(r => ({
                title: r.name,
                posterPath: r.poster_path ? `https://image.tmdb.org/t/p/w500${r.poster_path}` : '',
                releaseDate: r.first_air_date || '',
                year: r.first_air_date ? String(r.first_air_date).slice(0,4) : '',
                tmdbId: r.id,
                mediaType: 'tv'
            })) : [];
            results = [...mResults, ...tvResults];
        }
        
        // Filter by selected type
        const filtered = results.filter((item) => {
            const mt = (item.mediaType || item.media_type || (item.firstAirDate || item.name ? 'tv' : 'movie')).toLowerCase();
            return downloaderType === 'movies' ? mt === 'movie' : mt === 'tv';
        });
        
        if (!filtered.length) {
            // Fallback fetch type-specific from TMDB
            if (downloaderType === 'tv') {
                const tvRes = await fetch(`https://api.themoviedb.org/3/search/tv?api_key=${getTmdbApiKey()}&query=${encodeURIComponent(query)}&page=1&include_adult=false`);
                const tvData = await tvRes.json();
                results = Array.isArray(tvData?.results) ? tvData.results.map(r => ({
                    title: r.name,
                    posterPath: r.poster_path ? `https://image.tmdb.org/t/p/w500${r.poster_path}` : '',
                    releaseDate: r.first_air_date || '',
                    year: r.first_air_date ? String(r.first_air_date).slice(0,4) : '',
                    tmdbId: r.id,
                    mediaType: 'tv'
                })) : [];
            } else {
                const mRes2 = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${getTmdbApiKey()}&query=${encodeURIComponent(query)}&page=1&include_adult=false`);
                const mData2 = await mRes2.json();
                results = Array.isArray(mData2?.results) ? mData2.results.map(r => ({
                    title: r.title,
                    posterPath: r.poster_path ? `https://image.tmdb.org/t/p/w500${r.poster_path}` : '',
                    releaseDate: r.release_date || '',
                    year: r.release_date ? String(r.release_date).slice(0,4) : '',
                    tmdbId: r.id,
                    mediaType: 'movie'
                })) : [];
            }
        } else {
            results = filtered;
        }
        
        results = results.slice(0, 10);
        if (!results.length) {
            downloaderEmpty.style.display = '';
            downloaderEmpty.textContent = downloaderType === 'movies' ? 'No movies found.' : 'No TV shows found.';
            return;
        }
        
        const frag = document.createDocumentFragment();
        results.forEach((item) => {
            const card = document.createElement('div');
            card.className = 'downloader-item';
            card.tabIndex = 0;
            const poster = item.posterPath || '';
            const title = item.title || item.name || 'Untitled';
            const year = item.year || (item.releaseDate ? String(item.releaseDate).slice(0,4) : '');
            const tmdbId = item.tmdbId || item.id || '';
            const mediaType = item.mediaType || item.media_type || 'movie';
            if (tmdbId) card.dataset.tmdbId = String(tmdbId);
            if (mediaType) card.dataset.mediaType = String(mediaType);
            card.innerHTML = `
                <img loading="lazy" class="downloader-thumb" src="${poster}" alt="${title.replace(/"/g,'&quot;')}" onerror="this.style.opacity=0;" />
                <div class="downloader-meta">
                    <div class="downloader-title">${title}</div>
                    <div class="downloader-year">${year || ''}</div>
                </div>`;
            card.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                downloaderResults.querySelectorAll('.downloader-item').forEach(el => { if (el !== card) el.remove(); });
                downloaderResults.classList.add('single');
                card.classList.add('selected');
                const id = card.dataset.tmdbId;
                const type = (card.dataset.mediaType || 'movie').toLowerCase();
                downloaderResults.querySelectorAll('.downloader-files-card, .downloader-tv-controls').forEach(el => el.remove());
                if (id) {
                    if (type === 'tv') fetchAndRenderTvSelectors(id, downloaderResults);
                    else fetchDownloaderFilesByTmdb(id, downloaderResults);
                }
            });
            frag.appendChild(card);
        });
        downloaderResults.appendChild(frag);
    } catch (err) {
        console.error('Downloader search failed:', err);
        downloaderEmpty.style.display = '';
        downloaderEmpty.textContent = 'Search failed.';
    }
}

function startFilesLoad(container) {
    const key = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    container.dataset.filesLoadKey = key;
    return key;
}

async function fetchDownloaderFilesByTmdb(tmdbId, container) {
    try {
        const loadKey = startFilesLoad(container);
        const res = await fetch(`${DOWNLOADER_BASE_URL}/111477/api/tmdb/movie/${encodeURIComponent(tmdbId)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        
        let allFiles = [];
        if (Array.isArray(data?.results)) {
            data.results.forEach(result => {
                if (result.success && Array.isArray(result.files)) {
                    allFiles = allFiles.concat(result.files);
                }
            });
        } else if (Array.isArray(data?.files)) {
            allFiles = data.files;
        }
        
        renderFilesCard(allFiles, container, loadKey);
    } catch (e) {
        console.error('Failed to load files by TMDB id', e);
        if (typeof showNotification === 'function') showNotification('Failed to load files for this title', 'error');
    }
}

async function fetchAndRenderTvSelectors(tmdbId, container) {
    const ctrl = document.createElement('div');
    ctrl.className = 'trakt-card downloader-tv-controls';
    ctrl.style.maxWidth = '900px';
    ctrl.style.width = '100%';
    const body = document.createElement('div');
    body.className = 'trakt-card-body';
    body.innerHTML = '<h3 style="margin-bottom:0.75rem;">Pick season and episode</h3>';

    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.gap = '0.75rem';
    row.style.alignItems = 'center';
    row.style.flexWrap = 'wrap';

    const seasonLabel = document.createElement('label');
    seasonLabel.textContent = 'Season';
    seasonLabel.style.marginRight = '0.25rem';
    const seasonSel = document.createElement('select');
    seasonSel.style.cssText = 'padding:0.5rem 0.6rem;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(0,0,0,0.25);color:#fff;';

    const episodeLabel = document.createElement('label');
    episodeLabel.textContent = 'Episode';
    episodeLabel.style.marginRight = '0.25rem';
    const episodeSel = document.createElement('select');
    episodeSel.style.cssText = 'padding:0.5rem 0.6rem;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(0,0,0,0.25);color:#fff;';
    episodeSel.disabled = true;

    row.appendChild(seasonLabel);
    row.appendChild(seasonSel);
    row.appendChild(episodeLabel);
    row.appendChild(episodeSel);
    body.appendChild(row);
    ctrl.appendChild(body);
    container.appendChild(ctrl);

    // Fetch TV details from TMDB
    try {
        const res = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${getTmdbApiKey()}`);
        const data = await res.json();
        const seasons = (data.seasons || []).filter(s => s.season_number > 0);
        
        if (!seasons.length) {
            seasonSel.innerHTML = '<option>No seasons</option>';
            return;
        }
        
        seasons.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.season_number;
            opt.textContent = `Season ${s.season_number}`;
            seasonSel.appendChild(opt);
        });

        const loadEpisodes = async (seasonNum) => {
            episodeSel.innerHTML = '<option>Loading...</option>';
            episodeSel.disabled = true;
            try {
                const epRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}/season/${seasonNum}?api_key=${getTmdbApiKey()}`);
                const epData = await epRes.json();
                const episodes = epData.episodes || [];
                episodeSel.innerHTML = '';
                episodes.forEach(ep => {
                    const opt = document.createElement('option');
                    opt.value = ep.episode_number;
                    opt.textContent = `Episode ${ep.episode_number}: ${ep.name || ''}`;
                    episodeSel.appendChild(opt);
                });
                episodeSel.disabled = false;
            } catch (e) {
                episodeSel.innerHTML = '<option>Error</option>';
            }
        };

        seasonSel.addEventListener('change', () => loadEpisodes(seasonSel.value));
        loadEpisodes(seasonSel.value);

        episodeSel.addEventListener('change', async () => {
            const season = seasonSel.value;
            const episode = episodeSel.value;
            if (!season || !episode) return;
            container.querySelectorAll('.downloader-files-card').forEach(el => el.remove());
            try {
                const loadKey = startFilesLoad(container);
                const res = await fetch(`${DOWNLOADER_BASE_URL}/111477/api/tmdb/tv/${encodeURIComponent(tmdbId)}/season/${encodeURIComponent(season)}/episode/${encodeURIComponent(episode)}`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                let allFiles = [];
                if (Array.isArray(data?.results)) {
                    data.results.forEach(result => {
                        if (result.success && Array.isArray(result.files)) allFiles = allFiles.concat(result.files);
                    });
                } else if (Array.isArray(data?.files)) {
                    allFiles = data.files;
                }
                renderFilesCard(allFiles, container, loadKey);
            } catch (e) {
                console.error('Failed to load TV episode files', e);
                if (typeof showNotification === 'function') showNotification('Failed to load files', 'error');
            }
        });
    } catch (e) {
        console.error('Failed to fetch TV details', e);
        seasonSel.innerHTML = '<option>Error loading</option>';
    }
}

function renderFilesCard(files, container, loadKey) {
    if (loadKey && container.dataset.filesLoadKey && container.dataset.filesLoadKey !== loadKey) return;
    const filesWrap = document.createElement('div');
    filesWrap.className = 'trakt-card downloader-files-card';
    filesWrap.style.maxWidth = '900px';
    filesWrap.style.width = '100%';
    const inner = document.createElement('div');
    inner.className = 'trakt-card-body';
    inner.innerHTML = `<h3 style="margin-bottom:0.75rem;">Available files (${files.length})</h3>`;
    
    if (!files.length) {
        const empty = document.createElement('div');
        empty.className = 'downloader-empty';
        empty.textContent = 'No files found for this title.';
        inner.appendChild(empty);
    } else {
        const list = document.createElement('div');
        list.style.display = 'flex';
        list.style.flexDirection = 'column';
        list.style.gap = '0.5rem';
        files.slice(0, 100).forEach(f => {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:0.6rem 0.8rem;';
            const name = document.createElement('div');
            name.style.cssText = 'flex:1;margin-right:0.75rem;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;';
            name.textContent = f.name || 'File';
            const size = document.createElement('div');
            size.style.cssText = 'color:#9ca3af;margin-right:0.75rem;min-width:80px;text-align:right;';
            size.textContent = f.sizeFormatted || '';
            const btn = document.createElement('button');
            btn.className = 'api-btn api-btn-primary';
            btn.innerHTML = '<i class="fas fa-download"></i> Download';
            btn.addEventListener('click', async (ev) => {
                ev.preventDefault(); ev.stopPropagation();
                const href = f.url || '';
                if (!href) return;
                try {
                    if (window.electronAPI?.openExternal) await window.electronAPI.openExternal(href);
                    else window.open(href, '_blank', 'noopener');
                } catch (_) { window.open(href, '_blank'); }
            });
            row.appendChild(name);
            row.appendChild(size);
            row.appendChild(btn);
            list.appendChild(row);
        });
        inner.appendChild(list);
        if (files.length > 100) {
            const moreNote = document.createElement('div');
            moreNote.style.cssText = 'margin-top:0.5rem;color:#9ca3af;font-size:0.9rem;text-align:center;';
            moreNote.textContent = `Showing first 100 of ${files.length} files`;
            inner.appendChild(moreNote);
        }
    }
    filesWrap.appendChild(inner);
    container.querySelectorAll('.downloader-files-card').forEach(el => el.remove());
    container.appendChild(filesWrap);
}

// ===== ACERMOVIES PROVIDER =====

async function searchAcerMovies(query) {
    const downloaderResults = document.getElementById('downloaderResults');
    const downloaderEmpty = document.getElementById('downloaderEmpty');
    if (!downloaderResults || !downloaderEmpty || !query.trim()) {
        if (downloaderResults) downloaderResults.innerHTML = '';
        if (downloaderEmpty) downloaderEmpty.style.display = 'block';
        if (downloaderEmpty) downloaderEmpty.textContent = 'Please enter a search term.';
        return;
    }

    downloaderResults.innerHTML = '';
    downloaderResults.classList.remove('single');
    downloaderEmpty.style.display = 'none';
    console.log('[Downloader] Searching AcerMovies for:', query);

    try {
        const url = `${DOWNLOADER_BASE_URL}/api/acermovies/search/${encodeURIComponent(query)}`;
        console.log('[Downloader] Fetching:', url);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        const results = (data && data.searchResult) ? data.searchResult : [];
        console.log('[Downloader] AcerMovies results:', results.length);

        if (results.length === 0) {
            downloaderEmpty.style.display = 'block';
            downloaderEmpty.textContent = 'No results found on acermovies.';
            return;
        }

        const frag = document.createDocumentFragment();
        results.slice(0, 20).forEach((item) => {
            const card = document.createElement('div');
            card.className = 'downloader-item';
            card.tabIndex = 0;
            card.dataset.url = item.url;
            card.innerHTML = `
                <img loading="lazy" class="downloader-thumb" src="${item.image || ''}" alt="${(item.title || '').replace(/"/g,'&quot;')}" onerror="this.style.opacity=0;" />
                <div class="downloader-meta">
                    <div class="downloader-title">${item.title || 'Untitled'}</div>
                </div>`;
            card.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                downloaderResults.querySelectorAll('.downloader-item').forEach(el => { if (el !== card) el.remove(); });
                downloaderResults.classList.add('single');
                card.classList.add('selected');
                getAcerMovieQualities(card.dataset.url, downloaderResults);
            });
            frag.appendChild(card);
        });
        downloaderResults.appendChild(frag);
    } catch (err) {
        console.error('acermovies search failed:', err);
        downloaderEmpty.style.display = 'block';
        downloaderEmpty.textContent = 'acermovies search failed.';
    }
}

async function getAcerMovieQualities(movieUrl, container) {
    let currentSeriesType = "movie";
    try {
        const res = await fetch(`${DOWNLOADER_BASE_URL}/api/acermovies/sourceQuality?url=${encodeURIComponent(movieUrl)}`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        const qualities = (data && data.sourceQualityList) ? data.sourceQualityList : [];
        const meta = data.meta || {};
        currentSeriesType = meta.type || "movie";
        renderAcerFilesCard(qualities, container, currentSeriesType);
    } catch (e) {
        console.error('Failed to load acermovies qualities', e);
        if (typeof showNotification === 'function') showNotification('Failed to load qualities', 'error');
    }
}

function renderAcerFilesCard(qualities, container, seriesType) {
    const filesWrap = document.createElement('div');
    filesWrap.className = 'trakt-card downloader-files-card';
    filesWrap.style.maxWidth = '900px';
    filesWrap.style.width = '100%';
    const inner = document.createElement('div');
    inner.className = 'trakt-card-body';
    inner.innerHTML = `<h3 style="margin-bottom:0.75rem;">Available Qualities (${qualities.length})</h3>`;

    if (!qualities.length) {
        inner.innerHTML += '<div class="downloader-empty" style="display:block;">No qualities found.</div>';
    } else {
        const list = document.createElement('div');
        list.style.display = 'flex';
        list.style.flexDirection = 'column';
        list.style.gap = '0.5rem';

        qualities.forEach(qItem => {
            if (qItem.link && !qItem.url) qItem.url = qItem.link;
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:0.6rem 0.8rem;';
            const name = document.createElement('div');
            name.style.cssText = 'flex:1;margin-right:0.75rem;white-space:normal;word-break:break-word;';
            name.textContent = qItem.title || 'Unknown Quality';
            const btnContainer = document.createElement('div');
            btnContainer.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';

            const hasBatch = qItem.batchUrl && qItem.batchUrl.trim() !== "";
            const hasEpisodes = qItem.episodesUrl && qItem.episodesUrl.trim() !== "";
            const hasDirectUrl = qItem.url && qItem.url.trim() !== "";

            if (seriesType === "movie" || seriesType === "episode" || hasDirectUrl) {
                const pick = document.createElement("button");
                pick.textContent = "Select";
                pick.className = 'api-btn api-btn-primary';
                pick.addEventListener("click", async (ev) => {
                    ev.stopPropagation();
                    pick.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                    pick.disabled = true;
                    await handleAcerQualitySelect(qItem, pick, "direct", container, seriesType === 'episode' ? 'episode' : 'movie');
                });
                btnContainer.appendChild(pick);
            } else {
                if (hasBatch) {
                    const batchBtn = document.createElement("button");
                    batchBtn.textContent = "Season Pack";
                    batchBtn.className = 'api-btn api-btn-primary';
                    batchBtn.addEventListener("click", async (ev) => {
                        ev.stopPropagation();
                        batchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                        batchBtn.disabled = true;
                        await handleAcerQualitySelect(qItem, batchBtn, "batch", container);
                    });
                    btnContainer.appendChild(batchBtn);
                }
                if (hasEpisodes) {
                    const episodesBtn = document.createElement("button");
                    episodesBtn.textContent = "Individual Episodes";
                    episodesBtn.className = 'api-btn api-btn-primary';
                    episodesBtn.addEventListener("click", async (ev) => {
                        ev.stopPropagation();
                        episodesBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                        episodesBtn.disabled = true;
                        await handleAcerQualitySelect(qItem, episodesBtn, "episodes", container);
                    });
                    btnContainer.appendChild(episodesBtn);
                }
            }
            row.appendChild(name);
            row.appendChild(btnContainer);
            list.appendChild(row);
        });
        inner.appendChild(list);
    }
    filesWrap.appendChild(inner);
    container.querySelectorAll('.downloader-files-card').forEach(el => el.remove());
    container.appendChild(filesWrap);
}

async function handleAcerQualitySelect(qItem, buttonEl, selectType, container, itemType) {
    if (selectType === "direct" || qItem.url) {
        await resolveAcerFinal(qItem.url, itemType || "movie", buttonEl);
    } else if (selectType === "batch" && qItem.batchUrl) {
        await resolveAcerFinal(qItem.batchUrl, "batch", buttonEl);
    } else if (selectType === "episodes" && qItem.episodesUrl) {
        await showAcerEpisodes(qItem, container);
        buttonEl.innerHTML = "Individual Episodes";
        buttonEl.disabled = false;
    } else {
        buttonEl.innerHTML = "Select";
        buttonEl.disabled = false;
        alert("No download URL found.");
    }
}

async function showAcerEpisodes(qItem, container) {
    try {
        const res = await fetch(`${DOWNLOADER_BASE_URL}/api/acermovies/sourceEpisodes?url=${encodeURIComponent(qItem.episodesUrl)}`);
        const data = await res.json();
        const episodes = (data && data.sourceEpisodes) ? data.sourceEpisodes : [];
        if (!episodes.length) { alert("No episodes found."); return; }
        renderAcerFilesCard(episodes, container, "episode");
    } catch (e) {
        console.error(e);
        alert("Failed to load episodes.");
    }
}

async function resolveAcerFinal(url, seriesType, buttonEl) {
    try {
        const res = await fetch(`${DOWNLOADER_BASE_URL}/api/acermovies/sourceUrl?url=${encodeURIComponent(url)}&seriesType=${seriesType}`);
        const data = await res.json();
        const finalUrl = data && data.sourceUrl ? data.sourceUrl : "";
        if (!finalUrl) {
            buttonEl.innerHTML = "Select";
            buttonEl.disabled = false;
            alert("No final link returned.");
            return;
        }
        buttonEl.innerHTML = "Download";
        buttonEl.disabled = false;
        buttonEl.onclick = () => {
            if (window.electronAPI?.openExternal) window.electronAPI.openExternal(finalUrl);
            else window.open(finalUrl, "_blank");
        };
    } catch (e) {
        console.error(e);
        buttonEl.innerHTML = "Select";
        buttonEl.disabled = false;
        alert("Failed to resolve final link.");
    }
}

// ===== PROVIDER SWITCHING =====

function setActiveDownloaderProvider(provider) {
    const provider111477 = document.getElementById('provider111477');
    const providerAcermovies = document.getElementById('providerAcermovies');
    const queryInput = document.getElementById('downloaderQuery');
    const resultsContainer = document.getElementById('downloaderResults');
    const emptyContainer = document.getElementById('downloaderEmpty');
    const moviesFilterBtn = document.getElementById('downloaderFilterMovies');
    const tvFilterBtn = document.getElementById('downloaderFilterTV');

    if (provider111477) provider111477.classList.remove('active');
    if (providerAcermovies) providerAcermovies.classList.remove('active');
    if (resultsContainer) { resultsContainer.innerHTML = ''; resultsContainer.classList.remove('single'); }
    if (emptyContainer) emptyContainer.style.display = 'none';

    currentDownloaderProvider = provider;

    if (provider === 'acermovies') {
        if (providerAcermovies) providerAcermovies.classList.add('active');
        if (moviesFilterBtn) moviesFilterBtn.style.display = 'none';
        if (tvFilterBtn) tvFilterBtn.style.display = 'none';
        if (queryInput) queryInput.placeholder = 'Search acermovies...';
    } else {
        if (provider111477) provider111477.classList.add('active');
        if (moviesFilterBtn) moviesFilterBtn.style.display = 'flex';
        if (tvFilterBtn) tvFilterBtn.style.display = 'flex';
        if (queryInput) queryInput.placeholder = 'Search movies or shows (e.g., Superman)';
    }
    console.log('[Downloader] Provider set to:', provider);
}

function initDownloader() {
    const provider111477 = document.getElementById('provider111477');
    const providerAcermovies = document.getElementById('providerAcermovies');
    const downloaderBtn = document.getElementById('downloaderSearchBtn');
    const downloaderQuery = document.getElementById('downloaderQuery');
    const filterMoviesBtn = document.getElementById('downloaderFilterMovies');
    const filterTvBtn = document.getElementById('downloaderFilterTV');

    if (provider111477) provider111477.addEventListener('click', () => setActiveDownloaderProvider('111477'));
    if (providerAcermovies) providerAcermovies.addEventListener('click', () => setActiveDownloaderProvider('acermovies'));

    if (downloaderBtn && downloaderQuery) {
        // Clone button to remove old listeners
        const newDownloaderBtn = downloaderBtn.cloneNode(true);
        downloaderBtn.parentNode.replaceChild(newDownloaderBtn, downloaderBtn);

        const searchHandler = () => {
            const q = downloaderQuery.value.trim();
            const acermoviesActive = document.getElementById('providerAcermovies')?.classList.contains('active');
            console.log('[Downloader] Search:', q, 'Provider:', acermoviesActive ? 'acermovies' : '111477');
            if (acermoviesActive) {
                searchAcerMovies(q);
            } else {
                runDownloaderSearch(q);
            }
        };

        newDownloaderBtn.addEventListener('click', searchHandler);
        downloaderQuery.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchHandler();
            }
        });
    }

    if (filterMoviesBtn) filterMoviesBtn.addEventListener('click', () => {
        downloaderType = 'movies';
        filterMoviesBtn.classList.add('active');
        if (filterTvBtn) filterTvBtn.classList.remove('active');
    });
    if (filterTvBtn) filterTvBtn.addEventListener('click', () => {
        downloaderType = 'tv';
        filterTvBtn.classList.add('active');
        if (filterMoviesBtn) filterMoviesBtn.classList.remove('active');
    });

    setActiveDownloaderProvider('111477');
    console.log('[Downloader] Initialized');
}

// Export functions
window.runDownloaderSearch = runDownloaderSearch;
window.fetchDownloaderFilesByTmdb = fetchDownloaderFilesByTmdb;
window.fetchAndRenderTvSelectors = fetchAndRenderTvSelectors;
window.renderFilesCard = renderFilesCard;
window.searchAcerMovies = searchAcerMovies;
window.getAcerMovieQualities = getAcerMovieQualities;
window.renderAcerFilesCard = renderAcerFilesCard;
window.setActiveDownloaderProvider = setActiveDownloaderProvider;
window.initDownloader = initDownloader;

console.log('[Downloader] Module loaded');
