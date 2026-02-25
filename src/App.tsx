import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/useAuth'
import { Loader2 } from 'lucide-react'
import { Toaster } from 'sonner'

const Layout = lazy(() => import('@/components/layout/Layout').then((m) => ({ default: m.Layout })))
const LoginPage = lazy(() => import('@/features/auth/LoginPage').then((m) => ({ default: m.LoginPage })))
const InventoryPage = lazy(() => import('@/features/inventory/InventoryPage').then((m) => ({ default: m.InventoryPage })))
const InventoryFormPage = lazy(() => import('@/features/inventory/InventoryFormPage').then((m) => ({ default: m.InventoryFormPage })))
const InventoryDetailPage = lazy(() => import('@/features/inventory/InventoryDetailPage').then((m) => ({ default: m.InventoryDetailPage })))
const SalesPage = lazy(() => import('@/features/sales/SalesPage').then((m) => ({ default: m.SalesPage })))
const SalesFormPage = lazy(() => import('@/features/sales/SalesFormPage').then((m) => ({ default: m.SalesFormPage })))
const SalesDetailPage = lazy(() => import('@/features/sales/SalesDetailPage').then((m) => ({ default: m.SalesDetailPage })))
const CustomersPage = lazy(() => import('@/features/customers/CustomersPage').then((m) => ({ default: m.CustomersPage })))
const SuppliersPage = lazy(() => import('@/features/suppliers/SuppliersPage').then((m) => ({ default: m.SuppliersPage })))
const ReferenceDataPage = lazy(() => import('@/features/reference-data/ReferenceDataPage').then((m) => ({ default: m.ReferenceDataPage })))
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })))

function AppLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="h-8 w-8 text-primary animate-spin" />
    </div>
  )
}

function ProtectedRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return <AppLoader />
  }

  if (!user) {
    return (
      <Suspense fallback={<AppLoader />}>
        <LoginPage />
      </Suspense>
    )
  }

  return (
    <Suspense fallback={<AppLoader />}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/inventory/new" element={<InventoryFormPage />} />
          <Route path="/inventory/:id/edit" element={<InventoryFormPage />} />
          <Route path="/inventory/:id" element={<InventoryDetailPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/sales/new" element={<SalesFormPage />} />
          <Route path="/sales/:id/edit" element={<SalesFormPage />} />
          <Route path="/sales/:id" element={<SalesDetailPage />} />
          <Route path="/sales" element={<SalesPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/suppliers" element={<SuppliersPage />} />
          <Route path="/reference-data" element={<ReferenceDataPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </Suspense>
  )
}

function ThemedToaster() {
  const { resolvedTheme } = useTheme()
  return <Toaster theme={resolvedTheme} position="bottom-right" richColors closeButton />
}

function App() {
  return (
    <BrowserRouter basename="/cable-inventory">
      <ThemeProvider>
        <AuthProvider>
          <ProtectedRoutes />
          <ThemedToaster />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App
