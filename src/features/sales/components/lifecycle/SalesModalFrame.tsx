import type { ReactNode } from 'react'

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
    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
            <div
                className={`bg-surface rounded-xl border border-border-subtle p-6 w-full mx-4 max-h-[80vh] overflow-y-auto ${maxWidthClassName}`}
                onClick={(event) => event.stopPropagation()}
            >
                {children}
            </div>
        </div>
    )
}
