/**
 * WebTorrent Engine - High-performance torrent streaming
 * Optimized with best trackers and aggressive settings
 */

import WebTorrent from 'webtorrent';
import path from 'path';
import fs from 'fs';
import os from 'os';

// Cross-platform temp directory
function getTempDir() {
    const tempBase = process.env.TEMP || process.env.TMP || os.tmpdir();
    const cacheDir = path.join(tempBase, 'playtorrio-webtorrent');
    if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
    }
    return cacheDir;
}

// Best public trackers for maximum connectivity
const TRACKERS = [
    'udp://tracker.opentrackr.org:1337/announce',
    'udp://open.stealth.si:80/announce',
    'udp://tracker.openbittorrent.com:6969/announce',
    'udp://exodus.desync.com:6969/announce',
    'udp://tracker.torrent.eu.org:451/announce',
    'udp://open.demonii.com:1337/announce',
    'udp://tracker.moeking.me:6969/announce',
    'udp://explodie.org:6969/announce',
    'udp://tracker.dler.org:6969/announce',
    'http://tracker.opentrackr.org:1337/announce',
    'wss://tracker.openwebtorrent.com',
    'wss://tracker.btorrent.xyz',
];

// Single global client - WebTorrent works best this way
let client = null;
let isReady = false;
let cachePath = null;

// Store torrents by infoHash for quick lookup
const torrentMap = new Map();

/**
 * Extract info hash from magnet link
 */
function extractInfoHash(magnet) {
    const match = magnet.match(/btih:([a-fA-F0-9]{40})/i) || magnet.match(/btih:([a-zA-Z0-9]{32})/i);
    return match ? match[1].toLowerCase() : null;
}

/**
 * Initialize the WebTorrent client
 */
function initClient() {
    if (client) return client;
    
    console.log('[WebTorrent] Creating client...');
    cachePath = getTempDir();
    
    client = new WebTorrent({
        maxConns: 200,        // Increased from 100
        dht: true,
        lsd: true,
        webSeeds: true,
        utp: true,
        // Aggressive download settings for maximum speed
        downloadLimit: -1,
        uploadLimit: 5 * 1024 * 1024,  // Limit upload to 5MB/s to prioritize download
        // Piece selection strategy
        strategy: 'rarest',
    });

    client.on('error', (err) => {
        console.error('[WebTorrent] Client error:', err.message);
    });
    
    // Log when torrents are added
    client.on('torrent', (torrent) => {
        console.log(`[WebTorrent] Torrent added to client: ${torrent.infoHash.substring(0, 8)}...`);
    });

    console.log(`[WebTorrent] Client created, cache: ${cachePath}`);
    return client;
}

/**
 * Start the engine
 */
export async function startEngine(instanceCount = 1) {
    // WebTorrent works best with single instance
    initClient();
    isReady = true;
    console.log('[WebTorrent] Engine started');
    return { success: true, instances: 1 };
}

/**
 * Stop the engine
 */
export async function stopEngine() {
    return new Promise((resolve) => {
        if (!client) {
            resolve({ success: true });
            return;
        }
        
        console.log('[WebTorrent] Stopping engine...');
        
        client.destroy((err) => {
            if (err) console.error('[WebTorrent] Destroy error:', err.message);
            client = null;
            isReady = false;
            torrentMap.clear();
            
            // Clean up cache
            try {
                const cacheDir = getTempDir();
                if (fs.existsSync(cacheDir)) {
                    fs.rmSync(cacheDir, { recursive: true, force: true });
                    console.log(`[WebTorrent] Cache cleaned: ${cacheDir}`);
                }
            } catch (e) {
                console.error('[WebTorrent] Cache cleanup error:', e.message);
            }
            
            console.log('[WebTorrent] Engine stopped');
            resolve({ success: true });
        });
    });
}

/**
 * Check if engine is ready
 */
export function isEngineReady() {
    return isReady && client !== null;
}

/**
 * Add a torrent and return file info
 */
