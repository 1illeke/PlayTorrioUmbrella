/* Umbrella app entry */
(function () {
  var activeTab = 'movies';
  var currentItems = [];
  var onItemClick = function (item) {
    window.__umbrellaSelectedItem = item;
    if (typeof openUmbrellaWatchModal === 'function') openUmbrellaWatchModal(item);
  };

  function getMain() {
    return document.getElementById('umbrella-main-content');
  }

  function getHeroContainer() {
    return document.getElementById('umbrella-hero-container');
  }

  function getGridContainer() {
    return document.getElementById('umbrella-grid-container');
  }

  function showView(viewId) {
    var main = getMain();
    if (!main) return;
    main.innerHTML = '';
    if (viewId === 'settings') {
      if (typeof mountUmbrellaSettings === 'function') {
        mountUmbrellaSettings(main);
      }
      return;
    }
    var heroContainer = document.createElement('div');
    heroContainer.id = 'umbrella-hero-container';
    heroContainer.className = 'umbrella-hero-container';
    var gridContainer = document.createElement('div');
    gridContainer.id = 'umbrella-grid-container';
    gridContainer.className = 'umbrella-grid-container';
    gridContainer.style.scrollSnapAlign = 'start';
    main.appendChild(heroContainer);
    main.appendChild(gridContainer);
    loadAndRender(activeTab);
    var tabs = document.querySelectorAll('.umbrella-header-tab');
    tabs.forEach(function (t) {
      t.onclick = function () {
        var tab = t.getAttribute('data-tab');
        setActiveTab(tab);
        loadAndRender(tab);
      };
    });
  }

  function renderHero(data) {
    var container = getHeroContainer();
    if (!container || typeof createUmbrellaHero !== 'function') return;
    container.innerHTML = '';
    var hero = createUmbrellaHero(data);
    container.appendChild(hero);
    var btn = hero.querySelector('[data-hero-watch]');
    if (btn) btn.addEventListener('click', function () { onItemClick(data); });
  }

  function renderGrid(items) {
    var container = getGridContainer();
    if (!container || typeof createUmbrellaGrid !== 'function') return;
    container.innerHTML = '';
    var categoryHint = activeTab === 'tv' ? 'tv' : 'movies';
    var wrap = createUmbrellaGrid(items || [], {
      onItemClick: onItemClick,
      category: categoryHint,
      initialItems: items || []
    });
    container.appendChild(wrap);
  }

  function setActiveTab(tab) {
    activeTab = tab === 'tv' ? 'tv' : 'movies';
    var tabs = document.querySelectorAll('.umbrella-header-tab');
    tabs.forEach(function (t) {
      t.classList.toggle('active', t.getAttribute('data-tab') === activeTab);
    });
  }

  function loadAndRender(category, searchQuery) {
    var p = searchQuery && searchQuery.trim()
      ? (window.umbrellaSearchMulti && window.umbrellaSearchMulti(searchQuery))
      : (window.umbrellaFetchTrending && window.umbrellaFetchTrending(category, 1));
    if (!p || !p.then) return;
    p.then(function (results) {
      currentItems = Array.isArray(results) ? results : [];
      var first = currentItems[0] || null;
      if (first) renderHero(first);
      renderGrid(currentItems);
    }).catch(function (err) {
      console.error('[Umbrella] load error', err);
      renderGrid([]);
    });
  }

  function init() {
    var root = document.getElementById('umbrella-root');
    if (!root) return;
    mountAppShell(root);

    var headerSlot = document.getElementById('umbrella-header-slot');
    if (headerSlot && typeof createUmbrellaHeader === 'function') {
      var h = createUmbrellaHeader();
      headerSlot.appendChild(h);
    }

    var searchSlot = document.querySelector('.umbrella-header-search-slot');
    if (searchSlot && typeof mountUmbrellaSearchBar === 'function') {
      var searchDebounce;
      mountUmbrellaSearchBar(searchSlot, function (q) {
        window.__umbrellaSearchQuery = q;
        clearTimeout(searchDebounce);
        if (q && q.trim()) {
          searchDebounce = setTimeout(function () { loadAndRender(activeTab, q); }, 350);
        } else {
          loadAndRender(activeTab);
        }
      });
    }

    var hamburgerBtn = document.querySelector('.umbrella-header-hamburger');
    if (hamburgerBtn && typeof openUmbrellaHamburger === 'function') {
      hamburgerBtn.addEventListener('click', openUmbrellaHamburger);
    }
    var hamburgerToHash = {
      livetv: '/livetv', iptv: '/iptv', books: '/books', audiobooks: '/audiobooks',
      booktorrio: '/booktorrio', comics: '/comics', manga: '/manga', music: '/music',
      'games-downloader': '/games-downloader'
    };
    window.__umbrellaOnHamburgerNavigate = function (id) {
      window.__umbrellaRoute = id;
      if (typeof closeUmbrellaHamburger === 'function') closeUmbrellaHamburger();
      if (id === 'settings') showView('settings');
      else if (id === 'clear-cache') {
        try { if (typeof caches !== 'undefined') caches.keys().then(function (k) { k.forEach(function (n) { caches.delete(n); }); }); } catch (e) {}
        showView('home');
      }
      else if (id === 'refresh') showView('home');
      else if (hamburgerToHash[id]) {
        if (typeof localStorage !== 'undefined') localStorage.setItem('uiMode', 'new');
        window.location.href = '../index.html#' + hamburgerToHash[id];
      }
      else showView('home');
    };

    showView('home');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
