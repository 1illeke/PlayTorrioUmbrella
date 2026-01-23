// Settings Management Functions
// Complete implementation extracted from original index.html

// Global variables for polling
let traktPollingInterval = null;
let rdPollTimer = null;
let adPollTimer = null;
let adPin = '';
let adCheck = '';

// Show settings modal (actually navigates to settings page)
function showSettingsModal() {
    window.location.hash = '#/settings';
}

// Hide settings modal
function hideSettingsModal() {
    const settingsModal = document.getElementById('settingsModal');
    if (settingsModal) {
        settingsModal.style.display = 'none';
        settingsModal.classList.remove('active');
        settingsModal.style.opacity = '0';
        settingsModal.style.pointerEvents = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Load settings from backend
async function loadSettings() {
    try {
        const res = await fetch(`${API_BASE_URL}/settings`);
        if (res.ok) {
            const s = await res.json();
            console.log('[Settings] Loaded settings:', s);
            
            // Update global variables
            useTorrentless = !!s.useTorrentless;
            useDebrid = !!s.useDebrid;
            debridAuth = !!s.debridAuth;
            discordActivityEnabled = s.discordActivity === undefined ? true : s.discordActivity;
            
            // Update UI elements
            updateSettingsUI(s);
            
            return s;
        }
    } catch (error) {
        console.error('[Settings] Error loading settings:', error);
    }
    return null;
}

// Update all settings UI elements
function updateSettingsUI(settings) {
    // Load Jackett API key status
    if (typeof loadCurrentApiKey === 'function') {
        loadCurrentApiKey();
    }
    
    // Load Prowlarr API key status
    if (typeof loadCurrentProwlarrApiKey === 'function') {
        loadCurrentProwlarrApiKey();
    }
    
    // Theme selectors
    const themeSelectors = document.querySelectorAll('#themeSelector');
    themeSelectors.forEach(selector => {
        if (selector) selector.value = currentTheme;
    });
    
    // Fullscreen toggles
    const fullscreenToggles = document.querySelectorAll('#fullscreenToggle');
    if (fullscreenToggles.length > 0 && window.electronAPI && window.electronAPI.getFullscreen) {
        window.electronAPI.getFullscreen().then(result => {
            if (result.success) {
                fullscreenToggles.forEach(toggle => {
                    toggle.checked = result.isFullscreen;
                });
            }
        }).catch(error => {
            console.error('Error loading fullscreen state:', error);
        });
    }
    
    // Auto-update toggle
    const autoUpdate = settings.autoUpdate !== false;
    const autoUpdateToggles = document.querySelectorAll('#autoUpdateToggle');
    autoUpdateToggles.forEach(t => { t.checked = !!autoUpdate; });
    
    // Discord Activity toggle
    const discordActivity = settings.discordActivity === undefined ? true : settings.discordActivity;
    const discordActivityToggles = document.querySelectorAll('#discordActivityToggle');
    discordActivityToggles.forEach(t => { t.checked = !!discordActivity; });
    
    // Torrentless toggles
    const useTorrentlessToggles = document.querySelectorAll('#useTorrentlessToggle, #useStreamingServersToggle');
    useTorrentlessToggles.forEach(toggle => {
        toggle.checked = useTorrentless;
    });
    
    // Jackett URL
    const jackettUrlElements = document.querySelectorAll('#jackettUrl');
    if (jackettUrlElements.length > 0 && settings.jackettUrl) {
        jackettUrlElements.forEach(input => {
            input.value = settings.jackettUrl;
        });
    }
    
    // Prowlarr URL
    const prowlarrUrlElements = document.querySelectorAll('#prowlarrUrl');
    if (prowlarrUrlElements.length > 0 && settings.prowlarrUrl) {
        prowlarrUrlElements.forEach(input => {
            input.value = settings.prowlarrUrl;
        });
    }
    
    // Cache location
    const cacheLocationElements = document.querySelectorAll('#cacheLocation');
    if (cacheLocationElements.length > 0 && settings.cacheLocation) {
        cacheLocationElements.forEach(input => {
            input.value = settings.cacheLocation;
        });
    }
    
    // Debrid settings
    const useDebridToggles = document.querySelectorAll('#useDebridToggle');
    if (useDebridToggles.length > 0 && settings.useDebrid !== undefined) {
        useDebridToggles.forEach(toggle => {
            toggle.checked = !!settings.useDebrid;
        });
    }
    
    const prov = settings.debridProvider || 'realdebrid';
    const debridProviders = document.querySelectorAll('#debridProvider');
    debridProviders.forEach(select => {
        select.value = prov;
    });
    
    const debridStatuses = document.querySelectorAll('#debridStatus');
    debridStatuses.forEach(status => {
        status.textContent = settings.debridAuth ? 'Logged in' : 'Not logged in';
    });
    
    // RD Client ID
    const rdClientIdInputs = document.querySelectorAll('#rdClientId');
    if (rdClientIdInputs.length > 0 && settings.rdClientId) {
        rdClientIdInputs.forEach(input => {
            input.value = settings.rdClientId;
        });
    }
    
    // Load Febbox token from localStorage
    const febboxInputs = document.querySelectorAll('#febboxTokenInput');
    const savedFebboxToken = localStorage.getItem('febboxToken');
    if (savedFebboxToken) {
        febboxInputs.forEach(inp => { try { inp.value = savedFebboxToken; } catch(_){} });
    }
}

// Save settings to backend
async function saveSettings_() {
    console.log('[Settings] saveSettings_ called');
    
    // Get API key from any instance (prefer visible, else any non-empty)
    const apiKeyElements = document.querySelectorAll('#newApiKey');
    let apiKey = '';
    for (const el of apiKeyElements) {
        const val = (el.value || '').trim();
        if (val) {
            apiKey = val;
            if (el.offsetParent !== null) break;
        }
    }
    console.log('[Settings] API key:', apiKey ? 'provided' : 'not provided');
    
    // Get the toggle that is actually checked (either modal or settings page)
    const toggleElements = document.querySelectorAll('#useTorrentlessToggle, #useStreamingServersToggle');
    console.log('[Settings] Found', toggleElements.length, 'torrentless toggles');
    let toggleEl = null;
    for (const el of toggleElements) {
        console.log('[Settings] Toggle visible:', el.offsetParent !== null, 'checked:', el.checked);
        if (el.offsetParent !== null) {
            toggleEl = el;
            break;
        }
    }
    const desiredTorrentless = toggleEl ? !!toggleEl.checked : (typeof useTorrentless !== 'undefined' ? useTorrentless : false);
    console.log('[Settings] Desired torrentless:', desiredTorrentless);
    
    // Get Jackett URL (prefer visible, else any non-empty)
    const jackettUrlElements = document.querySelectorAll('#jackettUrl');
    let jackettUrl = '';
    for (const el of jackettUrlElements) {
        const val = (el.value || '').trim();
        if (val) {
            jackettUrl = val;
            if (el.offsetParent !== null) break;
        }
    }
    console.log('[Settings] Jackett URL:', jackettUrl || 'not provided');
    
    // Get Prowlarr API key (prefer visible, else any non-empty)
    const prowlarrApiKeyElements = document.querySelectorAll('#newProwlarrApiKey');
    let prowlarrApiKey = '';
    for (const el of prowlarrApiKeyElements) {
        const val = (el.value || '').trim();
        if (val) {
            prowlarrApiKey = val;
            if (el.offsetParent !== null) break;
        }
    }
    console.log('[Settings] Prowlarr API key:', prowlarrApiKey ? 'provided' : 'not provided');
    
    // Get Prowlarr URL (prefer visible, else any non-empty)
    const prowlarrUrlElements = document.querySelectorAll('#prowlarrUrl');
    let prowlarrUrl = '';
    for (const el of prowlarrUrlElements) {
        const val = (el.value || '').trim();
        if (val) {
            prowlarrUrl = val;
            if (el.offsetParent !== null) break;
        }
    }
    console.log('[Settings] Prowlarr URL:', prowlarrUrl || 'not provided');
    
    // Get cache location (prefer visible, else any non-empty)
    const cacheLocationElements = document.querySelectorAll('#cacheLocation');
    let cacheLocation = '';
    for (const el of cacheLocationElements) {
        const val = (el.value || '').trim();
        if (val) {
            cacheLocation = val;
            if (el.offsetParent !== null) break;
        }
    }
    console.log('[Settings] Cache location:', cacheLocation || 'not provided');

    // Get Auto-Updater setting (prefer visible)
    const autoUpdateToggles = document.querySelectorAll('#autoUpdateToggle');
    let autoUpdateEnabled = true;
    for (const el of autoUpdateToggles) {
        if (el.offsetParent !== null) {
            autoUpdateEnabled = !!el.checked;
            break;
        }
    }
    console.log('[Settings] Auto update:', autoUpdateEnabled);
    
    // Get Discord Activity setting (prefer visible)
    const discordActivityToggles = document.querySelectorAll('#discordActivityToggle');
    let newDiscordActivityEnabled = true;
    for (const el of discordActivityToggles) {
        if (el.offsetParent !== null) {
            newDiscordActivityEnabled = !!el.checked;
            break;
        }
    }
    console.log('[Settings] Discord activity:', newDiscordActivityEnabled);
    
    // Handle fullscreen toggle
    const fullscreenToggles = document.querySelectorAll('#fullscreenToggle');
    let fullscreenToggle = null;
    for (const el of fullscreenToggles) {
        if (el.offsetParent !== null) {
            fullscreenToggle = el;
            break;
        }
    }
    
    if (fullscreenToggle && window.electronAPI && window.electronAPI.setFullscreen) {
        try {
            const result = await window.electronAPI.setFullscreen(fullscreenToggle.checked);
            if (!result.success) {
                console.error('Failed to set fullscreen:', result.message);
                showNotification('Failed to change fullscreen mode');
            }
        } catch (error) {
            console.error('Error setting fullscreen:', error);
            showNotification('Error changing fullscreen mode');
        }
    }
    
    // Handle UI mode change
    const uiModeNewElements = document.querySelectorAll('#uiModeNew');
    const uiModeOldElements = document.querySelectorAll('#uiModeOld');
    let uiModeOld = null;
    
    for (const el of uiModeOldElements) {
        if (el.offsetParent !== null) {
            uiModeOld = el;
            break;
        }
    }
    
    let selectedUIMode = 'new';
    if (uiModeOld && uiModeOld.checked) {
        selectedUIMode = 'old';
    }
    console.log('[Settings] UI mode:', selectedUIMode);
    
    // Apply UI mode change immediately
    if (typeof currentUIMode !== 'undefined' && selectedUIMode !== currentUIMode) {
        if (typeof applyUIMode === 'function') {
            applyUIMode(selectedUIMode);
        }
    }

    try {
        // Build settings object
        const settings = { 
            useTorrentless: desiredTorrentless, 
            autoUpdate: !!autoUpdateEnabled,
            discordActivity: !!newDiscordActivityEnabled
        };
        if (jackettUrl) settings.jackettUrl = jackettUrl;
        if (prowlarrUrl) settings.prowlarrUrl = prowlarrUrl;
        if (cacheLocation) settings.cacheLocation = cacheLocation;
        
        console.log('[Settings] Saving settings:', settings);
        
        // Persist all settings
        const response = await fetch(`${API_BASE_URL}/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });
        
        console.log('[Settings] Save response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Settings] Save failed:', errorText);
            throw new Error(`Failed to save settings: ${response.status}`);
        }
        
        if (typeof useTorrentless !== 'undefined') useTorrentless = desiredTorrentless;

        // Update the global cached Discord activity flag
        if (typeof discordActivityEnabled !== 'undefined') {
            discordActivityEnabled = !!newDiscordActivityEnabled;
            
            // If Discord activity was disabled, clear the presence immediately
            if (!discordActivityEnabled && typeof clearDiscordPresence === 'function') {
                console.log('[Settings] Discord activity disabled, clearing presence');
                await clearDiscordPresence();
            }
        }

        // If an API key was provided, attempt to save it
        if (apiKey) {
            console.log('[Settings] Saving API key');
            const response = await fetch(`${API_BASE_URL}/set-api-key`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey })
            });
            let apiResult = null;
            try {
                apiResult = await response.json();
            } catch(_) { apiResult = null; }
            
            if (response.ok) {
                if (typeof hasApiKey !== 'undefined') hasApiKey = true;
                if (typeof loadCurrentApiKey === 'function') await loadCurrentApiKey();
                showNotification('Settings saved. Jackett API key updated.');
                // Clear ALL API key inputs after success
                document.querySelectorAll('#newApiKey').forEach(el => { el.value = ''; });
            } else {
                showNotification(apiResult?.error || 'Failed to update Jackett API key');
            }
        }
        
        // If Prowlarr API key was provided, attempt to save it
        if (prowlarrApiKey) {
            console.log('[Settings] Saving Prowlarr API key');
            const response = await fetch(`${API_BASE_URL}/set-prowlarr-api-key`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey: prowlarrApiKey })
            });
            let apiResult = null;
            try {
                apiResult = await response.json();
            } catch(_) { apiResult = null; }
            
            if (response.ok) {
                if (typeof hasProwlarrApiKey !== 'undefined') hasProwlarrApiKey = true;
                if (typeof loadCurrentProwlarrApiKey === 'function') await loadCurrentProwlarrApiKey();
                showNotification('Settings saved. Prowlarr API key updated.');
                // Clear ALL Prowlarr API key inputs after success
                document.querySelectorAll('#newProwlarrApiKey').forEach(el => { el.value = ''; });
            } else {
                showNotification(apiResult?.error || 'Failed to update Prowlarr API key');
            }
        }
        
        if (!apiKey && !prowlarrApiKey) {
            showNotification('Settings saved.');
        }
        
        console.log('[Settings] Save completed successfully');
    } catch (error) {
        console.error('[Settings] Error saving settings:', error);
        showNotification('Error saving settings: ' + error.message, 'error');
    } finally {
        // Check if we're on settings page or in modal
        if (window.location.hash === '#/settings') {
            // Stay on settings page
        } else {
            hideSettingsModal();
        }
    }
}

// ===== TRAKT INTEGRATION =====

// Start Trakt authentication flow
async function startTraktLogin() {
    try {
        const traktLoginBtns = document.querySelectorAll('#traktLogin');
        traktLoginBtns.forEach(btn => {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
        });

        const response = await fetch(`${API_BASE_URL}/trakt/device/code`, { method: 'POST' });
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to get device code');
        }

        const traktCodePanels = document.querySelectorAll('#traktCodePanel');
        const traktUserCodeEls = document.querySelectorAll('#traktUserCode');
        traktCodePanels.forEach(panel => panel.style.display = 'block');
        traktUserCodeEls.forEach(el => el.textContent = data.user_code);
        
        const traktVerifyUrlEls = document.querySelectorAll('#traktVerifyUrl');
        const traktLoginStatusEls = document.querySelectorAll('#traktLoginStatus');
        traktVerifyUrlEls.forEach(el => el.href = data.verification_url);
        traktLoginStatusEls.forEach(el => el.textContent = 'Waiting for authorization…');

        startTraktPolling(data.device_code, data.interval || 5);

    } catch (error) {
        console.error('[TRAKT] Login error:', error);
        showNotification('Failed to start Trakt login: ' + error.message, 'error');
        resetTraktLogin();
    }
}

function startTraktPolling(deviceCode, interval) {
    if (traktPollingInterval) {
        clearInterval(traktPollingInterval);
    }

    traktPollingInterval = setInterval(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/trakt/device/verify`, { method: 'POST' });
            const data = await response.json();

            if (data.success) {
                clearInterval(traktPollingInterval);
                traktPollingInterval = null;
                const traktCodePanels = document.querySelectorAll('#traktCodePanel');
                traktCodePanels.forEach(panel => panel.style.display = 'none');
                showNotification('Successfully connected to Trakt!', 'success');
                if (typeof checkTraktStatus === 'function') await checkTraktStatus();
                
                // Force import Trakt data to My List and Done Watching
                if (typeof forceImportTraktData === 'function') {
                    console.log('[TRAKT] Starting import after successful login...');
                    try {
                        const result = await forceImportTraktData();
                        if (result.watchlistAdded > 0 || result.historyAdded > 0) {
                            showNotification(`Imported ${result.watchlistAdded} watchlist + ${result.historyAdded} history items from Trakt!`, 'success');
                        }
                    } catch (e) {
                        console.error('[TRAKT] Import error:', e);
                    }
                }
                
                resetTraktLogin();
            } else if (data.error === 'pending') {
                const traktLoginStatusEls = document.querySelectorAll('#traktLoginStatus');
                traktLoginStatusEls.forEach(el => el.textContent = 'Waiting for authorization…');
            } else {
                throw new Error(data.error || 'Verification failed');
            }
        } catch (error) {
            console.error('[TRAKT] Polling error:', error);
            clearInterval(traktPollingInterval);
            traktPollingInterval = null;
            showNotification('Authentication failed: ' + error.message, 'error');
            resetTraktLogin();
        }
    }, interval * 1000);
}

