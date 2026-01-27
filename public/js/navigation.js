// Navigation Helper Functions
// Used by sidebar and other navigation elements

function showHomePage() {
    window.location.hash = '#/';
}

function showGenresPage() {
    window.location.hash = '#/genres';
}

function showCustomMagnetModal() {
    const modal = document.getElementById('custom-magnet-modal');
    const input = document.getElementById('custom-magnet-input');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
        modal.style.opacity = '1';
        modal.style.pointerEvents = 'auto';
        if (input) {
            input.value = '';
            setTimeout(() => input.focus(), 100);
        }
    }
}

function showMyListPage() {
    window.location.hash = '#/my-list';
}

function showDoneWatchingPage() {
    window.location.hash = '#/done-watching';
}

function showTraktPage() {
    window.location.hash = '#/trakt';
}

function showLiveTvPage() {
    window.location.hash = '#/livetv';
}

function showIptvPage() {
    window.location.hash = '#/iptv';
    try { updateIptvActionButton(); } catch(_) {}
}

function reloadIptvPage() {
    const iptvIframe = document.getElementById('iptv-iframe');
    const iptvSelector = document.getElementById('iptv-source-select');
    if (iptvIframe) {
        // Get current selected source URL
        const currentSrc = iptvSelector ? iptvSelector.value : 'https://iptvplaytorrio.pages.dev/';
        // Clear the src first to force a complete reload
        iptvIframe.src = 'about:blank';
        setTimeout(() => {
            iptvIframe.src = currentSrc;
        }, 100);
    }
}

function showBooksPage() {
    window.location.hash = '#/books';
}

function showAudioBooksPage() {
    window.location.hash = '#/audiobooks';
}

function showBookTorrioPage() {
    window.location.hash = '#/booktorrio';
}

function showAnimePage() {
    window.location.hash = '#/anime';
}

function showComicsPage() {
    window.location.hash = '#/comics';
}

function showMangaPage() {
    window.location.hash = '#/manga';
}

function showMusicPage() {
    window.location.hash = '#/music';
}

function showGamesDownloaderPage() {
    window.location.hash = '#/games-downloader';
}

function showMiniGamesPage() {
    window.location.hash = '#/minigames';
}

function showDownloaderPage() {
    window.location.hash = '#/downloader';
}

function showSettingsPage() {
    window.location.hash = '#/settings';
}


// ===== PAGE NAVIGATION FUNCTIONS =====

function showHomePage() {
    window.location.hash = '#/';
}

function showGenresPage() {
    window.location.hash = '#/genres';
}

function showCustomMagnetModal() {
    const modal = document.getElementById('custom-magnet-modal');
    const input = document.getElementById('custom-magnet-input');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
        modal.style.opacity = '1';
        modal.style.pointerEvents = 'auto';
        if (input) {
            input.value = '';
            setTimeout(() => input.focus(), 100);
        }
    }
}

function showMyListPage() {
    window.location.hash = '#/my-list';
}

function showDoneWatchingPage() {
    window.location.hash = '#/done-watching';
}

function showTraktPage() {
    window.location.hash = '#/trakt';
}

function showLiveTvPage() {
    window.location.hash = '#/livetv';
}

// Export functions
window.showHomePage = showHomePage;
window.showGenresPage = showGenresPage;
window.showCustomMagnetModal = showCustomMagnetModal;
window.showMyListPage = showMyListPage;
window.showDoneWatchingPage = showDoneWatchingPage;
window.showTraktPage = showTraktPage;
window.showLiveTvPage = showLiveTvPage;


// MiniGames page functions
function showMiniGamesPage() {
    window.location.hash = '#/minigames';
}

function reloadMiniGamesPage() {
    const miniGamesIframe = document.getElementById('minigames-iframe');
    if (miniGamesIframe) {
        miniGamesIframe.src = 'about:blank';
        setTimeout(() => {
            miniGamesIframe.src = 'https://playtorriogames.pages.dev/';
            setTimeout(() => {
                const miniGamesPageEl = document.getElementById('minigames-page');
                if (miniGamesPageEl) {
                    miniGamesIframe.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'start' 
                    });
                    console.log('[MINIGAMES] Auto-scrolled MiniGames page to show iframe');
                }
            }, 50);
        }, 100);
        console.log('[MINIGAMES] Page reloaded fresh');
    }
}

function clearMiniGamesPage() {
    const miniGamesIframe = document.getElementById('minigames-iframe');
    if (miniGamesIframe) {
        miniGamesIframe.src = 'about:blank';
        console.log('[MINIGAMES] Page cleared');
    }
}

function showBooksPage() {
    window.location.hash = '#/books';
}

function showMusicPage() {
    window.location.hash = '#/music';
}

// Export functions
window.showMiniGamesPage = showMiniGamesPage;
window.reloadMiniGamesPage = reloadMiniGamesPage;
window.clearMiniGamesPage = clearMiniGamesPage;
window.showBooksPage = showBooksPage;
window.showMusicPage = showMusicPage;
