/* Umbrella Watch modal */
function createUmbrellaWatchModal(data) {
  var d = data || {};
  var title = d.title || d.name || '';
  var overview = d.overview || d.description || '';
  var year = (d.release_date || d.first_air_date || '').toString().slice(0, 4);
  var rating = d.vote_average != null ? d.vote_average.toFixed(1) + '\u2605' : '';
  var isTv = (d.media_type || '').toLowerCase() === 'tv';
  var backdropPath = d.backdrop_path || d.poster_path || '';
  var backdropUrl = backdropPath ? 'https://image.tmdb.org/t/p/w780' + backdropPath : '';
  var genresStr = '';
  if (d.genres && Array.isArray(d.genres) && d.genres.length) {
    genresStr = d.genres.map(function (g) { return g.name || g; }).join(', ');
  }
  var runtimeStr = !isTv && d.runtime ? d.runtime + ' min' : '';
  var seasonsStr = isTv && d.number_of_seasons != null ? d.number_of_seasons + ' Season' + (d.number_of_seasons !== 1 ? 's' : '') : '';
  var metaLine2 = [genresStr, isTv ? seasonsStr : runtimeStr].filter(Boolean).join(' \u00B7 ') || '';

  function esc(s) {
    if (!s) return '';
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  var showDownload = (typeof localStorage !== 'undefined' && localStorage.getItem('umbrellaShowDownload') !== '0');

  var overlay = document.createElement('div');
  overlay.id = 'umbrella-watch-modal';
  overlay.className = 'umbrella-watch-modal' + (isTv ? ' umbrella-watch-modal--tv' : ' umbrella-watch-modal--movie');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'umbrella-watch-title');

  var heroContent = '<div class="umbrella-watch-hero-backdrop"></div>';
  if (backdropUrl) {
    heroContent = '<div class="umbrella-watch-hero-backdrop"><img src="' + backdropUrl.replace(/"/g, '&quot;') + '" alt="" loading="eager"/></div>';
  }

  var overviewClampClass = isTv ? '' : ' umbrella-watch-overview-clamp';
  var episodesBlock = '';
  if (isTv) {
    episodesBlock =
      '<div class="umbrella-watch-episodes" data-slot="episodes">' +
        '<div class="umbrella-watch-episodes-header">' +
          '<h3 class="umbrella-watch-episodes-title">Episodes</h3>' +
          '<div class="umbrella-watch-episodes-season">' +
            '<span class="umbrella-watch-episodes-season-label">Season</span>' +
            '<div data-slot="season-select"></div>' +
          '</div>' +
        '</div>' +
        '<div class="umbrella-watch-episodes-list" data-slot="episodes-list"><!-- Season episode rows --></div>' +
      '</div>';
  }

  overlay.innerHTML =
    '<div class="umbrella-watch-backdrop" data-close></div>' +
    '<div class="umbrella-watch-panel">' +
      '<button type="button" class="umbrella-watch-close" aria-label="Close" data-close>\u00D7</button>' +
      '<div class="umbrella-watch-scroll umbrella-custom-scroll">' +
        '<div class="umbrella-watch-hero">' + heroContent + '</div>' +
        '<div class="umbrella-watch-info-layer">' +
        '<div class="umbrella-watch-meta-block">' +
          '<h2 id="umbrella-watch-title" class="umbrella-watch-title">' + esc(title) + (year ? ' (' + esc(year) + ')' : '') + '</h2>' +
          '<p class="umbrella-watch-meta-line">' + esc(rating) + '</p>' +
          (metaLine2 ? '<p class="umbrella-watch-meta-line-secondary">' + esc(metaLine2) + '</p>' : '') +
        '</div>' +
        (overview ? '<p class="umbrella-watch-overview' + overviewClampClass + '">' + esc(overview) + '</p>' : '') +
        '<div class="umbrella-watch-actions-row" data-slot="actions"><!-- Play, +, Open in player --></div>' +
        '<div class="umbrella-watch-stream-row" data-slot="stream-row"><!-- Stream ▼ --></div>' +
        '<div class="umbrella-watch-streaming-area" data-slot="streaming-iframe"><!-- iframe when Play --></div>' +
        episodesBlock +
        '<div class="umbrella-watch-download" data-slot="download"><!-- download --></div>' +
      '</div>' +
      '</div>' +
    '</div>';

  overlay.querySelectorAll('[data-close]').forEach(function (el) {
    el.addEventListener('click', function () { closeUmbrellaWatchModal(); });
  });
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closeUmbrellaWatchModal();
  });

  var actionsSlot = overlay.querySelector('[data-slot="actions"]');
  var streamRowSlot = overlay.querySelector('[data-slot="stream-row"]');
  var iframeSlot = overlay.querySelector('[data-slot="streaming-iframe"]');

  function defaultSeason() { return isTv ? 1 : (parseInt(d.season, 10) || 1); }
  function defaultEpisode() { return isTv ? 1 : (parseInt(d.episode, 10) || 1); }

  if (typeof window.getStreamingUrl === 'function' && typeof window.umbrellaGetServerNames === 'function') {
    var names = window.umbrellaGetServerNames();
    var saved = typeof localStorage !== 'undefined' ? localStorage.getItem('selectedServer') || names[0] : names[0];
    var sel;
    if (typeof window.createUmbrellaSelect === 'function') {
      sel = window.createUmbrellaSelect({ extraClass: 'umbrella-watch-streaming-select', ariaLabel: 'Streaming server' });
      names.forEach(function (n) { sel.addOption(n, n); });
      sel.value = saved;
    } else {
      sel = document.createElement('select');
      sel.className = 'umbrella-watch-streaming-select umbrella-select';
      sel.setAttribute('aria-label', 'Streaming server');
      names.forEach(function (n) {
        var opt = document.createElement('option');
        opt.value = n;
        opt.textContent = n;
        if (n === saved) opt.selected = true;
        sel.appendChild(opt);
      });
    }

    var playBtn = document.createElement('button');
    playBtn.type = 'button';
    playBtn.className = 'umbrella-watch-streaming-play';
    playBtn.textContent = 'Play';
    playBtn.addEventListener('click', function () {
      var mediaData = {
        type: (d.media_type || 'movie').toLowerCase(),
        id: String(d.id),
        season: defaultSeason(),
        episode: defaultEpisode()
      };
      var url = window.getStreamingUrl(mediaData, sel.value);
      if (url && iframeSlot) {
        if (typeof localStorage !== 'undefined') localStorage.setItem('selectedServer', sel.value);
        iframeSlot.innerHTML = '';
        var iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.title = 'Stream';
        iframe.className = 'umbrella-watch-streaming-iframe';
        iframeSlot.appendChild(iframe);
      }
    });

    if (actionsSlot && !isTv) {
      actionsSlot.appendChild(playBtn);
    }
    if (streamRowSlot) {
      var streamLabel = document.createElement('span');
      streamLabel.className = 'umbrella-watch-stream-label';
      streamLabel.textContent = 'Stream ';
      streamRowSlot.appendChild(streamLabel);
      streamRowSlot.appendChild(sel);
    }
  } else {
    if (actionsSlot) {
      var fallback = document.createElement('span');
      fallback.className = 'umbrella-watch-stream-fallback';
      fallback.textContent = 'Stream options require server config.';
      actionsSlot.appendChild(fallback);
    }
  }

  var downloadSlot = overlay.querySelector('[data-slot="download"]');
  if (downloadSlot) {
    if (!showDownload) {
      downloadSlot.classList.add('umbrella-watch-download--hidden');
    } else if (d.id) {
      var isTvDownload = (d.media_type || '').toLowerCase() === 'tv';
      if (isTvDownload && typeof window.fetchAndRenderTvSelectors === 'function') {
        window.fetchAndRenderTvSelectors(d.id, downloadSlot);
      } else if (typeof window.fetchDownloaderFilesByTmdb === 'function') {
        window.fetchDownloaderFilesByTmdb(d.id, downloadSlot);
      }
    }
  }
  
