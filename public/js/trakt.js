// ===== TRAKT INTEGRATION =====
// Trakt.tv integration for tracking watched content

// Helper to get API base URL
function getTraktApiUrl(endpoint) {
    const baseUrl = window.API_BASE_URL || 'http://localhost:6987/api';
    // Remove /api from baseUrl if endpoint already starts with /api
    if (endpoint.startsWith('/api/')) {
        const base = baseUrl.replace(/\/api$/, '');
        return base + endpoint;
    }
    // If endpoint starts with /, append to base without /api
    if (endpoint.startsWith('/')) {
        return baseUrl.replace(/\/api$/, '') + '/api' + endpoint.substring(1);
    }
    return baseUrl + '/' + endpoint;
}

// Trakt state
let traktWatchlistBtn = null;
let traktPageInitialized = false;
let traktDeviceCodeInterval = null;
let traktStats = null;
let traktImportedOnce = false;

// ===== TRAKT WATCHLIST BUTTON FUNCTIONS =====

async function setupTraktWatchlistButton() {
    if (!traktWatchlistBtn || !currentMovie) return;

    // Check if user is authenticated with Trakt
    try {
        const statusResponse = await fetch(getTraktApiUrl('trakt/status'));
        const statusData = await statusResponse.json();
        
        if (!statusData.authenticated) {
            traktWatchlistBtn.style.display = 'none';
            return;
        }

        traktWatchlistBtn.style.display = 'block';
        
        // Check if item is already in watchlist
        const title = currentMovie.title || currentMovie.name;
        const year = parseInt((currentMovie.release_date || currentMovie.first_air_date || '').substring(0, 4));
        
        // For now, assume it's not in watchlist - could check against API in the future
        updateWatchlistButton(false);
        
    } catch (error) {
        console.error('[TRAKT] Error setting up watchlist button:', error);
        traktWatchlistBtn.style.display = 'none';
    }
}

function updateWatchlistButton(isInWatchlist) {
    if (!traktWatchlistBtn) return;

    if (isInWatchlist) {
        traktWatchlistBtn.innerHTML = '<i class="fas fa-check"></i> In Watchlist';
        traktWatchlistBtn.classList.remove('btn-secondary');
        traktWatchlistBtn.classList.add('btn-success');
        traktWatchlistBtn.onclick = removeFromTraktWatchlist;
    } else {
        traktWatchlistBtn.innerHTML = '<i class="fas fa-plus"></i> Add to Watchlist';
        traktWatchlistBtn.classList.remove('btn-success');
        traktWatchlistBtn.classList.add('btn-secondary');
        traktWatchlistBtn.onclick = addToTraktWatchlist;
    }
}

async function addToTraktWatchlist() {
    if (!currentMovie) return;

    try {
        traktWatchlistBtn.disabled = true;
        traktWatchlistBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';

        const title = currentMovie.title || currentMovie.name;
        const year = parseInt((currentMovie.release_date || currentMovie.first_air_date || '').substring(0, 4));
        const type = currentMediaType === 'tv' ? 'show' : 'movie';

        const response = await fetch(getTraktApiUrl('trakt/watchlist/add'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, type, year })
        });

        const data = await response.json();
        
        if (data.success) {
            updateWatchlistButton(true);
            showNotification(`Added "${title}" to your Trakt watchlist!`, 'success');
        } else {
            throw new Error(data.error || 'Failed to add to watchlist');
        }
        
    } catch (error) {
        console.error('[TRAKT] Add to watchlist error:', error);
        showNotification('Failed to add to watchlist: ' + error.message, 'error');
        updateWatchlistButton(false);
    } finally {
        traktWatchlistBtn.disabled = false;
    }
}

async function removeFromTraktWatchlist() {
    if (!currentMovie) return;

    try {
        traktWatchlistBtn.disabled = true;
        traktWatchlistBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Removing...';

        const title = currentMovie.title || currentMovie.name;
        const year = parseInt((currentMovie.release_date || currentMovie.first_air_date || '').substring(0, 4));
        const type = currentMediaType === 'tv' ? 'show' : 'movie';

        const response = await fetch(getTraktApiUrl('trakt/watchlist/remove'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, type, year })
        });

        const data = await response.json();
        
        if (data.success) {
            updateWatchlistButton(false);
            showNotification(`Removed "${title}" from your Trakt watchlist`, 'success');
        } else {
            throw new Error(data.error || 'Failed to remove from watchlist');
        }
        
    } catch (error) {
        console.error('[TRAKT] Remove from watchlist error:', error);
        showNotification('Failed to remove from watchlist: ' + error.message, 'error');
        updateWatchlistButton(true);
    } finally {
        traktWatchlistBtn.disabled = false;
    }
}

// ===== TRAKT PAGE FUNCTIONS =====

async function initializeTraktPage() {
    if (traktPageInitialized) return;
    
    try {
        await updateTraktPageStatus();
        setupTraktPageEventListeners();
        traktPageInitialized = true;
        console.log('[TRAKT PAGE] Initialized successfully');
    } catch (error) {
        console.error('[TRAKT PAGE] Initialization error:', error);
    }
}

function setupTraktPageEventListeners() {
    // Helper to avoid duplicate listeners when DOM is re-rendered
    function bindById(id, handler) {
        const el = document.getElementById(id);
        if (!el) return;
        const fresh = el.cloneNode(true);
        el.parentNode.replaceChild(fresh, el);
        fresh.addEventListener('click', handler);
    }

    // Authenticate button
    bindById('traktAuthenticateBtn', startTraktPageAuth);

    // Disconnect buttons (both variants)
    bindById('traktPageDisconnect', disconnectTraktFromPage);
    bindById('traktDisconnectBtn', disconnectTraktFromPage);

    // Refresh status button
    bindById('traktPageRefresh', () => { updateTraktPageStatus(); });

    // Re-sync Library button
    bindById('traktPageResyncLibrary', manualResyncTraktLibrary);

    // View statistics button
    bindById('traktPageStats', () => { try { showDetailedTraktStatistics(); } catch(_) {} });

    // Verify Device Code button
    bindById('traktVerifyDeviceBtn', verifyTraktDeviceCode);

    // Open Trakt URL button
    bindById('traktOpenUrlBtn', () => {
        const url = document.getElementById('traktPageVerificationUrl')?.textContent;
        if (url) {
            window.electronAPI?.openExternal(url);
        }
    });

    // Copy device code button
    bindById('traktCopyCodeBtn', copyTraktDeviceCode);

    // Action cards (rebinding safely)
    document.querySelectorAll('.trakt-action-card').forEach(card => {
        const fresh = card.cloneNode(true);
        card.parentNode.replaceChild(fresh, card);
        fresh.addEventListener('click', handleTraktActionClick);
    });

    // Settings toggles
    const autoScrobbleToggle = document.getElementById('traktPageAutoScrobble');
    const progressToggle = document.getElementById('traktPageScrobbleProgress');
    const watchlistToggle = document.getElementById('traktPageWatchlistSync');

    if (autoScrobbleToggle) {
        autoScrobbleToggle.addEventListener('change', () => {
            if (traktAutoScrobbleToggle) {
                traktAutoScrobbleToggle.checked = autoScrobbleToggle.checked;
            }
        });
    }

    if (progressToggle) {
        progressToggle.addEventListener('change', () => {
            if (traktScrobbleProgressToggle) {
                traktScrobbleProgressToggle.checked = progressToggle.checked;
            }
        });
    }

    if (watchlistToggle) {
        watchlistToggle.addEventListener('change', () => {
            if (traktSyncWatchlistToggle) {
                traktSyncWatchlistToggle.checked = watchlistToggle.checked;
            }
        });
    }
}

