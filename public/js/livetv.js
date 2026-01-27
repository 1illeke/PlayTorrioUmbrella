// Live TV Module

let liveTvCategories = [];
let allMatches = [];
let currentSource = 'kobra';

async function initLiveTv() {
    const categorySelect = document.getElementById('livetv-category-select');
    const searchInput = document.getElementById('livetv-search-input');
    const sourceButtonsContainer = document.getElementById('livetv-source-buttons');
    const livetvGrid = document.getElementById('livetv-grid');
    const livetvEmpty = document.getElementById('livetv-empty');
    
    if (!categorySelect || !livetvGrid) return;
    
    // Setup source button listeners
    if (sourceButtonsContainer) {
        sourceButtonsContainer.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
                const source = e.target.getAttribute('data-source');
                if (source && source !== currentSource) {
                    currentSource = source;
                    sourceButtonsContainer.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
                    e.target.classList.add('active');
                    fetchMatches(source);
                }
            }
        });
    }

    // Setup category and search listeners
    if (categorySelect) {
        categorySelect.addEventListener('change', () => {
            displayMatches(currentSource, categorySelect.value, searchInput ? searchInput.value : '');
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            displayMatches(currentSource, categorySelect ? categorySelect.value : 'all', searchInput.value);
        });
    }
    
    // Default to Kobra
    fetchMatches('kobra');
}

async function fetchMatches(source) {
    const livetvGrid = document.getElementById('livetv-grid');
    const livetvEmpty = document.getElementById('livetv-empty');
    const categorySelect = document.getElementById('livetv-category-select');
    
    if (!livetvGrid) return;
    
    livetvGrid.innerHTML = '<div class="loading"><i class="fas fa-spinner"></i> Loading matches...</div>';
    if (livetvEmpty) livetvEmpty.style.display = 'none';
    
    try {
        let apiUrl = '';
        if (source === 'titan') {
            apiUrl = `https://ntvstream.cx/api/get-matches?server=titan&type=both`;
        } else {
            apiUrl = `https://ntvstream.cx/api/get-matches?server=${source}&type=both`;
        }

        const response = await fetch(apiUrl);
        const data = await response.json();
        
        if (data.success) {
            allMatches = data.all || [];
            updateCategoryDropdown(data.categories);
            displayMatches(source);
        } else {
            livetvGrid.innerHTML = '';
            if (livetvEmpty) livetvEmpty.style.display = 'block';
        }
    } catch (error) {
        console.error('Error fetching matches:', error);
        livetvGrid.innerHTML = '';
        if (livetvEmpty) {
            livetvEmpty.style.display = 'block';
            const emptyP = livetvEmpty.querySelector('p');
            if (emptyP) emptyP.textContent = 'Failed to load matches.';
        }
    }
}

function updateCategoryDropdown(categoryList) {
    const categorySelect = document.getElementById('livetv-category-select');
    if (!categorySelect) return;
    
    categorySelect.innerHTML = '<option value="all">All</option>';
    if (categoryList && categoryList.length > 0) {
        categoryList.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categorySelect.appendChild(option);
        });
    }
}

