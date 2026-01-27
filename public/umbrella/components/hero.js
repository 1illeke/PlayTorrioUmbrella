/**
 * Umbrella Hero – full-width, gradient fade at bottom, title/description/meta, Watch Now
 */
function createUmbrellaHero(data) {
  var d = data || {};
  var title = d.title || d.name || 'Featured';
  var overview = d.overview || d.description || '';
  var meta = [];
  if (d.release_date || d.first_air_date) meta.push((d.release_date || d.first_air_date).toString().slice(0, 4));
  if (d.vote_average != null) meta.push(d.vote_average.toFixed(1) + '\u2605');
  var metaStr = meta.length ? meta.join(' \u00B7 ') : '';
  var backdrop = d.backdrop_path
    ? 'https://image.tmdb.org/t/p/original' + d.backdrop_path
    : '';

  var section = document.createElement('section');
  section.className = 'umbrella-hero';

  var backdropEl = document.createElement('div');
  backdropEl.className = 'umbrella-hero-backdrop';
  if (backdrop) {
    var img = document.createElement('img');
    img.src = backdrop;
    img.alt = '';
    img.loading = 'eager';
    backdropEl.appendChild(img);
  }

  var gradient = document.createElement('div');
  gradient.className = 'umbrella-hero-gradient';

  var content = document.createElement('div');
  content.className = 'umbrella-hero-content';
  content.innerHTML =
    '<h1 class="umbrella-hero-title">' + escapeHtml(title) + '</h1>' +
    (metaStr ? '<p class="umbrella-hero-meta">' + escapeHtml(metaStr) + '</p>' : '') +
    (overview ? '<p class="umbrella-hero-overview">' + escapeHtml(overview.slice(0, 200)) + (overview.length > 200 ? '\u2026' : '') + '</p>' : '') +
    '<button type="button" class="umbrella-hero-watch" data-hero-watch>Watch Now</button>';

  section.appendChild(backdropEl);
  section.appendChild(gradient);
  section.appendChild(content);

  return section;
}

function escapeHtml(s) {
  if (!s) return '';
  var d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function mountUmbrellaHero(container, data, onWatch) {
  if (!container) return null;
  var hero = createUmbrellaHero(data);
  container.appendChild(hero);
  var btn = hero.querySelector('[data-hero-watch]');
  if (btn && typeof onWatch === 'function') btn.addEventListener('click', function () { onWatch(data); });
  return hero;
}

if (typeof window !== 'undefined') {
  window.createUmbrellaHero = createUmbrellaHero;
  window.mountUmbrellaHero = mountUmbrellaHero;
}
