const MULTI_WORD_BRANDS = ['Under Armour', 'New Balance', 'The North Face'];

function parseBrand(name) {
  return MULTI_WORD_BRANDS.find(function(b) { return name.startsWith(b); }) || name.split(' ')[0] || 'Brand';
}

/* ── State ── */
const state = {
  allCategories:     [],
  allDepartments:    [],
  visibleCategories: [],
  activeCategoryId:  null,
  activeDeptId:      null,
  samplerOffsets:    {},
  products:          [],
  offset:            0,
  limit:             8,
  hasMore:           true,
  loading:           false,
  firstLoad:         true
};

let slowTimer = null;

/* ── DOM refs ── */
const productGrid   = document.getElementById('product-grid');
const allProductsBtn = document.getElementById('btn-all-products');

/* ── Skeletons ── */
function showSkeletonCards(n) {
  productGrid.innerHTML = '';
  Array.from({ length: n }).forEach(function() {
    const s = document.createElement('div');
    s.className = 'skeleton skeleton-card';
    productGrid.appendChild(s);
  });
}

function setActiveCategory(catId) {
  state.activeCategoryId = catId;
  state.products         = [];
  state.offset           = 0;
  state.samplerOffsets   = {};
  state.hasMore          = true;
  productGrid.innerHTML  = '';
  loadProducts();
}

