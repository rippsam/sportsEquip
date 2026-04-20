/* ── Known brands for parsing ── */
var KNOWN_BRANDS = [
  'Nike', 'Adidas', 'Under Armour', 'New Balance', 'The North Face', 'Garmin',
  'Wilson', 'Callaway', 'Patagonia', 'Brooks', 'Puma', 'Reebok', 'Asics',
  'Mizuno', 'Salomon', 'Columbia', 'Titleist', 'TaylorMade', 'Ping',
  'Rawlings', 'Easton', 'Bauer', 'CCM', 'Warrior', 'Saucony', 'Hoka',
  'Yonex', 'Head', 'Babolat', 'Prince'
];
var MULTI_WORD_BRANDS = ['Under Armour', 'New Balance', 'The North Face'];

function parseBrand(name) {
  for (var i = 0; i < MULTI_WORD_BRANDS.length; i++) {
    if (name.indexOf(MULTI_WORD_BRANDS[i]) === 0) return MULTI_WORD_BRANDS[i];
  }
  return name.split(' ')[0] || 'Brand';
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ── Skeleton ── */
function showGallerySkeleton() {
  var gallery = document.getElementById('pdp-gallery');
  gallery.innerHTML =
    '<div class="pdp-main-img skeleton" style="max-width:340px;height:300px;width:100%;background:none;"></div>' +
    '<div style="display:flex;gap:10px;margin-top:16px;">' +
      '<div class="skeleton" style="width:60px;height:60px;border-radius:8px;"></div>' +
      '<div class="skeleton" style="width:60px;height:60px;border-radius:8px;"></div>' +
      '<div class="skeleton" style="width:60px;height:60px;border-radius:8px;"></div>' +
    '</div>';
}

function showInfoSkeleton() {
  var info = document.getElementById('pdp-info');
  info.innerHTML =
    '<div class="skeleton skeleton-line short" style="width:80px;height:12px;margin-bottom:12px;"></div>' +
    '<div class="skeleton skeleton-line" style="width:90%;height:28px;margin-bottom:8px;"></div>' +
    '<div class="skeleton skeleton-line short" style="width:60%;height:14px;margin-bottom:20px;"></div>' +
    '<div class="skeleton skeleton-line short" style="width:40%;height:28px;margin-bottom:16px;"></div>' +
    '<div class="skeleton" style="height:48px;border-radius:30px;margin-bottom:10px;"></div>' +
    '<div class="skeleton" style="height:48px;border-radius:30px;"></div>';
}

/* ── Render product ── */
function renderProduct(product, categoryName) {
  var brand = parseBrand(product.product_name);
  var price = '$' + parseFloat(product.product_price).toFixed(2);

  /* Update page title */
  document.title = product.product_name + ' \u2014 Sports Equip';

  /* Breadcrumb */
  var bc = document.getElementById('pdp-breadcrumb');
  var catPart = categoryName ? ('<a href="index.html">\u2190 Back</a> / ' + escHtml(categoryName) + ' / ') : '<a href="index.html">\u2190 Back</a> / ';
  bc.innerHTML = catPart + escHtml(product.product_name);

  /* Gallery */
  var gallery = document.getElementById('pdp-gallery');
  var imgHtml = '';
  if (product.product_image) {
    imgHtml = '<img id="pdp-main-img-el" src="' + escHtml(product.product_image) + '" alt="' + escHtml(product.product_name) + '" onerror="this.style.display=\'none\'">';
  }
  gallery.innerHTML =
    '<div class="pdp-main-img">' + imgHtml + '</div>' +
    '<div class="pdp-thumbs">' +
      '<div class="pdp-thumb active">' +
        (product.product_image ? '<img src="' + escHtml(product.product_image) + '" alt="' + escHtml(product.product_name) + '" onerror="this.style.display=\'none\'">' : '') +
      '</div>' +
    '</div>';

  /* Info panel */
  var info = document.getElementById('pdp-info');
  info.innerHTML =
    '<p class="pdp-brand">' + escHtml(brand) + '</p>' +
    '<h1 class="pdp-name">' + escHtml(product.product_name) + '</h1>' +
    '<p class="pdp-subtitle">' + escHtml(categoryName || 'Sports Equipment') + '</p>' +
    '<div class="hr"></div>' +
    '<p class="pdp-price">' + escHtml(price) + '</p>' +
    '<p class="pdp-stock">In stock \u2014 ships in 1\u20132 days</p>' +
    '<div class="pdp-ctas">' +
      '<button class="btn-black" id="pdp-add-to-cart">Add to cart</button>' +
      '<button class="btn-ghost">Add to wishlist</button>' +
    '</div>' +
    '<div id="pdp-features"></div>';

  /* Add to cart handler */
  var addBtn = document.getElementById('pdp-add-to-cart');
  if (addBtn) {
    addBtn.addEventListener('click', function() {
      Cart.addItem(product);
      addBtn.textContent = 'Added!';
      setTimeout(function() { addBtn.textContent = 'Add to cart'; }, 1000);
    });
  }

  /* Features from description snippets */
  var features = document.getElementById('pdp-features');
  if (product.product_description) {
    var sentences = product.product_description.split(/[.!?]+/).filter(function(s) { return s.trim().length > 10; }).slice(0, 3);
    sentences.forEach(function(s) {
      var row = document.createElement('div');
      row.className = 'feature-row';
      row.innerHTML =
        '<div class="feature-check">' +
          '<svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1.5 4.5l2 2 4-4" stroke="#111" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        '</div>' +
        '<p class="feature-txt">' + escHtml(s.trim()) + '</p>';
      features.appendChild(row);
    });
  }

  /* Details tab content */
  var detailsPanel = document.getElementById('tab-details');
  detailsPanel.innerHTML =
    '<div class="tab-panel-inner">' +
      '<div>' +
        '<p class="specs-title">Product Description</p>' +
        '<p style="font-size:14px;color:#444;line-height:1.7;">' + escHtml(product.product_description || 'No description available.') + '</p>' +
      '</div>' +
      '<div id="tab-reviews-inline"></div>' +
    '</div>';

  /* Static reviews in details tab */
  var reviewsInline = document.getElementById('tab-reviews-inline');
  reviewsInline.innerHTML =
    '<p class="reviews-title">Customer Reviews</p>' +
    '<div class="review-card">' +
      '<p class="review-name">Jordan M.</p>' +
      '<p class="review-stars">\u2605\u2605\u2605\u2605\u2605</p>' +
      '<p class="review-body">Excellent product \u2014 exactly as described. Great quality and fast shipping. Would definitely buy again!</p>' +
    '</div>' +
    '<div class="review-card">' +
      '<p class="review-name">Sarah K.</p>' +
      '<p class="review-stars">\u2605\u2605\u2605\u2605\u2606</p>' +
      '<p class="review-body">Really happy with this purchase. Good value for the price. Fits well and feels durable.</p>' +
    '</div>' +
    '<div class="review-card">' +
      '<p class="review-name">Marcus T.</p>' +
      '<p class="review-stars">\u2605\u2605\u2605\u2605\u2605</p>' +
      '<p class="review-body">Best in its category. I have been using it for a few weeks and it still looks and performs like new.</p>' +
    '</div>';
}

/* ── Related products ── */
function renderRelated(products) {
  var grid = document.getElementById('related-grid');
  if (!grid) return;
  grid.innerHTML = '';

  if (!products || products.length === 0) {
    document.getElementById('related-products').style.display = 'none';
    return;
  }

  products.forEach(function(p) {
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

    var cartBtn = body.querySelector('.add-to-cart-icon');
    cartBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      Cart.addItem(p);
      cartBtn.textContent = '\u2713';
      setTimeout(function() { cartBtn.textContent = '+'; }, 800);
    });

    article.addEventListener('click', function(e) {
      if (e.target.classList.contains('add-to-cart-icon')) return;
      location.href = 'product.html?id=' + p.product_id;
    });

    grid.appendChild(article);
  });
}

