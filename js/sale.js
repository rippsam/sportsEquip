/* ── Sale page — 8 items at 40% off, rotated weekly ── */

const SALE_DISCOUNT = 0.40;

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function parseBrand(name) {
  const MULTI_WORD_BRANDS = ['Under Armour', 'New Balance', 'The North Face'];
  return MULTI_WORD_BRANDS.find(function(b) { return name.startsWith(b); }) || name.split(' ')[0] || 'Brand';
}

function seededRand(seed) {
  let s = seed;
  return function() {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

/* Pick `count` unique items from an array using the provided rand function */
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
    dec.addEventListener('click', function(e) {
      e.stopPropagation();
      if (getQty() <= 1) { Cart.removeItem(cartProduct.product_id); showPlus(); }
      else { Cart.updateQty(cartProduct.product_id, getQty() - 1); val.textContent = getQty(); }
    });
    inc.addEventListener('click', function(e) {
      e.stopPropagation();
      const added = Cart.addItem(cartProduct);
      if (added) val.textContent = getQty();
    });
    stepper.append(dec, val, inc);
    wrap.appendChild(stepper);
  }

  getQty() > 0 ? showStepper() : showPlus();
  return wrap;
}

function buildSaleCard(product) {
  const origPrice = parseFloat(product.product_price);
  const salePrice = origPrice * (1 - SALE_DISCOUNT);
  const brand     = parseBrand(product.product_name);

  const article = document.createElement('article');
  article.className = 'pcard';

  const imgWrap = document.createElement('div');
  imgWrap.className = 'pcard-img';

  if (product.product_image) {
    const img   = document.createElement('img');
    img.src     = product.product_image;
    img.alt     = product.product_name;
    img.loading = 'lazy';
    img.onerror = function() { imgWrap.innerHTML = '<div class="pcard-img-placeholder">No image</div>'; };
    imgWrap.appendChild(img);
  } else {
    imgWrap.innerHTML = '<div class="pcard-img-placeholder">No image</div>';
  }

  const body = document.createElement('div');
  body.className = 'pcard-body';
  body.innerHTML = `
    <p class="pcard-brand">${escHtml(brand)}</p>
    <p class="pcard-name">${escHtml(product.product_name)}</p>
    <div class="pcard-bottom">
      <div>
        <span class="pcard-price" style="color:var(--red-sale)">$${salePrice.toFixed(2)}</span>
        <span class="pcard-orig">$${origPrice.toFixed(2)}</span>
        <span class="badge badge-sale">-40%</span>
      </div>
    </div>`;

  article.append(imgWrap, body);

  body.querySelector('.pcard-bottom').appendChild(makeCartControl({
    product_id:    product.product_id,
    product_name:  product.product_name,
    product_price: salePrice.toFixed(2),
    product_image: product.product_image
  }));

  article.addEventListener('click', function(e) {
    if (!e.target.closest('.add-to-cart-icon, .qty-stepper')) {
      location.href = `product.html?id=${product.product_id}`;
    }
  });

  return article;
}

function renderSaleProducts(products) {
  const grid    = document.getElementById('sale-grid');
  const loading = document.getElementById('sale-loading');

  if (loading) loading.remove();

  if (!products.length) {
    grid.innerHTML = '<p style="color:var(--gray-muted);text-align:center;grid-column:1/-1;padding:40px 0;">No sale items available right now. Check back soon.</p>';
    return;
  }

  products.forEach(function(p) { grid.appendChild(buildSaleCard(p)); });
}

document.addEventListener('DOMContentLoaded', function() {
  const weekNum = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 7));
  const rand    = seededRand(weekNum * 31 + 11); /* different seed from featured product */
  const offset  = (weekNum % 8) + 1;             /* rotate 1–8 within each category */

  Api.getAllCategories()
    .then(function(res) {
      const categories = res.categories;
      /* Pick extra categories as a buffer to guarantee 8 after filtering empty ones */
      const picked = pickUnique(categories, Math.min(categories.length, 14), rand);

      return Promise.allSettled(
        picked.map(function(cat) {
          return Api.getProducts(cat.category_id, 1, offset)
            .then(function(res) {
              /* fall back to offset 0 if the category doesn't have enough products */
              if (res.data.length) return res.data[0];
              return Api.getProducts(cat.category_id, 1, 0).then(function(r) { return r.data[0] || null; });
            })
            .catch(function() { return null; });
        })
      );
    })
    .then(function(results) {
      const products = results
        .filter(function(r) { return r.status === 'fulfilled' && r.value; })
        .map(function(r) { return r.value; })
        .slice(0, 8);
      renderSaleProducts(products);
    })
    .catch(function(err) {
      console.error('Sale page error:', err);
      const loading = document.getElementById('sale-loading');
      if (loading) loading.textContent = 'Could not load sale items. Please refresh.';
    });
});
