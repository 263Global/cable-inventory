import { useId, useRef, type ReactNode } from 'react'
import { useFocusTrap } from '@/hooks/useFocusTrap'

interface SalesModalFrameProps {
    open: boolean
    onClose: () => void
    maxWidthClassName: string
    children: ReactNode
}

export function SalesModalFrame({
    open,
    onClose,
    maxWidthClassName,
    children,
}: SalesModalFrameProps) {
    const dialogRef = useRef<HTMLDivElement>(null)
    const titleId = useId()

    useFocusTrap({
        active: open,
        containerRef: dialogRef,
        onEscape: onClose,
    })

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                className={`bg-surface rounded-xl border border-border-subtle p-6 w-full mx-4 max-h-[80vh] overflow-y-auto ${maxWidthClassName}`}
                onClick={(event) => event.stopPropagation()}
            >
                <h2 id={titleId} className="sr-only">Sales modal</h2>
                {children}
            </div>
        </div>
    )
}
