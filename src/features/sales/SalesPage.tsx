import { FileText, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { SalesPageControls } from '@/features/sales/components/SalesPageControls'
import { SalesPageTable } from '@/features/sales/components/SalesPageTable'
import { useSalesPageController } from '@/features/sales/useSalesPageController'

export function SalesPage() {
    const navigate = useNavigate()
    const {
        orders,
        loading,
        search,
        statusFilter,
        showFilters,
        showColPicker,
        deleteTarget,
        deleting,
        visibleKeys,
        filterRef,
        pickerRef,
        activeColumns,
        filteredOrders,
        activeFilterCount,
        columnGroups,
        setSearch,
        setShowFilters,
        setShowColPicker,
        setDeleteTarget,
        toggleKey,
        reset,
        toggleStatusFilter,
        clearStatusFilter,
        confirmDeleteOrder,
    } = useSalesPageController()

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <FileText className="h-7 w-7 text-primary" />
                    <h1 className="text-2xl font-bold">Sales Orders</h1>
                    <span className="text-sm text-text-muted bg-surface-hover px-2 py-0.5 rounded-full">
                        {filteredOrders.length}
                    </span>
                </div>

                <button
                    onClick={() => navigate('/sales/new')}
                    className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                >
                    <Plus className="h-4 w-4" /> New Sales Order
                </button>
            </div>

            <SalesPageControls
                search={search}
                onSearchChange={setSearch}
                showFilters={showFilters}
                activeFilterCount={activeFilterCount}
                statusFilter={statusFilter}
                showColPicker={showColPicker}
                visibleKeys={visibleKeys}
                columnGroups={columnGroups}
                filterRef={filterRef}
                pickerRef={pickerRef}
                onToggleFilterPanel={() => setShowFilters((state) => !state)}
                onToggleColumnPanel={() => setShowColPicker((state) => !state)}
                onToggleStatusFilter={toggleStatusFilter}
                onClearStatusFilter={clearStatusFilter}
                onToggleColumn={toggleKey}
                onResetColumns={reset}
            />

            <SalesPageTable
                loading={loading}
                ordersCount={orders.length}
                filteredOrders={filteredOrders}
                activeColumns={activeColumns}
                search={search}
                onOpenDetail={(orderId) => navigate(`/sales/${orderId}`)}
                onRequestDelete={setDeleteTarget}
            />

            <ConfirmDialog
                open={!!deleteTarget}
                title={`Delete ${deleteTarget?.order_id ?? 'order'}?`}
                message="This will permanently delete this sales order and all its items. This action cannot be undone."
                confirmLabel="Delete Order"
                variant="danger"
                loading={deleting}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={confirmDeleteOrder}
            />
        </div>
    )
}
