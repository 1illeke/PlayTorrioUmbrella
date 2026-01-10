const API_BASE = '/api';

export const getDebridSettings = async () => {
    try {
        const response = await fetch(`${API_BASE}/settings`);
        if (response.ok) {
            return await response.json();
        }
    } catch (e) {
        console.error("Failed to fetch settings", e);
    }
    return {};
};

export const saveDebridSettings = async (settings) => {
    try {
        const response = await fetch(`${API_BASE}/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });
        return response.ok;
    } catch (e) {
        console.error("Failed to save settings", e);
        return false;
    }
};

export const initDebridUI = async () => {
    const useDebridToggle = document.getElementById('use-debrid-toggle');
    const debridConfigContainer = document.getElementById('debrid-config-container');
    const providerSelect = document.getElementById('debrid-provider-select');
    const rdAuthSection = document.getElementById('rd-auth-section');
    const apiKeySection = document.getElementById('api-key-section');
    const rdLoginBtn = document.getElementById('rd-login-btn');
    const rdStatus = document.getElementById('rd-status');
    const debridApiInput = document.getElementById('debrid-api-input');

    if (!useDebridToggle) return;

    // Load initial state
    const settings = await getDebridSettings();
    const useDebrid = !!settings.useDebrid;
    useDebridToggle.checked = useDebrid;
    
    if (useDebrid) {
        debridConfigContainer.classList.remove('opacity-50', 'pointer-events-none');
    }

    if (settings.debridProvider) {
        providerSelect.value = settings.debridProvider;
    }

    const updateUI = (provider) => {
        // Reset specific UI elements
        rdAuthSection.classList.add('hidden');
        apiKeySection.classList.add('hidden');
        rdStatus.textContent = 'Not logged in';
        rdStatus.className = 'text-xs text-red-400';
        debridApiInput.value = ''; // Clear input as we can't retrieve actual keys

        if (provider === 'realdebrid') {
            rdAuthSection.classList.remove('hidden');
            if (settings.debridAuth && settings.debridProvider === 'realdebrid') {
                rdStatus.textContent = 'Logged in';
                rdStatus.className = 'text-xs text-green-400';
                rdLoginBtn.textContent = 'Logout';
                rdLoginBtn.classList.replace('bg-green-600', 'bg-red-600');
                rdLoginBtn.classList.replace('hover:bg-green-500', 'hover:bg-red-500');
            } else {
                rdLoginBtn.textContent = 'Login with Real-Debrid';
                rdLoginBtn.classList.replace('bg-red-600', 'bg-green-600');
                rdLoginBtn.classList.replace('hover:bg-red-500', 'hover:bg-green-500');
            }
        } else {
            apiKeySection.classList.remove('hidden');
            if (settings.debridAuth && settings.debridProvider === provider) {
                debridApiInput.placeholder = 'Saved (Enter new to overwrite)';
            } else {
                debridApiInput.placeholder = 'Enter API Key';
            }
        }
    };

    // Event Listeners
    useDebridToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
            debridConfigContainer.classList.remove('opacity-50', 'pointer-events-none');
        } else {
            debridConfigContainer.classList.add('opacity-50', 'pointer-events-none');
        }
        saveDebridSettings({ useDebrid: e.target.checked });
    });

    providerSelect.addEventListener('change', (e) => {
        const provider = e.target.value;
        // Temporarily update UI; real state update happens after save/reload or if auth is persistent
        // For simple switching, we assume not-authed until confirmed
        settings.debridProvider = provider;
        settings.debridAuth = false; // Reset view auth for new provider until confirmed
        updateUI(provider);
        saveDebridSettings({ debridProvider: provider });
        
        // Refresh settings to check if we are actually authed with this new provider
        getDebridSettings().then(newS => {
            Object.assign(settings, newS);
            updateUI(provider);
        });
    });

    debridApiInput.addEventListener('change', async (e) => {
        const provider = providerSelect.value;
        const key = e.target.value.trim();
        if (!key) return;

        let endpoint = '';
        let body = {};

        if (provider === 'alldebrid') {
            endpoint = '/api/debrid/ad/apikey';
            body = { apikey: key };
        } else if (provider === 'torbox') {
            endpoint = '/api/debrid/tb/token';
            body = { token: key };
        } else if (provider === 'premiumize') {
            endpoint = '/api/debrid/pm/apikey';
            body = { apikey: key };
        }

        if (endpoint) {
            try {
                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                if (res.ok) {
                    debridApiInput.value = '';
                    debridApiInput.placeholder = 'Saved!';
                    // Refresh settings to update debridAuth status
                    const newS = await getDebridSettings();
                    Object.assign(settings, newS);
                } else {
                    alert('Failed to save API key');
                }
            } catch (err) {
                console.error(err);
                alert('Error saving API key');
            }
        }
    });

    rdLoginBtn.addEventListener('click', async () => {
        if (rdLoginBtn.textContent === 'Logout') {
            await saveDebridSettings({ rdToken: null, rdRefreshToken: null }); 
            // Note: generic settings save might not clear token if server ignores it.
            // But we don't have a specific logout endpoint for RD in server.mjs visible here?
            // Actually, sending garbage to /api/debrid/token clears it.
            await fetch('/api/debrid/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: '' }) // Empty token triggers clear
            });
            
            settings.debridAuth = false;
            updateUI('realdebrid');
        } else {
            startRDDeviceFlow();
        }
    });

    const startRDDeviceFlow = async () => {
        rdLoginBtn.disabled = true;
        rdLoginBtn.textContent = 'Connecting...';
        try {
            const res = await fetch(`${API_BASE}/debrid/rd/device-code`);
            const data = await res.json();
            
            if (data.user_code) {
                // Copy code to clipboard
                if (window.electronAPI?.copyToClipboard) {
                    window.electronAPI.copyToClipboard(data.user_code);
                } else {
                    navigator.clipboard.writeText(data.user_code);
                }
                
                // Open verification URL
                if (window.electronAPI?.openExternal) {
                    window.electronAPI.openExternal(`https://real-debrid.com/device?code=${data.user_code}`);
                } else {
                    window.open(`https://real-debrid.com/device?code=${data.user_code}`, '_blank');
                }

                rdStatus.textContent = `Code: ${data.user_code} (Copied)`;
                rdLoginBtn.textContent = 'Waiting...';

                // Poll for token
                pollRDToken(data.device_code, data.interval);
            }
        } catch (e) {
            console.error("RD Login failed", e);
            rdLoginBtn.textContent = 'Error';
            rdLoginBtn.disabled = false;
        }
    };

    const pollRDToken = async (deviceCode, interval) => {
        const pollInterval = setInterval(async () => {
            try {
                const res = await fetch(`${API_BASE}/debrid/rd/poll`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ device_code: deviceCode })
                });
                
                // If the response is not OK, it might be a pending state or an error
                // We attempt to parse JSON regardless of status
                let data = {};
                try {
                    data = await res.json();
                } catch (e) {
                    // Non-JSON response (e.g. server error HTML), ignore this poll tick
                    return;
                }
                
                if (data.success || (res.ok && !data.error)) {
                    clearInterval(pollInterval);
                    // Settings are saved by backend, but we refresh local state
                    const newSettings = await getDebridSettings();
                    Object.assign(settings, newSettings);
                    
                    updateUI('realdebrid');
                    rdLoginBtn.disabled = false;
                } else if (data.error) {
                    // Check for terminal errors
                    const errStr = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
                    if (/expired|invalid|access_denied/i.test(errStr)) {
                        clearInterval(pollInterval);
                        rdLoginBtn.textContent = 'Login Failed';
                        rdLoginBtn.disabled = false;
                        rdStatus.textContent = 'Code expired or invalid';
                        rdStatus.className = 'text-xs text-red-400';
                    }
                    // For other errors (including the weird null error), we assume pending/transient and KEEP POLLING
                }
            } catch (e) {
                // Network error, keep polling
            }
        }, interval * 1000);
    };

    // Initial UI Setup
    updateUI(settings.debridProvider || 'realdebrid');
};

