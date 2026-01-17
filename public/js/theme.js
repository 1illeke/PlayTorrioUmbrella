// Theme Management Functions

// Apply UI mode on page load
function applyUIMode(mode) {
    currentUIMode = mode;
    document.body.classList.remove('ui-old', 'ui-new');
    document.body.classList.add(`ui-${mode}`);
    localStorage.setItem('uiMode', mode);
}

// Apply theme to document
function applyTheme(themeName) {
    const theme = themes[themeName] || themes['default'];
    const root = document.documentElement;
    
    // Base colors
    root.style.setProperty('--primary', theme.primary);
    root.style.setProperty('--secondary', theme.secondary);
    root.style.setProperty('--tertiary', theme.tertiary);
    root.style.setProperty('--dark', theme.dark);
    root.style.setProperty('--light', theme.light);
    root.style.setProperty('--gray', theme.gray);
    root.style.setProperty('--vlc-orange', theme.accent);
    
    // Extended colors for comprehensive theming
    root.style.setProperty('--card-bg', theme.cardBg);
    root.style.setProperty('--modal-bg', theme.modalBg);
    root.style.setProperty('--header-bg', theme.headerBg);
    root.style.setProperty('--input-bg', theme.inputBg);
    root.style.setProperty('--hover-bg', theme.hoverBg);
    
    currentTheme = themeName;
    localStorage.setItem('appTheme', themeName);
}

// Initialize UI mode and theme immediately (before DOM loads)
applyUIMode(currentUIMode);
applyTheme(currentTheme);
