import { RefreshCw, Trash2 } from 'lucide-react'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import type { InventoryCircuit } from '@/types'
import type {
    BatchRecord,
    HandoverLocationOption,
} from '@/features/inventory/inventory-detail-types'

const circuitStatusColors: Record<string, string> = {
    Available: 'text-status-available',
    Allocated: 'text-status-partial',
    Reserved: 'text-info',
    Planned: 'text-info',
}

interface InventoryCircuitListProps {
    circuits: InventoryCircuit[]
    interfaceTypeOptions: Array<{ value: string; label: string }>
    handoverLocationMap: Map<string, HandoverLocationOption>
    batchMap: Map<string, BatchRecord>
    onChangeInterfaceType: (circuitId: string, typeId: string) => void
    onDeleteCircuit: (circuitId: string) => void
}

export function InventoryCircuitList({
    circuits,
    interfaceTypeOptions,
    handoverLocationMap,
    batchMap,
    onChangeInterfaceType,
    onDeleteCircuit,
}: InventoryCircuitListProps) {
    if (circuits.length === 0) {
        return <p className="text-sm text-text-dim text-center py-4">No circuits defined yet.</p>
    }

    return (
        <div className="space-y-2">
            {circuits.map((circuit) => {
                const origName = (circuit.original_type as { name: string } | null)?.name ?? '—'
                const currName = (circuit.current_type as { name: string } | null)?.name ?? '—'
                const wasConverted = circuit.original_interface_type_id !== circuit.current_interface_type_id
                const hLocA = circuit.handover_location_a_id
                    ? handoverLocationMap.get(circuit.handover_location_a_id)
                    : null
                const hLocZ = circuit.handover_location_z_id
                    ? handoverLocationMap.get(circuit.handover_location_z_id)
                    : null
                const batchInfo = circuit.batch_id ? batchMap.get(circuit.batch_id) : null

                return (
                    <div key={circuit.id} className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border-subtle">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-surface text-xs font-bold text-text-muted">
                            #{circuit.circuit_number}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{circuit.capacity}G</span>
                                <span className={`text-xs font-medium ${circuitStatusColors[circuit.status] ?? 'text-text-dim'}`}>● {circuit.status}</span>
                                {batchInfo && (
                                    <span className="px-1.5 py-0.5 rounded bg-surface-hover text-[10px] font-medium text-text-dim">B{batchInfo.batch_number}</span>
                                )}
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-xs text-text-dim">{origName}</span>
                                {wasConverted && (
                                    <>
                                        <RefreshCw className="h-3 w-3 text-warning" />
                                        <span className="text-xs text-warning font-medium">{currName}</span>
                                    </>
                                )}
                            </div>
                            {(hLocA || hLocZ) && (
                                <div className="text-xs text-text-dim mt-0.5">
                                    🏢 {hLocA?.name ?? '(default)'} → {hLocZ?.name ?? '(default)'}
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-28">
                                <SearchableSelect
                                    options={interfaceTypeOptions}
                                    value={circuit.current_interface_type_id ?? ''}
                                    onChange={(value) => value && onChangeInterfaceType(circuit.id, value)}
                                    placeholder="Type..."
                                />
                            </div>
                            <button
                                onClick={() => onDeleteCircuit(circuit.id)}
                                className="p-1.5 rounded-md hover:bg-destructive/10 text-text-dim hover:text-destructive transition-colors cursor-pointer"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