export async function addTorrent(magnet) {
    if (!client) initClient();
    
    const expectedHash = extractInfoHash(magnet);
    console.log(`[WebTorrent] Adding torrent: ${expectedHash || magnet.substring(0, 40)}...`);
    
    return new Promise((resolve, reject) => {
        // Check if we already have this torrent
        if (expectedHash && torrentMap.has(expectedHash)) {
            const existing = torrentMap.get(expectedHash);
            if (existing.ready) {
                console.log(`[WebTorrent] Using cached torrent: ${expectedHash.substring(0, 8)}...`);
                resolve(formatTorrentInfo(existing));
                return;
            }
        }
        
        // Also check via client.get
        const existingTorrent = client.get(magnet) || (expectedHash && client.get(expectedHash));
        if (existingTorrent) {
            // Check if it's ready (has files)
            if (existingTorrent.files && existingTorrent.files.length > 0) {
                console.log(`[WebTorrent] Found existing ready torrent`);
                torrentMap.set(existingTorrent.infoHash.toLowerCase(), existingTorrent);
                resolve(formatTorrentInfo(existingTorrent));
                return;
            } else if (typeof existingTorrent.once === 'function') {
                // Wait for it to be ready (only if it has event methods)
                console.log(`[WebTorrent] Waiting for existing torrent to be ready...`);
                existingTorrent.once('ready', () => {
                    torrentMap.set(existingTorrent.infoHash.toLowerCase(), existingTorrent);
                    resolve(formatTorrentInfo(existingTorrent));
                });
                existingTorrent.once('error', (err) => {
                    reject(err);
                });
                return;
            }
            // If no .once method, fall through to add new torrent
        }
        
        let resolved = false;
        
        // Add new torrent
        const torrent = client.add(magnet, {
            path: cachePath,
            announce: TRACKERS,
        });
        
        torrent.on('infoHash', () => {
            console.log(`[WebTorrent] Got infoHash: ${torrent.infoHash}`);
            // Store immediately so we can find it later
            torrentMap.set(torrent.infoHash.toLowerCase(), torrent);
        });
        
        torrent.on('metadata', () => {
            console.log(`[WebTorrent] Got metadata: ${torrent.name} (${torrent.files.length} files)`);
        });
        
        torrent.on('ready', () => {
            if (resolved) return;
            resolved = true;
            
            console.log(`[WebTorrent] Ready: ${torrent.infoHash.substring(0, 8)}... - ${torrent.name}`);
            torrentMap.set(torrent.infoHash.toLowerCase(), torrent);
            resolve(formatTorrentInfo(torrent));
        });
        
        torrent.on('error', (err) => {
            if (resolved) return;
            
            // Handle duplicate torrent error
            if (err.message && err.message.includes('Cannot add duplicate')) {
                console.log(`[WebTorrent] Duplicate torrent, finding existing...`);
                const hash = extractInfoHash(magnet);
                if (hash) {
                    const existing = torrentMap.get(hash) || client.get(hash);
                    if (existing) {
                        resolved = true;
                        resolve(formatTorrentInfo(existing));
                        return;
                    }
                }
            }
            
            resolved = true;
            console.error(`[WebTorrent] Torrent error:`, err.message);
            reject(err);
        });
        
        torrent.on('warning', (warn) => {
            // Only log important warnings
            const msg = warn.message || String(warn);
            if (!msg.includes('WebSocket') && !msg.includes('tracker')) {
                console.warn(`[WebTorrent] Warning:`, msg);
            }
        });
        
        torrent.on('wire', (wire) => {
            console.log(`[WebTorrent] Peer connected: ${wire.remoteAddress || 'unknown'}`);
        });
        
        // Log download progress periodically
        let lastProgress = 0;
        const progressInterval = setInterval(() => {
            if (resolved || !torrent) {
                clearInterval(progressInterval);
                return;
            }
            const progress = Math.round(torrent.progress * 100);
            if (progress !== lastProgress) {
                console.log(`[WebTorrent] Download: ${progress}%, Speed: ${(torrent.downloadSpeed / 1024 / 1024).toFixed(2)} MB/s, Peers: ${torrent.numPeers}`);
                lastProgress = progress;
            }
        }, 5000);
        
        // Timeout after 90 seconds
        setTimeout(() => {
            if (!resolved) {
                resolved = true;
                console.error(`[WebTorrent] Timeout after 90s - no metadata received`);
                console.log(`[WebTorrent] Peers: ${torrent.numPeers}, Progress: ${torrent.progress}`);
                
                // Don't destroy - might still work
                reject(new Error('Torrent metadata timeout - try again or check magnet link'));
            }
        }, 90000);
    });
}

