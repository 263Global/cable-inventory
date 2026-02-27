import { useState, useEffect, useRef, useMemo, useId, type KeyboardEvent } from 'react'
import { Search, ChevronDown, X } from 'lucide-react'

interface Option {
    value: string
    label: string
    sublabel?: string
    group?: string
    disabled?: boolean
}

interface SearchableSelectProps {
    options: Option[]
    value: string
    onChange: (value: string) => void
    id?: string
    placeholder?: string
    disabled?: boolean
    loading?: boolean
}

export function SearchableSelect({
    options,
    value,
    onChange,
    id,
    placeholder = 'Select...',
    disabled = false,
    loading = false,
}: SearchableSelectProps) {
    const generatedId = useId()
    const inputId = id ?? generatedId
    const listboxId = `${inputId}-listbox`
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState('')
    const [activeValue, setActiveValue] = useState<string | null>(null)
    const ref = useRef<HTMLDivElement>(null)
    const triggerRef = useRef<HTMLButtonElement>(null)
    const searchInputRef = useRef<HTMLInputElement>(null)

    // Close on click outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false)
                setSearch('')
                setActiveValue(null)
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

    const enabledValues = useMemo(
        () => filtered.filter((option) => !option.disabled).map((option) => option.value),
        [filtered],
    )

    const optionIdByValue = useMemo(
        () => new Map(filtered.map((option, index) => [option.value, `${inputId}-option-${index}`])),
        [filtered, inputId],
    )

    const activeOptionId = activeValue ? optionIdByValue.get(activeValue) : undefined

    useEffect(() => {
        if (!open) {
            setActiveValue(null)
            return
        }

        if (enabledValues.length === 0) {
            setActiveValue(null)
            return
        }

        if (value && enabledValues.includes(value)) {
            setActiveValue(value)
            return
        }

        setActiveValue((previous) => (previous && enabledValues.includes(previous) ? previous : enabledValues[0]))
    }, [open, enabledValues, value])

    useEffect(() => {
        if (!open) return
        searchInputRef.current?.focus()
    }, [open])

    useEffect(() => {
        if (!open || !activeOptionId) return
        const activeElement = document.getElementById(activeOptionId)
        activeElement?.scrollIntoView({ block: 'nearest' })
    }, [open, activeOptionId])

    const closeAndReset = () => {
        setOpen(false)
        setSearch('')
        setActiveValue(null)
    }

    const selectOption = (opt: Option) => {
        if (opt.disabled) return
        onChange(opt.value)
        closeAndReset()
        triggerRef.current?.focus()
    }

    const moveActive = (direction: 'next' | 'prev') => {
        if (enabledValues.length === 0) return

        setActiveValue((previous) => {
            const currentIndex = previous ? enabledValues.indexOf(previous) : -1

            if (currentIndex === -1) {
                return direction === 'next'
                    ? enabledValues[0]
                    : enabledValues[enabledValues.length - 1]
            }

            const offset = direction === 'next' ? 1 : -1
            return enabledValues[(currentIndex + offset + enabledValues.length) % enabledValues.length]
        })
    }

    const selectActiveOption = () => {
        if (!activeValue) return
        const option = filtered.find((item) => item.value === activeValue)
        if (option) {
            selectOption(option)
        }
    }

    const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
        if (disabled) return

        if (event.key === 'ArrowDown') {
            event.preventDefault()
            if (!open) setOpen(true)
            moveActive('next')
            return
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault()
            if (!open) setOpen(true)
            moveActive('prev')
            return
        }

        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            if (!open) {
                setOpen(true)
            } else {
                selectActiveOption()
            }
            return
        }

        if (event.key === 'Escape') {
            event.preventDefault()
            closeAndReset()
        }
    }

    const renderOption = (opt: Option) => {
        const optionId = optionIdByValue.get(opt.value)
        const isActive = opt.value === activeValue
        const isSelected = opt.value === value

        return (
            <button
                type="button"
                id={optionId}
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                disabled={opt.disabled}
                onMouseEnter={() => {
                    if (!opt.disabled) setActiveValue(opt.value)
                }}
                onClick={() => selectOption(opt)}
                className={`w-full px-3 py-2 text-left text-sm transition-colors ${opt.disabled
                    ? 'opacity-50 cursor-not-allowed text-text-dim'
                    : isActive && isSelected
                        ? 'bg-primary/15 text-primary cursor-pointer'
                        : isActive
                            ? 'bg-surface-hover text-text cursor-pointer'
                            : isSelected
                                ? 'bg-primary/10 text-primary cursor-pointer'
                                : 'text-text hover:bg-surface-hover cursor-pointer'
                    }`}
            >
                <div>{opt.label}</div>
                {opt.sublabel && (
                    <div className="text-xs text-text-dim mt-0.5">{opt.sublabel}</div>
                )}
            </button>
        )
    }

    return (
        <div ref={ref} className="relative">
            {value && !disabled && (
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation()
                        onChange('')
                        setSearch('')
                        setActiveValue(null)
                    }}
                    className="absolute right-9 top-1/2 -translate-y-1/2 z-10 p-0.5 hover:bg-surface-hover rounded cursor-pointer"
                    aria-label="Clear selection"
                >
                    <X className="h-3 w-3 text-text-dim" />
                </button>
            )}

            <button
                id={inputId}
                ref={triggerRef}
                type="button"
                onClick={() => !disabled && setOpen(!open)}
                onKeyDown={handleTriggerKeyDown}
                disabled={disabled}
                role="combobox"
                aria-expanded={open}
                aria-haspopup="listbox"
                aria-controls={open ? listboxId : undefined}
                aria-activedescendant={open ? activeOptionId : undefined}
                className={`w-full flex items-center justify-between px-3 py-2.5 pr-10 bg-background border border-border rounded-lg text-sm text-left transition-colors cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary focus:ring-2 focus:ring-primary'
                    }`}
            >
                <span className={selected ? 'text-text' : 'text-text-dim'}>
                    {loading ? 'Loading...' : selected ? selected.label : placeholder}
                </span>
                <ChevronDown className={`h-4 w-4 text-text-dim transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div
                    id={listboxId}
                    role="listbox"
                    className="absolute z-50 mt-1 w-full bg-surface border border-border-subtle rounded-lg shadow-xl max-h-60 overflow-hidden"
                >
                    {/* Search input */}
                    <div className="p-2 border-b border-border-subtle">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-dim" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === 'ArrowDown') {
                                        event.preventDefault()
                                        moveActive('next')
                                        return
                                    }

                                    if (event.key === 'ArrowUp') {
                                        event.preventDefault()
                                        moveActive('prev')
                                        return
                                    }

                                    if (event.key === 'Enter') {
                                        event.preventDefault()
                                        selectActiveOption()
                                        return
                                    }

                                    if (event.key === 'Escape') {
                                        event.preventDefault()
                                        closeAndReset()
                                        triggerRef.current?.focus()
                                    }
                                }}
                                placeholder="Search..."
                                autoFocus
                                aria-label="Search options"
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
