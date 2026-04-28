/* ── Known brands for parsing ── */
const KNOWN_BRANDS = [
  'Nike', 'Adidas', 'Under Armour', 'New Balance', 'The North Face', 'Garmin',
  'Wilson', 'Callaway', 'Patagonia', 'Brooks', 'Puma', 'Reebok', 'Asics',
  'Mizuno', 'Salomon', 'Columbia', 'Titleist', 'TaylorMade', 'Ping',
  'Rawlings', 'Easton', 'Bauer', 'CCM', 'Warrior', 'Saucony', 'Hoka',
  'Yonex', 'Head', 'Babolat', 'Prince'
];
const MULTI_WORD_BRANDS = ['Under Armour', 'New Balance', 'The North Face'];

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function parseBrand(name) {
  return MULTI_WORD_BRANDS.find(function(b) { return name.startsWith(b); }) || name.split(' ')[0] || 'Brand';
}

/* ── Skeletons ── */
function showGallerySkeleton() {
  document.getElementById('pdp-gallery').innerHTML = `
    <div class="pdp-main-img skeleton" style="width:100%;height:360px;background:none;"></div>
    <div style="display:flex;gap:10px;margin-top:16px;">
      <div class="skeleton" style="width:60px;height:60px;border-radius:8px;"></div>
      <div class="skeleton" style="width:60px;height:60px;border-radius:8px;"></div>
      <div class="skeleton" style="width:60px;height:60px;border-radius:8px;"></div>
    </div>`;
}

function showInfoSkeleton() {
  document.getElementById('pdp-info').innerHTML = `
    <div class="skeleton skeleton-line short" style="width:80px;height:12px;margin-bottom:12px;"></div>
    <div class="skeleton skeleton-line" style="width:90%;height:28px;margin-bottom:8px;"></div>
    <div class="skeleton skeleton-line short" style="width:60%;height:14px;margin-bottom:20px;"></div>
    <div class="skeleton skeleton-line short" style="width:40%;height:28px;margin-bottom:16px;"></div>
    <div class="skeleton" style="height:48px;border-radius:30px;margin-bottom:10px;"></div>
    <div class="skeleton" style="height:48px;border-radius:30px;"></div>`;
}

/* ── Review generator ── */
const REVIEW_NAMES = [
  'Jordan M.', 'Sarah K.', 'Marcus T.', 'Alyssa R.', 'Devon P.',
  'Brianna L.', 'Tyler H.', 'Keisha W.', 'Nate F.', 'Vanessa C.',
  'Chris B.', 'Monique J.', 'Ryan S.', 'Priya N.', 'Jake O.',
  'Courtney E.', 'Luis V.', 'Hannah D.', 'Drew A.', 'Simone G.',
  'Brandon Q.', 'Tori Z.', 'Elijah X.', 'Natalie I.', 'Darius U.'
];

