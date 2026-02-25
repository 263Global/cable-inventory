import { Check } from 'lucide-react'
import type { AvailableCircuit } from '@/features/sales/form-api'
import type { SalesFormInterfaceType } from '@/features/sales/useSalesFormData'
import type { ItemDraft } from '@/features/sales/form-helpers'

interface SalesItemCircuitSelectorProps {
    item: ItemDraft
    circuits: AvailableCircuit[]
    interfaceTypes: SalesFormInterfaceType[]
    onToggleCircuit: (uiId: string, circuitId: string) => void
    onUpdateCircuitInterface: (uiId: string, circuitId: string, newTypeId: string) => void
}

export function SalesItemCircuitSelector({
    item,
    circuits,
    interfaceTypes,
    onToggleCircuit,
    onUpdateCircuitInterface,
}: SalesItemCircuitSelectorProps) {
    if (circuits.length === 0) return null

    const hasHandoverVariance = circuits.some((circuit) => circuit.handover_a || circuit.handover_z)

    return (
        <div className="p-3 bg-background rounded-lg border border-border-subtle">
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-text-muted">Select Circuits</span>
                <span className="text-xs text-text-dim">
                    {item.selectedCircuitIds.length} selected · {item.capacity || 0}G total
                </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {circuits
                    .filter((circuit) =>
                        circuit.status !== 'Allocated' || item.existingCircuitIds.includes(circuit.id)
                    )
                    .map((circuit) => {
                        const isSelected = item.selectedCircuitIds.includes(circuit.id)
                        const isOwnExisting = item.existingCircuitIds.includes(circuit.id)
                        const isAvailable = circuit.status === 'Available' || circuit.status === 'Planned' || isOwnExisting
                        const handoverLabel = hasHandoverVariance && (circuit.handover_a || circuit.handover_z)
                            ? `${circuit.handover_a ?? '—'} → ${circuit.handover_z ?? '—'}`
                            : null

                        // Determine status label for unavailable circuits
                        const statusLabel = circuit.status === 'Reserved' ? 'Reserved' : 'Allocated'

                        // Interface type override for selected circuits
                        const overrideTypeId = item.circuitInterfaceOverrides[circuit.id]

                        return (
                            <div key={circuit.id} className="flex flex-col gap-1">
                                <button
                                    type="button"
                                    disabled={!isAvailable && !isSelected}
                                    onClick={() => onToggleCircuit(item.ui_id, circuit.id)}
                                    className={`flex flex-col gap-1 px-3 py-2 rounded-lg text-xs border transition-colors cursor-pointer ${isSelected
                                        ? 'bg-primary/10 border-primary text-primary'
                                        : isAvailable
                                            ? 'bg-surface border-border-subtle text-text hover:border-primary/30'
                                            : 'bg-surface/50 border-border-subtle/50 text-text-dim opacity-50 cursor-not-allowed'
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className={`w-4 h-4 rounded flex items-center justify-center border flex-shrink-0 ${isSelected ? 'bg-primary border-primary' : 'border-border'}`}>
                                            {isSelected && <Check className="h-3 w-3 text-white" />}
                                        </span>
                                        <span className="font-mono">#{circuit.circuit_number}</span>
                                        <span>{circuit.capacity}G</span>
                                        <span className="text-text-dim">{circuit.interface_type}</span>
                                        {!isAvailable && !isSelected && (
                                            <span className={`text-[10px] ${circuit.status === 'Reserved' ? 'text-info' : 'text-status-partial'}`}>
                                                {statusLabel}
                                            </span>
                                        )}
                                    </div>
                                    {handoverLabel && (
                                        <span className="text-[10px] text-text-dim pl-6 truncate" title={handoverLabel}>
                                            📍 {handoverLabel}
                                        </span>
                                    )}
                                </button>
                                {/* Interface type override dropdown — only for selected circuits */}
                                {isSelected && interfaceTypes.length > 0 && (
                                    <select
                                        value={overrideTypeId ?? ''}
                                        onChange={(e) => onUpdateCircuitInterface(item.ui_id, circuit.id, e.target.value)}
                                        className="ml-6 mr-1 px-2 py-1 bg-background border border-border-subtle rounded text-[11px] text-text focus:ring-1 focus:ring-primary focus:outline-none"
                                        title="Change interface type"
                                    >
                                        <option value="">Keep current ({circuit.interface_type})</option>
                                        {interfaceTypes.map((ifType) => (
                                            <option key={ifType.id} value={ifType.id}>{ifType.name}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        )
                    })}
            </div>
        </div>
    )
}