/**
 * Format torrent info for API response
 */
function formatTorrentInfo(torrent) {
    return {
        infoHash: torrent.infoHash.toLowerCase(),
        name: torrent.name,
        files: torrent.files.map((file, index) => ({
            index,
            name: file.name,
            path: file.path,
            length: file.length,
            size: file.length,
        })),
        totalSize: torrent.length,
    };
}

/**
 * Get torrent files with video/subtitle filtering
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
            size: file.length || file.size || 0,
        };
        
        if (videoRegex.test(fileInfo.name)) {
            videoFiles.push(fileInfo);
        } else if (subRegex.test(fileInfo.name)) {
            subtitleFiles.push(fileInfo);
        }
    });
    
    videoFiles.sort((a, b) => b.size - a.size);
    
    return {
        infoHash: result.infoHash,
        name: result.name || 'Unknown',
        videoFiles,
        subtitleFiles,
        files: videoFiles,
        totalSize: result.totalSize || 0,
    };
}

/**
 * Get a file object by infoHash and index
 */
export function getFile(infoHash, fileIndex) {
    const hash = infoHash.toLowerCase();
    
    // Try our map first
    let torrent = torrentMap.get(hash);
    
    // Fallback to client.get
    if (!torrent && client) {
        torrent = client.get(hash);
        if (torrent) {
            torrentMap.set(hash, torrent);
        }
    }
    
    if (!torrent) {
        console.error(`[WebTorrent] getFile: Torrent not found: ${hash.substring(0, 8)}...`);
        console.log(`[WebTorrent] Known torrents:`, Array.from(torrentMap.keys()).map(k => k.substring(0, 8)));
        return null;
    }
    
    // Check if torrent has files
    if (!torrent.files || torrent.files.length === 0) {
        console.error(`[WebTorrent] getFile: Torrent has no files yet (metadata not ready)`);
        return null;
    }
    
    const file = torrent.files[fileIndex];
    if (!file) {
        console.error(`[WebTorrent] getFile: File index ${fileIndex} not found in torrent (has ${torrent.files.length} files)`);
        return null;
    }
    
    // Log file info
    console.log(`[WebTorrent] getFile: Found ${file.name} (${(file.length / 1024 / 1024).toFixed(1)}MB)`);
    
    return file;
}

/**
 * Get a file stream
 */
