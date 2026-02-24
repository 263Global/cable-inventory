import { useMemo, type Dispatch, type SetStateAction } from 'react'
import { BarChart3, Plus } from 'lucide-react'
import { InventoryCapacitySummary } from '@/features/inventory/components/InventoryCapacitySummary'
import { InventoryCircuitAddForm } from '@/features/inventory/components/InventoryCircuitAddForm'
import { InventoryCircuitList } from '@/features/inventory/components/InventoryCircuitList'
import type { InventoryCircuit } from '@/types'
import type {
    BatchRecord,
    HandoverLocationOption,
    InterfaceTypeOption,
    NewCircuitForm,
} from '@/features/inventory/inventory-detail-types'

interface InventoryCapacityCircuitsCardProps {
    totalCap: number
    usedCap: number
    isBatchMode: boolean
    capUsedByCircuits: number
    capAvailable: number
    capUnlit: number
    plannedLit: number
    pctUsed: number
    pctAvailable: number
    pctPlanned: number
    circuits: InventoryCircuit[]
    batches: BatchRecord[]
    interfaceTypes: InterfaceTypeOption[]
    handoverLocations: HandoverLocationOption[]
    showAddCircuit: boolean
    newCircuit: NewCircuitForm
    savingCircuit: boolean
    onToggleShowAddCircuit: () => void
    onSetNewCircuit: Dispatch<SetStateAction<NewCircuitForm>>
    onCancelAddCircuit: () => void
    onAddCircuit: () => void
    onDeleteCircuit: (circuitId: string) => void
    onChangeInterfaceType: (circuitId: string, typeId: string) => void
}

export function InventoryCapacityCircuitsCard({
    totalCap,
    usedCap,
    isBatchMode,
    capUsedByCircuits,
    capAvailable,
    capUnlit,
    plannedLit,
    pctUsed,
    pctAvailable,
    pctPlanned,
    circuits,
    batches,
    interfaceTypes,
    handoverLocations,
    showAddCircuit,
    newCircuit,
    savingCircuit,
    onToggleShowAddCircuit,
    onSetNewCircuit,
    onCancelAddCircuit,
    onAddCircuit,
    onDeleteCircuit,
    onChangeInterfaceType,
}: InventoryCapacityCircuitsCardProps) {
    const provisionedCap = useMemo(
        () => circuits.reduce((sum, circuit) => sum + circuit.capacity, 0),
        [circuits],
    )

    const interfaceTypeOptions = useMemo(
        () => interfaceTypes.map((type) => ({ value: type.id, label: type.name })),
        [interfaceTypes],
    )

    const handoverLocationOptions = useMemo(
        () =>
            handoverLocations.map((handover) => ({
                value: handover.id,
                label: handover.name,
                sublabel: `${handover.city || ''}, ${handover.country}`,
            })),
        [handoverLocations],
    )

    const handoverLocationMap = useMemo(
        () => new Map(handoverLocations.map((handover) => [handover.id, handover])),
        [handoverLocations],
    )

    const batchMap = useMemo(
        () => new Map(batches.map((batch) => [batch.id, batch])),
        [batches],
    )

    const usedCapacityByBatch = useMemo(() => {
        const usage = new Map<string, number>()
        for (const circuit of circuits) {
            if (!circuit.batch_id) continue
            usage.set(circuit.batch_id, (usage.get(circuit.batch_id) ?? 0) + circuit.capacity)
        }
        return usage
    }, [circuits])

    return (
        <div className="bg-surface rounded-xl border border-border-subtle p-6">
            <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Capacity & Circuits</h2>
            </div>

            <InventoryCapacitySummary
                isBatchMode={isBatchMode}
                totalCap={totalCap}
                usedCap={usedCap}
                capUsedByCircuits={capUsedByCircuits}
                capAvailable={capAvailable}
                capUnlit={capUnlit}
                plannedLit={plannedLit}
                pctUsed={pctUsed}
                pctAvailable={pctAvailable}
                pctPlanned={pctPlanned}
                provisionedCap={provisionedCap}
                circuitCount={circuits.length}
            />

            <div className={isBatchMode ? '' : 'mt-6 pt-4 border-t border-border-subtle'}>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold">Circuits</h3>
                    <button
                        onClick={onToggleShowAddCircuit}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-medium transition-colors cursor-pointer"
                    >
                        <Plus className="h-3.5 w-3.5" /> Add Circuit
                    </button>
                </div>

                {showAddCircuit && (
                    <InventoryCircuitAddForm
                        newCircuit={newCircuit}
                        batches={batches}
                        savingCircuit={savingCircuit}
                        interfaceTypeOptions={interfaceTypeOptions}
                        handoverLocationOptions={handoverLocationOptions}
                        usedCapacityByBatch={usedCapacityByBatch}
                        onSetNewCircuit={onSetNewCircuit}
                        onCancelAddCircuit={onCancelAddCircuit}
                        onAddCircuit={onAddCircuit}
                    />
                )}

                <InventoryCircuitList
                    circuits={circuits}
                    interfaceTypeOptions={interfaceTypeOptions}
                    handoverLocationMap={handoverLocationMap}
                    batchMap={batchMap}
                    onChangeInterfaceType={onChangeInterfaceType}
                    onDeleteCircuit={onDeleteCircuit}
                />
            </div>
        </div>
    )
}
