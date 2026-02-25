import { useState, useEffect, useRef, useMemo } from 'react'
import { Search, ChevronDown, X } from 'lucide-react'

interface Option {
    value: string
    label: string
    sublabel?: string
    group?: string
}

interface SearchableSelectProps {
    options: Option[]
    value: string
    onChange: (value: string) => void
    placeholder?: string
    disabled?: boolean
    loading?: boolean
}

export function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = 'Select...',
    disabled = false,
    loading = false,
}: SearchableSelectProps) {
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState('')
    const ref = useRef<HTMLDivElement>(null)

    // Close on click outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false)
                setSearch('')
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const filtered = options.filter(
        (o) =>
            o.label.toLowerCase().includes(search.toLowerCase()) ||
            (o.sublabel ?? '').toLowerCase().includes(search.toLowerCase())
    )

    const selected = options.find((o) => o.value === value)

    const hasGroups = options.some((o) => o.group)

    const grouped = useMemo(() => {
        if (!hasGroups) return null
        const map = new Map<string, Option[]>()
        for (const opt of filtered) {
            const g = opt.group || 'Other'
            const list = map.get(g) ?? []
            list.push(opt)
            map.set(g, list)
        }
        return map
    }, [filtered, hasGroups])

    const renderOption = (opt: Option) => (
        <button
            type="button"
            key={opt.value}
            onClick={() => { onChange(opt.value); setOpen(false); setSearch('') }}
            className={`w-full px-3 py-2 text-left text-sm hover:bg-surface-hover transition-colors cursor-pointer ${opt.value === value ? 'bg-primary/10 text-primary' : 'text-text'
                }`}
        >
            <div>{opt.label}</div>
            {opt.sublabel && (
                <div className="text-xs text-text-dim mt-0.5">{opt.sublabel}</div>
            )}
        </button>
    )

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => !disabled && setOpen(!open)}
                disabled={disabled}
                className={`w-full flex items-center justify-between px-3 py-2.5 bg-background border border-border rounded-lg text-sm text-left transition-colors cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary focus:ring-2 focus:ring-primary'
                    }`}
            >
                <span className={selected ? 'text-text' : 'text-text-dim'}>
                    {loading ? 'Loading...' : selected ? selected.label : placeholder}
                </span>
                <div className="flex items-center gap-1">
                    {value && !disabled && (
                        <span
                            onClick={(e) => { e.stopPropagation(); onChange(''); setSearch('') }}
                            className="p-0.5 hover:bg-surface-hover rounded cursor-pointer"
                        >
                            <X className="h-3 w-3 text-text-dim" />
                        </span>
                    )}
                    <ChevronDown className={`h-4 w-4 text-text-dim transition-transform ${open ? 'rotate-180' : ''}`} />
                </div>
            </button>

            {open && (
                <div className="absolute z-50 mt-1 w-full bg-surface border border-border-subtle rounded-lg shadow-xl max-h-60 overflow-hidden">
                    {/* Search input */}
                    <div className="p-2 border-b border-border-subtle">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-dim" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search..."
                                autoFocus
                                className="w-full pl-8 pr-3 py-1.5 bg-background border border-border rounded text-sm text-text focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-text-dim"
                            />
                        </div>
                    </div>
                    {/* Options */}
                    <div className="overflow-y-auto max-h-48">
                        {filtered.length === 0 ? (
                            <div className="px-3 py-4 text-sm text-text-dim text-center">No results</div>
                        ) : grouped ? (
                            Array.from(grouped.entries()).map(([groupName, groupOptions]) => (
                                <div key={groupName}>
                                    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-dim bg-surface-hover/50 sticky top-0">
                                        {groupName}
                                    </div>
                                    {groupOptions.map(renderOption)}
                                </div>
                            ))
                        ) : (
                            filtered.map(renderOption)
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
