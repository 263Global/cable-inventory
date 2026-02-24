# Changelog

All notable changes to CableTrack will be documented in this file.

## [2.4.0] - 2026-02-24

### Added — Atomic ID Generation
- **Database sequences + triggers** for `resource_id` (RES-XXXXX) and `order_id` (SO-XXXXX) — eliminates race conditions from client-side read-then-increment pattern
- Migration `020_atomic_id_sequences.sql`: creates `resource_id_seq`, wires existing `sales_order_seq`, adds `BEFORE INSERT` triggers on both tables
- Safe regex extraction handles non-standard historical IDs gracefully
- `CREATE SEQUENCE IF NOT EXISTS` guard for environments where migration 016 may not have run

### Refactored — Code Splitting & Module Decomposition
- **App.tsx**: route-level code splitting with `React.lazy` + `Suspense`
- **Sales API**: decomposed 670-line `api.ts` → `api/{capacity,circuits,items,lifecycle,orders,shared}.ts` with barrel re-export
- **Sales Form**: extracted `form-helpers.ts` (draft/payload types + factories), `form-api.ts` (reference data queries, circuit fetching)
- **Inventory**: extracted `form-batches.ts`, `BatchField` component, added `fetchLinkedSalesItems`, `fetchCountryIdByName`
- **Dashboard**: extracted `api.ts`, `types.ts`, `useDashboardData` hook
- **CRM**: new `api.ts` for customer/supplier shared logic
- **Reference Data**: extracted `ReferenceDataTable` component
- **Shared Utils**: `contract-utils.ts` (timezone-safe `formatDateOnly`, batch calculations), `supabase-utils.ts` (`assertNoError`), `status-styles.ts`
- **Custom Hooks**: `useClickOutside`, `usePersistentColumnVisibility`

### Changed
- `assertNoError` pattern replaces all `if (error) throw error` across Supabase calls with contextual error messages
- `createInventoryResource` no longer generates `resource_id` client-side — DB trigger handles it
- `createSalesOrder` `order_id` now optional — DB trigger auto-assigns on insert
- `SalesFormPage` no longer pre-generates order ID on mount; shows ID after creation
- React keys changed from index-based to stable composite keys
- N+1 query fix: batch circuit loading in `fetchOrderItems`

### Added — Tests
- `contract-utils.test.ts`: unit tests for date formatting, parsing, calculations, and status suggestions

## [2.3.1] - 2026-02-24

### Added — Mobile Responsive

- **Collapsible Sidebar**: 手机端侧边栏隐藏，左上角 ☰ 汉堡按钮打开覆盖式菜单
- **Layout 适配**: 手机端去掉 `ml-64`，padding 缩小，顶部留空给汉堡按钮
- **Sales 列表卡片**: `<md` 显示卡片（Order ID + 状态徽章 + 客户 + 日期），`≥md` 保留表格
- **Inventory 列表卡片**: `<md` 显示卡片（Resource ID + 类型/状态徽章 + 海缆系统 + 容量进度条），`≥md` 保留表格
- **SalesDetailPage**: header 按钮自动换行，Expired 提醒条垂直堆叠

### Changed
- Customers / Suppliers 已为卡片式，无需改动


## [2.3.0] - 2026-02-24

### Added — Per-Item Termination & Resource Release

**Database**
- Migration `019_item_termination.sql`: added `terminated_at` (DATE) and `termination_fee` (NUMERIC) to `sales_order_items` table

**Per-Item Termination** (`SalesDetailPage.tsx`, `sales/api.ts`)
- Terminate modal redesigned: checkbox per item, early termination fee (ETF) input per item
- Selective termination: only selected items are terminated, circuits released, capacity recalculated
- Smart order status: order becomes `Terminated` only if all items terminated, stays `Active` otherwise
- Terminated items display red badge with date and ETF amount on detail page

**Release Button — Expired Orders**
- New amber-themed 🔓 Release button for Expired orders (replaces Terminate)
- Simplified modal: checkboxes only, no reason/fee fields needed
- Expired warning banner with "续约 Renew" + "释放资源 Release" action buttons
- Header shows only Edit/Delete for Expired orders (actions in banner, no duplication)