function displayMatches(source, category = 'all', searchTerm = '') {
    const livetvGrid = document.getElementById('livetv-grid');
    const livetvEmpty = document.getElementById('livetv-empty');
    
    if (!livetvGrid) return;
    
    livetvGrid.innerHTML = '';
    let filteredMatches = allMatches;

    if (category !== 'all') {
        filteredMatches = filteredMatches.filter(match => match.category.toLowerCase() === category.toLowerCase());
    }

    if (searchTerm) {
        filteredMatches = filteredMatches.filter(match => match.title.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    if (filteredMatches.length === 0) {
        if (livetvEmpty) livetvEmpty.style.display = 'block';
        return;
    }

    if (livetvEmpty) livetvEmpty.style.display = 'none';
    
    filteredMatches.forEach(match => {
        const card = document.createElement('div');
        card.className = 'livetv-match-card';
        
        const poster = match.poster ? `<img src="https://ntvstream.cx${match.poster}" class="livetv-poster" alt="${match.title}">` : '<div class="livetv-poster-placeholder"><i class="fas fa-futbol"></i></div>';

        card.innerHTML = `
            ${poster}
            <div class="livetv-match-info">
                <h4 class="livetv-match-title">${match.title}</h4>
                <span class="livetv-match-category">${match.category}</span>
                <button class="livetv-watch-btn">Watch Streams</button>
            </div>
        `;
        livetvGrid.appendChild(card);

        card.querySelector('.livetv-watch-btn').addEventListener('click', () => {
            showStreamsModal(match, source);
        });
    });
}

function getStreamUrl(source, stream) {
    if (source === 'kobra') {
        return `https://embedsports.top/embed/${stream.source}/${stream.id}/1`;
    }
    return stream.url;
}

function showStreamsModal(match, source) {
    // TITAN PROVIDER LOGIC
    if (source === 'titan') {
        console.log('[LiveTV] Titan provider detected. Resolving stream for match ID:', match.id);

        const modal = document.getElementById('livetv-streams-modal');
        const titleEl = document.getElementById('livetv-streams-title');
        const listEl = document.getElementById('livetv-streams-list');
        const closeBtn = document.getElementById('livetv-streams-close');
        
        if (!modal || !titleEl || !listEl) return;
        
        titleEl.textContent = match.title;
        listEl.innerHTML = '<div class="livetv-loading"><i class="fas fa-spinner"></i><p>Resolving Titan Stream...</p></div>';
        modal.style.display = 'flex';

        const closeModal = () => modal.style.display = 'none';
        if (closeBtn) closeBtn.onclick = closeModal;
        modal.onclick = (e) => {
            if (e.target === modal) closeModal();
        };

        fetch(`/api/titan/stream/${match.id}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Server responded with status ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                const streamUrl = data.streamUrl;
                if (streamUrl) {
                    modal.style.display = 'none';
                    playStreamInViewer(streamUrl);
                } else {
                    throw new Error("Stream URL not found in backend response.");
                }
            })
            .catch(error => {
                console.error('[LiveTV] Error fetching Titan stream:', error);
                listEl.innerHTML = '<div class="livetv-empty"><p>Failed to resolve Titan stream. Please try again.</p></div>';
            });

        return;
    }
    
    // PHOENIX PROVIDER LOGIC
    if (source === 'phoenix') {
        console.log('[LiveTV] Phoenix provider detected. Resolving stream for match ID:', match.id);

        const modal = document.getElementById('livetv-streams-modal');
        const titleEl = document.getElementById('livetv-streams-title');
        const listEl = document.getElementById('livetv-streams-list');
        const closeBtn = document.getElementById('livetv-streams-close');
        
        if (!modal || !titleEl || !listEl) return;
        
        titleEl.textContent = match.title;
        listEl.innerHTML = '<div class="livetv-loading"><i class="fas fa-spinner"></i><p>Resolving Phoenix Stream...</p></div>';
        modal.style.display = 'flex';

        const closeModal = () => modal.style.display = 'none';
        if (closeBtn) closeBtn.onclick = closeModal;
        modal.onclick = (e) => {
            if (e.target === modal) closeModal();
        };

        fetch(`/api/phoenix/stream/${match.id}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Server responded with status ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                const streamUrl = data.streamUrl;
                if (streamUrl) {
                    modal.style.display = 'none';
                    playStreamInViewer(streamUrl);
                } else {
                    throw new Error("Stream URL not found in backend response.");
                }
            })
            .catch(error => {
                console.error('[LiveTV] Error fetching Phoenix stream:', error);
                listEl.innerHTML = '<div class="livetv-empty"><p>Failed to resolve Phoenix stream. Please try again.</p></div>';
            });

        return;
    }

    // DEFAULT LOGIC FOR OTHER PROVIDERS (Kobra, Raptor, etc.)
    const modal = document.getElementById('livetv-streams-modal');
    const titleEl = document.getElementById('livetv-streams-title');
    const listEl = document.getElementById('livetv-streams-list');
    const closeBtn = document.getElementById('livetv-streams-close');

    if (!modal || !titleEl || !listEl) return;

    titleEl.textContent = match.title;
    listEl.innerHTML = '';

    if (match.sources && match.sources.length > 0) {
        match.sources.forEach(stream => {
            const streamItem = document.createElement('div');
            streamItem.className = 'livetv-stream-item';
            const streamUrl = getStreamUrl(source, stream);
            streamItem.innerHTML = `
                <div class="livetv-stream-info">
                    <span class="livetv-stream-source">${stream.channelName || stream.source}</span>
                </div>
                <div class="livetv-stream-actions">
                    <button class="livetv-play-stream-btn" data-url="${streamUrl}"><i class="fas fa-play"></i> Play</button>
                    <button class="livetv-copy-link-btn" data-url="${streamUrl}"><i class="fas fa-copy"></i> Copy Link</button>
                </div>
            `;
            listEl.appendChild(streamItem);
        });
    } else {
        listEl.innerHTML = '<p>No streams available for this match.</p>';
    }

    modal.style.display = 'flex';

    listEl.querySelectorAll('.livetv-play-stream-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const streamUrl = btn.getAttribute('data-url');
            if (streamUrl) {
                modal.style.display = 'none';
                playStreamInViewer(streamUrl);
            }
        });
    });

    listEl.querySelectorAll('.livetv-copy-link-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const url = btn.getAttribute('data-url');
            navigator.clipboard.writeText(url).then(() => {
                if (typeof showNotification === 'function') {
                    showNotification('Stream link copied to clipboard!', 'success');
                }
            });
        });
    });

    if (closeBtn) {
        closeBtn.onclick = () => {
            modal.style.display = 'none';
        };
    }
}