export function getFileStream(infoHash, fileIndex, range = null) {
    const file = getFile(infoHash, fileIndex);
    if (!file) return null;
    
    // Get the torrent to check download status
    const hash = infoHash.toLowerCase();
    const torrent = torrentMap.get(hash) || (client && client.get(hash));
    
    if (torrent) {
        // Log current download status
        console.log(`[WebTorrent] Stream request - Progress: ${(torrent.progress * 100).toFixed(1)}%, Peers: ${torrent.numPeers}, Speed: ${(torrent.downloadSpeed / 1024 / 1024).toFixed(2)} MB/s`);
        
        // Deselect all files first
        torrent.files.forEach((f, i) => {
            if (i !== fileIndex) {
                try { f.deselect(); } catch(e) {}
            }
        });
    }
    
    // Select and prioritize this file
    try {
        file.select();
        // Set highest priority for streaming
        if (typeof file.priority === 'function') {
            file.priority(7);
        }
        
        // Prioritize first and last pieces for quick playback start
        if (torrent && torrent.pieces) {
            const pieceLength = torrent.pieceLength;
            const fileStart = file._startPiece || 0;
            const fileEnd = file._endPiece || torrent.pieces.length - 1;
            
            // Prioritize first 5% and last 5% of file for streaming
            const priorityCount = Math.ceil((fileEnd - fileStart) * 0.05);
            for (let i = 0; i < priorityCount; i++) {
                torrent.critical(fileStart + i, fileEnd - i);
            }
        }
    } catch(e) {
        console.warn('[WebTorrent] Could not prioritize file:', e.message);
    }
    
    console.log(`[WebTorrent] Creating stream for ${file.name}, range:`, range || 'full');
    
    try {
        let stream;
        if (range && (range.start !== undefined || range.end !== undefined)) {
            stream = file.createReadStream(range);
        } else {
            stream = file.createReadStream();
        }
        
        // Add error handler to the stream
        stream.on('error', (err) => {
            console.error(`[WebTorrent] Stream error for ${file.name}:`, err.message);
        });
        
        return stream;
    } catch (err) {
        console.error('[WebTorrent] Failed to create stream:', err.message);
        return null;
    }
}

/**
 * Get torrent stats
 */
export function getStats(infoHash) {
    const hash = infoHash.toLowerCase();
    const torrent = torrentMap.get(hash) || (client && client.get(hash));
    
    if (!torrent) return null;
    
    return {
        infoHash: torrent.infoHash,
        name: torrent.name,
        progress: torrent.progress,
        downloadSpeed: torrent.downloadSpeed,
        uploadSpeed: torrent.uploadSpeed,
        numPeers: torrent.numPeers,
        downloaded: torrent.downloaded,
        uploaded: torrent.uploaded,
        ratio: torrent.ratio,
        timeRemaining: torrent.timeRemaining,
    };
}

/**
 * Remove a torrent
 */
export async function removeTorrent(infoHash) {
    const hash = infoHash.toLowerCase();
    
    console.log(`[WebTorrent] removeTorrent called for: ${hash.substring(0, 8)}...`);
    
    return new Promise((resolve) => {
        let torrent = torrentMap.get(hash);
        
        // Also try to get from client directly
        if (!torrent && client) {
            torrent = client.get(hash);
        }
        
        if (!torrent) {
            console.log(`[WebTorrent] Torrent not found in map, checking client...`);
            // Try to find by iterating client torrents
            if (client && client.torrents) {
                for (const t of client.torrents) {
                    if (t.infoHash && t.infoHash.toLowerCase() === hash) {
                        torrent = t;
                        break;
                    }
                }
            }
        }
        
        if (!torrent) {
            console.log(`[WebTorrent] Torrent ${hash.substring(0, 8)}... not found, already removed`);
            torrentMap.delete(hash);
            resolve({ success: true });
            return;
        }
        
        console.log(`[WebTorrent] Destroying torrent: ${torrent.name || hash.substring(0, 8)}... (peers: ${torrent.numPeers})`);
        
        try {
            torrent.destroy({ destroyStore: true }, (err) => {
                if (err) {
                    console.error(`[WebTorrent] Error destroying torrent:`, err.message);
                }
                torrentMap.delete(hash);
                console.log(`[WebTorrent] Torrent destroyed: ${hash.substring(0, 8)}...`);
                resolve({ success: true });
            });
        } catch (err) {
            console.error(`[WebTorrent] Exception destroying torrent:`, err.message);
            torrentMap.delete(hash);
            resolve({ success: true });
        }
    });
}

/**
 * Get stream URL
 */
export function getStreamUrl(infoHash, fileIndex) {
    return `/api/alt-stream-file?hash=${infoHash}&file=${fileIndex}`;
}

/**
 * Get overall status
 */
export function getStatus() {
    return {
        running: isReady,
        instances: 1,
        activeTorrents: torrentMap.size,
        torrents: Array.from(torrentMap.keys()).map(h => h.substring(0, 8)),
    };
}

export { getTempDir, TRACKERS };
