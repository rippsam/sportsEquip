document.addEventListener('DOMContentLoaded', function() {
  BadgeRegistry.init();

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

  function showSkeletons(n) {
    grid.innerHTML = '';
    Array.from({ length: n }).forEach(function() {
      const s = document.createElement('div');
      s.className = 'skeleton skeleton-card';
      grid.appendChild(s);
    });
  }

  function renderCard(p) {
    const brand = parseBrand(p.product_name);
    const price = `$${(parseFloat(p.product_price) || 0).toFixed(2)}`;

    const article = document.createElement('article');
    article.className = 'pcard';
    article.dataset.productId = p.product_id;

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

    const badge = BadgeRegistry.getBadge(p.product_id);
    if (badge) {
      const b = document.createElement('span');
      b.className = `pcard-badge badge-${badge}`;
      b.textContent = badge === 'sale' ? 'Sale' : 'New';
      imgWrap.appendChild(b);
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

window.addEventListener('pageshow', function(e) {
  if (!e.persisted) return;
  document.querySelectorAll('[data-cart-control]').forEach(function(ctrl) { ctrl.refresh(); });
});
