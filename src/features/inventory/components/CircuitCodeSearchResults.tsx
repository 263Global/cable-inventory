import { useEffect, useState } from 'react'
import { Hash, Loader2 } from 'lucide-react'
import { searchCircuitsByCode, type CircuitCodeMatch } from '@/features/inventory/api/circuit-codes'
import { looksLikeCode } from '@/lib/circuit-codes'

interface CircuitCodeSearchResultsProps {
    search: string
    onOpenDetail: (resourceId: string) => void
}

/** 库存列表搜索框输入像编号（SR / JOC / OB …）时，在列表上方列出命中的端口 */
export function CircuitCodeSearchResults({ search, onOpenDetail }: CircuitCodeSearchResultsProps) {
    // 结果按查询词存，搜索词变了旧结果自动作废（不在 effect 里同步清空）
    const [result, setResult] = useState<{ query: string; rows: CircuitCodeMatch[] }>({ query: '', rows: [] })
    const active = looksLikeCode(search)
    const loading = active && result.query !== search
    const matches = result.query === search ? result.rows : []

    useEffect(() => {
        if (!active) return
        let cancelled = false
        const timer = setTimeout(() => {
            searchCircuitsByCode(search)
                .then((rows) => { if (!cancelled) setResult({ query: search, rows }) })
                .catch((err) => {
                    console.error('Circuit code search failed:', err)
                    if (!cancelled) setResult({ query: search, rows: [] })
                })
        }, 250)
        return () => { cancelled = true; clearTimeout(timer) }
    }, [search, active])

    if (!active) return null

    return (
        <div className="mb-4 rounded-lg border border-border-subtle bg-surface">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border-subtle text-sm font-medium">
                <Hash className="h-4 w-4 text-primary" />
                编号匹配的端口
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-text-dim" /> : <span className="text-text-dim text-xs">{matches.length} 条</span>}
            </div>
            {!loading && matches.length === 0 && (
                <p className="px-4 py-3 text-xs text-text-dim">没有端口的 SR / JOC / Service ID / XC / OB / SO 编号包含 “{search.trim()}”</p>
            )}
            {matches.length > 0 && (
                <div className="divide-y divide-border-subtle">
                    {matches.map((match) => (
                        <button
                            key={match.circuit_id}
                            onClick={() => onOpenDetail(match.inventory_resource_id)}
                            className={`w-full text-left px-4 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs hover:bg-surface-hover cursor-pointer ${match.is_sellable ? 'bg-status-available/10' : ''}`}
                        >
                            <span className="font-medium text-sm w-36 shrink-0">
                                {match.resource_id} #{match.circuit_number}
                                <span className="ml-1 text-text-dim font-normal">{match.resource_ref}</span>
                            </span>
                            <span className="text-text-muted w-28 shrink-0">{match.capacity}G {match.interface_name ?? ''}</span>
                            <span className="font-mono text-text-muted">
                                {[
                                    match.supplier_sr && `SR ${match.supplier_sr}`,
                                    match.supplier_sr_old && `旧SR ${match.supplier_sr_old}`,
                                    match.supplier_service_id && `SID ${match.supplier_service_id}`,
                                    match.juno_circuit_id && `JOC ${match.juno_circuit_id}`,
                                ].filter(Boolean).join(' · ') || '—'}
                            </span>
                            <span className="ml-auto">
                                {match.is_sellable ? (
                                    <span className="px-1.5 py-0.5 rounded bg-status-available text-[10px] font-semibold text-white">可售</span>
                                ) : match.order_id ? (
                                    <span className="text-text-muted">{match.order_id} · {match.order_ref} · {match.customer_name ?? '—'} · {match.order_status}</span>
                                ) : (
                                    <span className="text-text-dim">{match.status}</span>
                                )}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
