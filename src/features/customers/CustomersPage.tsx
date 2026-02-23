import { Users } from 'lucide-react'

export function CustomersPage() {
    return (
        <div>
            <div className="flex items-center gap-3 mb-8">
                <Users className="h-7 w-7 text-primary" />
                <h1 className="text-2xl font-bold">Customers</h1>
            </div>
            <div className="bg-surface rounded-xl border border-border-subtle p-12 text-center">
                <Users className="h-12 w-12 text-text-dim mx-auto mb-4" />
                <p className="text-text-muted text-lg">Customers module coming in Phase 2</p>
            </div>
        </div>
    )
}
