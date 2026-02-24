import type { MouseEvent } from 'react'
import { Loader2, Package, Trash2 } from 'lucide-react'
import type { ColumnDef } from '@/features/inventory/inventory-page-config'
import type { InventoryResource } from '@/types'
import {
    resourceStatusBadgeClass,
    resourceStatusLabel,
    resourceTypeBadgeClass,
} from '@/lib/status-styles'

interface InventoryPageTableProps {
    loading: boolean
    dataCount: number
    filteredData: InventoryResource[]
    activeColumns: ColumnDef[]
    search: string
    onOpenDetail: (resourceId: string) => void
    onRequestDelete: (item: InventoryResource) => Promise<void>
}

export function InventoryPageTable({
    loading,
    dataCount,
    filteredData,
    activeColumns,
    search,
    onOpenDetail,
    onRequestDelete,
}: InventoryPageTableProps) {
    if (loading) {
        return (
            <div className="bg-surface rounded-xl border border-border-subtle overflow-hidden">
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-6 w-6 text-primary animate-spin" />
                </div>
            </div>
        )
    }

    if (filteredData.length === 0) {
        return (
            <div className="bg-surface rounded-xl border border-border-subtle overflow-hidden">
                <div className="text-center py-20">
                    <Package className="h-12 w-12 text-text-dim mx-auto mb-4" />
                    <p className="text-text-muted text-lg">
                        {dataCount === 0 ? 'No inventory resources yet' : 'No matching results'}
                    </p>
                    <p className="text-text-dim text-sm mt-1">
                        {dataCount === 0
                            ? 'Click "Add Resource" to create your first inventory item'
                            : 'Try adjusting your search or filters'}
                    </p>
                </div>

                <div className="px-4 py-3 border-t border-border-subtle text-xs text-text-dim">
                    0 resources
                    {search && ` (filtered from ${dataCount})`}
                </div>
            </div>
        )
    }

    const handleDeleteClick = async (
        event: MouseEvent<HTMLButtonElement>,
        item: InventoryResource,
    ) => {
        event.stopPropagation()
        await onRequestDelete(item)
    }

    return (
        <div className="bg-surface rounded-xl border border-border-subtle overflow-hidden">
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-border-subtle">
                            {activeColumns.map((column) => (
                                <th
                                    key={column.key}
                                    className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider"
                                    style={column.minWidth ? { minWidth: column.minWidth } : undefined}
                                >
                                    {column.label}
                                </th>
                            ))}
                            <th className="w-12 px-4 py-3"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                        {filteredData.map((item) => (
                            <tr
                                key={item.id}
                                onClick={() => onOpenDetail(item.id)}
                                className="hover:bg-surface-hover transition-colors cursor-pointer"
                            >
                                {activeColumns.map((column) => (
                                    <td key={column.key} className="px-4 py-3">
                                        {column.render(item)}
                                    </td>
                                ))}
                                <td className="px-4 py-3">
                                    <button
                                        onClick={(event) => {
                                            void handleDeleteClick(event, item)
                                        }}
                                        className="p-1.5 rounded-md hover:bg-destructive/10 text-text-dim hover:text-destructive transition-colors cursor-pointer"
                                        title="Delete"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="md:hidden divide-y divide-border-subtle/50">
                {filteredData.map((item) => {
                    const pct = item.total_capacity
                        ? Math.round(((item.used_capacity ?? 0) / item.total_capacity) * 100)
                        : 0

                    return (
                        <div
                            key={item.id}
                            onClick={() => onOpenDetail(item.id)}
                            className="px-4 py-3 hover:bg-surface-hover/50 cursor-pointer transition-colors active:bg-surface-hover"
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-semibold font-mono text-primary">{item.resource_id}</span>
                                <div className="flex items-center gap-1.5">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${resourceTypeBadgeClass[item.type]}`}>
                                        {item.type}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${resourceStatusBadgeClass[item.status] ?? 'bg-gray-500/15 text-gray-400'}`}>
                                        {resourceStatusLabel[item.status] ?? item.status}
                                    </span>
                                </div>
                            </div>

                            <p className="text-xs text-text-muted mb-1.5">
                                {item.cable_system_name || '—'}
                                {item.route_description ? ` · ${item.route_description}` : ''}
                            </p>

                            {(item.total_capacity ?? 0) > 0 && (
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-1.5 bg-border-subtle rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${pct >= 90 ? 'bg-red-400' : pct >= 50 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                    <span className="text-xs text-text-dim whitespace-nowrap">
                                        {item.used_capacity ?? 0}G/{item.total_capacity}G
                                    </span>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            <div className="px-4 py-3 border-t border-border-subtle text-xs text-text-dim">
                {filteredData.length} resource{filteredData.length !== 1 ? 's' : ''}
                {search && ` (filtered from ${dataCount})`}
            </div>
        </div>
    )
}
