// DOM Element References
// This file contains all DOM element references used throughout the app

// DOM elements - Home
const moviesGrid = document.getElementById('moviesGrid');
const loadingIndicator = document.getElementById('loadingIndicator');
const homePageEl = document.getElementById('homePage');

// DOM elements - Genres
const genresBtn = document.getElementById('genresBtn');
const genresPageEl = document.getElementById('genresPage');
const genresGrid = document.getElementById('genresGrid');
const genresLoading = document.getElementById('genresLoading');

// DOM elements - Genre Details
const genreDetailsPageEl = document.getElementById('genreDetailsPage');
const genreTitleEl = document.getElementById('genreTitle');
const toggleMoviesBtn = document.getElementById('toggleMovies');
const toggleTVBtn = document.getElementById('toggleTV');
const genreResultsGrid = document.getElementById('genreResultsGrid');
const genreLoadingIndicator = document.getElementById('genreLoadingIndicator');
const genreEmptyMessage = document.getElementById('genreEmptyMessage');

// DOM elements - Modal and others
const detailsModal = document.getElementById('detailsModal');
const modalClose = document.getElementById('modalClose');
const modalBackdrop = document.getElementById('modalBackdrop');
const modalPoster = document.getElementById('modalPoster');
const modalTitle = document.getElementById('modalTitle');
const modalRating = document.getElementById('modalRating');
const modalYear = document.getElementById('modalYear');
const modalRuntime = document.getElementById('modalRuntime');
const modalTagline = document.getElementById('modalTagline');
const modalOverview = document.getElementById('modalOverview');
const castGrid = document.getElementById('castGrid');
const similarGrid = document.getElementById('similarGrid');
const torrentsList = document.getElementById('torrentsList');
const notification = document.getElementById('notification');
const watchNowBtn = document.getElementById('watchNowBtn');
const modalDoneWatchingBtn = document.getElementById('modalDoneWatchingBtn');
// Note: traktWatchlistBtn is declared in trakt.js
// const traktWatchlistBtn = document.getElementById('traktWatchlistBtn'); // REMOVED - conflicts with trakt.js
const seasonsContainer = document.getElementById('seasonsContainer');
const seasonSelector = document.getElementById('seasonSelector');
const episodesGrid = document.getElementById('episodesGrid');
const refreshTorrents = document.getElementById('refreshTorrents');
const torrentsContainer = document.getElementById('torrentsContainer');
const torrentKeywordFilter = document.getElementById('torrentKeywordFilter');

// DOM elements - Trailer Modal
const trailerModal = document.getElementById('trailerModal');
const trailerModalClose = document.getElementById('trailerModalClose');
const trailerModalTitle = document.getElementById('trailerModalTitle');
const trailerContainer = document.getElementById('trailerContainer');
const trailerPlaceholder = document.getElementById('trailerPlaceholder');
const watchTrailerBtn = document.getElementById('watchTrailerBtn');

// Discord Modal elements
const discordModal = document.getElementById('discordModal');
const discordClose = document.getElementById('discordClose');
const discordJoinBtn = document.getElementById('discordJoinBtn');
const discordDontShowBtn = document.getElementById('discordDontShowBtn');
const discordBtn = document.getElementById('discordBtn');

// Settings Modal elements
const settingsModal = document.getElementById('settingsModal');
const clearCacheBtn = document.getElementById('clearCacheBtn');
const settingsClose = document.getElementById('settingsClose');
const currentApiKey = document.getElementById('currentApiKey');
const newApiKey = document.getElementById('newApiKey');
// Note: saveSettings is a function, not a DOM element reference
// const saveSettings = document.getElementById('saveSettings'); // REMOVED - conflicts with function
const cancelSettings = document.getElementById('cancelSettings');
const useTorrentlessToggle = document.getElementById('useTorrentlessToggle');
const jackettUrlInput = document.getElementById('jackettUrl');
const cacheLocationInput = document.getElementById('cacheLocation');
const selectCacheBtn = document.getElementById('selectCacheBtn');

