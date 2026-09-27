// Configuration and Constants
// API configuration
const TMDB_API_KEY = 'c3515fdc674ea2bd7b514f4bc3616a4a';
const API_BASE_URL = 'http://localhost:6987/api';

// Export to window for other modules
window.TMDB_API_KEY = TMDB_API_KEY;
window.API_BASE_URL = API_BASE_URL;

// Streaming Settings (Global)
let useStreamingServers = localStorage.getItem('useStreamingServers') === 'true';
let selectedServer = localStorage.getItem('selectedServer') || 'Videasy';

console.log('[DEBUG] JavaScript loaded, useStreamingServers:', useStreamingServers);

// Global state variables
let currentUIMode = localStorage.getItem('uiMode') || 'new';
let currentTheme = localStorage.getItem('appTheme') || 'default';
let useTorrentless = false;
let useDebrid = false;
let debridAuth = false;
let debridProvider = 'realdebrid';
let hasApiKey = false;
let discordActivityEnabled = true;

// Export global state to window for other modules
Object.defineProperty(window, 'useDebrid', {
    get: function() { return useDebrid; },
    set: function(val) { useDebrid = val; }
});
Object.defineProperty(window, 'useTorrentless', {
    get: function() { return useTorrentless; },
    set: function(val) { useTorrentless = val; }
});
Object.defineProperty(window, 'debridAuth', {
    get: function() { return debridAuth; },
    set: function(val) { debridAuth = val; }
});
Object.defineProperty(window, 'debridProvider', {
    get: function() { return debridProvider; },
    set: function(val) { debridProvider = val; }
});

