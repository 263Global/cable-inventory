import { RefreshCw, Trash2 } from 'lucide-react'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { ContractStateBadge } from '@/components/contract/ContractStateBadge'
import { circuitCodeLabels, hasSupplierCode, isPendingDelivery, isSellableCircuit } from '@/lib/circuit-codes'
import type { LinkedSalesItem } from '@/features/inventory/api'
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
    /** 端口 id → 占用它的订单行（含合同状态） */
    circuitSales?: Map<string, LinkedSalesItem>
    onChangeInterfaceType: (circuitId: string, typeId: string) => void
    onDeleteCircuit: (circuitId: string) => void
}

export function InventoryCircuitList({
    circuits,
    interfaceTypeOptions,
    handoverLocationMap,
    batchMap,
    circuitSales,
    onChangeInterfaceType,
    onDeleteCircuit,
}: InventoryCircuitListProps) {
    if (circuits.length === 0) {
        return <p className="text-sm text-text-dim text-center py-4">No circuits defined yet.</p>
    }

    // 资源下有端口录了交付编号，才按"有编号 = 已交付"判定其余空闲端口为交付中
    const tracked = circuits.some(hasSupplierCode)

    return (
        <div className="space-y-2">
            {circuits.map((circuit) => {
                const origName = (circuit.original_type as { name: string } | null)?.name ?? '—'
                const currName = (circuit.current_type as { name: string } | null)?.name ?? '—'
                const wasConverted = circuit.original_interface_type_id !== circuit.current_interface_type_id
                const locationAId = circuit.handover_location_a_id ?? circuit.landing_station_a_id
                const locationZId = circuit.handover_location_z_id ?? circuit.landing_station_z_id
                const hLocA = locationAId
                    ? handoverLocationMap.get(locationAId)
                    : null
                const hLocZ = locationZId
                    ? handoverLocationMap.get(locationZId)
                    : null
                const batchInfo = circuit.batch_id ? batchMap.get(circuit.batch_id) : null
                const sale = circuitSales?.get(circuit.id)
                const sellable = isSellableCircuit(circuit, Boolean(sale))
                const pending = isPendingDelivery({ ...circuit, has_order: Boolean(sale) }, tracked)
                const codes = circuitCodeLabels(circuit)

                return (
                    <div
                        key={circuit.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border ${sellable
                            ? 'bg-status-available/10 border-status-available/40'
                            : 'bg-background border-border-subtle'
                            }`}
                    >
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-surface text-xs font-bold text-text-muted">
                            #{circuit.circuit_number}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{circuit.capacity}G</span>
                                {pending ? (
                                    <span className="text-xs font-medium text-amber-600 dark:text-amber-400" title="已点亮，供应商尚未交付（无 SR / JOC），不可售">● 交付中</span>
                                ) : (
                                    <span className={`text-xs font-medium ${circuitStatusColors[circuit.status] ?? 'text-text-dim'}`}>● {circuit.status}</span>
                                )}
                                {sellable && (
                                    <span className="px-1.5 py-0.5 rounded bg-status-available text-[10px] font-semibold text-white">可售</span>
                                )}
                                {batchInfo && (
                                    <span className="px-1.5 py-0.5 rounded bg-surface-hover text-[10px] font-medium text-text-dim">B{batchInfo.batch_number}</span>
                                )}
                                {sale && (
                                    <>
                                        <span className="text-xs text-text-muted truncate">{sale.order_id} · {sale.customer_name ?? '—'}</span>
                                        <ContractStateBadge derived={sale.contract} compact />
                                    </>
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
                            {codes.length > 0 && (
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-xs font-mono text-text-muted" title={circuit.xc_desc ?? undefined}>
                                    {codes.map((code) => (
                                        <span key={code.label}>
                                            <span className="text-text-dim">{code.label}</span> {code.value}
                                        </span>
                                    ))}
                                </div>
                            )}
                            {(hLocA || hLocZ) && (
                                <div className="text-xs text-text-dim mt-0.5">
                                    🏢 {hLocA?.name ?? '(default)'} → {hLocZ?.name ?? '(default)'}
                                </div>
                            )}
                        </div>
                        <div className="flex shrink-0 items-center gap-5 pl-6">
                            <div className="w-40">
                                <SearchableSelect
                                    options={interfaceTypeOptions}
                                    value={circuit.current_interface_type_id ?? ''}
                                    onChange={(value) => value && onChangeInterfaceType(circuit.id, value)}
                                    placeholder="Type..."
                                    clearable={false}
                                />
                            </div>
                            <button
                                onClick={() => onDeleteCircuit(circuit.id)}
                                className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-destructive/10 text-text-dim hover:text-destructive transition-colors cursor-pointer"
                                title="Delete circuit"
                                aria-label={`Delete circuit #${circuit.circuit_number}`}
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
