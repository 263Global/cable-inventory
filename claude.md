## Development Rules

- **Plan First**: For non-trivial tasks (3+ steps), write a plan with checkable items before coding. If things go sideways, stop and re-plan.
- **Verify Before Done**: Never mark complete without proving it works — run tests, check logs, diff behavior.
- **Demand Elegance**: For non-trivial changes, ask "is there a more elegant way?" Skip this for obvious fixes.
- **Autonomous Bugs**: When given a bug report, just fix it. Point at logs/errors, then resolve. Zero hand-holding.
- **Simplicity & Minimal Impact**: Keep changes as simple as possible. Find root causes, no temporary fixes. Only touch what's necessary.
- **Capture Lessons**: After any correction, record the pattern in `tasks/lessons.md` to prevent repeats.

---

# Cable Inventory Manager

> A Telecom Resource Management System for submarine cable inventory, sales order tracking, and CRM.

## Project Status

> [!NOTE]
> **Rewrite complete** (v2.5.0). All modules fully implemented on React modern stack.
> - Dashboard: KPI cards, capacity charts, sales pipeline, expiring contracts
> - Sales Profitability: Disabled (MVP pivot)
> - All resource types: Capacity, Terrestrial, Fiber, Spectrum
> - Mobile responsive: card views, collapsible sidebar
> - Toast notifications: Sonner (dark, bottom-right, auto-dismiss)

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | React 19 + Vite 6 |
| **UI** | Tailwind CSS 4 + shadcn/ui |
| **Routing** | React Router v7 (client-side SPA) |
| **Backend** | Supabase (PostgreSQL + Auth + RLS) |
| **Deployment** | GitHub Pages (static) |
| **Icons** | Lucide React |
| **Toast** | Sonner (dark theme, bottom-right) |

---

## Project Structure

```
cable-inventory/
├── src/
│   ├── main.tsx              # App entry point
│   ├── App.tsx               # Root component + routing (React.lazy code splitting)
│   ├── lib/
│   │   ├── supabase.ts       # Supabase client config
│   │   ├── supabase-utils.ts # assertNoError helper
│   │   ├── contract-utils.ts # Date/contract calculations
│   │   ├── status-styles.ts  # Badge/status CSS helpers
│   │   ├── reference-api.ts  # Shared reference data queries
│   │   └── utils.ts          # General utilities
│   ├── components/
│   │   ├── ui/               # shadcn/ui components
│   │   ├── layout/           # Sidebar, Header, Layout
│   │   └── shared/           # Searchable dropdowns, modals
│   ├── features/
│   │   ├── inventory/
│   │   │   ├── InventoryPage.tsx          # List page (thin renderer)
│   │   │   ├── InventoryFormPage.tsx      # Create/edit form
│   │   │   ├── InventoryDetailPage.tsx    # Detail view
│   │   │   ├── useInventory*Controller.ts # Controller hooks
│   │   │   ├── useInventory*Data.ts       # Data fetching hooks
│   │   │   ├── useInventory*Actions.ts    # Action hooks
│   │   │   ├── api/                       # Supabase API (resources, lifecycle, etc.)
│   │   │   ├── components/                # UI components (18 files)
│   │   │   └── *-types.ts, *-config.ts    # Types and config
│   │   ├── sales/            # Same pattern as inventory
│   │   ├── dashboard/        # KPI cards, charts, analytics
│   │   ├── crm/              # Customers & Suppliers
│   │   ├── auth/             # Login, password reset
│   │   └── settings/         # Reference data management
│   ├── hooks/                # Shared hooks (useClickOutside, usePersistentColumnVisibility)
│   └── types/                # Global TypeScript type definitions
├── public/                   # Static assets (favicon)
├── docs/                     # DB schema, reference data, seed data
├── supabase/                 # Database migrations (020+)
└── vite.config.ts            # Vite configuration
```

---

## Architecture

### Controller-Hook Pattern (v2.5.0+)

All major pages follow a consistent decomposition:

```
Page (thin renderer, ~100–260 lines)
  └─ useXxxController (orchestrator)
       ├─ useXxxData (fetching, state)
       ├─ useXxxActions (mutations, handlers)
       └─ useXxxLifecycle (terminate, renew — optional)
  └─ UI Components (extracted into components/ subdirectory)
```

