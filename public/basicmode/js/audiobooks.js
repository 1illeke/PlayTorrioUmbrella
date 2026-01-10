// Basic Mode Audiobooks Logic

const AUDIOBOOKS_API = window.location.origin;

let audiobooksInitialized = false;
let currentPage = 1;
let isSearchMode = false;
let currentAudiobook = null;
let currentChapter = null;
let currentStreamUrl = null;

// DOM Elements
let audiobooksGrid, audiobooksLoading, audiobooksEmpty, audiobooksLoadMore, audiobooksLoadMoreBtn;
let audiobooksSearchInput, audiobooksSearchBtn;
let chaptersModal, chaptersModalClose, chaptersModalTitle, chaptersModalCount, chaptersModalCover, chaptersList;
let playerModal, playerClose, playerCover, playerTitle, playerChapter;
let playerProgressBar, playerProgress, playerProgressHandle, playerCurrentTime, playerDuration;
let playerPlayPause, playerPlayIcon, playerPauseIcon, playerRewind, playerForward;
let playerSpeed, playerDownload, audioElement;

const syncAudiobooksElements = () => {
    audiobooksGrid = document.getElementById('audiobooks-grid');
    audiobooksLoading = document.getElementById('audiobooks-loading');
    audiobooksEmpty = document.getElementById('audiobooks-empty');
    audiobooksLoadMore = document.getElementById('audiobooks-load-more');
    audiobooksLoadMoreBtn = document.getElementById('audiobooks-load-more-btn');
    audiobooksSearchInput = document.getElementById('audiobooks-search-input');
    audiobooksSearchBtn = document.getElementById('audiobooks-search-btn');
    
    chaptersModal = document.getElementById('audiobook-chapters-modal');
    chaptersModalClose = document.getElementById('audiobook-modal-close');
    chaptersModalTitle = document.getElementById('audiobook-modal-title');
    chaptersModalCount = document.getElementById('audiobook-modal-count');
    chaptersModalCover = document.getElementById('audiobook-modal-cover');
    chaptersList = document.getElementById('audiobook-chapters-list');
    
    playerModal = document.getElementById('audiobook-player-modal');
    playerClose = document.getElementById('player-close');
    playerCover = document.getElementById('player-cover');
    playerTitle = document.getElementById('player-title');
    playerChapter = document.getElementById('player-chapter');
    playerProgressBar = document.getElementById('player-progress-bar');
    playerProgress = document.getElementById('player-progress');
    playerProgressHandle = document.getElementById('player-progress-handle');
    playerCurrentTime = document.getElementById('player-current-time');
    playerDuration = document.getElementById('player-duration');
    playerPlayPause = document.getElementById('player-play-pause');
    playerPlayIcon = document.getElementById('player-play-icon');
    playerPauseIcon = document.getElementById('player-pause-icon');
    playerRewind = document.getElementById('player-rewind');
    playerForward = document.getElementById('player-forward');
    playerSpeed = document.getElementById('player-speed');
    playerDownload = document.getElementById('player-download');
    audioElement = document.getElementById('audiobook-audio');
};

// Fetch all audiobooks
const fetchAllAudiobooks = async () => {
    try {
        const res = await fetch(`${AUDIOBOOKS_API}/api/audiobooks/all`);
        const data = await res.json();
        if (data.success) return data.data || [];
        return [];
    } catch (e) {
        console.error('[Audiobooks] Fetch all failed:', e);
        return [];
    }
};

// Fetch more audiobooks (pagination)
const fetchMoreAudiobooks = async (page) => {
    try {
        const res = await fetch(`${AUDIOBOOKS_API}/api/audiobooks/more/${page}`);
        const data = await res.json();
        if (data.success) return data.data || [];
        return [];
    } catch (e) {
        console.error('[Audiobooks] Fetch more failed:', e);
        return [];
    }
};

