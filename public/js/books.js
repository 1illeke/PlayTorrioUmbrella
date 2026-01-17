// Books Module - Z-Library Integration

// Helper to get API base URL
function getBooksApiUrl(endpoint) {
    const baseUrl = window.API_BASE_URL || 'http://localhost:6987/api';
    if (endpoint.startsWith('/')) {
        return baseUrl + endpoint;
    }
    return baseUrl + '/' + endpoint;
}

let booksCurrentQuery = '';
let booksCurrentPage = 1;
let booksHasMore = true;
let booksIsLoading = false;
let booksSearchResults = [];

// Helper functions for saved books
function getSavedBooks() {
    try {
        return JSON.parse(localStorage.getItem('zlib_saved_books') || '[]');
    } catch (e) {
        return [];
    }
}

function isBookSaved(bookUrl) {
    const saved = getSavedBooks();
    return saved.some(b => (b.url || b.bookUrl) === bookUrl);
}

function saveBook(book) {
    const saved = getSavedBooks();
    if (!saved.some(b => (b.url || b.bookUrl) === (book.url || book.bookUrl))) {
        saved.push(book);
        localStorage.setItem('zlib_saved_books', JSON.stringify(saved));
        showNotification('Book saved to library', 'success');
    }
}

function removeBook(bookUrl) {
    let saved = getSavedBooks();
    saved = saved.filter(b => (b.url || b.bookUrl) !== bookUrl);
    localStorage.setItem('zlib_saved_books', JSON.stringify(saved));
    showNotification('Book removed from library', 'info');
}

// Load books function
async function loadBooks(page = 1, append = false) {
    const booksLoading = document.getElementById('books-loading');
    const booksResults = document.getElementById('books-results');
    const booksEmpty = document.getElementById('books-empty');
    const booksResultsGrid = document.getElementById('books-results-grid');

    if (!booksLoading || !booksResults || !booksEmpty || !booksResultsGrid) return;

    if (booksIsLoading) return;
    booksIsLoading = true;

    if (!append) {
        booksLoading.style.display = 'flex';
        booksResults.style.display = 'none';
        booksEmpty.style.display = 'none';
    }

    if (page === 1) {
        if (page === 1) booksResultsGrid.innerHTML = '';
    }

    try {
        let url;
        const booksBase = getBooksApiUrl('zlib');

        if (booksCurrentQuery && booksCurrentQuery !== '__saved__') {
            // Search mode
            if (page > 1) {
                booksIsLoading = false;
                return;
            }
            url = `${booksBase}/search/${encodeURIComponent(booksCurrentQuery)}`;
        } else if (booksCurrentQuery === '__saved__') {
            // Saved books mode
            booksIsLoading = false;
            booksLoading.style.display = 'none';
            const savedBooks = getSavedBooks();
            displayBooksResults(savedBooks, false);
            return;
        } else {
            // Popular/All mode
            url = `${booksBase}/all?page=${page}`;
        }

        console.log(`[BOOKS] Fetching: ${url}`);
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        let items = [];

        if (booksCurrentQuery && booksCurrentQuery !== '__saved__') {
            // Search returns { success: 1, books: [...] }
            items = data.books || [];
            booksHasMore = false;
        } else {
            // All/Popular returns [ ... ] or { books: [...] }
            if (Array.isArray(data)) {
                items = data;
            } else if (data.books && Array.isArray(data.books)) {
                items = data.books;
            } else if (data.mostPopular && Array.isArray(data.mostPopular)) {
                items = data.mostPopular;
            }

            booksHasMore = items.length > 0;
        }

        if (append) {
            booksSearchResults = [...booksSearchResults, ...items];
        } else {
            booksSearchResults = items;
        }

        displayBooksResults(items, append);

    } catch (error) {
        console.error('[BOOKS] Error loading books:', error);
        if (!append) {
            booksResults.style.display = 'none';
            booksEmpty.style.display = 'block';
            booksEmpty.innerHTML = `<div class="books-empty-icon"><i class="fas fa-exclamation-triangle"></i></div><h3>Error Loading Books</h3><p>${error.message}</p>`;
        }
    } finally {
        booksIsLoading = false;
        booksLoading.style.display = 'none';
    }
}

