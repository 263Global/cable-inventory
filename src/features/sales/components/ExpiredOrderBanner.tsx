import { AlertTriangle } from 'lucide-react'
import type { SalesOrder } from '@/types'

interface ExpiredOrderBannerProps {
    order: SalesOrder
    canRenew: boolean
    onOpenRenew: () => void
    onOpenRelease: () => void
}

export function ExpiredOrderBanner({
    order,
    canRenew,
    onOpenRenew,
    onOpenRelease,
}: ExpiredOrderBannerProps) {
    if (!(order.status === 'Expired' && !order.terminated_at)) return null

    return (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6 flex flex-col sm:flex-row items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
            <div className="flex-1">
                <p className="text-sm font-medium text-amber-400">合同期已满未续签，已自动进入滚动续期（软占用）</p>
                <p className="text-xs text-text-muted mt-1">资源仍在用，任一方提前通知即可撤租。客户续签请点续约；收到撤租通知请在订单行标记「已通知」，到期后释放资源。</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap shrink-0">
                {canRenew && (
                    <button onClick={onOpenRenew} className="px-3 py-1.5 text-xs font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-colors cursor-pointer">
                        续约 Renew
                    </button>
                )}
                <button onClick={onOpenRelease} className="px-3 py-1.5 text-xs font-medium bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/20 transition-colors cursor-pointer">
                    释放资源 Release
                </button>
            </div>
        </div>
    )
}