async function updateTraktPageStatus() {
    try {
        const response = await fetch(getTraktApiUrl(`trakt/status?ts=${Date.now()}`), { cache: 'no-store' });
        const data = await response.json();

        const statusIndicator = document.getElementById('traktStatusIndicator');
        const statusDescription = document.getElementById('traktStatusDescription');
        const statusActions = document.getElementById('traktStatusActions');
        const deviceCodePanel = document.getElementById('traktDeviceCodePanel');
        const traktPageNotConnected = document.getElementById('traktPageNotConnected');
        const traktPageConnected = document.getElementById('traktPageConnected');
        const traktPageUsername = document.getElementById('traktPageUsername');

        if (data.authenticated) {
            // Connected state: show connected card, set username
            if (traktPageNotConnected) traktPageNotConnected.style.display = 'none';
            if (traktPageConnected) traktPageConnected.style.display = '';
            if (traktPageUsername) traktPageUsername.textContent = (data.user?.username || data.user?.name || 'User');

            if (deviceCodePanel) {
                deviceCodePanel.style.display = 'none';
                delete deviceCodePanel.dataset.manual;
            }
            // Update action grid with stats
            await loadTraktStats();
            // One-time import from Trakt into local caches
            importTraktDataOnceIfNeeded();
            
        } else {
            // Disconnected state: show not-connected card with connect action
            if (traktPageConnected) traktPageConnected.style.display = 'none';
            if (traktPageNotConnected) traktPageNotConnected.style.display = '';
            if (statusIndicator) {
                statusIndicator.className = 'trakt-status-indicator disconnected';
                statusIndicator.innerHTML = '<i class="fas fa-times-circle"></i><span>Not Connected</span>';
            }
            if (statusDescription) {
                statusDescription.textContent = 'Connect your Trakt account to automatically track what you watch, sync your watchlist, and get personalized recommendations.';
            }
            if (statusActions) {
                statusActions.innerHTML = `
                    <button id="traktAuthenticateBtn" class="trakt-btn trakt-btn-primary">
                        <i class="fas fa-link"></i>Connect to Trakt
                    </button>
                `;
            }

            // Only hide code panel if not manually shown during an active auth flow
            if (deviceCodePanel && deviceCodePanel.dataset.manual !== 'true') {
                deviceCodePanel.style.display = 'none';
            }

            // Clear action grid
            clearTraktActionGrid();
        }

        // Sync settings toggles
        syncTraktPageSettings();
        
        // Re-setup event listeners after DOM update
        setupTraktPageEventListeners();

    } catch (error) {
        console.error('[TRAKT PAGE] Status update error:', error);
        // Surface the actual error for clarity
        const msg = (error && error.message) ? error.message : 'Unknown error';
        showNotification('Trakt status error: ' + msg, 'error');
    }
}

async function startTraktPageAuth() {
    try {
        const response = await fetch(getTraktApiUrl('trakt/device/code'), { method: 'POST' });
        const data = await response.json();

        if (data.success) {
            showTraktDeviceCode(data.device_code, data.user_code, data.verification_url, data.expires_in);
            
            // Start polling for verification
            traktDeviceCodeInterval = setInterval(async () => {
                await verifyTraktDeviceCode();
            }, data.interval * 1000 || 5000);
            
        } else {
            throw new Error(data.error || 'Failed to get device code');
        }
    } catch (error) {
        console.error('[TRAKT PAGE] Auth start error:', error);
        showNotification('Failed to start authentication: ' + error.message, 'error');
    }
}

function showTraktDeviceCode(deviceCode, userCode, verificationUrl, expiresIn) {
    const deviceCodePanel = document.getElementById('traktDeviceCodePanel');
    const userCodeSpan = document.getElementById('traktPageUserCode');
    const verificationUrlSpan = document.getElementById('traktPageVerificationUrl');
    const statusMessage = document.getElementById('traktDeviceCodeStatus');

    if (deviceCodePanel) {
        deviceCodePanel.style.display = 'block';
        deviceCodePanel.dataset.manual = 'true';
    }
    if (userCodeSpan) userCodeSpan.textContent = userCode;
    if (verificationUrlSpan) verificationUrlSpan.textContent = verificationUrl;
    if (statusMessage) {
        statusMessage.innerHTML = '<span>Waiting for authorization... Please enter the code above on Trakt.tv</span>';
    }

    // Set timeout to hide panel after expiration
    setTimeout(() => {
        if (traktDeviceCodeInterval) {
            clearInterval(traktDeviceCodeInterval);
            traktDeviceCodeInterval = null;
            if (deviceCodePanel) {
                deviceCodePanel.style.display = 'none';
                delete deviceCodePanel.dataset.manual;
            }
            showNotification('Device code expired. Please try again.', 'error');
        }
    }, expiresIn * 1000);
}

async function verifyTraktDeviceCode() {
    try {
        const response = await fetch(getTraktApiUrl('trakt/device/verify'), { method: 'POST' });
        const data = await response.json();

        if (data.success) {
            // Success! Clear interval and update page
            if (traktDeviceCodeInterval) {
                clearInterval(traktDeviceCodeInterval);
                traktDeviceCodeInterval = null;
            }
            
            const deviceCodePanel = document.getElementById('traktDeviceCodePanel');
            if (deviceCodePanel) deviceCodePanel.style.display = 'none';
            
            showNotification('Successfully connected to Trakt!', 'success');
            await updateTraktPageStatus();
            
        } else if (data.error === 'pending') {
            // Still waiting, update status
            const statusMessage = document.getElementById('traktDeviceCodeStatus');
            if (statusMessage) {
                statusMessage.innerHTML = '<span>Waiting for authorization... Please enter the code above on Trakt.tv</span>';
            }
        } else {
            throw new Error(data.error || 'Verification failed');
        }
    } catch (error) {
        console.error('[TRAKT PAGE] Verify error:', error);
        if (error.message !== 'pending') {
            showNotification('Verification failed: ' + error.message, 'error');
        }
    }
}

