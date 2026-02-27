import type { RefObject } from 'react'
import { Filter, Search, Settings2, X } from 'lucide-react'
import { salesAllColumns, salesAllStatuses } from '@/features/sales/sales-page-config'
import type { SalesStatus } from '@/types'

interface SalesPageControlsProps {
    search: string
    onSearchChange: (value: string) => void
    showFilters: boolean
    activeFilterCount: number
    statusFilter: SalesStatus[]
    showColPicker: boolean
    visibleKeys: string[]
    columnGroups: string[]
    filterRef: RefObject<HTMLDivElement | null>
    pickerRef: RefObject<HTMLDivElement | null>
    onToggleFilterPanel: () => void
    onToggleColumnPanel: () => void
    onToggleStatusFilter: (status: SalesStatus) => void
    onClearStatusFilter: () => void
    onToggleColumn: (key: string) => void
    onResetColumns: () => void
}

export function SalesPageControls({
    search,
    onSearchChange,
    showFilters,
    activeFilterCount,
    statusFilter,
    showColPicker,
    visibleKeys,
    columnGroups,
    filterRef,
    pickerRef,
    onToggleFilterPanel,
    onToggleColumnPanel,
    onToggleStatusFilter,
    onClearStatusFilter,
    onToggleColumn,
    onResetColumns,
}: SalesPageControlsProps) {
    return (
        <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative w-full sm:flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-dim" />
                <input
                    type="text"
                    placeholder="Search orders..."
                    value={search}
                    onChange={(event) => onSearchChange(event.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-surface border border-border-subtle rounded-lg text-sm text-text placeholder:text-text-dim focus:outline-none focus:ring-1 focus:ring-primary"
                />
            </div>

            <div className="relative" ref={filterRef}>
                <button
                    onClick={onToggleFilterPanel}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors cursor-pointer ${
                        activeFilterCount > 0
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'bg-surface border-border-subtle text-text-muted hover:text-text'
                    }`}
                >
                    <Filter className="h-4 w-4" />
                    Filters
                    {activeFilterCount > 0 && (
                        <span className="bg-primary text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                            {activeFilterCount}
                        </span>
                    )}
                </button>

                {showFilters && (
                    <div className="absolute right-0 top-full mt-2 bg-surface border border-border-subtle rounded-xl shadow-xl p-4 z-50 w-64">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-text">Status</span>
                            {statusFilter.length > 0 && (
                                <button
                                    onClick={onClearStatusFilter}
                                    className="text-xs text-primary cursor-pointer flex items-center gap-1"
                                >
                                    <X className="h-3 w-3" /> Clear
                                </button>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {salesAllStatuses.map((status) => (
                                <button
                                    key={status}
                                    onClick={() => onToggleStatusFilter(status)}
                                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                                        statusFilter.includes(status)
                                            ? 'bg-primary text-white'
                                            : 'bg-surface-hover text-text-muted hover:text-text'
                                    }`}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="relative" ref={pickerRef}>
                <button
                    onClick={onToggleColumnPanel}
                    className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-colors cursor-pointer ${
                        showColPicker
                            ? 'border-primary text-primary bg-primary/5'
                            : 'border-border text-text-muted hover:text-text hover:bg-surface-hover'
                    }`}
                    title="Choose columns"
                >
                    <Settings2 className="h-4 w-4" />
                    Columns
                </button>

                {showColPicker && (
                    <div className="absolute right-0 top-full mt-2 w-64 bg-surface border border-border-subtle rounded-xl shadow-xl z-50 p-3 max-h-96 overflow-y-auto">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                                Visible Columns
                            </span>
                            <button onClick={onResetColumns} className="text-xs text-primary hover:underline cursor-pointer">
                                Reset
                            </button>
                        </div>

                        {columnGroups.map((group) => (
                            <div key={group} className="mb-3">
                                <p className="text-xs text-text-dim font-medium mb-1.5">{group}</p>
                                {salesAllColumns
                                    .filter((column) => column.group === group)
                                    .map((column) => (
                                        <label
                                            key={column.key}
                                            className="flex items-center gap-2 py-1 px-1 rounded hover:bg-surface-hover cursor-pointer"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={visibleKeys.includes(column.key)}
                                                onChange={() => onToggleColumn(column.key)}
                                                className="rounded border-border text-primary focus:ring-primary accent-[var(--color-primary)] cursor-pointer"
                                            />
                                            <span className="text-sm">{column.label}</span>
                                        </label>
                                    ))}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
