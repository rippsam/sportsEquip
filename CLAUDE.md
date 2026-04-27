# Claude Instructions

## Connected repos
- This repo (`SportsEquip`) is the frontend — static HTML/CSS/JS site.
- The backend API repo (`ClassSite`) lives at `/Users/samripplinger/Repos/ClassSite` and is tracked at `https://github.com/rippsam/storeAPI.git`.
- Both repos can be edited from this Claude Code session. When making changes to the API or database, work in `/Users/samripplinger/Repos/ClassSite`; commit and push from there separately.

## Commits
- Never add `Co-Authored-By: Claude` or any AI attribution to commit messages.

## Assets
- Product images are served from the API (`storeapi-60py.onrender.com/images/`). Do not store product images in this repo.
- Site-level assets live in `assets/images/`: `logo.png`, `BannerSportsEquip.png`, `SportEquipNoWordslogo.png`, `ThanksForMonster2.png`.

## Product images
- `product.product_image` is the primary image used on product cards (list views).
- The product detail gallery calls `GET /products/:id/images` for all images.
- The card image always matches `sort_order=0` from the `product_images` table — kept in sync by `add-product-images-table.js` in the API repo. If they ever diverge, re-run that script.

## CSS zoom
- `body { zoom: 1.3 }` in `styles.css` is intentional — it simulates 150% browser zoom for development. The responsive breakpoints at 1331px and 998px are deliberate. Do not remove or adjust them.

## Department pages
- When `?dept=X` is in the URL, `js/home.js` intentionally hides `.hero`, `#promo-section`, `#top-categories-section`, and `.trust`. Dept pages show only the product grid. This is by design.

## JavaScript style
- Use `const` by default; use `let` when the variable is reassigned. Never use `var`.
- Do not use arrow functions. Use `function` declarations for named functions and `function()` expressions for callbacks.
- Use `forEach` and other array methods (`map`, `filter`, `find`, `findIndex`, `reduce`, `some`, `every`, `flat`, `flatMap`) instead of standard `for` loops. Only use `do…while` when retry/uniqueness logic genuinely requires it.
- Use template literals instead of string concatenation.
- Use optional chaining `?.` and nullish coalescing `??` where appropriate.
- Use shorthand method syntax in objects: `{ method() {} }` not `{ method: function() {} }`.