async function disconnectTraktFromPage() {
    try {
        const response = await fetch(getTraktApiUrl('trakt/logout'), { method: 'POST' });
        const data = await response.json();

        if (data.success) {
            // Hide device code panel if visible
            const deviceCodePanel = document.getElementById('traktDeviceCodePanel');
            if (deviceCodePanel) deviceCodePanel.style.display = 'none';
            // Refresh both Trakt page and Settings page status
            try { await updateTraktPageStatus(); } catch(_) {}
            try { await checkTraktStatus(); } catch(_) {}
            showNotification('Successfully disconnected from Trakt', 'success');
        } else {
            throw new Error(data.error || 'Failed to disconnect');
        }
    } catch (error) {
        console.error('[TRAKT PAGE] Disconnect error:', error);
        showNotification('Failed to disconnect: ' + error.message, 'error');
    }
}

function copyTraktDeviceCode() {
    // Prefer Trakt page code span, fallback to Settings panel span
    const userCode = (document.getElementById('traktPageUserCode')?.textContent)
        || (document.querySelector('#traktCodePanel #traktUserCode')?.textContent)
        || (document.getElementById('traktUserCode')?.textContent);
    if (userCode && navigator.clipboard) {
        navigator.clipboard.writeText(userCode).then(() => {
            showNotification('Device code copied to clipboard!', 'success');
        }).catch(() => {
            showNotification('Failed to copy code', 'error');
        });
    }
}

async function showDetailedTraktStatistics() {
    try {
        showNotification('Loading your statistics...', 'info', 2000);
        
        const response = await fetch(getTraktApiUrl('trakt/user/stats'));
        const data = await response.json();
        
        if (data.success && data.stats) {
            displayTraktStatisticsModal(data.stats);
            showNotification('Statistics loaded successfully!', 'success', 2000);
        } else {
            throw new Error(data.error || 'Failed to load statistics');
        }
    } catch (error) {
        console.error('[TRAKT] Detailed statistics error:', error);
        showNotification('Unable to load detailed statistics. Please ensure you\'re connected to Trakt and try again.', 'error', 4000);
    }
}

