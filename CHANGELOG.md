# Changelog

All notable changes to the Cable Inventory Manager will be documented in this file.

## [1.5.0] - 2026-01-14

### Added
- **Searchable Dropdown Component** - New reusable dropdown with search/filter functionality
  - Input-style trigger that becomes search box when clicked
  - Type to filter options in real-time
  - Blue border connects input and options list as unified component
  - Hover state highlights option text in blue for better visibility
  - Mobile responsive design

### Changed
- **Customer Dropdown** - Sales form now uses searchable dropdown (same as Supplier)
- **Supplier Dropdown** - Updated all cost card supplier fields with new component
  - Works in Inventory form and all Sales form cost cards
  - Show label and subtitle (short name + full name)

---

## [1.4.0] - 2026-01-14

### Added
- **Sales Order Renewal** - New "Renew" button on sales list and order details view
  - Opens compact modal to configure new contract dates
  - Preserves original Order ID during renewal
  - Auto-calculates new end date based on start date + term
  - Status auto-updates based on new contract period
- **Smart Field Logic** - Linked Resource field visibility based on Sales Type:
  - Hidden for Resale (external resource, no inventory link needed)
  - Optional for Swapped Out
  - Required for Inventory and Hybrid

### Changed
- **Form Layout Optimization** - Sales Model & Type moved to top of Sales Information section
  - These fields now appear first since they control other field behaviors
  - Improved logical flow: classification → details → financials
- **Contract Period Calculation** - Fixed end date calculation for all forms
  - Now correctly calculates last day of term (e.g., 2025/1/1 + 12 months = 2025/12/31)
  - Previously incorrectly showed first day of next period (2026/1/1)

### Fixed
- Contract end date calculation in Sales Form (3 locations)
- Contract end date calculation in Inventory Form
- Contract end date calculation in Renewal Modal

---

## [1.3.0] - 2026-01-14

### Added
- **ES6 Module Architecture** - Migrated view logic to ES6 modules with `import/export` syntax
  - `modules/dashboard.js` - Dashboard rendering (~290 lines)
  - `modules/inventory.js` - Inventory management (~860 lines)
  - `modules/sales.js` - Sales list view (~553 lines)
  - `modules/salesForm.js` - Sales form + financial calculations (~1,780 lines)

### Changed
- **Massive Code Reduction** - Main `app.js` reduced from 3,633 to 514 lines (**-86%**)
- **Context Parameter Pattern** - All ES6 module functions receive `context` (App object) for shared state access
- **Module Script Loading** - Updated `index.html` to use `type="module"` for proper ES6 module support

### Technical
- Global bridge pattern (`window.App = App`) maintained for HTML onclick handler compatibility
- Thin delegation methods in `app.js` route to ES6 module functions
- All modules pass Node.js syntax validation

---

## [1.2.0] - 2026-01-13

### Added
- **Modular Architecture** - Extracted core functionality into separate modules for better maintainability
  - `modules/financials.js` - Financial calculation engine
  - `modules/validation.js` - Form validation utilities
  - `modules/csv.js` - CSV export functions
  - `modules/customers.js` - Customer CRM module
  - `modules/suppliers.js` - Supplier CRM module
  - `modules/bulkOps.js` - Bulk selection and export operations
- **Code Region Comments** - Added `//#region` markers for IDE code folding support

### Changed
- **Code Organization** - Main `app.js` reduced from 4662 to 3945 lines (~15% reduction)
- **Delete Behavior** - Customer and Supplier delete buttons now work like Sales/Inventory (no confirmation popup)

### Fixed
- **Duplicate Buttons** - Fixed issue where re-rendering Customers/Suppliers page would duplicate the "Add" button

---

## [1.1.0] - 2026-01-12

### Added
- **MRR Trend Chart** - 6-month revenue trend visualization on Dashboard
- **Margin Distribution Chart** - Visual breakdown of orders by profit margin (High ≥50%, Mid 20-50%, Low <20%)
- **CSV Export** - Export Sales and Inventory data to CSV files
- **Expiring Soon Filter** - New filter option in Sales and Inventory pages for contracts expiring within 90 days
- **Capacity Unit** - Dashboard now displays capacity in Gbps
- **Status Filter** - Inventory page now has a status dropdown filter
- **Clickable Expiry Links** - "+N more" on Dashboard expiry cards now navigates to filtered list view

### Changed
- **Dashboard Card Order** - Reordered to: MRR Trend → Margin Distribution → Sales by Type → Leaderboard + Export
- **MRR Calculation** - Dashboard MRR now validates contract dates (excludes expired contracts even if status is Active)
- **Unified MRR Logic** - Dashboard MRR and MRR Trend now use identical calculation logic

### Removed
- **Backup Data Button** - Removed in favor of new CSV export functionality

### Fixed
- **MRR Consistency** - Dashboard MRR and MRR Trend (current month) now show consistent values
- **Profit Calculation** - Corrected to use actual revenue field (mrcSales) instead of totalMrr

---

## [1.0.0] - 2026-01-08

### Initial Release
- Dashboard with key metrics (Capacity, MRR, Orders, Profit)
- Inventory management with IRU/Lease/Swapped resources
- Sales order tracking with multi-cost card system
- 3-column sales form layout with real-time profitability analysis
- Dual-margin analysis for IRU Resale orders
- Supabase backend with authentication
- Responsive design for mobile devices
