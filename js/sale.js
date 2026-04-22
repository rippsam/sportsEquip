/* ── Sale page — 10 items at 40% off, rotated weekly ── */

const SALE_DISCOUNT = 0.40;

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function parseBrand(name) {
  const multiWord = ['Under Armour', 'New Balance', 'The North Face'];
  return multiWord.find(function(b) { return name.startsWith(b); }) || name.split(' ')[0] || 'Brand';
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
      <button class="add-to-cart-icon" aria-label="Add to cart">+</button>
    </div>`;

  article.append(imgWrap, body);

  const cartBtn = body.querySelector('.add-to-cart-icon');
  cartBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    Cart.addItem({
      product_id:    product.product_id,
      product_name:  product.product_name,
      product_price: salePrice.toFixed(2),
      product_image: product.product_image
    });
    cartBtn.textContent = '\u2713';
    setTimeout(function() { cartBtn.textContent = '+'; }, 800);
  });

  article.addEventListener('click', function(e) {
    if (!e.target.classList.contains('add-to-cart-icon')) {
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
      const picked     = pickUnique(categories, 9, rand);

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
        .map(function(r) { return r.value; });
      renderSaleProducts(products);
    })
    .catch(function(err) {
      console.error('Sale page error:', err);
      const loading = document.getElementById('sale-loading');
      if (loading) loading.textContent = 'Could not load sale items. Please refresh.';
    });
});
