import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { InventoryPage } from '@/features/inventory/InventoryPage'
import { SalesPage } from '@/features/sales/SalesPage'
import { CustomersPage } from '@/features/customers/CustomersPage'
import { SuppliersPage } from '@/features/suppliers/SuppliersPage'
import { ReferenceDataPage } from '@/features/reference-data/ReferenceDataPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'

function App() {
  return (
    <BrowserRouter basename="/cable-inventory">
      <Routes>
        <Route element={<Layout />}>
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/sales" element={<SalesPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/suppliers" element={<SuppliersPage />} />
          <Route path="/reference-data" element={<ReferenceDataPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/" element={<Navigate to="/inventory" replace />} />
          <Route path="*" element={<Navigate to="/inventory" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
