# Cable Inventory Manager

> A professional Telecom Resource and P&L Management System for submarine cable inventory and sales order tracking.

## Project Overview

This is a **Single Page Application (SPA)** built with vanilla technologies (HTML/CSS/JS) and backed by **Supabase** for cloud persistence and authentication. The UI follows a **Stripe-inspired** design aesthetic with glassmorphism effects, dual-theme support (light/dark), and comprehensive responsive design.

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vanilla HTML5, CSS3, JavaScript (ES6+) |
| Backend | Supabase (PostgreSQL + Auth + RLS) |
| Icons | Ionicons (ESM) |
| Deployment | Cloudflare Pages / GitHub Pages |

---

## Project Structure

```
cable-inventory/
├── index.html              # Main SPA shell
├── login.html              # Authentication portal
├── reset-password.html     # Password reset page
├── assets/
│   ├── css/
│   │   ├── base/           # Foundation (variables, reset, typography)
│   │   ├── layout/         # Grid, sidebar, header
│   │   ├── pages/          # Page-specific styles (login, dashboard)
│   │   ├── main.css        # Entry point (@import all modules)
│   │   ├── components.css  # Reusable UI components (~17KB)
│   │   ├── responsive.css  # All media queries (~19KB)
│   │   └── utilities.css   # Utility classes
│   └── js/
│       ├── app.js          # Coordinator & Core (~500 lines)
│       ├── store.js        # Supabase data layer (~20KB)
│       ├── auth.js         # Authentication logic
│       ├── supabase.js     # Supabase client config
│       └── modules/        # ES6 Feature Modules
│           ├── dashboard.js        # Dashboard view
│           ├── inventory.js        # Inventory management (~72KB)
│           ├── sales.js            # Sales list view (~36KB)
│           ├── salesForm.js        # Sales form (~162KB, largest module)
│           ├── financials.js       # P&L calculation engine
│           ├── validation.js       # Form validation
│           ├── csv.js              # CSV export utilities
│           ├── customers.js        # Customer CRM
│           ├── suppliers.js        # Supplier SRM
│           ├── bulkOps.js          # Bulk selection & export
│           └── searchableDropdown.js # Reusable dropdown component
├── docs/
│   ├── supabase_schema.sql # Database schema
│   └── test_data.sql       # Sample data
└── supabase/               # Supabase migrations
```

---

## Architecture

### 1. ES6 Module Coordinator Pattern

The application uses a **Coordinator Pattern** where `app.js` acts as the central hub:

```javascript
// app.js imports and coordinates all modules
import { renderDashboard } from './modules/dashboard.js';
import { renderInventory } from './modules/inventory.js';
import { renderSales } from './modules/sales.js';
// ...

const App = {
    renderView(viewName) {
        switch(viewName) {
            case 'dashboard': renderDashboard(this); break;
            case 'inventory': renderInventory(this); break;
            case 'sales':     renderSales(this); break;
            // ...
        }
    }
};

// Global Bridge for HTML onclick handlers
window.App = App;
```

### 2. Context Injection Pattern

Modules receive the `App` object as context to access shared resources:

```javascript
// modules/inventory.js
export function renderInventory(context) {
    const container = context.container;
    const store = window.Store;
    // ...
}
```

### 3. Component Hydration Pattern

Complex components use placeholder-based hydration:

```javascript
// In modal template
<div class="supplier-dropdown-placeholder"></div>

// After modal injection
hydrateSearchableDropdown(
    modal.querySelector('.supplier-dropdown-placeholder'),
    suppliers,
    selectedId
);
```

---

## Key Features

### Dashboard
- Key metrics (capacity, revenue, MRR)
- MRR trend chart (6-month sliding window)
- Margin distribution visualization
- Salesperson leaderboard
- Expiring alerts (90-day window)

### Inventory Management
- Resource tracking (IRU, Lease, Swapped)
- Dynamic status machine: Draft → Available → Sold Out → Expired
- Capacity utilization with progress bars
- Linked Sales Order tracking

### Sales Orders
- 2-column responsive layout (Profitability sidebar + form)
- Real-time margin calculation
- Dual-margin for IRU Resale (Month 1 + Recurring)
- Order renewal with price adjustment
- Multiple cost cards (Cable, Backhaul, Cross Connect)

### CRM/SRM
- Customer and Supplier management
- Searchable dropdowns with real-time filtering
- Relational linking to sales and inventory

