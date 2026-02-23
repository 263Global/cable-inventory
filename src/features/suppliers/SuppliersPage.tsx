import { Building2 } from 'lucide-react'

export function SuppliersPage() {
    return (
        <div>
            <div className="flex items-center gap-3 mb-8">
                <Building2 className="h-7 w-7 text-primary" />
                <h1 className="text-2xl font-bold">Suppliers</h1>
            </div>
            <div className="bg-surface rounded-xl border border-border-subtle p-12 text-center">
                <Building2 className="h-12 w-12 text-text-dim mx-auto mb-4" />
                <p className="text-text-muted text-lg">Suppliers module coming in Phase 2</p>
            </div>
        </div>
    )
}
