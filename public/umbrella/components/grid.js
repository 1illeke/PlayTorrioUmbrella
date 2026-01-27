/* Umbrella Grid */
function createUmbrellaGrid(items, options) {
  var opts = options || {};
  var onItemClick = opts.onItemClick || function () {};
  var category = (opts.category || '').toString().toLowerCase();
  var hasCategory = category === 'movies' || category === 'movie' || category === 'tv';

  var wrap = document.createElement('div');
  wrap.className = 'umbrella-grid-wrap';

  // Back-compat / search mode: flat grid when no category is specified.
  if (!hasCategory) {
    var flatGrid = document.createElement('div');
    flatGrid.className = 'umbrella-grid';
    var flatList = Array.isArray(items) ? items : [];
    flatList.forEach(function (item) {
      flatGrid.appendChild(createUmbrellaGridCard(item, onItemClick, category));
    });
    wrap.appendChild(flatGrid);
    return wrap;
  }

  var normalizedCategory = category === 'tv' ? 'tv' : 'movie';
  var initialTrendingItems = Array.isArray(opts.initialItems) ? opts.initialItems : Array.isArray(items) ? items : [];

  function filterByMediaType(item) {
    if (!item) return false;
    var desired = normalizedCategory === 'tv' ? 'tv' : 'movie';
    if (item.media_type) {
      return item.media_type === desired;
    }
    // Fallback: infer from title/name presence.
    if (desired === 'movie') return !!item.title && !item.name;
    return !!item.name;
  }

  function getItemsPerRow(gridEl) {
    if (typeof window === 'undefined' || !gridEl) return 1;
    var style = window.getComputedStyle(gridEl);
    var cols = style && style.gridTemplateColumns;
    if (!cols) return 1;
    var parts = cols.split(' ').filter(Boolean);
    return parts.length || 1;
  }

  function createSection(label, fetchMoreFn, initialItems, startPage) {
    var section = document.createElement('section');
    section.className = 'umbrella-grid-section';

    var titleEl = document.createElement('h2');
    titleEl.className = 'umbrella-grid-section-title';
    titleEl.textContent = label;
    section.appendChild(titleEl);

    var gridEl = document.createElement('div');
    gridEl.className = 'umbrella-grid';
    section.appendChild(gridEl);

    var footer = document.createElement('div');
    footer.className = 'umbrella-grid-section-footer';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'umbrella-grid-see-more';
    btn.textContent = 'See more';
    footer.appendChild(btn);
    section.appendChild(footer);

    var state = {
      allItems: (initialItems || []).filter(filterByMediaType),
      page: startPage || 1,
      visibleRows: 2,
      loading: false
    };

    function render() {
      gridEl.innerHTML = '';
      var perRow = getItemsPerRow(gridEl);
      var maxItems = state.visibleRows * perRow;
      state.allItems.slice(0, maxItems).forEach(function (item) {
        gridEl.appendChild(createUmbrellaGridCard(item, onItemClick, normalizedCategory));
      });
    }

    async function ensureMoreRows(extraRows) {
      state.visibleRows += extraRows;
      var perRow = getItemsPerRow(gridEl);
      var needed = state.visibleRows * perRow;
      if (!fetchMoreFn || state.allItems.length >= needed) {
        render();
        return;
      }
      if (state.loading) return;
      state.loading = true;
      try {
        var nextPage = state.page + 1;
        var nextItems = await fetchMoreFn(nextPage);
        state.page = nextPage;
        var list = Array.isArray(nextItems) ? nextItems : [];
        state.allItems = state.allItems.concat(list.filter(filterByMediaType));
      } catch (e) {
        console.error('[Umbrella Grid] section load error', e);
      } finally {
        state.loading = false;
        render();
      }
    }

    btn.addEventListener('click', function () {
      // Add four more rows worth of items but sometimes its more and i dont know why.
      ensureMoreRows(4);
    });

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', function () {
        render();
      });
    }

    render();
    return section;
  }

  var trendingFetcher = null;
  if (typeof window !== 'undefined' && typeof window.umbrellaFetchTrending === 'function') {
    trendingFetcher = function (page) {
      return window.umbrellaFetchTrending(normalizedCategory, page);
    };
  }

  var popularFetcher = null;
  if (typeof window !== 'undefined' && typeof window.umbrellaFetchPopular === 'function') {
    popularFetcher = function (page) {
      return window.umbrellaFetchPopular(normalizedCategory, page);
    };
  }

  var trendingSection = createSection('Trending', trendingFetcher, initialTrendingItems, 1);
  wrap.appendChild(trendingSection);

  var popularSection = createSection('Popular', popularFetcher, [], 0);
  wrap.appendChild(popularSection);

  // Kick off initial load for Popular so it has content for the first two rows.
  if (popularFetcher) {
    popularFetcher(1).then(function (results) {
      var list = Array.isArray(results) ? results : [];
      var grids = popularSection.getElementsByClassName('umbrella-grid');
      if (!grids[0]) return;
      var gridEl = grids[0];
      // Reuse the same logic as in createSection by rebuilding the section with initial items.
      // Simpler: just append cards directly here for the initial two rows.
      gridEl.innerHTML = '';
      var filtered = list.filter(filterByMediaType);
      filtered.forEach(function (item) {
        gridEl.appendChild(createUmbrellaGridCard(item, onItemClick, normalizedCategory));
      });
    }).catch(function (e) {
      console.error('[Umbrella Grid] initial popular load error', e);
    });
  }

  return wrap;
}

function createUmbrellaGridCard(item, onItemClick, categoryHint) {
  var card = document.createElement('button');
  card.type = 'button';
  card.className = 'umbrella-grid-card';
  card.setAttribute('data-id', item && item.id ? item.id : '');
  var type = (item && item.media_type) || (categoryHint === 'tv' ? 'tv' : 'movie');
  card.setAttribute('data-type', type);
  // Ensure the backing item carries a media_type so detail views (watch modal)
  // can reliably detect TV vs movie, even when TMDB responses omit media_type
  // on popular endpoints.
  if (item && !item.media_type) {
    item.media_type = type;
  }
  var title = (item && (item.title || item.name)) || '';
  var poster = item && item.poster_path
    ? 'https://image.tmdb.org/t/p/w500' + item.poster_path
    : '';
  card.innerHTML =
    '<span class="umbrella-grid-poster">' +
    (poster ? '<img src="' + escapeAttr(poster) + '" alt="" loading="lazy"/>' : '<span class="umbrella-grid-poster-placeholder"></span>') +
    '</span>' +
    '<span class="umbrella-grid-title">' + escapeHtml(title) + '</span>';
  card.addEventListener('click', function () { onItemClick(item); });
  return card;
}

function escapeAttr(s) {
  if (!s) return '';
  var d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML.replace(/"/g, '&quot;');
}

function escapeHtml(s) {
  if (!s) return '';
  var d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function mountUmbrellaGrid(container, items, options) {
  if (!container) return null;
  var el = createUmbrellaGrid(items, options);
  container.appendChild(el);
  return el;
}

if (typeof window !== 'undefined') {
  window.createUmbrellaGrid = createUmbrellaGrid;
  window.mountUmbrellaGrid = mountUmbrellaGrid;
}
