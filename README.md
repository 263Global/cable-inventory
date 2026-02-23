# CableTrack

Submarine cable capacity and sales management system.

## Features

- **📦 Inventory** — Track cable resources (Capacity, Terrestrial, Fiber, Spectrum) with circuit-level allocation, batch staging, and automatic status sync
- **💼 Sales Orders** — Multi-item orders with type-aware fields (Capacity, Backhaul, Cross-Connect, NRC, Other), circuit allocation, and auto status transitions
- **👥 CRM/SRM** — Customer and supplier management with searchable dropdowns
- **🔒 Auth** — Supabase Auth with Row-Level Security
- **📱 Responsive** — Desktop, tablet, and mobile layouts

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS (custom dark theme)
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Routing**: React Router v6
- **Deployment**: GitHub Pages via GitHub Actions

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase project

### Setup

```bash
git clone https://github.com/263Global/cable-inventory.git
cd cable-inventory
npm install
```

Create `.env.local`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Run migrations in Supabase SQL Editor (see `supabase/migrations/`).

### Development

```bash
npm run dev
```

Open `http://localhost:5173/cable-inventory/`

### Production Build

```bash
npm run build
```

## Project Structure

```
cable-inventory/
├── src/
│   ├── components/ui/     # Reusable UI components
│   ├── contexts/          # Auth context
│   ├── features/
│   │   ├── auth/          # Login page
│   │   ├── inventory/     # List, detail, form pages + API
│   │   ├── sales/         # List, detail, form pages + API
│   │   ├── customers/     # Customer CRM
│   │   └── suppliers/     # Supplier SRM
│   ├── lib/               # Supabase client, utilities
│   └── types/             # TypeScript type definitions
├── supabase/
│   ├── migrations/        # Database migrations
│   └── seed_data_clean.sql # Reference data (cable systems, landing stations)
├── docs/                  # Documentation + seed data
└── index.html             # Vite entry point
```

## License

MIT — see [LICENSE](LICENSE).