function displayTraktStatisticsModal(stats) {
    // Create statistics modal
    const modal = document.createElement('div');
    modal.id = 'traktStatisticsModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(8px);
        z-index: 20000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem;
        animation: fadeIn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
    `;

    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: linear-gradient(135deg, rgba(30, 30, 30, 0.95) 0%, rgba(20, 20, 20, 0.95) 100%);
        border-radius: 16px;
        padding: 2rem;
        max-width: 800px;
        width: 100%;
        max-height: 80vh;
        overflow-y: auto;
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    `;

    // Calculate totals
    const movieStats = stats.movies || { watched: 0, collected: 0, ratings: 0, plays: 0, minutes: 0 };
    const showStats = stats.shows || { watched: 0, collected: 0, ratings: 0, plays: 0, minutes: 0 };
    const episodeStats = stats.episodes || { watched: 0, collected: 0, ratings: 0, plays: 0, minutes: 0 };
    
    const totalWatched = movieStats.watched + showStats.watched;
    const totalMinutes = movieStats.minutes + episodeStats.minutes;
    const totalHours = Math.round(totalMinutes / 60);
    const totalDays = Math.round(totalHours / 24);
    
    modalContent.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
            <h2 style="margin: 0; color: #ed1c24; font-size: 1.8rem;">
                <i class="fas fa-chart-bar"></i> Your Trakt Statistics
            </h2>
            <button onclick="closeTraktStatisticsModal()" style="
                background: rgba(255, 255, 255, 0.1);
                border: none;
                color: white;
                padding: 0.5rem;
                border-radius: 50%;
                cursor: pointer;
                font-size: 1.2rem;
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
            ">×</button>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
            <div style="background: rgba(237, 28, 36, 0.1); padding: 1.5rem; border-radius: 12px; border-left: 4px solid #ed1c24;">
                <div style="font-size: 2rem; font-weight: bold; color: #ed1c24;">${totalWatched}</div>
                <div style="color: #ccc; margin-top: 0.5rem;">Total Content Watched</div>
                <div style="font-size: 0.9rem; color: #999; margin-top: 0.25rem;">Movies + Shows</div>
            </div>
            
            <div style="background: rgba(34, 197, 94, 0.1); padding: 1.5rem; border-radius: 12px; border-left: 4px solid #22c55e;">
                <div style="font-size: 2rem; font-weight: bold; color: #22c55e;">${totalDays}</div>
                <div style="color: #ccc; margin-top: 0.5rem;">Days Watched</div>
                <div style="font-size: 0.9rem; color: #999; margin-top: 0.25rem;">${totalHours} hours total</div>
            </div>
            
            <div style="background: rgba(59, 130, 246, 0.1); padding: 1.5rem; border-radius: 12px; border-left: 4px solid #3b82f6;">
                <div style="font-size: 2rem; font-weight: bold; color: #3b82f6;">${stats.watchlist?.length || 0}</div>
                <div style="color: #ccc; margin-top: 0.5rem;">Watchlist Items</div>
                <div style="font-size: 0.9rem; color: #999; margin-top: 0.25rem;">Pending to watch</div>
            </div>
            
            <div style="background: rgba(245, 158, 11, 0.1); padding: 1.5rem; border-radius: 12px; border-left: 4px solid #f59e0b;">
                <div style="font-size: 2rem; font-weight: bold; color: #f59e0b;">${stats.ratings?.length || 0}</div>
                <div style="color: #ccc; margin-top: 0.5rem;">Items Rated</div>
                <div style="font-size: 0.9rem; color: #999; margin-top: 0.25rem;">Your taste profile</div>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">
            <div style="background: rgba(255, 255, 255, 0.05); padding: 1.5rem; border-radius: 12px;">
                <h3 style="margin: 0 0 1rem 0; color: #ed1c24;">
                    <i class="fas fa-film"></i> Movies
                </h3>
                <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: #ccc;">Watched:</span>
                        <span style="color: white; font-weight: bold;">${movieStats.watched || 0}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: #ccc;">Collected:</span>
                        <span style="color: white; font-weight: bold;">${movieStats.collected || 0}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: #ccc;">Rated:</span>
                        <span style="color: white; font-weight: bold;">${movieStats.ratings || 0}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: #ccc;">Watch Time:</span>
                        <span style="color: white; font-weight: bold;">${Math.round((movieStats.minutes || 0) / 60)}h</span>
                    </div>
                </div>
            </div>

            <div style="background: rgba(255, 255, 255, 0.05); padding: 1.5rem; border-radius: 12px;">
                <h3 style="margin: 0 0 1rem 0; color: #ed1c24;">
                    <i class="fas fa-tv"></i> TV Shows
                </h3>
                <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: #ccc;">Shows Watched:</span>
                        <span style="color: white; font-weight: bold;">${showStats.watched || 0}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: #ccc;">Episodes:</span>
                        <span style="color: white; font-weight: bold;">${episodeStats.watched || 0}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: #ccc;">Shows Rated:</span>
                        <span style="color: white; font-weight: bold;">${showStats.ratings || 0}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: #ccc;">Watch Time:</span>
                        <span style="color: white; font-weight: bold;">${Math.round((episodeStats.minutes || 0) / 60)}h</span>
                    </div>
                </div>
            </div>
        </div>

        ${stats.network ? `
        <div style="background: rgba(255, 255, 255, 0.05); padding: 1.5rem; border-radius: 12px; margin-bottom: 1rem;">
            <h3 style="margin: 0 0 1rem 0; color: #ed1c24;">
                <i class="fas fa-users"></i> Social Network
            </h3>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; text-align: center;">
                <div>
                    <div style="font-size: 1.5rem; font-weight: bold; color: #3b82f6;">${stats.network.friends || 0}</div>
                    <div style="color: #ccc; font-size: 0.9rem;">Friends</div>
                </div>
                <div>
                    <div style="font-size: 1.5rem; font-weight: bold; color: #22c55e;">${stats.network.followers || 0}</div>
                    <div style="color: #ccc; font-size: 0.9rem;">Followers</div>
                </div>
                <div>
                    <div style="font-size: 1.5rem; font-weight: bold; color: #f59e0b;">${stats.network.following || 0}</div>
                    <div style="color: #ccc; font-size: 0.9rem;">Following</div>
                </div>
            </div>
        </div>
        ` : ''}

        <div style="text-align: center; margin-top: 2rem;">
            <button onclick="window.electronAPI?.openExternal('https://trakt.tv/users/me')" style="
                background: linear-gradient(135deg, #ed1c24 0%, #d41920 100%);
                color: white;
                border: none;
                padding: 0.75rem 1.5rem;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
                margin-right: 1rem;
            ">
                <i class="fas fa-external-link-alt"></i> View Profile on Trakt
            </button>
            <button onclick="closeTraktStatisticsModal()" style="
                background: rgba(255, 255, 255, 0.1);
                color: white;
                border: 1px solid rgba(255, 255, 255, 0.2);
                padding: 0.75rem 1.5rem;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
            ">
                Close
            </button>
        </div>
    `;

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // Add click outside to close
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeTraktStatisticsModal();
        }
    });

    showNotification('Statistics loaded successfully!', 'success');
}

function closeTraktStatisticsModal() {
    const modal = document.getElementById('traktStatisticsModal');
    if (modal) {
        modal.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

// Add fade animations
const fadeStyle = document.createElement('style');
fadeStyle.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: scale(0.9); }
        to { opacity: 1; transform: scale(1); }
    }
    @keyframes fadeOut {
        from { opacity: 1; transform: scale(1); }
        to { opacity: 0; transform: scale(0.9); }
    }
`;
document.head.appendChild(fadeStyle);

async function loadTraktStats() {
    try {
        const response = await fetch(getTraktApiUrl('trakt/user/stats'));
        const data = await response.json();

        if (data.success) {
            traktStats = data.stats;
            updateTraktActionGrid(data.stats);
            console.log('[TRAKT PAGE] Stats loaded successfully');
        } else {
            // Silently use placeholder stats - don't show error notifications
            console.log('[TRAKT PAGE] Using placeholder stats:', data.error);
            const placeholderStats = {
                watchlist: [],
                collection: { movies: [], shows: [] },
                ratings: [],
                movies: { watched: 0, collected: 0, ratings: 0 },
                shows: { watched: 0, collected: 0, ratings: 0 }
            };
            updateTraktActionGrid(placeholderStats);
        }
    } catch (error) {
        // Don't show error notifications for stats loading - just use placeholders
        console.log('[TRAKT PAGE] Stats loading failed, using placeholders:', error);
        const placeholderStats = {
            watchlist: [],
            collection: { movies: [], shows: [] },
            ratings: [],
            movies: { watched: 0, collected: 0, ratings: 0 },
            shows: { watched: 0, collected: 0, ratings: 0 }
        };
        updateTraktActionGrid(placeholderStats);
    }
}

function updateTraktActionGrid(stats) {
    const actionCards = document.querySelectorAll('.trakt-action-card');
    
    actionCards.forEach(card => {
        const action = card.dataset.action;
        const countEl = card.querySelector('.trakt-action-count');
        
        switch (action) {
            case 'watchlist':
                if (countEl) {
                    const count = stats.watchlist?.length || 0;
                    countEl.textContent = count;
                    countEl.style.display = count > 0 ? 'inline-block' : 'none';
                }
                break;
            case 'history':
                if (countEl) {
                    const movieCount = stats.movies?.watched || 0;
                    const showCount = stats.shows?.watched || 0;
                    const totalCount = movieCount + showCount;
                    countEl.textContent = totalCount;
                    countEl.style.display = totalCount > 0 ? 'inline-block' : 'none';
                }
                break;
            case 'collection':
                if (countEl) {
                    const movieCount = stats.collection?.movies?.length || 0;
                    const showCount = stats.collection?.shows?.length || 0;
                    const totalCount = movieCount + showCount;
                    countEl.textContent = totalCount;
                    countEl.style.display = totalCount > 0 ? 'inline-block' : 'none';
                }
                break;
            case 'ratings':
                if (countEl) {
                    const count = stats.ratings?.length || 0;
                    countEl.textContent = count;
                    countEl.style.display = count > 0 ? 'inline-block' : 'none';
                }
                break;
        }
    });
    
    console.log('[TRAKT PAGE] Action grid updated with stats');
}

function clearTraktActionGrid() {
    const actionCards = document.querySelectorAll('.trakt-action-card');
    actionCards.forEach(card => {
        const countEl = card.querySelector('.trakt-action-count');
        if (countEl) countEl.textContent = '0';
    });
}

async function handleTraktActionClick(event) {
    const card = event.currentTarget;
    const action = card.dataset.action;
    
    // Show detailed information for each action
    switch (action) {
        case 'watchlist':
            await showTraktWatchlistDetails();
            break;
        case 'history':
            await showTraktHistoryDetails();
            break;
        case 'collection':
            await showTraktCollectionDetails();
            break;
        case 'ratings':
            await showTraktRatingsDetails();
            break;
        default:
            showNotification('Feature coming soon!', 'info');
    }
}

async function showTraktWatchlistDetails() {
    try {
        const response = await fetch(getTraktApiUrl('trakt/watchlist'));
        const data = await response.json();
        
        if (data.success && data.watchlist) {
            const count = data.watchlist.length;
            if (count > 0) {
                showNotification(`Your watchlist has ${count} items. They will appear automatically when browsing!`, 'success');
            } else {
                showNotification('Your watchlist is empty. Add items by clicking the + button on movies and shows!', 'info');
            }
        } else {
            showNotification('Could not load watchlist. Make sure you\'re connected to Trakt.', 'error');
        }
    } catch (error) {
        console.error('[TRAKT] Watchlist details error:', error);
        showNotification('Failed to load watchlist details', 'error');
    }
}

async function showTraktHistoryDetails() {
    try {
        const response = await fetch(getTraktApiUrl('trakt/history'));
        const data = await response.json();
        
        if (data.success && data.history) {
            const count = data.history.length;
            if (count > 0) {
                showNotification(`You've watched ${count} items. Your watch history is automatically tracked!`, 'success');
            } else {
                showNotification('No watch history yet. Start watching content and it will be tracked automatically!', 'info');
            }
        } else {
            showNotification('Could not load watch history. Make sure you\'re connected to Trakt.', 'error');
        }
    } catch (error) {
        console.error('[TRAKT] History details error:', error);
        showNotification('Failed to load watch history', 'error');
    }
}

async function showTraktCollectionDetails() {
    try {
        const response = await fetch(getTraktApiUrl('trakt/collection'));
        const data = await response.json();
        
        if (data.success && data.collection) {
            const movieCount = data.collection.movies?.length || 0;
            const showCount = data.collection.shows?.length || 0;
            const total = movieCount + showCount;
            
            if (total > 0) {
                showNotification(`Your collection has ${movieCount} movies and ${showCount} shows (${total} total)`, 'success');
            } else {
                showNotification('Your collection is empty. Items are added automatically when you finish watching!', 'info');
            }
        } else {
            showNotification('Could not load collection. Make sure you\'re connected to Trakt.', 'error');
        }
    } catch (error) {
        console.error('[TRAKT] Collection details error:', error);
        showNotification('Failed to load collection details', 'error');
    }
}

async function showTraktRatingsDetails() {
    try {
        const response = await fetch(getTraktApiUrl('trakt/ratings'));
        const data = await response.json();
        
        if (data.success && data.ratings) {
            const count = data.ratings.length;
            if (count > 0) {
                showNotification(`You've rated ${count} items on Trakt. Visit trakt.tv to rate more content!`, 'success');
            } else {
                showNotification('You haven\'t rated anything yet. Visit trakt.tv to start rating movies and shows!', 'info');
            }
        } else {
            showNotification('Could not load ratings. Make sure you\'re connected to Trakt.', 'error');
        }
    } catch (error) {
        console.error('[TRAKT] Ratings details error:', error);
        showNotification('Failed to load ratings details', 'error');
    }
}

function syncTraktPageSettings() {
    // Sync main settings with page settings
    const autoScrobbleToggle = document.getElementById('traktPageAutoScrobble');
    const progressToggle = document.getElementById('traktPageScrobbleProgress');
    const watchlistToggle = document.getElementById('traktPageWatchlistSync');

    if (autoScrobbleToggle && traktAutoScrobbleToggle) {
        autoScrobbleToggle.checked = traktAutoScrobbleToggle.checked;
    }

    if (progressToggle && traktScrobbleProgressToggle) {
        progressToggle.checked = traktScrobbleProgressToggle.checked;
    }

    if (watchlistToggle && traktSyncWatchlistToggle) {
        watchlistToggle.checked = traktSyncWatchlistToggle.checked;
    }
}

// ===== TRAKT IMPORT (My List + Done Watching) =====

async function fetchTmdbDetailsById(type, tmdbId) {
    try {
        if (!tmdbId) return null;
        const base = 'https://api.themoviedb.org/3';
        const endpoint = type === 'tv' ? `/tv/${tmdbId}` : `/movie/${tmdbId}`;
        const url = `${base}${endpoint}?api_key=${TMDB_API_KEY}`;
        const resp = await fetch(url);
        if (!resp.ok) return null;
        const j = await resp.json();
        return j;
    } catch(_) { return null; }
}

function normalizeYear(from) {
    try { return (from || '').substring(0, 4) || ''; } catch { return ''; }
}

async function importTraktWatchlistToMyList(maxPages = 50, pageSize = 100) {
    try {
        console.log('[TRAKT IMPORT] Starting watchlist import...');
        
        // Ensure current list loaded - use window.loadMyList
        if (typeof window.loadMyList === 'function') {
            await window.loadMyList();
        } else {
            console.error('[TRAKT IMPORT] loadMyList function not available');
            return 0;
        }

        let totalAdded = 0;
        for (let page = 1; page <= maxPages; page++) {
            console.log(`[TRAKT IMPORT] Fetching watchlist page ${page}...`);
            const res = await fetch(getTraktApiUrl(`trakt/watchlist?type=mixed&page=${page}&limit=${pageSize}`));
            const data = await res.json();
            console.log('[TRAKT IMPORT] Watchlist response:', data);
            
            if (!data.success || !Array.isArray(data.watchlist) || data.watchlist.length === 0) {
                console.log('[TRAKT IMPORT] No more watchlist items or error');
                break;
            }

            let addedThisPage = 0;
            for (const entry of data.watchlist) {
                const isMovie = !!entry.movie;
                const isShow = !!entry.show;
                const type = isMovie ? 'movie' : (isShow ? 'tv' : null);
                const ids = (entry.movie?.ids || entry.show?.ids || {});
                const tmdbId = ids.tmdb || null;
                if (!type || !tmdbId) continue;

                // Skip if already present - use window.myListCache
                const currentList = Array.isArray(window.myListCache) ? window.myListCache : [];
                if (currentList.some(it => it.id === tmdbId && (it.media_type === type || it.mediaType === type))) continue;

                // Fetch TMDB details to enrich poster/year/rating/title
                const details = await fetchTmdbDetailsById(type, tmdbId);
                const title = type === 'tv' ? (details?.name || entry.show?.title || '') : (details?.title || entry.movie?.title || '');
                const poster_path = details?.poster_path || '';
                const year = type === 'tv' ? normalizeYear(details?.first_air_date || entry.show?.year) : normalizeYear(details?.release_date || entry.movie?.year);
                const vote_average = Number(details?.vote_average || 0);
                const listItem = {
                    id: tmdbId,
                    media_type: type,
                    title,
                    poster_path,
                    year,
                    vote_average,
                    added_date: entry.listed_at || new Date().toISOString()
                };
                
                // Add to window.myListCache
                if (!Array.isArray(window.myListCache)) {
                    window.myListCache = [];
                }
                window.myListCache.unshift(listItem);
                addedThisPage++;
            }
            totalAdded += addedThisPage;
            console.log(`[TRAKT IMPORT] Added ${addedThisPage} items from page ${page}`);

            // If we got less than pageSize items, we've reached the end
            if (data.watchlist.length < pageSize) break;
        }

        if (totalAdded > 0) {
            if (typeof window.saveMyList === 'function') {
                await window.saveMyList();
            }
            // Refresh page if open
            if (document.getElementById('myListPage')?.style.display !== 'none') {
                if (typeof window.displayMyList === 'function') {
                    await window.displayMyList();
                }
            }
        }
        console.log(`[TRAKT IMPORT] Watchlist import complete: ${totalAdded} items added`);
        return totalAdded;
    } catch (e) {
        console.error('[TRAKT IMPORT] My List failed:', e);
        return 0;
    }
}

async function importTraktHistoryToDoneWatching(maxPages = 50, pageSize = 100) {
    try {
        console.log('[TRAKT IMPORT] Starting history import...');
        
        // Use window.loadDoneWatching
        if (typeof window.loadDoneWatching === 'function') {
            await window.loadDoneWatching();
        } else {
            console.error('[TRAKT IMPORT] loadDoneWatching function not available');
            return 0;
        }
        
        let totalAdded = 0;
        for (let page = 1; page <= maxPages; page++) {
            console.log(`[TRAKT IMPORT] Fetching history page ${page}...`);
            const res = await fetch(getTraktApiUrl(`trakt/history?type=mixed&page=${page}&limit=${pageSize}`));
            const data = await res.json();
            console.log('[TRAKT IMPORT] History response:', data);
            
            if (!data.success || !Array.isArray(data.history) || data.history.length === 0) {
                console.log('[TRAKT IMPORT] No more history items or error');
                break;
            }

            for (const h of data.history) {
                const watchedAt = h.watched_at || new Date().toISOString();
                // Ensure we have an array
                const currentDoneList = Array.isArray(window.doneWatchingCache) ? window.doneWatchingCache : [];
                
                if (h.movie) {
                    const ids = h.movie.ids || {};
                    const tmdbId = ids.tmdb || null;
                    if (!tmdbId) continue;
                    // Skip if already have movie marked done (whole title)
                    if (currentDoneList.some(it => it.id === tmdbId && it.media_type === 'movie' && !it.season && !it.episode)) continue;
                    const details = await fetchTmdbDetailsById('movie', tmdbId);
                    const item = {
                        id: tmdbId,
                        media_type: 'movie',
                        title: details?.title || h.movie.title || '',
                        poster_path: details?.poster_path || '',
                        year: normalizeYear(details?.release_date || h.movie.year),
                        vote_average: Number(details?.vote_average || 0),
                        completed_date: watchedAt
                    };
                    if (!Array.isArray(window.doneWatchingCache)) {
                        window.doneWatchingCache = [];
                    }
                    window.doneWatchingCache.unshift(item);
                    totalAdded++;
                } else if (h.episode && h.show) {
                    const ids = h.show.ids || {};
                    const tmdbId = ids.tmdb || null;
                    if (!tmdbId) continue;
                    const season = h.episode.season;
                    const episode = h.episode.number;
                    // Skip if this exact episode already present
                    if (currentDoneList.some(it => it.id === tmdbId && (it.media_type === 'tv' || it.mediaType === 'tv') && it.season === season && it.episode === episode)) continue;
                    const details = await fetchTmdbDetailsById('tv', tmdbId);
                    const item = {
                        id: tmdbId,
                        media_type: 'tv',
                        title: details?.name || h.show.title || '',
                        poster_path: details?.poster_path || '',
                        year: normalizeYear(details?.first_air_date || h.show.year),
                        vote_average: Number(details?.vote_average || 0),
                        completed_date: watchedAt,
                        season,
                        episode,
                        episode_title: h.episode.title || `S${season}E${episode}`
                    };
                    if (!Array.isArray(window.doneWatchingCache)) {
                        window.doneWatchingCache = [];
                    }
                    window.doneWatchingCache.unshift(item);
                    totalAdded++;
                }
            }

            // If we got less than pageSize items, we've reached the end
            if (data.history.length < pageSize) break;
        }

        if (totalAdded > 0) {
            if (typeof window.saveDoneWatching === 'function') {
                await window.saveDoneWatching();
            }
            // Refresh page if open
            if (document.getElementById('doneWatchingPage')?.style.display !== 'none') {
                if (typeof window.displayDoneWatching === 'function') {
                    await window.displayDoneWatching();
                }
            }
        }
        console.log(`[TRAKT IMPORT] History import complete: ${totalAdded} items added`);
        return totalAdded;
    } catch (e) {
        console.log('[TRAKT IMPORT] Done Watching failed:', e?.message);
        return 0;
    }
}

async function importTraktDataOnceIfNeeded() {
    if (traktImportedOnce) return;
    traktImportedOnce = true;
    console.log('[TRAKT IMPORT] Starting one-time import from Trakt...');
    const watchlistAdded = await importTraktWatchlistToMyList();
    const historyAdded = await importTraktHistoryToDoneWatching();
    console.log(`[TRAKT IMPORT] Completed: ${watchlistAdded} watchlist items, ${historyAdded} history items`);
}

// Force import Trakt data (resets the flag and imports)
async function forceImportTraktData() {
    console.log('[TRAKT IMPORT] Force importing Trakt data...');
    traktImportedOnce = false;
    const watchlistAdded = await importTraktWatchlistToMyList();
    const historyAdded = await importTraktHistoryToDoneWatching();
    traktImportedOnce = true;
    console.log(`[TRAKT IMPORT] Force import completed: ${watchlistAdded} watchlist items, ${historyAdded} history items`);
    return { watchlistAdded, historyAdded };
}

// Export functions to window for global access
window.setupTraktWatchlistButton = setupTraktWatchlistButton;
window.addToTraktWatchlist = addToTraktWatchlist;
window.removeFromTraktWatchlist = removeFromTraktWatchlist;
window.initializeTraktPage = initializeTraktPage;
window.updateTraktPageStatus = updateTraktPageStatus;
window.startTraktPageAuth = startTraktPageAuth;
window.verifyTraktDeviceCode = verifyTraktDeviceCode;
window.disconnectTraktFromPage = disconnectTraktFromPage;
window.showDetailedTraktStatistics = showDetailedTraktStatistics;
window.displayTraktStatisticsModal = displayTraktStatisticsModal;
window.closeTraktStatisticsModal = closeTraktStatisticsModal;
window.loadTraktStats = loadTraktStats;
window.updateTraktActionGrid = updateTraktActionGrid;
window.handleTraktActionClick = handleTraktActionClick;
window.copyTraktDeviceCode = copyTraktDeviceCode;
window.importTraktDataOnceIfNeeded = importTraktDataOnceIfNeeded;
window.forceImportTraktData = forceImportTraktData;

// ===== TRAKT STATUS CHECK =====

async function checkTraktStatus() {
    try {
        const response = await fetch(getTraktApiUrl(`trakt/status?ts=${Date.now()}`), { cache: 'no-store' });
        const data = await response.json();
        
        if (data.authenticated && data.user) {
            showTraktConnected(data.user);
        } else {
            showTraktDisconnected();
        }
    } catch (error) {
        console.error('[TRAKT] Status check failed:', error);
        showTraktDisconnected();
    }
}

function showTraktConnected(user) {
    const traktNotConnectedEls = document.querySelectorAll('#traktNotConnected');
    const traktConnectedEls = document.querySelectorAll('#traktConnected');
    const traktUsernameEls = document.querySelectorAll('#traktUsername');
    const traktStatusEls = document.querySelectorAll('#traktStatus');
    
    traktNotConnectedEls.forEach(el => el.style.display = 'none');
    traktConnectedEls.forEach(el => el.style.display = 'block');
    traktUsernameEls.forEach(el => el.textContent = user.username || user.name || 'User');
    traktStatusEls.forEach(el => {
        el.innerHTML = '<i class="fas fa-check-circle"></i> Connected';
        el.style.color = '#198754';
    });
}

function showTraktDisconnected() {
    const traktNotConnectedEls = document.querySelectorAll('#traktNotConnected');
    const traktConnectedEls = document.querySelectorAll('#traktConnected');
    const traktStatusEls = document.querySelectorAll('#traktStatus');
    
    traktNotConnectedEls.forEach(el => el.style.display = 'block');
    traktConnectedEls.forEach(el => el.style.display = 'none');
    traktStatusEls.forEach(el => {
        el.innerHTML = '<i class="fas fa-times-circle"></i> Not connected';
        el.style.color = '#dc3545';
    });
}

// Export functions
window.checkTraktStatus = checkTraktStatus;
window.showTraktConnected = showTraktConnected;
window.showTraktDisconnected = showTraktDisconnected;

console.log('[TRAKT] Trakt integration module loaded');


// ===== TRAKT SYNC FUNCTIONS FOR IN-APP LISTS =====

async function syncWithTraktWatchlist(action, title, mediaType, year) {
    try {
        // Check if user is authenticated
        const statusResponse = await fetch(getTraktApiUrl('trakt/status'));
        const statusData = await statusResponse.json();
        if (!statusData.authenticated) {
            console.log('[TRAKT SYNC] User not authenticated, skipping watchlist sync');
            return;
        }

        const endpoint = action === 'add' ? getTraktApiUrl('trakt/watchlist/add') : getTraktApiUrl('trakt/watchlist/remove');
        const type = mediaType === 'movie' ? 'movie' : 'show';
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, type, year: parseInt(year) })
        });

        const data = await response.json();
        
        if (data.success) {
            const actionText = action === 'add' ? 'Added to' : 'Removed from';
            showNotification(`${actionText} Trakt watchlist: "${title}"`, 'success');
            console.log(`[TRAKT SYNC] ${actionText} watchlist:`, title);
        } else {
            console.log(`[TRAKT SYNC] Watchlist ${action} failed:`, data.error);
        }
    } catch (error) {
        console.log('[TRAKT SYNC] Watchlist sync error:', error);
    }
}

