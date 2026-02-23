import { FileText } from 'lucide-react'

export function SalesPage() {
    return (
        <div>
            <div className="flex items-center gap-3 mb-8">
                <FileText className="h-7 w-7 text-primary" />
                <h1 className="text-2xl font-bold">Sales</h1>
            </div>
            <div className="bg-surface rounded-xl border border-border-subtle p-12 text-center">
                <FileText className="h-12 w-12 text-text-dim mx-auto mb-4" />
                <p className="text-text-muted text-lg">Sales module coming in Phase 3</p>
            </div>
        </div>
    )
}
