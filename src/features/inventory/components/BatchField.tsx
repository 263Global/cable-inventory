import { useId, useState } from 'react'
import { getBatchFieldDisplayValue, shouldSaveBatchField } from '@/features/inventory/batchField'

interface BatchFieldProps {
    label: string
    value: string | number
    onSave: (value: string) => void
    type?: string
    disabled?: boolean
}

export function BatchField({ label, value, onSave, type = 'text', disabled = false }: BatchFieldProps) {
    const fieldId = useId()
    const [local, setLocal] = useState(String(value ?? ''))
    const [isEditing, setIsEditing] = useState(false)
    const displayValue = getBatchFieldDisplayValue(isEditing, local, value)

    return (
        <div>
            {label && <label htmlFor={fieldId} className="block text-xs text-text-dim mb-1">{label}</label>}
            <input
                id={fieldId}
                type={type}
                value={displayValue}
                onFocus={() => {
                    setIsEditing(true)
                    setLocal(String(value ?? ''))
                }}
                onChange={(event) => setLocal(event.target.value)}
                onBlur={() => {
                    if (shouldSaveBatchField(local, value, disabled)) onSave(local)
                    setIsEditing(false)
                }}
                disabled={disabled}
                className={`w-full px-2.5 py-1.5 bg-surface border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-1 focus:ring-primary ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
        </div>
    )
}
