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
  firstLoad:         true,
  filterCatIds:      [],
  sortKey:           'default',
  deptProducts:      null
};

let slowTimer = null;
let filterBarReady = false;

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

/* ── Product card ── */
function renderProductCard(p) {
  const brand   = parseBrand(p.product_name);
  const price   = `$${(parseFloat(p.product_price) || 0).toFixed(2)}`;
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

  const badge = getProductBadge(p);
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

/* ── Filter helpers ── */
function isFiltered() {
  return state.filterCatIds.length > 0 || state.sortKey !== 'default';
}

function sortProducts(products) {
  const sorted = products.slice();
  if (state.sortKey === 'price-asc') {
    sorted.sort(function(a, b) { return (parseFloat(a.product_price) || 0) - (parseFloat(b.product_price) || 0); });
  } else if (state.sortKey === 'price-desc') {
    sorted.sort(function(a, b) { return (parseFloat(b.product_price) || 0) - (parseFloat(a.product_price) || 0); });
  } else if (state.sortKey === 'name-asc') {
    sorted.sort(function(a, b) { return a.product_name.toLowerCase().localeCompare(b.product_name.toLowerCase()); });
  } else if (state.sortKey === 'name-desc') {
    sorted.sort(function(a, b) { return b.product_name.toLowerCase().localeCompare(a.product_name.toLowerCase()); });
  } else if (state.sortKey === 'on-sale') {
    sorted.sort(function(a, b) { return (getProductBadge(b) === 'sale' ? 1 : 0) - (getProductBadge(a) === 'sale' ? 1 : 0); });
  } else if (state.sortKey === 'new') {
    sorted.sort(function(a, b) { return (getProductBadge(b) === 'new' ? 1 : 0) - (getProductBadge(a) === 'new' ? 1 : 0); });
  }
  return sorted;
}

function getFilteredSorted() {
  let products = state.deptProducts;
  if (state.filterCatIds.length > 0) {
    const idSet = new Set(state.filterCatIds.map(Number));
    products = products.filter(function(p) { return idSet.has(p._catId); });
  }
  return sortProducts(products);
}

/* ── Apply filter/sort ── */
function applyFilter() {
  productGrid.innerHTML = '';
  state.products = [];
  state.hasMore = true;
  state.firstLoad = false;

  if (!isFiltered()) {
    state.samplerOffsets = {};
    initSamplerOffsets(state.visibleCategories);
    loadProducts();
    return;
  }

  if (state.deptProducts !== null) {
    const products = getFilteredSorted();
    if (products.length === 0) {
      productGrid.innerHTML = '<div class="error-state"><strong>No products found</strong>Try a different filter.</div>';
    } else {
      products.forEach(function(p) { productGrid.appendChild(renderProductCard(p)); });
      state.products = products;
    }
    state.hasMore = false;
    updateResultsCount();
    return;
  }

  loadProducts();
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
      notice.textContent = 'Waking up the server… this may take a moment.';
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
  } else if (isFiltered()) {
    if (state.visibleCategories.length === 0) {
      state.loading = false;
      return;
    }
    promise = Promise.allSettled(
      state.visibleCategories.map(function(c) {
        return Api.getProducts(c.category_id, 500, 0)
          .then(function(res) {
            return res.data.map(function(p) {
              return Object.assign({}, p, { _catId: c.category_id });
            });
          });
      })
    ).then(function(results) {
      const seen = new Set();
      state.deptProducts = results
        .filter(function(r) { return r.status === 'fulfilled'; })
        .flatMap(function(r) { return r.value; })
        .filter(function(p) {
          if (seen.has(p.product_id)) return false;
          seen.add(p.product_id);
          return true;
        });
      return getFilteredSorted();
    });
  } else {
    /* Sampler: fetch 1 item from every visible category per batch */
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
      state.hasMore = available.length > 0;
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

    if (isFiltered()) {
      state.hasMore = false;
      updateResultsCount();
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
    a.href      = `category.html?cat=${cat.category_id}&name=${encodeURIComponent(cat.category_name)}`;
    a.textContent = cat.category_name;
    row.appendChild(a);
  });
}

