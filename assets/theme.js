/* abide.clo — theme scripts
   Cart drawer (AJAX Cart API + Section Rendering API), product form,
   gallery, quantity steppers, mobile menu. No dependencies. */
(function () {
  'use strict';

  var theme = window.theme || {};
  var routes = theme.routes || {};
  var root = routes.root || '/';
  var DRAWER_SECTION = 'cart-drawer';

  /* ---------- Money ---------- */

  function formatMoney(cents, format) {
    if (typeof cents === 'string') cents = cents.replace('.', '');
    format = format || theme.moneyFormat || '${{amount}}';
    var match = format.match(/\{\{\s*(\w+)\s*\}\}/);
    if (!match) return String(cents);

    function withDelimiters(number, precision, thousands, decimal) {
      if (isNaN(number) || number == null) return '0';
      var parts = (number / 100).toFixed(precision).split('.');
      var dollars = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + thousands);
      return dollars + (parts[1] ? decimal + parts[1] : '');
    }

    var value;
    switch (match[1]) {
      case 'amount': value = withDelimiters(cents, 2, ',', '.'); break;
      case 'amount_no_decimals': value = withDelimiters(cents, 0, ',', '.'); break;
      case 'amount_with_comma_separator': value = withDelimiters(cents, 2, '.', ','); break;
      case 'amount_no_decimals_with_comma_separator': value = withDelimiters(cents, 0, '.', ','); break;
      case 'amount_with_apostrophe_separator': value = withDelimiters(cents, 2, "'", '.'); break;
      case 'amount_no_decimals_with_space_separator': value = withDelimiters(cents, 0, ' ', ''); break;
      case 'amount_with_space_separator': value = withDelimiters(cents, 2, ' ', ','); break;
      case 'amount_with_period_and_space_separator': value = withDelimiters(cents, 2, ' ', '.'); break;
      default: value = withDelimiters(cents, 2, ',', '.');
    }
    return format.replace(match[0], value);
  }

  theme.formatMoney = formatMoney;

  /* ---------- Fetch helpers ---------- */

  function postJSON(url, body) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body)
    }).then(parseResponse);
  }

  function parseResponse(res) {
    return res.json().then(function (data) {
      if (!res.ok || data.status) {
        var err = new Error(data.description || data.message || 'Something went wrong.');
        err.data = data;
        throw err;
      }
      return data;
    });
  }

  function sectionUrl() {
    return window.location.pathname;
  }

  /* ---------- Cart drawer ---------- */

  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])';

  var drawer = {
    el: null,
    lastFocus: null,

    init: function () {
      var self = this;
      this.attach();

      // Document-level delegation, bound once.
      document.addEventListener('click', function (e) {
        var opener = e.target.closest('[data-cart-open]');
        if (opener && self.el && self.el.isConnected) {
          e.preventDefault();
          self.open(opener);
          return;
        }
        if (e.target.closest('[data-cart-close]')) {
          e.preventDefault();
          self.close();
          return;
        }
        var change = e.target.closest('[data-line-change]');
        if (change && self.el.contains(change)) {
          e.preventDefault();
          self.changeLine(change.getAttribute('data-line'), parseInt(change.getAttribute('data-quantity'), 10));
        }
      });
    },

    /* Bind listeners on the drawer element itself (re-run after a theme editor reload). */
    attach: function () {
      var self = this;
      this.el = document.getElementById('CartDrawer');
      if (!this.el) return;

      this.el.addEventListener('change', function (e) {
        var input = e.target.closest('[data-line-input]');
        if (!input) return;
        var qty = Math.max(0, parseInt(input.value, 10) || 0);
        self.changeLine(input.getAttribute('data-line'), qty);
      });

      this.el.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          e.preventDefault();
          self.close();
        } else if (e.key === 'Tab') {
          self.trapFocus(e);
        }
      });
    },

    isOpen: function () {
      return this.el && this.el.classList.contains('is-open');
    },

    open: function (opener) {
      if (!this.el) return;
      if (!this.isOpen()) {
        this.lastFocus = opener || document.activeElement;
      }
      this.el.classList.add('is-open');
      this.el.setAttribute('aria-hidden', 'false');
      this.el.removeAttribute('inert');
      document.body.classList.add('drawer-open');
      document.querySelectorAll('[data-cart-open]').forEach(function (b) { b.setAttribute('aria-expanded', 'true'); });
      var closeBtn = this.el.querySelector('[data-cart-close]:not(.drawer__overlay)');
      window.requestAnimationFrame(function () { if (closeBtn) closeBtn.focus(); });
    },

    close: function () {
      if (!this.isOpen()) return;
      this.el.classList.remove('is-open');
      this.el.setAttribute('aria-hidden', 'true');
      this.el.setAttribute('inert', '');
      document.body.classList.remove('drawer-open');
      document.querySelectorAll('[data-cart-open]').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
      if (this.lastFocus && typeof this.lastFocus.focus === 'function') this.lastFocus.focus();
    },

    trapFocus: function (e) {
      var panel = this.el.querySelector('.drawer__panel');
      var nodes = Array.prototype.filter.call(
        panel.querySelectorAll(FOCUSABLE),
        function (n) { return n.offsetParent !== null; }
      );
      if (!nodes.length) return;
      var first = nodes[0];
      var last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },

    setLoading: function (on) {
      var body = this.el && this.el.querySelector('.drawer__body');
      if (body) body.classList.toggle('is-loading', on);
    },

    /* Replace drawer contents with freshly rendered section HTML. */
    render: function (html) {
      if (!html || !this.el) return;
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var fresh = doc.querySelector('[data-drawer-contents]');
      var current = this.el.querySelector('[data-drawer-contents]');
      if (fresh && current) current.innerHTML = fresh.innerHTML;
      var count = doc.querySelector('[data-cart-count-value]');
      if (count) updateCount(count.getAttribute('data-cart-count-value'));
    },

    refresh: function () {
      var self = this;
      return fetch(sectionUrl() + '?sections=' + DRAWER_SECTION)
        .then(function (r) { return r.json(); })
        .then(function (sections) { self.render(sections[DRAWER_SECTION]); });
    },

    changeLine: function (line, quantity) {
      var self = this;
      var focusKey = document.activeElement && document.activeElement.getAttribute('data-focus-key');
      this.setLoading(true);
      return postJSON(routes.cartChange + '.js', {
        line: parseInt(line, 10),
        quantity: quantity,
        sections: [DRAWER_SECTION],
        sections_url: sectionUrl()
      })
        .then(function (cart) {
          if (cart.sections) self.render(cart.sections[DRAWER_SECTION]);
          else return self.refresh();
          updateCount(cart.item_count);
        })
        .catch(function (err) {
          self.showError(err.message);
          return self.refresh();
        })
        .then(function () {
          self.setLoading(false);
          var target = focusKey && self.el.querySelector('[data-focus-key="' + focusKey + '"]');
          (target || self.el.querySelector('[data-cart-close]:not(.drawer__overlay)')).focus();
        });
    },

    showError: function (msg) {
      var slot = this.el && this.el.querySelector('[data-drawer-error]');
      if (!slot) return;
      slot.textContent = msg;
      slot.hidden = !msg;
    }
  };

  function updateCount(count) {
    document.querySelectorAll('[data-cart-count]').forEach(function (el) {
      el.textContent = count;
    });
  }

  theme.cartDrawer = drawer;

  /* ---------- Add to cart (featured product + PDP) ---------- */

  function initProductForms() {
    document.addEventListener('submit', function (e) {
      var form = e.target.closest('form[data-product-form]');
      if (!form || !drawer.el) return;
      e.preventDefault();

      var button = form.querySelector('[type="submit"]');
      var errorSlot = form.parentElement.querySelector('[data-product-error]') || form.querySelector('[data-product-error]');
      if (button) {
        button.setAttribute('aria-busy', 'true');
        button.disabled = true;
      }
      if (errorSlot) { errorSlot.hidden = true; errorSlot.textContent = ''; }

      var data = new FormData(form);
      data.append('sections', DRAWER_SECTION);
      data.append('sections_url', sectionUrl());

      fetch(routes.cartAdd + '.js', {
        method: 'POST',
        headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: data
      })
        .then(parseResponse)
        .then(function (item) {
          if (item.sections) drawer.render(item.sections[DRAWER_SECTION]);
          else return drawer.refresh();
        })
        .then(function () {
          // PDP quantity resets to 1 after adding.
          var qty = form.querySelector('[data-qty-input]');
          if (qty) {
            qty.value = 1;
            qty.dispatchEvent(new Event('input', { bubbles: true }));
          }
          drawer.open(button);
        })
        .catch(function (err) {
          if (errorSlot) {
            errorSlot.textContent = err.message;
            errorSlot.hidden = false;
          }
        })
        .then(function () {
          if (button) {
            button.removeAttribute('aria-busy');
            button.disabled = button.hasAttribute('data-sold-out');
          }
        });
    });
  }

  /* ---------- Quantity steppers (PDP + cart page) ---------- */

  function initSteppers() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-qty-step]');
      if (!btn) return;
      var wrap = btn.closest('[data-stepper]');
      var input = wrap && wrap.querySelector('input');
      if (!input) return;
      e.preventDefault();
      var min = parseInt(input.getAttribute('min'), 10);
      if (isNaN(min)) min = 1;
      var next = (parseInt(input.value, 10) || 0) + parseInt(btn.getAttribute('data-qty-step'), 10);
      input.value = Math.max(min, next);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      if (wrap.hasAttribute('data-autosubmit')) wrap.closest('form').submit();
    });
  }

  /* ---------- Product page ---------- */

  function initProduct(section) {
    var form = section.querySelector('form[data-product-form]');
    var variantsEl = section.querySelector('[data-product-variants]');
    var variants = variantsEl ? JSON.parse(variantsEl.textContent) : [];
    var idInput = form && form.querySelector('input[name="id"]');
    var qtyInput = form && form.querySelector('[data-qty-input]');
    var addLabel = section.querySelector('[data-add-label]');
    var priceEl = section.querySelector('[data-product-price]');
    var addBtn = form && form.querySelector('[type="submit"]');
    var labels = addBtn ? {
      add: addBtn.getAttribute('data-label-add'),
      soldOut: addBtn.getAttribute('data-label-sold-out'),
      unavailable: addBtn.getAttribute('data-label-unavailable')
    } : {};

    function currentVariant() {
      if (!idInput) return null;
      var id = parseInt(idInput.value, 10);
      for (var i = 0; i < variants.length; i++) if (variants[i].id === id) return variants[i];
      return null;
    }

    function updateButton() {
      if (!addBtn || !addLabel) return;
      var v = currentVariant();
      var qty = Math.max(1, parseInt(qtyInput && qtyInput.value, 10) || 1);
      if (!v) {
        addLabel.textContent = labels.unavailable;
        addBtn.disabled = true;
        addBtn.setAttribute('data-sold-out', '');
        return;
      }
      if (!v.available) {
        addLabel.textContent = labels.soldOut;
        addBtn.disabled = true;
        addBtn.setAttribute('data-sold-out', '');
        return;
      }
      addBtn.disabled = false;
      addBtn.removeAttribute('data-sold-out');
      addLabel.textContent = labels.add + ' — ' + formatMoney(v.price * qty);
    }

    if (qtyInput) {
      qtyInput.addEventListener('input', updateButton);
      qtyInput.addEventListener('change', function () {
        if (!(parseInt(qtyInput.value, 10) >= 1)) qtyInput.value = 1;
        updateButton();
      });
    }

    // Variant options
    section.addEventListener('change', function (e) {
      if (!e.target.matches('[data-option-input]')) return;
      var selected = Array.prototype.map.call(
        section.querySelectorAll('[data-option-input]:checked'),
        function (input) { return input.value; }
      );
      var match = null;
      for (var i = 0; i < variants.length; i++) {
        var v = variants[i];
        if (v.options.every(function (o, idx) { return o === selected[idx]; })) { match = v; break; }
      }

      var group = e.target.closest('[data-option]');
      var label = group && group.querySelector('[data-option-selected]');
      if (label) label.textContent = e.target.value;

      if (idInput) idInput.value = match ? match.id : '';
      if (match && priceEl) {
        var html = '';
        if (match.compare_at_price > match.price) {
          html += '<s>' + formatMoney(match.compare_at_price) + '</s>';
        }
        priceEl.innerHTML = html + '<span>' + formatMoney(match.price) + '</span>';
      }
      if (match && match.featured_media) showMedia(section, String(match.featured_media.id));
      if (match && window.history.replaceState) {
        var url = new URL(window.location.href);
        url.searchParams.set('variant', match.id);
        window.history.replaceState({}, '', url.toString());
      }
      updateButton();
    });

    // Gallery thumbnails
    section.addEventListener('click', function (e) {
      var thumb = e.target.closest('[data-thumb]');
      if (!thumb) return;
      e.preventDefault();
      showMedia(section, thumb.getAttribute('data-thumb'));
    });

    updateButton();
  }

  function showMedia(section, id) {
    var found = false;
    section.querySelectorAll('[data-media]').forEach(function (m) {
      var on = m.getAttribute('data-media') === id;
      if (on) found = true;
      m.hidden = !on;
    });
    if (!found) return;
    section.querySelectorAll('[data-thumb]').forEach(function (t) {
      t.setAttribute('aria-current', t.getAttribute('data-thumb') === id ? 'true' : 'false');
    });
  }

  function initProducts(scope) {
    (scope || document).querySelectorAll('[data-product-section]').forEach(initProduct);
  }

  /* ---------- Mobile menu ---------- */

  function initMenu() {
    document.addEventListener('click', function (e) {
      var toggle = e.target.closest('[data-menu-toggle]');
      if (!toggle) return;
      var header = toggle.closest('.site-header');
      var open = !header.classList.contains('is-menu-open');
      header.classList.toggle('is-menu-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  /* ---------- Boot ---------- */

  document.addEventListener('DOMContentLoaded', function () {
    drawer.init();
    initProductForms();
    initSteppers();
    initProducts();
    initMenu();

    if (drawer.el && document.body.hasAttribute('data-open-cart')) drawer.open();
  });

  // Theme editor support
  document.addEventListener('shopify:section:load', function (e) {
    initProducts(e.target);
    if (e.target.querySelector('#CartDrawer')) drawer.attach();
  });
  document.addEventListener('shopify:section:select', function (e) {
    if (e.target.querySelector('#CartDrawer')) drawer.open();
  });
  document.addEventListener('shopify:section:deselect', function (e) {
    if (e.target.querySelector('#CartDrawer')) drawer.close();
  });

  window.theme = theme;
})();
