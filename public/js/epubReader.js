// EPUB Reader Logic for Main App

(function() {
    'use strict';

    let rendition = null;
    let bookInstance = null;
    let chapterToc = null;
    let chapterSpineItems = null;
    let chapterTotal = 0;
    let isReaderFocusMode = false;
    let focusRulerTopPx = 80;
    let focusRulerHeightPx = 0;
    let focusRulerOffset = 0;
    let rulerObserver = null;
    let currentBookPath = null;

    async function openEpubReader(localPath, title) {
        try {
            console.log('[EPUB] Opening:', localPath);
            currentBookPath = localPath;
            
            const overlay = document.getElementById('epubReaderOverlay');
            const titleEl = document.getElementById('readerTitle');
            const container = document.getElementById('readerContainer');
            const prevBtn = document.getElementById('readerPrevBtn');
            const nextBtn = document.getElementById('readerNextBtn');

            if (!overlay || !container) {
                console.error('[EPUB] Reader overlay not found');
                alert('EPUB reader not available');
                return;
            }

            titleEl.textContent = title || 'EPUB Reader';
            overlay.classList.add('theme-dark');
            overlay.classList.remove('theme-light', 'theme-night');
            overlay.style.display = 'flex';

            // Clear previous
            container.innerHTML = '';
            rendition = null;
            bookInstance = null;
            if (prevBtn) prevBtn.disabled = true;
            if (nextBtn) nextBtn.disabled = false;

            // Load epub.js and JSZip first
            if (!window.ePub || !window.JSZip) {
                console.log('[EPUB] Loading libraries...');
                
                if (!window.JSZip) {
                    const jszipScript = document.createElement('script');
                    jszipScript.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
                    await new Promise((resolve, reject) => {
                        jszipScript.onload = resolve;
                        jszipScript.onerror = reject;
                        document.head.appendChild(jszipScript);
                    });
                    console.log('[EPUB] JSZip loaded');
                }

                if (!window.ePub) {
                    const epubScript = document.createElement('script');
                    epubScript.src = 'https://cdn.jsdelivr.net/npm/epubjs@0.3.93/dist/epub.min.js';
                    await new Promise((resolve, reject) => {
                        epubScript.onload = resolve;
                        epubScript.onerror = reject;
                        document.head.appendChild(epubScript);
                    });
                    console.log('[EPUB] epub.js loaded');
                }
            }

            // Read the file from main process
            console.log('[EPUB] Reading file...');
            let fileData = null;
            
            if (window.electronAPI && window.electronAPI.readEpubFile) {
                const res = await window.electronAPI.readEpubFile(localPath);
                console.log('[EPUB] Read result:', res.success, res.base64 ? `${res.base64.length} bytes` : 'no data');
                if (!res.success || !res.base64) {
                    alert('Failed to open book: ' + (res.message || 'Unable to read file'));
                    overlay.style.display = 'none';
                    return;
                }
                fileData = res.base64;
            } else {
                // Fallback: try to fetch from server
                try {
                    const res = await fetch(`http://localhost:6987/api/books/read?path=${encodeURIComponent(localPath)}`);
                    const data = await res.json();
                    if (!data.success || !data.base64) {
                        throw new Error(data.error || 'Unable to read file');
                    }
                    fileData = data.base64;
                } catch (e) {
                    alert('Failed to open book: ' + e.message);
                    overlay.style.display = 'none';
                    return;
                }
            }
            
            console.log('[EPUB] Converting to ArrayBuffer...');
            const binaryString = atob(fileData);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            console.log('[EPUB] ArrayBuffer size:', bytes.length);

            console.log('[EPUB] Creating book instance...');
            bookInstance = window.ePub(bytes.buffer);
            
            console.log('[EPUB] Rendering to container...');
            rendition = bookInstance.renderTo(container, { 
                width: '100%', 
                height: '100%',
                spread: 'none',
                flow: 'paginated'
            });
            
            // Listen for keydown in the iframe to support Focus Mode navigation
            rendition.on('keydown', (e) => {
                handleReaderKeydown(e);
            });
            
            // Create a unique key for this book based on its path
            const bookKey = 'epub_position_' + encodeURIComponent(localPath);
            
            // Wire navigation and save position on page change
            rendition.on('relocated', (location) => {
                console.log('[EPUB] Relocated:', location.atStart, location.atEnd);
                if (prevBtn) prevBtn.disabled = location.atStart;
                if (nextBtn) nextBtn.disabled = location.atEnd;
                
                if (isReaderFocusMode) {
                    focusRulerOffset = 0;
                    [100, 300, 600].forEach(t => setTimeout(alignFocusRulerToText, t));
                }
                
                // Save current position to localStorage
                if (location && location.start && location.start.cfi) {
                    try {
                        localStorage.setItem(bookKey, location.start.cfi);
                        console.log('[EPUB] Saved position:', location.start.cfi);
                    } catch (e) {
                        console.warn('[EPUB] Could not save position:', e);
                    }
                }
            });

            // Try to restore last position
            let restored = false;
            try {
                const savedPosition = localStorage.getItem(bookKey);
                if (savedPosition) {
                    console.log('[EPUB] Restoring position:', savedPosition);
                    await rendition.display(savedPosition);
                    restored = true;
                    console.log('[EPUB] Position restored successfully');
                }
            } catch (e) {
                console.warn('[EPUB] Could not restore position:', e);
            }
            
            // If no saved position or restore failed, display from beginning
            if (!restored) {
                console.log('[EPUB] Displaying from beginning...');
                await rendition.display();
            }
            
            console.log('[EPUB] Book opened successfully');

            // Apply initial theme/font/size
            applyReaderPrefs();

            // Initialize chapter controls
            await initChapterControls();
            
            // Reset focus mode on open
            isReaderFocusMode = false;
            updateFocusModeUI();
        } catch (err) {
            console.error('[EPUB] Error:', err);
            alert('Could not open the EPUB: ' + err.message);
            const overlay = document.getElementById('epubReaderOverlay');
            if (overlay) overlay.style.display = 'none';
        }
    }

    function closeEpubReader() {
        const overlay = document.getElementById('epubReaderOverlay');
        const settingsPanel = document.getElementById('readerSettingsPanel');
        if (overlay) overlay.style.display = 'none';
        if (settingsPanel) settingsPanel.classList.add('hidden');
        
        if (rendition) { try { rendition.destroy(); } catch(_){} }
        rendition = null;
        bookInstance = null;
        chapterToc = null;
        chapterSpineItems = null;
        chapterTotal = 0;
        currentBookPath = null;
        
        const chapterControls = document.getElementById('readerChapterControls');
        if (chapterControls) chapterControls.style.display = 'none';
        isReaderFocusMode = false;
        updateFocusModeUI();
    }

    function applyReaderPrefs() {
        const overlay = document.getElementById('epubReaderOverlay');
        if (!overlay) return;
        
        const theme = localStorage.getItem('reader.theme') || 'dark';
        const font = localStorage.getItem('reader.font') || "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif";
        const size = parseInt(localStorage.getItem('reader.size') || '16', 10);
        const lineHeight = localStorage.getItem('reader.lineHeight') || '1.5';
        const width = parseInt(localStorage.getItem('reader.width') || '80', 10);
        const align = localStorage.getItem('reader.align') || 'left';

        overlay.classList.remove('theme-light', 'theme-dark', 'theme-night');
        overlay.classList.add(`theme-${theme}`);
        
        // Update UI controls
        const fontSelect = document.getElementById('readerFont');
        const sizeInput = document.getElementById('readerFontSize');
        const lhInput = document.getElementById('readerLineHeight');
        const widthInput = document.getElementById('readerWidth');
        
        if (fontSelect) fontSelect.value = font;
        if (sizeInput) sizeInput.value = size;
        if (lhInput) lhInput.value = lineHeight;
        if (widthInput) widthInput.value = width;
        
        const sizeVal = document.getElementById('readerFontSizeVal');
        const lhVal = document.getElementById('readerLineHeightVal');
        const widthVal = document.getElementById('readerWidthVal');
        
        if (sizeVal) sizeVal.textContent = `${size}px`;
        if (lhVal) lhVal.textContent = lineHeight;
        if (widthVal) widthVal.textContent = `${width}%`;
        
        document.querySelectorAll('.align-btn[data-align]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.align === align);
        });

        if (rendition) {
            let fg = '#f2f2f2', bg = '#202225';
            if (theme === 'light') { fg = '#111111'; bg = '#ffffff'; }
            else if (theme === 'night') { fg = '#e5e7eb'; bg = '#000000'; }
            
            const padding = Math.max(0, (100 - width) / 2);
            
            try { 
                rendition.themes.register('custom', { 
                    'body': { 
                        'font-family': `${font} !important`, 
                        'color': fg, 
                        'background': bg,
                        'padding-left': `${padding}% !important`,
                        'padding-right': `${padding}% !important`,
                        'text-align': `${align} !important`,
                        'line-height': `${lineHeight} !important`
                    },
                    'p': {
                        'font-family': `${font} !important`,
                        'line-height': `${lineHeight} !important`,
                        'text-align': `${align} !important`
                    },
                    '*': {
                        'font-family': `${font} !important`
                    }
                }); 
            } catch(e){ console.log('[EPUB] Theme register error:', e); }
            try { rendition.themes.select('custom'); } catch(e){ console.log('[EPUB] Theme select error:', e); }
            try { rendition.themes.fontSize(`${size}px`); } catch(e){ console.log('[EPUB] Font size error:', e); }
        }
    }

    function updateFocusModeUI() {
        const ruler = document.getElementById('focusRuler');
        const btn = document.getElementById('focusModeBtn');
        
        if (isReaderFocusMode) {
            const size = parseInt(localStorage.getItem('reader.size') || '16', 10);
            const lh = parseFloat(localStorage.getItem('reader.lineHeight') || '1.5');
            const calcHeight = size * lh; 
            const heightPx = focusRulerHeightPx > 0 ? focusRulerHeightPx : calcHeight;

            if (ruler) {
                ruler.style.display = 'block';
                ruler.style.height = `${heightPx}px`;
                ruler.style.top = `${focusRulerTopPx}px`;
            }
            if (btn) btn.classList.add('active');
        } else {
            if (ruler) ruler.style.display = 'none';
            if (btn) btn.classList.remove('active');
        }
    }

    function alignFocusRulerToText() {
        if (!rendition) return;
        try {
            const contents = rendition.getContents();
            if (!contents || contents.length === 0) return;
            const doc = contents[0].document;
            const iframe = document.querySelector('#readerContainer iframe');
            if (!iframe) return;

            const overlay = document.getElementById('epubReaderOverlay');
            const overlayRect = overlay.getBoundingClientRect();
            const iframeRect = iframe.getBoundingClientRect();
            const borderTop = iframe.clientTop || 0;

            const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null, false);
            let node;
            
            while (node = walker.nextNode()) {
                if (!node.textContent.trim()) continue;
                
                const parentTag = node.parentNode.tagName.toLowerCase();
                if (/^h[1-6]$/.test(parentTag)) continue;

                const range = doc.createRange();
                range.selectNodeContents(node);
                const rects = range.getClientRects();

                const userSize = parseInt(localStorage.getItem('reader.size') || '16', 10);
                const userLh = parseFloat(localStorage.getItem('reader.lineHeight') || '1.5');
                const targetHeight = userSize * userLh;

                for (const rect of rects) {
                    if (rect.bottom > 0 && rect.top < iframe.clientHeight && rect.width > 0) {
                        if (rect.left < iframe.clientWidth) {
                            focusRulerHeightPx = targetHeight;
                            const center = rect.top + (rect.height / 2);
                            const relativeTop = (iframeRect.top - overlayRect.top) + borderTop + (center - targetHeight / 2);
                            focusRulerTopPx = relativeTop + focusRulerOffset;
                            updateFocusModeUI();
                            return;
                        }
                    }
                }
            }
        } catch (e) {
            console.error('Error aligning focus ruler:', e);
        }
    }

    function toggleReaderFocusMode() {
        isReaderFocusMode = !isReaderFocusMode;
        if (isReaderFocusMode) {
            localStorage.setItem('reader.theme', 'night');
            focusRulerOffset = 0;
            applyReaderPrefs();
            [100, 300, 600].forEach(t => setTimeout(alignFocusRulerToText, t));
        }
        updateFocusModeUI();
    }

    function handleReaderKeydown(e) {
        if (!isReaderFocusMode) return;
        const overlay = document.getElementById('epubReaderOverlay');
        if (!overlay || overlay.style.display === 'none') return;
        
        const speed = parseInt(localStorage.getItem('reader.focusSpeed') || '2', 10);
        
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            focusRulerOffset -= speed;
            focusRulerTopPx -= speed;
            updateFocusModeUI();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            focusRulerOffset += speed;
            focusRulerTopPx += speed;
            updateFocusModeUI();
        }
    }

    async function initChapterControls() {
        try {
            const controls = document.getElementById('readerChapterControls');
            const countEl = document.getElementById('readerChapterCount');
            const inputEl = document.getElementById('readerChapterInput');
            if (!controls || !countEl || !inputEl) return;

            if (!bookInstance) {
                controls.style.display = 'none';
                return;
            }

            chapterToc = null;
            chapterSpineItems = null;
            chapterTotal = 0;

            try {
                const nav = await bookInstance.loaded?.navigation;
                if (nav && Array.isArray(nav.toc) && nav.toc.length > 0) {
                    chapterToc = nav.toc;
                    chapterTotal = chapterToc.length;
                }
            } catch(_) {}

            if (!chapterTotal) {
                try {
                    const spine = await bookInstance.loaded?.spine;
                    if (spine && Array.isArray(spine.spineItems) && spine.spineItems.length > 0) {
                        chapterSpineItems = spine.spineItems;
                        chapterTotal = chapterSpineItems.length;
                    } else if (bookInstance.spine && Array.isArray(bookInstance.spine.spineItems) && bookInstance.spine.spineItems.length > 0) {
                        chapterSpineItems = bookInstance.spine.spineItems;
                        chapterTotal = chapterSpineItems.length;
                    }
                } catch(_) {}
            }

            if (chapterTotal > 0) {
                controls.style.display = 'flex';
                countEl.textContent = String(chapterTotal);
                inputEl.max = String(chapterTotal);
                inputEl.placeholder = `1-${chapterTotal}`;
            } else {
                controls.style.display = 'none';
            }
        } catch (e) {
            console.warn('[EPUB] Could not initialize chapter controls:', e);
        }
    }

    async function goToChapterIndex(n) {
        const inputEl = document.getElementById('readerChapterInput');
        if (!bookInstance || !rendition || !Number.isFinite(n)) {
            if (inputEl) flashInvalid(inputEl);
            return;
        }
        const total = chapterTotal || 0;
        if (!total) {
            if (inputEl) flashInvalid(inputEl);
            return;
        }
        let idx = Math.floor(n) - 1;
        if (idx < 0 || idx >= total) {
            if (inputEl) flashInvalid(inputEl);
            return;
        }
        try {
            let targetHref = null;
            if (chapterToc && chapterToc[idx] && chapterToc[idx].href) {
                targetHref = chapterToc[idx].href;
            } else if (chapterSpineItems && chapterSpineItems[idx] && chapterSpineItems[idx].href) {
                targetHref = chapterSpineItems[idx].href;
            }
            if (targetHref) {
                await rendition.display(targetHref);
            } else {
                if (typeof bookInstance.spine?.get === 'function') {
                    const item = bookInstance.spine.get(idx);
                    if (item && item.href) {
                        await rendition.display(item.href);
                        return;
                    }
                }
                throw new Error('No valid chapter target');
            }
        } catch (err) {
            console.warn('[EPUB] Failed to jump to chapter', n, err);
            if (inputEl) flashInvalid(inputEl);
        }
    }

    function flashInvalid(inputEl) {
        const orig = inputEl.style.borderColor;
        inputEl.style.borderColor = 'rgba(244,63,94,0.85)';
        setTimeout(() => { inputEl.style.borderColor = orig || ''; }, 450);
    }

    // Event listeners
    document.addEventListener('click', (e) => {
        if (e.target.closest('#readerPrevBtn')) {
            if (rendition) rendition.prev();
        }
        if (e.target.closest('#readerNextBtn')) {
            if (rendition) rendition.next();
        }
        if (e.target.closest('#readerChapterGo')) {
            const inputEl = document.getElementById('readerChapterInput');
            if (inputEl) goToChapterIndex(parseInt(inputEl.value, 10));
        }
        if (e.target.closest('#readerSettingsBtn')) {
            const panel = document.getElementById('readerSettingsPanel');
            if (panel) panel.classList.toggle('hidden');
        }
        if (e.target.closest('#readerBackBtn')) {
            closeEpubReader();
        }
        
        const themeBtn = e.target.closest('.theme-btn');
        if (themeBtn && themeBtn.dataset.theme) {
            localStorage.setItem('reader.theme', themeBtn.dataset.theme);
            applyReaderPrefs();
        }
        
        const alignBtn = e.target.closest('.align-btn[data-align]');
        if (alignBtn) {
            localStorage.setItem('reader.align', alignBtn.dataset.align);
            applyReaderPrefs();
        }
        
        if (e.target.closest('#focusModeBtn')) {
            toggleReaderFocusMode();
        }
    });

    document.addEventListener('keydown', (e) => {
        // Escape to close reader
        if (e.key === 'Escape') {
            const overlay = document.getElementById('epubReaderOverlay');
            if (overlay && overlay.style.display === 'flex') {
                closeEpubReader();
            }
        }
        
        // Chapter input enter
        if (e.key === 'Enter' && e.target && e.target.id === 'readerChapterInput') {
            goToChapterIndex(parseInt(e.target.value, 10));
        }
        
        // Focus mode navigation
        handleReaderKeydown(e);
    });

    document.addEventListener('input', (e) => {
        if (e.target.id === 'readerFont') {
            localStorage.setItem('reader.font', e.target.value);
            applyReaderPrefs();
        } else if (e.target.id === 'readerFontSize') {
            localStorage.setItem('reader.size', e.target.value);
            applyReaderPrefs();
        } else if (e.target.id === 'readerLineHeight') {
            localStorage.setItem('reader.lineHeight', e.target.value);
            applyReaderPrefs();
        } else if (e.target.id === 'readerWidth') {
            localStorage.setItem('reader.width', e.target.value);
            applyReaderPrefs();
        } else if (e.target.id === 'focusSpeedInput') {
            localStorage.setItem('reader.focusSpeed', e.target.value);
            const valEl = document.getElementById('focusSpeedVal');
            if (valEl) valEl.textContent = e.target.value;
        }
    });

    // Expose globally
    window.openEpubReader = openEpubReader;
    window.closeEpubReader = closeEpubReader;

    console.log('[EPUB Reader] Module loaded');
})();
