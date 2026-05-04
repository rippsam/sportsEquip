const state = {
  offset:  0,
  limit:   16,
  loading: false,
  done:    false
};

const productGrid = document.getElementById('product-grid');
const sentinel    = document.getElementById('scroll-sentinel');

function buildCard(p) {
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
      <span class="pcard-price">$${(parseFloat(p.product_price) || 0).toFixed(2)}</span>
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

function showSkeletons(n) {
  Array.from({ length: n }).forEach(function() {
    const s = document.createElement('div');
    s.className = 'skeleton skeleton-card';
    productGrid.appendChild(s);
  });
}

function removeSkeletons() {
  productGrid.querySelectorAll('.skeleton-card').forEach(function(el) { el.remove(); });
}

function loadMore() {
  if (state.loading || state.done) return;
  state.loading = true;
  showSkeletons(state.limit);

  Api.getAllProducts(state.limit, state.offset)
    .then(function(res) {
      removeSkeletons();
      const products = res.data || [];
      products.forEach(function(p) { productGrid.appendChild(buildCard(p)); });
      state.offset += products.length;
      if (products.length < state.limit) state.done = true;
      state.loading = false;
    })
    .catch(function() {
      removeSkeletons();
      state.loading = false;
    });
}

document.addEventListener('DOMContentLoaded', function() {
  loadMore();

  const observer = new IntersectionObserver(function(entries) {
    if (entries[0].isIntersecting) loadMore();
  }, { rootMargin: '200px' });

  observer.observe(sentinel);
});

window.addEventListener('pageshow', function(e) {
  if (!e.persisted) return;
  document.querySelectorAll('[data-cart-control]').forEach(function(ctrl) { ctrl.refresh(); });
});