// TV shows only
  if (isTv && d.id && typeof window.umbrellaFetchTvSeason === 'function') {
    var episodesListEl = overlay.querySelector('[data-slot="episodes-list"]');
    var seasonSlot = overlay.querySelector('[data-slot="season-select"]');
    if (episodesListEl && seasonSlot && typeof window.getStreamingUrl === 'function' && typeof window.umbrellaGetServerNames === 'function') {
      var names = typeof localStorage !== 'undefined'
        ? (localStorage.getItem('selectedServer') || (window.umbrellaGetServerNames()[0]))
        : (window.umbrellaGetServerNames()[0]);

      var seasonSelectEl = (typeof window.createUmbrellaSelect === 'function')
        ? window.createUmbrellaSelect({ extraClass: 'umbrella-watch-season-select', ariaLabel: 'Season select' })
        : null;
      if (seasonSelectEl) {
        seasonSlot.appendChild(seasonSelectEl);
      } else {
        var nativeSeason = document.createElement('select');
        nativeSeason.className = 'umbrella-watch-season-select umbrella-select';
        nativeSeason.setAttribute('aria-label', 'Season select');
        seasonSlot.appendChild(nativeSeason);
        seasonSelectEl = nativeSeason;
      }

      function renderSeason(seasonNumber) {
        episodesListEl.innerHTML = '';
        window.umbrellaFetchTvSeason(d.id, seasonNumber).then(function (episodes) {
          if (!episodes || !episodes.length) return;
          episodes.forEach(function (ep) {
            var stillUrl = ep.still_path ? 'https://image.tmdb.org/t/p/w300' + ep.still_path : '';
            var airDate = (ep.air_date || '').toString().slice(0, 10);
            var duration = ep.runtime ? String(ep.runtime) + 'm' : '';
            var epTitle = ep.name || 'Episode ' + ep.episode_number;
            var epOverview = ep.overview || '';
            var isUnreleased = airDate && (new Date(airDate) > new Date());
            var availableCount = isUnreleased ? 0 : (ep.available_count != null ? ep.available_count : 1);
            var playBtnHtml = isUnreleased ? '' : ('<button type="button" class="umbrella-watch-episode-play" data-episode-num="' + ep.episode_number + '" aria-label="Play episode ' + ep.episode_number + '">Play</button>');
            var downloadLabel = availableCount === 0 ? 'No available' : 'Available (' + availableCount + ')';
            var downloadHtml = isUnreleased ? '' : ('<span class="umbrella-watch-episode-download" data-episode-num="' + ep.episode_number + '">' +
              '<span class="umbrella-watch-episode-download-icon" aria-hidden="true">\u25BC</span> ' + esc(downloadLabel) + '</span>');
            var row = document.createElement('div');
            row.className = 'umbrella-watch-episode-row';
            row.innerHTML =
              (stillUrl ? '<div class="umbrella-watch-episode-thumb"><img src="' + stillUrl.replace(/"/g, '&quot;') + '" alt="" loading="lazy"/></div>' : '<div class="umbrella-watch-episode-thumb umbrella-watch-episode-thumb-placeholder"></div>') +
              '<div class="umbrella-watch-episode-details">' +
                '<div class="umbrella-watch-episode-head">' +
                  '<span class="umbrella-watch-episode-num">' + ep.episode_number + '</span>' +
                  '<h4 class="umbrella-watch-episode-title">' + esc(epTitle) + '</h4>' +
                  (duration ? '<span class="umbrella-watch-episode-duration">' + esc(duration) + '</span>' : '') +
                '</div>' +
                (airDate ? '<p class="umbrella-watch-episode-date">' + esc(airDate) + '</p>' : '') +
                (epOverview ? '<p class="umbrella-watch-episode-desc">' + esc(epOverview) + '</p>' : '') +
              '</div>' +
              '<div class="umbrella-watch-episode-actions">' +
                playBtnHtml +
                downloadHtml +
              '</div>';
            var playEpBtn = row.querySelector('.umbrella-watch-episode-play');
            if (playEpBtn) {
              playEpBtn.addEventListener('click', function () {
                var serverSel = overlay.querySelector('.umbrella-watch-streaming-select');
                var serverName = (serverSel && serverSel.value) ? serverSel.value : (Array.isArray(names) ? names[0] : names) || '';
                var mediaData = { type: 'tv', id: String(d.id), season: seasonNumber, episode: ep.episode_number };
                var url = window.getStreamingUrl(mediaData, serverName);
                if (url && iframeSlot) {
                  if (typeof localStorage !== 'undefined') localStorage.setItem('selectedServer', serverName);
                  iframeSlot.innerHTML = '';
                  var ifr = document.createElement('iframe');
                  ifr.src = url;
                  ifr.title = 'Stream';
                  ifr.className = 'umbrella-watch-streaming-iframe';
                  iframeSlot.appendChild(ifr);
                }
              });
            }
            episodesListEl.appendChild(row);
          });
        }).catch(function (err) {
          console.warn('[Umbrella Watch] Episode fetch failed', err);
        });
      }

      var initialSeason = (typeof d.season === 'number' && d.season > 0) ? d.season : 1;
      var isCustomSelect = typeof seasonSelectEl.addOption === 'function';

      function populateSeasonOptions(seasons, fallbackSeason) {
        if (isCustomSelect) {
          seasonSelectEl.clearOptions();
          if (!seasons.length) {
            seasonSelectEl.addOption(String(fallbackSeason), 'Season ' + fallbackSeason);
          } else {
            seasons.forEach(function (s) {
              seasonSelectEl.addOption(String(s.season_number), 'Season ' + s.season_number);
            });
          }
          seasonSelectEl.value = String(fallbackSeason);
        } else {
          seasonSelectEl.innerHTML = '';
          if (!seasons.length) {
            var o = document.createElement('option');
            o.value = String(fallbackSeason);
            o.textContent = 'Season ' + fallbackSeason;
            seasonSelectEl.appendChild(o);
          } else {
            seasons.forEach(function (s) {
              var o = document.createElement('option');
              o.value = String(s.season_number);
              o.textContent = 'Season ' + s.season_number;
              if (s.season_number === fallbackSeason) o.selected = true;
              seasonSelectEl.appendChild(o);
            });
          }
        }
      }

      if (typeof window.umbrellaFetchTvDetails === 'function') {
        window.umbrellaFetchTvDetails(d.id).then(function (details) {
          var seasons = details && Array.isArray(details.seasons)
            ? details.seasons.filter(function (s) { return s && s.season_number > 0; })
            : [];
          populateSeasonOptions(seasons, initialSeason);
          var selectedSeason = parseInt(seasonSelectEl.value, 10) || initialSeason;
          renderSeason(selectedSeason);
        }).catch(function () {
          populateSeasonOptions([], initialSeason);
          renderSeason(initialSeason);
        });
      } else {
        populateSeasonOptions([], initialSeason);
        renderSeason(initialSeason);
      }

      seasonSelectEl.addEventListener('change', function () {
        var selectedSeason = parseInt(seasonSelectEl.value, 10) || 1;
        renderSeason(selectedSeason);
      });
    }
  }

  return overlay;
}

function openUmbrellaWatchModal(data) {
  var container = document.getElementById('umbrella-global-modals');
  if (!container) return;
  var existing = document.getElementById('umbrella-watch-modal');
  if (existing) existing.remove();
  var modal = createUmbrellaWatchModal(data);
  container.appendChild(modal);
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
  var firstFocus = modal.querySelector('.umbrella-watch-close');
  if (firstFocus) firstFocus.focus();
}

function closeUmbrellaWatchModal() {
  var modal = document.getElementById('umbrella-watch-modal');
  if (modal) {
    modal.classList.remove('open');
    modal.remove();
  }
  document.body.style.overflow = '';
}

if (typeof window !== 'undefined') {
  window.createUmbrellaWatchModal = createUmbrellaWatchModal;
  window.openUmbrellaWatchModal = openUmbrellaWatchModal;
  window.closeUmbrellaWatchModal = closeUmbrellaWatchModal;
}
