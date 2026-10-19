import { useState } from 'react'
import { Loader2, Repeat } from 'lucide-react'
import { SalesModalFrame } from '@/features/sales/components/lifecycle/SalesModalFrame'
import {
    DEFAULT_NOTICE_PERIOD_DAYS,
    addDays,
    contractStateLabel,
    localToday,
    type ContractState,
    type NoticeBy,
} from '@/lib/contract-state'
import type { ContractStatePatch } from '@/features/sales/api/items'
import type { SalesOrderItem } from '@/types'

const EDITABLE_STATES: ContractState[] = ['in_term', 'rolling', 'notice_given']

interface ContractStateModalProps {
    item: SalesOrderItem | null
    currentState: ContractState | null
    loading: boolean
    onClose: () => void
    onConfirm: (patch: ContractStatePatch) => void
}

export function ContractStateModal({ item, currentState, loading, onClose, onConfirm }: ContractStateModalProps) {
    return (
        <SalesModalFrame open={!!item} onClose={onClose} maxWidthClassName="max-w-md">
            {item && (
                <ContractStateForm
                    key={item.id}
                    item={item}
                    currentState={currentState}
                    loading={loading}
                    onClose={onClose}
                    onConfirm={onConfirm}
                />
            )}
        </SalesModalFrame>
    )
}

function ContractStateForm({ item, currentState, loading, onClose, onConfirm }: ContractStateModalProps & { item: SalesOrderItem }) {
    const [state, setState] = useState<ContractState>(
        currentState && currentState !== 'terminated' ? currentState : 'rolling',
    )
    const [noticeDays, setNoticeDays] = useState(String(item.notice_period_days ?? DEFAULT_NOTICE_PERIOD_DAYS))
    const [noticeAt, setNoticeAt] = useState(item.notice_given_at ?? localToday())
    const [noticeBy, setNoticeBy] = useState<NoticeBy>(item.notice_by ?? 'customer')
    const [rollingSince, setRollingSince] = useState(item.rolling_since ?? (item.end_date ? addDays(item.end_date, 1) : ''))

    const days = parseInt(noticeDays, 10)
    const validDays = Number.isFinite(days) && days > 0
    const exitDate = state === 'notice_given' && validDays ? addDays(noticeAt, days) : null

    const submit = () => {
        if (!validDays) return
        const patch: ContractStatePatch = { contract_state: state, notice_period_days: days }
        if (state === 'rolling' || state === 'notice_given') patch.rolling_since = rollingSince || null
        if (state === 'notice_given') {
            patch.notice_given_at = noticeAt
            patch.notice_by = noticeBy
        }
        onConfirm(patch)
    }

    const inputClass = 'w-full bg-background border border-border-subtle rounded-lg px-3 py-2 text-sm'

    return (
        <>
            <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
                <Repeat className="h-5 w-5 text-sky-400" /> 合同状态
            </h3>
            <p className="text-sm text-text-muted mb-4">
                {item.capacity ? `${item.capacity}G · ` : ''}原结束日 {item.end_date ?? '—'}。
                合同期满未续签自动进入滚动续期（软占用），任一方提前通知即可撤租。
            </p>

            <div className="space-y-3">
                <div>
                    <label className="text-xs text-text-dim block mb-1">状态</label>
                    <div className="grid grid-cols-3 gap-2">
                        {EDITABLE_STATES.map((value) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setState(value)}
                                className={`px-2 py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${state === value
                                    ? 'border-primary bg-primary/10 text-primary'
                                    : 'border-border-subtle hover:bg-surface-hover text-text-muted'}`}
                            >
                                {contractStateLabel[value]}
                            </button>
                        ))}
                    </div>
                </div>

                {(state === 'rolling' || state === 'notice_given') && (
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-text-dim block mb-1">滚动起始日</label>
                            <input type="date" value={rollingSince} onChange={(e) => setRollingSince(e.target.value)} className={inputClass} />
                        </div>
                        <div>
                            <label className="text-xs text-text-dim block mb-1">通知期（天）</label>
                            <input type="number" min={1} value={noticeDays} onChange={(e) => setNoticeDays(e.target.value)} className={inputClass} />
                        </div>
                    </div>
                )}

                {state === 'notice_given' && (
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-text-dim block mb-1">通知发出日</label>
                            <input type="date" value={noticeAt} onChange={(e) => setNoticeAt(e.target.value)} className={inputClass} />
                        </div>
                        <div>
                            <label className="text-xs text-text-dim block mb-1">通知方</label>
                            <select value={noticeBy} onChange={(e) => setNoticeBy(e.target.value as NoticeBy)} className={inputClass}>
                                <option value="customer">客户</option>
                                <option value="us">我方</option>
                            </select>
                        </div>
                        <p className="col-span-2 text-xs text-text-muted">
                            最早退出日：<span className="font-medium text-text">{exitDate ?? '—'}</span>
                        </p>
                    </div>
                )}

                {state === 'in_term' && (
                    <p className="text-xs text-text-muted">改回"合同期内"会清空滚动与通知信息。续签请用订单的 Renew 功能（会更新起止日）。</p>
                )}

                <p className="text-xs text-text-dim">正式终止（释放端口、记 ETF）请用订单的 Terminate 功能。</p>
                {!validDays && <p className="text-xs text-red-400">通知期需为正整数</p>}
            </div>

            <div className="flex justify-end gap-2 mt-4">
                <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg hover:bg-surface-hover transition-colors cursor-pointer">
                    取消
                </button>
                <button
                    onClick={submit}
                    disabled={loading || !validDays}
                    className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors cursor-pointer disabled:opacity-50"
                >
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    保存
                </button>
            </div>
        </>
    )
}
