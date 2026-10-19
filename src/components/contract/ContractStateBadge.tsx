import { Clock, Repeat } from 'lucide-react'
import {
    contractStateBadgeClass,
    contractStateLabel,
    type DerivedContractState,
} from '@/lib/contract-state'

interface ContractStateBadgeProps {
    derived: DerivedContractState
    /** compact：只显示徽标，细节放 title */
    compact?: boolean
}

function detailText(derived: DerivedContractState): string {
    if (derived.state === 'rolling') {
        return `滚动续期${derived.rollingSince ? `（${derived.rollingSince} 起）` : ''}，任一方提前 ${derived.noticePeriodDays} 天通知可撤租；最早可退出 ${derived.earliestExitDate ?? '—'}`
    }
    if (derived.state === 'notice_given') {
        return `已发撤租通知，最早退出日 ${derived.earliestExitDate ?? '—'}`
    }
    if (derived.state === 'in_term') {
        return derived.earliestExitDate ? `合同期内，到期 ${derived.earliestExitDate}` : '合同期内'
    }
    return '已终止'
}

export function ContractStateBadge({ derived, compact = false }: ContractStateBadgeProps) {
    const { state, daysToExit } = derived
    let label = contractStateLabel[state]
    if (state === 'notice_given' && daysToExit != null) {
        label = daysToExit > 0 ? `已通知·剩 ${daysToExit} 天` : '已通知·已到退出日'
    }
    const Icon = state === 'notice_given' ? Clock : state === 'rolling' ? Repeat : null

    return (
        <span
            title={detailText(derived)}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${contractStateBadgeClass[state]}`}
        >
            {Icon && <Icon className="h-3 w-3" />}
            {label}
            {!compact && state === 'rolling' && derived.earliestExitDate && (
                <span className="font-normal opacity-80">· 最早退出 {derived.earliestExitDate}</span>
            )}
        </span>
    )
}
