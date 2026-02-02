/* Umbrella Select */
function createUmbrellaSelect(options) {
  var opts = options || {};
  var extraClass = (opts.extraClass || '').toString().trim();
  var ariaLabel = (opts.ariaLabel || 'Choose option').toString();

  var root = document.createElement('div');
  root.className = 'umbrella-select-root umbrella-select' + (extraClass ? ' ' + extraClass : '');
  root.setAttribute('role', 'combobox');
  root.setAttribute('aria-haspopup', 'listbox');
  root.setAttribute('aria-expanded', 'false');
  root.setAttribute('aria-label', ariaLabel);

  var trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'umbrella-select-trigger';
  trigger.innerHTML = '<span class="umbrella-select-trigger-label"></span><span class="umbrella-select-trigger-chevron" aria-hidden="true"></span>';
  trigger.setAttribute('aria-label', ariaLabel);

  var dropdown = document.createElement('div');
  dropdown.className = 'umbrella-select-dropdown umbrella-custom-scroll';
  dropdown.setAttribute('role', 'listbox');

  root.appendChild(trigger);
  root.appendChild(dropdown);

  var optionsMap = [];
  var currentValue = '';
  var currentLabel = '';
  var open = false;

  function setTriggerLabel(text) {
    var el = root.querySelector('.umbrella-select-trigger-label');
    if (el) el.textContent = text || 'Select…';
  }

  var scrollParent = null;
  var onScrollClose = null;
  var onResizeClose = null;

  function positionDropdown() {
    var r = trigger.getBoundingClientRect();
    dropdown.style.top = (r.bottom + 4) + 'px';
    dropdown.style.left = r.left + 'px';
    dropdown.style.width = Math.max(r.width, 120) + 'px';
  }

  function closeDropdown() {
    if (!open) return;
    open = false;
    root.setAttribute('aria-expanded', 'false');
    dropdown.classList.remove('is-open');
    dropdown.classList.remove('umbrella-select-dropdown--fixed');
    dropdown.style.top = '';
    dropdown.style.left = '';
    dropdown.style.width = '';
    document.removeEventListener('click', onDocumentClick);
    dropdown.removeEventListener('keydown', onDropdownKeydown);
    if (scrollParent && onScrollClose) {
      scrollParent.removeEventListener('scroll', onScrollClose);
      scrollParent = null;
    }
    if (onResizeClose) {
      window.removeEventListener('resize', onResizeClose);
      onResizeClose = null;
    }
    var parent = dropdown.parentNode;
    if (parent && parent !== root) {
      parent.removeChild(dropdown);
      root.appendChild(dropdown);
    }
  }

  function openDropdown() {
    if (open) return;
    open = true;
    root.setAttribute('aria-expanded', 'true');
    var modal = root.closest('.umbrella-watch-modal');
    var portal = modal || document.body;
    if (portal !== root && dropdown.parentNode === root) {
      root.removeChild(dropdown);
      portal.appendChild(dropdown);
    }
    dropdown.classList.add('umbrella-select-dropdown--fixed');
    positionDropdown();
    dropdown.classList.add('is-open');
    document.addEventListener('click', onDocumentClick);
    dropdown.addEventListener('keydown', onDropdownKeydown);
    onScrollClose = function () { closeDropdown(); };
    scrollParent = modal ? modal.querySelector('.umbrella-watch-scroll') : null;
    if (scrollParent) scrollParent.addEventListener('scroll', onScrollClose);
    onResizeClose = function () { if (open) positionDropdown(); };
    window.addEventListener('resize', onResizeClose);
    var first = dropdown.querySelector('.umbrella-select-option');
    if (first) first.focus();
  }

  function onDocumentClick(e) {
    if (root.contains(e.target) || dropdown.contains(e.target)) return;
    closeDropdown();
  }

  function onDropdownKeydown(e) {
    var items = [].slice.call(dropdown.querySelectorAll('.umbrella-select-option'));
    var idx = items.indexOf(document.activeElement);
    if (e.key === 'Escape') {
      e.preventDefault();
      closeDropdown();
      trigger.focus();
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (idx >= 0 && items[idx]) {
        items[idx].click();
      }
      return;
    }
    if (e.key === 'ArrowDown' && idx < items.length - 1) {
      e.preventDefault();
      items[idx + 1].focus();
      return;
    }
    if (e.key === 'ArrowUp' && idx > 0) {
      e.preventDefault();
      items[idx - 1].focus();
      return;
    }
  }

  trigger.addEventListener('click', function (e) {
    e.stopPropagation();
    if (open) closeDropdown();
    else openDropdown();
  });

  trigger.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      openDropdown();
    }
  });

  root.addOption = function (value, label) {
    var v = value == null ? '' : String(value);
    var l = (label != null && label !== '') ? String(label) : v;
    optionsMap.push({ value: v, label: l });
    var opt = document.createElement('div');
    opt.className = 'umbrella-select-option';
    opt.setAttribute('role', 'option');
    opt.setAttribute('data-value', v);
    opt.textContent = l;
    opt.tabIndex = -1;
    opt.addEventListener('click', function (e) {
      e.stopPropagation();
      currentValue = v;
      currentLabel = l;
      setTriggerLabel(l);
      closeDropdown();
      trigger.focus();
      root.dispatchEvent(new CustomEvent('change', { bubbles: true }));
    });
    dropdown.appendChild(opt);
  };

  root.clearOptions = function () {
    optionsMap.length = 0;
    dropdown.innerHTML = '';
    currentValue = '';
    currentLabel = '';
    setTriggerLabel('');
  };

  Object.defineProperty(root, 'value', {
    get: function () { return currentValue; },
    set: function (v) {
      var s = v == null ? '' : String(v);
      var found = optionsMap.find(function (o) { return o.value === s; });
      if (found) {
        currentValue = found.value;
        currentLabel = found.label;
        setTriggerLabel(found.label);
      } else {
        currentValue = s;
        currentLabel = '';
        setTriggerLabel(s || '');
      }
    },
    configurable: true
  });

  setTriggerLabel('');

  return root;
}

if (typeof window !== 'undefined') {
  window.createUmbrellaSelect = createUmbrellaSelect;
}
