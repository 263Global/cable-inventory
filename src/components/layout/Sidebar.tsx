import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
    Package,
    FileText,
    Users,
    Building2,
    Database,
    LayoutDashboard,
    LogOut,
    Cable,
} from 'lucide-react'

const navItems = [
    { path: '/inventory', label: 'Inventory', icon: Package },
    { path: '/sales', label: 'Sales', icon: FileText },
    { path: '/customers', label: 'Customers', icon: Users },
    { path: '/suppliers', label: 'Suppliers', icon: Building2 },
    { path: '/reference-data', label: 'Reference Data', icon: Database },
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
]

export function Sidebar() {
    const location = useLocation()
    const { user, signOut } = useAuth()

    return (
        <aside className="fixed left-0 top-0 bottom-0 w-64 bg-surface border-r border-border-subtle flex flex-col z-50">
            {/* Logo */}
            <div className="h-16 flex items-center gap-3 px-6 border-b border-border-subtle">
                <Cable className="h-6 w-6 text-primary" />
                <span className="text-lg font-bold tracking-tight">CableTrack</span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 px-3 space-y-1">
                {navItems.map((item) => {
                    const isActive = location.pathname.startsWith(item.path)
                    const Icon = item.icon
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${isActive
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-text-muted hover:text-text hover:bg-surface-hover'
                                }`}
                        >
                            <Icon className="h-5 w-5 shrink-0" />
                            {item.label}
                        </Link>
                    )
                })}
            </nav>

            {/* User section */}
            <div className="p-3 border-t border-border-subtle space-y-2">
                {user && (
                    <div className="px-3 py-1">
                        <p className="text-xs text-text-dim truncate">{user.email}</p>
                    </div>
                )}
                <button
                    onClick={signOut}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-muted hover:text-text hover:bg-surface-hover w-full transition-colors cursor-pointer"
                >
                    <LogOut className="h-5 w-5 shrink-0" />
                    Logout
                </button>
            </div>
        </aside>
    )
}