// Debrid controls
const useDebridToggle = document.getElementById('useDebridToggle');
const debridProviderSel = document.getElementById('debridProvider');
const debridStatus = document.getElementById('debridStatus');
const debridTokenInput = document.getElementById('debridToken');
const saveDebridTokenBtn = document.getElementById('saveDebridToken');
const clearDebridTokenBtn = document.getElementById('clearDebridToken');
const rdClientIdInput = document.getElementById('rdClientId');
const rdDeviceLoginBtn = document.getElementById('rdDeviceLogin');
const rdClientIdGroup = document.getElementById('rdClientIdGroup');
const rdButtons = document.getElementById('rdButtons');
const rdTokenGroup = document.getElementById('rdTokenGroup');
const rdTokenButtons = document.getElementById('rdTokenButtons');
const rdCodePanel = document.getElementById('rdCodePanel');
const rdUserCodeEl = document.getElementById('rdUserCode');
const rdVerifyUrlEl = document.getElementById('rdVerifyUrl');
const rdOpenVerifyBtn = document.getElementById('rdOpenVerify');
const rdCopyCodeBtn = document.getElementById('rdCopyCode');
const rdCancelLoginBtn = document.getElementById('rdCancelLogin');
const rdLoginStatusEl = document.getElementById('rdLoginStatus');

// AllDebrid controls
const adSection = document.getElementById('adSection');
const adStartPinBtn = document.getElementById('adStartPin');
const adPinPanel = document.getElementById('adPinPanel');
const adPinCodeEl = document.getElementById('adPinCode');
const adUserUrlEl = document.getElementById('adUserUrl');
const adOpenUserUrlBtn = document.getElementById('adOpenUserUrl');
const adCopyPinBtn = document.getElementById('adCopyPin');
const adCancelPinBtn = document.getElementById('adCancelPin');
const adLoginStatusEl = document.getElementById('adLoginStatus');
const adApiKeyInput = document.getElementById('adApiKey');
const adSaveApiKeyBtn = document.getElementById('adSaveApiKey');
const adClearApiKeyBtn = document.getElementById('adClearApiKey');

// TorBox controls
const tbSection = document.getElementById('tbSection');
const tbTokenInput = document.getElementById('tbToken');
const tbSaveTokenBtn = document.getElementById('tbSaveToken');
const tbClearTokenBtn = document.getElementById('tbClearToken');

// Premiumize controls
const pmSection = document.getElementById('pmSection');
const pmApiKeyInput = document.getElementById('pmApiKey');
const pmSaveApiKeyBtn = document.getElementById('pmSaveApiKey');
const pmClearApiKeyBtn = document.getElementById('pmClearApiKey');

// Trakt controls
const traktNotConnected = document.getElementById('traktNotConnected');
const traktConnected = document.getElementById('traktConnected');
const traktStatus = document.getElementById('traktStatus');
const traktConnectedStatus = document.getElementById('traktConnectedStatus');
const traktUsername = document.getElementById('traktUsername');
const traktLoginBtn = document.getElementById('traktLogin');
const traktViewWatchlistBtn = document.getElementById('traktViewWatchlist');
const traktViewHistoryBtn = document.getElementById('traktViewHistory');
const traktViewStatsBtn = document.getElementById('traktViewStats');
const traktDisconnectBtn = document.getElementById('traktDisconnect');
const traktCodePanel = document.getElementById('traktCodePanel');
const traktUserCodeEl = document.getElementById('traktUserCode');
const traktVerifyUrlEl = document.getElementById('traktVerifyUrl');
const traktOpenVerifyBtn = document.getElementById('traktOpenVerify');
const traktCopyCodeBtn = document.getElementById('traktCopyCode');
const traktCancelLoginBtn = document.getElementById('traktCancelLogin');
const traktLoginStatusEl = document.getElementById('traktLoginStatus');
const traktAutoScrobbleToggle = document.getElementById('traktAutoScrobble');
const traktScrobbleProgressToggle = document.getElementById('traktScrobbleProgress');
const traktSyncWatchlistToggle = document.getElementById('traktSyncWatchlist');

// MPV Player elements
const mpvPlayerContainer = document.getElementById('mpvPlayerContainer');
const playerTitle = document.getElementById('mpvPlayerTitle');
const closePlayerBtn = document.getElementById('closePlayerBtn');
const fileSelector = document.getElementById('fileSelector');
const fileList = document.getElementById('fileList');
const subtitleControls = document.getElementById('subtitleControls');
const subtitleList = document.getElementById('subtitleList');
const mpvPlayerArea = document.getElementById('mpvPlayerArea');
const mpvLoading = document.getElementById('mpvLoading');
const mpvControls = document.getElementById('mpvControls');
const openMPVBtn = document.getElementById('openMPVBtn');

// Custom Player elements
const customPlayerContainer = document.getElementById('customPlayerContainer');
const customVideo = document.getElementById('customVideo');
const videoSource = document.getElementById('videoSource');
const customSourceBadge = document.getElementById('customSourceBadge');
const streamSourceBadge = document.getElementById('streamSourceBadge');

console.log('[DOM] DOM elements cached');
