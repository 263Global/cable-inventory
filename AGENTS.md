# AGENTS.md

This document provides the default orientation and operating guidance for agents working in this repository.

## Project Purpose
Cable Inventory Manager: a browser-based app for managing inventory resources, sales orders, customers, and suppliers with Supabase as the backend.

## Architecture Overview
- Frontend: vanilla HTML/CSS/JS (no build step).
- Data layer: `assets/js/store.js` talks to Supabase and keeps in-memory arrays.
- View modules: `assets/js/modules/*.js` render and handle UI interactions.
- Shared logic: status helpers in `assets/js/inventoryStatus.js` and `assets/js/salesStatus.js`, financials in `assets/js/modules/financials.js`.

## How To Run
- Open `index.html` in a browser (served from a static host or local file).
- Auth pages: `login.html`, `reset-password.html`.
- Supabase config is in `assets/js/supabase.js`.

## Tests
- Automated: `node tests/run.js`
- Manual status checks: open `docs/status-test.html` in a browser.

## Directory Guide
- `assets/js/` application scripts.
- `assets/js/modules/` feature modules (dashboard, inventory, sales, customers, suppliers, etc.).
- `assets/css/` styles.
- `supabase/migrations/` DB migrations.
- `docs/` reference docs, schemas, and test data.

## Development Notes
- IDs (resource/order) may be supplied by external systems; duplicates are blocked on the client. See `assets/js/store.js`.
- UI uses template literals heavily; escape user/DB data when injecting into `innerHTML`.
- Store arrays are treated as the source of truth; avoid in-place mutation when order matters.

## Contribution Guidelines
- Prefer small, focused changes.
- Avoid adding heavy dependencies unless necessary.
- Keep code ASCII unless the file already uses non-ASCII.

## Data / Supabase
- Inventory: `inventory` table
- Sales: `sales_orders` table
- Customers: `customers` table
- Suppliers: `suppliers` table

## Quick References
- Inventory status logic: `assets/js/inventoryStatus.js`
- Sales status logic: `assets/js/salesStatus.js`
- Financial calculations: `assets/js/modules/financials.js`