const REVIEW_BODIES = [
  'Exactly what I was looking for. Great quality and arrived fast. Would definitely buy again.',
  'Really impressed with the build quality. Feels premium and holds up well after heavy use.',
  'Good value for the price. Does everything it promises. My whole team uses this now.',
  'I was skeptical at first but this exceeded my expectations. Highly recommend.',
  'Fits perfectly and feels comfortable right out of the box. No break-in period needed.',
  'Bought this as a gift and the recipient absolutely loves it. Great choice.',
  'Performance is top notch. I noticed an improvement in my game right away.',
  'Solid product. Nothing flashy but it does the job really well and lasts.',
  'I have tried a few brands and this is by far the best I have used at this price point.',
  'Lightweight but durable. Exactly the balance I was looking for.',
  'Customer service was helpful when I had a question about sizing. Product itself is great.',
  'I play three times a week and this has held up perfectly. Very satisfied.',
  'The quality is noticeably better than cheaper alternatives. Worth every dollar.',
  'Easy to set up and use. I had it ready to go within minutes of opening the box.',
  'I have owned this for about six months now and it still looks and performs like new.',
  'Great for both beginners and experienced athletes. Versatile and reliable.',
  'My coach recommended this brand and I can see why. Professional-grade quality.',
  'Excellent grip, great support, and very comfortable. Could not ask for more.',
  'This replaced my old one which lasted five years. So far this one seems even better.',
  'Fast shipping, well packaged, and the product was exactly as described. Five stars.',
  'I was hesitant about the price but after using it I understand why it costs more.',
  'The material is high quality and the stitching is solid. No complaints at all.',
  'Perfect for my training sessions. Gives me the confidence I need to perform.',
  'I bought the wrong size initially and the return process was smooth. Got the right one and love it.',
  'Been using this brand for years. Consistent quality every time.',
  'Better than the competitor version I tried. The fit and finish is noticeably superior.',
  'Great for everyday use and competitions alike. A true all-rounder.',
  'A bit of an adjustment period but once I got used to it, I would not go back.',
  'My whole family uses this. Holds up for kids and adults equally well.',
  'Solid construction. I put this through its paces and it did not disappoint.',
  'The color options are great and the performance matches the looks.',
  'I read a lot of reviews before buying and they were all right. This is the one to get.',
  'Works perfectly for what I need. No gimmicks, just solid performance.',
  'Bought a second one as a backup — that is how much I trust this product.'
];

const STAR_POOL = [5, 5, 5, 5, 5, 5, 4, 4, 4, 4, 3, 3, 2];

