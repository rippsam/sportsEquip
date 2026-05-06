/* ── Badge Registry ──────────────────────────────────────────────────────────
   Tracks which 8 products currently carry "New" and "Sale" overlay badges.

   New  = first batch of home page new arrivals for the current 4-day period.
   Sale = the 8 products on the current week's sale page.

   Both sets are computed from the same seed logic used by home.js / sale.js,
   cached in localStorage by period number, and applied to every product card
   site-wide via data-product-id attributes.
── */
const BadgeRegistry = (function() {

  /* ── Storage keys ── */
  const KEY_NEW  = 'se_badge_new';
  const KEY_SALE = 'se_badge_sale';

  /* ── In-memory Sets ── */
  let newIds  = new Set();
  let saleIds = new Set();

  /* ── Period helpers ── */
  function newPeriod()  { return Math.floor(Date.now() / (4 * 24 * 60 * 60 * 1000)); }
  function salePeriod() { return Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000)); }

  /* ── Storage helpers ── */
  function readKey(key) {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch(e) { return null; }
  }
  function writeKey(key, ids, period) {
    try { localStorage.setItem(key, JSON.stringify({ ids: ids, period: period })); } catch(e) {}
  }

  /* ── Public: synchronous badge lookup ── */
  function getBadge(productId) {
    if (newIds.has(productId))  return 'new';
    if (saleIds.has(productId)) return 'sale';
    return null;
  }

  /* ── Public: patch already-rendered cards ── */
  function rebadge() {
    document.querySelectorAll('.pcard[data-product-id]').forEach(function(card) {
      if (card.querySelector('.pcard-badge')) return;
      const badge = getBadge(Number(card.dataset.productId));
      if (!badge) return;
      const imgWrap = card.querySelector('.pcard-img');
      if (!imgWrap) return;
      const b = document.createElement('span');
      b.className = `pcard-badge badge-${badge}`;
      b.textContent = badge === 'sale' ? 'Sale' : 'New';
      imgWrap.appendChild(b);
    });
  }

  /* ── Fetch helpers (mirror home.js / sale.js logic exactly) ── */

  function fetchNewIds(categories) {
    const period = newPeriod();
    return Promise.allSettled(
      categories.map(function(c) {
        const rand = seededRand(period * 31 + c.category_id);
        rand(); rand(); rand(); rand(); rand(); /* same warm-up as initSamplerOffsets */
        const offset = Math.floor(rand() * 18);
        return Api.getProducts(c.category_id, 1, offset)
          .then(function(res) { return res.data.length ? res.data[0].product_id : null; });
      })
    ).then(function(results) {
      return results
        .filter(function(r) { return r.status === 'fulfilled' && r.value !== null; })
        .map(function(r) { return r.value; })
        .slice(0, 8);
    });
  }

  function fetchSaleIds(categories) {
    const period = salePeriod();
    const rand   = seededRand(period * 31 + 11); /* same seed as sale.js */
    const offset = (period % 8) + 1;
    const picked = pickUnique(categories, Math.min(categories.length, 14), rand);
    return Promise.allSettled(
      picked.map(function(cat) {
        return Api.getProducts(cat.category_id, 1, offset)
          .then(function(res) {
            if (res.data.length) return res.data[0].product_id;
            return Api.getProducts(cat.category_id, 1, 0)
              .then(function(r) { return r.data.length ? r.data[0].product_id : null; });
          })
          .catch(function() { return null; });
      })
    ).then(function(results) {
      return results
        .filter(function(r) { return r.status === 'fulfilled' && r.value !== null; })
        .map(function(r) { return r.value; })
        .slice(0, 8);
    });
  }

  /* ── Public: init (call once per page on DOMContentLoaded) ── */
  function init() {
    const nPeriod   = newPeriod();
    const sPeriod   = salePeriod();
    const rawNew    = readKey(KEY_NEW);
    const rawSale   = readKey(KEY_SALE);
    const newFresh  = rawNew  && rawNew.period  === nPeriod;
    const saleFresh = rawSale && rawSale.period === sPeriod;

    if (newFresh)  newIds  = new Set(rawNew.ids);
    if (saleFresh) saleIds = new Set(rawSale.ids);
    if (newFresh && saleFresh) return; /* fully cached — nothing to fetch */

    Api.getAllCategories().then(function(res) {
      const cats = res.categories;

      if (!newFresh) {
        fetchNewIds(cats).then(function(ids) {
          newIds = new Set(ids);
          writeKey(KEY_NEW, ids, nPeriod);
          rebadge();
        });
      }

      if (!saleFresh) {
        fetchSaleIds(cats).then(function(ids) {
          saleIds = new Set(ids);
          writeKey(KEY_SALE, ids, sPeriod);
          rebadge();
        });
      }
    }).catch(function() {}); /* fail silently — no badges on error */
  }

  /* ── Public: called by home.js after first sampler batch renders ── */
  function registerNew(productIds) {
    newIds = new Set(productIds);
    writeKey(KEY_NEW, productIds, newPeriod());
    rebadge();
  }

  /* ── Public: called by sale.js after sale products render ── */
  function registerSale(productIds) {
    saleIds = new Set(productIds);
    writeKey(KEY_SALE, productIds, salePeriod());
    rebadge();
  }

  return { init, getBadge, registerNew, registerSale, rebadge };
}());
