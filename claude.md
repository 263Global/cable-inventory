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

> [!IMPORTANT]
> **Full rewrite in progress.** Migrating from Vanilla JS SPA to React modern stack.
> - Dashboard: Under Construction (placeholder)
> - Sales Profitability: Disabled (MVP pivot)
> - Fiber/Spectrum resource types: Separate Tabs (implemented)
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

## Project Structure (New)

```
cable-inventory/
├── src/
│   ├── main.tsx              # App entry point
│   ├── App.tsx               # Root component + routing
│   ├── lib/
│   │   ├── supabase.ts       # Supabase client config
│   │   └── utils.ts          # Shared utilities
│   ├── components/
│   │   ├── ui/               # shadcn/ui components
│   │   ├── layout/           # Sidebar, Header, Layout
│   │   └── shared/           # Searchable dropdowns, modals
│   ├── features/
│   │   ├── auth/             # Login, logout, password reset
│   │   ├── inventory/        # List, form, detail views
│   │   ├── sales/            # List, form, detail views
│   │   ├── crm/              # Customers & Suppliers
│   │   ├── dashboard/        # Placeholder (future)
│   │   └── settings/         # Reference data management
│   ├── hooks/                # Custom React hooks
│   └── types/                # TypeScript type definitions
├── public/                   # Static assets
├── docs/
│   ├── supabase_schema.sql   # Database schema
│   └── reference_data/       # Pre-populated cable systems, countries
├── supabase/                 # Supabase migrations
└── vite.config.ts            # Vite configuration
```

---

## Architecture

### Component-Based (React)

- **Pages** → Route-level components in `features/*/`
- **Components** → Reusable UI in `components/`
- **Hooks** → Data fetching & business logic in `hooks/`
- **Supabase** → Direct client queries (no API layer needed)

### Key Patterns

1. **Supabase hooks**: Custom hooks for data fetching with loading/error states
2. **shadcn/ui components**: Copy-pasted source code, fully customizable
3. **Tailwind utility-first**: No custom CSS files unless absolutely needed
4. **TypeScript throughout**: Strict types for all data models

---

## Key Modules

### Inventory (Primary Focus)
- Three resource types: **Fiber** / **Spectrum** / **Capacity**
- Four resource tabs on list page + Column Picker (21 columns, localStorage-persisted)
- Capacity specs: 10G, 40G, 100G, 400G, 800G, 1.6T
- Status auto-computed from circuit allocations (Available → Partially Used → Fully Used)
- Base + Batch mode for staged lighting
- **Circuits**: individual circuit instances with interface type, batch, handover locations
- **Capacity Breakdown**: multi-segment bar (Allocated/Available/Planned/Unlit)
- **Linked Sales**: shows allocated sales orders per resource
- Reference data: Cable Systems (~600 pre-loaded), Landing Stations, Countries

### Sales (MVP — Profitability Disabled)
- Sales Orders with multi-item line items
- Disposal types: IRU Out, Lease Out, Swap Out, Self Use
- **Circuit-level allocation**: sales items link to specific inventory circuits
- Capacity auto-calculated from selected circuits
- Renewal & Termination flows
- Profitability calculations disabled for MVP

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
