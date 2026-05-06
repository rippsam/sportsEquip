function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const MULTI_WORD_BRANDS = ['Under Armour', 'New Balance', 'The North Face'];

function parseBrand(name) {
  return MULTI_WORD_BRANDS.find(function(b) { return name.startsWith(b); }) || name.split(' ')[0] || 'Brand';
}

function seededRand(seed) {
  let s = seed;
  return function() {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function pickUnique(arr, count, rand) {
  const pool   = arr.slice();
  const picked = [];
  while (picked.length < count && pool.length > 0) {
    const idx = Math.floor(rand() * pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
}

function makeCartControl(cartProduct) {
  const wrap = document.createElement('div');

  function getQty() {
    const item = Cart.getItems().find(function(i) { return i.product_id === cartProduct.product_id; });
    return item ? item.quantity : 0;
  }

  function showPlus() {
    wrap.innerHTML = '';
    const btn = document.createElement('button');
    btn.className = 'add-to-cart-icon';
    btn.setAttribute('aria-label', 'Add to cart');
    btn.textContent = '+';
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      Cart.addItem(cartProduct);
      showStepper();
    });
    wrap.appendChild(btn);
  }

  function showStepper() {
    const qty = getQty();
    if (qty === 0) { showPlus(); return; }
    wrap.innerHTML = '';
    const stepper = document.createElement('div');
    stepper.className = 'qty-stepper';
    const dec = document.createElement('button');
    dec.className = 'qty-stepper-btn';
    dec.setAttribute('aria-label', 'Decrease');
    dec.textContent = '−';
    const val = document.createElement('span');
    val.className = 'qty-stepper-val';
    val.textContent = qty;
    const inc = document.createElement('button');
    inc.className = 'qty-stepper-btn';
    inc.setAttribute('aria-label', 'Increase');
    inc.textContent = '+';
    inc.disabled = qty >= 10;
    dec.addEventListener('click', function(e) {
      e.stopPropagation();
      if (getQty() <= 1) { Cart.removeItem(cartProduct.product_id); showPlus(); }
      else { Cart.updateQty(cartProduct.product_id, getQty() - 1); val.textContent = getQty(); inc.disabled = false; }
    });
    inc.addEventListener('click', function(e) {
      e.stopPropagation();
      Cart.addItem(cartProduct);
      val.textContent = getQty();
      inc.disabled = getQty() >= 10;
    });
    stepper.append(dec, val, inc);
    wrap.appendChild(stepper);
  }

  wrap.dataset.cartControl = '1';
  wrap.refresh = function() { getQty() > 0 ? showStepper() : showPlus(); };

  getQty() > 0 ? showStepper() : showPlus();
  return wrap;
}
