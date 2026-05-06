/* ── Sale page — 8 items at 40% off, rotated weekly ── */

const SALE_DISCOUNT = 0.40;

function buildSaleCard(product) {
  const origPrice = parseFloat(product.product_price) || 0;
  const salePrice = origPrice * (1 - SALE_DISCOUNT);
  const brand     = parseBrand(product.product_name);

  const article = document.createElement('article');
  article.className = 'pcard';
  article.dataset.productId = product.product_id;

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

  const saleBadge = document.createElement('span');
  saleBadge.className = 'pcard-badge badge-sale';
  saleBadge.textContent = 'Sale';
  imgWrap.appendChild(saleBadge);

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
  BadgeRegistry.registerSale(products.map(function(p) { return p.product_id; }));
}

document.addEventListener('DOMContentLoaded', function() {
  BadgeRegistry.init();

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

window.addEventListener('pageshow', function(e) {
  if (!e.persisted) return;
  document.querySelectorAll('[data-cart-control]').forEach(function(ctrl) { ctrl.refresh(); });
});
