# Changelog

All notable changes to the Cable Inventory Manager will be documented in this file.

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
