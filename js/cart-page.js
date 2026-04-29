/* ── Cart page logic ── */

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const SHIPPING_THRESHOLD = 75;
const SHIPPING_COST      = 8.99;

function renderCart() {
  const container = document.getElementById('cart-container');
  if (!container) return;

  const items      = Cart.getItems();
  const subtotal   = Cart.getSubtotal();
  const shipping   = subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  const total      = subtotal + shipping;
  const totalCount = Cart.getTotalCount();

  const heading = document.getElementById('cart-heading');
  if (heading) heading.textContent = `Your cart (${totalCount} item${totalCount !== 1 ? 's' : ''})`;

  if (items.length === 0) {
    container.innerHTML = `
      <div class="cart-empty">
        <p class="cart-empty-msg">Your cart is empty.</p>
        <a href="all-products.html" class="btn-black" style="display:inline-block;padding:14px 32px;text-decoration:none;border-radius:30px;width:50%;">Continue shopping</a>
      </div>`;
    return;
  }

  const itemsHtml = `
    <div class="cart-items">
      ${items.map(function(item) {
        const lineTotal = (parseFloat(item.product_price) * item.quantity).toFixed(2);
        const imgHtml   = item.product_image
          ? `<img src="${escHtml(item.product_image)}" alt="${escHtml(item.product_name)}" onerror="this.style.display='none'">`
          : `<div class="pcard-img-placeholder" style="width:80px;height:80px;font-size:11px;">No image</div>`;
        return `
          <div class="cart-item" data-id="${item.product_id}">
            <div class="cart-item-img">${imgHtml}</div>
            <div class="cart-item-info">
              <a class="cart-item-name" href="product.html?id=${item.product_id}">${escHtml(item.product_name)}</a>
              <p class="cart-item-price">$${parseFloat(item.product_price).toFixed(2)} each</p>
            </div>
            <div class="qty-control">
              <button class="qty-btn qty-dec" data-id="${item.product_id}" aria-label="Decrease">−</button>
              <span class="qty-val">${item.quantity}</span>
              <button class="qty-btn qty-inc" data-id="${item.product_id}" aria-label="Increase">+</button>
            </div>
            <p class="cart-item-line-total">$${lineTotal}</p>
            <button class="cart-item-remove" data-id="${item.product_id}" aria-label="Remove item">&times;</button>
          </div>`;
      }).join('')}
    </div>`;

  const shippingText     = shipping === 0 ? '<span style="color:green">Free</span>' : `$${shipping.toFixed(2)}`;
  const freeShippingHint = shipping > 0
    ? `<p class="cart-free-shipping-hint">Add $${(SHIPPING_THRESHOLD - subtotal).toFixed(2)} more for free shipping</p>`
    : '';

  const summaryHtml = `
    <div class="cart-summary">
      <p class="cart-summary-title">Order summary</p>
      <div class="cart-summary-row"><span>Subtotal</span><span>$${subtotal.toFixed(2)}</span></div>
      <div class="cart-summary-row"><span>Shipping</span><span>${shippingText}</span></div>
      ${freeShippingHint}
      <div class="cart-summary-divider"></div>
      <div class="cart-summary-row cart-summary-total"><span>Total</span><span>$${total.toFixed(2)}</span></div>
      <button class="btn-black" style="width:100%;margin-top:20px;" onclick="location.href='checkout.html'">Checkout</button>
      <button class="cart-continue-link" id="continue-shopping-btn">Continue shopping</button>
    </div>`;

  container.innerHTML = `<div class="cart-layout">${itemsHtml}${summaryHtml}</div>`;

  const continuBtn = document.getElementById('continue-shopping-btn');
  if (continuBtn) {
    continuBtn.addEventListener('click', function() {
      if (document.referrer && document.referrer !== location.href) {
        history.back();
      } else {
        location.href = 'index.html';
      }
    });
  }

  container.querySelectorAll('.qty-dec').forEach(function(btn) {
    btn.addEventListener('click', function() {
      const id   = parseInt(btn.dataset.id);
      const item = Cart.getItems().find(function(i) { return i.product_id === id; });
      if (item) Cart.updateQty(id, item.quantity - 1);
    });
  });

  container.querySelectorAll('.qty-inc').forEach(function(btn) {
    btn.addEventListener('click', function() {
      const id   = parseInt(btn.dataset.id);
      const item = Cart.getItems().find(function(i) { return i.product_id === id; });
      if (item) Cart.updateQty(id, item.quantity + 1);
    });
  });

  container.querySelectorAll('.cart-item-remove').forEach(function(btn) {
    btn.addEventListener('click', function() {
      Cart.removeItem(parseInt(btn.dataset.id));
    });
  });

}

document.addEventListener('DOMContentLoaded', renderCart);
document.addEventListener('cartUpdated', renderCart);
window.addEventListener('pageshow', function(e) { if (e.persisted) renderCart(); });