/* ── Featured product (weekly rotation) ── */
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
    const desc   = rawDesc.length > 75 ? `${rawDesc.slice(0, 75)}…` : rawDesc;
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
  state.activeDeptId    = deptId;
  state.filterCatIds    = [];
  state.sortKey         = 'default';
  state.deptProducts    = null;
  if (state.allCategories.length === 0) return;
  state.visibleCategories = deptId
    ? state.allCategories.filter(function(c) { return String(c.category_department_id) === String(deptId); })
    : state.allCategories;
  updateSectionHeader(deptId);
  setActiveCategory(null);

  if (!deptId) return;

  if (!filterBarReady) {
    initFilterBar();
    filterBarReady = true;
  } else {
    resetFilterUI();
  }
}

/* ── New arrivals (4-day rotation) ── */
function initSamplerOffsets(categories) {
  const fourDayNum = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 4));
  categories.forEach(function(cat) {
    const rand = seededRand(fourDayNum * 31 + cat.category_id);
    state.samplerOffsets[cat.category_id] = Math.floor(rand() * 10);
  });
}

/* ── Filter bar ── */
function renderPills() {
  const container = document.getElementById('filter-pills');
  if (!container) return;
  container.innerHTML = '';

  const allPill = document.createElement('button');
  allPill.className = `filter-pill${state.filterCatIds.length === 0 ? ' active' : ''}`;
  allPill.textContent = 'All';
  allPill.addEventListener('click', function() {
    state.filterCatIds = [];
    renderPills();
    updateCatChips();
    updateActiveFiltersBar();
    applyFilter();
  });
  container.appendChild(allPill);

  state.visibleCategories.forEach(function(cat) {
    const pill = document.createElement('button');
    pill.className = `filter-pill${state.filterCatIds.includes(cat.category_id) ? ' active' : ''}`;
    pill.textContent = cat.category_name;
    pill.addEventListener('click', function() {
      const idx = state.filterCatIds.indexOf(cat.category_id);
      if (idx === -1) { state.filterCatIds.push(cat.category_id); }
      else { state.filterCatIds.splice(idx, 1); }
      renderPills();
      updateCatChips();
      updateActiveFiltersBar();
      applyFilter();
    });
    container.appendChild(pill);
  });
}

function updateCatChips() {
  const container = document.getElementById('cat-chips');
  if (!container) return;
  container.innerHTML = '';
  state.filterCatIds.forEach(function(catId) {
    const cat = state.visibleCategories.find(function(c) { return c.category_id === catId; });
    if (!cat) return;
    const chip = document.createElement('span');
    chip.className = 'active-chip';
    const label = document.createElement('span');
    label.textContent = cat.category_name;
    const x = document.createElement('button');
    x.className = 'active-chip-x';
    x.setAttribute('aria-label', `Remove ${cat.category_name} filter`);
    x.textContent = '×';
    x.addEventListener('click', function() {
      state.filterCatIds = state.filterCatIds.filter(function(id) { return id !== catId; });
      renderPills();
      updateCatChips();
      updateActiveFiltersBar();
      applyFilter();
    });
    chip.append(label, x);
    container.appendChild(chip);
  });
}

function updateActiveSortChip() {
  const chip  = document.getElementById('active-sort-chip');
  const label = document.getElementById('active-sort-label');
  if (!chip) return;
  if (state.sortKey === 'default') {
    chip.style.display = 'none';
    return;
  }
  const sortLabels = {
    'price-asc':  'Price: Low to High',
    'price-desc': 'Price: High to Low',
    'name-asc':   'Name: A → Z',
    'name-desc':  'Name: Z → A',
    'on-sale':    'On sale',
    'new':        'New arrivals'
  };
  if (label) label.textContent = sortLabels[state.sortKey] || state.sortKey;
  chip.style.display = 'inline-flex';
}

function updateActiveFiltersBar() {
  const bar = document.getElementById('dept-active-filters');
  if (!bar) return;
  bar.style.display = (state.filterCatIds.length > 0 || state.sortKey !== 'default') ? 'flex' : 'none';
}

function updateResultsCount() {
  const el = document.getElementById('filter-results-count');
  if (!el) return;
  if (!isFiltered() || state.deptProducts === null) { el.textContent = ''; return; }
  const count = getFilteredSorted().length;
  el.textContent = `${count} ${count === 1 ? 'product' : 'products'}`;
}

