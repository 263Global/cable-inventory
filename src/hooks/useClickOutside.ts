import { useEffect, useRef } from 'react'

export function useClickOutside<T extends HTMLElement>(
    active: boolean,
    onOutsideClick: () => void,
) {
    const ref = useRef<T>(null)

    useEffect(() => {
        if (!active) return

        function handleClick(event: MouseEvent) {
            const element = ref.current
            if (!element) return
            if (!element.contains(event.target as Node)) {
                onOutsideClick()
            }
        }

        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [active, onOutsideClick])

    return ref
}