**Selective Renewal**
- Renew modal now has per-item checkboxes (default selected)
- Unselected items visually disabled; confirm button disabled if none selected
- Cross-Connect items default to "Lease Out" for renewal eligibility

**Dashboard Improvements**
- Expired-order alert: amber banner listing orders still holding resources, with clickable links
- Capacity by Resource: sorted by utilization (high→low), limited to Top 10, excludes Terminated/Expired
- "查看全部 X 个资源 →" link when >10 resources

### Changed
- `terminateSalesOrder()` signature updated: now accepts `items` array with `{itemId, selected, terminationFee}`
- `SalesOrderItem` type extended with `terminated_at` and `termination_fee` fields

## [2.2.0] - 2026-02-24

### Added — Terminate / Cancel / Renew

**Database**
- Migration `018_termination_renewal.sql`: added `terminated_at` (DATE), `termination_reason` (TEXT), `renewal_history` (JSONB, default `'[]'`) to both `sales_orders` and `inventory_resources` tables
- New TypeScript type `RenewalSnapshot` in `src/types/index.ts`

**Business Rules** — 按类型区分操作可用性

| 类型 | Cancel | Terminate | Renew |
|------|--------|-----------|-------|
| Lease / Lease Out | Pre-sold | Active | ✅ |
| IRU / IRU Out | Pre-sold | Active | ❌ (不可撤销) |
| Swap-In / Swap Out | Pre-sold | Active | ✅ |
| Owned | — | — | — |
| Self Use | — | Active | — |
| NRC | — | — | — |

**Sales Module** (`SalesDetailPage.tsx`, `sales/api.ts`)
- **Cancel** 按钮: Pre-sold 状态时显示, 状态改 Cancelled, 释放电路, 刷新容量
- **Terminate** 按钮: Active 状态时显示, 填写终止日期和原因, 状态改 Terminated, 全部 item 同步终止, 解绑电路, 刷新容量
- **Renew** 按钮: Active/Expired 且有 Lease Out 或 Swap Out item 时显示; 混合订单只列出可续约 item (IRU Out 和 NRC 自动跳过); 可编辑新起始日/合同期/MRC/NRC; 旧合同快照存入 `renewal_history`
- 详情页新增 **Termination Info** 区域 (红色边框) 和 **Renewal History** 区域 (按时间倒序)
- API: `cancelSalesOrder()`, `terminateSalesOrder()`, `renewSalesOrder()`

**Inventory Module** (`InventoryDetailPage.tsx`, `inventory/api.ts`)
- **Terminate** 按钮: acquisition_type ≠ Owned 且状态非 Terminated/Expired 时显示; 弹窗中先查询关联的 Active/Pre-sold Sales Orders 和 Allocated 电路数量; 有关联时弹出**黄色警告**列表; 确认后: 释放电路 (Available), 删除 `sales_item_circuits` 关联行, 资源 `used_capacity` 清零, 状态改 Terminated
- **Renew** 按钮: Lease 或 Swap-In 时显示; Lease 续约编辑 MRC/NRC; **Swap-In 续约编辑 OTC/O&M Rate** (自动算 annual_om_cost); 旧合同快照存入 `renewal_history`
- 详情页新增 **Termination Info** 和 **Renewal History** 区域
- API: `checkLinkedSalesOrders()`, `terminateInventoryResource()`, `renewInventoryResource(costs?)` — 接受 `{mrc, nrc}` 或 `{otc, om_rate}` 对象

### Changed
- `renewInventoryResource()` 签名改为接受 `costs` 对象而不是独立参数, 支持 Lease (MRC/NRC) 和 Swap-In (OTC/O&M) 两种费用模式
- `SalesDetailPage.tsx` 完全重写, 加入 3 个弹窗 (Cancel / Terminate / Renew) 和历史展示

## [2.1.0] - 2026-02-24

