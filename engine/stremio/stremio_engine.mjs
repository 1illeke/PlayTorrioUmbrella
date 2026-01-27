/**
 * Stremio Torrent Engine Integration
 * Uses the bundled Stremio server.js for FAST torrent streaming
 */

import { spawn, fork } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Engine configuration
const ENGINE_PORT = 6988;
const ENGINE_URL = `http://127.0.0.1:${ENGINE_PORT}`;

let engineProcess = null;
let isReady = false;
let cachePath = null;
let ffmpegPath = null;
let ffprobePath = null;
let logFile = null;

// Track active torrents
const activeTorrents = new Map();
const torrentTimestamps = new Map();

/**
 * Log to file for debugging in production builds
 */
function logToFile(message) {
    const timestamp = new Date().toISOString();
    const logMsg = `[${timestamp}] ${message}\n`;
    console.log(message);
    if (logFile) {
        try {
            fs.appendFileSync(logFile, logMsg);
        } catch (e) {}
    }
}

/**
 * Check if we're running in a packaged Electron app
 */
function isPackaged() {
    // In packaged apps, __dirname will contain 'app.asar'
    return __dirname.includes('app.asar') || (process.resourcesPath && fs.existsSync(path.join(process.resourcesPath, 'app.asar')));
}

/**
 * Get path to engine/server.cjs (in parent directory)
 * Handles both development and production (asar unpacked) paths
 */
function getEnginePath() {
    // Try multiple possible locations
    const possiblePaths = [
        // Development / unpacked from asar - server.cjs is in parent engine folder
        path.join(__dirname, '..', 'server.cjs'),
        // Inside asar but unpacked (when __dirname is inside app.asar)
        path.join(__dirname.replace('app.asar', 'app.asar.unpacked'), '..', 'server.cjs'),
        // Production: resources/app.asar.unpacked/engine
        path.join(process.resourcesPath || '', 'app.asar.unpacked', 'engine', 'server.cjs'),
    ];
    
    logToFile(`[StremioEngine] __dirname: ${__dirname}`);
    logToFile(`[StremioEngine] process.resourcesPath: ${process.resourcesPath || 'undefined'}`);
    logToFile(`[StremioEngine] isPackaged: ${isPackaged()}`);
    
    for (const enginePath of possiblePaths) {
        logToFile(`[StremioEngine] Checking: ${enginePath}`);
        if (fs.existsSync(enginePath)) {
            logToFile(`[StremioEngine] Found engine at: ${enginePath}`);
            return enginePath;
        }
    }
    
    logToFile('[StremioEngine] Engine not found in any location!');
    return null;
}

/**
 * Wait for engine to be ready
 */
async function waitForReady(maxAttempts = 60, delayMs = 500) {
    for (let i = 0; i < maxAttempts; i++) {
        try {
            const response = await fetch(`${ENGINE_URL}/stats.json`, { timeout: 2000 });
            if (response.ok) {
                return true;
            }
        } catch (e) {
            // Not ready yet
        }
        await new Promise(r => setTimeout(r, delayMs));
    }
    return false;
}

/**
 * Start the Stremio engine
 */
