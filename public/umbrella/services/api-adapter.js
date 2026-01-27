/* Umbrella API wrapper*/
(function () {
  var KEY = typeof window !== 'undefined' && window.TMDB_API_KEY ? window.TMDB_API_KEY : 'c3515fdc674ea2bd7b514f4bc3616a4a';

  function normalizeCategory(category) {
    var c = (category || '').toString().toLowerCase();
    if (c === 'tv' || c === 'show' || c === 'shows' || c === 'tvshows' || c === 'tv-shows') return 'tv';
    if (c === 'movie' || c === 'movies' || c === 'film' || c === 'films') return 'movie';
    return 'all';
  }

  async function fetchTrending(category, page) {
    var normalized = normalizeCategory(category);
    var url = 'https://api.themoviedb.org/3/trending/' + normalized + '/week?api_key=' + KEY + '&page=' + (page || 1);
    var r = await fetch(url);
    if (!r.ok) throw new Error('Trending fetch failed');
    var d = await r.json();
    return d.results || [];
  }

  async function fetchPopular(category, page) {
    var normalized = normalizeCategory(category);
    if (normalized === 'all') {
      // TMDB popular endpoint requires a concrete type; default to movies.
      normalized = 'movie';
    }
    var base =
      normalized === 'tv'
        ? 'https://api.themoviedb.org/3/tv/popular'
        : 'https://api.themoviedb.org/3/movie/popular';
    var url = base + '?api_key=' + KEY + '&page=' + (page || 1);
    var r = await fetch(url);
    if (!r.ok) throw new Error('Popular fetch failed');
    var d = await r.json();
    return d.results || [];
  }

  async function searchMulti(query, page) {
    if (!(query && query.trim())) return [];
    var url = 'https://api.themoviedb.org/3/search/multi?api_key=' + KEY + '&query=' + encodeURIComponent(query.trim()) + '&page=' + (page || 1);
    var r = await fetch(url);
    if (!r.ok) throw new Error('Search failed');
    var d = await r.json();
    return d.results || [];
  }

  async function fetchTvSeason(tvId, seasonNumber) {
    if (!tvId) return null;
    var url = 'https://api.themoviedb.org/3/tv/' + encodeURIComponent(String(tvId)) + '/season/' + encodeURIComponent(String(seasonNumber || 1)) + '?api_key=' + KEY;
    var r = await fetch(url);
    if (!r.ok) return null;
    var d = await r.json();
    return d.episodes || [];
  }

  async function fetchTvDetails(tvId) {
    if (!tvId) return null;
    var url = 'https://api.themoviedb.org/3/tv/' + encodeURIComponent(String(tvId)) + '?api_key=' + KEY;
    var r = await fetch(url);
    if (!r.ok) return null;
    return r.json();
  }

  if (typeof window !== 'undefined') {
    window.umbrellaFetchTrending = fetchTrending;
    window.umbrellaSearchMulti = searchMulti;
    window.umbrellaFetchTvSeason = fetchTvSeason;
    window.umbrellaFetchPopular = fetchPopular;
    window.umbrellaFetchTvDetails = fetchTvDetails;
  }
})();