function resetTraktLogin() {
    const traktLoginBtns = document.querySelectorAll('#traktLogin');
    const traktCodePanels = document.querySelectorAll('#traktCodePanel');
    
    traktLoginBtns.forEach(btn => {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Connect to Trakt';
    });
    traktCodePanels.forEach(panel => panel.style.display = 'none');
    
    if (traktPollingInterval) {
        clearInterval(traktPollingInterval);
        traktPollingInterval = null;
    }
}

function cancelTraktLogin() {
    resetTraktLogin();
    showNotification('Trakt login cancelled', 'info');
}

async function disconnectTrakt() {
    try {
        const response = await fetch(`${API_BASE_URL}/trakt/logout`, { method: 'POST' });
        const data = await response.json();

        if (data.success) {
            document.querySelectorAll('#traktCodePanel').forEach(p => p.style.display = 'none');
            if (typeof showTraktDisconnected === 'function') showTraktDisconnected();
            if (typeof checkTraktStatus === 'function') await checkTraktStatus();
            if (typeof updateTraktPageStatus === 'function') await updateTraktPageStatus();
            showNotification('Disconnected from Trakt', 'success');
        } else {
            throw new Error(data.error || 'Failed to logout');
        }
    } catch (error) {
        console.error('[TRAKT] Logout error:', error);
        showNotification('Failed to disconnect: ' + error.message, 'error');
    }
}

