document.getElementById('site-nav').innerHTML = [
  '<a class="nav-logo" href="index.html"><img src="assets/images/logo.png" alt="Sports Equip" class="nav-logo-img"></a>',
  '<ul id="nav-dept-links" class="nav-links"></ul>',
  '<div class="nav-right">',
  '<button class="nav-icon-btn" aria-label="Search"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" stroke-width="1.2"/><line x1="10.2" y1="10.2" x2="14" y2="14" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg></button>',
  '<button class="nav-icon-btn" aria-label="Account"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="3" stroke="currentColor" stroke-width="1.2"/><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg></button>',
  '<button class="nav-icon-btn" id="nav-cart-btn" aria-label="Cart"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 3h12l-1.5 8H3.5L2 3z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><circle cx="5.5" cy="13" r="1" fill="currentColor"/><circle cx="10.5" cy="13" r="1" fill="currentColor"/></svg><span class="cart-badge" id="cart-badge" style="display:none">0</span></button>',
  '</div>'
].join('');

function updateCartBadge() {
  const badge = document.getElementById('cart-badge');
  if (!badge) return;
  const count = Cart.getTotalCount();
  badge.textContent   = count > 99 ? '99+' : count;
  badge.style.display = count > 0 ? 'inline-flex' : 'none';
}

document.addEventListener('DOMContentLoaded', function() {
  updateCartBadge();
  document.addEventListener('cartUpdated', updateCartBadge);

  document.getElementById('nav-cart-btn')?.addEventListener('click', function() {
    location.href = 'cart.html';
  });

  const list = document.getElementById('nav-dept-links');
  if (!list) return;

  const activeDept = new URLSearchParams(location.search).get('dept');

  Api.getDepartments()
    .then(function(res) {
      const allLi = document.createElement('li');
      const allA  = document.createElement('a');
      allA.href        = 'all-products.html';
      allA.textContent = 'All Products';
      if (location.pathname.endsWith('all-products.html')) allA.classList.add('active');
      allLi.appendChild(allA);
      list.appendChild(allLi);

      res.data.forEach(function(d) {
        const li = document.createElement('li');
        const a  = document.createElement('a');
        a.href        = `index.html?dept=${d.department_id}`;
        a.textContent = d.department_name;
        if (String(d.department_id) === activeDept) a.classList.add('active');
        li.appendChild(a);
        list.appendChild(li);
      });
      appendSaleLink(list);
      if (activeDept) {
        document.dispatchEvent(new CustomEvent('deptSelected', { detail: { deptId: activeDept } }));
      }
    })
    .catch(function(err) {
      console.error('Nav: failed to load departments', err);
      appendSaleLink(list);
    });

  function appendSaleLink(parent) {
    const li = document.createElement('li');
    const a  = document.createElement('a');
    a.href        = 'sale.html';
    a.textContent = 'Sale';
    a.className   = 'sale';
    li.appendChild(a);
    parent.appendChild(li);
  }

  /* ── Account ── */
  const accountBtn = document.querySelector('.nav-icon-btn[aria-label="Account"]');
  if (accountBtn) {
    const accountWrap = document.createElement('div');
    accountWrap.className = 'nav-account-wrap';

    const accountDropdown = document.createElement('div');
    accountDropdown.className = 'account-dropdown';

    const accountInner = document.createElement('div');
    accountInner.className = 'account-dropdown-inner';

    const accountLink = document.createElement('button');
    accountLink.className = 'account-dropdown-btn';
    accountLink.textContent = 'Sign In';
    accountLink.addEventListener('click', function() {
      location.href = 'login.html';
    });

    accountInner.appendChild(accountLink);
    accountDropdown.appendChild(accountInner);
    accountBtn.parentNode.insertBefore(accountWrap, accountBtn);
    accountWrap.appendChild(accountBtn);
    accountWrap.appendChild(accountDropdown);
  }

  /* ── Search ── */
  const searchBtn = document.querySelector('.nav-icon-btn[aria-label="Search"]');
  if (!searchBtn) return;

  let searchCache = null;
  let searchTimer = null;
  let searchFetching = false;
  let searchLatestQuery = '';

  /* Build search UI */
  const wrap = document.createElement('div');
  wrap.className = 'nav-search-wrap';

  const input = document.createElement('input');
  input.type        = 'search';
  input.className   = 'nav-search-input';
  input.placeholder = 'Search products…';
  input.setAttribute('aria-label', 'Search products');
  input.setAttribute('autocomplete', 'off');

  const dropdown = document.createElement('div');
  dropdown.className = 'search-dropdown';

  /* Replace search button with always-visible input */
  searchBtn.parentNode.insertBefore(wrap, searchBtn);
  searchBtn.remove();
  wrap.appendChild(input);

  /* Append dropdown to nav so it overflows below it */
  const nav = document.querySelector('.nav');
  if (nav) nav.appendChild(dropdown);

  function closeDropdown() {
    dropdown.innerHTML = '';
    dropdown.classList.remove('visible');
  }

  input.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeDropdown();
  });

  document.addEventListener('click', function(e) {
    if (!wrap.contains(e.target) && !dropdown.contains(e.target)) closeDropdown();
  });

  input.addEventListener('input', function() {
    clearTimeout(searchTimer);
    const query = input.value.trim();
    if (!query) {
      dropdown.innerHTML = '';
      dropdown.classList.remove('visible');
      return;
    }
    searchTimer = setTimeout(function() { runSearch(query); }, 300);
  });

  function runSearch(query) {
    if (searchCache) {
      renderResults(filterProducts(searchCache, query));
      return;
    }
    searchLatestQuery = query;
    if (searchFetching) return;
    searchFetching = true;
    Api.getAllProducts(200)
      .then(function(res) {
        searchCache = res.data || [];
        searchFetching = false;
        renderResults(filterProducts(searchCache, searchLatestQuery));
      })
      .catch(function() {
        searchFetching = false;
        dropdown.innerHTML = '<p class="search-no-results">Could not load products.</p>';
        dropdown.classList.add('visible');
      });
  }

  function filterProducts(products, query) {
    const q = query.toLowerCase();
    return products
      .filter(function(p) { return p.product_name && p.product_name.toLowerCase().includes(q); })
      .slice(0, 8);
  }

  function renderResults(results) {
    dropdown.innerHTML = '';
    if (!results.length) {
      dropdown.innerHTML = '<p class="search-no-results">No products found.</p>';
      dropdown.classList.add('visible');
      return;
    }
    results.forEach(function(p) {
      const a   = document.createElement('a');
      a.className = 'search-result';
      a.href      = `product.html?id=${p.product_id}`;

      const imgWrap = document.createElement('div');
      imgWrap.className = 'search-result-img';
      if (p.product_image) {
        const img = document.createElement('img');
        img.src   = p.product_image;
        img.alt   = p.product_name;
        img.onerror = function() { imgWrap.innerHTML = ''; };
        imgWrap.appendChild(img);
      }

      const info = document.createElement('div');
      info.className = 'search-result-info';
      info.innerHTML = `
        <p class="search-result-name">${escHtml(p.product_name)}</p>
        <p class="search-result-price">$${(parseFloat(p.product_price) || 0).toFixed(2)}</p>`;

      a.append(imgWrap, info);
      dropdown.appendChild(a);
    });
    dropdown.classList.add('visible');
  }
});
