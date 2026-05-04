# Sports Equip

A demo sports e-commerce site built for a QA class to practice real-world testing scenarios. Students can browse products, use the shopping cart, go through checkout, and interact with a variety of page types and UI states.

**Live site:** https://rippsam.github.io/sportsEquip/

---

## About

The frontend is built with vanilla HTML, CSS, and JavaScript — no framework, no build step. It runs entirely in the browser and pulls all product data at runtime from a REST API.

The connected API ([rippsam/storeAPI](https://github.com/rippsam/storeAPI)) is a read-only Node.js/Express service backed by a Sports demo dataset (SQLite). It returns departments, categories, products, customers, and orders.

---

## For QA Students

This site is intentionally built with realistic features for testing practice: infinite scroll, a persistent cart, form validation on checkout, dynamic routing, search with debouncing, and several easter egg pages. It's a good surface for exploratory testing, writing test cases, and practicing both manual and automated testing.
