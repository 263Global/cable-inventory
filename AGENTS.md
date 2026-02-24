# AGENTS.md

Default orientation and operating guidance for agents working in this repository.

## Project Purpose
Cable Inventory Manager: a React SPA for managing submarine cable inventory resources, sales orders, customers, and suppliers. Uses Supabase as the backend.

## Architecture
- **Framework**: React 19 + Vite 6 (client-side SPA, deployed as static files)
- **UI**: Tailwind CSS 4 + shadcn/ui components
- **Routing**: React Router v7 (route-level code splitting via `React.lazy`)
- **Data layer**: Supabase client (PostgreSQL + Auth + RLS), no API server
- **Language**: TypeScript (strict)
- **Toast**: Sonner (`import { toast } from 'sonner'`)

### Controller-Hook Pattern (v2.5.0+)
All major pages follow: **Page → `useXxxController` → `useXxxData` + `useXxxActions` → UI Components**
- Page files are thin renderers (~100–260 lines), delegating all logic to controller hooks
- Controller hooks compose smaller sub-hooks for data fetching, actions, and lifecycle
- UI components are extracted into `components/` subdirectories per feature
- API functions are modularized into `api/` subdirectories with barrel re-exports

## Project Status
- Inventory: fully implemented (Capacity, Terrestrial, Fiber, Spectrum) with circuit-level allocation
- Sales: multi-item orders, circuit allocation, termination/renewal/release flows (profitability disabled for MVP)
- Dashboard: KPI cards, capacity charts, sales pipeline, expiring contracts, recent activity
- CRM (Customers/Suppliers): standard CRUD
- Mobile: responsive card views, collapsible sidebar

## How To Run
```bash
npm install
npm run dev        # Start local dev server
npm run build      # Build for production
```

## Directory Guide
- `src/` — application source code
  - `src/features/` — feature modules, each containing:
    - `*Page.tsx` — thin page renderer
    - `use*Controller.ts` — controller hook (composes sub-hooks)
    - `use*Data.ts`, `use*Actions.ts` — data fetching and action hooks
    - `components/` — extracted UI components
    - `api/` — Supabase API functions (modularized with barrel re-export)
    - `*-types.ts`, `*-config.ts` — type definitions and config constants
  - `src/components/ui/` — shadcn/ui components
  - `src/components/layout/` — sidebar, header, layout shell
  - `src/hooks/` — shared custom hooks (`useClickOutside`, `usePersistentColumnVisibility`)
  - `src/lib/` — Supabase client, utilities (`contract-utils`, `supabase-utils`, `status-styles`)
  - `src/types/` — global TypeScript type definitions
- `docs/` — reference docs, DB schema, test data
- `supabase/` — database migrations

## Data / Supabase
- `inventory_resources` — resource records (Fiber/Spectrum/Capacity)
- `inventory_batches` — staged lighting batches per resource
- `inventory_circuits` — individual circuit instances within a resource
- `sales_orders` — sales order headers
- `sales_order_items` — line items (Capacity, Backhaul, etc.)
- `sales_item_circuits` — junction: sales items ↔ allocated circuits
- `customers` — customer CRM
- `suppliers` — supplier SRM
- `interface_types` — circuit interface types (100GE, 400GE, etc.)
- `handover_locations` — handover/colocation points
- `cable_systems`, `landing_stations`, `countries` — reference data

## Development Notes
- Follow the Controller-Hook pattern: page renders UI, `useXxxController` owns all state and logic
- Use shadcn/ui components for all form elements and dialogs
- Use Tailwind utility classes, avoid custom CSS
- All data fetching via custom hooks wrapping Supabase client
- Use `assertNoError()` from `supabase-utils.ts` for all Supabase error handling
- Reference data (Cable Systems, Landing Stations, Countries) are pre-populated and managed via Settings page
- Inventory status is auto-computed from circuit allocations (Available → Partially Used → Fully Used)
- Circuit allocation: sales items link to specific inventory circuits via `sales_item_circuits` junction
- Color scheme: 🟢 Available, 🟠 Allocated (amber #F59E0B), 🔴 Full, 🔵 Planned, ⚪ Unlit

## Contribution Guidelines
- Prefer small, focused changes
- Use TypeScript strict mode, no `any` types
- Follow existing patterns in `src/features/` for new modules
- Keep components composable and reusable
