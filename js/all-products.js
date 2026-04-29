const MULTI_WORD_BRANDS = ['Under Armour', 'New Balance', 'The North Face'];

function parseBrand(name) {
  return MULTI_WORD_BRANDS.find(function(b) { return name.startsWith(b); }) || name.split(' ')[0] || 'Brand';
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const state = {
  offset:  0,
  limit:   16,
  loading: false,
  done:    false
};

const productGrid = document.getElementById('product-grid');
const sentinel    = document.getElementById('scroll-sentinel');

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

function buildCard(p) {
  const article = document.createElement('article');
  article.className = 'pcard';

  const imgWrap = document.createElement('div');
  imgWrap.className = 'pcard-img';

  if (p.product_image) {
    const img   = document.createElement('img');
    img.src     = p.product_image;
    img.alt     = p.product_name;
    img.loading = 'lazy';
    img.onerror = function() { imgWrap.innerHTML = '<div class="pcard-img-placeholder">No image</div>'; };
    imgWrap.appendChild(img);
  } else {
    imgWrap.innerHTML = '<div class="pcard-img-placeholder">No image</div>';
  }

  const body = document.createElement('div');
  body.className = 'pcard-body';
  body.innerHTML = `
    <p class="pcard-brand">${escHtml(parseBrand(p.product_name))}</p>
    <p class="pcard-name">${escHtml(p.product_name)}</p>
    <div class="pcard-bottom">
      <span class="pcard-price">$${parseFloat(p.product_price).toFixed(2)}</span>
    </div>`;

  article.append(imgWrap, body);

  body.querySelector('.pcard-bottom').appendChild(makeCartControl(p));

  article.addEventListener('click', function(e) {
    if (!e.target.closest('.add-to-cart-icon, .qty-stepper')) {
      location.href = `product.html?id=${p.product_id}`;
    }
  });

  return article;
}

function showSkeletons(n) {
  Array.from({ length: n }).forEach(function() {
    const s = document.createElement('div');
    s.className = 'skeleton skeleton-card';
    productGrid.appendChild(s);
  });
}

function removeSkeletons() {
  productGrid.querySelectorAll('.skeleton-card').forEach(function(el) { el.remove(); });
}

function loadMore() {
  if (state.loading || state.done) return;
  state.loading = true;
  showSkeletons(state.limit);

  Api.getAllProducts(state.limit, state.offset)
    .then(function(res) {
      removeSkeletons();
      const products = res.data || [];
      products.forEach(function(p) { productGrid.appendChild(buildCard(p)); });
      state.offset += products.length;
      if (products.length < state.limit) state.done = true;
      state.loading = false;
    })
    .catch(function() {
      removeSkeletons();
      state.loading = false;
    });
}

document.addEventListener('DOMContentLoaded', function() {
  loadMore();

  const observer = new IntersectionObserver(function(entries) {
    if (entries[0].isIntersecting) loadMore();
  }, { rootMargin: '200px' });

  observer.observe(sentinel);
});
