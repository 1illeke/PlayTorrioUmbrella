// AudioBooks Module - Complete Rewrite
console.log('[AudioBooks] Loading module...');

(function() {
    'use strict';
    
    const API_BASE = window.API_BASE_URL || 'http://localhost:6987/api';
    
    let initialized = false;
    let isSearchMode = false;
    let currentPage = 1;
    let currentBook = null;
    let chapters = [];
    let chapterIndex = 0;
    let streamUrl = null;
    
    // Initialize when called
    function init() {
        console.log('[AudioBooks] init() called, initialized:', initialized);
        if (initialized) return;
        initialized = true;
        
        setupEventListeners();
        loadAllBooks();
    }
    
    function setupEventListeners() {
        console.log('[AudioBooks] Setting up event listeners...');
        
        // Search button
        const searchBtn = document.getElementById('searchAudioBooksBtn');
        if (searchBtn) {
            searchBtn.onclick = function() {
                const input = document.getElementById('audiobookSearchInput');
                const query = input ? input.value.trim() : '';
                console.log('[AudioBooks] Search clicked, query:', query);
                if (query) searchBooks(query);
            };
        }
        
        // Search input enter key
        const searchInput = document.getElementById('audiobookSearchInput');
        if (searchInput) {
            searchInput.onkeypress = function(e) {
                if (e.key === 'Enter') {
                    const query = searchInput.value.trim();
                    console.log('[AudioBooks] Enter pressed, query:', query);
                    if (query) searchBooks(query);
                }
            };
        }
        
        // Clear/Back button
        const clearBtn = document.getElementById('clearAudioBookSearchBtn');
        if (clearBtn) {
            clearBtn.onclick = function() {
                const input = document.getElementById('audiobookSearchInput');
                if (input) input.value = '';
                clearBtn.style.display = 'none';
                isSearchMode = false;
                currentPage = 1;
                loadAllBooks();
            };
        }
        
        // Back to books from chapters
        const backBtn = document.getElementById('audiobooksBackToBooks');
        if (backBtn) {
            backBtn.onclick = function() {
                document.getElementById('audiobooks-books-view').style.display = 'block';
                document.getElementById('audiobooks-chapters-view').style.display = 'none';
            };
        }
        
        // Load more button
        const loadMoreBtn = document.getElementById('audiobookLoadMoreBtn');
        if (loadMoreBtn) {
            loadMoreBtn.onclick = function() {
                loadMore();
            };
        }
        
        // Player controls
        setupPlayerControls();
        
        console.log('[AudioBooks] Event listeners set up');
    }
    
    function setupPlayerControls() {
        const audio = document.getElementById('audiobooksAudioElement');
        const playPauseBtn = document.getElementById('audiobooksPlayPauseBtn');
        const prevBtn = document.getElementById('audiobooksPrevBtn');
        const nextBtn = document.getElementById('audiobooksNextBtn');
        const closeBtn = document.getElementById('audiobooksClosePlayer');
        const progressBar = document.getElementById('audiobooksProgressBar');
        const volumeSlider = document.getElementById('audiobooksVolumeSlider');
        const speedSelect = document.getElementById('audiobooksPlaybackSpeed');
        
        if (playPauseBtn && audio) {
            playPauseBtn.onclick = function() {
                if (audio.paused) {
                    audio.play();
                    playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
                } else {
                    audio.pause();
                    playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
                }
            };
        }
        
        if (prevBtn) {
            prevBtn.onclick = function() {
                if (chapterIndex > 0) playChapter(chapterIndex - 1);
            };
        }
        
        if (nextBtn) {
            nextBtn.onclick = function() {
                if (chapterIndex < chapters.length - 1) playChapter(chapterIndex + 1);
            };
        }
        
        if (closeBtn && audio) {
            closeBtn.onclick = function() {
                audio.pause();
                audio.src = '';
                document.getElementById('audiobooksPlayer').style.display = 'none';
            };
        }
        
        if (progressBar && audio) {
            progressBar.onclick = function(e) {
                const rect = progressBar.getBoundingClientRect();
                const pct = (e.clientX - rect.left) / rect.width;
                audio.currentTime = pct * audio.duration;
            };
        }
        
        if (audio) {
            audio.ontimeupdate = function() {
                const pct = (audio.currentTime / audio.duration) * 100;
                const filled = document.getElementById('audiobooksProgressFilled');
                const timeEl = document.getElementById('audiobooksCurrentTime');
                if (filled) filled.style.width = pct + '%';
                if (timeEl) timeEl.textContent = formatTime(audio.currentTime);
            };
            
            audio.onloadedmetadata = function() {
                const durEl = document.getElementById('audiobooksDuration');
                if (durEl) durEl.textContent = formatTime(audio.duration);
            };
            
            audio.onended = function() {
                if (chapterIndex < chapters.length - 1) {
                    playChapter(chapterIndex + 1);
                } else {
                    playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
                }
            };
        }
        
        if (volumeSlider && audio) {
            volumeSlider.oninput = function() {
                audio.volume = volumeSlider.value / 100;
            };
        }
        
        if (speedSelect && audio) {
            speedSelect.onchange = function() {
                audio.playbackRate = parseFloat(speedSelect.value);
            };
        }
    }
    
    async function loadAllBooks() {
        console.log('[AudioBooks] loadAllBooks() called');
        const container = document.getElementById('audiobookSearchResults');
        const loading = document.getElementById('audiobookLoading');
        const loadMoreContainer = document.getElementById('audiobookLoadMoreContainer');
        
        if (container) container.innerHTML = '';
        if (loading) loading.style.display = 'block';
        
        try {
            const url = `${API_BASE}/audiobooks/all`;
            console.log('[AudioBooks] Fetching:', url);
            
            const res = await fetch(url);
            const data = await res.json();
            
            console.log('[AudioBooks] Got response:', data.success, 'count:', data.data?.length);
            
            if (loading) loading.style.display = 'none';
            
            if (data.success && data.data && data.data.length > 0) {
                const filtered = data.data.filter(b => {
                    const t = (b.title || '').toLowerCase();
                    return !t.includes('1001 nights') && !t.includes('the fox and the wolf');
                });
                renderBooks(filtered);
                if (loadMoreContainer) loadMoreContainer.style.display = 'block';
            } else {
                if (container) {
                    container.innerHTML = '<div class="search-placeholder"><i class="fas fa-exclamation-circle" style="font-size:3rem;color:#e74c3c;margin-bottom:1rem;"></i><h3>No AudioBooks Found</h3></div>';
                }
            }
        } catch (err) {
            console.error('[AudioBooks] Error:', err);
            if (loading) loading.style.display = 'none';
            if (container) {
                container.innerHTML = '<div class="search-placeholder"><i class="fas fa-exclamation-circle" style="font-size:3rem;color:#e74c3c;margin-bottom:1rem;"></i><h3>Error Loading</h3><p>' + err.message + '</p></div>';
            }
        }
    }

    
    async function searchBooks(query) {
        console.log('[AudioBooks] searchBooks() called with:', query);
        const container = document.getElementById('audiobookSearchResults');
        const loading = document.getElementById('audiobookLoading');
        const clearBtn = document.getElementById('clearAudioBookSearchBtn');
        const loadMoreContainer = document.getElementById('audiobookLoadMoreContainer');
        
        if (container) container.innerHTML = '';
        if (loading) loading.style.display = 'block';
        if (loadMoreContainer) loadMoreContainer.style.display = 'none';
        
        isSearchMode = true;
        
        try {
            const url = `${API_BASE}/audiobooks/search?q=${encodeURIComponent(query)}`;
            console.log('[AudioBooks] Searching:', url);
            
            const res = await fetch(url);
            const data = await res.json();
            
            console.log('[AudioBooks] Search response:', data.success, 'count:', data.data?.length);
            
            if (loading) loading.style.display = 'none';
            if (clearBtn) clearBtn.style.display = 'inline-block';
            
            if (data.success && data.data && data.data.length > 0) {
                renderBooks(data.data);
            } else {
                if (container) {
                    container.innerHTML = '<div class="search-placeholder"><i class="fas fa-search" style="font-size:3rem;color:#8b5cf6;margin-bottom:1rem;"></i><h3>No Results Found</h3><p>Try a different search term</p></div>';
                }
            }
        } catch (err) {
            console.error('[AudioBooks] Search error:', err);
            if (loading) loading.style.display = 'none';
            if (container) {
                container.innerHTML = '<div class="search-placeholder"><i class="fas fa-exclamation-circle" style="font-size:3rem;color:#e74c3c;margin-bottom:1rem;"></i><h3>Search Error</h3><p>' + err.message + '</p></div>';
            }
        }
    }
    
    async function loadMore() {
        if (isSearchMode) return;
        
        currentPage++;
        const loadMoreBtn = document.getElementById('audiobookLoadMoreBtn');
        if (loadMoreBtn) {
            loadMoreBtn.disabled = true;
            loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
        }
        
        try {
            const url = `${API_BASE}/audiobooks/more/${currentPage}`;
            const res = await fetch(url);
            const data = await res.json();
            
            if (loadMoreBtn) {
                loadMoreBtn.disabled = false;
                loadMoreBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Load More';
            }
            
            if (data.success && data.data && data.data.length > 0) {
                const filtered = data.data.filter(b => {
                    const t = (b.title || '').toLowerCase();
                    return !t.includes('1001 nights') && !t.includes('the fox and the wolf');
                });
                renderBooks(filtered, true);
            } else {
                document.getElementById('audiobookLoadMoreContainer').style.display = 'none';
            }
        } catch (err) {
            console.error('[AudioBooks] Load more error:', err);
            if (loadMoreBtn) {
                loadMoreBtn.disabled = false;
                loadMoreBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Load More';
            }
        }
    }
    
    function renderBooks(books, append) {
        const container = document.getElementById('audiobookSearchResults');
        if (!container) return;
        
        if (!append) container.innerHTML = '';
        
        books.forEach(book => {
            const card = document.createElement('div');
            card.className = 'book-card';
            card.style.cursor = 'pointer';
            
            const imgSrc = book.image || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="280"%3E%3Crect fill="%23333" width="200" height="280"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-size="14"%3ENo Cover%3C/text%3E%3C/svg%3E';
            
            card.innerHTML = `
                <div class="book-cover-container">
                    <img src="${imgSrc}" alt="${book.title}" class="book-cover" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22280%22%3E%3Crect fill=%22%23333%22 width=%22200%22 height=%22280%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22 font-size=%2214%22%3ENo Cover%3C/text%3E%3C/svg%3E'">
                    <div class="playtorrio-logo">PlayTorrio</div>
                </div>
                <div class="book-info">
                    <h3 class="book-title">${book.title}</h3>
                </div>
            `;
            
            card.onclick = function() {
                openChapters(book);
            };
            
            container.appendChild(card);
        });
    }
    
    async function openChapters(book) {
        console.log('[AudioBooks] openChapters() called for:', book.title);
        currentBook = book;
        
        document.getElementById('audiobooks-books-view').style.display = 'none';
        document.getElementById('audiobooks-chapters-view').style.display = 'block';
        
        const titleEl = document.getElementById('audiobooksChapterBookTitle');
        if (titleEl) titleEl.innerHTML = '<i class="fas fa-headphones"></i> <span>' + book.title + '</span>';
        
        const listEl = document.getElementById('audiobooksChaptersList');
        const loadingEl = document.getElementById('audiobooksChapterLoading');
        
        if (listEl) listEl.innerHTML = '';
        if (loadingEl) loadingEl.style.display = 'block';
        
        try {
            const url = `${API_BASE}/audiobooks/chapters/${book.post_name}`;
            console.log('[AudioBooks] Fetching chapters:', url);
            
            const res = await fetch(url);
            const data = await res.json();
            
            console.log('[AudioBooks] Chapters response:', data.success, 'count:', data.data?.length);
            
            if (loadingEl) loadingEl.style.display = 'none';
            
            if (data.success && data.data && data.data.length > 0) {
                chapters = data.data.filter(ch => !(ch.name === 'welcome' && ch.chapter_id === '0'));
                renderChapters();
            } else {
                if (listEl) {
                    listEl.innerHTML = '<div style="text-align:center;padding:2rem;color:#666;"><i class="fas fa-exclamation-circle" style="font-size:2rem;margin-bottom:1rem;"></i><p>No chapters found</p></div>';
                }
            }
        } catch (err) {
            console.error('[AudioBooks] Chapters error:', err);
            if (loadingEl) loadingEl.style.display = 'none';
            if (listEl) {
                listEl.innerHTML = '<div style="text-align:center;padding:2rem;color:#e74c3c;"><i class="fas fa-exclamation-circle" style="font-size:2rem;margin-bottom:1rem;"></i><p>Error: ' + err.message + '</p></div>';
            }
        }
    }

    
    function renderChapters() {
        const listEl = document.getElementById('audiobooksChaptersList');
        if (!listEl) return;
        
        listEl.innerHTML = '';
        
        chapters.forEach((ch, idx) => {
            const div = document.createElement('div');
            div.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:15px;background:rgba(139,92,246,0.1);border-radius:10px;border:1px solid rgba(139,92,246,0.2);margin-bottom:10px;transition:all 0.3s;';
            
            div.innerHTML = `
                <div style="display:flex;align-items:center;gap:15px;">
                    <span style="width:35px;height:35px;border-radius:50%;background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:white;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:14px;">${ch.track || idx + 1}</span>
                    <div>
                        <p style="font-weight:600;color:var(--text-primary,#fff);margin:0;">${ch.name || 'Chapter ' + (ch.track || idx + 1)}</p>
                        <p style="font-size:12px;color:var(--gray,#888);margin:4px 0 0 0;">${ch.duration || 'Unknown duration'}</p>
                    </div>
                </div>
                <div style="display:flex;gap:10px;">
                    <button class="listen-btn" style="padding:8px 16px;background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:13px;display:flex;align-items:center;gap:6px;">
                        <i class="fas fa-play"></i> Listen
                    </button>
                    <button class="download-btn" style="padding:8px 16px;background:rgba(139,92,246,0.2);color:#8b5cf6;border:1px solid rgba(139,92,246,0.3);border-radius:8px;cursor:pointer;font-weight:600;font-size:13px;display:flex;align-items:center;gap:6px;">
                        <i class="fas fa-download"></i> Download
                    </button>
                </div>
            `;
            
            div.onmouseenter = function() {
                div.style.background = 'rgba(139,92,246,0.2)';
                div.style.borderColor = 'rgba(139,92,246,0.4)';
            };
            div.onmouseleave = function() {
                div.style.background = 'rgba(139,92,246,0.1)';
                div.style.borderColor = 'rgba(139,92,246,0.2)';
            };
            
            div.querySelector('.listen-btn').onclick = function(e) {
                e.stopPropagation();
                playChapter(idx);
            };
            
            div.querySelector('.download-btn').onclick = function(e) {
                e.stopPropagation();
                downloadChapter(ch, idx);
            };
            
            listEl.appendChild(div);
        });
    }
    
    async function playChapter(idx) {
        console.log('[AudioBooks] playChapter() called, index:', idx);
        if (idx < 0 || idx >= chapters.length) return;
        
        chapterIndex = idx;
        const ch = chapters[idx];
        
        const player = document.getElementById('audiobooksPlayer');
        const titleEl = document.getElementById('audiobooksPlayerTitle');
        const chapterEl = document.getElementById('audiobooksPlayerChapter');
        const audio = document.getElementById('audiobooksAudioElement');
        const playPauseBtn = document.getElementById('audiobooksPlayPauseBtn');
        const progressFilled = document.getElementById('audiobooksProgressFilled');
        const currentTimeEl = document.getElementById('audiobooksCurrentTime');
        const durationEl = document.getElementById('audiobooksDuration');
        
        if (player) player.style.display = 'block';
        if (titleEl) titleEl.textContent = currentBook?.title || 'Audiobook';
        if (chapterEl) chapterEl.textContent = ch.name || 'Chapter ' + (ch.track || idx + 1);
        if (progressFilled) progressFilled.style.width = '0%';
        if (currentTimeEl) currentTimeEl.textContent = '0:00';
        if (durationEl) durationEl.textContent = '0:00';
        if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        
        try {
            const url = `${API_BASE}/audiobooks/stream`;
            console.log('[AudioBooks] Getting stream for chapter:', ch.chapter_id);
            
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chapterId: ch.chapter_id, serverType: 1 })
            });
            const data = await res.json();
            
            console.log('[AudioBooks] Stream response:', data.success);
            
            if (data.success && data.data && data.data.link_mp3) {
                streamUrl = data.data.link_mp3;
                
                if (audio) {
                    audio.src = streamUrl;
                    audio.load();
                    
                    audio.oncanplay = function() {
                        audio.play();
                        if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
                    };
                }
            } else {
                if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
                alert('Failed to get audio stream');
            }
        } catch (err) {
            console.error('[AudioBooks] Play error:', err);
            if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
            alert('Error: ' + err.message);
        }
    }
    
    async function downloadChapter(ch, idx) {
        console.log('[AudioBooks] downloadChapter() called');
        const btns = document.querySelectorAll('.download-btn');
        const btn = btns[idx];
        
        if (btn) {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            btn.disabled = true;
        }
        
        try {
            const url = `${API_BASE}/audiobooks/stream`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chapterId: ch.chapter_id, serverType: 1 })
            });
            const data = await res.json();
            
            if (data.success && data.data && data.data.link_mp3) {
                // Open in browser for download
                if (window.electronAPI && window.electronAPI.openExternal) {
                    window.electronAPI.openExternal(data.data.link_mp3);
                } else {
                    window.open(data.data.link_mp3, '_blank');
                }
                
                if (typeof showNotification === 'function') {
                    showNotification('Download started in browser', 'success');
                }
            } else {
                alert('Failed to get download link');
            }
        } catch (err) {
            console.error('[AudioBooks] Download error:', err);
            alert('Error: ' + err.message);
        } finally {
            if (btn) {
                btn.innerHTML = '<i class="fas fa-download"></i> Download';
                btn.disabled = false;
            }
        }
    }
    
    function formatTime(sec) {
        if (!isFinite(sec)) return '0:00';
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = Math.floor(sec % 60);
        if (h > 0) return h + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
        return m + ':' + String(s).padStart(2, '0');
    }
    
    // Export to window
    window.initializeAudioBooks = init;
    window.loadInitialAudioBooks = loadAllBooks;
    window.searchAudioBooks = searchBooks;
    window.openAudioBookChapters = openChapters;
    window.playAudioBookChapter = playChapter;
    
    console.log('[AudioBooks] Module loaded and exported');
})();