### Added
- **Dashboard** — Real dashboard replacing the "Under Construction" placeholder
  - 4 KPI cards: Total Resources, Total Capacity (with utilization %), Active Orders, Expiring Soon (90d)
  - Capacity by Resource panel with per-resource utilization bars
  - Sales Pipeline stacked bar chart with legend (Draft / Pre-sold / Active / Expired / Terminated / Cancelled)
  - Expiring Contracts panel showing items expiring within 90 days with days-remaining countdown
  - Recent Activity panel showing latest 10 sales orders
  - Dashboard is now the default landing page and first sidebar item
- **Backhaul Circuit Picker** — Backhaul sales items now support circuit selection, same as Capacity
- **Terrestrial Handover in Dropdown** — Sales form resource dropdown shows handover A → Z for Terrestrial resources
- **Provisioned Circuit Hint** — Base+Batch capacity breakdown shows how many circuits are provisioned when not all capacity has circuits

### Fixed
- **Capacity Usage After Allocation** — Sales form now calls `recalcInventoryCapacity` after circuit allocations, fixing capacity bars stuck at 0%
- **Capacity Bar Color Consistency** — Allocated portion always amber (was green under 50%), red only at 100%. Unified across list and detail pages

### Changed
- **Sales Circuit Picker Handover** — Circuit selection cards display handover locations (e.g. Equinix HK1 → HKIX) when routes differ

---

## [2.0.1] - 2026-02-23

### Refactored
- **AuthContext Split** — Separated `AuthContext.tsx` into three single-responsibility files:
  - `auth-context.ts` (type + createContext), `useAuth.ts` (hook), `AuthContext.tsx` (provider only)
  - Updated imports in `App.tsx`, `Sidebar.tsx`, `LoginPage.tsx`
- **BatchField Logic Extraction** — Extracted display/save logic into pure functions in `batchField.ts`
- **ReferenceData Search Extraction** — Extracted search/filter logic into `search.ts`

### Fixed
- **BatchField Editing Bug** — Editing a batch field value no longer gets overwritten by prop sync mid-keystroke; introduced `isEditing` state so the input shows the local draft while focused and the prop value when blurred
- **ReferenceData Search** — Search now prioritises the configured `searchKey` before falling back to all string fields; added `trim()` to prevent whitespace-only queries from filtering results

### Added
- **Unit Test Infrastructure** — Node.js native test runner (`node --test`) with TypeScript compilation via `tsconfig.test.json`
  - `npm test` script compiles to `.tmp-tests/` then runs tests
  - `tests/unit/batch-field.test.ts` — covers `getBatchFieldDisplayValue` and `shouldSaveBatchField`
  - `tests/unit/reference-search.test.ts` — covers `matchesReferenceSearch`
- **Vite Type Declarations** — Added `src/vite-env.d.ts` for Vite client types

---

## [2.0.0] - 2026-02-23

### 🔄 Complete Rewrite — React + TypeScript + Vite

**Architecture**
- Migrated from vanilla JS (21k+ lines) to React 18 + TypeScript + Vite
- Dark-themed UI with Tailwind CSS custom design system
- Supabase Auth with Row-Level Security

**Inventory**
- Circuit-level tracking with interface types and status indicators
- Base+Batch capacity management with auto-calc
- Terrestrial type: hides Cable System / Landing Station
- Delete protection: blocks deletion when active orders linked
- Status labels shortened: "Partially Used" → "Partial", "Fully Used" → "Full"

**Sales**
- Type-aware item forms: Capacity, Backhaul, Cross-Connect, NRC, Other
- Circuit picker for Capacity items
- Backhaul: filters Terrestrial-only resources
- Cross-Connect/NRC/Other: Description required, conditional MRC/NRC/Term
- Auto status transitions: Pre-sold → Active, Active → Expired
- Removed Local Access item type

**General**
- Page title: "CableTrack"
- Removed 96 legacy files
- Searchable dropdowns for all entity selectors

## [1.16.0] - 2026-02-12

### Added
- **Mobile Card View for Customers & Suppliers** - CRM entity lists now display as cards on mobile
  - Each card shows Short Name (bold) + Full Name from hidden columns via `mobile-card-meta`
  - Edit and Delete icon buttons via `mobile-card-actions`
  - Import button hidden on mobile via `mobile-hidden` class