// Search audiobooks
const searchAudiobooks = async (query) => {
    try {
        const res = await fetch(`${AUDIOBOOKS_API}/api/audiobooks/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.success) return data.data || [];
        return [];
    } catch (e) {
        console.error('[Audiobooks] Search failed:', e);
        return [];
    }
};

// Fetch chapters for an audiobook
const fetchChapters = async (postName) => {
    try {
        const res = await fetch(`${AUDIOBOOKS_API}/api/audiobooks/chapters/${postName}`);
        const data = await res.json();
        if (data.success) return data.data || [];
        return [];
    } catch (e) {
        console.error('[Audiobooks] Fetch chapters failed:', e);
        return [];
    }
};

// Get stream URL for a chapter
const getStreamUrl = async (chapterId, serverType = 1) => {
    try {
        const res = await fetch(`${AUDIOBOOKS_API}/api/audiobooks/stream`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chapterId, serverType })
        });
        const data = await res.json();
        if (data.success && data.data) return data.data;
        return null;
    } catch (e) {
        console.error('[Audiobooks] Get stream failed:', e);
        return null;
    }
};

// Format duration
const formatDuration = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Create audiobook card
const createAudiobookCard = (audiobook) => {
    const card = document.createElement('div');
    card.className = 'group relative bg-gray-800/50 rounded-xl overflow-hidden border border-gray-700/50 hover:border-orange-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/10 cursor-pointer';
    
    card.innerHTML = `
        <div class="aspect-square relative overflow-hidden bg-gray-900">
            <img src="${audiobook.image || ''}" alt="${audiobook.title}" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%231f2937%22 width=%22100%22 height=%22100%22/><text x=%2250%22 y=%2255%22 text-anchor=%22middle%22 fill=%22%236b7280%22 font-size=%2210%22>No Cover</text></svg>'">
            
            <!-- PlayTorrio Audiobooks Badge - Bottom Right ~30% -->
            <div class="absolute bottom-0 right-0 w-[60%] h-[55%] pointer-events-none overflow-hidden">
                <div class="absolute inset-0 bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 rounded-tl-2xl shadow-lg flex flex-col items-center justify-center">
                    <div class="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.1),transparent_50%)]"></div>
                    <div class="relative flex flex-col items-center">
                        <div class="w-7 h-7 mb-1.5 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm">
                            <svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
                            </svg>
                        </div>
                        <span class="text-white text-[10px] font-bold tracking-wide">PlayTorrio</span>
                        <span class="text-purple-200 text-[8px] font-semibold uppercase tracking-wider mt-0.5">Audiobooks</span>
                    </div>
                </div>
            </div>
            
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                <span class="px-3 py-1.5 bg-orange-500 rounded-full text-xs font-bold text-white flex items-center gap-1">
                    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    Listen
                </span>
            </div>
        </div>
        <div class="p-3">
            <h3 class="text-sm font-semibold text-white line-clamp-2" title="${audiobook.title}">${audiobook.title}</h3>
        </div>
    `;
    
    card.addEventListener('click', () => openChaptersModal(audiobook));
    
    return card;
};

// Audiobooks to filter out
const FILTERED_AUDIOBOOKS = [
    '1001 nights',
    'the fox and the wolf'
];

const shouldFilterAudiobook = (audiobook) => {
    const title = (audiobook.title || '').toLowerCase();
    return FILTERED_AUDIOBOOKS.some(filter => title.includes(filter.toLowerCase()));
};

// Render audiobooks
const renderAudiobooks = (audiobooks, append = false) => {
    if (!audiobooksGrid) return;
    
    if (!append) {
        audiobooksGrid.innerHTML = '';
    }
    
    audiobooksEmpty?.classList.add('hidden');
    
    // Filter out unwanted audiobooks
    const filteredAudiobooks = audiobooks.filter(ab => !shouldFilterAudiobook(ab));
    
    if (filteredAudiobooks.length === 0 && !append) {
        audiobooksEmpty?.classList.remove('hidden');
        audiobooksLoadMore?.classList.add('hidden');
        return;
    }
    
    filteredAudiobooks.forEach(audiobook => {
        audiobooksGrid.appendChild(createAudiobookCard(audiobook));
    });
    
    // Show/hide load more button
    if (!isSearchMode && filteredAudiobooks.length > 0) {
        audiobooksLoadMore?.classList.remove('hidden');
    } else {
        audiobooksLoadMore?.classList.add('hidden');
    }
};

// Open chapters modal
const openChaptersModal = async (audiobook) => {
    currentAudiobook = audiobook;
    
    chaptersModalTitle.textContent = audiobook.title;
    chaptersModalCover.src = audiobook.image || '';
    chaptersModalCount.textContent = 'Loading chapters...';
    chaptersList.innerHTML = '<div class="flex justify-center py-8"><div class="w-8 h-8 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin"></div></div>';
    
    chaptersModal.classList.remove('hidden');
    
    const chapters = await fetchChapters(audiobook.post_name);
    
    if (chapters.length === 0) {
        chaptersModalCount.textContent = 'No chapters found';
        chaptersList.innerHTML = '<p class="text-center text-gray-400 py-8">No chapters available</p>';
        return;
    }
    
    chaptersModalCount.textContent = `${chapters.length} chapter${chapters.length > 1 ? 's' : ''}`;
    chaptersList.innerHTML = '';
    
    chapters.forEach((chapter, index) => {
        // Skip welcome track
        if (chapter.name === 'welcome' && chapter.chapter_id === '0') return;
        
        const chapterEl = document.createElement('div');
        chapterEl.className = 'flex items-center justify-between p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors';
        
        chapterEl.innerHTML = `
            <div class="flex items-center gap-3">
                <span class="w-8 h-8 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-sm font-bold">${chapter.track || index + 1}</span>
                <div>
                    <p class="text-white font-medium">${chapter.name || `Chapter ${chapter.track || index + 1}`}</p>
                    <p class="text-xs text-gray-400">${chapter.duration || 'Unknown duration'}</p>
                </div>
            </div>
            <button class="listen-btn px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                Listen
            </button>
        `;
        
        chapterEl.querySelector('.listen-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            playChapter(chapter);
        });
        
        chaptersList.appendChild(chapterEl);
    });
};

// Close chapters modal
const closeChaptersModal = () => {
    chaptersModal.classList.add('hidden');
    currentAudiobook = null;
};

// Play a chapter
const playChapter = async (chapter) => {
    currentChapter = chapter;
    
    // Show player modal
    playerModal.classList.remove('hidden');
    playerTitle.textContent = currentAudiobook?.title || 'Audiobook';
    playerChapter.textContent = chapter.name || `Chapter ${chapter.track}`;
    playerCover.src = currentAudiobook?.image || '';
    
    // Reset player state
    playerProgress.style.width = '0%';
    playerProgressHandle.style.left = '0%';
    playerCurrentTime.textContent = '0:00';
    playerDuration.textContent = '0:00';
    updatePlayPauseIcon(false);
    
    // Get stream URL
    const streamData = await getStreamUrl(chapter.chapter_id);
    if (!streamData || !streamData.link_mp3) {
        alert('Failed to get audio stream');
        return;
    }
    
    currentStreamUrl = streamData.link_mp3;
    
    // Load audio
    audioElement.src = currentStreamUrl;
    audioElement.load();
    
    // Play when ready
    audioElement.addEventListener('canplay', () => {
        audioElement.play();
        updatePlayPauseIcon(true);
    }, { once: true });
    
    // Update duration when metadata loaded
    audioElement.addEventListener('loadedmetadata', () => {
        playerDuration.textContent = formatDuration(audioElement.duration);
    }, { once: true });
};

// Update play/pause icon
const updatePlayPauseIcon = (isPlaying) => {
    if (isPlaying) {
        playerPlayIcon.classList.add('hidden');
        playerPauseIcon.classList.remove('hidden');
    } else {
        playerPlayIcon.classList.remove('hidden');
        playerPauseIcon.classList.add('hidden');
    }
};

// Close player
const closePlayer = () => {
    audioElement.pause();
    audioElement.src = '';
    playerModal.classList.add('hidden');
    currentChapter = null;
    currentStreamUrl = null;
};

// Handle search
const handleSearch = async () => {
    const query = audiobooksSearchInput?.value.trim();
    
    if (!query) {
        // Reset to home view
        isSearchMode = false;
        currentPage = 1;
        audiobooksLoading?.classList.remove('hidden');
        const audiobooks = await fetchAllAudiobooks();
        audiobooksLoading?.classList.add('hidden');
        renderAudiobooks(audiobooks);
        return;
    }
    
    isSearchMode = true;
    audiobooksGrid.innerHTML = '';
    audiobooksLoading?.classList.remove('hidden');
    audiobooksLoadMore?.classList.add('hidden');
    
    const results = await searchAudiobooks(query);
    
    audiobooksLoading?.classList.add('hidden');
    renderAudiobooks(results);
};

// Load more audiobooks
const loadMore = async () => {
    if (isSearchMode) return;
    
    currentPage++;
    audiobooksLoadMoreBtn.disabled = true;
    audiobooksLoadMoreBtn.innerHTML = '<div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Loading...';
    
    const moreAudiobooks = await fetchMoreAudiobooks(currentPage);
    
    audiobooksLoadMoreBtn.disabled = false;
    audiobooksLoadMoreBtn.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg> Load More';
    
    if (moreAudiobooks.length === 0) {
        audiobooksLoadMore?.classList.add('hidden');
        return;
    }
    
    renderAudiobooks(moreAudiobooks, true);
};

// Initialize player controls
const initPlayerControls = () => {
    // Play/Pause
    playerPlayPause?.addEventListener('click', () => {
        if (audioElement.paused) {
            audioElement.play();
            updatePlayPauseIcon(true);
        } else {
            audioElement.pause();
            updatePlayPauseIcon(false);
        }
    });
    
    // Rewind 10s
    playerRewind?.addEventListener('click', () => {
        audioElement.currentTime = Math.max(0, audioElement.currentTime - 10);
    });
    
    // Forward 10s
    playerForward?.addEventListener('click', () => {
        audioElement.currentTime = Math.min(audioElement.duration, audioElement.currentTime + 10);
    });
    
    // Speed control
    playerSpeed?.addEventListener('change', () => {
        audioElement.playbackRate = parseFloat(playerSpeed.value);
    });
    
    // Download
    playerDownload?.addEventListener('click', () => {
        if (currentStreamUrl) {
            if (window.electronAPI?.openExternal) {
                window.electronAPI.openExternal(currentStreamUrl);
            } else {
                window.open(currentStreamUrl, '_blank');
            }
        }
    });
    
    // Progress bar click
    playerProgressBar?.addEventListener('click', (e) => {
        const rect = playerProgressBar.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        audioElement.currentTime = percent * audioElement.duration;
    });
    
    // Time update
    audioElement?.addEventListener('timeupdate', () => {
        if (!audioElement.duration) return;
        const percent = (audioElement.currentTime / audioElement.duration) * 100;
        playerProgress.style.width = `${percent}%`;
        playerProgressHandle.style.left = `${percent}%`;
        playerCurrentTime.textContent = formatDuration(audioElement.currentTime);
    });
    
    // Audio ended
    audioElement?.addEventListener('ended', () => {
        updatePlayPauseIcon(false);
    });
    
    // Close player
    playerClose?.addEventListener('click', closePlayer);
};

// Initialize Audiobooks
export const initAudiobooks = async () => {
    syncAudiobooksElements();
    
    if (audiobooksInitialized) return;
    audiobooksInitialized = true;
    
    // Load initial audiobooks
    audiobooksLoading?.classList.remove('hidden');
    const audiobooks = await fetchAllAudiobooks();
    audiobooksLoading?.classList.add('hidden');
    renderAudiobooks(audiobooks);
    
    // Search handlers
    audiobooksSearchBtn?.addEventListener('click', handleSearch);
    audiobooksSearchInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    
    // Load more handler
    audiobooksLoadMoreBtn?.addEventListener('click', loadMore);
    
    // Chapters modal close
    chaptersModalClose?.addEventListener('click', closeChaptersModal);
    chaptersModal?.addEventListener('click', (e) => {
        if (e.target === chaptersModal) closeChaptersModal();
    });
    
    // Initialize player controls
    initPlayerControls();
};