// ===== REAL-DEBRID INTEGRATION =====

function stopRdPolling() { 
    if (rdPollTimer) { 
        clearInterval(rdPollTimer); 
        rdPollTimer = null; 
    } 
}

async function beginRdDeviceLogin() {
    try {
        const rdClientIdInput = document.querySelector('#rdClientId');
        const clientId = (rdClientIdInput?.value || '').trim();
        const url = `${API_BASE_URL}/debrid/rd/device-code${clientId ? `?client_id=${encodeURIComponent(clientId)}` : ''}`;
        const r = await fetch(url);
        if (!r.ok) {
            let msg = 'RD device-code start failed';
            try { const t = await r.json(); if (t?.error) msg = t.error; } catch { try { msg = await r.text(); } catch {} }
            const rdLoginStatusEl = document.querySelector('#rdLoginStatus');
            if (rdLoginStatusEl) rdLoginStatusEl.textContent = 'Error starting login';
            showNotification(msg);
            return;
        }
        const j = await r.json();
        const rdCodePanel = document.querySelector('#rdCodePanel');
        const rdUserCodeEl = document.querySelector('#rdUserCode');
        const rdVerifyUrlEl = document.querySelector('#rdVerifyUrl');
        const rdLoginStatusEl = document.querySelector('#rdLoginStatus');
        
        if (rdCodePanel) rdCodePanel.style.display = 'block';
        if (rdUserCodeEl) rdUserCodeEl.textContent = j.user_code || '----';
        if (rdVerifyUrlEl) {
            rdVerifyUrlEl.textContent = j.verification_url || 'https://real-debrid.com/device';
            rdVerifyUrlEl.href = j.verification_url || 'https://real-debrid.com/device';
        }
        if (rdLoginStatusEl) rdLoginStatusEl.textContent = 'Waiting for approval…';
        
        const intervalMs = Math.max(3, Number(j.interval || 5)) * 1000;
        const deviceCode = j.device_code;
        
        stopRdPolling();
        rdPollTimer = setInterval(async () => {
            try {
                const pr = await fetch(`${API_BASE_URL}/debrid/rd/poll`, {
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ device_code: deviceCode, client_id: clientId || undefined })
                });
                if (pr.ok) {
                    stopRdPolling();
                    if (rdLoginStatusEl) rdLoginStatusEl.textContent = 'Logged in!';
                    document.querySelectorAll('#debridStatus').forEach(status => {
                        status.textContent = 'Logged in';
                    });
                    if (typeof debridAuth !== 'undefined') debridAuth = true;
                    showNotification('Real-Debrid connected');
                    setTimeout(() => { if (rdCodePanel) rdCodePanel.style.display = 'none'; }, 800);
                } else {
                    const txt = await pr.text();
                    if (/expired|invalid/i.test(txt)) {
                        stopRdPolling();
                        if (rdLoginStatusEl) rdLoginStatusEl.textContent = 'Code expired. Try again.';
                    }
                }
            } catch (_) {}
        }, intervalMs);
    } catch (_) {
        showNotification('Failed to start device login');
    }
}

// ===== ALLDEBRID INTEGRATION =====

function stopAdPolling() { 
    if (adPollTimer) { 
        clearInterval(adPollTimer); 
        adPollTimer = null; 
    } 
}

async function beginAdPinLogin() {
    try {
        if (typeof ensureDebridState === 'function') await ensureDebridState();
    } catch {}
    
    if (typeof useDebrid !== 'undefined' && useDebrid && 
        typeof debridProvider !== 'undefined' && debridProvider === 'alldebrid' && 
        typeof debridAuth !== 'undefined' && debridAuth) {
        showNotification('Already logged in to AllDebrid');
        return;
    }
    
    try {
        const r = await fetch(`${API_BASE_URL}/debrid/ad/pin`);
        const j = await r.json();
        if (r.ok && j.pin && j.check) {
            adPin = j.pin; 
            adCheck = j.check;
            const adPinPanel = document.querySelector('#adPinPanel');
            const adPinCodeEl = document.querySelector('#adPinCode');
            const adUserUrlEl = document.querySelector('#adUserUrl');
            const adLoginStatusEl = document.querySelector('#adLoginStatus');
            
            if (adPinPanel) adPinPanel.style.display = 'block';
            if (adPinCodeEl) adPinCodeEl.textContent = adPin;
            if (adUserUrlEl) adUserUrlEl.href = j.user_url || 'https://alldebrid.com/pin/';
            if (adLoginStatusEl) adLoginStatusEl.textContent = 'Waiting…';
            
            stopAdPolling();
            adPollTimer = setInterval(async () => {
                try {
                    const pr = await fetch(`${API_BASE_URL}/debrid/ad/check`, { 
                        method: 'POST', 
                        headers: { 'Content-Type': 'application/json' }, 
                        body: JSON.stringify({ pin: adPin, check: adCheck }) 
                    });
                    const pj = await pr.json();
                    if (pr.ok && pj.success) {
                        stopAdPolling();
                        document.querySelectorAll('#debridStatus').forEach(status => {
                            status.textContent = 'Logged in';
                        });
                        if (typeof debridAuth !== 'undefined') debridAuth = true;
                        if (adLoginStatusEl) adLoginStatusEl.textContent = 'Logged in!';
                        showNotification('AllDebrid connected');
                        setTimeout(() => { if (adPinPanel) adPinPanel.style.display = 'none'; }, 800);
                    } else if (pr.ok) {
                        // keep waiting
                    } else {
                        stopAdPolling();
                        if (adLoginStatusEl) adLoginStatusEl.textContent = pj?.error || 'PIN expired';
                    }
                } catch (_) {}
            }, 5000);
        } else {
            showNotification(j?.error || 'Failed to start AllDebrid PIN');
        }
    } catch (_) {
        showNotification('Failed to start AllDebrid PIN');
    }
}

// ===== SETTINGS PAGE INITIALIZATION =====