async function syncWithTraktWatched(mediaType, title, year) {
    try {
        // Check if user is authenticated
        const statusResponse = await fetch(getTraktApiUrl('trakt/status'));
        const statusData = await statusResponse.json();
        if (!statusData.authenticated) {
            console.log('[TRAKT SYNC] User not authenticated, skipping watched sync');
            return;
        }

        // Use scrobble/stop to mark as watched (100% progress)
        const response = await fetch(getTraktApiUrl('trakt/scrobble/stop'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                title, 
                type: mediaType, 
                year: parseInt(year),
                progress: 100 
            })
        });

        const data = await response.json();
        
        if (data.success) {
            showNotification(`Marked "${title}" as watched on Trakt`, 'success');
            console.log('[TRAKT SYNC] Marked as watched:', title);
        } else {
            console.log('[TRAKT SYNC] Watched sync failed:', data.error);
        }
    } catch (error) {
        console.log('[TRAKT SYNC] Watched sync error:', error);
    }
}

async function syncWithTraktWatchedEpisode(showTitle, year, season, episode) {
    try {
        // Check if user is authenticated
        const statusResponse = await fetch(getTraktApiUrl('trakt/status'));
        const statusData = await statusResponse.json();
        if (!statusData.authenticated) {
            console.log('[TRAKT SYNC] User not authenticated, skipping episode sync');
            return;
        }

        // Use scrobble/stop to mark episode as watched
        const response = await fetch(getTraktApiUrl('trakt/scrobble/stop'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                title: showTitle, 
                type: 'show', 
                year: parseInt(year),
                season: parseInt(season),
                episode: parseInt(episode),
                progress: 100 
            })
        });

        const data = await response.json();
        
        if (data.success) {
            showNotification(`Marked S${season}E${episode} of "${showTitle}" as watched on Trakt`, 'success');
            console.log('[TRAKT SYNC] Marked episode as watched:', showTitle, `S${season}E${episode}`);
        } else {
            console.log('[TRAKT SYNC] Episode watched sync failed:', data.error);
        }
    } catch (error) {
        console.log('[TRAKT SYNC] Episode watched sync error:', error);
    }
}

