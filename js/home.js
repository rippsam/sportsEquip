/* ── Known brands for parsing ── */
var KNOWN_BRANDS = [
  'Nike', 'Adidas', 'Under', 'New', 'The', 'Garmin', 'Wilson', 'Callaway',
  'Patagonia', 'Brooks', 'Puma', 'Reebok', 'Asics', 'Mizuno', 'Salomon',
  'Columbia', 'Titleist', 'TaylorMade', 'Ping', 'Rawlings', 'Easton',
  'Bauer', 'CCM', 'Warrior', 'Saucony', 'Hoka', 'On', 'Yonex', 'Head',
  'Babolat', 'Prince', 'Dunlop', 'Penn', 'Spalding', 'Molten', 'Baden'
];

/* Multi-word brand prefixes */
var MULTI_WORD_BRANDS = ['Under Armour', 'New Balance', 'The North Face'];

function parseBrand(name) {
  for (var i = 0; i < MULTI_WORD_BRANDS.length; i++) {
    if (name.indexOf(MULTI_WORD_BRANDS[i]) === 0) return MULTI_WORD_BRANDS[i];
  }
  var first = name.split(' ')[0];
  return first || 'Brand';
}

/* ── State ── */
var state = {
  allCategories:     [],
  allDepartments:    [],
  visibleCategories: [],
  activeCategoryId:  null,
  activeDeptId:      null,
  samplerOffsets:    {},   /* { catId: offset } for "All" sampler mode */
  products:          [],
  offset:            0,
  limit:             8,
  hasMore:           true,
  loading:           false,
  firstLoad:         true
};

var slowTimer = null;

/* ── DOM refs ── */
var productGrid = document.getElementById('product-grid');
var loadMoreBtn = document.getElementById('btn-load-more');

/* ── Skeletons ── */
function showSkeletonCards(n) {
  productGrid.innerHTML = '';
  for (var i = 0; i < n; i++) {
    var s = document.createElement('div');
    s.className = 'skeleton skeleton-card';
    productGrid.appendChild(s);
  }
}

function setActiveCategory(catId) {
  state.activeCategoryId = catId;
  state.products   = [];
  state.offset     = 0;
  state.samplerOffsets = {};
  state.hasMore    = true;
  productGrid.innerHTML = '';
  loadProducts();
}

