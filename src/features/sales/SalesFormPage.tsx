import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FileText } from 'lucide-react'
import { SalesFormOrderInfoStep } from '@/features/sales/components/SalesFormOrderInfoStep'
import { SalesFormLineItemsStep } from '@/features/sales/components/SalesFormLineItemsStep'
import { useSalesFormController } from '@/features/sales/useSalesFormController'

const stepLabels = ['Order Info', 'Line Items']

export function SalesFormPage() {
    const navigate = useNavigate()
    const { id } = useParams<{ id: string }>()

    const {
        isEdit,
        step,
        setStep,
        saving,
        orderId,
        internalRef,
        setInternalRef,
        customerId,
        setCustomerId,
        status,
        setStatus,
        notes,
        setNotes,
        items,
        customers,
        resources,
        circuitsByResource,
        addItem,
        removeItem,
        toggleCircuit,
        updateItem,
        updateItemResource,
        handleSave,
    } = useSalesFormController(id, navigate)

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-surface-hover transition-colors cursor-pointer">
                    <ArrowLeft className="h-5 w-5 text-text-muted" />
                </button>
                <FileText className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-bold">{isEdit ? `Edit ${orderId}` : 'New Sales Order'}</h1>
                {orderId && <span className="font-mono text-primary text-sm">{orderId}</span>}
            </div>

            <div className="flex items-center gap-4 mb-8">
                {stepLabels.map((label, index) => {
                    const stepNumber = index + 1
                    const active = step === stepNumber
                    const done = step > stepNumber
                    return (
                        <button
                            key={label}
                            onClick={() => setStep(stepNumber)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${active ? 'bg-primary text-white' : done ? 'bg-primary/10 text-primary' : 'bg-surface-hover text-text-muted'}`}
                        >
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${active ? 'bg-white/20' : done ? 'bg-primary/20' : 'bg-surface'}`}>
                                {stepNumber}
                            </span>
                            {label}
                        </button>
                    )
                })}
            </div>

            {step === 1 && (
                <SalesFormOrderInfoStep
                    customers={customers}
                    customerId={customerId}
                    status={status}
                    internalRef={internalRef}
                    notes={notes}
                    onCustomerChange={setCustomerId}
                    onStatusChange={setStatus}
                    onInternalRefChange={setInternalRef}
                    onNotesChange={setNotes}
                    onNext={() => setStep(2)}
                />
            )}

            {step === 2 && (
                <SalesFormLineItemsStep
                    items={items}
                    resources={resources}
                    circuitsByResource={circuitsByResource}
                    saving={saving}
                    isEdit={isEdit}
                    onRemoveItem={removeItem}
                    onUpdateItem={updateItem}
                    onUpdateItemResource={updateItemResource}
                    onToggleCircuit={toggleCircuit}
                    onAddItem={addItem}
                    onBack={() => setStep(1)}
                    onSave={handleSave}
                />
            )}
        </div>
    )
}