### Changed
- **Mobile Sales/Inventory Card Fixes** - Resolved multiple card layout regressions
  - Action buttons evenly distributed across card width (was squeezed to right)
  - Hidden overflow cells (Revenue, Margin, Margin%, Salesperson) that caused extra "long cards"
  - Removed ghost background from `.table-container` card styling on mobile
  - Removed gray lines from inventory card actions border
  - Import button hidden on mobile for Sales and Inventory pages
- **Mobile Detail Page Layout** - Optimized Sales detail view for narrow screens
  - Contract Summary grid: 4-column → 2×2 layout to prevent number wrapping
  - Contract Period section: Renew/Terminate buttons stack below title instead of inline
- **Desktop Action Dropdown** - Added missing CSS for `.action-dropdown` kebab menu
  - Dropdown properly hidden by default, shown on `.open` toggle

### Fixed
- **Mobile Linked Sales View Button** - View button on inventory detail's Linked Sales Orders section was invisible on mobile
  - Root cause: generic `space-between` CSS override forced column layout on the sales row
  - Changed row layout to `flex-wrap` with `linked-sale-row` class excluded from the override
  - Added `padding-bottom: 5rem` to `.modal-body` so the bottom nav bar no longer clips the last section
- **Mobile FAB Scroll-Shrink** - Floating action button shrinks and fades during scroll
  - Base size reduced from 56px to 44px (40px on small screens)
  - During scroll: shrinks to 36px and fades to 40% opacity
  - Restores to full size 300ms after scroll stops
  - Smooth CSS transitions for all states

---

## [1.15.0] - 2026-02-12

### Changed
- **Sales Renewal Modal Redesign** - Per-cost renewal with independent date management
  - Each cost component (Cable, Backhaul, Cross-Connect, Other) has its own checkbox for selective renewal
  - Independent start date, term, and auto-calculated end date per cost item
  - Costs expiring within 90 days of customer contract end are auto-selected for renewal
  - One-time-only costs (e.g. Other with only `oneOff` fee) marked as non-renewable and disabled
  - NRC/one-off fees auto-zeroed on renewal with original value shown as reference
  - Costs section always visible (no longer hidden behind collapsible accordion)
  - Replaced emoji icons with `ion-icon` SVGs for professional appearance
  - Info note explaining auto-selection logic and one-time fee zeroing

---

## [1.9.0] - 2026-02-12

### Added
- **Inventory Early Termination** - Terminate inventory resources before contract end date
  - Terminate option in kebab dropdown for non-terminated items
  - Modal with date picker and optional reason field
  - Sets status to "Terminated" and records termination date/reason
  - DB migration `008_add_inventory_termination_renewal.sql` adds `terminated_at`, `termination_reason`, `renewal_history` columns
- **Inventory Renewal** - Renew inventory resource contracts with updated dates and costs
  - Renew option in kebab dropdown for all items
  - Modal with new start date, contract term, auto-calculated end date
  - Optional MRC/NRC/OTC cost adjustments based on ownership type
  - Renewal history snapshots stored as JSONB
  - Clears termination state and resets status to "Available"
- **Inventory Kebab Menu** - Action buttons replaced with View + Edit + ⋮ dropdown (Renew / Terminate / Delete)
  - Matches sales page kebab pattern with fixed positioning and click-outside dismiss
- **Module Cache Busting** - `APP_VERSION` constant in `app.js` appended to all dynamic `import()` calls
  - Prevents stale ES Module cache after code updates
  - Version also set on `<script>` tag in `index.html`

### Changed
- **Dashboard Profit** - Rounded to integer (no decimal places)
- **Dashboard MRR Trend** - Replaced bar chart with SVG line + area chart
  - Dynamic Y-axis baseline (starts near minimum value, not zero) for visible trend differences
  - Gradient area fill, data point circles, and per-point value labels
  - Removed Y-axis text labels to reduce clutter

### Improved
- **UI Readability** - Global typography and color contrast improvements
  - Sidebar active item uses primary accent color
  - Login page button uses primary blue instead of purple
  - Consistent font sizing across dashboard metric cards
  - Better header and navigation color alignment

