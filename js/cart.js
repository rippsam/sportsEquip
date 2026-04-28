/* ── Cart module (window.Cart) ─────────────────────────────────────────────
   Stores cart in localStorage. Fires 'cartUpdated' on every change.
   Item shape: { product_id, product_name, product_price, product_image, quantity }
─────────────────────────────────────────────────────────────────────────── */

window.Cart = (function() {
  const KEY = 'sports_equip_cart';

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) ?? []; }
    catch { return []; }
  }

  function save(items) {
    localStorage.setItem(KEY, JSON.stringify(items));
    document.dispatchEvent(new CustomEvent('cartUpdated'));
  }

  return {
    getItems() { return load(); },

    addItem(product) {
      const items    = load();
      const existing = items.find(function(i) { return i.product_id === product.product_id; });
      if (existing) {
        if (existing.quantity >= 10) return false;
        existing.quantity += 1;
      } else {
        items.push({
          product_id:    product.product_id,
          product_name:  product.product_name,
          product_price: product.product_price,
          product_image: product.product_image ?? '',
          quantity:      1
        });
      }
      save(items);
      return true;
    },

    removeItem(productId) {
      save(load().filter(function(i) { return i.product_id !== productId; }));
    },

    updateQty(productId, qty) {
      if (qty <= 0) { this.removeItem(productId); return; }
      qty = Math.min(qty, 10);
      const items = load();
      const item  = items.find(function(i) { return i.product_id === productId; });
      if (item) item.quantity = qty;
      save(items);
    },

    getTotalCount() {
      return load().reduce(function(sum, i) { return sum + i.quantity; }, 0);
    },

    getSubtotal() {
      return load().reduce(function(sum, i) { return sum + parseFloat(i.product_price) * i.quantity; }, 0);
    },

    clear() { save([]); }
  };
})();
