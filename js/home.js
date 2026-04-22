/* ── Known brands for parsing ── */
const KNOWN_BRANDS = [
  'Nike', 'Adidas', 'Under', 'New', 'The', 'Garmin', 'Wilson', 'Callaway',
  'Patagonia', 'Brooks', 'Puma', 'Reebok', 'Asics', 'Mizuno', 'Salomon',
  'Columbia', 'Titleist', 'TaylorMade', 'Ping', 'Rawlings', 'Easton',
  'Bauer', 'CCM', 'Warrior', 'Saucony', 'Hoka', 'On', 'Yonex', 'Head',
  'Babolat', 'Prince', 'Dunlop', 'Penn', 'Spalding', 'Molten', 'Baden'
];

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
const productGrid = document.getElementById('product-grid');
const loadMoreBtn = document.getElementById('btn-load-more');

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

/* ── Load More button states ── */
function setLoadMoreState(s) {
  if (!loadMoreBtn) return;
  const states = {
    loading: ['Loading\u2026',    true],
    ready:   ['Load more',        false],
    done:    ['All items loaded', true],
    error:   ['Retry',            false]
  };
  const entry = states[s];
  if (entry) { loadMoreBtn.textContent = entry[0]; loadMoreBtn.disabled = entry[1]; }
}

/* ── Error state ── */
function showProductError() {
  const errDiv = document.createElement('div');
  errDiv.className = 'error-state';
  errDiv.innerHTML =
    '<strong>Could not load products</strong>' +
    'There was a problem reaching the server. Check your connection and try again.' +
    '<br><button class="error-retry">Retry</button>';
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
  setLoadMoreState('loading');

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
    const cats = state.visibleCategories.slice(0, 4);
    if (cats.length === 0) {
      state.loading = false;
      setLoadMoreState('done');
      return;
    }
    const perCat = Math.max(2, Math.ceil(state.limit / cats.length));
    promise = Promise.allSettled(
      cats.map(function(c) {
        const off = state.samplerOffsets[c.category_id] || 0;
        return Api.getProducts(c.category_id, perCat, off).then(function(res) {
          state.samplerOffsets[c.category_id] = off + res.data.length;
          return res.data;
        });
      })
    ).then(function(results) {
      const fulfilled = results
        .filter(function(r) { return r.status === 'fulfilled'; })
        .map(function(r) { return r.value; });
      if (!fulfilled.some(function(v) { return v.length >= perCat; })) state.hasMore = false;
      return fulfilled.flat();
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
      setLoadMoreState('done');
      state.loading = false;
      return;
    }

    products.forEach(function(p) { productGrid.appendChild(renderProductCard(p)); });
    state.products = state.products.concat(products);

    if (state.activeCategoryId !== null) {
      state.offset += products.length;
      if (products.length < state.limit) state.hasMore = false;
    }

    setLoadMoreState(state.hasMore ? 'ready' : 'done');
    state.loading = false;
  }).catch(function(err) {
    console.error('loadProducts error:', err);
    clearSlowNotice();
    if (state.firstLoad) productGrid.innerHTML = '';
    state.firstLoad = false;
    showProductError();
    setLoadMoreState('error');
    state.loading = false;
  });
}

/* ── Dept filter ── */
function filterByDept(deptId) {
  state.activeDeptId = deptId;
  if (state.allCategories.length === 0) return;
  state.visibleCategories = deptId
    ? state.allCategories.filter(function(c) { return String(c.category_department_id) === String(deptId); })
    : state.allCategories;
  setActiveCategory(null);
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', function() {
  const deptParam = new URLSearchParams(location.search).get('dept');

  showSkeletonCards(8);
  setLoadMoreState('loading');

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

      loadProducts();
    })
    .catch(function(err) {
      console.error('getAllCategories error:', err);
      if (state.visibleCategories.length === 0) {
        productGrid.innerHTML = '<div class="error-state"><strong>Could not load categories</strong>Please refresh the page.</div>';
        setLoadMoreState('done');
      }
    });

  document.addEventListener('deptSelected', function(e) { filterByDept(e.detail.deptId); });

  loadMoreBtn?.addEventListener('click', function() {
    if (!state.loading && state.hasMore) loadProducts();
  });
});
