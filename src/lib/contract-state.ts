/**
 * 滚动续期 / 软占用（migration 028）
 *
 * 口径：客户合同期满未续签 → 自动顺延为开口合同（rolling），任一方提前通知期（默认 30 天）可撤租，资源仍在用。
 *   - in_term       合同期内        → 硬占用
 *   - rolling       滚动续期        → 软占用
 *   - notice_given  已发撤租通知    → 软占用（倒计时到最早退出日）
 *   - terminated    已终止          → 不占用
 * 滚动合同的收入只按"未来 1 个月确定"计。
 *
 * 规则与数据库视图 sales_item_contract_status 保持一致。本文件不依赖任何别名导入，便于单测。
 */

export type ContractState = 'in_term' | 'rolling' | 'notice_given' | 'terminated'
export type NoticeBy = 'customer' | 'us'
export type OccupancyKind = 'hard' | 'soft' | 'none'

export const CONTRACT_STATES: ContractState[] = ['in_term', 'rolling', 'notice_given', 'terminated']
export const DEFAULT_NOTICE_PERIOD_DAYS = 30

/** 占用容量的订单状态（Draft / Terminated / Cancelled 不占） */
export const OCCUPYING_ORDER_STATUSES = ['Pre-sold', 'Active', 'Expired']

export const contractStateLabel: Record<ContractState, string> = {
    in_term: '合同期内',
    rolling: '滚动·软占用',
    notice_given: '已通知撤租',
    terminated: '已终止',
}

export const contractStateBadgeClass: Record<ContractState, string> = {
    in_term: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
    rolling: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
    notice_given: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
    terminated: 'bg-gray-500/15 text-gray-600 dark:text-gray-400',
}

export interface ContractStateInput {
    contract_state?: ContractState | null
    end_date?: string | null
    rolling_since?: string | null
    notice_period_days?: number | null
    notice_given_at?: string | null
    terminated_at?: string | null
    status?: string | null          // 订单行状态
}

export interface DerivedContractState {
    state: ContractState
    occupancy: OccupancyKind
    rollingSince: string | null
    noticePeriodDays: number
    /** 最早可退出日：rolling = 今天 + 通知期；notice_given = 通知日 + 通知期；in_term = 原结束日 */
    earliestExitDate: string | null
    /** 距最早退出日的天数（notice_given / rolling 用于倒计时） */
    daysToExit: number | null
}

// ---- 纯日期（YYYY-MM-DD）运算，按 UTC 计算避免时区偏移 ----
function toUtcMs(date: string): number | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date)
    if (!m) return null
    return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

function fromUtcMs(ms: number): string {
    return new Date(ms).toISOString().slice(0, 10)
}

export function addDays(date: string, days: number): string {
    const ms = toUtcMs(date)
    if (ms == null) return date
    return fromUtcMs(ms + days * 86_400_000)
}

export function diffDays(from: string, to: string): number | null {
    const a = toUtcMs(from)
    const b = toUtcMs(to)
    if (a == null || b == null) return null
    return Math.round((b - a) / 86_400_000)
}

export function localToday(now: Date = new Date()): string {
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

/** 计算订单行的有效合同状态（与 DB 视图 sales_item_contract_status 同一规则） */
export function deriveContractState(
    item: ContractStateInput,
    orderStatus: string | null | undefined,
    today: string = localToday(),
): DerivedContractState {
    const noticePeriodDays = item.notice_period_days && item.notice_period_days > 0
        ? item.notice_period_days
        : DEFAULT_NOTICE_PERIOD_DAYS

    const isTerminated = item.contract_state === 'terminated'
        || Boolean(item.terminated_at)
        || item.status === 'Terminated' || item.status === 'Cancelled'
        || orderStatus === 'Terminated' || orderStatus === 'Cancelled'

    const pastEnd = Boolean(item.end_date) && (item.end_date as string) < today

    let state: ContractState
    if (isTerminated) state = 'terminated'
    else if (item.contract_state === 'notice_given') state = 'notice_given'
    else if (item.contract_state === 'rolling' || pastEnd) state = 'rolling'
    else state = 'in_term'

    const rollingSince = item.rolling_since
        ?? (pastEnd && item.end_date ? addDays(item.end_date, 1) : null)

    let earliestExitDate: string | null = null
    if (state === 'rolling') earliestExitDate = addDays(today, noticePeriodDays)
    else if (state === 'notice_given') earliestExitDate = addDays(item.notice_given_at || today, noticePeriodDays)
    else if (state === 'in_term') earliestExitDate = item.end_date ?? null

    const occupancy: OccupancyKind = state === 'terminated' || !OCCUPYING_ORDER_STATUSES.includes(orderStatus ?? '')
        ? 'none'
        : state === 'in_term' ? 'hard' : 'soft'

    return {
        state,
        occupancy,
        rollingSince: state === 'rolling' || state === 'notice_given' ? rollingSince : null,
        noticePeriodDays,
        earliestExitDate,
        daysToExit: earliestExitDate ? diffDays(today, earliestExitDate) : null,
    }
}

/** 从 today 到 endDate（含）之间的整月数，向上取整，用于合同期内的确定收入 */
export function monthsUntil(today: string, endDate: string | null | undefined): number {
    if (!endDate) return 0
    const days = diffDays(today, endDate)
    if (days == null || days < 0) return 0
    return Math.ceil((days + 1) / 30.4375)
}

/**
 * 未来 horizonMonths 个月"确定"的经常性收入（MRC 口径）：
 *   - in_term：MRC × min(剩余月数, horizon)；无结束日按 horizon 计
 *   - rolling：只计 1 个月
 *   - notice_given：MRC × min(到退出日的月数, 1)，已过退出日为 0
 *   - terminated / 不占用：0
 */
export function committedRecurringRevenue(
    mrc: number | null | undefined,
    derived: DerivedContractState,
    endDate: string | null | undefined,
    today: string = localToday(),
    horizonMonths = 12,
): number {
    const value = Number(mrc) || 0
    if (value <= 0 || derived.occupancy === 'none') return 0
    if (derived.state === 'rolling') return value
    if (derived.state === 'notice_given') {
        const days = derived.daysToExit ?? 0
        return days > 0 ? value * Math.min(1, days / 30.4375) : 0
    }
    const months = endDate ? Math.min(monthsUntil(today, endDate), horizonMonths) : horizonMonths
    return value * months
}
