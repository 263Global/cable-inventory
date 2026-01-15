# Changelog

All notable changes to the Cable Inventory Manager will be documented in this file.

## [1.7.1] - 2026-01-15

### Security
- **XSS Prevention** - Added `escapeHtml()` utility to sanitize user-supplied data before rendering to DOM
  - Prevents script injection via customer names, cable system names, and other user input
  - Applied to `sales.js` and `inventory.js` table renders

### Fixed
- **Sales Status Filter** - Changed `Churned` to `Expired` to match auto-calculated status
- **Inventory Status Filter** - Updated options from `Active/Pending` to `Available/Draft/Sold Out/Expired` to match computed statuses
- **Handoff Type Toggle** - Fixed selector from `#handoff-type-select` to `[name="handoffType"]`
- **Delete Actions** - Now use proper async handlers with confirmation dialogs
  - Fixed `renderInventoryView()` → `renderView('inventory')` bug

---

## [1.7.0] - 2026-01-14

### Changed
- **CSS Modular Architecture** - Refactored monolithic CSS (2500+ lines) into 12 modular files
  - `base/` - Variables, reset, typography
  - `layout/` - Grid, sidebar, header
  - `pages/` - Login, reset-password, dashboard
  - `utilities.css` - Utility classes
  - `responsive.css` - All media queries consolidated
  - `main.css` - Single entry point with `@import`

### Improved
- **Login Page Design** - Optimized proportions for desktop and mobile
  - More compact card layout (420px → 380px)
  - Reduced padding and font sizes
  - Better responsive breakpoints (480px, 360px)
- **Mobile Search Box** - Smaller font size on mobile (900px and below)

### Removed
- **Deleted `style.css`** - 1684 lines removed (fully replaced by modular structure)

---

## [1.6.0] - 2026-01-14

### Added
- **Simple Dropdown Component** - Non-searchable custom dropdown for static option lists
  - Consistent styling with searchable dropdowns (blue border, hover states)
  - Eliminates native macOS dropdown appearance for unified UI
  - Reusable `renderSimpleDropdown` and `initSimpleDropdown` functions

### Changed
- **Sales Form Dropdowns** - All native selects converted to custom dropdowns:
  - Sales Model (Lease / IRU)
  - Sales Type (Resale / Hybrid / Inventory / Swapped Out)
  - Capacity Unit (Gbps / Wavelength / Fiber Pair)
  - Linked Resource (dynamic resource list)
  - Salesperson (team member list)
- **Inventory Form Dropdowns** - All native selects converted to custom dropdowns:
  - Status (Draft / Available / Sold Out / Expired)
  - Acquisition Type (Purchased / Swapped In)
  - Ownership (Leased / IRU)
  - Segment Type (Capacity / Fiber Pair / Spectrum / Backhaul)
  - Handoff Type (OTU-4 / 100GE / 400GE / Other)
  - Capacity Unit (Gbps / Tbps / Fiber Pair / Half Fiber Pair / GHz)
  - Protection (Unprotected / Protected)

---

## [1.5.0] - 2026-01-14

### Added
- **Searchable Dropdown Component** - New reusable dropdown with search/filter functionality
  - Input-style trigger that becomes search box when clicked
  - Type to filter options in real-time
  - Blue border connects input and options list as unified component
  - Hover state highlights option text in blue for better visibility
  - Mobile responsive design
- **Renewal Price Adjustment** - Update pricing during contract renewal
  - Shows current MRC and NRC with original price labels
  - Allows editing prices for discounts or increases
  - Toast notification shows price changes when saved

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