---

## [1.8.4] - 2026-02-12

### Fixed
- **Date Boundary Off-by-One** - Date-only strings (e.g. `2026-02-12`) are now parsed as local time with end dates set to `23:59:59.999`, preventing items from showing Expired on their end date afternoon
- **Event Listener Leaks** - Sales list dropdown, cost-type menu, and searchable/simple dropdown `document.click` handlers are now properly cleaned up on re-render and modal close
- **XSS Hardening** - Sales detail modal now escapes all user-supplied text (labels, notes, dates, supplier info) via `safeText()` wrapper
- **Inventory Status `terminatedAt`** - `getSaleStatus` in `inventoryStatus.js` now passes `terminatedAt` to `computeSalesStatus`

### Tests
- **Date-Inclusive End Date** - Added tests for `computeSalesStatus`, `computeInventoryStatus`, and `isExpiringWithin` verifying same-day date-only expiry
- **StatusUi Coverage** - `statusUi.js` now loaded in test runner

---

## [1.8.3] - 2026-02-12

### Added
- **Early Termination** - Sales orders can be terminated before contract end date
  - New Terminate button (⊘) for Active orders in list and detail views
  - Termination modal with date picker and optional reason field
  - "Terminated" status filter in sales list dropdown
  - Terminated orders excluded from MRR, capacity, inventory status, and CSV export
  - `badge-terminated` CSS style (gray + line-through)
  - DB migration `007_add_termination_fields.sql` adds `terminated_at` and `termination_reason` columns
- **Sales List Kebab Menu** - Action buttons refactored to prevent overflow on narrow screens
  - View + Edit always visible, Renew/Terminate/Delete in `⋮` dropdown
  - Click-outside auto-dismiss, 150ms animation, z-index:50
- **Enriched Cost Breakdown** - Sales detail modal shows comprehensive cost info
  - Supplier names resolved from UUIDs to human-readable names
  - Order No. displayed for all cost types (cable, backhaul, XC, other)
  - Contract term (months) shown alongside date range
  - Notes displayed (📝) when present
  - Shared `renderCostCard()` helper for consistent layout
- **Agent Guidance** - `AGENTS.md` with architecture, workflows, and testing references
- **Automated Test Runner** - `tests/run.js` for status and financial calculation checks
- **Regression Checklist** - `docs/regression-checklist.md` for manual QA coverage
- **Inventory Batch Mode** - Batch-based cost tracking with base cost pool + staged lighting batches
- **Batch Allocation** - Sales orders can auto-allocate (or manually override) capacity across active batches
- **Batch Data Tables** - New `inventory_batches` and `sales_order_batches` tables in Supabase schema
- **Incremental Migration** - `docs/migrations/2026-01-29-add-om-rate.sql` for O&M rate columns
- **CSV/Excel Bulk Import** - Import data via CSV or Excel files across all modules
  - Customers, Suppliers, Inventory, and Sales supported
  - 3-step wizard: Download Template → Upload File → Validate & Import
  - Drag & drop file upload with format detection
  - Schema-based validation with error highlighting
  - Foreign key resolution (Supplier/Customer short_name → UUID)
  - PapaParse (CSV) and SheetJS (Excel) via CDN

### Changed
- **Dashboard Capacity Card** - Split single capacity display into dual-row layout showing INV (inventory utilization with progress bar) and RSL (resale volume in Gbps); resale orders without inventory links now contribute to the RSL metric
- **Computed Status Everywhere** - Sales and inventory status is now dynamically computed from contract dates instead of relying on stored `status` field
  - Dashboard, sales list, sales details, CSV/bulk exports all use `computeSalesStatus()`
  - Inventory exports use `computeInventoryStatus()` for accurate status
  - MRR trend chart no longer filters by stored status — computed status drives all revenue calculations
