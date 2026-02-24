import { useCallback, useState } from 'react'

interface Options {
    storageKey: string
    allKeys: string[]
    defaultKeys: string[]
}

function loadStoredKeys({ storageKey, allKeys, defaultKeys }: Options): string[] {
    try {
        const raw = localStorage.getItem(storageKey)
        if (!raw) return defaultKeys
        const parsed = JSON.parse(raw)
        if (!Array.isArray(parsed)) return defaultKeys

        const valid = parsed.filter((item): item is string =>
            typeof item === 'string' && allKeys.includes(item),
        )
        return valid.length > 0 ? valid : defaultKeys
    } catch {
        return defaultKeys
    }
}

export function usePersistentColumnVisibility(options: Options) {
    const { storageKey, defaultKeys } = options
    const [visibleKeys, setVisibleKeys] = useState<string[]>(() => loadStoredKeys(options))

    const write = useCallback((keys: string[]) => {
        localStorage.setItem(storageKey, JSON.stringify(keys))
    }, [storageKey])

    const toggleKey = useCallback((key: string) => {
        setVisibleKeys((prev) => {
            const next = prev.includes(key)
                ? prev.filter((k) => k !== key)
                : [...prev, key]
            write(next)
            return next
        })
    }, [write])

    const reset = useCallback(() => {
        setVisibleKeys(defaultKeys)
        write(defaultKeys)
    }, [defaultKeys, write])

    return {
        visibleKeys,
        toggleKey,
        reset,
    }
}