export async function startEngine(userDataPath, ffmpegBin = null, ffprobeBin = null) {
    // Set up log file in userData for debugging
    logFile = path.join(userDataPath, 'stremio_engine.log');
    try {
        fs.writeFileSync(logFile, `=== Stremio Engine Log Started ${new Date().toISOString()} ===\n`);
    } catch (e) {}
    
    logToFile(`[StremioEngine] startEngine called`);
    logToFile(`[StremioEngine] userDataPath: ${userDataPath}`);
    logToFile(`[StremioEngine] process.execPath: ${process.execPath}`);
    
    if (isReady && engineProcess) {
        logToFile('[StremioEngine] Already running');
        return { success: true, url: ENGINE_URL };
    }
    
    const enginePath = getEnginePath();
    if (!enginePath) {
        logToFile('[StremioEngine] ERROR: Engine not found!');
        throw new Error('Stremio engine not found in /engine folder');
    }
    
    // Store FFmpeg paths
    ffmpegPath = ffmpegBin;
    ffprobePath = ffprobeBin;
    
    // Set up cache path - engine will create stremio-cache subfolder
    cachePath = userDataPath;
    
    logToFile(`[StremioEngine] Starting from: ${enginePath}`);
    logToFile(`[StremioEngine] Data path: ${cachePath}`);
    logToFile(`[StremioEngine] FFmpeg: ${ffmpegPath || 'system'}`);
    
    // Build environment with FFmpeg paths
    const engineEnv = {
        ...process.env,
        STREMIO_CACHE: cachePath,
        ENGINE_PORT: String(ENGINE_PORT),
        NO_CORS: '1',
        APP_PATH: cachePath,
        STREMIO_PATH: cachePath
    };
    
    // Add FFmpeg paths if provided - use multiple env var names for compatibility
    if (ffmpegPath) {
        engineEnv.FFMPEG_BIN = ffmpegPath;
        engineEnv.FFMPEG_PATH = ffmpegPath;
        engineEnv.FFMPEG = ffmpegPath;
    }
    if (ffprobePath) {
        engineEnv.FFPROBE_BIN = ffprobePath;
        engineEnv.FFPROBE_PATH = ffprobePath;
        engineEnv.FFPROBE = ffprobePath;
    }
    
    logToFile(`[StremioEngine] Spawning engine...`);
    
    // In packaged Electron apps, we need to use fork() which properly uses
    // Electron's embedded Node.js runtime. In development, we can use either.
    try {
        if (isPackaged()) {
            // For packaged apps, use spawn with electron as node
            // Electron can run .cjs files when passed as argument
            logToFile(`[StremioEngine] Using spawn with process.execPath for packaged app`);
            engineProcess = spawn(process.execPath, [enginePath], {
                env: {
                    ...engineEnv,
                    ELECTRON_RUN_AS_NODE: '1'  // This makes Electron act as Node.js
                },
                stdio: ['ignore', 'pipe', 'pipe'],
                detached: false,
                windowsHide: true
            });
        } else {
            // Development mode - use fork
            logToFile(`[StremioEngine] Using fork for development`);
            engineProcess = fork(enginePath, [], {
                env: engineEnv,
                stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
                detached: false,
                windowsHide: true
            });
        }
    } catch (spawnError) {
        logToFile(`[StremioEngine] Spawn/fork error: ${spawnError.message}`);
        throw spawnError;
    }
    
    engineProcess.stdout?.on('data', (data) => {
        const msg = data.toString().trim();
        if (msg && !msg.includes('DEBUG')) {
            logToFile(`[StremioEngine] ${msg}`);
        }
    });
    
    engineProcess.stderr?.on('data', (data) => {
        const msg = data.toString().trim();
        if (msg) {
            logToFile(`[StremioEngine] STDERR: ${msg}`);
        }
    });
    
    engineProcess.on('error', (err) => {
        logToFile(`[StremioEngine] Process error: ${err.message}`);
        isReady = false;
    });
    
    engineProcess.on('exit', (code) => {
        logToFile(`[StremioEngine] Process exited with code ${code}`);
        isReady = false;
        engineProcess = null;
    });
    
    // Wait for engine to be ready
    console.log('[StremioEngine] Waiting for engine to start...');
    const ready = await waitForReady(60, 500);
    
    if (!ready) {
        throw new Error('Stremio engine failed to start');
    }
    
    isReady = true;
    console.log(`[StremioEngine] ⚡ Engine ready at ${ENGINE_URL}`);
    
    return { success: true, url: ENGINE_URL };
}

/**
 * Stop the engine
 */
export async function stopEngine() {
    if (!engineProcess) {
        return { success: true };
    }
    
    console.log('[StremioEngine] Stopping...');
    
    try {
        // Remove all torrents first
        try {
            await fetch(`${ENGINE_URL}/removeAll`, { timeout: 2000 });
        } catch (e) {}
        
        // Kill process
        engineProcess.kill('SIGTERM');
        await new Promise(r => setTimeout(r, 500));
        
        if (engineProcess && !engineProcess.killed) {
            engineProcess.kill('SIGKILL');
        }
    } catch (e) {}
    
    engineProcess = null;
    isReady = false;
    activeTorrents.clear();
    torrentTimestamps.clear();
    
    // Clean up cache directory
    const cacheDir = path.join(cachePath, 'stremio-cache');
    if (cacheDir && fs.existsSync(cacheDir)) {
        try {
            fs.rmSync(cacheDir, { recursive: true, force: true });
            console.log(`[StremioEngine] Cache cleaned: ${cacheDir}`);
        } catch (e) {
            console.error('[StremioEngine] Cache cleanup error:', e.message);
        }
    }
    
    console.log('[StremioEngine] Stopped');
    return { success: true };
}

/**
 * Check if engine is ready
 */
export function isEngineReady() {
    return isReady;
}

/**
 * Extract info hash from magnet
 */
function extractHash(magnet) {
    const match = magnet.match(/btih:([a-fA-F0-9]{40})/i) || magnet.match(/btih:([a-zA-Z0-9]{32})/i);
    return match ? match[1].toLowerCase() : null;
}

/**
 * Add a torrent and get file list
 */