- **Pages** → Thin renderers that destructure controller hook and render components
- **Controller Hooks** → Compose sub-hooks, compute derived state, return flat API
- **Sub-Hooks** → Single-responsibility: data fetching, action handlers, lifecycle
- **Components** → Barrel-exported via index files for clean imports
- **API modules** → Supabase queries in `api/` subdirectory with barrel re-export

### Other Patterns

1. **`assertNoError()`**: Wraps all Supabase calls with contextual error messages
2. **shadcn/ui components**: Copy-pasted source code, fully customizable
3. **Tailwind utility-first**: No custom CSS files unless absolutely needed
4. **TypeScript throughout**: Strict types for all data models
5. **Route-level code splitting**: `React.lazy` + `Suspense` for each page

---

## Key Modules

### Inventory
- Four resource types: **Capacity** / **Terrestrial** / **Fiber** / **Spectrum** (tab-filtered)
- Column Picker (21 columns, localStorage-persisted)
- Status auto-computed from circuit allocations (Available → Partially Used → Fully Used)
- Base + Batch mode for staged lighting with auto-transition (Planned → Active)
- **Circuits**: individual circuit instances with interface type, batch, handover locations
- **Capacity Breakdown**: multi-segment bar (Allocated/Available/Planned/Unlit)
- **Linked Sales**: shows allocated sales orders per resource
- Termination & Renewal with linked-sales safety checks
- Reference data: Cable Systems (~600 pre-loaded), Landing Stations, Countries

### Sales (Profitability Disabled for MVP)
- Sales Orders with multi-item line items
- Disposal types: IRU Out, Lease Out, Swap Out, Self Use
- **Circuit-level allocation**: sales items link to specific inventory circuits
- Capacity auto-calculated from selected circuits
- Per-item termination with ETF, selective renewal, resource release
- Auto status transitions: Pre-sold → Active → Expired

### CRM
- Customers & Suppliers CRUD
- Searchable dropdowns with add-new support

### Settings
- Reference Data management (Cable Systems, Landing Stations, Countries, Interface Types, Handover Locations)
- Searchable list with add/edit/delete

---

## Supabase

### Tables
| Table | Purpose |
|-------|---------|
| `inventory_resources` | Resource records (Fiber/Spectrum/Capacity) |
| `inventory_batches` | Staged lighting batches per resource |
| `inventory_circuits` | Individual circuit instances |
| `sales_orders` | Sales order headers |
| `sales_order_items` | Line items (Capacity, Backhaul, etc.) |
| `sales_item_circuits` | Junction: sales items ↔ allocated circuits |
| `customers` | Customer CRM |
| `suppliers` | Supplier SRM |
| `interface_types` | Circuit interface types (100GE, 400GE, etc.) |
| `handover_locations` | Handover/colocation points |
| `cable_systems` | Cable systems (~600 pre-populated) |
| `landing_stations` | Landing stations |
| `countries` | Country reference data |

### Auth
- Email/password authentication
- RLS enabled on all tables
- Sign-ups disabled (internal tool)

### Setup
1. Create project at supabase.com
2. Run `docs/supabase_schema.sql` in SQL Editor
3. Set env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

---

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Deployment (GitHub Pages)
- Push to `main` branch
- GitHub Actions builds → deploys to `gh-pages`
- `vite.config.ts` sets `base` for GitHub Pages path

---

## Development Patterns

### ✅ DO
- Use TypeScript strict mode
- Use shadcn/ui components for forms, dialogs, dropdowns
- Use `useQuery`-style hooks for Supabase data
- Use Tailwind classes, no inline styles
- Use `<Link>` for navigation, never `window.location`

### ❌ DON'T
- Don't install heavy dependencies without discussion
- Don't bypass TypeScript with `any`
- Don't write custom CSS when Tailwind covers it
- Don't use `useEffect` for derived state
- Don't hardcode colors — use Tailwind theme tokens
- Color scheme: 🟢 Available (`status-available`), 🟠 Allocated (`status-partial` amber), 🔴 Full (`status-full`), 🔵 Planned (`info`), ⚪ Unlit (gray)

---

## Repository

- **GitHub**: [263Global/cable-inventory](https://github.com/263Global/cable-inventory)
- **License**: MIT