function playStreamInViewer(streamUrl) {
    const existingViewer = document.getElementById('livetv-stream-viewer');
    if (existingViewer) {
        existingViewer.remove();
    }
    
    const viewer = document.createElement('div');
    viewer.id = 'livetv-stream-viewer';
    viewer.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: #000; z-index: 99999; display: flex; flex-direction: column;';
    
    viewer.innerHTML = `
        <div style="position: absolute; top: 1rem; left: 1rem; z-index: 100000;">
            <button id="livetv-back-btn" style="
                background: linear-gradient(135deg, #ef4444, #dc2626);
                color: #fff;
                border: none;
                padding: 0.75rem 1.5rem;
                border-radius: 8px;
                font-weight: 700;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                box-shadow: 0 4px 12px rgba(0,0,0,0.5);
                transition: all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            " onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 6px 16px rgba(239,68,68,0.6)';" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.5)';">
                <i class="fas fa-arrow-left"></i> Back
            </button>
        </div>
        <iframe 
            src="${streamUrl}" 
            style="width: 100%; height: 100%; border: none;"
            frameborder="0"
            scrolling="no"
            allowfullscreen="true"
            webkitallowfullscreen="true"
            mozallowfullscreen="true"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerpolicy="origin"
        ></iframe>
    `;
    
    document.body.appendChild(viewer);
    
    const backBtn = document.getElementById('livetv-back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            viewer.remove();
            console.log('[LiveTV] Stream viewer closed');
        });
    }
    
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            viewer.remove();
            document.removeEventListener('keydown', escHandler);
            console.log('[LiveTV] Stream viewer closed via ESC');
        }
    };
    document.addEventListener('keydown', escHandler);
}

window.initLiveTv = initLiveTv;
window.fetchMatches = fetchMatches;
window.displayMatches = displayMatches;
window.showStreamsModal = showStreamsModal;
window.playStreamInViewer = playStreamInViewer;
window.liveTvCategories = liveTvCategories;

console.log('[LiveTV] Module loaded');
