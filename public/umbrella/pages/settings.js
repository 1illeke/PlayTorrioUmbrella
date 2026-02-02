/* Umbrella Settings */
function createUmbrellaSettingsPage() {
  var wrap = document.createElement('div');
  wrap.id = 'umbrella-settings-page';
  wrap.className = 'umbrella-settings-page';

  var html = '<div class="umbrella-settings-inner">' +
    '<h2 class="umbrella-settings-title">Settings</h2>' +
    '<section class="umbrella-settings-section">' +
      '<h3 class="umbrella-settings-section-title">UI Mode</h3>' +
      '<button type="button" class="umbrella-settings-btn" data-action="switch-basic">' +
        'Switch to Basic UI' +
      '</button>' +
      '<p class="umbrella-settings-hint">Return to the default PlayTorrio interface.</p>' +
    '</section>' +
    '<footer class="umbrella-settings-footer">' +
      '<p><strong>Made with ❤️ by Ayman</strong></p>' +
      '<p><strong>Umbrella UI by Lilleke</strong></p>' +
    '</footer>' +
  '</div>';

  wrap.innerHTML = html;

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
