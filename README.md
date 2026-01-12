# Cable Inventory Manager

A professional Telecom Resource and P&L Management System for managing submarine cable inventory and sales orders.

## Features

### Core Features
- **📊 Dashboard** - Overview metrics with capacity usage tracking, MRR analytics, and sales leaderboards
- **📦 Inventory Management** - Track cable resources including IRU, Lease, and Swapped assets
- **💼 Sales Order Tracking** - Manage customer orders with detailed cost structures and profitability analysis
- **📱 Responsive Design** - Optimized for desktop, tablet, and mobile devices (iOS Safari compatible)
- **🔍 Smart Search** - Fuzzy search with multi-tier filtering and pagination

### Sales Order Form
- **3-Column Layout** - Profitability Analysis | Sales Info | Cost Structure
- **Real-time Profitability** - Sticky sidebar shows live margin calculations
- **Multiple Cost Cards** - Cable, Backhaul (A/Z-End), Cross Connect, Other Costs
- **Dual-Margin Analysis** - First-month and recurring margin for IRU Resale orders

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
│       ├── app.js          # Main application logic
│       ├── store.js        # Data layer (Supabase + localStorage)
│       └── config.js       # Supabase configuration
└── docs/
    ├── supabase_schema.sql # Database schema
    └── test_data.sql       # Sample data for testing
```

## Usage

- **Dashboard**: View key metrics, capacity utilization, and sales performance
- **Inventory Tab**: Add, edit, and manage cable resources
- **Sales Tab**: Create and track sales orders with cost breakdowns

## Deployment

Deploy to any static hosting service:
- **Cloudflare Pages** (recommended)
- **GitHub Pages**
- **Vercel**
- **Netlify**

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