function seededRand(seed) {
  let s = seed;
  return function() {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function starHtml(n) {
  return Array.from({ length: 5 }, function(_, i) { return i < n ? '\u2605' : '\u2606'; }).join('');
}

function generateReviews(productId) {
  const rand      = seededRand(productId * 7 + 31);
  const count     = 2 + Math.floor(rand() * 5);
  const usedNames  = {};
  const usedBodies = {};

  return Array.from({ length: count }, function() {
    /* do-while needed: uniqueness-sampling requires retry-on-collision */
    let nameIdx;
    do { nameIdx = Math.floor(rand() * REVIEW_NAMES.length); }
    while (usedNames[nameIdx] && Object.keys(usedNames).length < REVIEW_NAMES.length);
    usedNames[nameIdx] = true;

    let bodyIdx;
    do { bodyIdx = Math.floor(rand() * REVIEW_BODIES.length); }
    while (usedBodies[bodyIdx] && Object.keys(usedBodies).length < REVIEW_BODIES.length);
    usedBodies[bodyIdx] = true;

    const stars = STAR_POOL[Math.floor(rand() * STAR_POOL.length)];
    return `
      <div class="review-card">
        <p class="review-name">${escHtml(REVIEW_NAMES[nameIdx])}</p>
        <p class="review-stars">${starHtml(stars)}</p>
        <p class="review-body">${escHtml(REVIEW_BODIES[bodyIdx])}</p>
      </div>`;
  });
}

/* ── Render product ── */
function renderProduct(product, images, categoryName) {
  const brand = parseBrand(product.product_name);
  const price = `$${parseFloat(product.product_price).toFixed(2)}`;

  document.title = `${product.product_name} \u2014 Sports Equip`;

  /* Breadcrumb */
  const bc = document.getElementById('pdp-breadcrumb');
  bc.innerHTML = categoryName
    ? `<a href="index.html">\u2190 Back</a> / ${escHtml(categoryName)} / ${escHtml(product.product_name)}`
    : `<a href="index.html">\u2190 Back</a> / ${escHtml(product.product_name)}`;

  /* Gallery */
  const mainSrc = images[0] ?? '';
  const thumbsHtml = images.map(function(url, i) {
    return `<div class="pdp-thumb${i === 0 ? ' active' : ''}" data-src="${escHtml(url)}"><img src="${escHtml(url)}" alt="" onerror="this.style.display='none'"></div>`;
  }).join('');
  const lightboxThumbsHtml = images.map(function(url, i) {
    return `<div class="pdp-lightbox-thumb${i === 0 ? ' active' : ''}" data-src="${escHtml(url)}"><img src="${escHtml(url)}" alt="" onerror="this.style.display='none'"></div>`;
  }).join('');

  document.getElementById('pdp-gallery').innerHTML = `
    <div class="pdp-main-img">
      ${mainSrc ? `<img id="pdp-main-img-el" src="${escHtml(mainSrc)}" alt="${escHtml(product.product_name)}" onerror="this.style.display='none'">` : ''}
    </div>
    <div class="pdp-gallery-nav">
      <button class="pdp-arrow" id="pdp-arrow-prev">&#8249;</button>
      <div class="pdp-thumbs">${thumbsHtml}</div>
      <button class="pdp-arrow" id="pdp-arrow-next">&#8250;</button>
    </div>`;

  const lightbox = document.createElement('div');
  lightbox.id = 'pdp-lightbox';
  lightbox.className = 'pdp-lightbox';
  lightbox.innerHTML = `
    <button class="pdp-lightbox-close" id="pdp-lightbox-close">&#x2715;</button>
    <div class="pdp-lightbox-main">
      ${mainSrc ? `<img id="pdp-lightbox-img" src="${escHtml(mainSrc)}" alt="${escHtml(product.product_name)}" onerror="this.style.display='none'">` : ''}
    </div>
    <div class="pdp-lightbox-nav">
      <button class="pdp-arrow pdp-lightbox-arrow" id="pdp-lightbox-prev">&#8249;</button>
      <div class="pdp-lightbox-thumbs">${lightboxThumbsHtml}</div>
      <button class="pdp-arrow pdp-lightbox-arrow" id="pdp-lightbox-next">&#8250;</button>
    </div>`;
  document.body.appendChild(lightbox);

  const thumbsEl         = document.querySelector('.pdp-thumbs');
  const navEl            = document.querySelector('.pdp-gallery-nav');
  const lightboxThumbsEl = lightbox.querySelector('.pdp-lightbox-thumbs');
  const lightboxNavEl    = lightbox.querySelector('.pdp-lightbox-nav');

  if (images.length <= 1) {
    navEl.style.display = 'none';
    lightboxNavEl.style.display = 'none';
  }

  let currentIdx = 0;

  function goToIndex(idx) {
    currentIdx = (idx + images.length) % images.length;
    const mainImgEl     = document.getElementById('pdp-main-img-el');
    const lightboxImgEl = document.getElementById('pdp-lightbox-img');
    if (mainImgEl)     mainImgEl.src     = images[currentIdx];
    if (lightboxImgEl) lightboxImgEl.src = images[currentIdx];
    thumbsEl.querySelectorAll('.pdp-thumb').forEach(function(t, i) {
      t.classList.toggle('active', i === currentIdx);
    });
    lightboxThumbsEl.querySelectorAll('.pdp-lightbox-thumb').forEach(function(t, i) {
      t.classList.toggle('active', i === currentIdx);
    });
  }

  function openLightbox() {
    lightbox.classList.add('pdp-lightbox-open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('pdp-lightbox-open');
    document.body.style.overflow = '';
  }

  if (mainSrc) {
    document.querySelector('.pdp-main-img').addEventListener('click', openLightbox);
  }

  document.getElementById('pdp-lightbox-close').addEventListener('click', closeLightbox);

  lightbox.addEventListener('click', function(e) {
    const lightboxImg = document.getElementById('pdp-lightbox-img');
    const lightboxNav = lightbox.querySelector('.pdp-lightbox-nav');
    if (lightboxImg && lightboxImg.contains(e.target)) return;
    if (lightboxNav && lightboxNav.contains(e.target)) return;
    closeLightbox();
  });

  if (images.length > 1) {
    thumbsEl.querySelectorAll('.pdp-thumb').forEach(function(thumb, i) {
      thumb.addEventListener('click', function() { goToIndex(i); });
    });
    document.getElementById('pdp-arrow-prev').addEventListener('click', function() { goToIndex(currentIdx - 1); });
    document.getElementById('pdp-arrow-next').addEventListener('click', function() { goToIndex(currentIdx + 1); });

    lightboxThumbsEl.querySelectorAll('.pdp-lightbox-thumb').forEach(function(thumb, i) {
      thumb.addEventListener('click', function() { goToIndex(i); });
    });
    document.getElementById('pdp-lightbox-prev').addEventListener('click', function() { goToIndex(currentIdx - 1); });
    document.getElementById('pdp-lightbox-next').addEventListener('click', function() { goToIndex(currentIdx + 1); });
  }

  document.addEventListener('keydown', function(e) {
    if (!lightbox.classList.contains('pdp-lightbox-open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (images.length > 1 && e.key === 'ArrowLeft')  goToIndex(currentIdx - 1);
    if (images.length > 1 && e.key === 'ArrowRight') goToIndex(currentIdx + 1);
  });

  /* Info panel */
  document.getElementById('pdp-info').innerHTML = `
    <p class="pdp-brand">${escHtml(brand)}</p>
    <h1 class="pdp-name">${escHtml(product.product_name)}</h1>
    <p class="pdp-subtitle">${escHtml(categoryName ?? 'Sports Equipment')}</p>
    <div class="hr"></div>
    <p class="pdp-price">${escHtml(price)}</p>
    <p class="pdp-stock">In stock \u2014 ships in 1\u20132 days</p>
    <div class="pdp-ctas">
      <button class="btn-black" id="pdp-add-to-cart">Add to cart</button>
      <button class="btn-ghost" id="pdp-add-to-wishlist">Add to wishlist</button>
    </div>
    <div id="pdp-features"></div>`;

  document.getElementById('pdp-add-to-wishlist')?.addEventListener('click', function() {
    alert('You must sign in');
  });

  document.getElementById('pdp-add-to-cart')?.addEventListener('click', function() {
    const added = Cart.addItem(product);
    this.textContent = added ? 'Added!' : 'Max 10';
    setTimeout(function() { this.textContent = 'Add to cart'; }.bind(this), 1000);
  });

  /* Features from description snippets */
  if (product.product_description) {
    document.getElementById('pdp-features').innerHTML = product.product_description
      .split(/[.!?]+/)
      .filter(function(s) { return s.trim().length > 10; })
      .slice(0, 3)
      .map(function(s) {
        return `
          <div class="feature-row">
            <div class="feature-check">
              <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1.5 4.5l2 2 4-4" stroke="#111" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
            <p class="feature-txt">${escHtml(s.trim())}</p>
          </div>`;
      })
      .join('');
  }

  /* Details tab */
  document.getElementById('tab-details').innerHTML = `
    <div class="tab-panel-inner">
      <div>
        <p class="specs-title">Product Description</p>
        <p style="font-size:14px;color:#444;line-height:1.7;">${escHtml(product.product_description ?? 'No description available.')}</p>
      </div>
      <div id="tab-reviews-inline"></div>
    </div>`;

  const reviews         = generateReviews(product.product_id);
  const reviewContainer = document.getElementById('tab-reviews-inline');
  const REVIEW_INITIAL  = 2;

  reviewContainer.innerHTML = `<p class="reviews-title">Customer Reviews</p>${reviews.slice(0, REVIEW_INITIAL).join('')}`;

  if (reviews.length > REVIEW_INITIAL) {
    const makeLoadMoreBtn = function() {
      const btn = document.createElement('button');
      btn.className = 'reviews-load-more';
      btn.textContent = `Load more reviews →`;
      btn.addEventListener('click', function() {
        btn.remove();
        reviews.slice(REVIEW_INITIAL).forEach(function(html) {
          const tmp = document.createElement('div');
          tmp.innerHTML = html.trim();
          const card = tmp.firstElementChild;
          card.classList.add('review-card-extra');
          reviewContainer.appendChild(card);
        });
        reviewContainer.appendChild(makeShowLessBtn());
      });
      return btn;
    };

    const makeShowLessBtn = function() {
      const btn = document.createElement('button');
      btn.className = 'reviews-load-more';
      btn.textContent = `← Show less`;
      btn.addEventListener('click', function() {
        reviewContainer.querySelectorAll('.review-card-extra').forEach(function(el) {
          el.remove();
        });
        btn.remove();
        reviewContainer.appendChild(makeLoadMoreBtn());
      });
      return btn;
    };

    reviewContainer.appendChild(makeLoadMoreBtn());
  }
}

/* ── Related products ── */
function buildProductCard(p) {
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

function renderRelated(products) {
  const grid = document.getElementById('related-grid');
  if (!grid) return;

  if (!products?.length) {
    document.getElementById('related-products').style.display = 'none';
    return;
  }

  grid.innerHTML = '';
  products.forEach(function(p) { grid.appendChild(buildProductCard(p)); });
}

/* ── Tab switching ── */
function initTabs() {
  const tabsEl = document.querySelector('.pdp-tabs');
  if (!tabsEl) return;

  const panels = document.querySelectorAll('.tab-panel');
  panels[0]?.classList.add('active');

  tabsEl.addEventListener('click', function(e) {
    const btn = e.target.closest('.pdp-tab');
    if (!btn) return;

    const tabs = tabsEl.querySelectorAll('.pdp-tab');
    tabs.forEach(function(t) { t.classList.remove('active'); });
    btn.classList.add('active');

    const idx = Array.from(tabs).indexOf(btn);
    panels.forEach(function(p, i) { p.classList.toggle('active', i === idx); });
  });
}

/* ── Error state ── */
function showPageError(message) {
  ['.pdp', '.pdp-tabs', '.tab-content'].forEach(function(sel) {
    document.querySelector(sel)?.style.setProperty('display', 'none');
  });
  document.getElementById('related-products')?.style.setProperty('display', 'none');

  const bc = document.getElementById('pdp-breadcrumb');
  if (bc) bc.innerHTML = '<a href="index.html">\u2190 Back to shop</a>';

  const errDiv = document.createElement('div');
  errDiv.className = 'pdp-error';
  errDiv.innerHTML = `
    <strong style="font-size:20px;display:block;margin-bottom:12px;">${escHtml(message ?? 'Product not found')}</strong>
    <p>The product you are looking for could not be loaded.</p>
    <a href="index.html">Return to shop</a>`;

  if (bc) bc.insertAdjacentElement('afterend', errDiv);
  else (document.querySelector('main') ?? document.body).prepend(errDiv);
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', function() {
  const productId = new URLSearchParams(location.search).get('id');
  if (!productId) { location.href = 'index.html'; return; }

  initTabs();
  showGallerySkeleton();
  showInfoSkeleton();

  let slowTimer = setTimeout(function() {
    const info = document.getElementById('pdp-info');
    if (info) {
      const notice = document.createElement('p');
      notice.style.cssText = 'text-align:center;font-size:13px;color:#888;margin-top:12px;';
      notice.textContent = 'Waking up the server\u2026 this may take a moment.';
      info.appendChild(notice);
    }
  }, 5000);

  function loadRelated(categoryId) {
    Api.getProducts(categoryId, 5, 0)
      .then(function(res) {
        renderRelated(res.data.filter(function(p) { return p.product_id !== parseInt(productId); }).slice(0, 4));
      })
      .catch(function() {
        document.getElementById('related-products')?.style.setProperty('display', 'none');
      });
  }

  Promise.all([Api.getProduct(productId), Api.getProductImages(productId)])
    .then(function(results) {
      clearTimeout(slowTimer);
      const product = results[0].data;
      const images  = results[1].data.length ? results[1].data : (product.product_image ? [product.product_image] : []);
      if (!product) throw new Error('No product data returned');

      Api.getAllCategories()
        .then(function(catRes) {
          const category = catRes.categories.find(function(c) {
            return c.category_id === product.product_category_id;
          });
          renderProduct(product, images, category?.category_name ?? null);
          loadRelated(product.product_category_id);
        })
        .catch(function() {
          renderProduct(product, images, null);
          loadRelated(product.product_category_id);
        });
    })
    .catch(function(err) {
      clearTimeout(slowTimer);
      console.error('getProduct error:', err);
      showPageError('Could not load product');
    });
});
