# AGENTS.md

Default orientation and operating guidance for agents working in this repository.

## Project Purpose
Cable Inventory Manager: a React SPA for managing submarine cable inventory resources, sales orders, customers, and suppliers. Uses Supabase as the backend.

## Architecture
- **Framework**: React 19 + Vite 6 (client-side SPA, deployed as static files)
- **UI**: Tailwind CSS 4 + shadcn/ui components
- **Routing**: React Router v7
- **Data layer**: Supabase client (PostgreSQL + Auth + RLS), no API server
- **Language**: TypeScript (strict)
- **Toast**: Sonner (`import { toast } from 'sonner'`)

## Project Status
- **Full rewrite in progress** from vanilla JS to React
- Inventory module: primary focus (Capacity type fully implemented, Fiber/Spectrum placeholder)
- Sales: circuit-level allocation, profitability calculations disabled (MVP pivot)
- Dashboard: Under Construction placeholder
- CRM (Customers/Suppliers): standard CRUD

## How To Run
```bash
npm install
npm run dev        # Start local dev server
npm run build      # Build for production
```

## Directory Guide
- `src/` — application source code
  - `src/features/` — feature modules (auth, inventory, sales, crm, settings)
  - `src/components/ui/` — shadcn/ui components
  - `src/components/layout/` — sidebar, header, layout shell
  - `src/hooks/` — custom React hooks for data fetching
  - `src/lib/` — Supabase client, utilities
  - `src/types/` — TypeScript type definitions
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
- Use shadcn/ui components for all form elements and dialogs
- Use Tailwind utility classes, avoid custom CSS
- All data fetching via custom hooks wrapping Supabase client
- Reference data (Cable Systems, Landing Stations, Countries) are pre-populated and managed via Settings page
- Inventory status is auto-computed from circuit allocations (Available → Partially Used → Fully Used)
- Circuit allocation: sales items link to specific inventory circuits via `sales_item_circuits` junction
- Color scheme: 🟢 Available, 🟠 Allocated (amber #F59E0B), 🔴 Full, 🔵 Planned, ⚪ Unlit

## Contribution Guidelines
- Prefer small, focused changes
- Use TypeScript strict mode, no `any` types
- Follow existing patterns in `src/features/` for new modules
- Keep components composable and reusable