/* ── Tab switching ── */
function initTabs() {
  var tabsEl = document.querySelector('.pdp-tabs');
  if (!tabsEl) return;

  var panels = document.querySelectorAll('.tab-panel');

  /* Show first panel */
  if (panels.length > 0) panels[0].classList.add('active');

  tabsEl.addEventListener('click', function(e) {
    var btn = e.target.closest('.pdp-tab');
    if (!btn) return;

    var tabs = tabsEl.querySelectorAll('.pdp-tab');
    tabs.forEach(function(t) { t.classList.remove('active'); });
    btn.classList.add('active');

    var idx = Array.prototype.indexOf.call(tabs, btn);
    panels.forEach(function(p, i) {
      p.classList.toggle('active', i === idx);
    });
  });
}

/* ── Error state ── */
function showPageError(message) {
  var pdp = document.querySelector('.pdp');
  if (pdp) pdp.style.display = 'none';
  var tabs = document.querySelector('.pdp-tabs');
  if (tabs) tabs.style.display = 'none';
  var tc = document.querySelector('.tab-content');
  if (tc) tc.style.display = 'none';
  var rel = document.getElementById('related-products');
  if (rel) rel.style.display = 'none';

  var bc = document.getElementById('pdp-breadcrumb');
  if (bc) {
    bc.innerHTML = '<a href="index.html">\u2190 Back to shop</a>';
  }

  var errDiv = document.createElement('div');
  errDiv.className = 'pdp-error';
  errDiv.innerHTML =
    '<strong style="font-size:20px;display:block;margin-bottom:12px;">' + escHtml(message || 'Product not found') + '</strong>' +
    '<p>The product you are looking for could not be loaded.</p>' +
    '<a href="index.html">Return to shop</a>';

  var main = document.querySelector('main') || document.body;
  if (bc) {
    bc.insertAdjacentElement('afterend', errDiv);
  } else {
    main.prepend(errDiv);
  }
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', function() {
  var params = new URLSearchParams(location.search);
  var productId = params.get('id');

  if (!productId) {
    location.href = 'index.html';
    return;
  }

  initTabs();
  showGallerySkeleton();
  showInfoSkeleton();

  /* Slow notice */
  var slowTimer = setTimeout(function() {
    var info = document.getElementById('pdp-info');
    if (info) {
      var notice = document.createElement('p');
      notice.style.cssText = 'text-align:center;font-size:13px;color:#888;margin-top:12px;';
      notice.textContent = 'Waking up the server\u2026 this may take a moment.';
      info.appendChild(notice);
    }
  }, 5000);

  Api.getProduct(productId).then(function(res) {
    clearTimeout(slowTimer);
    var product = res.data;
    if (!product) throw new Error('No product data returned');

    /* Fetch categories to get category name */
    Api.getAllCategories().then(function(catRes) {
      var category = catRes.categories.find(function(c) {
        return c.category_id === product.product_category_id;
      });
      var categoryName = category ? category.category_name : null;

      renderProduct(product, categoryName);

      /* Load related products from same category */
      Api.getProducts(product.product_category_id, 4, 0).then(function(relRes) {
        var related = relRes.data.filter(function(p) {
          return p.product_id !== product.product_id;
        }).slice(0, 4);
        renderRelated(related);
      }).catch(function() {
        var rel = document.getElementById('related-products');
        if (rel) rel.style.display = 'none';
      });
    }).catch(function() {
      /* Categories failed — render without category name */
      renderProduct(product, null);

      Api.getProducts(product.product_category_id, 4, 0).then(function(relRes) {
        var related = relRes.data.filter(function(p) {
          return p.product_id !== product.product_id;
        }).slice(0, 4);
        renderRelated(related);
      }).catch(function() {
        var rel = document.getElementById('related-products');
        if (rel) rel.style.display = 'none';
      });
    });
  }).catch(function(err) {
    clearTimeout(slowTimer);
    console.error('getProduct error:', err);
    showPageError('Could not load product');
  });
});