---

## Critical Development Patterns

### ✅ DO

1. **Always use `await` for Store operations**
   ```javascript
   await Store.addSalesOrder(newOrder);  // ✅
   this.renderView('sales');
   ```

2. **Use spread operator for data persistence**
   ```javascript
   const newItem = { ...item, id: uuid };  // ✅ Future-proof
   ```

3. **Attach listeners AFTER modal injection**
   ```javascript
   this.openModal(title, content, onSave);
   attachFormListeners();  // ✅ After DOM exists
   ```

4. **Use CSS variables for theming**
   ```css
   background: var(--bg-card);  /* ✅ Theme-aware */
   ```

5. **Use `form.querySelector` in onSave callbacks**
   ```javascript
   onSave: (form) => {
       const value = form.querySelector('#field').value;  // ✅
   }
   ```

### ❌ DON'T

1. **Don't use global selectors in modal callbacks**
   ```javascript
   document.getElementById('some-id');  // ❌ May find wrong element
   ```

2. **Don't hardcode colors**
   ```css
   background: #fff;  /* ❌ Breaks dark mode */
   ```

3. **Don't forget cascading cleanup on delete**
   ```javascript
   // ❌ Leaves orphaned inventory references
   Store.deleteSalesOrder(id);
   
   // ✅ Must also reset linked inventory
   Store.deleteSalesOrder(id);  // Should internally reset inventory status
   ```

4. **Don't use spaces in template literal tags**
   ```javascript
   `< div class="x" >`  // ❌ Renders as text
   `<div class="x">`    // ✅
   ```

---

## Financial Calculation Logic

The system implements a 4-stage P&L calculation:

| Stage | Description |
|-------|-------------|
| **A. Revenue** | MRC (Lease) or Amortized OTC + O&M (IRU) |
| **B. Direct MRC** | 3rd party costs (Cable + Backhaul + XC) |
| **C. Allocated Cost** | Internal asset cost × (Sales Capacity / Total Capacity) |
| **D. Margin** | Revenue - (Direct MRC + Allocated Cost) |

### Sales Types
- **Inventory**: 100% company assets, no external Cable Cost
- **Resale**: Pure pass-through of supplier capacity
- **Hybrid**: Mix of internal + external resources
- **Swapped Out**: Net-zero resource exchange

### Sales Models
- **Lease**: Monthly MRC + NRC
- **IRU**: OTC buy-out + Annual O&M

---

## Responsive Breakpoints

| Tier | Width | Layout |
|------|-------|--------|
| Mobile | < 1024px | Stacked, vertical navigation |
| Tablet | 1024-1200px | Dual-column consolidation |
| Desktop | > 1200px | Full 3-column with sidebar |
| Ultra-wide | > 1400px | Expanded modals |

---

## Local Development

```bash
# Start local server
npx serve .

# Or with Python
python -m http.server 3000

# Open browser
open http://localhost:3000
```

### Supabase Setup
1. Create project at supabase.com
2. Run `docs/supabase_schema.sql` in SQL Editor
3. Update `assets/js/supabase.js` with your keys

---

## Common Debugging

| Symptom | Likely Cause |
|---------|--------------|
| Blank screen on load | Syntax error in `app.js` preventing global `App` |
| Buttons don't work | `window.App` not defined, check console |
| Modal saves nothing | Using `document.getElementById` instead of `form.querySelector` |
| Data doesn't persist | Missing `await` on Store method |
| Theme looks broken | Hardcoded colors instead of CSS variables |
| Stale status shown | Not recalculating status on render |

---

## Version History

| Version | Milestone |
|---------|-----------|
| v1.7.x | Modular CSS architecture, legacy cleanup |
| v1.5.0 | Sales Order Renewal, Searchable Dropdowns |
| v1.3.0 | ES6 Module extraction from monolith |
| v1.2.0 | Supabase migration (PostgreSQL + Auth) |

---

## External Resources

- **Live Demo**: Deployed on Cloudflare Pages / GitHub Pages
- **Blog Post**: [造个轮子：海缆库存管理系统](https://blog.legionc.xyz/posts/cable-inventory-manager/)
- **Repository**: [github.com/263Global/cable-inventory](https://github.com/263Global/cable-inventory)

---

## License

MIT License - See [LICENSE](LICENSE) for details.
