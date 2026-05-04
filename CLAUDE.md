# Claude Instructions

## Connected repos
- This repo (`SportsEquip`) is the frontend — static HTML/CSS/JS site.
- The backend API repo (`ClassSite`) lives at `/Users/samripplinger/Repos/ClassSite` and is tracked at `https://github.com/rippsam/storeAPI.git`.
- Both repos can be edited from this Claude Code session. When making changes to the API or database, work in `/Users/samripplinger/Repos/ClassSite`; commit and push from there separately.

## Commits
- Never add `Co-Authored-By: Claude` or any AI attribution to commit messages.
- Before committing, verify the changes follow all style and architecture rules in this file.

## Pre-push code review
Before pushing to GitHub, review the changes and confirm:
- No shortcuts taken — logic is complete, not approximated.
- Edge cases are covered: empty states, boundary values, rapid user actions, concurrent events, re-entry into the same code path.
- No loopholes: state transitions are guarded so invalid sequences (e.g. triggering an action twice, acting on stale async callbacks after a reset) cannot occur.
- Every new code path has been mentally traced from start to finish, including failure and early-exit branches.

## Assets
- Product images are served from the API (`storeapi-60py.onrender.com/images/`). Do not store product images in this repo.
- Site-level assets live in `assets/images/`: `logo.png`, `BannerSportsEquip.png`, `SportEquipNoWordslogo.png`.
- DataMonsters images live in `assets/DataMonsters/` — used by `login-success.html`.
- Footer media assets live in `assets/Footer/` — used by standalone footer pages.

## Product images
- `product.product_image` is the primary image used on product cards (list views).
- The product detail gallery calls `GET /products/:id/images` for all images.
- The card image always matches `sort_order=0` from the `product_images` table — kept in sync by `add-product-images-table.js` in the API repo. If they ever diverge, re-run that script.

## CSS zoom
- `body { zoom: 1.3 }` in `styles.css` is intentional — it simulates 150% browser zoom for development. The responsive breakpoints at 1331px and 998px are deliberate. Do not remove or adjust them.

## Hosting
- The site is hosted on GitHub Pages at `https://rippsam.github.io/sportsEquip/`.
- `.nojekyll` is required in the repo root — without it GitHub Pages runs Jekyll and deployments fail.
- Every push to `main` triggers an automatic Pages deployment (allow 1–2 min to go live).

## Pages

Standard pages (full nav + footer, load `js/utils.js` + `js/nav.js` at top of body, `js/footer.js` at bottom):
- `index.html` / `js/home.js` — home page; dept hero, product grid, featured product, top categories.
- `all-products.html` / `js/all-products.js` — all products with infinite scroll.
- `categories.html` / `js/categories.js` — all-categories browse page; dept blocks with category card grid.
- `category.html` / `js/category.js` — per-category product listing with infinite scroll. URL: `category.html?cat=ID&name=Name`.
- `sale.html` / `js/sale.js` — weekly rotating sale items at 40% off.
- `product.html` / `js/product.js` — product detail page with gallery, tabs, reviews, related products.
- `cart.html` / `js/cart-page.js` — cart with quantity controls and order summary.
- `checkout.html` / `js/checkout.js` — checkout form and order summary.
- `about.html` — static about page.
- `gift-cards.html` — interactive gift card game page.

Standalone pages (no nav/footer, no shared scripts):
- `press.html` — white page with long-hold button.
- `rewards.html` — full-screen rewards gif.
- `instagram.html`, `twitter.html`, `newsletter.html` — full-screen image/gif pages.
- `login-success.html` — post-checkout success page with random DataMonsters image.

## Department pages
- When `?dept=X` is in the URL, `js/home.js` intentionally hides `.hero`, `#promo-section`, `#top-categories-section`, and `.trust`, and shows `#dept-hero` and `#dept-sale-banner`. The dept name is set from the API after load. This is by design.

## Shared CSS components
- DM Sans is loaded site-wide via `@import` at the top of `styles.css`.
- `.hero-strip` / `.hero-eyebrow` / `.hero-title` — black hero banner used on all browse/dept/sale pages.
- `.sale-banner-wrap` / `.sale-banner` — dark promo banner. Both live in `styles.css`.
- Do not move these back into per-page `<style>` blocks.

## New page template

Standard pages must follow this body structure — do not inline nav or footer HTML:

```html
<body>
<nav class="nav" id="site-nav"></nav>
<script src="js/utils.js"></script>
<script src="js/nav.js"></script>

<!-- page content -->

<footer class="footer" id="site-footer"></footer>
<script src="js/api.js"></script>
<script src="js/cart.js"></script>
<script src="js/[page].js"></script>
<script src="js/footer.js"></script>
</body>
```

## Shared JS utilities (`js/utils.js`)

Loaded on every standard page before all other scripts. Do not redefine these in individual files:
- `escHtml(str)` — HTML-escapes a string.
- `MULTI_WORD_BRANDS` / `parseBrand(name)` — extracts brand name from product name.
- `seededRand(seed)` — LCG deterministic RNG; returns a `rand()` function.
- `makeCartControl(cartProduct)` — builds the `+` / qty-stepper DOM node for product cards.

## Cart

- `js/cart.js` exposes `window.Cart` — use `Cart.addItem`, `Cart.removeItem`, `Cart.updateQty`, `Cart.getItems`, `Cart.getTotalCount`, `Cart.clear`.
- Max quantity per item is 10. `Cart.addItem` returns `false` when the cap is hit.
- Cart mutations fire a `cartUpdated` custom event on `document`.
- Use `window.addEventListener('pageshow', function(e) { if (e.persisted) render(); })` on any page that reads cart state, to handle browser back/forward cache correctly.

## DRY principle

Follow DRY (Don't Repeat Yourself) throughout the codebase:
- Shared utility functions belong in `js/utils.js`, not copied into individual files.
- Nav and footer HTML are injected by `js/nav.js` and `js/footer.js` — never paste them into page HTML.
- Shared CSS components belong in `css/styles.css`, not in per-page `<style>` blocks.
- Before adding a new function, check if an equivalent already exists in `js/utils.js` or elsewhere.

## JavaScript style
- Use `const` by default; use `let` when the variable is reassigned. Never use `var`.
- Do not use arrow functions. Use `function` declarations for named functions and `function()` expressions for callbacks.
- Use `forEach` and other array methods (`map`, `filter`, `find`, `findIndex`, `reduce`, `some`, `every`, `flat`, `flatMap`) instead of standard `for` loops. Only use `do…while` when retry/uniqueness logic genuinely requires it.
- Use template literals instead of string concatenation.
- Use optional chaining `?.` and nullish coalescing `??` where appropriate.
- Use shorthand method syntax in objects: `{ method() {} }` not `{ method: function() {} }`.