// NodeMPV Player Settings (Windows Only)
export const initNodeMPVUI = async () => {
    const nodempvSection = document.getElementById('nodempv-section');
    const useNodeMPVToggle = document.getElementById('use-nodempv-toggle');
    const mpvPathInput = document.getElementById('mpv-path-input');
    const browseMpvBtn = document.getElementById('browse-mpv-btn');
    
    if (!nodempvSection || !useNodeMPVToggle) return;
    
    // Only show on Windows
    try {
        const platformRes = await fetch('/api/platform');
        const platformData = await platformRes.json();
        if (platformData.platform !== 'win32') {
            nodempvSection.style.display = 'none';
            return;
        }
    } catch(e) {
        // If we can't detect platform, hide the section
        nodempvSection.style.display = 'none';
        return;
    }
    
    // Show the section on Windows
    nodempvSection.classList.remove('hidden');
    
    // Load initial state
    const settings = await getDebridSettings();
    useNodeMPVToggle.checked = !!settings.useNodeMPV;
    if (mpvPathInput) {
        mpvPathInput.value = settings.mpvPath || '';
    }
    
    // Event listener for toggle
    useNodeMPVToggle.addEventListener('change', (e) => {
        saveDebridSettings({ useNodeMPV: e.target.checked });
    });
    
    // Event listener for path input (save on blur)
    if (mpvPathInput) {
        mpvPathInput.addEventListener('blur', () => {
            saveDebridSettings({ mpvPath: mpvPathInput.value.trim() || null });
        });
        mpvPathInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                mpvPathInput.blur();
            }
        });
    }
    
    // Browse button - use Electron dialog if available
    if (browseMpvBtn) {
        browseMpvBtn.addEventListener('click', async () => {
            if (window.electronAPI?.pickFile) {
                const result = await window.electronAPI.pickFile({
                    filters: [{ name: 'Executable', extensions: ['exe'] }],
                    title: 'Select mpv.exe'
                });
                if (result && mpvPathInput) {
                    mpvPathInput.value = result;
                    saveDebridSettings({ mpvPath: result });
                }
            } else {
                alert('File browser not available. Please enter the path manually.');
            }
        });
    }
    
    // Download MPV button - open in default browser
    const downloadMpvBtn = document.getElementById('download-mpv-btn');
    if (downloadMpvBtn) {
        downloadMpvBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const mpvUrl = 'https://mpv.io/installation/';
            if (window.electronAPI?.openExternal) {
                window.electronAPI.openExternal(mpvUrl);
            } else {
                window.open(mpvUrl, '_blank');
            }
        });
    }
};

