/**
 * Umbrella Hamburger menu – expandable transparent panel
 * TV: Live TV, IPTV | Books: Books, AudioBooks, BookTorrio, Comics, Manga
 * Media: Music, Games Downloader | System: Settings, Clear Cache, Refresh
 */
var HAMBURGER_SECTIONS = [
  /**
  {
    title: 'TV',
    items: [
      { id: 'livetv', label: 'Live TV', icon: 'fa-tv' },
      { id: 'iptv', label: 'IPTV', icon: 'fa-broadcast-tower' }
    ]
  },
  {
    title: 'Books',
    items: [
      { id: 'books', label: 'Books', icon: 'fa-book' },
      { id: 'audiobooks', label: 'AudioBooks', icon: 'fa-headphones' },
      { id: 'booktorrio', label: 'BookTorrio', icon: 'fa-book-open' },
      { id: 'comics', label: 'Comics', icon: 'fa-comic' },
      { id: 'manga', label: 'Manga', icon: 'fa-scroll' }
    ]
  },
  {
    title: 'Media',
    items: [
      { id: 'music', label: 'Music', icon: 'fa-music' },
      { id: 'games-downloader', label: 'Games Downloader', icon: 'fa-gamepad' }
    ]
  },
  */
  {
    title: 'System',
    items: [
      { id: 'settings', label: 'Settings', icon: 'fa-cog' },
      { id: 'clear-cache', label: 'Clear Cache', icon: 'fa-broom', action: 'clearCache' },
      { id: 'refresh', label: 'Refresh', icon: 'fa-sync', action: 'refresh' }
    ]
  }
];

function createUmbrellaHamburgerMenu(onNavigate) {
  var overlay = document.createElement('div');
  overlay.id = 'umbrella-hamburger-overlay';
  overlay.className = 'umbrella-hamburger-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'Menu');

  var panel = document.createElement('div');
  panel.className = 'umbrella-hamburger-panel';

  HAMBURGER_SECTIONS.forEach(function (sec) {
    var h = document.createElement('h3');
    h.className = 'umbrella-hamburger-section-title';
    h.textContent = sec.title;
    panel.appendChild(h);
    sec.items.forEach(function (item) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'umbrella-hamburger-item';
      btn.setAttribute('data-id', item.id);
      btn.setAttribute('tabindex', '0');
      if (item.action) btn.setAttribute('data-action', item.action);
      btn.innerHTML = '<i class="fas ' + (item.icon || 'fa-circle') + '" aria-hidden="true"></i><span>' + item.label + '</span>';
      btn.addEventListener('click', function () {
        if (item.action === 'clearCache') {
          if (typeof onNavigate === 'function') onNavigate('clear-cache');
        } else if (item.action === 'refresh') {
          if (typeof onNavigate === 'function') onNavigate('refresh');
        } else if (typeof onNavigate === 'function') {
          onNavigate(item.id);
        }
      });
      panel.appendChild(btn);
    });
  });

  overlay.appendChild(panel);
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closeUmbrellaHamburger();
  });
  document.addEventListener('keydown', function handler(e) {
    if (e.key === 'Escape' && overlay.classList.contains('open')) {
      closeUmbrellaHamburger();
      document.removeEventListener('keydown', handler);
    }
  });

  return overlay;
}

function openUmbrellaHamburger() {
  var el = document.getElementById('umbrella-hamburger-overlay');
  if (!el) {
    el = createUmbrellaHamburgerMenu(window.__umbrellaOnHamburgerNavigate);
    el.id = 'umbrella-hamburger-overlay';
    document.getElementById('umbrella-global-modals').appendChild(el);
  }
  el.classList.add('open');
  el.setAttribute('aria-hidden', 'false');
  var first = el.querySelector('.umbrella-hamburger-item');
  if (first) first.focus();
}

function closeUmbrellaHamburger() {
  var el = document.getElementById('umbrella-hamburger-overlay');
  if (el) {
    el.classList.remove('open');
    el.setAttribute('aria-hidden', 'true');
  }
}

if (typeof window !== 'undefined') {
  window.createUmbrellaHamburgerMenu = createUmbrellaHamburgerMenu;
  window.openUmbrellaHamburger = openUmbrellaHamburger;
  window.closeUmbrellaHamburger = closeUmbrellaHamburger;
}
