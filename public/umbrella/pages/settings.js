/* Umbrella Settings */
function createUmbrellaSettingsPage() {
  var wrap = document.createElement('div');
  wrap.id = 'umbrella-settings-page';
  wrap.className = 'umbrella-settings-page';

  var html = '<div class="umbrella-settings-inner">' +
    '<div class="umbrella-settings-header-row">' +
      '<h2 class="umbrella-settings-title">Settings</h2>' +
      '<button type="button" class="umbrella-settings-back-btn" data-action="back" aria-label="Back to home">' +
        '<span aria-hidden="true">←</span> Back' +
      '</button>' +
    '</div>' +
    '<section class="umbrella-settings-section">' +
      '<h3 class="umbrella-settings-section-title">UI Mode</h3>' +
      '<button type="button" class="umbrella-settings-btn" data-action="switch-basic">' +
        'Switch to Basic UI' +
      '</button>' +
      '<p class="umbrella-settings-hint">Return to the default PlayTorrio interface.</p>' +
    '</section>' +
    '<section class="umbrella-settings-section">' +
      '<h3 class="umbrella-settings-section-title">Watch Modal</h3>' +
      '<div class="umbrella-settings-toggle-row">' +
        '<div class="umbrella-settings-toggle-label-wrap">' +
          '<span class="umbrella-settings-toggle-label">Show download option</span>' +
          '<p class="umbrella-settings-hint umbrella-settings-toggle-hint">Display download controls in the watch modal.</p>' +
        '</div>' +
        '<label class="umbrella-toggle" data-toggle="show-download">' +
          '<input type="checkbox" class="umbrella-toggle-input" id="umbrella-toggle-show-download">' +
          '<span class="umbrella-toggle-track"><span class="umbrella-toggle-thumb"></span></span>' +
        '</label>' +
      '</div>' +
    '</section>' +
    '<section class="umbrella-settings-section">' +
      '<h3 class="umbrella-settings-section-title">Content language (TMDB)</h3>' +
      '<div class="umbrella-settings-language-slot" data-slot="tmdb-language"></div>' +
      '<p class="umbrella-settings-hint">Titles, descriptions and episode metadata will use this language where available.</p>' +
    '</section>' +
    '<footer class="umbrella-settings-footer">' +
      '<p><strong>Made with ❤️ by Ayman</strong></p>' +
      '<p><strong>Umbrella UI by Lilleke</strong></p>' +
    '</footer>' +
  '</div>';

  wrap.innerHTML = html;

  var backBtn = wrap.querySelector('[data-action="back"]');
  if (backBtn) {
    backBtn.addEventListener('click', function () {
      if (typeof window.__umbrellaOnHamburgerNavigate === 'function') {
        window.__umbrellaOnHamburgerNavigate('home');
      }
    });
  }

  var downloadToggle = wrap.querySelector('[data-toggle="show-download"]');
  if (downloadToggle) {
    var checkbox = downloadToggle.querySelector('.umbrella-toggle-input');
    var showDownload = (typeof localStorage !== 'undefined' && localStorage.getItem('umbrellaShowDownload') !== '0');
    if (checkbox) {
      checkbox.checked = showDownload;
      checkbox.addEventListener('change', function () {
        var val = checkbox.checked;
        if (typeof localStorage !== 'undefined') localStorage.setItem('umbrellaShowDownload', val ? '1' : '0');
        if (typeof window.showNotification === 'function') {
          window.showNotification(val ? 'Download option enabled.' : 'Download option hidden.');
        }
      });
    }
  }

  var btn = wrap.querySelector('[data-action="switch-basic"]');
  if (btn) {
    btn.addEventListener('click', function () {
      if (typeof window.electronAPI !== 'undefined' && window.electronAPI.setPreferredUI) {
        window.electronAPI.setPreferredUI('');
      }
      if (typeof localStorage !== 'undefined') localStorage.setItem('uiMode', 'new');
      window.location.replace('../index.html');
    });
  }

  var langSlot = wrap.querySelector('[data-slot="tmdb-language"]');
  if (langSlot && typeof window.createUmbrellaSelect === 'function') {
    var savedLang = (typeof localStorage !== 'undefined' && localStorage.getItem('umbrellaTmdbLanguage')) || 'en';
    var langSelect = window.createUmbrellaSelect({
      extraClass: 'umbrella-settings-language-select',
      ariaLabel: 'Content language for titles and descriptions'
    });
    langSelect.addOption('en', 'Default (English)');
    langSelect.value = savedLang;
    langSelect.addEventListener('change', function () {
      var val = langSelect.value || 'en';
      if (typeof localStorage !== 'undefined') localStorage.setItem('umbrellaTmdbLanguage', val);
      if (typeof window.showNotification === 'function') {
        window.showNotification('Language updated; new content will use it.');
      }
    });
    langSlot.appendChild(langSelect);

    (function loadTmdbLanguages() {
      var loc = typeof window !== 'undefined' && window.location;
      var baseUrl = typeof window !== 'undefined' && window.API_BASE_URL ? window.API_BASE_URL : '';
      var apiOrigin = '';
      try { if (baseUrl) apiOrigin = new URL(baseUrl).origin; } catch (e) {}
      var sameOrigin = loc && apiOrigin && (loc.origin === apiOrigin);
      var url = sameOrigin
        ? '/api/umbrella/tmdb/languages'
        : (baseUrl ? (baseUrl.replace(/\/$/, '') + '/umbrella/tmdb/languages') : null);
      if (!url) {
        langSelect.clearOptions();
        langSelect.addOption('en', 'English (en)');
        langSelect.value = savedLang;
        return;
      }
      fetch(url)
        .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('Languages fetch failed')); })
        .then(function (list) {
          langSelect.clearOptions();
          langSelect.addOption('en', 'Default (English)');
          var arr = Array.isArray(list) ? list : (list && (list.data || list.languages || list.results));
          if (Array.isArray(arr) && arr.length) {
            var items = [];
            arr.forEach(function (item) {
              var code = (item && (item.iso_639_1 != null ? item.iso_639_1 : item.code)) ? String(item.iso_639_1 != null ? item.iso_639_1 : item.code) : '';
              var label = (item && (item.english_name || item.name)) ? String(item.english_name || item.name) : (code || 'Unknown');
              if (code && code !== 'en') items.push({ code: code, label: label });
            });
            items.sort(function (a, b) { return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }); });
            items.forEach(function (o) { langSelect.addOption(o.code, o.label); });
          }
          langSelect.value = savedLang;
        })
        .catch(function () {
          langSelect.clearOptions();
          langSelect.addOption('en', 'English (en)');
          langSelect.value = savedLang;
        });
    })();
  }

  return wrap;
}

function mountUmbrellaSettings(container) {
  if (!container) return null;
  var el = createUmbrellaSettingsPage();
  container.appendChild(el);
  return el;
}

if (typeof window !== 'undefined') {
  window.createUmbrellaSettingsPage = createUmbrellaSettingsPage;
  window.mountUmbrellaSettings = mountUmbrellaSettings;
}