- **Expired Sales Exclusion** - `buildSalesIndex` and `getSoldCapacity` now exclude expired sales, ensuring sold capacity reflects only active/pending orders
- **Import Data Model Alignment** - `transformRowForStore` outputs nested structures (`capacity`, `location`, `financials`, `dates`) matching the Store API; added `computeEndDate()` and `normalizeOwnership()` helpers
- **Resource Status Auto-Refresh** - `updateSalesOrder` automatically refreshes linked resource status when inventory link changes, keeping inventory usage fields in sync
- **Sales Ordering** - Avoid in-place sorting to keep store ordering stable
- **Latest Sale Resolution** - Determine most recent sale using `created_at` or contract start date
- **ID Validation** - Block duplicate external Order/Resource IDs on create
- **Dropdown Escaping** - Searchable dropdown options and attributes are now sanitized
- **Sales Form Split** - `salesForm.js` decomposed into focused modules with a re-export facade
- **Sales Modal Split** - Extracted renew flow (`renewModal.js`) and edit-mode cost hydration logic (`editCostHydration.js`) from `salesForm/modal.js`
- **Sales Modal Dropdown Split** - Moved sales modal dropdown initialization into `salesForm/modalDropdowns.js`
- **Sales Modal Template Split** - Moved the large sales modal HTML template into `salesForm/modalContent.js`; `salesForm/modal.js` now focuses on data prep and orchestration
- **Sales Listener Template Split** - Extracted cost card template definitions from `salesForm/listeners.js` into `salesForm/costCardTemplates.js`
- **Sales Listener Controller Split** - Refactored `salesForm/listeners.js` into a thin entrypoint and extracted cost-card engine, sales-type/model hint logic, and meta listeners into dedicated modules
- **Sales Cost Card Engine Split** - Broke `salesForm/costCardsController.js` into focused helpers for totals, input syncing, and type-specific listeners (`costCardSummary.js`, `costCardSync.js`, `costCardSpecialHandlers.js`)
- **Sales Edit-Cost Hydration Split** - Refactored `salesForm/editCostHydration.js` into orchestration-only entrypoint with dedicated data-normalization and card-hydration modules (`editCostHydrationData.js`, `editCostHydrationCards.js`)
- **Sales Cost Template Split** - Moved each cost card template into `salesForm/costCardTemplates/*` modules and kept `salesForm/costCardTemplates.js` as a lightweight aggregator
- **Inventory Form Split** - `inventory.js` extracted inventory form dropdown wiring, batch editor behavior, and form listeners into `assets/js/modules/inventory/*` submodules
- **Inventory View/Modal Split** - `inventory.js` is now a facade; inventory list render, details modal, and create/edit modal moved into dedicated `assets/js/modules/inventory/*` modules
- **Inventory Modal Payload Split** - Extracted inventory modal submit payload/batch builders into `assets/js/modules/inventory/resourceModalPayload.js` to keep modal orchestration focused
- **Inventory Modal Export Fix** - Restored `openInventoryFormModal` export entrypoint and modal defaults/status pre-computation path in `assets/js/modules/inventory/resourceModal.js`
- **Sales View Split** - `sales.js` is now a facade; sales list and sales details rendering moved into `assets/js/modules/sales/*` modules
- **Import Module Split** - `import.js` now focuses on modal/workflow UI; schema/parsing/validation/import logic moved to `assets/js/modules/importCore.js`
- **Import UI Split** - Moved import step templates and import-specific style bootstrap into `assets/js/modules/importUi.js`; `import.js` now focuses on import state/actions/workflow
- **Import Core Internal Split** - Decomposed `importCore.js` into focused helpers under `assets/js/modules/importCore/*` (schemas, parsers, validation, transform, persistence, templates) with `importCore.js` retained as the facade API
- **CRM Module Loading** - Customers and suppliers are loaded on demand via ES modules
- **Script Loading** - Replaced `bundle.js` usage with explicit script imports
- **Swapped Out Accounting** - Swapped Out uses market price revenue minus inventory cost (profit/loss possible), requires Inventory linkage, updates UI hints/docs/regression checklist
- **Inventory Costing** - Base O&M is now derived from O&M Rate (auto-calculated), not manual Annual O&M entry
- **Batch Cost Allocation** - Base + batch costs now share a unified capacity ratio in the profit engine and sales form
- **Cable Cost Segments** - Resale/Hybrid cable costs now support multiple segments and aggregate in financials
- **Batch Capacity Guard** - Inventory batch totals cannot exceed base capacity at save time
- **Batch Capacity Display** - Inventory list and detail views show lit vs unlit capacity for batch mode
- **Batch Capacity Label** - Base capacity field clarifies it is total/unlit when using batch mode
- **CSV Monthly Cost** - Export now computes monthly cost as `revenue - profit` for correctness
- **Bundle Strategy** - Removed unused legacy `assets/js/bundle.js`; app now has a single JS loading path via explicit script/module imports in `index.html`