export async function addTorrent(magnet) {
    if (!isReady) {
        throw new Error('Engine not ready');
    }
    
    const infoHash = extractHash(magnet);
    if (!infoHash) {
        throw new Error('Invalid magnet link');
    }
    
    try {
        // Create torrent in engine
        const response = await fetch(`${ENGINE_URL}/${infoHash}/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                uri: magnet,
                peerSearch: { min: 40, max: 200, sources: ['dht:' + infoHash] }
            })
        });
        
        if (!response.ok) {
            throw new Error(`Failed to create torrent: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Track locally
        activeTorrents.set(infoHash, { magnet, addedAt: Date.now() });
        torrentTimestamps.set(infoHash, Date.now());
        
        console.log(`[StremioEngine] ⚡ Added: ${infoHash.substring(0, 8)}...`);
        
        return {
            infoHash,
            files: data.files || [],
            ...data
        };
    } catch (error) {
        console.error('[StremioEngine] Add error:', error.message);
        throw error;
    }
}

/**
 * Get torrent files
 */
export async function getTorrentFiles(magnet) {
    const result = await addTorrent(magnet);
    
    const videoRegex = /\.(mp4|mkv|avi|mov|webm|m4v|wmv|flv|ts|m2ts)$/i;
    const subRegex = /\.(srt|vtt|ass|ssa|sub)$/i;
    
    const videoFiles = [];
    const subtitleFiles = [];
    
    (result.files || []).forEach((file, index) => {
        const fileInfo = {
            index,
            name: file.name || file.path || `File ${index}`,
            path: file.path || file.name,
            size: file.length || file.size || 0
        };
        
        if (videoRegex.test(fileInfo.name)) {
            videoFiles.push(fileInfo);
        } else if (subRegex.test(fileInfo.name)) {
            subtitleFiles.push(fileInfo);
        }
    });
    
    // Sort by size
    videoFiles.sort((a, b) => b.size - a.size);
    
    return {
        infoHash: result.infoHash,
        name: result.name || 'Unknown',
        videoFiles,
        subtitleFiles,
        files: videoFiles,
        totalSize: result.files?.reduce((sum, f) => sum + (f.length || f.size || 0), 0) || 0
    };
}

/**
 * Get stream URL for a file
 */
export function getStreamUrl(infoHash, fileIndex) {
    return `${ENGINE_URL}/${infoHash}/${fileIndex}`;
}

/**
 * Get torrent stats
 */
export async function getStats(infoHash) {
    if (!isReady) return null;
    
    try {
        const response = await fetch(`${ENGINE_URL}/${infoHash}/stats.json`);
        if (response.ok) {
            torrentTimestamps.set(infoHash, Date.now());
            return await response.json();
        }
    } catch (e) {}
    
    return null;
}

/**
 * Remove a torrent
 */
export async function removeTorrent(hash) {
    const infoHash = hash.toLowerCase();
    
    try {
        await fetch(`${ENGINE_URL}/${infoHash}/remove`);
        activeTorrents.delete(infoHash);
        torrentTimestamps.delete(infoHash);
        console.log(`[StremioEngine] Removed: ${infoHash.substring(0, 8)}...`);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

/**
 * Get overall status
 */
export async function getStatus() {
    if (!isReady) {
        return { running: false, activeTorrents: 0 };
    }
    
    try {
        const response = await fetch(`${ENGINE_URL}/stats.json`);
        if (response.ok) {
            const stats = await response.json();
            return {
                running: true,
                url: ENGINE_URL,
                activeTorrents: Object.keys(stats).length,
                stats
            };
        }
    } catch (e) {}
    
    return { running: true, activeTorrents: activeTorrents.size };
}

// Auto-cleanup inactive torrents
setInterval(async () => {
    if (!isReady) return;
    
    const now = Date.now();
    const TIMEOUT = 30 * 60 * 1000;
    
    for (const [hash, timestamp] of torrentTimestamps.entries()) {
        if (now - timestamp > TIMEOUT) {
            console.log(`[StremioEngine] Auto-removing: ${hash.substring(0, 8)}...`);
            await removeTorrent(hash);
        }
    }
}, 10 * 60 * 1000);

/**
 * Clear the stremio cache directory
 */
export function clearStremioCache() {
    if (!cachePath) {
        return { success: false, message: 'Cache path not set' };
    }
    
    const cacheDir = path.join(cachePath, 'stremio-cache');
    if (fs.existsSync(cacheDir)) {
        try {
            fs.rmSync(cacheDir, { recursive: true, force: true });
            console.log(`[StremioEngine] Cache cleared: ${cacheDir}`);
            return { success: true, message: `Stremio cache cleared: ${cacheDir}` };
        } catch (e) {
            console.error('[StremioEngine] Cache cleanup error:', e.message);
            return { success: false, message: `Failed to clear stremio cache: ${e.message}` };
        }
    }
    
    return { success: true, message: 'Stremio cache already empty' };
}

export { activeTorrents, torrentTimestamps, ENGINE_URL };