async function syncWithTraktCollection(action, title, mediaType, year) {
    try {
        // Check if user is authenticated
        const statusResponse = await fetch(getTraktApiUrl('trakt/status'));
        const statusData = await statusResponse.json();
        if (!statusData.authenticated) {
            console.log('[TRAKT SYNC] User not authenticated, skipping collection sync');
            return;
        }

        const endpoint = action === 'add' ? getTraktApiUrl('trakt/collection/add') : getTraktApiUrl('trakt/collection/remove');
        const type = mediaType === 'movie' ? 'movie' : 'show';
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, type, year: parseInt(year) })
        });

        const data = await response.json();
        
        if (data.success) {
            const actionText = action === 'add' ? 'Added to' : 'Removed from';
            console.log(`[TRAKT SYNC] ${actionText} collection:`, title);
        } else {
            console.log(`[TRAKT SYNC] Collection ${action} failed:`, data.error);
        }
    } catch (error) {
        console.log('[TRAKT SYNC] Collection sync error:', error);
    }
}

// Function to add episode-specific done watching
function addEpisodeToDoneWatching(showId, showTitle, season, episode, episodeTitle, year, poster) {
    const episodeItem = {
        id: showId,
        media_type: 'tv',
        title: showTitle,
        episode_title: episodeTitle,
        season: season,
        episode: episode,
        poster_path: poster,
        year: year,
        vote_average: 0,
        completed_date: new Date().toISOString()
    };
    
    // Check if this episode is already in done watching
    const existingIndex = doneWatchingCache.findIndex(item => 
        item.id === showId && item.media_type === 'tv' && 
        item.season === season && item.episode === episode
    );
    
    if (existingIndex === -1) {
        doneWatchingCache.unshift(episodeItem);
        saveDoneWatching();
        
        // Sync with Trakt
        syncWithTraktWatchedEpisode(showTitle, year, season, episode);
        
        showNotification(`Added S${season}E${episode} "${episodeTitle}" to done watching`, 'success');
    } else {
        showNotification(`S${season}E${episode} is already in done watching`, 'info');
    }
}