### Fixed
- **Sales Financial Calc Crash** - Added null guards to all DOM element accesses in `calculateSalesFinancials` to prevent `Cannot set properties of null (setting 'textContent')` error when profitability widget elements haven't rendered yet
- **Renew Modal Cost Mutation** - Replaced direct `updatedData.costs` writes with a `nextCosts` accumulator to prevent backhaul/cross-connect ends from overwriting each other
- **Renew Modal Status Resolution** - Renew flow now explicitly uses `window.SalesStatus.computeSalesStatus` in module scope
- **Null Clearing in Resource Status** - Switched from `??` to `hasOwnProperty` check so `null` values correctly clear `currentUser` and `orderLink` fields
- **Sales Cost Suppliers** - Persist and hydrate supplier dropdowns for backhaul, XC, and other costs
- **Modal Save Guard** - Prevent null save button errors in close-only modals
- **Modal Close View** - Avoid forcing inventory view when closing non-inventory modals
- **FAB Modal Overlap** - Hide floating action button when modals are open (mobile)
- **Import Defensive Coding** - Added optional chaining to CsvImport calls in customers/suppliers
- **Import Event Wiring** - Replaced inline drag/drop and file-change handlers with delegated JS event listeners

### Improved
- **Form Placeholders** - Added example text to Customer/Supplier form inputs for guidance
- **Notes Textarea** - Increased textarea rows for better visibility
- **Sales Form UX Overhaul** (PR #12)
  - Submit button shows loading spinner and disables during save to prevent double submissions
  - Profitability panel values display muted gray at zero; colored only after data entry
  - Cost type selector condensed from 6 flat buttons into a single "+ Add Cost" dropdown
  - Sales status field changed from readonly input to a colored badge chip
  - Z-index CSS variables (`--z-sticky`, `--z-dropdown`, `--z-modal`) for consistent stacking
  - Anchor navigation bar enhanced with purple accent border and frosted-glass backdrop
  - Cost cards now animate in with a smooth slide-down entrance

### Security
- **XSS Mitigation** - Expanded HTML/JS escaping for customer, supplier, sales, and inventory renders
- **Dashboard Escaping** - Sanitized alert and leaderboard fields to prevent injection
- **Modal Title Escaping** - `openModal` now applies `escapeHtml` to the title parameter

### Tests
- **Batch Allocation Coverage** - Added a test for base + batch cost allocation by capacity
- **Expired Sales Exclusion** - Added test verifying `buildSalesIndex` excludes expired sales from capacity aggregation
- **Store Batch Replace Safety** - Added rollback/error-path tests for `replaceInventoryBatches` and `replaceSalesOrderBatches`
- **Inline Handler Guard** - Added recursive test to fail if inline HTML event handlers (e.g., `onclick=`, `ondrop=`) appear in `assets/js/modules/**/*.js`

---

## [1.8.2] - 2026-02-05

### Added
- **Mobile Card Layouts** - Data tables transform into stacked cards on mobile (< 768px)
  - Customers and Suppliers: Full Name, Contact, Email fields with labels
  - Inventory and Sales: Already implemented, verified working
  - Uses CSS grid and `data-label` attributes for responsive display

### Changed
- **Touch Optimizations** - Added `touch-action: manipulation` to remove 300ms tap delay
- **FAB Position** - Increased bottom offset from 90px to 100px for better nav bar clearance
- **Filter Bar Layout** - Search bar now full-width on mobile with filters stacked below
- **Safe Area Padding** - Bottom navigation respects `env(safe-area-inset-bottom)`
- **Focus States** - Added `focus-visible` styles for keyboard navigation accessibility
- **Table Headers** - Changed from ALL CAPS to Title Case for better readability
- **Sidebar Layout** - Reorganized footer with compact theme toggle and danger-styled sign out

### Improved
- **Dashboard Empty States** - Added CTA buttons for Inventory and Sales when no data exists
- **Placeholder Contrast** - Increased form input placeholder visibility

## [1.8.1] - 2026-01-18

### Added
- **Status Helper Test Page** - `docs/status-test.html` for browser-based helper checks
- **Shared Status Helpers** - Inventory, sales, and alert UI helpers for consistent status rendering
- **Full Supabase Schema Script** - `docs/supabase_schema.sql` now supports full fresh installs

### Changed
- **Inventory Status Logic** - Centralized status computation and sales aggregation across inventory views
- **Status UI Rendering** - Consolidated badge/alert colors for inventory, sales, and dashboard
- **Asset Bundling** - Added `assets/css/bundle.css` and `assets/js/bundle.js` for fewer requests and faster page load
- **Profitability Calculations** - Unified dashboard, sales summary, and inventory revenue views to use the shared financial logic
- **Sales Details Labels & Costs** - Updated IRU revenue label to reflect OTC amortization and included other costs in MRC/NRC breakdowns
- **Sales Details Cable Costs** - Aligned cable monthly cost display with amortized IRU treatment and fixed NRC profit double-counting
- **Sales Details One-time Costs** - IRU views now display OTC as one-time cost and total one-time sums across OTC/NRC fields
- **Backhaul Cost Model** - Backhaul A/Z cost cards now enforce Lease-only inputs to match calculation logic
- **Dashboard Margin Distribution** - Swapped Out orders are excluded by sales type (not status) for accurate buckets
- **Backhaul IRU Support** - IRU backhaul costs now amortize OTC + O&M in Hybrid calculations; fields stored under backhaul aEnd/zEnd
- **Sales Details One-time Costs** - Backhaul IRU now displays OTC values in the one-time cost breakdown
- **Sales Exports** - Added unified monthly revenue column to full and bulk sales CSV exports
- **Inventory Exports** - Inventory bulk/export headers now use OTC/NRC and export the correct field
- **Backhaul IRU Persistence** - Sales form now stores backhaul IRU fields via hidden inputs and reset mappings
- **Swapped Out Handling** - Enforced IRU-only selection in UI with locked dropdown styling; calculations now force zero revenue/profit
- **Inventory Revenue Context** - Added UI + docs note clarifying monthly revenue is the sum of linked sales (incl. IRU amortized)
- **Sales Form Edit Flow** - Ensured Edit Costs always opens and pre-fills customer selection by mapping stored names to customer IDs
- **Data Model Alignment** - Inventory now persists route/handoff/protection cable fields; sales orders store `customer_id`
- **NRC/OTC Handling** - One-time costs now split by ownership (NRC for non-IRU, OTC for IRU) across views/exports
- **CSV Exports** - Routes, endpoints, customer/supplier names, and one-time costs now export from current model fields

---

## [1.8.0] - 2026-01-16

### Added
- **Cost Totals Summary** - Real-time summary panel in Sales form showing:
  - Total Recurring Cost (MRC)
  - Total One-time Cost (NRC)
  - Amortized cost over contract term
- **Dynamic Viewport Height** - `visualViewport` API integration for accurate mobile height
  - Sets `--app-height` CSS variable dynamically
  - Listens to resize and scroll events for real-time updates

### Changed
- **Cost Type Selector UI** - Redesigned cost buttons with toggle behavior
  - Added "Cost Types" header label for clarity
  - Renamed class from `cost-add-btn` to `cost-toggle-btn`
  - Updated hydration selectors to match new class names

### Fixed
- **Mobile Viewport Height** - Replaced static `100vh` with dynamic `var(--app-height)`
  - Fixes Safari/Chrome address bar height issues
  - Uses `100dvh` fallback with `@supports` feature query

---

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