// Display books results
function displayBooksResults(books, append) {
    const booksResults = document.getElementById('books-results');
    const booksEmpty = document.getElementById('books-empty');
    const booksResultsTitle = document.getElementById('books-results-title');
    const booksResultsCount = document.getElementById('books-results-count');
    const booksResultsGrid = document.getElementById('books-results-grid');

    if (!booksResults || !booksEmpty || !booksResultsGrid) return;

    if (!append) {
        booksResultsTitle.textContent = booksCurrentQuery === '__saved__' ? 'My Saved Books' : (booksCurrentQuery ? `Search Results for "${booksCurrentQuery}"` : 'Most Popular Books');
        booksResultsCount.textContent = '';
        booksResultsGrid.innerHTML = '';
    }

    if (books.length === 0 && !append) {
        booksResults.style.display = 'none';
        booksEmpty.style.display = 'block';
        booksEmpty.innerHTML = `
            <div class="books-empty-icon">
                <i class="fas fa-search"></i>
            </div>
            <h3>No Books Found</h3>
            <p>${booksCurrentQuery === '__saved__' ? 'You haven\'t saved any books yet.' : (booksCurrentQuery ? `No results found for "${booksCurrentQuery}"` : 'No popular books found at the moment.')}</p>
        `;
        return;
    }

    booksEmpty.style.display = 'none';
    booksResults.style.display = 'block';

    // Add styles for save button if not present
    if (!document.getElementById('zlib-save-btn-style')) {
        const style = document.createElement('style');
        style.id = 'zlib-save-btn-style';
        style.textContent = `
            .books-save-btn {
                position: absolute;
                top: 5px;
                right: 5px;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                background: rgba(0, 0, 0, 0.6);
                color: white;
                border: none;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s;
                z-index: 10;
            }
            .books-save-btn:hover {
                background: #2ecc71;
                transform: scale(1.1);
            }
        `;
        document.head.appendChild(style);
    }

    books.forEach(book => {
        const bookCard = document.createElement('div');
        bookCard.className = 'books-book-card';

        const cover = book.cover || book.photo || '';
        const title = book.title || 'Unknown Title';
        const author = book.author || 'Unknown Author';
        const format = book.extension || book.format || 'EPUB';
        const bookUrl = book.url || book.bookUrl;

        const isSaved = isBookSaved(bookUrl);

        bookCard.innerHTML = `
            <div class="books-book-cover">
                <img loading="lazy" src="${cover}" alt="${title}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="books-book-cover-placeholder" style="display: none;">
                    <i class="fas fa-book"></i>
                </div>
                <div class="books-book-format">${format}</div>
                <button class="books-save-btn" data-book='${JSON.stringify(book).replace(/'/g, "&apos;")}' title="${isSaved ? 'Remove from Saved' : 'Save Book'}">
                    <i class="fas ${isSaved ? 'fa-check' : 'fa-plus'}"></i>
                </button>
            </div>
            <div class="books-book-info">
                <h3 class="books-book-title">${title}</h3>
                <p class="books-book-author">by ${author}</p>
                <div class="books-book-actions">
                    <button class="books-read-btn" data-book-path="${bookUrl}" data-title="${title}">
                        <i class="fas fa-book-open"></i>
                        Read Now
                    </button>
                </div>
            </div>
        `;

        booksResultsGrid.appendChild(bookCard);

        // Save button listener
        const saveBtn = bookCard.querySelector('.books-save-btn');
        saveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const btn = e.currentTarget;
            const bookData = JSON.parse(btn.getAttribute('data-book'));
            const bUrl = bookData.url || bookData.bookUrl;

            if (isBookSaved(bUrl)) {
                removeBook(bUrl);
                btn.innerHTML = '<i class="fas fa-plus"></i>';
                btn.title = 'Save Book';

                // If viewing saved books, remove the card
                if (booksCurrentQuery === '__saved__') {
                    bookCard.remove();
                    if (booksResultsGrid.children.length === 0) {
                        booksResults.style.display = 'none';
                        booksEmpty.style.display = 'block';
                        booksEmpty.innerHTML = `
                            <div class="books-empty-icon"><i class="fas fa-bookmark"></i></div>
                            <h3>No Saved Books</h3>
                            <p>You haven't saved any books yet.</p>
                        `;
                    }
                }
            } else {
                saveBook(bookData);
                btn.innerHTML = '<i class="fas fa-check"></i>';
                btn.title = 'Remove from Saved';
            }
        });

        // Read button listener
        const readBtn = bookCard.querySelector('.books-read-btn');
        readBtn.addEventListener('click', async (e) => {
            const btn = e.currentTarget;
            const path = btn.getAttribute('data-book-path');
            const title = btn.getAttribute('data-title');

            if (!path) return;

            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Opening...';
            btn.disabled = true;

            try {
                const booksBase = getBooksApiUrl('zlib');
                const resp = await fetch(`${booksBase}/read-link?path=${encodeURIComponent(path)}`);
                const json = await resp.json();

                if (json.success && json.readLink) {
                    if (window.electronAPI?.openExternal) {
                        window.electronAPI.openExternal(json.readLink);
                        showNotification(`Opening "${title}"...`, 'success');
                    } else {
                        window.open(json.readLink, '_blank');
                    }
                } else {
                    showNotification('Could not find read link for this book', 'error');
                }
            } catch (err) {
                console.error(err);
                showNotification('Failed to fetch read link', 'error');
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    });
}

// Search books
async function searchBooks(query) {
    if (!query || query.trim().length === 0) {
        showNotification('Please enter a search term', 'warning');
        return;
    }

    booksCurrentQuery = query.trim();
    booksCurrentPage = 1;
    booksHasMore = true;

    await loadBooks(1, false);
}

// Load more books (infinite scroll)
async function loadMoreBooks() {
    if (booksIsLoading || !booksHasMore || booksCurrentQuery) return;
    booksCurrentPage++;
    await loadBooks(booksCurrentPage, true);
}

// Initialize books page
async function initializeBooks() {
    const booksSearchInput = document.getElementById('books-search-input');
    const booksSearchBtn = document.getElementById('books-search-btn');
    const booksSavedBtn = document.getElementById('books-saved-btn');
    const booksResultsContainer = document.getElementById('books-results-container');

    if (!booksSearchInput || !booksSearchBtn) {
        console.warn('[BOOKS] Search elements not found');
        return;
    }

    // Search button
    booksSearchBtn.addEventListener('click', () => {
        const query = booksSearchInput.value.trim();
        if (query) searchBooks(query);
    });

    // Enter key in search input
    booksSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = booksSearchInput.value.trim();
            if (query) searchBooks(query);
        }
    });

    // Saved books button
    if (booksSavedBtn) {
        booksSavedBtn.addEventListener('click', () => {
            booksCurrentQuery = '__saved__';
            booksCurrentPage = 1;
            loadBooks(1, false);
        });
    }

    // Infinite scroll
    if (booksResultsContainer) {
        booksResultsContainer.addEventListener('scroll', () => {
            if (booksIsLoading || !booksHasMore || booksCurrentQuery) return;

            const scrollTop = booksResultsContainer.scrollTop;
            const scrollHeight = booksResultsContainer.scrollHeight;
            const clientHeight = booksResultsContainer.clientHeight;

            if (scrollTop + clientHeight >= scrollHeight - 100) {
                loadMoreBooks();
            }
        });
    }

    // Load initial popular books
    booksCurrentQuery = '';
    booksCurrentPage = 1;
    await loadBooks(1, false);
}

// Export functions
window.initializeBooks = initializeBooks;
window.searchBooks = searchBooks;
window.loadBooks = loadBooks;
window.getSavedBooks = getSavedBooks;
window.saveBook = saveBook;
window.removeBook = removeBook;

console.log('[Books] Books module loaded (Z-Library)');