// Toggle episode-specific done watching
async function toggleEpisodeDoneWatching(event, showId, showTitle, season, episode, episodeTitle, year, poster) {
    event.preventDefault();
    event.stopPropagation();
    
    const button = event.target.closest('.episode-done-btn');
    if (!button) return;

    const existingIndex = doneWatchingCache.findIndex(item => 
        item.id === showId && item.media_type === 'tv' && 
        item.season === season && item.episode === episode
    );
    
    if (existingIndex >= 0) {
        // Remove episode from done watching
        doneWatchingCache.splice(existingIndex, 1);
        button.classList.remove('is-done');
        button.innerHTML = '<i class="fas fa-check"></i>';
        button.title = 'Mark Episode as Done Watching';
        
        showNotification(`Removed S${season}E${episode} from done watching`, 'info');
    } else {
        // Add episode to done watching
        const episodeItem = {
            id: showId,
            media_type: 'tv',
            title: showTitle,
            episode_title: episodeTitle,
            season: season,
            episode: episode,
            poster_path: poster,
            year: year,
            vote_average: 0,
            completed_date: new Date().toISOString()
        };
        
        doneWatchingCache.unshift(episodeItem);
        button.classList.add('is-done');
        button.innerHTML = '<i class="fas fa-check-circle"></i>';
        button.title = 'Remove from Done Watching';
        
        // Sync with Trakt
        await syncWithTraktWatchedEpisode(showTitle, year, season, episode);
        
        showNotification(`Marked S${season}E${episode} "${episodeTitle}" as watched`, 'success');
    }

    await saveDoneWatching();
    
    // Refresh Done Watching page if it's currently open
    if (document.getElementById('doneWatchingPage').style.display !== 'none') {
        displayDoneWatching();
    }
    // Also update any other cards for the same show immediately
    updateAllDoneButtons(showId, 'tv');
}

