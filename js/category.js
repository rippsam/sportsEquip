document.addEventListener('DOMContentLoaded', function() {
  const params  = new URLSearchParams(location.search);
  const catId   = params.get('cat');
  const catName = params.get('name') || 'Category';

  if (!catId) {
    location.replace('categories.html');
    return;
  }

  document.getElementById('cat-hero-title').textContent = catName;
  document.title = `${catName} — Sports Equip`;

  const grid     = document.getElementById('cat-product-grid');
  const sentinel = document.getElementById('cat-sentinel');
  let offset  = 0;
  const limit = 16;
  let hasMore = true;
  let loading = false;
  let firstLoad = true;

  /* ── helpers ── */
  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function parseBrand(name) {
    const MULTI = ['Under Armour', 'New Balance', 'The North Face'];
    return MULTI.find(function(b) { return name.startsWith(b); }) || name.split(' ')[0] || 'Brand';
  }

  function showSkeletons(n) {
    grid.innerHTML = '';
    Array.from({ length: n }).forEach(function() {
      const s = document.createElement('div');
      s.className = 'skeleton skeleton-card';
      grid.appendChild(s);
    });
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

  function renderCard(p) {
    const brand = parseBrand(p.product_name);
    const price = `$${parseFloat(p.product_price).toFixed(2)}`;

    const article = document.createElement('article');
    article.className = 'pcard';

    const imgWrap = document.createElement('div');
    imgWrap.className = 'pcard-img';
    if (p.product_image) {
      const img = document.createElement('img');
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
      <p class="pcard-brand">${escHtml(brand)}</p>
      <p class="pcard-name">${escHtml(p.product_name)}</p>
      <div class="pcard-bottom">
        <span class="pcard-price">${escHtml(price)}</span>
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

  /* ── load ── */
  function loadProducts() {
    if (loading || !hasMore) return;
    loading = true;

    Api.getProducts(catId, limit, offset)
      .then(function(res) {
        const products = res.data;

        if (firstLoad) {
          grid.innerHTML = '';
          firstLoad = false;
        }

        if (products.length === 0 && offset === 0) {
          grid.innerHTML = '<div class="error-state"><strong>No products found</strong>This category has no products yet.</div>';
          loading = false;
          return;
        }

        products.forEach(function(p) { grid.appendChild(renderCard(p)); });
        offset += products.length;
        if (products.length < limit) hasMore = false;
        loading = false;
      })
      .catch(function() {
        if (firstLoad) { grid.innerHTML = ''; firstLoad = false; }
        grid.innerHTML += '<div class="error-state"><strong>Could not load products</strong>Check your connection and refresh.</div>';
        loading = false;
      });
  }

  showSkeletons(16);
  loadProducts();

  const observer = new IntersectionObserver(function(entries) {
    if (entries[0].isIntersecting) loadProducts();
  }, { rootMargin: '200px' });
  observer.observe(sentinel);
});
