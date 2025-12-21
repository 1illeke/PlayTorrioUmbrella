import { BrowserWindow, ipcMain, app } from 'electron';
import path from 'path';
import { spawn } from 'child_process';
import net from 'net';
import fs from 'fs';
import { fileURLToPath } from 'url';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mpvProcess;
let mpvSocket;
let playerWin = null;
let mainWinRef = null;
let commandQueue = [];
let isReady = false;

// Socket path
const socketPath = process.platform === 'win32' 
  ? String.raw`\\.\pipe\playtorrio_mpv_socket`
  : '/tmp/playtorrio_mpv_socket';

console.log('[Player] Socket Path:', socketPath);

function initPlayer(mainWindow, mpvPath) {
    if (playerWin && !playerWin.isDestroyed()) return;
    
    mainWinRef = mainWindow;
    const bounds = mainWindow.getBounds();

    console.log('[Player] Initializing hidden player window...');

    // Create hidden player window
    playerWin = new BrowserWindow({
        show: false,
        width: bounds.width,
        height: bounds.height,
        x: bounds.x,
        y: bounds.y,
        icon: path.join(__dirname, 'icon.ico'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'Player', 'preload.js'),
            backgroundThrottling: false
        },
        frame: false,
        transparent: true,
        backgroundColor: '#00000000',
        resizable: true, 
                hasShadow: false,
                roundedCorners: false,
                skipTaskbar: false
            });
    playerWin.loadFile(path.join(__dirname, 'Player', 'index.html'));

    // Sync Resize/Move from Parent
    const syncBounds = () => {
        if (playerWin && !playerWin.isDestroyed() && mainWindow && !mainWindow.isDestroyed()) {
             if (playerWin.isVisible()) {
                playerWin.setBounds(mainWindow.getBounds());
             }
        }
    };
    mainWindow.on('move', syncBounds);
    mainWindow.on('resize', syncBounds);
    
    playerWin.on('closed', () => {
        mainWindow.removeListener('move', syncBounds);
        mainWindow.removeListener('resize', syncBounds);
        playerWin = null;
    });

    // Handle "Back" button (or any close request) -> Hide and Stop
    playerWin.on('close', (e) => {
        if (!app.isQuitting) {
            e.preventDefault();
            closePlayer();
        }
    });

    // Emit fullscreen events to renderer to update UI (hide titlebar, change button)
    playerWin.on('enter-full-screen', () => {
        playerWin?.webContents.send('fullscreen-change', true);
    });
    playerWin.on('leave-full-screen', () => {
        playerWin?.webContents.send('fullscreen-change', false);
    });


    playerWin.webContents.on('did-finish-load', () => {
        setTimeout(() => {
            if (!playerWin) return;
            const windowHandle = playerWin.getNativeWindowHandle();
            let wid;
            if (process.platform === 'win32') {
                wid = windowHandle.readInt32LE(0).toString();
            } else {
                wid = windowHandle.readUInt32LE(0).toString();
            }
            startMPV(mpvPath, wid);
        }, 500);
    });


    if (!global.playerListenersRegistered) {
        global.playerListenersRegistered = true;
        
        ipcMain.on('player-window-minimize', () => {

            playerWin?.minimize();
        });

        ipcMain.on('player-window-maximize', () => {
            if (playerWin?.isMaximized()) {
                playerWin.unmaximize();
            } else {
                playerWin?.maximize();
            }
        });

        ipcMain.on('player-window-close', () => {
            closePlayer();
        });

        ipcMain.on('player-window-toggle-fullscreen', (event, state) => {
            if (!playerWin) return;
            if (typeof state === 'boolean') {
                playerWin.setFullScreen(state);
            } else {
                playerWin.setFullScreen(!playerWin.isFullScreen());
            }
        });
    }
}

function closePlayer() {
    console.log('[Player] Closing/Hiding player...');
    if (playerWin && !playerWin.isDestroyed()) {
        playerWin.hide();
        sendMPVCommand({ command: ['stop'] });
        
        // Also exit fullscreen if active
        if (playerWin.isFullScreen()) playerWin.setFullScreen(false);
    }
    
    // Restore Main Window
    if (mainWinRef && !mainWinRef.isDestroyed()) {
        mainWinRef.show();
        mainWinRef.focus();
    }
}


