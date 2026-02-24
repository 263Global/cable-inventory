interface InventoryCapacitySummaryProps {
    isBatchMode: boolean
    totalCap: number
    usedCap: number
    capUsedByCircuits: number
    capAvailable: number
    capUnlit: number
    plannedLit: number
    pctUsed: number
    pctAvailable: number
    pctPlanned: number
    provisionedCap: number
    circuitCount: number
}

export function InventoryCapacitySummary({
    isBatchMode,
    totalCap,
    usedCap,
    capUsedByCircuits,
    capAvailable,
    capUnlit,
    plannedLit,
    pctUsed,
    pctAvailable,
    pctPlanned,
    provisionedCap,
    circuitCount,
}: InventoryCapacitySummaryProps) {
    if (isBatchMode) {
        return (
            <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium">Capacity Breakdown</span>
                    <span className="text-text-muted">{totalCap}G base</span>
                </div>
                <div className="w-full h-3 bg-surface-hover rounded-full overflow-hidden flex">
                    {pctUsed > 0 && (
                        <div className="h-full bg-status-partial transition-all" style={{ width: `${pctUsed}%` }} title={`Allocated: ${capUsedByCircuits}G`} />
                    )}
                    {pctAvailable > 0 && (
                        <div className="h-full bg-status-available transition-all" style={{ width: `${pctAvailable}%` }} title={`Available: ${capAvailable}G`} />
                    )}
                    {pctPlanned > 0 && (
                        <div className="h-full bg-info/40 transition-all" style={{ width: `${pctPlanned}%` }} title={`Planned: ${plannedLit}G`} />
                    )}
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs mt-3">
                    <div className="flex items-center gap-1.5">
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-status-partial" />
                        <span className="text-text-muted">Allocated:</span>
                        <span className="font-medium">{capUsedByCircuits}G</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-status-available" />
                        <span className="text-text-muted">Available:</span>
                        <span className="font-medium">{capAvailable}G</span>
                        {provisionedCap < capAvailable + capUsedByCircuits && (
                            <span className="text-text-dim">({circuitCount} circuit{circuitCount !== 1 ? 's' : ''}, {provisionedCap}G provisioned)</span>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-info/40" />
                        <span className="text-text-muted">Planned:</span>
                        <span className="font-medium">{plannedLit}G</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-surface-hover border border-border" />
                        <span className="text-text-muted">Unlit:</span>
                        <span className="font-medium">{capUnlit}G</span>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="mb-3">
            <div className="flex justify-between text-sm mb-2">
                <span className="font-medium">{usedCap}G / {totalCap}G Allocated</span>
                <span className="text-text-muted">{totalCap > 0 ? Math.round((usedCap / totalCap) * 100) : 0}%</span>
            </div>
            <div className="w-full h-3 bg-surface-hover rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all ${usedCap >= totalCap ? 'bg-status-full' : 'bg-status-partial'}`}
                    style={{ width: `${totalCap > 0 ? Math.min((usedCap / totalCap) * 100, 100) : 0}%` }}
                />
            </div>
            <div className="flex gap-6 text-sm mt-2">
                <div>
                    <span className="inline-block w-2 h-2 rounded-full bg-status-available mr-2" />
                    <span className="text-text-muted">Remaining: </span>
                    <span className="font-medium">{totalCap - usedCap}G</span>
                </div>
                <div>
                    <span className="inline-block w-2 h-2 rounded-full bg-status-partial mr-2" />
                    <span className="text-text-muted">Allocated: </span>
                    <span className="font-medium">{usedCap}G</span>
                </div>
            </div>
        </div>
    )
}
