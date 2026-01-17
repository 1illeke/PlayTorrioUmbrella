/**
 * Performance Boost Module
 * Optimizes rendering and scroll performance
 */

// Enable CSS containment for better rendering performance
(function enableCSSContainment() {
    const style = document.createElement('style');
    style.textContent = `
        /* GPU acceleration hints */
        .movie-card, .genre-card, .episode-card, .slider-item {
            transform: translateZ(0);
            backface-visibility: hidden;
            perspective: 1000px;
        }
        
        /* Contain layout/paint for better performance */
        .movies-grid, .genre-grid, .episodes-grid {
            contain: layout style paint;
        }
        
        .movie-card, .genre-card {
            contain: layout style paint;
            content-visibility: auto;
        }
        
        /* Reduce repaints on scroll */
        main, .app-main {
            will-change: scroll-position;
        }
        
        /* Optimize images */
        img {
            image-rendering: -webkit-optimize-contrast;
            image-rendering: crisp-edges;
        }
        
        .movie-poster, .episode-img {
            will-change: auto;
        }
    `;
    document.head.appendChild(style);
})();

// Throttle function for better performance
function throttle(func, wait) {
    let timeout;
    let previous = 0;
    
    return function executedFunction(...args) {
        const now = Date.now();
        const remaining = wait - (now - previous);
        
        if (remaining <= 0 || remaining > wait) {
            if (timeout) {
                clearTimeout(timeout);
                timeout = null;
            }
            previous = now;
            func.apply(this, args);
        } else if (!timeout) {
            timeout = setTimeout(() => {
                previous = Date.now();
                timeout = null;
                func.apply(this, args);
            }, remaining);
        }
    };
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Optimize scroll listeners globally
(function optimizeScrollListeners() {
    // Replace all scroll event listeners with throttled versions
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    
    EventTarget.prototype.addEventListener = function(type, listener, options) {
        if (type === 'scroll' || type === 'resize') {
            // Auto-throttle scroll and resize events
            const throttledListener = throttle(listener, 150);
            
            // Ensure passive: true for scroll events
            if (typeof options === 'object') {
                options.passive = true;
            } else {
                options = { passive: true };
            }
            
            return originalAddEventListener.call(this, type, throttledListener, options);
        }
        
        return originalAddEventListener.call(this, type, listener, options);
    };
})();

// Batch DOM updates using requestAnimationFrame
window.batchDOMUpdate = (function() {
    let pending = [];
    let scheduled = false;
    
    function flush() {
        const updates = pending;
        pending = [];
        scheduled = false;
        
        updates.forEach(fn => {
            try {
                fn();
            } catch (e) {
                console.error('[Performance] DOM update error:', e);
            }
        });
    }
    
    return function(updateFn) {
        pending.push(updateFn);
        
        if (!scheduled) {
            scheduled = true;
            requestAnimationFrame(flush);
        }
    };
})();

// Optimize image loading with Intersection Observer
(function setupLazyLoading() {
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        observer.unobserve(img);
                    }
                }
            });
        }, {
            rootMargin: '50px 0px',
            threshold: 0.01
        });
        
        // Observe images as they're added
        const observeImages = () => {
            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });
        };
        
        // Initial observation
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', observeImages);
        } else {
            observeImages();
        }
        
        // Re-observe on mutations
        const mutationObserver = new MutationObserver(debounce(observeImages, 300));
        mutationObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        window.observeLazyImages = observeImages;
    }
})();

// Virtual scrolling helper for large lists
window.createVirtualScroller = function(container, items, renderItem, itemHeight = 300) {
    const viewportHeight = container.clientHeight;
    const totalHeight = items.length * itemHeight;
    const visibleCount = Math.ceil(viewportHeight / itemHeight) + 2; // +2 for buffer
    
    let scrollTop = 0;
    let startIndex = 0;
    
    const spacer = document.createElement('div');
    spacer.style.height = `${totalHeight}px`;
    spacer.style.position = 'relative';
    container.appendChild(spacer);
    
    const content = document.createElement('div');
    content.style.position = 'absolute';
    content.style.top = '0';
    content.style.left = '0';
    content.style.right = '0';
    spacer.appendChild(content);
    
    function render() {
        startIndex = Math.floor(scrollTop / itemHeight);
        const endIndex = Math.min(startIndex + visibleCount, items.length);
        
        content.style.transform = `translateY(${startIndex * itemHeight}px)`;
        content.innerHTML = '';
        
        const fragment = document.createDocumentFragment();
        for (let i = startIndex; i < endIndex; i++) {
            const element = renderItem(items[i], i);
            fragment.appendChild(element);
        }
        content.appendChild(fragment);
    }
    
    const onScroll = throttle(() => {
        scrollTop = container.scrollTop;
        render();
    }, 100);
    
    container.addEventListener('scroll', onScroll, { passive: true });
    render();
    
    return {
        update: (newItems) => {
            items = newItems;
            spacer.style.height = `${items.length * itemHeight}px`;
            render();
        },
        destroy: () => {
            container.removeEventListener('scroll', onScroll);
            spacer.remove();
        }
    };
};

// Reduce layout thrashing
window.fastBatchRead = function(readFn) {
    return new Promise(resolve => {
        requestAnimationFrame(() => {
            const result = readFn();
            resolve(result);
        });
    });
};

window.fastBatchWrite = function(writeFn) {
    return new Promise(resolve => {
        requestAnimationFrame(() => {
            writeFn();
            resolve();
        });
    });
};

// Monitor performance
if (window.performance && window.performance.memory) {
    setInterval(() => {
        const memory = window.performance.memory;
        const usedMB = (memory.usedJSHeapSize / 1048576).toFixed(2);
        const totalMB = (memory.totalJSHeapSize / 1048576).toFixed(2);
        
        if (usedMB / totalMB > 0.9) {
            console.warn('[Performance] High memory usage:', usedMB, 'MB /', totalMB, 'MB');
        }
    }, 30000); // Check every 30 seconds
}

console.log('[Performance] Boost module loaded - optimizations active');
