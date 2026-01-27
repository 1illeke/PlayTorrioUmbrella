/**
 * Hybrid Torrent Engine - Combines WebTorrent + TorrentStream for maximum speed
 * Uses both engines simultaneously on the same torrent for swarm effect
 */

import * as WebTorrentEngine from '../webtorrent/webtorrent_engine.mjs';
import * as TorrentStreamEngine from '../torrentstream/torrentstream_engine.mjs';
import path from 'path';
import fs from 'fs';
import os from 'os';

// Cross-platform temp directory
function getTempDir() {
    const tempBase = process.env.TEMP || process.env.TMP || os.tmpdir();
    const cacheDir = path.join(tempBase, 'playtorrio-hybrid');
    if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
    }
    return cacheDir;
}

let isReady = false;
let webTorrentInstances = 1;
let torrentStreamInstances = 1;

/**
 * Start the hybrid engine
 */
export async function startEngine(wtInstances = 1, tsInstances = 1) {
    webTorrentInstances = Math.min(Math.max(wtInstances, 1), 3);
    torrentStreamInstances = Math.min(Math.max(tsInstances, 1), 3);
    
    console.log(`[HybridEngine] Starting with WT:${webTorrentInstances} + TS:${torrentStreamInstances}`);
    
    // Start both engines
    await Promise.all([
        WebTorrentEngine.startEngine(webTorrentInstances),
        TorrentStreamEngine.startEngine(torrentStreamInstances),
    ]);
    
    isReady = true;
    console.log('[HybridEngine] Both engines started');
    return { success: true, webTorrent: webTorrentInstances, torrentStream: torrentStreamInstances };
}

/**
 * Stop the hybrid engine
 */
export async function stopEngine() {
    await Promise.all([
        WebTorrentEngine.stopEngine(),
        TorrentStreamEngine.stopEngine(),
    ]);
    
    isReady = false;
    
    // Clean up cache
    try {
        const cacheDir = getTempDir();
        if (fs.existsSync(cacheDir)) {
            fs.rmSync(cacheDir, { recursive: true, force: true });
        }
    } catch (e) {}
    
    console.log('[HybridEngine] Stopped');
    return { success: true };
}

export function isEngineReady() {
    return isReady && WebTorrentEngine.isEngineReady() && TorrentStreamEngine.isEngineReady();
}

/**
 * Add torrent to both engines simultaneously
 */
export async function addTorrent(magnet) {
    if (!isReady) {
        throw new Error('Hybrid engine not ready');
    }
    
    // Add to both engines in parallel
    const [wtResult, tsResult] = await Promise.all([
        WebTorrentEngine.addTorrent(magnet).catch(e => null),
        TorrentStreamEngine.addTorrent(magnet).catch(e => null),
    ]);
    
    const result = wtResult || tsResult;
    if (!result) {
        throw new Error('Failed to add torrent to any engine');
    }
    
    console.log(`[HybridEngine] Added to both engines: ${result.infoHash.substring(0, 8)}...`);
    return result;
}

/**
 * Get file stream from the engine with best speed and availability
 */
export function getFileStream(infoHash, fileIndex, range = null) {
    // Get stats from both engines
    const wtStats = WebTorrentEngine.getStats(infoHash);
    const tsStats = TorrentStreamEngine.getStats(infoHash);
    
    // Prefer engine with better download speed AND more peers
    const wtScore = (wtStats?.downloadSpeed || 0) + (wtStats?.numPeers || 0) * 1000;
    const tsScore = (tsStats?.downloadSpeed || 0) + (tsStats?.numPeers || 0) * 1000;
    
    if (wtScore >= tsScore && wtStats) {
        console.log(`[HybridEngine] Using WebTorrent (score: ${wtScore.toFixed(0)})`);
        return WebTorrentEngine.getFileStream(infoHash, fileIndex, range);
    } else if (tsStats) {
        console.log(`[HybridEngine] Using TorrentStream (score: ${tsScore.toFixed(0)})`);
        return TorrentStreamEngine.getFileStream(infoHash, fileIndex, range);
    }
    
    // Fallback to any available
    return WebTorrentEngine.getFileStream(infoHash, fileIndex, range) ||
           TorrentStreamEngine.getFileStream(infoHash, fileIndex, range);
}

/**
 * Get file info from either engine
 */
export function getFile(infoHash, fileIndex) {
    return WebTorrentEngine.getFile(infoHash, fileIndex) ||
           TorrentStreamEngine.getFile(infoHash, fileIndex);
}

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
 * Get combined stats from both engines
 */
export function getStats(infoHash) {
    const wtStats = WebTorrentEngine.getStats(infoHash);
    const tsStats = TorrentStreamEngine.getStats(infoHash);
    
    if (!wtStats && !tsStats) return null;
    
    return {
        infoHash,
        name: wtStats?.name || tsStats?.name || 'Unknown',
        progress: Math.max(wtStats?.progress || 0, tsStats?.progress || 0),
        downloadSpeed: (wtStats?.downloadSpeed || 0) + (tsStats?.downloadSpeed || 0),
        uploadSpeed: (wtStats?.uploadSpeed || 0) + (tsStats?.uploadSpeed || 0),
        numPeers: (wtStats?.numPeers || 0) + (tsStats?.numPeers || 0),
        downloaded: Math.max(wtStats?.downloaded || 0, tsStats?.downloaded || 0),
        engines: {
            webTorrent: wtStats ? { speed: wtStats.downloadSpeed, peers: wtStats.numPeers } : null,
            torrentStream: tsStats ? { speed: tsStats.downloadSpeed, peers: tsStats.numPeers } : null,
        },
    };
}

/**
 * Remove torrent from both engines
 */
export async function removeTorrent(infoHash) {
    await Promise.all([
        WebTorrentEngine.removeTorrent(infoHash),
        TorrentStreamEngine.removeTorrent(infoHash),
    ]);
    return { success: true };
}

/**
 * Get overall status
 */
export function getStatus() {
    const wtStatus = WebTorrentEngine.getStatus();
    const tsStatus = TorrentStreamEngine.getStatus();
    
    return {
        running: isReady,
        webTorrent: wtStatus,
        torrentStream: tsStatus,
        totalInstances: (wtStatus?.instances || 0) + (tsStatus?.instances || 0),
    };
}

export function getStreamUrl(infoHash, fileIndex) {
    return `/api/hybrid-stream?hash=${infoHash}&file=${fileIndex}`;
}

export { getTempDir };
