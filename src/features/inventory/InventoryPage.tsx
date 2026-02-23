import { Package, Plus } from 'lucide-react'

export function InventoryPage() {
    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <Package className="h-7 w-7 text-primary" />
                    <h1 className="text-2xl font-bold">Inventory</h1>
                </div>
                <button className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover text-primary-foreground rounded-lg text-sm font-medium transition-colors cursor-pointer">
                    <Plus className="h-4 w-4" />
                    Add Resource
                </button>
            </div>

            {/* Type tabs */}
            <div className="flex gap-1 mb-6 border-b border-border-subtle">
                {['All', 'Capacity', 'Terrestrial', 'Fiber/Spectrum'].map((tab, i) => (
                    <button
                        key={tab}
                        className={`px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer border-b-2 ${i === 0
                                ? 'border-primary text-primary'
                                : 'border-transparent text-text-muted hover:text-text'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Placeholder content */}
            <div className="bg-surface rounded-xl border border-border-subtle p-12 text-center">
                <Package className="h-12 w-12 text-text-dim mx-auto mb-4" />
                <p className="text-text-muted text-lg">Inventory list coming soon</p>
                <p className="text-text-dim text-sm mt-1">Phase 1 — in development</p>
            </div>
        </div>
    )
}
