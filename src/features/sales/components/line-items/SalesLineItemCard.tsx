import { Trash2 } from 'lucide-react'
import type { AvailableCircuit, SalesFormResource } from '@/features/sales/form-api'
import type { ItemDraft } from '@/features/sales/form-helpers'
import { SALES_FIELD_CONFIG } from '@/features/sales/sales-form-config'
import { SalesItemBasics } from '@/features/sales/components/line-items/SalesItemBasics'
import { SalesItemCircuitSelector } from '@/features/sales/components/line-items/SalesItemCircuitSelector'
import { SalesItemPricingFields } from '@/features/sales/components/line-items/SalesItemPricingFields'

interface SalesLineItemCardProps {
    item: ItemDraft
    index: number
    resources: SalesFormResource[]
    circuitsByResource: Record<string, AvailableCircuit[]>
    onRemoveItem: (uiId: string) => void
    onUpdateItem: (uiId: string, field: keyof ItemDraft, value: string) => void
    onUpdateItemResource: (uiId: string, resourceId: string) => void
    onToggleCircuit: (uiId: string, circuitId: string) => void
}

export function SalesLineItemCard({
    item,
    index,
    resources,
    circuitsByResource,
    onRemoveItem,
    onUpdateItem,
    onUpdateItemResource,
    onToggleCircuit,
}: SalesLineItemCardProps) {
    const shouldShowCircuits = SALES_FIELD_CONFIG[item.type]?.circuits && item.inventory_resource_id
    const circuits = shouldShowCircuits ? (circuitsByResource[item.inventory_resource_id] ?? []) : []

    return (
        <div className="bg-surface rounded-xl border border-border-subtle p-5 space-y-4">
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-text">Item {index + 1}</span>
                <button
                    onClick={() => onRemoveItem(item.ui_id)}
                    className="p-1.5 rounded-md hover:bg-destructive/10 text-text-dim hover:text-destructive transition-colors cursor-pointer"
                >
                    <Trash2 className="h-4 w-4" />
                </button>
            </div>

            <SalesItemBasics
                item={item}
                resources={resources}
                onUpdateItem={onUpdateItem}
                onUpdateItemResource={onUpdateItemResource}
            />

            {shouldShowCircuits && (
                <SalesItemCircuitSelector
                    item={item}
                    circuits={circuits}
                    onToggleCircuit={onToggleCircuit}
                />
            )}

            <div className="grid grid-cols-4 gap-4">
                {SALES_FIELD_CONFIG[item.type]?.capacity && (
                    <>
                        <div>
                            <label className="block text-xs text-text-dim mb-1">Capacity</label>
                            <input
                                type="number"
                                value={item.capacity}
                                onChange={(event) => onUpdateItem(item.ui_id, 'capacity', event.target.value)}
                                className="w-full px-3 py-2 bg-background border border-border-subtle rounded-lg text-sm text-text focus:ring-1 focus:ring-primary focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-text-dim mb-1">Spec</label>
                            <input
                                type="text"
                                value={item.spec}
                                onChange={(event) => onUpdateItem(item.ui_id, 'spec', event.target.value)}
                                placeholder="100G"
                                className="w-full px-3 py-2 bg-background border border-border-subtle rounded-lg text-sm text-text placeholder:text-text-dim focus:ring-1 focus:ring-primary focus:outline-none"
                            />
                        </div>
                    </>
                )}
                <div>
                    <label className="block text-xs text-text-dim mb-1">Start Date</label>
                    <input
                        type="date"
                        value={item.start_date}
                        onChange={(event) => onUpdateItem(item.ui_id, 'start_date', event.target.value)}
                        className="w-full px-3 py-2 bg-background border border-border-subtle rounded-lg text-sm text-text focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                </div>
                {SALES_FIELD_CONFIG[item.type]?.term && (
                    <div>
                        <label className="block text-xs text-text-dim mb-1">Term (months)</label>
                        <input
                            type="number"
                            value={item.term_months}
                            onChange={(event) => onUpdateItem(item.ui_id, 'term_months', event.target.value)}
                            className="w-full px-3 py-2 bg-background border border-border-subtle rounded-lg text-sm text-text focus:ring-1 focus:ring-primary focus:outline-none"
                        />
                    </div>
                )}
            </div>

            <SalesItemPricingFields item={item} onUpdateItem={onUpdateItem} />

            {item.end_date && (
                <p className="text-xs text-text-dim">End date: {item.end_date}</p>
            )}
        </div>
    )
}
