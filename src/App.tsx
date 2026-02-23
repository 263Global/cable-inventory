import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { Layout } from '@/components/layout/Layout'
import { LoginPage } from '@/features/auth/LoginPage'
import { InventoryPage } from '@/features/inventory/InventoryPage'
import { InventoryFormPage } from '@/features/inventory/InventoryFormPage'
import { InventoryDetailPage } from '@/features/inventory/InventoryDetailPage'
import { SalesPage } from '@/features/sales/SalesPage'
import { CustomersPage } from '@/features/customers/CustomersPage'
import { SuppliersPage } from '@/features/suppliers/SuppliersPage'
import { ReferenceDataPage } from '@/features/reference-data/ReferenceDataPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { Loader2 } from 'lucide-react'

function ProtectedRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <LoginPage />
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/inventory/new" element={<InventoryFormPage />} />
        <Route path="/inventory/:id" element={<InventoryDetailPage />} />
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
  )
}

function App() {
  return (
    <BrowserRouter basename="/cable-inventory">
      <AuthProvider>
        <ProtectedRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
