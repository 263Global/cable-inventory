import { useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFocusTrap } from '@/hooks/useFocusTrap'

interface ModalProps {
    open: boolean
    title: string
    onClose: () => void
    children: ReactNode
    footer?: ReactNode
    maxWidthClassName?: string
    bodyClassName?: string
    footerClassName?: string
    closeLabel?: string
}

export function Modal({
    open,
    title,
    onClose,
    children,
    footer,
    maxWidthClassName = 'max-w-md',
    bodyClassName = 'px-6 py-4 space-y-4',
    footerClassName = 'px-6 py-4 border-t border-border-subtle flex justify-end gap-3',
    closeLabel = 'Close modal',
}: ModalProps) {
    const dialogRef = useRef<HTMLDivElement>(null)
    const closeButtonRef = useRef<HTMLButtonElement>(null)
    const titleId = useId()

    useFocusTrap({
        active: open,
        containerRef: dialogRef,
        onEscape: onClose,
        initialFocusRef: closeButtonRef,
    })

    if (!open) return null

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                className={cn('bg-surface rounded-xl border border-border-subtle w-full mx-4 shadow-2xl', maxWidthClassName)}
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
                    <h3 id={titleId} className="text-lg font-semibold">{title}</h3>
                    <button
                        ref={closeButtonRef}
                        type="button"
                        onClick={onClose}
                        aria-label={closeLabel}
                        className="p-1 rounded-md hover:bg-surface-hover text-text-dim hover:text-text cursor-pointer"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className={bodyClassName}>{children}</div>

                {footer ? (
                    <div className={footerClassName}>{footer}</div>
                ) : null}
            </div>
        </div>
    )
}
