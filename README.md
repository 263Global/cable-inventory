# Cable Inventory Manager

A professional Telecom Resource and P&L Management System for managing submarine cable inventory and sales orders.

## Features

### Core Features
- **📊 Dashboard** - Key metrics, MRR trend charts, margin distribution, capacity tracking, and sales leaderboards
- **📦 Inventory Management** - Track cable resources including IRU, Lease, and Swapped assets
- **💼 Sales Order Tracking** - Manage customer orders with detailed cost structures and profitability analysis
- **☑️ Bulk Operations** - Selection mode toggle for multi-select and batch export (clean default view)
- **📱 Responsive Design** - Optimized for desktop, tablet, and mobile devices (iOS Safari compatible)
- **🔍 Smart Search** - Fuzzy search with multi-tier filtering (status, salesperson, expiring soon)
- **📤 CSV Export** - Export Sales and Inventory data for offline analysis

### Sales Order Form
- **2-Column Layout** - Sticky Profitability sidebar | Right container (Sales Info + Cost Structure + Notes)
- **Sales Model & Type First** - Key classification fields at top for smart form behavior
- **Real-time Profitability** - Sticky sidebar shows live margin calculations
- **Order Renewal** - Quick renewal with price adjustment option
  - Update MRC/NRC during renewal (for discounts or increases)
  - Preserves Order ID while updating contract dates
- **Multiple Cost Cards** - Cable, Backhaul (A/Z-End), Cross Connect, Other Costs
- **Dual-Margin Analysis** - First-month and recurring margin for IRU Resale orders
- **Smart Field Logic** - Linked Resource hidden for Resale, optional for Swapped Out

### CRM/SRM (Customer & Supplier Management)
- **👥 Customer Management** - Add and manage customers with short/full names and contact info
- **🏢 Supplier Management** - Track suppliers for cost cards and acquisitions
- **🔍 Searchable Dropdowns** - Customer and Supplier fields with real-time search filtering
  - Input-style trigger becomes search box on click
  - Type to filter options instantly
  - Blue border and hover effects for clear visual feedback
- **🔗 Relational Data** - Sales orders linked to customers, cost cards linked to suppliers

### Data Persistence
- **☁️ Supabase Backend** - Cloud database with PostgreSQL for multi-device sync
- **🔐 Authentication** - Secure user login with Row Level Security
- **💾 Fallback Storage** - Works offline with browser localStorage

## Tech Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript (no frameworks)
- **Backend**: Supabase (PostgreSQL + Auth)
- **Design**: Stripe-inspired UI with glassmorphism effects
- **Icons**: Ionicons

## Getting Started

### Prerequisites
- Supabase account (free tier works)
- Modern web browser

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/263Global/cable-inventory.git
   cd cable-inventory
   ```

2. Configure Supabase:
   - Create a new Supabase project
   - Run the schema from `docs/supabase_schema.sql` in SQL Editor
   - Copy your project URL and anon key to `assets/js/config.js`

3. Serve the application:
   ```bash
   npx serve .
   ```

4. Open `http://localhost:3000` and start managing your cable inventory!

## Project Structure

```
cable-inventory/
├── index.html              # Main entry point
├── assets/
│   ├── css/
│   │   ├── style.css       # Main styles + responsive
│   │   └── components.css  # UI components
│   └── js/
│       ├── app.js          # Core routing & modal (~500 lines)
│       ├── store.js        # Data layer (Supabase + localStorage)
│       ├── auth.js         # Authentication logic
│       ├── supabase.js     # Supabase client configuration
│       └── modules/        # ES6 Feature Modules
│           ├── dashboard.js    # Dashboard view (~290 lines)
│           ├── inventory.js    # Inventory management (~860 lines)
│           ├── sales.js        # Sales list view (~550 lines)
│           ├── salesForm.js    # Sales form + financials (~1,780 lines)
│           ├── financials.js   # Financial calculations
│           ├── validation.js   # Form validation utilities
│           ├── csv.js          # CSV export functions
│           ├── customers.js    # Customer CRM module
│           ├── suppliers.js    # Supplier CRM module
│           ├── bulkOps.js      # Bulk selection & export
│           └── searchableDropdown.js  # Searchable dropdown component
└── docs/
    ├── supabase_schema.sql # Database schema
    └── test_data.sql       # Sample data for testing
```


## Usage

- **Dashboard**: View key metrics, capacity utilization, and sales performance
- **Inventory Tab**: Add, edit, and manage cable resources
- **Sales Tab**: Create and track sales orders with cost breakdowns
- **Customers Tab**: Manage customer records for sales orders
- **Suppliers Tab**: Manage supplier records for cost cards and acquisitions

## Deployment

Deploy to any static hosting service:
- **Cloudflare Pages** (recommended)
- **GitHub Pages**
- **Vercel**
- **Netlify**

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