// Sponsor Settings
export const initSponsorUI = async () => {
    const showSponsorToggle = document.getElementById('show-sponsor-toggle');
    const aceBetWrapper = document.getElementById('acebet-btn-wrapper');
    const acebetSidebarWrapper = document.getElementById('acebet-sidebar-wrapper');
    
    if (!showSponsorToggle) return;
    
    // Load initial state
    const settings = await getDebridSettings();
    const showSponsor = settings.showSponsor !== false; // default ON
    showSponsorToggle.checked = showSponsor;
    
    // Update visibility (both header and sidebar)
    if (aceBetWrapper) {
        aceBetWrapper.style.display = showSponsor ? '' : 'none';
    }
    if (acebetSidebarWrapper) {
        acebetSidebarWrapper.style.display = showSponsor ? '' : 'none';
    }
    
    // Event listener for toggle
    showSponsorToggle.addEventListener('change', (e) => {
        const show = e.target.checked;
        saveDebridSettings({ showSponsor: show });
        
        // Update both header and sidebar sponsor elements
        if (aceBetWrapper) {
            aceBetWrapper.style.display = show ? '' : 'none';
        }
        if (acebetSidebarWrapper) {
            acebetSidebarWrapper.style.display = show ? '' : 'none';
        }
        
        // Update localStorage for quick access on page load
        localStorage.setItem('sponsor_hidden_basic', show ? 'false' : 'true');
    });
};

// Load sponsor visibility on app startup (before settings modal is opened)
export const loadSponsorVisibility = async () => {
    const aceBetWrapper = document.getElementById('acebet-btn-wrapper');
    const acebetSidebarWrapper = document.getElementById('acebet-sidebar-wrapper');
    
    try {
        const settings = await getDebridSettings();
        const showSponsor = settings.showSponsor !== false; // default ON
        
        if (aceBetWrapper) {
            aceBetWrapper.style.display = showSponsor ? '' : 'none';
        }
        if (acebetSidebarWrapper) {
            acebetSidebarWrapper.style.display = showSponsor ? '' : 'none';
        }
        
        // Also save to localStorage for quick access on page load
        localStorage.setItem('sponsor_hidden_basic', showSponsor ? 'false' : 'true');
    } catch (e) {
        console.error('[Sponsor] Failed to load setting:', e);
    }
};