function initializeSettingsPage() {
    console.log('[Settings] Initializing settings page');
    
    // Show Player tab on all platforms
    const nodempvTab = document.getElementById('nodempvTab');
    if (nodempvTab) {
        nodempvTab.style.display = '';
    }
    
    // Show Player content section
    const nodempvContent = document.getElementById('nodempvContent');
    if (nodempvContent) {
        // Don't show by default, just make it available
    }
    
    // Settings tab navigation
    const settingsTabs = document.querySelectorAll('.settings-tab');
    const settingsSections = document.querySelectorAll('.settings-section');
    
    console.log('[Settings] Found', settingsTabs.length, 'tabs and', settingsSections.length, 'sections');
    
    settingsTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetSection = tab.getAttribute('data-section');
            console.log('[Settings] Tab clicked:', targetSection);
            
            // Remove active class from all tabs and sections
            settingsTabs.forEach(t => t.classList.remove('active'));
            settingsSections.forEach(s => s.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding section
            tab.classList.add('active');
            const targetElement = document.getElementById(`${targetSection}Content`);
            if (targetElement) {
                targetElement.classList.add('active');
                console.log('[Settings] Showing section:', targetElement.id);
            }
        });
    });
    
    // Save Settings button (page)
    const saveSettingsPageBtn = document.getElementById('saveSettingsPage');
    if (saveSettingsPageBtn) {
        saveSettingsPageBtn.addEventListener('click', async () => {
            console.log('[Settings] Save button clicked (page)');
            await saveSettings_();
        });
    }
    
    // Cancel Settings button (page)
    const cancelSettingsPageBtn = document.getElementById('cancelSettingsPage');
    if (cancelSettingsPageBtn) {
        cancelSettingsPageBtn.addEventListener('click', () => {
            window.history.back();
        });
    }
    
    // Save Settings button (modal)
    const saveSettingsBtn = document.getElementById('saveSettings');
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', async () => {
            console.log('[Settings] Save button clicked (modal)');
            await saveSettings_();
        });
    }
    
    // Cancel Settings button (modal)
    const cancelSettingsBtn = document.getElementById('cancelSettings');
    if (cancelSettingsBtn) {
        cancelSettingsBtn.addEventListener('click', () => {
            hideSettingsModal();
        });
    }
    
    // Settings close button (modal)
    const settingsCloseBtn = document.getElementById('settingsClose');
    if (settingsCloseBtn) {
        settingsCloseBtn.addEventListener('click', () => {
            hideSettingsModal();
        });
    }
    
    // Select cache folder button
    const selectCacheBtns = document.querySelectorAll('#selectCacheBtn');
    selectCacheBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            if (window.electronAPI && window.electronAPI.selectCacheFolder) {
                try {
                    const result = await window.electronAPI.selectCacheFolder();
                    if (result.success && result.path) {
                        document.querySelectorAll('#cacheLocation').forEach(input => {
                            input.value = result.path;
                        });
                    }
                } catch (error) {
                    console.error('[Settings] Error selecting cache folder:', error);
                }
            }
        });
    });
    
    // Theme selector - with auto-save to backend
    const themeSelectors = document.querySelectorAll('#themeSelector');
    themeSelectors.forEach(selector => {
        selector.addEventListener('change', async (e) => {
            const theme = e.target.value;
            if (typeof applyTheme === 'function') {
                applyTheme(theme);
            }
            // Also save to backend
            try {
                await fetch(`${API_BASE_URL}/settings`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ theme: theme })
                });
                console.log('[Settings] Theme saved:', theme);
            } catch (err) {
                console.error('[Settings] Error saving theme:', err);
            }
        });
    });
    
    // Debrid provider dropdown - show/hide provider-specific sections
    const debridProviders = document.querySelectorAll('#debridProvider');
    
    // Function to update debrid UI based on provider
    function updateDebridProviderUI(provider) {
        // Hide all provider-specific sections
        const rdAuthSection = document.getElementById('rdAuthSection');
        const adSection = document.getElementById('adSection');
        const tbSection = document.getElementById('tbSection');
        const pmSection = document.getElementById('pmSection');
        
        // Also handle legacy elements (when rdAuthSection wrapper doesn't exist)
        const rdClientIdGroup = document.getElementById('rdClientIdGroup');
        const rdButtons = document.getElementById('rdButtons');
        const rdCodePanel = document.getElementById('rdCodePanel');
        const rdTokenGroup = document.getElementById('rdTokenGroup');
        const rdTokenButtons = document.getElementById('rdTokenButtons');
        
        // Hide all sections first
        if (rdAuthSection) rdAuthSection.style.display = 'none';
        if (adSection) adSection.style.display = 'none';
        if (tbSection) tbSection.style.display = 'none';
        if (pmSection) pmSection.style.display = 'none';
        
        // Legacy elements - hide all RD-specific elements
        if (!rdAuthSection) {
            if (rdClientIdGroup) rdClientIdGroup.style.display = 'none';
            if (rdButtons) rdButtons.style.display = 'none';
            if (rdTokenGroup) rdTokenGroup.style.display = 'none';
            if (rdTokenButtons) rdTokenButtons.style.display = 'none';
        }
        
        // Show the appropriate section based on provider
        switch (provider) {
            case 'realdebrid':
                if (rdAuthSection) {
                    rdAuthSection.style.display = 'block';
                } else {
                    // Legacy fallback - show individual RD elements
                    if (rdClientIdGroup) rdClientIdGroup.style.display = 'block';
                    if (rdButtons) rdButtons.style.display = 'flex';
                    if (rdTokenGroup) rdTokenGroup.style.display = 'block';
                    if (rdTokenButtons) rdTokenButtons.style.display = 'flex';
                }
                break;
            case 'alldebrid':
                if (adSection) adSection.style.display = 'block';
                break;
            case 'torbox':
                if (tbSection) tbSection.style.display = 'block';
                break;
            case 'premiumize':
                if (pmSection) pmSection.style.display = 'block';
                break;
        }
    }
    
    debridProviders.forEach(select => {
        // Initialize UI on page load
        updateDebridProviderUI(select.value);
        
        select.addEventListener('change', async (e) => {
            const provider = e.target.value;
            
            // Update UI immediately
            updateDebridProviderUI(provider);
            
            try {
                await fetch(`${API_BASE_URL}/settings`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ debridProvider: provider })
                });
                console.log('[Settings] Debrid provider changed to:', provider);
                
                // Sync all provider selects
                debridProviders.forEach(s => {
                    if (s !== select) s.value = provider;
                });
            } catch (error) {
                console.error('[Settings] Error changing debrid provider:', error);
            }
        });
    });
    
    // Use Debrid toggle - also enable/disable config container
    const useDebridToggles = document.querySelectorAll('#useDebridToggle');
    
    function updateDebridConfigVisibility(enabled) {
        // Try new container first
        const debridConfigContainer = document.getElementById('debridConfigContainer');
        if (debridConfigContainer) {
            if (enabled) {
                debridConfigContainer.classList.remove('opacity-50', 'pointer-events-none');
                debridConfigContainer.style.opacity = '1';
                debridConfigContainer.style.pointerEvents = 'auto';
            } else {
                debridConfigContainer.classList.add('opacity-50', 'pointer-events-none');
                debridConfigContainer.style.opacity = '0.5';
                debridConfigContainer.style.pointerEvents = 'none';
            }
        }
        
        // Also handle elements that come after the toggle (legacy support)
        const debridSection = document.getElementById('debridSection');
        if (debridSection && !debridConfigContainer) {
            // Find all form-groups and provider sections after the toggle
            const allChildren = debridSection.querySelectorAll('.form-group, #rdClientIdGroup, #rdButtons, #rdCodePanel, #rdTokenGroup, #rdTokenButtons, #adSection, #tbSection, #pmSection');
            allChildren.forEach(el => {
                if (enabled) {
                    el.style.opacity = '1';
                    el.style.pointerEvents = 'auto';
                } else {
                    el.style.opacity = '0.5';
                    el.style.pointerEvents = 'none';
                }
            });
        }
    }
    
    useDebridToggles.forEach(toggle => {
        // Initialize visibility on page load
        updateDebridConfigVisibility(toggle.checked);
        
        toggle.addEventListener('change', async (e) => {
            const enabled = e.target.checked;
            
            // Update UI immediately
            updateDebridConfigVisibility(enabled);
            
            try {
                await fetch(`${API_BASE_URL}/settings`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ useDebrid: enabled })
                });
                console.log('[Settings] Use Debrid changed to:', enabled);
                useDebridToggles.forEach(t => { 
                    t.checked = enabled;
                    updateDebridConfigVisibility(enabled);
                });
                
                // Update global variable
                if (typeof useDebrid !== 'undefined') useDebrid = enabled;
            } catch (error) {
                console.error('[Settings] Error changing use debrid:', error);
            }
        });
    });
    
    // Streaming servers toggle
    const streamingServerToggles = document.querySelectorAll('#useStreamingServersToggle, #useTorrentlessToggle');
    streamingServerToggles.forEach(toggle => {
        toggle.addEventListener('change', async (e) => {
            const enabled = e.target.checked;
            try {
                await fetch(`${API_BASE_URL}/settings`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ useTorrentless: enabled })
                });
                console.log('[Settings] Streaming servers changed to:', enabled);
                streamingServerToggles.forEach(t => { t.checked = enabled; });
            } catch (error) {
                console.error('[Settings] Error changing streaming servers:', error);
            }
        });
    });
    
    // Febbox token save button
    const saveFebboxBtns = document.querySelectorAll('#saveFebboxToken');
    saveFebboxBtns.forEach(btn => btn.addEventListener('click', () => {
        const scope = btn.closest('.settings-card-body, .api-input-group, .form-group') || document;
        let input = scope.querySelector('#febboxTokenInput');
        if (!input) {
            const febboxInputs = document.querySelectorAll('#febboxTokenInput');
            for (const el of febboxInputs) { 
                if (el.offsetParent !== null) { 
                    input = el; 
                    break; 
                } 
            }
        }
        const token = (input?.value || '').trim();
        if (token) {
            localStorage.setItem('febboxToken', token);
            document.querySelectorAll('#febboxTokenInput').forEach(inp => { 
                try { inp.value = token; } catch(_){} 
            });
            showNotification('Febbox token saved successfully', 'success');
        } else {
            localStorage.removeItem('febboxToken');
            document.querySelectorAll('#febboxTokenInput').forEach(inp => { 
                try { inp.value = ''; } catch(_){} 
            });
            showNotification('Febbox token cleared, using default', 'success');
        }
    }));
    
    // Trakt login button
    const traktLoginBtns = document.querySelectorAll('#traktLogin');
    traktLoginBtns.forEach(btn => {
        btn.addEventListener('click', startTraktLogin);
    });
    
    // Trakt disconnect button
    const traktDisconnectBtns = document.querySelectorAll('#traktDisconnect');
    traktDisconnectBtns.forEach(btn => {
        btn.addEventListener('click', disconnectTrakt);
    });
    
    // Trakt copy code button
    const traktCopyCodeBtns = document.querySelectorAll('#traktCopyCode');
    traktCopyCodeBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            const traktUserCodeEl = document.querySelector('#traktUserCode');
            try { 
                await navigator.clipboard.writeText(traktUserCodeEl?.textContent || ''); 
                showNotification('Code copied'); 
            } catch(_) {}
        });
    });
    
    // Trakt open verify button
    const traktOpenVerifyBtns = document.querySelectorAll('#traktOpenVerify');
    traktOpenVerifyBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            const traktVerifyUrlEl = document.querySelector('#traktVerifyUrl');
            const href = traktVerifyUrlEl?.href || 'https://trakt.tv/activate';
            if (window.electronAPI?.openExternal) {
                await window.electronAPI.openExternal(href);
            } else {
                window.open(href, '_blank');
            }
        });
    });
    
    // Trakt cancel login button
    const traktCancelLoginBtns = document.querySelectorAll('#traktCancelLogin');
    traktCancelLoginBtns.forEach(btn => {
        btn.addEventListener('click', cancelTraktLogin);
    });
    
    // Real-Debrid device login button
    const rdDeviceLoginBtns = document.querySelectorAll('#rdDeviceLogin');
    rdDeviceLoginBtns.forEach(btn => {
        btn.addEventListener('click', beginRdDeviceLogin);
    });
    
    // RD open verify button
    const rdOpenVerifyBtns = document.querySelectorAll('#rdOpenVerify');
    rdOpenVerifyBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            const rdVerifyUrlEl = document.querySelector('#rdVerifyUrl');
            const href = rdVerifyUrlEl?.href || 'https://real-debrid.com/device';
            if (window.electronAPI?.openExternal) {
                await window.electronAPI.openExternal(href);
            } else {
                window.open(href, '_blank');
            }
        });
    });
    
    // RD copy code button
    const rdCopyCodeBtns = document.querySelectorAll('#rdCopyCode');
    rdCopyCodeBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            const rdUserCodeEl = document.querySelector('#rdUserCode');
            try { 
                await navigator.clipboard.writeText(rdUserCodeEl?.textContent || ''); 
                showNotification('Code copied'); 
            } catch(_) {}
        });
    });
    
    // RD cancel login button
    const rdCancelLoginBtns = document.querySelectorAll('#rdCancelLogin');
    rdCancelLoginBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            stopRdPolling(); 
            const rdCodePanel = document.querySelector('#rdCodePanel');
            if (rdCodePanel) rdCodePanel.style.display = 'none';
        });
    });
    
    // AllDebrid PIN login button
    const adStartPinBtns = document.querySelectorAll('#adStartPin');
    adStartPinBtns.forEach(btn => {
        btn.addEventListener('click', beginAdPinLogin);
    });
    
    // AD open user URL button
    const adOpenUserUrlBtns = document.querySelectorAll('#adOpenUserUrl');
    adOpenUserUrlBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            const adUserUrlEl = document.querySelector('#adUserUrl');
            const href = adUserUrlEl?.href || 'https://alldebrid.com/pin/';
            if (window.electronAPI?.openExternal) {
                await window.electronAPI.openExternal(href);
            } else {
                window.open(href, '_blank');
            }
        });
    });
    
    // AD copy PIN button
    const adCopyPinBtns = document.querySelectorAll('#adCopyPin');
    adCopyPinBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            const adPinCodeEl = document.querySelector('#adPinCode');
            try { 
                await navigator.clipboard.writeText(adPinCodeEl?.textContent || ''); 
                showNotification('PIN copied'); 
            } catch(_) {}
        });
    });
    
    // AD cancel PIN button
    const adCancelPinBtns = document.querySelectorAll('#adCancelPin');
    adCancelPinBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            stopAdPolling(); 
            const adPinPanel = document.querySelector('#adPinPanel');
            if (adPinPanel) adPinPanel.style.display = 'none';
        });
    });
    
    // AllDebrid API Key save button
    const adSaveApiKeyBtns = document.querySelectorAll('#adSaveApiKey');
    adSaveApiKeyBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            const adApiKeyInput = document.querySelector('#adApiKey');
            const apiKey = (adApiKeyInput?.value || '').trim();
            if (!apiKey) {
                showNotification('Please enter an API key');
                return;
            }
            try {
                const res = await fetch(`${API_BASE_URL}/debrid/ad/apikey`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ apikey: apiKey })
                });
                if (res.ok) {
                    adApiKeyInput.value = '';
                    document.querySelectorAll('#debridStatus').forEach(s => s.textContent = 'Logged in');
                    if (typeof debridAuth !== 'undefined') debridAuth = true;
                    showNotification('AllDebrid API key saved');
                } else {
                    showNotification('Failed to save API key');
                }
            } catch (e) {
                showNotification('Error saving API key');
            }
        });
    });
    
    // AllDebrid logout button
    const adClearApiKeyBtns = document.querySelectorAll('#adClearApiKey');
    adClearApiKeyBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            try {
                await fetch(`${API_BASE_URL}/debrid/ad/apikey`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ apikey: '' })
                });
                document.querySelectorAll('#debridStatus').forEach(s => s.textContent = 'Not logged in');
                if (typeof debridAuth !== 'undefined') debridAuth = false;
                showNotification('AllDebrid logged out');
            } catch (e) {
                showNotification('Error logging out');
            }
        });
    });
    
    // TorBox token save button
    const tbSaveTokenBtns = document.querySelectorAll('#tbSaveToken');
    tbSaveTokenBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            const tbTokenInput = document.querySelector('#tbToken');
            const token = (tbTokenInput?.value || '').trim();
            if (!token) {
                showNotification('Please enter a token');
                return;
            }
            try {
                const res = await fetch(`${API_BASE_URL}/debrid/tb/token`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: token })
                });
                if (res.ok) {
                    tbTokenInput.value = '';
                    document.querySelectorAll('#debridStatus').forEach(s => s.textContent = 'Logged in');
                    if (typeof debridAuth !== 'undefined') debridAuth = true;
                    showNotification('TorBox token saved');
                } else {
                    showNotification('Failed to save token');
                }
            } catch (e) {
                showNotification('Error saving token');
            }
        });
    });
    
    // TorBox logout button
    const tbClearTokenBtns = document.querySelectorAll('#tbClearToken');
    tbClearTokenBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            try {
                await fetch(`${API_BASE_URL}/debrid/tb/token`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: '' })
                });
                document.querySelectorAll('#debridStatus').forEach(s => s.textContent = 'Not logged in');
                if (typeof debridAuth !== 'undefined') debridAuth = false;
                showNotification('TorBox logged out');
            } catch (e) {
                showNotification('Error logging out');
            }
        });
    });
    
    // Premiumize API key save button
    const pmSaveApiKeyBtns = document.querySelectorAll('#pmSaveApiKey');
    pmSaveApiKeyBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            const pmApiKeyInput = document.querySelector('#pmApiKey');
            const apiKey = (pmApiKeyInput?.value || '').trim();
            if (!apiKey) {
                showNotification('Please enter an API key');
                return;
            }
            try {
                const res = await fetch(`${API_BASE_URL}/debrid/pm/apikey`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ apikey: apiKey })
                });
                if (res.ok) {
                    pmApiKeyInput.value = '';
                    document.querySelectorAll('#debridStatus').forEach(s => s.textContent = 'Logged in');
                    if (typeof debridAuth !== 'undefined') debridAuth = true;
                    showNotification('Premiumize API key saved');
                } else {
                    showNotification('Failed to save API key');
                }
            } catch (e) {
                showNotification('Error saving API key');
            }
        });
    });
    
    // Premiumize logout button
    const pmClearApiKeyBtns = document.querySelectorAll('#pmClearApiKey');
    pmClearApiKeyBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            try {
                await fetch(`${API_BASE_URL}/debrid/pm/apikey`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ apikey: '' })
                });
                document.querySelectorAll('#debridStatus').forEach(s => s.textContent = 'Not logged in');
                if (typeof debridAuth !== 'undefined') debridAuth = false;
                showNotification('Premiumize logged out');
            } catch (e) {
                showNotification('Error logging out');
            }
        });
    });
    
    // Jackett tutorial button
    const jackettTutorialBtns = document.querySelectorAll('#jackettTutorialBtn');
    jackettTutorialBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            const url = 'https://www.youtube.com/watch?v=3igLReZFFzg&t';
            if (window.electronAPI?.openExternal) {
                const res = await window.electronAPI.openExternal(url);
                if (!res?.success) {
                    showNotification('Failed to open browser. Copying link to clipboard.');
                    try { await navigator.clipboard.writeText(url); } catch {}
                }
            } else {
                showNotification('Copying link to clipboard. Open it in your browser.');
                try { await navigator.clipboard.writeText(url); } catch {}
            }
        });
    });
    
    // ===== TORRENT ENGINE SETTINGS =====
    const torrentEngineSelect = document.getElementById('torrentEngineSelect');
    const engineInstancesContainer = document.getElementById('engineInstancesContainer');
    const engineInstancesSlider = document.getElementById('engineInstancesSlider');
    const engineInstanceLabel = document.getElementById('engineInstanceLabel');
    const engineDescription = document.getElementById('engineDescription');
    const engineStatus = document.getElementById('engineStatus');
    const engineStatusText = document.getElementById('engineStatusText');
    
    const engineDescriptions = {
        stremio: "⚡ Stremio's engine provides reliable streaming with built-in transcoding support.",
        webtorrent: "🌐 WebTorrent uses WebRTC for browser-compatible P2P streaming. Single instance only.",
        torrentstream: "🚀 TorrentStream is optimized for video streaming with multi-instance swarm support.",
        hybrid: "🔥 Combines WebTorrent and TorrentStream for maximum peer connectivity."
    };
    
    function updateEngineUI(engine, instances) {
        if (engineDescription) {
            engineDescription.textContent = engineDescriptions[engine] || engineDescriptions.stremio;
        }
        if (engineInstancesContainer) {
            // Show instances slider for non-stremio, non-webtorrent engines
            engineInstancesContainer.style.display = (engine !== 'stremio' && engine !== 'webtorrent') ? 'block' : 'none';
        }
        if (engineInstanceLabel) {
            engineInstanceLabel.textContent = instances;
        }
    }
    
    function showEngineStatus(message, isError = false) {
        if (engineStatus && engineStatusText) {
            engineStatus.style.display = 'block';
            engineStatus.style.background = isError ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)';
            engineStatusText.style.color = isError ? '#f87171' : '#4ade80';
            engineStatusText.innerHTML = message;
            // Hide after 3 seconds
            setTimeout(() => { engineStatus.style.display = 'none'; }, 3000);
        }
    }
    
    // Load current engine config
    async function loadEngineConfig() {
        try {
            const res = await fetch(`${API_BASE_URL.replace('/api', '')}/api/torrent-engine/config`);
            if (!res.ok) throw new Error('Failed to fetch config');
            const config = await res.json();
            console.log('[Engine] Loaded config:', config);
            if (torrentEngineSelect) {
                // Always default to 'stremio' if no engine is set
                torrentEngineSelect.value = config.engine || 'stremio';
            }
            if (engineInstancesSlider) {
                engineInstancesSlider.value = config.instances || 1;
            }
            // Always default to 'stremio' if no engine is set
            updateEngineUI(config.engine || 'stremio', config.instances || 1);
        } catch (e) {
            console.warn('[Engine] Failed to load config:', e);
            // On error, default to stremio
            if (torrentEngineSelect) {
                torrentEngineSelect.value = 'stremio';
            }
            updateEngineUI('stremio', 1);
        }
    }
    
    // Save engine config
    async function saveEngineConfig(engine, instances) {
        try {
            console.log('[Engine] Saving config:', { engine, instances });
            const res = await fetch(`${API_BASE_URL.replace('/api', '')}/api/torrent-engine/config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ engine, instances })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to save');
            }
            const result = await res.json();
            console.log('[Engine] Config saved:', result);
            
            const engineNames = {
                stremio: 'Stremio Engine',
                webtorrent: 'WebTorrent',
                torrentstream: 'TorrentStream',
                hybrid: 'Hybrid Mode'
            };
            showEngineStatus(`${engineNames[engine]} activated${instances > 1 ? ` with ${instances} instances` : ''}`);
            showNotification(`Torrent engine: ${engineNames[engine]}${instances > 1 ? ` (${instances} instances)` : ''}`);
        } catch (e) {
            console.error('[Engine] Failed to save config:', e);
            showEngineStatus('Failed to change engine: ' + e.message, true);
            showNotification('Failed to save engine config: ' + e.message);
        }
    }
    
    if (torrentEngineSelect) {
        torrentEngineSelect.addEventListener('change', async () => {
            const engine = torrentEngineSelect.value;
            const instances = parseInt(engineInstancesSlider?.value || 1);
            updateEngineUI(engine, instances);
            await saveEngineConfig(engine, instances);
        });
    }
    
    if (engineInstancesSlider) {
        engineInstancesSlider.addEventListener('input', () => {
            if (engineInstanceLabel) {
                engineInstanceLabel.textContent = engineInstancesSlider.value;
            }
        });
        engineInstancesSlider.addEventListener('change', async () => {
            const engine = torrentEngineSelect?.value || 'stremio';
            const instances = parseInt(engineInstancesSlider.value);
            await saveEngineConfig(engine, instances);
        });
    }
    
    // Load engine config on init
    loadEngineConfig();
    
    // ===== PLAYER TYPE SETTINGS =====
    const playerTypeSelect = document.getElementById('playerTypeSelect');
    const mpvPathSection = document.getElementById('mpvPathSection');
    
    if (playerTypeSelect) {
        playerTypeSelect.addEventListener('change', async (e) => {
            const playerType = e.target.value;
            try {
                await fetch(`${API_BASE_URL}/settings`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        playerType: playerType,
                        useNodeMPV: playerType === 'nodempv' // Legacy support
                    })
                });
                
                // Show/hide MPV path section
                if (mpvPathSection) {
                    try {
                        const platformRes = await fetch(`${API_BASE_URL.replace('/api', '')}/api/platform`);
                        const platformData = await platformRes.json();
                        const isWindows = platformData.platform === 'win32';
                        mpvPathSection.style.display = (isWindows && playerType === 'nodempv') ? '' : 'none';
                    } catch (err) {
                        // Default to showing on Windows-like behavior
                        mpvPathSection.style.display = playerType === 'nodempv' ? '' : 'none';
                    }
                }
                
                // Sync legacy toggles
                document.querySelectorAll('#useNodeMPVToggle, #useNodeMPVToggleMain').forEach(t => {
                    t.checked = playerType === 'nodempv';
                });
                
                const playerNames = {
                    'playtorrio': 'PlayTorrio Player',
                    'builtin': 'Built-in HTML5 Player',
                    'nodempv': 'Node MPV Player'
                };
                showNotification(`${playerNames[playerType] || playerType} enabled`);
            } catch (err) {
                showNotification('Failed to save player setting');
            }
        });
    }
    
    // Legacy: NodeMPV Player Toggle - keep for backwards compatibility
    document.querySelectorAll('#useNodeMPVToggle, #useNodeMPVToggleMain').forEach(toggle => {
        toggle.addEventListener('change', async (e) => {
            try {
                const playerType = e.target.checked ? 'nodempv' : 'playtorrio';
                await fetch(`${API_BASE_URL}/settings`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        playerType: playerType,
                        useNodeMPV: e.target.checked 
                    })
                });
                // Sync all toggles
                document.querySelectorAll('#useNodeMPVToggle, #useNodeMPVToggleMain').forEach(t => {
                    t.checked = e.target.checked;
                });
                // Sync player type select
                if (playerTypeSelect) {
                    playerTypeSelect.value = playerType;
                }
                showNotification(e.target.checked ? 'MPV Player enabled' : 'PlayTorrio Player enabled');
            } catch (err) {
                showNotification('Failed to save player setting');
            }
        });
    });
    
    // ===== MPV PATH SETTINGS =====
    const mpvPathInput = document.getElementById('mpvPathInput');
    const browseMpvPathBtn = document.getElementById('browseMpvPathBtn');
    
    // Load saved MPV path
    if (mpvPathInput) {
        fetch(`${API_BASE_URL}/settings`).then(r => r.json()).then(s => {
            if (s.mpvPath) mpvPathInput.value = s.mpvPath;
            if (s.playerType && playerTypeSelect) {
                playerTypeSelect.value = s.playerType;
            }
        }).catch(() => {});
        
        // Save on blur
        mpvPathInput.addEventListener('blur', async () => {
            try {
                await fetch(`${API_BASE_URL}/settings`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mpvPath: mpvPathInput.value.trim() || null })
                });
            } catch (err) {
                console.warn('Failed to save MPV path:', err);
            }
        });
        
        mpvPathInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') mpvPathInput.blur();
        });
    }
    
    // Browse button for MPV path
    if (browseMpvPathBtn) {
        browseMpvPathBtn.addEventListener('click', async () => {
            if (window.electronAPI?.pickFile) {
                const result = await window.electronAPI.pickFile({
                    filters: [{ name: 'Executable', extensions: ['exe'] }],
                    title: 'Select mpv.exe'
                });
                if (result && mpvPathInput) {
                    mpvPathInput.value = result;
                    // Save immediately
                    try {
                        await fetch(`${API_BASE_URL}/settings`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ mpvPath: result })
                        });
                        showNotification('MPV path saved');
                    } catch (err) {
                        showNotification('Failed to save MPV path');
                    }
                }
            } else {
                showNotification('File browser not available');
            }
        });
    }
    
    // Download MPV link - open in default browser
    const downloadMpvLink = document.getElementById('downloadMpvLink');
    if (downloadMpvLink) {
        downloadMpvLink.addEventListener('click', (e) => {
            e.preventDefault();
            const mpvUrl = 'https://mpv.io/installation/';
            if (window.electronAPI?.openExternal) {
                window.electronAPI.openExternal(mpvUrl);
            } else {
                window.open(mpvUrl, '_blank');
            }
        });
    }
    
    console.log('[Settings] Settings page initialized');
    
    // Initialize addon manager
    initAddonManager();
}

// Export functions
window.showSettingsModal = showSettingsModal;
window.hideSettingsModal = hideSettingsModal;
window.loadSettings = loadSettings;
window.saveSettings_ = saveSettings_;
window.initializeSettingsPage = initializeSettingsPage;
window.startTraktLogin = startTraktLogin;
window.disconnectTrakt = disconnectTrakt;
window.beginRdDeviceLogin = beginRdDeviceLogin;
window.beginAdPinLogin = beginAdPinLogin;

console.log('[Settings] Settings module loaded');

// ===== ADDON MANAGER FUNCTIONS =====

// Get installed addons (same as basicmode)
async function getInstalledAddons() {
    try {
        let addons = [];
        if (window.electronAPI?.addonList) {
            const res = await window.electronAPI.addonList();
            addons = res.success ? res.addons : [];
        } else {
            // Fallback for non-electron env
            const stored = localStorage.getItem('stremio_addons');
            addons = stored ? JSON.parse(stored) : [];
        }
        
        // Ensure every addon has a baseUrl
        return addons.map(addon => {
            if (addon.url && !addon.manifestUrl) {
                addon.manifestUrl = addon.url;
            }
            if (!addon.baseUrl) {
                if (addon.transportUrl) {
                    addon.baseUrl = addon.transportUrl;
                } else if (addon.manifest?.transportUrl) {
                    addon.baseUrl = addon.manifest.transportUrl;
                } else if (addon.manifestUrl) {
                    if (addon.manifestUrl.endsWith('/manifest.json')) {
                        addon.baseUrl = addon.manifestUrl.slice(0, -14);
                    } else {
                        addon.baseUrl = addon.manifestUrl.replace('/manifest.json', '').replace('manifest.json', '');
                    }
                }
                if (addon.baseUrl && addon.baseUrl.endsWith('/')) {
                    addon.baseUrl = addon.baseUrl.slice(0, -1);
                }
            }
            return addon;
        });
    } catch (e) {
        console.error("[Addons] Failed to fetch addons", e);
        return [];
    }
}

// Install addon
async function installAddon(manifestUrl) {
    try {
        if (window.electronAPI?.addonInstall) {
            const res = await window.electronAPI.addonInstall(manifestUrl);
            if (!res.success) throw new Error(res.message);
            return res.addon;
        }
        throw new Error("Electron API not available");
    } catch (error) {
        console.error("[Addons] Installation failed", error);
        throw error;
    }
}

// Remove addon
async function removeAddon(id) {
    if (window.electronAPI?.addonRemove) {
        await window.electronAPI.addonRemove(id);
        return;
    }
}

// Render installed addons list
async function renderInstalledAddons() {
    const container = document.getElementById('installedAddonsList');
    if (!container) return;
    
    container.innerHTML = '<div style="text-align: center; padding: 1rem; color: var(--gray);"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
    
    const addons = await getInstalledAddons();
    
    if (addons.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: var(--gray); padding: 1rem;">No addons installed</div>';
        return;
    }
    
    container.innerHTML = '';
    
    addons.forEach(addon => {
        const name = addon.manifest?.name || addon.name || 'Unknown Addon';
        const logo = addon.manifest?.logo || addon.logo;
        const id = addon.manifest?.id || addon.id;
        const description = addon.manifest?.description || '';
        
        const item = document.createElement('div');
        item.style.cssText = 'display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; background: rgba(255,255,255,0.05); border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);';
        
        item.innerHTML = `
            <img src="${logo || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iIzFhMWEyZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTRweCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5BPC90ZXh0Pjwvc3ZnPg=='}" 
                 alt="${name}" 
                 style="width: 32px; height: 32px; border-radius: 6px; object-fit: contain; background: rgba(0,0,0,0.3);"
                 onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iIzFhMWEyZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTRweCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5BPC90ZXh0Pjwvc3ZnPg=='">
            <div style="flex: 1; min-width: 0;">
                <div style="font-weight: 600; color: var(--light); font-size: 0.95rem;">${name}</div>
                ${description ? `<div style="font-size: 0.8rem; color: var(--gray); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${description}</div>` : ''}
            </div>
            <button class="remove-addon-btn" data-addon-id="${id}" style="background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.4); color: #ef4444; padding: 0.4rem 0.6rem; border-radius: 6px; cursor: pointer; font-size: 0.8rem;">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        // Add remove handler
        item.querySelector('.remove-addon-btn').addEventListener('click', async () => {
            if (confirm(`Remove addon "${name}"?`)) {
                await removeAddon(id);
                renderInstalledAddons();
                showNotification(`Addon "${name}" removed`, 'success');
            }
        });
        
        container.appendChild(item);
    });
}