/* ── Product card ── */
function renderProductCard(p) {
  var brand = parseBrand(p.product_name);
  var price = '$' + parseFloat(p.product_price).toFixed(2);

  var article = document.createElement('article');
  article.className = 'pcard';

  var imgWrap = document.createElement('div');
  imgWrap.className = 'pcard-img';

  if (p.product_image) {
    var img = document.createElement('img');
    img.src = p.product_image;
    img.alt = p.product_name;
    img.loading = 'lazy';
    img.onerror = function() {
      imgWrap.innerHTML = '<div class="pcard-img-placeholder">No image</div>';
    };
    imgWrap.appendChild(img);
  } else {
    imgWrap.innerHTML = '<div class="pcard-img-placeholder">No image</div>';
  }

  var body = document.createElement('div');
  body.className = 'pcard-body';
  body.innerHTML =
    '<p class="pcard-brand">' + escHtml(brand) + '</p>' +
    '<p class="pcard-name">'  + escHtml(p.product_name) + '</p>' +
    '<div class="pcard-bottom">' +
      '<span class="pcard-price">' + escHtml(price) + '</span>' +
      '<button class="add-to-cart-icon" aria-label="Add to cart">+</button>' +
    '</div>';

  article.appendChild(imgWrap);
  article.appendChild(body);

  article.addEventListener('click', function(e) {
    if (e.target.classList.contains('add-to-cart-icon')) return;
    location.href = 'product.html?id=' + p.product_id;
  });

  return article;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ── Load More button states ── */
function setLoadMoreState(s) {
  if (!loadMoreBtn) return;
  if (s === 'loading') { loadMoreBtn.textContent = 'Loading\u2026'; loadMoreBtn.disabled = true; }
  if (s === 'ready')   { loadMoreBtn.textContent = 'Load more';     loadMoreBtn.disabled = false; }
  if (s === 'done')    { loadMoreBtn.textContent = 'All items loaded'; loadMoreBtn.disabled = true; }
  if (s === 'error')   { loadMoreBtn.textContent = 'Retry';          loadMoreBtn.disabled = false; }
}

/* ── Error state ── */
function showProductError() {
  var errDiv = document.createElement('div');
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

  /* Start slow-API notice after 5 seconds on first load */
  if (state.firstLoad) {
    slowTimer = setTimeout(function() {
      var notice = document.createElement('div');
      notice.className = 'slow-notice';
      notice.id = 'slow-notice';
      notice.textContent = 'Waking up the server\u2026 this may take a moment.';
      productGrid.appendChild(notice);
    }, 5000);
  }

  var promise;
  if (state.activeCategoryId !== null) {
    promise = Api.getProducts(state.activeCategoryId, state.limit, state.offset)
      .then(function(res) {
        return res.data;
      });
  } else {
    /* Sampler: pick up to 4 categories, fetch 2 each */
    var cats = state.visibleCategories.slice(0, 4);
    if (cats.length === 0) {
      state.loading = false;
      setLoadMoreState('done');
      return;
    }
    var perCat = Math.max(2, Math.ceil(state.limit / cats.length));
    promise = Promise.allSettled(
      cats.map(function(c) {
        var off = state.samplerOffsets[c.category_id] || 0;
        return Api.getProducts(c.category_id, perCat, off).then(function(res) {
          state.samplerOffsets[c.category_id] = off + res.data.length;
          return res.data;
        });
      })
    ).then(function(results) {
      var merged = [];
      var anyMore = false;
      results.forEach(function(r, i) {
        if (r.status === 'fulfilled') {
          merged = merged.concat(r.value);
          if (r.value.length >= perCat) anyMore = true;
        }
      });
      /* flag if we actually got a full page worth */
      if (!anyMore) state.hasMore = false;
      return merged;
    });
  }

  promise.then(function(products) {
    /* Clear slow notice */
    clearTimeout(slowTimer);
    var notice = document.getElementById('slow-notice');
    if (notice) notice.remove();

    if (state.firstLoad) {
      /* Clear skeleton cards */
      productGrid.innerHTML = '';
      state.firstLoad = false;
    }

    if (products.length === 0 && state.products.length === 0) {
      productGrid.innerHTML = '<div class="error-state"><strong>No products found</strong>Try selecting a different category.</div>';
      setLoadMoreState('done');
      state.loading = false;
      return;
    }

    products.forEach(function(p) {
      productGrid.appendChild(renderProductCard(p));
    });

    state.products = state.products.concat(products);

    if (state.activeCategoryId !== null) {
      state.offset += products.length;
      if (products.length < state.limit) state.hasMore = false;
    }

    setLoadMoreState(state.hasMore ? 'ready' : 'done');
    state.loading = false;
  }).catch(function(err) {
    console.error('loadProducts error:', err);
    clearTimeout(slowTimer);
    var notice = document.getElementById('slow-notice');
    if (notice) notice.remove();

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
  /* If categories haven't loaded yet, just store the dept id.
     getAllCategories().then() will apply the filter when it resolves. */
  if (state.allCategories.length === 0) return;

  if (deptId) {
    state.visibleCategories = state.allCategories.filter(function(c) {
      return String(c.category_department_id) === String(deptId);
    });
  } else {
    state.visibleCategories = state.allCategories;
  }
  setActiveCategory(null);
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', function() {
  var params     = new URLSearchParams(location.search);
  var deptParam  = params.get('dept');

  showSkeletonCards(8);
  setLoadMoreState('loading');

  Api.getAllCategories().then(function(res) {
    state.allDepartments = res.departments;
    state.allCategories  = res.categories;

    if (deptParam) {
      state.activeDeptId = deptParam;
      state.visibleCategories = state.allCategories.filter(function(c) {
        return String(c.category_department_id) === String(deptParam);
      });
    } else {
      state.visibleCategories = state.allCategories;
    }

    loadProducts();
  }).catch(function(err) {
    console.error('getAllCategories error:', err);
    if (state.visibleCategories.length === 0) {
      productGrid.innerHTML = '<div class="error-state"><strong>Could not load categories</strong>Please refresh the page.</div>';
      setLoadMoreState('done');
    }
  });

  /* Listen for dept nav selection (fired by nav.js) */
  document.addEventListener('deptSelected', function(e) {
    filterByDept(e.detail.deptId);
  });

  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', function() {
      if (!state.loading && state.hasMore) loadProducts();
    });
  }
});
