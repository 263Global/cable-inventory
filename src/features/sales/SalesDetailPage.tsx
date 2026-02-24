import { useNavigate, useParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
    CancelOrderModal,
    ReleaseResourcesModal,
    RenewOrderModal,
    TerminateOrderModal,
} from '@/features/sales/components/SalesLifecycleModals'
import {
    ExpiredOrderBanner,
    SalesDetailHeader,
    SalesLineItemsCard,
    SalesOrderInfoCard,
    SalesRenewalHistoryCard,
    SalesTerminationInfoCard,
} from '@/features/sales/components/SalesDetailSections'
import { useSalesDetailController } from '@/features/sales/useSalesDetailController'

export function SalesDetailPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const {
        order,
        items,
        loading,
        deleteTarget,
        deleting,
        terminateOpen,
        cancelOpen,
        renewOpen,
        releaseOpen,
        terminateDate,
        terminateReason,
        actionLoading,
        terminateItems,
        renewItems,
        releaseItems,
        canRenew,
        setDeleteTarget,
        setTerminateOpen,
        setCancelOpen,
        setRenewOpen,
        setReleaseOpen,
        setTerminateDate,
        setTerminateReason,
        setTerminateItems,
        setRenewItems,
        setReleaseItems,
        handleDeleteConfirm,
        handleCancel,
        openTerminateModal,
        handleTerminate,
        openReleaseModal,
        handleRelease,
        openRenewModal,
        updateRenewItem,
        handleRenew,
    } = useSalesDetailController(id, navigate)

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
        )
    }

    if (!order) return null

    return (
        <div>
            <SalesDetailHeader
                order={order}
                canRenew={canRenew}
                onBack={() => navigate('/sales')}
                onOpenCancel={() => setCancelOpen(true)}
                onOpenTerminate={openTerminateModal}
                onOpenRenew={openRenewModal}
                onEdit={() => navigate(`/sales/${id}/edit`)}
                onDeleteOrder={() => setDeleteTarget({ type: 'order', id: order.id, label: order.order_id })}
            />

            <ExpiredOrderBanner
                order={order}
                canRenew={canRenew}
                onOpenRenew={openRenewModal}
                onOpenRelease={openReleaseModal}
            />

            <SalesOrderInfoCard order={order} />
            <SalesTerminationInfoCard order={order} />
            <SalesRenewalHistoryCard order={order} />

            <SalesLineItemsCard
                items={items}
                onDeleteItem={(item) => {
                    setDeleteTarget({ type: 'item', id: item.id, label: `${item.type} item` })
                }}
            />

            <ConfirmDialog
                open={!!deleteTarget}
                title={`Delete ${deleteTarget?.label ?? 'item'}?`}
                message={deleteTarget?.type === 'order'
                    ? 'This will permanently delete this order and all its items.'
                    : 'This will permanently delete this line item.'}
                confirmLabel="Delete"
                variant="danger"
                loading={deleting}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={handleDeleteConfirm}
            />

            <CancelOrderModal
                open={cancelOpen}
                orderId={order.order_id}
                reason={terminateReason}
                loading={actionLoading}
                onReasonChange={setTerminateReason}
                onClose={() => setCancelOpen(false)}
                onConfirm={handleCancel}
            />

            <TerminateOrderModal
                open={terminateOpen}
                orderId={order.order_id}
                terminateDate={terminateDate}
                terminateReason={terminateReason}
                items={terminateItems}
                loading={actionLoading}
                onClose={() => setTerminateOpen(false)}
                onConfirm={handleTerminate}
                onTerminateDateChange={setTerminateDate}
                onTerminateReasonChange={setTerminateReason}
                onToggleItem={(index) => {
                    setTerminateItems((prev) =>
                        prev.map((item, rowIndex) =>
                            rowIndex === index ? { ...item, selected: !item.selected } : item,
                        ),
                    )
                }}
                onFeeChange={(index, fee) => {
                    setTerminateItems((prev) =>
                        prev.map((item, rowIndex) =>
                            rowIndex === index ? { ...item, fee } : item,
                        ),
                    )
                }}
            />

            <ReleaseResourcesModal
                open={releaseOpen}
                items={releaseItems}
                loading={actionLoading}
                onClose={() => setReleaseOpen(false)}
                onConfirm={handleRelease}
                onToggleItem={(index) => {
                    setReleaseItems((prev) =>
                        prev.map((item, rowIndex) =>
                            rowIndex === index ? { ...item, selected: !item.selected } : item,
                        ),
                    )
                }}
            />

            <RenewOrderModal
                open={renewOpen}
                orderId={order.order_id}
                items={renewItems}
                loading={actionLoading}
                onClose={() => setRenewOpen(false)}
                onConfirm={handleRenew}
                onToggleItem={(index) => {
                    setRenewItems((prev) =>
                        prev.map((item, rowIndex) =>
                            rowIndex === index ? { ...item, selected: !item.selected } : item,
                        ),
                    )
                }}
                onUpdateItem={updateRenewItem}
            />
        </div>
    )
}
