import { useId, useRef } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { useFocusTrap } from '@/hooks/useFocusTrap'

interface ConfirmDialogProps {
    open: boolean
    title: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
    variant?: 'danger' | 'warning'
    loading?: boolean
    onConfirm: () => void
    onCancel: () => void
}

export function ConfirmDialog({
    open, title, message,
    confirmLabel = 'Delete', cancelLabel = 'Cancel',
    variant = 'danger', loading = false,
    onConfirm, onCancel,
}: ConfirmDialogProps) {
    const dialogRef = useRef<HTMLDivElement>(null)
    const confirmBtnRef = useRef<HTMLButtonElement>(null)
    const titleId = useId()
    const descriptionId = useId()

    useFocusTrap({
        active: open,
        containerRef: dialogRef,
        onEscape: onCancel,
        initialFocusRef: confirmBtnRef,
    })

    if (!open) return null

    const isDanger = variant === 'danger'

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} aria-hidden="true" />
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={descriptionId}
                tabIndex={-1}
                className="relative bg-surface border border-border-subtle rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 animate-in fade-in zoom-in-95 duration-200"
            >
                <div className="flex items-start gap-4">
                    <div className={`p-2.5 rounded-full ${isDanger ? 'bg-destructive/15' : 'bg-warning/15'}`}>
                        <AlertTriangle className={`h-5 w-5 ${isDanger ? 'text-destructive' : 'text-warning'}`} />
                    </div>
                    <div className="flex-1">
                        <h3 id={titleId} className="text-lg font-semibold text-text mb-1">{title}</h3>
                        <p id={descriptionId} className="text-sm text-text-muted leading-relaxed">{message}</p>
                    </div>
                </div>
                <div className="flex items-center justify-end gap-3 mt-6">
                    <button
                        onClick={onCancel}
                        disabled={loading}
                        className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text hover:bg-surface-hover rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        ref={confirmBtnRef}
                        onClick={onConfirm}
                        disabled={loading}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50 ${isDanger
                            ? 'bg-destructive hover:bg-destructive/90 text-white'
                            : 'bg-warning hover:bg-warning/90 text-black'
                            }`}
                    >
                        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    )
}