// Update all .done-watching-btn in DOM for a given id/mediaType
function updateAllDoneButtons(id, mediaType) {
    document.querySelectorAll('.done-watching-btn').forEach(btn => {
        const onClick = btn.getAttribute('onclick') || '';
        if (onClick.includes('toggleDoneWatching') && onClick.includes(`, ${id},`) && onClick.includes(`'${mediaType}'`)) {
            const card = btn.closest('.movie-card');
            if (card) updateCardDoneStatus(card, id, mediaType);
        }
    });
}

async function manualResyncTraktLibrary() {
    try {
        const btn = document.getElementById('traktPageResyncLibrary');
        if (!btn) return;

        // Disable button and show loading state
        const originalHTML = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Syncing...';

        showNotification('Starting full Trakt library sync...', 'info');

        // Force re-sync by resetting the import flag
        traktImportedOnce = false;
        localStorage.removeItem('traktLastImport');

        // Import with higher page limits (50 pages × 100 = 5000 items max)
        const [addedList, addedDone] = await Promise.all([
            importTraktWatchlistToMyList(50, 100),
            importTraktHistoryToDoneWatching(50, 100),
        ]);

        // Update timestamp
        traktImportedOnce = true;
        localStorage.setItem('traktLastImport', Date.now().toString());

        const msg = `Sync complete! Imported ${addedList} to My List and ${addedDone} to Done Watching from Trakt`;
        showNotification(msg, 'success');

        // Update all visible cards
        try {
            document.querySelectorAll('.movie-card').forEach(card => {
                const addBtn = card.querySelector('.add-to-list-btn');
                const doneBtn = card.querySelector('.done-watching-btn');
                const attr = (addBtn?.getAttribute('onclick') || doneBtn?.getAttribute('onclick') || '') + '';
                const idMatch = attr.match(/,(\s*)(\d+)(\s*),\s*'(movie|tv)'/);
                if (idMatch) {
                    const id = parseInt(idMatch[2], 10);
                    const mediaType = idMatch[4];
                    updateCardListStatus(card, id, mediaType);
                    updateCardDoneStatus(card, id, mediaType);
                }
            });
        } catch(_) {}

        // Re-enable button
        btn.disabled = false;
        btn.innerHTML = originalHTML;
    } catch (e) {
        console.log('[TRAKT RESYNC] Error:', e?.message);
        showNotification('Trakt sync failed: ' + e?.message, 'error');
        // Re-enable button
        const btn = document.getElementById('traktPageResyncLibrary');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-cloud-download-alt"></i> Re-sync Library';
        }
    }
}

// Export additional functions
window.syncWithTraktWatchlist = syncWithTraktWatchlist;
window.syncWithTraktWatched = syncWithTraktWatched;
window.syncWithTraktWatchedEpisode = syncWithTraktWatchedEpisode;
window.syncWithTraktCollection = syncWithTraktCollection;
window.addEpisodeToDoneWatching = addEpisodeToDoneWatching;
window.toggleEpisodeDoneWatching = toggleEpisodeDoneWatching;
window.updateAllDoneButtons = updateAllDoneButtons;
window.manualResyncTraktLibrary = manualResyncTraktLibrary;
