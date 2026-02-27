import { type RefObject, useEffect, useRef } from 'react'

const FOCUSABLE_SELECTOR =
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface UseFocusTrapOptions {
    active: boolean
    containerRef: RefObject<HTMLElement | null>
    onEscape?: () => void
    initialFocusRef?: RefObject<HTMLElement | null>
    lockScroll?: boolean
    restoreFocus?: boolean
}

export function useFocusTrap({
    active,
    containerRef,
    onEscape,
    initialFocusRef,
    lockScroll = true,
    restoreFocus = true,
}: UseFocusTrapOptions) {
    const previousFocusRef = useRef<HTMLElement | null>(null)

    useEffect(() => {
        if (!active) return

        previousFocusRef.current = document.activeElement as HTMLElement

        const previousOverflow = document.body.style.overflow
        if (lockScroll) {
            document.body.style.overflow = 'hidden'
        }

        const container = containerRef.current
        if (container) {
            const firstFocusable = container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
            ;(initialFocusRef?.current ?? firstFocusable ?? container).focus()
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                if (onEscape) {
                    event.preventDefault()
                    onEscape()
                }
                return
            }

            if (event.key !== 'Tab') return

            const dialog = containerRef.current
            if (!dialog) return

            const focusableNodes = dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
            if (focusableNodes.length === 0) return

            const first = focusableNodes[0]
            const last = focusableNodes[focusableNodes.length - 1]

            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault()
                last.focus()
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault()
                first.focus()
            }
        }

        document.addEventListener('keydown', handleKeyDown)

        return () => {
            document.removeEventListener('keydown', handleKeyDown)

            if (lockScroll) {
                document.body.style.overflow = previousOverflow
            }

            if (restoreFocus) {
                previousFocusRef.current?.focus()
            }
        }
    }, [active, containerRef, initialFocusRef, lockScroll, onEscape, restoreFocus])
}