// Hide sponsor function (called from X button)
export const hideSponsorBasic = async () => {
    const showSponsorToggle = document.getElementById('show-sponsor-toggle');
    const aceBetWrapper = document.getElementById('acebet-btn-wrapper');
    const acebetSidebarWrapper = document.getElementById('acebet-sidebar-wrapper');
    
    // Update toggle
    if (showSponsorToggle) {
        showSponsorToggle.checked = false;
    }
    
    // Hide buttons (both header and sidebar)
    if (aceBetWrapper) {
        aceBetWrapper.style.display = 'none';
    }
    if (acebetSidebarWrapper) {
        acebetSidebarWrapper.style.display = 'none';
    }
    
    // Save to localStorage for quick access
    localStorage.setItem('sponsor_hidden_basic', 'true');
    
    // Save to server
    await saveDebridSettings({ showSponsor: false });
};

// Make hideSponsorBasic available globally for onclick handler
window.hideSponsorBasic = hideSponsorBasic;


// Torrent Engine Settings
export const initTorrentEngineUI = async () => {
    const engineSelect = document.getElementById('torrent-engine-select');
    const instancesContainer = document.getElementById('engine-instances-container');
    const instancesSlider = document.getElementById('engine-instances-slider');
    const instanceCountLabel = document.getElementById('instance-count-label');
    const engineDescription = document.getElementById('engine-description');
    
    if (!engineSelect) return;
    
    const descriptions = {
        stremio: "Stremio's engine provides reliable streaming with built-in transcoding support.",
        webtorrent: "WebTorrent uses WebRTC for browser-compatible P2P streaming. Great for modern setups.",
        torrentstream: "TorrentStream is a lightweight, battle-tested engine optimized for video streaming.",
        hybrid: "Hybrid mode uses BOTH WebTorrent and TorrentStream simultaneously for maximum download speed!"
    };
    
    // Load current settings from BOTH sources (server engine config takes priority)
    let currentEngine = 'stremio';
    let currentInstances = 1;
    
    try {
        // First try to get from engine config API (actual running state)
        const engineConfig = await fetch('/api/torrent-engine/config').then(r => r.json());
        if (engineConfig && engineConfig.engine) {
            currentEngine = engineConfig.engine;
            currentInstances = engineConfig.instances || 1;
            console.log(`[TorrentEngineUI] Loaded from server: ${currentEngine}, instances: ${currentInstances}`);
        }
    } catch (e) {
        console.warn('[TorrentEngineUI] Failed to load engine config from server:', e);
        // Fallback to settings
        const settings = await getDebridSettings();
        if (settings.torrentEngine) {
            currentEngine = settings.torrentEngine;
        }
        if (settings.torrentEngineInstances) {
            currentInstances = settings.torrentEngineInstances;
        }
    }
    
    engineSelect.value = currentEngine;
    instancesSlider.value = currentInstances;
    instanceCountLabel.textContent = currentInstances;
    
    // Update UI based on current selection
    const updateUI = (engine) => {
        engineDescription.textContent = descriptions[engine] || descriptions.stremio;
        
        // Show/hide instances slider (not for Stremio)
        if (engine === 'stremio') {
            instancesContainer.classList.add('hidden');
        } else {
            instancesContainer.classList.remove('hidden');
        }
    };
    
    updateUI(engineSelect.value);
    
    // Event listeners
    engineSelect.addEventListener('change', async (e) => {
        const engine = e.target.value;
        updateUI(engine);
        await saveDebridSettings({ torrentEngine: engine });
        
        // Apply engine change to server
        try {
            await fetch('/api/torrent-engine/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    engine, 
                    instances: parseInt(instancesSlider.value, 10) 
                })
            });
        } catch (e) {
            console.error('[TorrentEngine] Failed to update engine:', e);
        }
    });
    
    instancesSlider.addEventListener('input', (e) => {
        instanceCountLabel.textContent = e.target.value;
    });
    
    instancesSlider.addEventListener('change', async (e) => {
        const instances = parseInt(e.target.value, 10);
        await saveDebridSettings({ torrentEngineInstances: instances });
        
        // Apply to server
        try {
            await fetch('/api/torrent-engine/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    engine: engineSelect.value, 
                    instances 
                })
            });
        } catch (e) {
            console.error('[TorrentEngine] Failed to update instances:', e);
        }
    });
};
