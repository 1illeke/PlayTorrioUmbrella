/* Umbrella SearchBar */
function createUmbrellaSearchBar(onSearch) {
  var wrap = document.createElement('div');
  wrap.className = 'umbrella-search-bar';

  var input = document.createElement('input');
  input.type = 'search';
  input.placeholder = 'Search movies & TV…';
  input.className = 'umbrella-search-input';
  input.setAttribute('aria-label', 'Search');

  var clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'umbrella-search-clear';
  clearBtn.setAttribute('aria-label', 'Clear search');
  clearBtn.textContent = '\u00D7';
  clearBtn.style.display = 'none';

  function emit() {
    var q = (input.value || '').trim();
    clearBtn.style.display = q ? '' : 'none';
    if (typeof onSearch === 'function') onSearch(q);
  }

  input.addEventListener('input', emit);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') emit();
  });
  clearBtn.addEventListener('click', function () {
    input.value = '';
    emit();
  });

  wrap.appendChild(input);
  wrap.appendChild(clearBtn);
  return wrap;
}

function mountUmbrellaSearchBar(container, onSearch) {
  if (!container) container = document.querySelector('.umbrella-header-search-slot');
  if (!container) return null;
  var bar = createUmbrellaSearchBar(onSearch);
  container.appendChild(bar);
  return bar;
}

if (typeof window !== 'undefined') {
  window.createUmbrellaSearchBar = createUmbrellaSearchBar;
  window.mountUmbrellaSearchBar = mountUmbrellaSearchBar;
}
