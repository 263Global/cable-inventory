interface InventoryFormFieldProps {
    label: string
    value: string
    onChange: (value: string) => void
    placeholder?: string
    type?: string
}

export function InventoryFormField({
    label,
    value,
    onChange,
    placeholder,
    type = 'text',
}: InventoryFormFieldProps) {
    return (
        <div>
            <label className="block text-xs font-medium text-text-muted mb-1">{label}</label>
            <input
                type={type}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-text-dim"
            />
        </div>
    )
}