/* ── Helpers ── */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ── Product card ── */
function renderProductCard(p) {
  const brand   = parseBrand(p.product_name);
  const price   = `$${parseFloat(p.product_price).toFixed(2)}`;
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
    <p class="pcard-brand">${escHtml(brand)}</p>
    <p class="pcard-name">${escHtml(p.product_name)}</p>
    <div class="pcard-bottom">
      <span class="pcard-price">${escHtml(price)}</span>
      <button class="add-to-cart-icon" aria-label="Add to cart">+</button>
    </div>`;

  article.append(imgWrap, body);

  const cartBtn = body.querySelector('.add-to-cart-icon');
  cartBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    Cart.addItem(p);
    cartBtn.textContent = '\u2713';
    setTimeout(function() { cartBtn.textContent = '+'; }, 800);
  });

  article.addEventListener('click', function(e) {
    if (!e.target.classList.contains('add-to-cart-icon')) {
      location.href = `product.html?id=${p.product_id}`;
    }
  });

  return article;
}

/* ── Error state ── */
function showProductError() {
  const errDiv = document.createElement('div');
  errDiv.className = 'error-state';
  errDiv.innerHTML = `<strong>Could not load products</strong>There was a problem reaching the server. Check your connection and try again.<br><button class="error-retry">Retry</button>`;
  errDiv.querySelector('.error-retry').addEventListener('click', function() {
    productGrid.innerHTML = '';
    state.products = [];
    state.offset   = 0;
    state.hasMore  = true;
    loadProducts();
  });
  productGrid.appendChild(errDiv);
}

/* ── Load products ── */
function loadProducts() {
  if (state.loading || !state.hasMore) return;
  state.loading = true;

  if (state.firstLoad) {
    slowTimer = setTimeout(function() {
      const notice = document.createElement('div');
      notice.className   = 'slow-notice';
      notice.id          = 'slow-notice';
      notice.textContent = 'Waking up the server\u2026 this may take a moment.';
      productGrid.appendChild(notice);
    }, 5000);
  }

  function clearSlowNotice() {
    clearTimeout(slowTimer);
    document.getElementById('slow-notice')?.remove();
  }

  let promise;
  if (state.activeCategoryId !== null) {
    promise = Api.getProducts(state.activeCategoryId, state.limit, state.offset)
      .then(function(res) { return res.data; });
  } else {
    /* Fetch 1 item from every visible category so any empty/sparse categories
       don't prevent filling a full batch of 8 */
    if (state.visibleCategories.length === 0) {
      state.loading = false;
      return;
    }
    promise = Promise.allSettled(
      state.visibleCategories.map(function(c) {
        const off = state.samplerOffsets[c.category_id] || 0;
        return Api.getProducts(c.category_id, 1, off)
          .then(function(res) {
            return res.data.length ? { cat: c, item: res.data[0] } : null;
          });
      })
    ).then(function(results) {
      const available = results
        .filter(function(r) { return r.status === 'fulfilled' && r.value; })
        .map(function(r) { return r.value; });
      const batch = available.slice(0, state.limit);
      batch.forEach(function(v) {
        state.samplerOffsets[v.cat.category_id] = (state.samplerOffsets[v.cat.category_id] || 0) + 1;
      });
      state.hasMore = available.length >= state.limit;
      return batch.map(function(v) { return v.item; });
    });
  }

  promise.then(function(products) {
    clearSlowNotice();

    if (state.firstLoad) {
      productGrid.innerHTML = '';
      state.firstLoad = false;
    }

    if (products.length === 0 && state.products.length === 0) {
      productGrid.innerHTML = '<div class="error-state"><strong>No products found</strong>Try selecting a different category.</div>';
      state.loading = false;
      return;
    }

    products.forEach(function(p) { productGrid.appendChild(renderProductCard(p)); });
    state.products = state.products.concat(products);

    if (state.activeCategoryId !== null) {
      state.offset += products.length;
      if (products.length < state.limit) state.hasMore = false;
    }

    if (allProductsBtn && !state.activeDeptId && !state.activeCategoryId) {
      allProductsBtn.style.display = 'inline-block';
    }
    state.loading = false;

    /* If sentinel is still in view after loading (short page), keep going */
    if (state.hasMore && (state.activeDeptId || state.activeCategoryId)) {
      setTimeout(function() {
        const s = document.getElementById('scroll-sentinel');
        if (s && s.getBoundingClientRect().top < window.innerHeight + 200) loadProducts();
      }, 0);
    }
  }).catch(function(err) {
    console.error('loadProducts error:', err);
    clearSlowNotice();
    if (state.firstLoad) productGrid.innerHTML = '';
    state.firstLoad = false;
    showProductError();
    state.loading = false;
  });
}

/* ── Top categories (monthly rotation) ── */
function pickUnique(arr, count, rand) {
  const pool   = arr.slice();
  const picked = [];
  while (picked.length < count && pool.length > 0) {
    const idx = Math.floor(rand() * pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
}

function renderTopCategories(categories) {
  const row = document.getElementById('top-categories-row');
  if (!row) return;
  const now       = new Date();
  const monthSeed = now.getFullYear() * 12 + now.getMonth();
  const rand      = seededRand(monthSeed * 37 + 17);
  const picked    = pickUnique(categories, Math.min(8, categories.length), rand);
  picked.forEach(function(cat) {
    const a     = document.createElement('a');
    a.className = 'brand-chip';
    a.href      = `index.html?dept=${cat.category_department_id}`;
    a.textContent = cat.category_name;
    row.appendChild(a);
  });
}

/* ── Featured product (weekly rotation) ── */
function seededRand(seed) {
  let s = seed;
  return function() {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function loadFeaturedProduct(categories) {
  const weekNum = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 7));
  const rand    = seededRand(weekNum * 17 + 3);
  const cat     = categories[Math.floor(rand() * categories.length)];
  const offset  = Math.floor(rand() * 6);

  function renderFeatured(product) {
    const card = document.getElementById('promo-featured');
    if (!card || !product) return;
    const brand  = parseBrand(product.product_name);
    const model  = product.product_name.slice(brand.length).trim().split(' ').slice(0, 3).join(' ');
    const rawDesc = product.product_description ?? '';
    const desc   = rawDesc.length > 75 ? `${rawDesc.slice(0, 75)}\u2026` : rawDesc;
    card.innerHTML = `
      <p class="split-eyebrow">Just dropped</p>
      <h3 class="split-title">${escHtml(brand)}<br>${escHtml(model)}</h3>
      <p class="split-desc">${escHtml(desc)}</p>
      <a href="product.html?id=${product.product_id}" class="split-link">Shop the drop &rarr;</a>`;
  }

  Api.getProducts(cat.category_id, 1, offset)
    .then(function(res) {
      const item = res.data.length ? res.data[0] : null;
      if (item) return Api.getProduct(item.product_id).then(function(r) { return r.data; });
      return Api.getProducts(cat.category_id, 1, 0)
        .then(function(res2) {
          return res2.data.length ? Api.getProduct(res2.data[0].product_id).then(function(r) { return r.data; }) : null;
        });
    })
    .then(function(product) { renderFeatured(product); })
    .catch(function() {}); /* keep static fallback on error */
}

/* ── Section header ── */
function updateSectionHeader(deptId) {
  const eyebrow = document.getElementById('products-eyebrow');
  const title   = document.getElementById('products-title');
  if (!title) return;
  if (!deptId) {
    if (eyebrow) eyebrow.textContent = 'Featured';
    title.textContent = 'New arrivals';
    return;
  }
  const dept = state.allDepartments.find(function(d) { return String(d.department_id) === String(deptId); });
  if (eyebrow) eyebrow.textContent = dept ? dept.department_name : 'Featured';
  title.textContent = dept ? `${dept.department_name} products` : 'New arrivals';
}

/* ── Dept filter ── */
function filterByDept(deptId) {
  state.activeDeptId = deptId;
  if (state.allCategories.length === 0) return;
  state.visibleCategories = deptId
    ? state.allCategories.filter(function(c) { return String(c.category_department_id) === String(deptId); })
    : state.allCategories;
  updateSectionHeader(deptId);
  setActiveCategory(null);
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', function() {
  const deptParam = new URLSearchParams(location.search).get('dept');

  if (deptParam) {
    const titleEl   = document.getElementById('products-title');
    const eyebrowEl = document.getElementById('products-eyebrow');
    if (titleEl) titleEl.textContent = '';
    if (eyebrowEl) eyebrowEl.textContent = '';
    ['promo-section', 'top-categories-section'].forEach(function(id) {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    document.querySelector('.hero')?.style.setProperty('display', 'none');
    document.querySelector('.trust')?.style.setProperty('display', 'none');
  }

  showSkeletonCards(8);

  Api.getAllCategories()
    .then(function(res) {
      state.allDepartments = res.departments;
      state.allCategories  = res.categories;

      if (deptParam) {
        state.activeDeptId      = deptParam;
        state.visibleCategories = res.categories.filter(function(c) {
          return String(c.category_department_id) === String(deptParam);
        });
      } else {
        state.visibleCategories = res.categories;
      }

      if (deptParam) updateSectionHeader(deptParam);
      renderTopCategories(res.categories);
      loadFeaturedProduct(res.categories);
      loadProducts();
    })
    .catch(function(err) {
      console.error('getAllCategories error:', err);
      if (state.visibleCategories.length === 0) {
        productGrid.innerHTML = '<div class="error-state"><strong>Could not load categories</strong>Please refresh the page.</div>';
      }
    });

  document.addEventListener('deptSelected', function(e) { filterByDept(e.detail.deptId); });

  const sentinel = document.getElementById('scroll-sentinel');
  if (sentinel) {
    const observer = new IntersectionObserver(function(entries) {
      if (entries[0].isIntersecting && (state.activeDeptId || state.activeCategoryId)) {
        loadProducts();
      }
    }, { rootMargin: '200px' });
    observer.observe(sentinel);
  }
});