// Initialize addon manager
function initAddonManager() {
    const installBtn = document.getElementById('installAddonBtn');
    const manifestInput = document.getElementById('addonManifestUrl');
    
    if (installBtn && manifestInput) {
        installBtn.addEventListener('click', async () => {
            const url = manifestInput.value.trim();
            if (!url) {
                showNotification('Please enter a manifest URL', 'warning');
                return;
            }
            
            installBtn.disabled = true;
            installBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Installing...';
            
            try {
                const addon = await installAddon(url);
                const name = addon?.manifest?.name || addon?.name || 'Addon';
                manifestInput.value = '';
                await renderInstalledAddons();
                showNotification(`"${name}" installed successfully!`, 'success');
            } catch (e) {
                showNotification(e.message || 'Failed to install addon', 'error');
            } finally {
                installBtn.disabled = false;
                installBtn.innerHTML = '<i class="fas fa-plus"></i> Install';
            }
        });
    }
    
    // Load addons on init
    renderInstalledAddons();
}

// Export addon functions
window.getInstalledAddons = getInstalledAddons;
window.installAddon = installAddon;
window.removeAddon = removeAddon;
window.renderInstalledAddons = renderInstalledAddons;
window.initAddonManager = initAddonManager;

// Fetch streams from an addon
async function fetchAddonStreams(addon, type, id) {
    try {
        const name = addon.name || addon.manifest?.name || 'Unknown Addon';
        console.log(`[Addons] Fetching streams for ${type}/${id} from ${name}`);
        
        let targetUrl = addon.baseUrl || addon.transportUrl || addon.manifest?.transportUrl;
        
        if (!targetUrl && addon.url) {
            if (addon.url.endsWith('/manifest.json')) {
                targetUrl = addon.url.replace('/manifest.json', '');
            } else {
                targetUrl = addon.url;
            }
        }
        
        if (!targetUrl && addon.manifestUrl) {
            targetUrl = addon.manifestUrl.replace('/manifest.json', '');
        }

        if (!targetUrl) {
            console.error(`[Addons] No transport/base URL found for ${name}`);
            return [];
        }
        
        if (targetUrl.endsWith('/')) targetUrl = targetUrl.slice(0, -1);

        const url = `${targetUrl}/stream/${type}/${id}.json`;
        console.log(`[Addons] Requesting URL: ${url}`);
        
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`[Addons] HTTP Error ${response.status} from ${name}`);
            return [];
        }
        
        const data = await response.json();
        console.log(`[Addons] Received ${data.streams?.length || 0} streams from ${name}`);
        return data.streams || [];
    } catch (e) {
        console.error(`[Addons] Exception fetching from ${addon?.name || 'addon'}`, e);
        return [];
    }
}