async function fetchAndLoadSubtitles(metadata) {
    if (!metadata || !metadata.tmdbId) return;

    const { tmdbId, seasonNum, episodeNum, type } = metadata;
    let apiUrl = `https://sub.wyzie.ru/search?id=${tmdbId}`;
    
    // Check if it's a TV show (type is 'tv' or we have season/episode info)
    if (type === 'tv' || (seasonNum && episodeNum)) {
        if (seasonNum && episodeNum) {
            apiUrl += `&season=${seasonNum}&episode=${episodeNum}`;
        }
    }

    console.log('[Player] Fetching subtitles from Wyzie:', apiUrl);

    const getJSON = (url) => new Promise((resolve, reject) => {
        const req = https.get(url, (res) => {
            if (res.statusCode !== 200) {
                res.resume();
                return reject(new Error(`Status Code: ${res.statusCode}`));
            }
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); } catch(e) { reject(e); }
            });
        });
        req.on('error', reject);
    });

    try {
        const subs = await getJSON(apiUrl);
        if (Array.isArray(subs)) {
            console.log(`[Player] Found ${subs.length} subtitles from Wyzie. Sending list to UI...`);
            
            // Send the full list to the UI for selection
            if (playerWin && !playerWin.isDestroyed()) {
                playerWin.webContents.send('wyzie-subtitles', subs);
            }
        }
    } catch (err) {
        console.error('[Player] Failed to fetch subtitles from Wyzie:', err.message);
    }
}

function openPlayer(mainWindow, mpvPath, url, startSeconds, metadata) {
    mainWinRef = mainWindow;

    // Ensure initialized
    if (!playerWin || playerWin.isDestroyed()) {
        initPlayer(mainWindow, mpvPath);
        // Wait briefly for init? 
        // Ideally init happens at startup. If happening now, MPV might delay.
        // We'll proceed to show window; MPV will catch up when process spawns.
    }

    // Sync bounds
    const bounds = mainWindow.getBounds();
    playerWin.setBounds(bounds);
    
    // Sync Maximize/Fullscreen
    if (mainWindow.isMaximized() && !playerWin.isMaximized()) playerWin.maximize();
    if (mainWindow.isFullScreen() && !playerWin.isFullScreen()) playerWin.setFullScreen(true);

    // Ensure MPV is running (in case it crashed or was closed but window remains)
    if (!mpvProcess && playerWin && !playerWin.isDestroyed()) {
        console.log('[Player] MPV process missing, restarting...');
        try {
            const windowHandle = playerWin.getNativeWindowHandle();
            let wid;
            if (process.platform === 'win32') {
                wid = windowHandle.readInt32LE(0).toString();
            } else {
                wid = windowHandle.readUInt32LE(0).toString();
            }
            startMPV(mpvPath, wid);
        } catch (e) {
            console.error('[Player] Failed to restart MPV:', e);
        }
    }

    // Hide Main, Show Player
    mainWindow.hide();
    playerWin.show();
    playerWin.focus();

    // Load Content
    if (url) {
        sendMPVCommand({ command: ['loadfile', url] });
        if (startSeconds) {
             setTimeout(() => {
                sendMPVCommand({ command: ['seek', startSeconds, 'absolute'] });
             }, 500);
        }
        
        // Auto-load subtitles if metadata provided
        if (metadata) {
            setTimeout(() => {
                fetchAndLoadSubtitles(metadata);
            }, 1000); // Small delay to let video start
        }
    }
    
    return playerWin;
}

function startMPV(mpvPath, wid) {
    if (mpvProcess) {
        // Already running
        return;
    }
    
    // Cleanup socket
    if (process.platform !== 'win32' && fs.existsSync(socketPath)) {
        try { fs.unlinkSync(socketPath); } catch(e){}
    }

    const mpvArgs = [
        `--input-ipc-server=${socketPath}`,
        '--idle=yes',
        '--force-window=yes',
        '--keep-open=yes',
        '--no-config',
        '--no-input-default-bindings',
        '--no-osc', 
        '--no-osd-bar', 
        `--wid=${wid}`, 
        '--hwdec=auto', 
        '--vo=gpu', 
        '--geometry=100%:100%', 
        '--no-border',
        '--no-window-dragging',
        '--cache=yes',
        '--cache-secs=30'
    ];

    console.log('[Player] Spawning MPV with args:', mpvArgs);

    mpvProcess = spawn(mpvPath, mpvArgs, {
        cwd: path.dirname(mpvPath),
        stdio: ['ignore', 'pipe', 'pipe']
    });

    mpvProcess.stdout.on('data', (data) => {
        // console.log('MPV stdout:', data.toString());
    });

    mpvProcess.stderr.on('data', (data) => {
        console.log('MPV stderr:', data.toString());
    });

    mpvProcess.on('error', (error) => {
        console.error('[Player] MPV Start Error:', error);
    });

    mpvProcess.on('exit', (code) => {
        console.log('[Player] MPV exited code:', code);
        mpvProcess = null;
        isReady = false;
        mpvSocket = null;
        
        // If MPV crashes while player is visible, close player
        if (playerWin && playerWin.isVisible()) {
            closePlayer();
        }
    });

    connectToMPV();
}