function resetFilterUI() {
  const sortSelectedText = document.getElementById('sort-selected-text');
  if (sortSelectedText) sortSelectedText.textContent = 'Featured';
  document.getElementById('sort-dropdown')?.querySelectorAll('.sort-option').forEach(function(o) {
    o.classList.toggle('selected', o.dataset.sort === 'default');
  });
  renderPills();
  updateCatChips();
  updateActiveSortChip();
  updateActiveFiltersBar();
  updateResultsCount();
}

function initFilterBar() {
  const wrap = document.getElementById('dept-filter-wrap');
  if (!wrap) return;
  wrap.style.display = 'block';

  renderPills();

  const sortBtn      = document.getElementById('sort-btn');
  const sortDropdown = document.getElementById('sort-dropdown');

  sortBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    const isOpen = sortDropdown.classList.contains('open');
    sortDropdown.classList.toggle('open', !isOpen);
    sortBtn.classList.toggle('open', !isOpen);
  });

  sortDropdown.querySelectorAll('.sort-option').forEach(function(opt) {
    opt.addEventListener('click', function() {
      state.sortKey = opt.dataset.sort;
      sortDropdown.querySelectorAll('.sort-option').forEach(function(o) { o.classList.remove('selected'); });
      opt.classList.add('selected');
      document.getElementById('sort-selected-text').textContent = opt.textContent.trim();
      sortDropdown.classList.remove('open');
      sortBtn.classList.remove('open');
      updateActiveSortChip();
      updateActiveFiltersBar();
      applyFilter();
    });
  });

  document.addEventListener('click', function() {
    sortDropdown.classList.remove('open');
    sortBtn.classList.remove('open');
  });

  document.getElementById('sort-chip-x').addEventListener('click', function() {
    state.sortKey = 'default';
    document.getElementById('sort-selected-text').textContent = 'Featured';
    sortDropdown.querySelectorAll('.sort-option').forEach(function(o) {
      o.classList.toggle('selected', o.dataset.sort === 'default');
    });
    updateActiveSortChip();
    updateActiveFiltersBar();
    applyFilter();
  });

  document.getElementById('clear-all-btn').addEventListener('click', function() {
    state.filterCatIds = [];
    state.sortKey = 'default';
    document.getElementById('sort-selected-text').textContent = 'Featured';
    sortDropdown.querySelectorAll('.sort-option').forEach(function(o) {
      o.classList.toggle('selected', o.dataset.sort === 'default');
    });
    renderPills();
    updateCatChips();
    updateActiveSortChip();
    updateActiveFiltersBar();
    applyFilter();
  });
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
    document.getElementById('dept-hero').style.display = 'block';
    document.getElementById('dept-sale-banner').style.display = 'block';
  }

  showSkeletonCards(8);

  Api.getAllCategories()
    .then(function(res) {
      state.allDepartments = res.departments;
      state.allCategories  = res.categories;

      if (deptParam) {
        const dept = state.allDepartments.find(function(d) { return String(d.department_id) === String(deptParam); });
        const heroTitle = document.getElementById('dept-hero-title');
        if (heroTitle && dept) heroTitle.textContent = dept.department_name;

        state.activeDeptId      = deptParam;
        state.visibleCategories = res.categories.filter(function(c) {
          return String(c.category_department_id) === String(deptParam);
        });

        initFilterBar();
        filterBarReady = true;
      } else {
        state.visibleCategories = res.categories;
      }

      if (deptParam) updateSectionHeader(deptParam);
      renderTopCategories(res.categories);
      loadFeaturedProduct(res.categories);
      initSamplerOffsets(res.categories);
      loadProducts();
    })
    .catch(function(err) {
      console.error('getAllCategories error:', err);
      if (state.visibleCategories.length === 0) {
        productGrid.innerHTML = '<div class="error-state"><strong>Could not load categories</strong>Please refresh the page.</div>';
      }
    });

  document.addEventListener('deptSelected', function(e) { filterByDept(e.detail.deptId); });

  window.addEventListener('pageshow', function(e) {
    if (!e.persisted) return;
    document.querySelectorAll('[data-cart-control]').forEach(function(ctrl) { ctrl.refresh(); });
  });

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