// Theme definitions
const themes = {
    'default': {
        primary: '#2a1847',
        secondary: '#8b5cf6',
        tertiary: '#c084fc',
        dark: '#120a1f',
        light: '#f8f9fa',
        gray: '#6c757d',
        accent: '#a855f7',
        cardBg: '#2a1847',
        modalBg: 'linear-gradient(135deg, #2a1847, #120a1f)',
        headerBg: '#2a1847',
        inputBg: 'rgba(255, 255, 255, 0.1)',
        hoverBg: 'rgba(168, 85, 247, 0.2)'
    },
    'green-forest': {
        primary: '#1a3a2e',
        secondary: '#4caf50',
        tertiary: '#81c784',
        dark: '#0f1e17',
        light: '#f1f8f4',
        gray: '#6c8073',
        accent: '#66bb6a',
        cardBg: '#1e4d3a',
        modalBg: 'linear-gradient(135deg, #1a3a2e, #0f1e17)',
        headerBg: '#1a3a2e',
        inputBg: 'rgba(76, 175, 80, 0.15)',
        hoverBg: 'rgba(76, 175, 80, 0.25)'
    },
    'cyberpunk-neon': {
        primary: '#1a1a2e',
        secondary: '#ff00ff',
        tertiary: '#00ffff',
        dark: '#0f0f1e',
        light: '#f0f0ff',
        gray: '#7070a0',
        accent: '#ff00aa',
        cardBg: '#252540',
        modalBg: 'linear-gradient(135deg, #1a1a2e, #0f0f1e)',
        headerBg: '#1a1a2e',
        inputBg: 'rgba(255, 0, 255, 0.15)',
        hoverBg: 'rgba(255, 0, 255, 0.3)'
    },
    'ocean-breeze': {
        primary: '#1e3a5f',
        secondary: '#2196f3',
        tertiary: '#64b5f6',
        dark: '#0d1f36',
        light: '#e3f2fd',
        gray: '#607d8b',
        accent: '#42a5f5',
        cardBg: '#2a4a6f',
        modalBg: 'linear-gradient(135deg, #1e3a5f, #0d1f36)',
        headerBg: '#1e3a5f',
        inputBg: 'rgba(33, 150, 243, 0.15)',
        hoverBg: 'rgba(33, 150, 243, 0.25)'
    },
    'cherry-blossom': {
        primary: '#4a2545',
        secondary: '#ff4081',
        tertiary: '#ff80ab',
        dark: '#1a0e1a',
        light: '#fff0f5',
        gray: '#8e7a8b',
        accent: '#f48fb1',
        cardBg: '#5a3555',
        modalBg: 'linear-gradient(135deg, #4a2545, #1a0e1a)',
        headerBg: '#4a2545',
        inputBg: 'rgba(255, 64, 129, 0.15)',
        hoverBg: 'rgba(255, 64, 129, 0.25)'
    },
    'midnight-dark': {
        primary: '#1c1c2e',
        secondary: '#6366f1',
        tertiary: '#818cf8',
        dark: '#0a0a14',
        light: '#e0e7ff',
        gray: '#64748b',
        accent: '#7c3aed',
        cardBg: '#2a2a40',
        modalBg: 'linear-gradient(135deg, #1c1c2e, #0a0a14)',
        headerBg: '#1c1c2e',
        inputBg: 'rgba(99, 102, 241, 0.15)',
        hoverBg: 'rgba(99, 102, 241, 0.25)'
    },
    'sunset-orange': {
        primary: '#3d2a1f',
        secondary: '#ff9800',
        tertiary: '#ffb74d',
        dark: '#1a0f0a',
        light: '#fff3e0',
        gray: '#8d6e63',
        accent: '#fb8c00',
        cardBg: '#4d3a2f',
        modalBg: 'linear-gradient(135deg, #3d2a1f, #1a0f0a)',
        headerBg: '#3d2a1f',
        inputBg: 'rgba(255, 152, 0, 0.15)',
        hoverBg: 'rgba(255, 152, 0, 0.25)'
    },
    'catppuccin-latte': {
        primary: '#ccd0da',
        secondary: '#8839ef',
        tertiary: '#7287fd',
        dark: '#dce0e8',
        light: '#4c4f69',
        gray: '#8c8fa1',
        accent: '#ea76cb',
        cardBg: '#bcc0cc',
        modalBg: 'linear-gradient(135deg, #ccd0da, #dce0e8)',
        headerBg: '#ccd0da',
        inputBg: 'rgba(136, 57, 239, 0.15)',
        hoverBg: 'rgba(136, 57, 239, 0.25)'
    },
    'catppuccin-frappe': {
        primary: '#414559',
        secondary: '#ca9ee6',
        tertiary: '#babbf1',
        dark: '#232634',
        light: '#c6d0f5',
        gray: '#838ba7',
        accent: '#f4b8e4',
        cardBg: '#51576d',
        modalBg: 'linear-gradient(135deg, #414559, #232634)',
        headerBg: '#414559',
        inputBg: 'rgba(202, 158, 230, 0.15)',
        hoverBg: 'rgba(202, 158, 230, 0.25)'
    },
    'catppuccin-macchiato': {
        primary: '#363a4f',
        secondary: '#c6a0f6',
        tertiary: '#b7bdf8',
        dark: '#181926',
        light: '#cad3f5',
        gray: '#8087a2',
        accent: '#f5bde6',
        cardBg: '#494d64',
        modalBg: 'linear-gradient(135deg, #363a4f, #181926)',
        headerBg: '#363a4f',
        inputBg: 'rgba(198, 160, 246, 0.15)',
        hoverBg: 'rgba(198, 160, 246, 0.25)'
    },
    'catppuccin-mocha': {
        primary: '#313244',
        secondary: '#cba6f7',
        tertiary: '#b4befe',
        dark: '#11111b',
        light: '#cdd6f4',
        gray: '#7f849c',
        accent: '#f5c2e7',
        cardBg: '#45475a',
        modalBg: 'linear-gradient(135deg, #313244, #11111b)',
        headerBg: '#313244',
        inputBg: 'rgba(203, 166, 247, 0.15)',
        hoverBg: 'rgba(203, 166, 247, 0.25)'
    }
};
if (typeof window !== 'undefined') window.themes = themes; // Export themes for Umbrella
