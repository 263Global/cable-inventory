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
- **Swapped Out**: Market-priced swap out (profit/loss possible)

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

## Data Models

### Inventory Item (Resource/Cost Side)

| Field | DB Column | Description |
|-------|-----------|-------------|
| `resourceId` | `resource_id` | Primary Key |
| `status` | `status` | Draft, Available, Sold Out, Expired |
| `acquisitionType` | `acquisition_type` | Purchased, Swapped In |
| `ownership` | `ownership` | Leased, IRU |
| `supplierId` | `supplier_id` | FK to Suppliers table |
| `segmentType` | `segment_type` | E2E, Segment, Backhaul, Spectrum |
| `capacity.value/unit` | `capacity_value/unit` | e.g., 100 Gbps |
| `location.aEnd/zEnd` | `a_end_*/z_end_*` | `{ country, city, pop, device, port }` |
| `mrc/otc/nrc` | `mrc/otc/nrc` | Financial costs |
| `dates.start/end` | `start_date/end_date` | Contract period |
| `costMode` | `cost_mode` | `single` or `batches` |
| `baseCost.*` | `base_*` | Base cost pool for batch mode (orderId/model/mrc/otc/omRate/annualOm/termMonths) |
| `batches.*.omRate` | `inventory_batches.om_rate` | Batch O&M rate (Annual O&M derived) |

### Sales Order (Revenue Side)

| Field | DB Column | Description |
|-------|-----------|-------------|
| `salesOrderId` | `sales_order_id` | Primary Key (SO-XXXX) |
| `inventoryLink` | `inventory_link` | FK to Inventory |
| `customerId` | `customer_id` | FK to Customers table |
| `salesModel` | `sales_model` | "Lease" or "IRU" |
| `salesType` | `sales_type` | Resale, Inventory, Hybrid, Swapped Out |
| `batchAllocations` | `sales_order_batches` | Capacity allocations per batch |
| `financials.mrcSales` | `mrc_sales` | Lease revenue (Swapped Out = market MRC) |
| `financials.nrcSales` | `nrc_sales` | Lease one-time revenue (Swapped Out = market NRC) |
| `financials.otc` | `otc` | IRU OTC revenue (Swapped Out = market OTC) |
| `financials.annualOm` | `annual_om` | IRU O&amp;M revenue (Swapped Out = market O&amp;M) |
| `costs.cable` | JSON | `{ supplier, mrc, otc, omRate, ... }` |
| `costs.backhaulA/Z` | JSON | Backhaul cost cards |
| `costs.crossConnectA/Z` | JSON | Cross-connect cost cards |

### Stakeholder Entities (CRM/SRM)

| Table | Key Fields |
|-------|-----------|
| **Customers** | `id`, `short_name`, `full_name`, `company_type`, `contact_*` |
| **Suppliers** | `id`, `short_name`, `full_name`, `portal_url`, `contact_*` |

---

## iOS Safari Compatibility

Safari on iPhone requires special handling:

### Safe Area (Notch/Dynamic Island)

```html
<!-- Required in <head> -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
```

```css
/* Bottom navigation must account for safe area */
.sidebar {
    position: fixed !important;
    bottom: 0 !important;
    padding-bottom: calc(0.5rem + env(safe-area-inset-bottom, 0px));
    -webkit-transform: translateZ(0);  /* GPU acceleration */
}

/* Main content needs clearance for fixed nav */
.main-content {
    padding-bottom: calc(90px + env(safe-area-inset-bottom, 0px));
    overflow: visible;  /* Required for Safari address bar collapse */
}
```

### Common Safari Pitfalls

| Issue | Solution |
|-------|----------|
| Address bar won't collapse | Set `overflow: visible` on scrollable container |
| Fixed nav overlaps content | Use `env(safe-area-inset-bottom)` |
| Elements flicker on scroll | Add `-webkit-transform: translateZ(0)` |

---

## Supabase Configuration

### Authentication Setup

```javascript
// supabase.js - Correct SDK v2 pattern
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.SupabaseClient = supabaseClient;
```

### Critical Dashboard Settings

| Setting | Location | Value |
|---------|----------|-------|
| **Site URL** | Auth > URL Configuration | Your production URL (not localhost!) |
| **Redirect URLs** | Auth > URL Configuration | Add `/reset-password.html` |
| **Allow Signups** | Auth > Providers > Email | **OFF** for internal tools |

### Password Reset Flow

The system requires a **Pre-Auth Redirector** in `index.html`:

```javascript
// At top of index.html script - redirects auth tokens to reset page
const hashParams = new URLSearchParams(window.location.hash.substring(1));
const type = hashParams.get('type');

if (type === 'invite' || type === 'recovery') {
    window.location.href = 'reset-password.html' + window.location.hash;
    return;
}
```

---

## Naming Conventions

### JavaScript Variables

| Type | Pattern | Example |
|------|---------|---------|
| State/Data | `*Value` | `statusValue`, `searchQuery` |
| DOM Element | `*Element` or `*Filter` | `statusFilter`, `searchInput` |
| Module Function | `render*`, `open*Modal` | `renderInventory`, `openAddSalesModal` |

### CSS Classes

| Type | Pattern | Example |
|------|---------|---------|
| Component | `.component-name` | `.card`, `.modal`, `.btn` |
| State | `.is-*` or `.has-*` | `.is-active`, `.has-error` |
| Responsive | `.*-hidden` | `.mobile-hidden`, `.tablet-only` |

---

## Additional Gotchas

### 1. Variable Redeclaration in View Functions

```javascript
// ❌ ERROR: Cannot redeclare block-scoped variable
renderSales(filters = {}) {
    const statusFilter = filters.status;
    const statusFilter = document.getElementById('status-filter');  // Crash!
}

// ✅ Use different names for values vs elements
renderSales(filters = {}) {
    const statusValue = filters.status;          // Data
    const statusFilter = document.getElementById('status-filter');  // DOM
}
```

### 2. Button Duplication on Re-render

```javascript
// ❌ Buttons multiply on every search keystroke
renderInventory() {
    this.headerActions.appendChild(addBtn);
}

// ✅ Clear container first
renderInventory() {
    this.headerActions.innerHTML = '';  // Reset!
    this.headerActions.appendChild(addBtn);
}
```

### 3. Modal Stacking in Detail Navigation

```javascript
// ❌ New modal appears behind current one
<button onclick="App.viewSalesDetails('${id}')">View</button>

// ✅ Close current modal first
<button onclick="App.closeModal(); App.viewSalesDetails('${id}')">View</button>
```

### 4. Edit Mode ID Protection

```javascript
// ❌ User changes ID → update fails to find record
<input type="text" name="orderId" value="${order.id}">

// ✅ Make ID readonly in edit mode
<input type="text" name="orderId" value="${order.id}" 
       ${isEditMode ? 'readonly style="background: var(--bg-card-hover);"' : ''}>
```

### 5. Cost Card Hydration in Edit Mode

```javascript
// ❌ Cost cards appear empty even with data
if (isEditMode) {
    // Only populates hidden inputs
}

// ✅ Trigger UI creation + populate visible fields
if (isEditMode && data.costs?.cable) {
    document.querySelector('.add-cable-btn').click();  // Create card
    setTimeout(() => {
        populateField('[name="costs.cable.mrc"]', data.costs.cable.mrc);
        this.calculateSalesFinancials();
    }, 100);  // Wait for DOM
}
```

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
- **Repository**: [github.com/263Global/cable-inventory](https://github.com/263Global/cable-inventory)

---

## License

MIT License - See [LICENSE](LICENSE) for details.
