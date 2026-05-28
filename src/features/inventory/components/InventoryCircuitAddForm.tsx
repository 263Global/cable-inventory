import { useEffect, useMemo, type Dispatch, type SetStateAction } from 'react'
import { Loader2 } from 'lucide-react'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import type {
    BatchRecord,
    NewCircuitForm,
} from '@/features/inventory/inventory-detail-types'

interface InventoryCircuitAddFormProps {
    newCircuit: NewCircuitForm
    batches: BatchRecord[]
    savingCircuit: boolean
    interfaceTypeOptions: Array<{ value: string; label: string }>
    handoverLocationOptions: Array<{ value: string; label: string; sublabel: string }>
    usedCapacityByBatch: Map<string, number>
    onSetNewCircuit: Dispatch<SetStateAction<NewCircuitForm>>
    onCancelAddCircuit: () => void
    onAddCircuit: () => void
}

export function InventoryCircuitAddForm({
    newCircuit,
    batches,
    savingCircuit,
    interfaceTypeOptions,
    handoverLocationOptions,
    usedCapacityByBatch,
    onSetNewCircuit,
    onCancelAddCircuit,
    onAddCircuit,
}: InventoryCircuitAddFormProps) {
    const handoverOptionValues = useMemo(
        () => new Set(handoverLocationOptions.map((option) => option.value)),
        [handoverLocationOptions],
    )

    useEffect(() => {
        onSetNewCircuit((prev) => {
            const handoverAId = prev.handover_a_id && !handoverOptionValues.has(prev.handover_a_id)
                ? ''
                : prev.handover_a_id
            const handoverZId = prev.handover_z_id && !handoverOptionValues.has(prev.handover_z_id)
                ? ''
                : prev.handover_z_id

            if (handoverAId === prev.handover_a_id && handoverZId === prev.handover_z_id) {
                return prev
            }

            return { ...prev, handover_a_id: handoverAId, handover_z_id: handoverZId }
        })
    }, [handoverOptionValues, onSetNewCircuit])

    return (
        <div className="mb-4 p-3 bg-background rounded-lg border border-border-subtle space-y-3">
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs text-text-dim mb-1">Capacity (G)</label>
                    <input
                        type="number"
                        value={newCircuit.capacity}
                        onChange={(event) => onSetNewCircuit((prev) => ({ ...prev, capacity: event.target.value }))}
                        placeholder="100"
                        className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                </div>
                <div>
                    <label className="block text-xs text-text-dim mb-1">Interface Type</label>
                    <SearchableSelect
                        options={interfaceTypeOptions}
                        value={newCircuit.interface_type_id}
                        onChange={(value) => onSetNewCircuit((prev) => ({ ...prev, interface_type_id: value }))}
                        placeholder="Select type..."
                        clearable={false}
                    />
                </div>
            </div>

            {batches.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs text-text-dim mb-1">Batch</label>
                        <select
                            value={newCircuit.batch_id}
                            onChange={(event) => onSetNewCircuit((prev) => ({ ...prev, batch_id: event.target.value }))}
                            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value="">No batch</option>
                            {batches.map((batch) => {
                                const remaining = batch.capacity - (usedCapacityByBatch.get(batch.id) ?? 0)
                                const exhausted = remaining <= 0
                                return (
                                    <option key={batch.id} value={batch.id} disabled={exhausted}>
                                        B{batch.batch_number} - {remaining}G / {batch.capacity}G remaining - {batch.model}{exhausted ? ' (full)' : ''}
                                    </option>
                                )
                            })}
                        </select>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs text-text-dim mb-1">Handover A (optional)</label>
                    <SearchableSelect
                        options={handoverLocationOptions}
                        value={newCircuit.handover_a_id}
                        onChange={(value) => onSetNewCircuit((prev) => ({ ...prev, handover_a_id: value }))}
                        placeholder="Default from resource..."
                    />
                </div>
                <div>
                    <label className="block text-xs text-text-dim mb-1">Handover Z (optional)</label>
                    <SearchableSelect
                        options={handoverLocationOptions}
                        value={newCircuit.handover_z_id}
                        onChange={(value) => onSetNewCircuit((prev) => ({ ...prev, handover_z_id: value }))}
                        placeholder="Default from resource..."
                    />
                </div>
            </div>

            <div className="flex justify-end gap-2">
                <button
                    onClick={onCancelAddCircuit}
                    className="px-4 py-2 bg-surface border border-border-subtle rounded-lg text-sm font-medium text-text-muted hover:bg-surface-hover transition-colors cursor-pointer"
                >
                    Cancel
                </button>
                <button
                    onClick={onAddCircuit}
                    disabled={savingCircuit}
                    className="px-4 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 text-primary-foreground rounded-lg text-sm font-medium transition-colors cursor-pointer"
                >
                    {savingCircuit ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
                </button>
            </div>
        </div>
    )
}