// Parse addon stream to standard format
function parseAddonStream(stream, addonName) {
    const fullText = (stream.name + ' ' + (stream.title || '') + ' ' + (stream.description || '')).toLowerCase();

    const seederMatch = (stream.title || '' + stream.description || '').match(/[👤👥]\s*(\d+)/);
    const seeders = seederMatch ? parseInt(seederMatch[1]) : 0;

    let size = 'N/A';
    let sizeBytes = 0;

    if (stream.behaviorHints?.videoSize) {
        sizeBytes = stream.behaviorHints.videoSize;
        size = (sizeBytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    } else {
        const sizeMatch = (stream.title || '' + stream.description || '').match(/[💾📦]\s*([\d.]+)\s*([GM]B)/i);
        if (sizeMatch) {
            const val = parseFloat(sizeMatch[1]);
            const unit = sizeMatch[2].toUpperCase();
            size = `${val} ${unit}`;
            sizeBytes = val * (unit === 'GB' ? 1024 * 1024 * 1024 : 1024 * 1024);
        }
    }

    let quality = 'Unknown';
    if (fullText.includes('2160p') || fullText.includes('4k')) quality = '4K';
    else if (fullText.includes('1080p')) quality = '1080p';
    else if (fullText.includes('720p')) quality = '720p';
    else if (fullText.includes('480p')) quality = '480p';

    let playUrl = stream.url;
    if (!playUrl && stream.infoHash) {
        const trackers = (stream.sources || []).filter(s => s.startsWith('tracker:')).map(s => `&tr=${encodeURIComponent(s.replace('tracker:', ''))}`).join('');
        playUrl = `magnet:?xt=urn:btih:${stream.infoHash}&dn=${encodeURIComponent(stream.behaviorHints?.filename || 'stream')}${trackers}`;
    }

    let displayTitle = (stream.title || '').split('\n')[0] || stream.behaviorHints?.filename || stream.name;
    if (displayTitle.length < 5 && stream.behaviorHints?.filename) {
        displayTitle = stream.behaviorHints.filename;
    }

    const streamName = stream.name || '';
    const cachedIcon = streamName.includes('⚡') ? '⚡ ' : '';

    return {
        id: stream.infoHash || stream.url || Math.random().toString(),
        title: displayTitle,
        fullTitle: stream.title || stream.description || '',
        size: size,
        sizeBytes: sizeBytes,
        seeders: seeders,
        peers: 0,
        indexer: `${cachedIcon}${addonName}`,
        magnet: playUrl,
        quality: quality,
        codec: fullText.includes('x265') || fullText.includes('hevc') ? 'HEVC' : 'x264',
        hdr: fullText.includes('hdr') ? 'HDR' : (fullText.includes('dv') ? 'Dolby Vision' : null)
    };
}

window.fetchAddonStreams = fetchAddonStreams;
window.parseAddonStream = parseAddonStream;


// ===== AIOSTREAMS INTEGRATION =====

// Save AIOStreams manifest URL
async function saveManifest() {
    const manifestUrlInput = document.getElementById('manifestUrl');
    const manifestSavedBox = document.getElementById('manifestSavedBox');
    
    if (!manifestUrlInput) {
        console.error('[AIOStreams] manifestUrl input not found');
        if (typeof showNotification === 'function') showNotification('Error: Input field not found', 'error');
        return;
    }
    
    const url = manifestUrlInput.value.trim();
    
    if (!url) {
        if (typeof showNotification === 'function') showNotification('Please enter a manifest URL', 'error');
        return;
    }
    
    // Validate URL format
    try {
        new URL(url);
    } catch (e) {
        if (typeof showNotification === 'function') showNotification('Invalid URL format', 'error');
        return;
    }
    
    try {
        // Save using Electron API if available
        if (window.electronAPI?.manifestWrite) {
            const result = await window.electronAPI.manifestWrite(url);
            if (result?.success) {
                console.log('[AIOStreams] Manifest URL saved via Electron');
                if (manifestSavedBox) manifestSavedBox.style.display = 'block';
                if (typeof showNotification === 'function') showNotification('AIOStreams manifest saved!');
            } else {
                throw new Error(result?.message || 'Failed to save manifest');
            }
        } else {
            // Fallback: save to localStorage
            localStorage.setItem('aiostreamsManifestUrl', url);
            console.log('[AIOStreams] Manifest URL saved to localStorage');
            if (manifestSavedBox) manifestSavedBox.style.display = 'block';
            if (typeof showNotification === 'function') showNotification('AIOStreams manifest saved!');
        }
    } catch (error) {
        console.error('[AIOStreams] Error saving manifest:', error);
        if (typeof showNotification === 'function') showNotification('Error saving manifest: ' + error.message, 'error');
    }
}

// Load saved AIOStreams manifest URL
async function loadAiostreamsManifest() {
    const manifestUrlInput = document.getElementById('manifestUrl');
    if (!manifestUrlInput) return null;
    
    try {
        // Try Electron API first
        if (window.electronAPI?.manifestRead) {
            const result = await window.electronAPI.manifestRead();
            console.log('[AIOStreams] loadAiostreamsManifest result:', result);
            // The result format is { success: true, data: "url" }
            if (result?.success && result?.data) {
                manifestUrlInput.value = result.data;
                return result.data;
            }
        }
        
        // Fallback to localStorage
        const savedUrl = localStorage.getItem('aiostreamsManifestUrl');
        if (savedUrl) {
            manifestUrlInput.value = savedUrl;
            return savedUrl;
        }
    } catch (error) {
        console.error('[AIOStreams] Error loading manifest:', error);
    }
    
    return null;
}

// Fetch streams from AIOStreams
async function fetchAiostreamsStreams(season = null, episode = null) {
    const torrentsList = document.getElementById('torrentsList');
    
    if (torrentsList) {
        torrentsList.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Searching AIOStreams...</div>';
    }
    
    try {
        // Get the saved manifest URL
        let manifestUrl = null;
        
        if (window.electronAPI?.manifestRead) {
            const result = await window.electronAPI.manifestRead();
            console.log('[AIOStreams] manifestRead result:', result);
            // The result format is { success: true, data: "url" }
            if (result?.success && result?.data) {
                manifestUrl = result.data;
            }
        }
        
        if (!manifestUrl) {
            manifestUrl = localStorage.getItem('aiostreamsManifestUrl');
        }
        
        console.log('[AIOStreams] Using manifest URL:', manifestUrl);
        
        if (!manifestUrl) {
            throw new Error('No AIOStreams manifest URL configured. Please set it in Settings > AIOStreams.');
        }
        
        // Get current content info
        const tmdbId = window.currentContent?.id;
        const mediaType = window.currentMediaType;
        
        if (!tmdbId) {
            throw new Error('No content selected');
        }
        
        // Get IMDB ID from TMDB
        const TMDB_API_KEY = window.TMDB_API_KEY || '683d5e6c7e5f31c1d9a0d9e8f5e6c7d8';
        const externalIdsUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}/external_ids?api_key=${TMDB_API_KEY}`;
        const externalIdsRes = await fetch(externalIdsUrl);
        
        if (!externalIdsRes.ok) {
            throw new Error('Failed to get IMDB ID from TMDB');
        }
        
        const externalIds = await externalIdsRes.json();
        const imdbId = externalIds.imdb_id;
        
        if (!imdbId) {
            throw new Error('No IMDB ID found for this content');
        }
        
        // Construct the stream URL
        const isTV = mediaType === 'tv';
        let stremioId;
        if (isTV) {
            const s = season || window.currentSeason || 1;
            const e = episode || 1;
            stremioId = `${imdbId}:${s}:${e}`;
        } else {
            stremioId = imdbId;
        }
        
        const resourceType = isTV ? 'series' : 'movie';
        
        // Parse the manifest URL to get the base URL
        let baseUrl = manifestUrl;
        if (manifestUrl.endsWith('/manifest.json')) {
            baseUrl = manifestUrl.slice(0, -14);
        } else if (manifestUrl.includes('/manifest.json')) {
            baseUrl = manifestUrl.replace('/manifest.json', '');
        }
        
        // Fetch streams
        const streamUrl = `${baseUrl}/stream/${resourceType}/${stremioId}.json`;
        console.log('[AIOStreams] Fetching streams from:', streamUrl);
        
        const streamRes = await fetch(streamUrl);
        
        if (!streamRes.ok) {
            throw new Error(`AIOStreams returned ${streamRes.status}`);
        }
        
        const streamData = await streamRes.json();
        const streams = streamData.streams || [];
        
        console.log('[AIOStreams] Got', streams.length, 'streams');
        
        if (streams.length === 0) {
            if (torrentsList) {
                torrentsList.innerHTML = '<div class="empty-message"><i class="fas fa-info-circle"></i> No streams found from AIOStreams</div>';
            }
            return;
        }
        
        // Parse streams to standard format
        const torrents = streams.map(stream => {
            const parsed = parseAddonStream(stream, 'AIOStreams');
            
            // Determine if this is a direct URL or magnet link
            const isMagnet = parsed.magnet && parsed.magnet.startsWith('magnet:');
            const isDirectUrl = parsed.magnet && !parsed.magnet.startsWith('magnet:');
            
            return {
                title: parsed.title,
                magnet: isMagnet ? parsed.magnet : null,
                url: isDirectUrl ? parsed.magnet : (stream.url && !stream.url.startsWith('magnet:') ? stream.url : null),
                seeders: parsed.seeders,
                size: parsed.sizeBytes,
                indexer: parsed.indexer,
                quality: parsed.quality
            };
        });
        
        // Display torrents
        if (typeof window.displayTorrents === 'function') {
            window.displayTorrents(torrents, season, episode);
        } else {
            console.error('[AIOStreams] displayTorrents function not available');
        }
        
    } catch (error) {
        console.error('[AIOStreams] Error:', error);
        if (torrentsList) {
            torrentsList.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-triangle"></i> AIOStreams Error: ${error.message}</div>`;
        }
    }
}

// Export AIOStreams functions
window.saveManifest = saveManifest;
window.loadAiostreamsManifest = loadAiostreamsManifest;
window.fetchAiostreamsStreams = fetchAiostreamsStreams;

// Load AIOStreams manifest on page load
document.addEventListener('DOMContentLoaded', () => {
    loadAiostreamsManifest();
});

console.log('[Settings] AIOStreams integration loaded');
