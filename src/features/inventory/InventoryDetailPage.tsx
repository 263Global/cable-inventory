import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Ban, Loader2, Pencil, RefreshCw } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
    RenewResourceModal,
    TerminateResourceModal,
} from '@/features/inventory/components/InventoryLifecycleModals'
import { InventoryBatchCard } from '@/features/inventory/components/InventoryBatchCard'
import { InventoryCapacityCircuitsCard } from '@/features/inventory/components/InventoryCapacityCircuitsCard'
import {
    ContractFinancialsCard,
    LinkedSalesCard,
    LocationsCard,
    RenewalHistoryCard,
    ResourceSummaryCard,
    TerminationInfoCard,
} from '@/features/inventory/components/InventoryDetailSections'
import {
    resourceStatusBadgeClass,
    resourceStatusLabel,
    resourceTypeBadgeClass,
} from '@/lib/status-styles'
import { useInventoryDetailController } from '@/features/inventory/useInventoryDetailController'

export function InventoryDetailPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()

    const {
        resource,
        loading,
        circuits,
        batches,
        interfaceTypes,
        handoverLocations,
        linkedSales,
        showAddCircuit,
        newCircuit,
        savingCircuit,
        showAddBatch,
        editingBatchId,
        pendingDelete,
        deletingItem,
        newBatch,
        newBatchOmUnlocked,
        omUnlockedBatches,
        terminateOpen,
        terminateDate,
        terminateReason,
        terminateWarning,
        actionLoading,
        renewOpen,
        renewForm,
        isBatchMode: isBatchModeFlag,
        isIRU: isIRUFlag,
        isLease: isLeaseFlag,
        totalCap,
        usedCap,
        batchTotalCap,
        batchPct,
        capUsedByCircuits,
        capAvailable,
        capUnlit,
        plannedLit,
        pctUsed,
        pctAvailable,
        pctPlanned,
        setShowAddCircuit,
        setNewCircuit,
        setShowAddBatch,
        setEditingBatchId,
        setNewBatch,
        setNewBatchOmUnlocked,
        setPendingDelete,
        setTerminateOpen,
        setTerminateDate,
        setTerminateReason,
        setRenewOpen,
        handleAddCircuit,
        handleChangeInterfaceType,
        handleDeleteCircuit,
        handleSaveNewBatch,
        handleDeleteBatch,
        confirmPendingDelete,
        handleUpdateBatchField,
        handleCancelAddBatch,
        handleDoneBatchEdit,
        handleToggleBatchOmUnlocked,
        handleCancelAddCircuit,
        openTerminateDialog,
        openRenewDialog,
        handleConfirmTerminate,
        handleConfirmRenew,
        handleRenewStartDateChange,
        handleRenewTermMonthsChange,
        handleRenewMrcChange,
        handleRenewNrcChange,
    } = useInventoryDetailController(id)

    if (loading) {
        return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 text-primary animate-spin" /></div>
    }

    if (!resource) {
        return (
            <div className="text-center py-20">
                <p className="text-text-muted text-lg">Resource not found</p>
                <button onClick={() => navigate('/inventory')} className="mt-4 text-primary hover:underline cursor-pointer">← Back to Inventory</button>
            </div>
        )
    }

    const isBatchMode = Boolean(isBatchModeFlag)
    const isIRU = Boolean(isIRUFlag)
    const isLease = Boolean(isLeaseFlag)

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/inventory')} className="p-2 rounded-lg hover:bg-surface-hover text-text-muted hover:text-text transition-colors cursor-pointer">
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold">{resource.resource_id}</h1>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${resourceTypeBadgeClass[resource.type]}`}>{resource.type}</span>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${resourceStatusBadgeClass[resource.status]}`}>{resourceStatusLabel[resource.status] || resource.status}</span>
                            {isBatchMode && <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-info/15 text-info">Base+Batch</span>}
                        </div>
                        {resource.internal_ref && <p className="text-sm text-text-dim mt-1">{resource.internal_ref}</p>}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {resource.acquisition_type !== 'Owned' && !['Terminated', 'Expired'].includes(resource.status) && (
                        <button
                            onClick={openTerminateDialog}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
                        >
                            <Ban className="h-4 w-4" /> Terminate
                        </button>
                    )}
                    {['Lease', 'Swap-In'].includes(resource.acquisition_type) && resource.status !== 'Terminated' && (
                        <button
                            onClick={openRenewDialog}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                        >
                            <RefreshCw className="h-4 w-4" /> Renew
                        </button>
                    )}
                    <button onClick={() => navigate(`/inventory/${resource.id}/edit`)} className="flex items-center gap-2 px-4 py-2 border border-primary text-primary hover:bg-primary/10 rounded-lg text-sm font-medium transition-colors cursor-pointer">
                        <Pencil className="h-4 w-4" /> Edit
                    </button>
                </div>
            </div>

            <div className="space-y-6">
                <ResourceSummaryCard resource={resource} isBatchMode={isBatchMode} totalCap={totalCap} />
                <LocationsCard resource={resource} />

                {isBatchMode && (
                    <InventoryBatchCard
                        totalCap={totalCap}
                        batchTotalCap={batchTotalCap}
                        batchPct={batchPct}
                        baseStartDate={resource.start_date}
                        baseTermMonths={resource.term_months}
                        showAddBatch={showAddBatch}
                        editingBatchId={editingBatchId}
                        newBatch={newBatch}
                        batches={batches}
                        newBatchOmUnlocked={newBatchOmUnlocked}
                        omUnlockedBatches={omUnlockedBatches}
                        setNewBatch={setNewBatch}
                        onToggleShowAddBatch={() => setShowAddBatch((prev) => !prev)}
                        onToggleNewBatchOmUnlocked={() => setNewBatchOmUnlocked((prev) => !prev)}
                        onCancelAddBatch={handleCancelAddBatch}
                        onSaveNewBatch={handleSaveNewBatch}
                        onSetEditingBatchId={setEditingBatchId}
                        onDoneBatchEdit={handleDoneBatchEdit}
                        onToggleBatchOmUnlocked={handleToggleBatchOmUnlocked}
                        onDeleteBatch={handleDeleteBatch}
                        onUpdateBatchField={handleUpdateBatchField}
                    />
                )}

                {totalCap > 0 && (
                    <InventoryCapacityCircuitsCard
                        totalCap={totalCap}
                        usedCap={usedCap}
                        isBatchMode={isBatchMode}
                        capUsedByCircuits={capUsedByCircuits}
                        capAvailable={capAvailable}
                        capUnlit={capUnlit}
                        plannedLit={plannedLit}
                        pctUsed={pctUsed}
                        pctAvailable={pctAvailable}
                        pctPlanned={pctPlanned}
                        circuits={circuits}
                        batches={batches}
                        interfaceTypes={interfaceTypes}
                        handoverLocations={handoverLocations}
                        showAddCircuit={showAddCircuit}
                        newCircuit={newCircuit}
                        savingCircuit={savingCircuit}
                        onToggleShowAddCircuit={() => setShowAddCircuit((prev) => !prev)}
                        onSetNewCircuit={setNewCircuit}
                        onCancelAddCircuit={handleCancelAddCircuit}
                        onAddCircuit={handleAddCircuit}
                        onDeleteCircuit={handleDeleteCircuit}
                        onChangeInterfaceType={handleChangeInterfaceType}
                    />
                )}

                <LinkedSalesCard linkedSales={linkedSales} totalCapacity={resource.total_capacity} />
                <ContractFinancialsCard resource={resource} isBatchMode={isBatchMode} isIRU={isIRU} isLease={isLease} />
            </div>

            <TerminationInfoCard resource={resource} />
            <RenewalHistoryCard renewalHistory={resource.renewal_history} />

            <ConfirmDialog
                open={!!pendingDelete}
                title={`Delete ${pendingDelete?.label ?? 'item'}?`}
                message={`This will permanently delete this ${pendingDelete?.type ?? 'item'}. This action cannot be undone.`}
                confirmLabel="Delete"
                variant="danger"
                loading={deletingItem}
                onCancel={() => setPendingDelete(null)}
                onConfirm={confirmPendingDelete}
            />

            <TerminateResourceModal
                open={terminateOpen}
                resourceId={resource.resource_id}
                terminateWarning={terminateWarning}
                terminateDate={terminateDate}
                terminateReason={terminateReason}
                loading={actionLoading}
                onClose={() => setTerminateOpen(false)}
                onConfirm={handleConfirmTerminate}
                onTerminateDateChange={setTerminateDate}
                onTerminateReasonChange={setTerminateReason}
            />

            <RenewResourceModal
                open={renewOpen}
                resourceId={resource.resource_id}
                acquisitionType={resource.acquisition_type}
                renewForm={renewForm}
                loading={actionLoading}
                onClose={() => setRenewOpen(false)}
                onConfirm={handleConfirmRenew}
                onStartDateChange={handleRenewStartDateChange}
                onTermMonthsChange={handleRenewTermMonthsChange}
                onMrcChange={handleRenewMrcChange}
                onNrcChange={handleRenewNrcChange}
            />
        </div>
    )
}
