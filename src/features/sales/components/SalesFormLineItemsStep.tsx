import { ArrowLeft, Loader2, Package, Plus, Save } from 'lucide-react'
import type { AvailableCircuit, SalesFormResource } from '@/features/sales/form-api'
import type { ItemDraft } from '@/features/sales/form-helpers'
import { SalesLineItemCard } from '@/features/sales/components/line-items/SalesLineItemCard'

interface SalesFormLineItemsStepProps {
    items: ItemDraft[]
    resources: SalesFormResource[]
    circuitsByResource: Record<string, AvailableCircuit[]>
    saving: boolean
    isEdit: boolean
    onRemoveItem: (uiId: string) => void
    onUpdateItem: (uiId: string, field: keyof ItemDraft, value: string) => void
    onUpdateItemResource: (uiId: string, resourceId: string) => void
    onToggleCircuit: (uiId: string, circuitId: string) => void
    onAddItem: () => void
    onBack: () => void
    onSave: () => void
}

export function SalesFormLineItemsStep({
    items,
    resources,
    circuitsByResource,
    saving,
    isEdit,
    onRemoveItem,
    onUpdateItem,
    onUpdateItemResource,
    onToggleCircuit,
    onAddItem,
    onBack,
    onSave,
}: SalesFormLineItemsStepProps) {
    return (
        <div className="space-y-4">
            {items.length === 0 && (
                <div className="bg-surface rounded-xl border border-border-subtle p-8 text-center">
                    <Package className="h-10 w-10 text-text-dim mx-auto mb-3" />
                    <p className="text-text-muted mb-4">No items yet. Add your first line item.</p>
                </div>
            )}

            {items.map((item, index) => (
                <SalesLineItemCard
                    key={item.ui_id}
                    item={item}
                    index={index}
                    resources={resources}
                    circuitsByResource={circuitsByResource}
                    onRemoveItem={onRemoveItem}
                    onUpdateItem={onUpdateItem}
                    onUpdateItemResource={onUpdateItemResource}
                    onToggleCircuit={onToggleCircuit}
                />
            ))}

            <button
                onClick={onAddItem}
                className="flex items-center gap-2 w-full justify-center py-3 border-2 border-dashed border-border-subtle rounded-xl text-sm text-text-muted hover:text-text hover:border-primary/30 transition-colors cursor-pointer"
            >
                <Plus className="h-4 w-4" /> Add Item
            </button>

            <div className="flex items-center justify-between pt-4">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-text-muted hover:text-text transition-colors cursor-pointer"
                >
                    <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <button
                    onClick={onSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
                >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {isEdit ? 'Update' : 'Create'} Order
                </button>
            </div>
        </div>
    )
}
