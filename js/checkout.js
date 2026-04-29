const SHIPPING_THRESHOLD = 75;
const SHIPPING_COST      = 8.99;

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderOrderSummary() {
  const items = Cart.getItems();
  if (items.length === 0) {
    location.replace('cart.html');
    return;
  }

  const subtotal = Cart.getSubtotal();
  const shipping = subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  const total    = subtotal + shipping;

  const container = document.getElementById('checkout-items');
  items.forEach(function(item) {
    const lineTotal = (parseFloat(item.product_price) * item.quantity).toFixed(2);
    const imgContent = item.product_image
      ? `<img src="${escHtml(item.product_image)}" alt="${escHtml(item.product_name)}">`
      : `<svg width="28" height="28" viewBox="0 0 28 28" fill="none" style="opacity:0.25"><rect x="1" y="4" width="26" height="20" rx="2" stroke="#111" stroke-width="1.5"/><circle cx="8" cy="11" r="3" stroke="#111" stroke-width="1.5"/><path d="M1 22l7-7 5 5 4-4 7 7" stroke="#111" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

    const row = document.createElement('div');
    row.className = 'checkout-summary-item';
    row.innerHTML = `
      <div class="checkout-item-img">
        ${imgContent}
        <span class="checkout-item-badge">${item.quantity}</span>
      </div>
      <span class="checkout-item-name">${escHtml(item.product_name)}</span>
      <span class="checkout-item-price">$${lineTotal}</span>`;
    container.appendChild(row);
  });

  document.getElementById('summary-subtotal').textContent = `$${subtotal.toFixed(2)}`;
  document.getElementById('summary-shipping').innerHTML = shipping === 0
    ? '<span class="free">Free</span>'
    : `<span class="val">$${shipping.toFixed(2)}</span>`;
  document.getElementById('summary-total').textContent = `$${total.toFixed(2)}`;
}

function validate() {
  const name   = document.getElementById('f-name').value.trim();
  const street = document.getElementById('f-street').value.trim();
  const city   = document.getElementById('f-city').value.trim();
  const state  = document.getElementById('f-state').value;
  const zip    = document.getElementById('f-zip').value.trim();
  const btn    = document.getElementById('place-order-btn');
  const filled = name && street && city && state && zip.length === 5;
  btn.classList.toggle('enabled', filled);
  btn.classList.toggle('disabled', !filled);
  btn.disabled = !filled;
}

document.addEventListener('DOMContentLoaded', function() {
  renderOrderSummary();

  document.getElementById('back-btn').addEventListener('click', function() {
    history.back();
  });

  ['f-name', 'f-street', 'f-city'].forEach(function(id) {
    document.getElementById(id).addEventListener('input', validate);
  });

  document.getElementById('f-zip').addEventListener('input', function() {
    this.value = this.value.replace(/[^0-9]/g, '');
    validate();
  });

  document.getElementById('f-state').addEventListener('change', validate);

  document.getElementById('signin-btn').addEventListener('click', function() {
    alert('You must sign in');
  });

  document.getElementById('place-order-btn').addEventListener('click', function() {
    if (this.disabled) return;
    alert('Thank you for your order!');
    Cart.clear();
    location.href = 'index.html';
  });
});
