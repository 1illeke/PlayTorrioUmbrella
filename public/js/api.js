// API Functions
// This file handles all API calls (TMDB, backend, resume/save, etc.)

// ===== RESUME/SAVE FUNCTIONS =====

async function fetchResume(key) {
    if (!key) return null;
    try {
        const r = await fetch(`${API_BASE_URL}/resume?key=${encodeURIComponent(key)}`);
        if (!r.ok) return null;
        const j = await r.json();
        if (j && typeof j.position === 'number' && j.position > 0) return j;
    } catch(_) {}
    return null;
}

async function saveResume() {
    if (!resumeKey || !customVideo || !isFinite(customVideo.duration) || !isFinite(customVideo.currentTime)) return;
    const pos = Math.max(0, Math.floor(customVideo.currentTime || 0));
    const dur = Math.max(0, Math.floor(customVideo.duration || 0));
    const title = (currentContent?.title || currentContent?.name || currentSelectedVideoName || '');
    if (dur === 0 || pos === 0) return;
    try {
        const payload = { 
            key: resumeKey, 
            position: pos, 
            duration: dur, 
            title 
        };
        // Add poster and metadata if available from currentContent
        if (currentContent) {
            if (currentContent.poster_path) payload.poster_path = currentContent.poster_path;
            if (currentContent.id) payload.tmdb_id = currentContent.id;
            if (currentMediaType) payload.media_type = currentMediaType;
        }
        await fetch(`${API_BASE_URL}/resume`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch(_) {}
}

// ===== TMDB API FUNCTIONS =====

async function fetchTmdbDetailsById(type, tmdbId) {
    try {
        if (!tmdbId) return null;
        const url = `https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=credits,videos,external_ids`;
        const response = await fetch(url);
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        console.error('[API] TMDB fetch error:', error);
        return null;
    }
}

async function searchTmdb(query, type = 'multi') {
    try {
        const endpoint = type === 'multi' ? 'search/multi' : `search/${type}`;
        const url = `https://api.themoviedb.org/3/${endpoint}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`;
        const response = await fetch(url);
        if (!response.ok) return [];
        const data = await response.json();
        return data.results || [];
    } catch (error) {
        console.error('[API] TMDB search error:', error);
        return [];
    }
}

async function getTmdbExternalIds(type, tmdbId) {
    try {
        const url = `https://api.themoviedb.org/3/${type}/${tmdbId}/external_ids?api_key=${TMDB_API_KEY}`;
        const response = await fetch(url);
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        console.error('[API] TMDB external IDs error:', error);
        return null;
    }
}

// ===== BACKEND API FUNCTIONS =====

async function fetchFromBackend(endpoint, options = {}) {
    try {
        const url = `${API_BASE_URL}${endpoint}`;
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`Backend API error: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('[API] Backend fetch error:', error);
        throw error;
    }
}

async function postToBackend(endpoint, data) {
    try {
        const url = `${API_BASE_URL}${endpoint}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            throw new Error(`Backend API error: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('[API] Backend post error:', error);
        throw error;
    }
}

// ===== DEBRID API FUNCTIONS =====

async function checkDebridStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/debrid/status`);
        if (!response.ok) return { enabled: false };
        return await response.json();
    } catch (error) {
        console.error('[API] Debrid status check error:', error);
        return { enabled: false };
    }
}

async function unrestrictDebridLink(link) {
    try {
        const response = await fetch(`${API_BASE_URL}/debrid/link`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ link })
        });
        if (!response.ok) throw new Error('Unrestrict failed');
        return await response.json();
    } catch (error) {
        console.error('[API] Debrid unrestrict error:', error);
        throw error;
    }
}

// ===== SUBTITLE API FUNCTIONS =====

async function downloadSubtitle(url, preferredName) {
    try {
        const response = await fetch(`${API_BASE_URL}/subtitles/download-direct`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, preferredName })
        });
        if (!response.ok) throw new Error('Subtitle download failed');
        return await response.json();
    } catch (error) {
        console.error('[API] Subtitle download error:', error);
        throw error;
    }
}

async function deleteSubtitle(filename) {
    try {
        await fetch(`${API_BASE_URL}/subtitles/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename })
        });
    } catch (error) {
        console.error('[API] Subtitle delete error:', error);
    }
}

// Export functions for use in other modules
window.fetchResume = fetchResume;
window.saveResume = saveResume;
window.fetchTmdbDetailsById = fetchTmdbDetailsById;
window.searchTmdb = searchTmdb;
window.getTmdbExternalIds = getTmdbExternalIds;
window.fetchFromBackend = fetchFromBackend;
window.postToBackend = postToBackend;
window.checkDebridStatus = checkDebridStatus;
window.unrestrictDebridLink = unrestrictDebridLink;
window.downloadSubtitle = downloadSubtitle;
window.deleteSubtitle = deleteSubtitle;

console.log('[API] API functions module loaded');
