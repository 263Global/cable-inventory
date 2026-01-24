# Regression Checklist

Use this checklist after changes that may impact UI, data entry, or calculations.

## Setup
- Load the app (auth required) and confirm Dashboard renders.
- If testing locally, open `index.html` or use a local server.

## Navigation + Layout
- Sidebar navigation switches views without errors.
- Mobile user menu opens/closes and theme toggle works.
- Floating action button appears on Inventory/Sales/Customers/Suppliers.

## Inventory
- Open Inventory view and verify list renders.
- Add new resource, save, and confirm it appears in the list.
- Edit a resource and confirm changes persist.
- Delete a resource and confirm it is removed.
- Status labels update based on dates.

## Sales (Core)
- Open Sales view and verify list renders.
- Create new sales order with:
  - Customer, capacity, dates, salesperson.
  - One cost card (cable/backhaul/XC/other) with supplier selected.
- Save and confirm it appears in the list.
- Edit the same sales order and confirm values persist:
  - Sales model/type, customer, dates, capacity.
  - Cost card amounts and supplier dropdowns.
- Open the Renew modal and confirm fields prefill correctly.
- Save the renewal and confirm the order updates.

## Cost Structure (Edit Mode)
- For each cost type (cable, backhaul A/Z, XC A/Z, other):
  - Add card, set supplier, set amounts, save.
  - Re-open edit and confirm supplier and amounts persist.
- Verify profitability widget updates when cost inputs change.

## Customers + Suppliers
- Add a customer and confirm it appears in dropdowns.
- Add a supplier and confirm it appears in cost dropdowns.

## Export + Bulk Operations
- Enter selection mode for Sales and Inventory.
- Select rows and export CSV.

## Auth
- Login with valid credentials.
- Logout and confirm redirect to login page.
- Password reset flow (send reset email).

## Errors
- Confirm global error view shows actionable buttons (reload/dashboard) if a render failure occurs.