function connectToMPV() {
    let attempts = 0;
    const connectInterval = setInterval(() => {
        attempts++;
        if (attempts > 20) { // 10 seconds
            clearInterval(connectInterval);
            console.error('[Player] Failed to connect to MPV socket');
            return;
        }
        
        try {
            mpvSocket = net.connect(socketPath);

            mpvSocket.on('connect', () => {
                clearInterval(connectInterval);
                console.log('[Player] Connected to MPV socket');
                isReady = true;
                
                // Observe properties
                sendMPVCommand({ command: ['observe_property', 1, 'time-pos'] });
                sendMPVCommand({ command: ['observe_property', 2, 'duration'] });
                sendMPVCommand({ command: ['observe_property', 3, 'pause'] });
                sendMPVCommand({ command: ['observe_property', 4, 'volume'] });
                sendMPVCommand({ command: ['observe_property', 5, 'track-list'] });
                
                // Process queued commands
                commandQueue.forEach(cmd => sendMPVCommand(cmd));
                commandQueue = [];
            });
            
            mpvSocket.on('data', (data) => handleMPVData(data));
            mpvSocket.on('error', (err) => { 
                // Ignore connection errors while retrying
            });
        } catch(e) {}
    }, 500);
}

function handleMPVData(data) {
    const str = data.toString();
    const lines = str.split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        try {
          const response = JSON.parse(line);
          handleMPVResponse(response);
        } catch (e) {}
      }
    });
}

function handleMPVResponse(response) {
  if (response.event === 'property-change' && playerWin && !playerWin.isDestroyed()) {
    switch (response.name) {
      case 'time-pos':
        playerWin.webContents.send('time-update', response.data || 0);
        break;
      case 'duration':
        playerWin.webContents.send('duration-update', response.data || 0);
        break;
      case 'pause':
        playerWin.webContents.send('pause-state', response.data);
        break;
      case 'volume':
        playerWin.webContents.send('volume-update', response.data);
        break;
      case 'track-list':
        playerWin.webContents.send('track-list-update', response.data);
        break;
    }
  }
}

function sendMPVCommand(command) {
  if (!isReady || !mpvSocket || mpvSocket.destroyed) {
    commandQueue.push(command);
    return;
  }
  try {
      const json = JSON.stringify(command) + '\n';
      mpvSocket.write(json);
  } catch(e) {
      console.error('[Player] Socket write error:', e);
  }
}

let handlersRegistered = false;
function registerIPC() {
    if (handlersRegistered) return;
    handlersRegistered = true;

    ipcMain.handle('mpv-command', async (event, command, ...args) => {
        sendMPVCommand({ command: [command, ...args] });
        return { success: true };
    });

    ipcMain.handle('load-file', async (event, url) => {
        sendMPVCommand({ command: ['loadfile', url] });
        return { success: true };
    });

    ipcMain.handle('play-pause', async () => {
        sendMPVCommand({ command: ['cycle', 'pause'] });
        return { success: true };
    });

    ipcMain.handle('seek', async (event, seconds) => {
        sendMPVCommand({ command: ['seek', seconds, 'absolute'] });
        return { success: true };
    });

    ipcMain.handle('seek-relative', async (event, seconds) => {
        sendMPVCommand({ command: ['seek', seconds, 'relative'] });
        return { success: true };
    });

    ipcMain.handle('set-volume', async (event, volume) => {
        sendMPVCommand({ command: ['set_property', 'volume', volume] });
        return { success: true };
    });

    ipcMain.handle('set-subtitle', async (event, id) => {
        sendMPVCommand({ command: ['set_property', 'sid', id] });
        return { success: true };
    });

    ipcMain.handle('set-audio', async (event, id) => {
        sendMPVCommand({ command: ['set_property', 'aid', id] });
        return { success: true };
    });

    ipcMain.handle('stop', async () => {
        sendMPVCommand({ command: ['stop'] });
        return { success: true };
    });
}

export { openPlayer, registerIPC, initPlayer };