import { LayoutDashboard, Construction } from 'lucide-react'

export function DashboardPage() {
    return (
        <div>
            <div className="flex items-center gap-3 mb-8">
                <LayoutDashboard className="h-7 w-7 text-primary" />
                <h1 className="text-2xl font-bold">Dashboard</h1>
            </div>
            <div className="bg-surface rounded-xl border border-border-subtle p-16 text-center">
                <Construction className="h-16 w-16 text-warning mx-auto mb-4" />
                <p className="text-text-muted text-xl font-medium">Under Construction</p>
                <p className="text-text-dim text-sm mt-2">Dashboard will be available in Phase 4</p>
            </div>
        </div>
    )
}
