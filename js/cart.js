/* ── Cart module (window.Cart) ─────────────────────────────────────────────
   Stores cart in localStorage. Fires 'cartUpdated' on every change.
   Item shape: { product_id, product_name, product_price, product_image, quantity }
─────────────────────────────────────────────────────────────────────────── */

window.Cart = (function() {
  var KEY = 'sports_equip_cart';

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch (e) { return []; }
  }

  function save(items) {
    localStorage.setItem(KEY, JSON.stringify(items));
    document.dispatchEvent(new CustomEvent('cartUpdated'));
  }

  return {
    getItems: function() {
      return load();
    },

    addItem: function(product) {
      var items = load();
      var existing = null;
      for (var i = 0; i < items.length; i++) {
        if (items[i].product_id === product.product_id) { existing = items[i]; break; }
      }
      if (existing) {
        existing.quantity += 1;
      } else {
        items.push({
          product_id:    product.product_id,
          product_name:  product.product_name,
          product_price: product.product_price,
          product_image: product.product_image || '',
          quantity:      1
        });
      }
      save(items);
    },

    removeItem: function(productId) {
      var items = load().filter(function(i) { return i.product_id !== productId; });
      save(items);
    },

    updateQty: function(productId, qty) {
      if (qty <= 0) { this.removeItem(productId); return; }
      var items = load();
      for (var i = 0; i < items.length; i++) {
        if (items[i].product_id === productId) { items[i].quantity = qty; break; }
      }
      save(items);
    },

    getTotalCount: function() {
      return load().reduce(function(sum, i) { return sum + i.quantity; }, 0);
    },

    getSubtotal: function() {
      return load().reduce(function(sum, i) { return sum + (parseFloat(i.product_price) * i.quantity); }, 0);
    },

    clear: function() {
      save([]);
    }
  };
})();
