/* Umbrella AppShell layout */
function createAppShell() {
  const shell = document.createElement('div');
  shell.id = 'umbrella-app-shell';
  shell.className = 'umbrella-app-shell';

  const titleBar = document.createElement('div');
  titleBar.id = 'umbrella-title-bar';
  titleBar.className = 'umbrella-title-bar';
  titleBar.setAttribute('aria-label', 'Window title bar');
  titleBar.innerHTML =
    '<div class="umbrella-title-bar-drag">' +
      '<span class="umbrella-title-bar-title">PlayTorrio</span>' +
    '</div>' +
    '<div class="umbrella-title-bar-controls">' +
      '<button type="button" class="umbrella-title-bar-btn" data-action="minimize" title="Minimize" aria-label="Minimize">&#x2013;</button>' +
      '<button type="button" class="umbrella-title-bar-btn" data-action="maximize" title="Maximize" aria-label="Maximize">&#x25A1;</button>' +
      '<button type="button" class="umbrella-title-bar-btn umbrella-title-bar-close" data-action="close" title="Close" aria-label="Close">&#x00D7;</button>' +
    '</div>';
  titleBar.querySelectorAll('[data-action]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var action = btn.getAttribute('data-action');
      if (typeof window.electronAPI !== 'undefined') {
        if (action === 'minimize') window.electronAPI.minimizeWindow();
        else if (action === 'maximize') window.electronAPI.maximizeWindow();
        else if (action === 'close') window.electronAPI.closeWindow();
      }
    });
  });

  const header = document.createElement('div');
  header.id = 'umbrella-header-slot';
  header.className = 'umbrella-header-slot';
  header.setAttribute('data-slot', 'header');

  const main = document.createElement('main');
  main.id = 'umbrella-main-content';
  main.className = 'umbrella-main-content umbrella-custom-scroll';
  main.setAttribute('data-slot', 'main');
  main.innerHTML = '<!-- MainContent -->';

  const modals = document.createElement('div');
  modals.id = 'umbrella-global-modals';
  modals.className = 'umbrella-global-modals';
  modals.setAttribute('data-slot', 'modals');
  modals.innerHTML = '<!-- GlobalModals -->';

  shell.appendChild(titleBar);
  shell.appendChild(header);
  shell.appendChild(main);
  shell.appendChild(modals);

  return shell;
}

function mountAppShell(rootEl) {
  if (!rootEl) rootEl = document.getElementById('umbrella-root');
  if (!rootEl) return null;
  const shell = createAppShell();
  rootEl.appendChild(shell);
  return shell;
}

if (typeof window !== 'undefined') {
  window.createAppShell = createAppShell;
  window.mountAppShell = mountAppShell;
}
