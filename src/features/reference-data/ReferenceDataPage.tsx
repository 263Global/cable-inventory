import { Database } from 'lucide-react'

export function ReferenceDataPage() {
    return (
        <div>
            <div className="flex items-center gap-3 mb-8">
                <Database className="h-7 w-7 text-primary" />
                <h1 className="text-2xl font-bold">Reference Data</h1>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 border-b border-border-subtle">
                {['Cable Systems', 'Landing Stations', 'Countries', 'Handover Locations'].map((tab, i) => (
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

            <div className="bg-surface rounded-xl border border-border-subtle p-12 text-center">
                <Database className="h-12 w-12 text-text-dim mx-auto mb-4" />
                <p className="text-text-muted text-lg">Reference data management coming soon</p>
                <p className="text-text-dim text-sm mt-1">688 cable systems pre-loaded</p>
            </div>
        </div>
    )
}
