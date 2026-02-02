/* Umbrella Header */
function createUmbrellaHeader() {
  const header = document.createElement('header');
  header.id = 'umbrella-header';
  header.className = 'umbrella-header';

  const inner = document.createElement('div');
  inner.className = 'umbrella-header-inner';

  const nav = document.createElement('nav');
  nav.className = 'umbrella-header-nav';
  nav.setAttribute('aria-label', 'Primary');
  nav.innerHTML = '<button type="button" class="umbrella-header-tab active" data-tab="movies">Movies</button><button type="button" class="umbrella-header-tab" data-tab="tv">TV Shows</button>';

  const searchSlot = document.createElement('div');
  searchSlot.className = 'umbrella-header-search-slot';
  searchSlot.setAttribute('data-slot', 'search');

  const menuBtn = document.createElement('button');
  menuBtn.type = 'button';
  menuBtn.className = 'umbrella-header-hamburger';
  menuBtn.setAttribute('aria-label', 'Open menu');
  menuBtn.innerHTML = '&#9776;';

  inner.appendChild(nav);
  inner.appendChild(searchSlot);
  inner.appendChild(menuBtn);
  header.appendChild(inner);

  return header;
}

function mountUmbrellaHeader(container) {
  if (!container) container = document.getElementById('umbrella-header-slot');
  if (!container) return null;
  const header = createUmbrellaHeader();
  container.appendChild(header);
  return header;
}

if (typeof window !== 'undefined') {
  window.createUmbrellaHeader = createUmbrellaHeader;
  window.mountUmbrellaHeader = mountUmbrellaHeader;
}
