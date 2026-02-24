import { type ReactNode } from 'react'
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react'
import {
    InventoryContractCostsStep,
    InventoryLocationsStep,
    InventoryResourceInfoStep,
} from '@/features/inventory/components/InventoryFormSteps'
import { useInventoryFormController } from '@/features/inventory/useInventoryFormController'

const steps = ['Resource Info', 'Locations', 'Contract & Costs']

function renderStepLabel(stepIndex: number, currentStep: number): ReactNode {
    if (stepIndex < currentStep) return <Check className="h-4 w-4" />
    return stepIndex + 1
}

export function InventoryFormPage() {
    const {
        isEdit,
        step,
        saving,
        loadingEdit,
        error,
        form,
        batches,
        cableSystems,
        suppliers,
        countriesA,
        countriesZ,
        stationsA,
        stationsZ,
        handoverLocations,
        isIRU,
        isLease,
        isBatchMode,
        batchTotalCapacity,
        baseCapacity,
        batchCapacityExceeded,
        setStep,
        updateForm,
        updateBatchRow,
        handleNext,
        handleSave,
        handleSpecPresetSelect,
        handleSpecInputChange,
        handleBackToInventory,
        handleAddBatch,
        handleRemoveBatch,
    } = useInventoryFormController()

    return (
        <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <button
                    onClick={handleBackToInventory}
                    className="p-2 rounded-lg hover:bg-surface-hover text-text-muted hover:text-text transition-colors cursor-pointer"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <h1 className="text-2xl font-bold">
                    {isEdit ? 'Edit Inventory Resource' : 'Add Inventory Resource'}
                </h1>
            </div>

            <div className="flex items-center gap-4 mb-8">
                {steps.map((s, i) => (
                    <div key={s} className="flex items-center gap-2">
                        <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                                i < step
                                    ? 'bg-primary text-primary-foreground'
                                    : i === step
                                      ? 'bg-primary text-primary-foreground ring-2 ring-primary/30'
                                      : 'bg-surface text-text-dim'
                            }`}
                        >
                            {renderStepLabel(i, step)}
                        </div>
                        <span className={`text-sm ${i <= step ? 'text-text font-medium' : 'text-text-dim'}`}>{s}</span>
                        {i < steps.length - 1 && <div className={`w-12 h-0.5 ${i < step ? 'bg-primary' : 'bg-border'}`} />}
                    </div>
                ))}
            </div>

            {loadingEdit && (
                <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 text-primary animate-spin" /></div>
            )}

            {!loadingEdit && (

                <div className="bg-surface rounded-xl border border-border-subtle p-6">
                    {step === 0 && (
                        <InventoryResourceInfoStep
                            form={form}
                            isBatchMode={isBatchMode}
                            cableSystems={cableSystems}
                            suppliers={suppliers}
                            onUpdateForm={updateForm}
                            onSpecPresetSelect={handleSpecPresetSelect}
                            onSpecInputChange={handleSpecInputChange}
                        />
                    )}

                    {step === 1 && (
                        <InventoryLocationsStep
                            form={form}
                            countriesA={countriesA}
                            countriesZ={countriesZ}
                            stationsA={stationsA}
                            stationsZ={stationsZ}
                            handoverLocations={handoverLocations}
                            onUpdateForm={updateForm}
                        />
                    )}

                    {step === 2 && (
                        <InventoryContractCostsStep
                            form={form}
                            isBatchMode={isBatchMode}
                            isIRU={isIRU}
                            isLease={isLease}
                            batches={batches}
                            batchTotalCapacity={batchTotalCapacity}
                            baseCapacity={baseCapacity}
                            batchCapacityExceeded={batchCapacityExceeded}
                            onUpdateForm={updateForm}
                            onUpdateBatchRow={updateBatchRow}
                            onAddBatch={handleAddBatch}
                            onRemoveBatch={handleRemoveBatch}
                        />
                    )}

                    {error && <div className="mt-4 text-destructive text-sm bg-destructive/10 rounded-lg px-4 py-3">{error}</div>}

                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-border-subtle">
                        <button
                            onClick={() => setStep((s) => s - 1)}
                            disabled={step === 0}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-text-muted hover:text-text hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        >
                            <ArrowLeft className="h-4 w-4" /> Back
                        </button>
                        {step < steps.length - 1 ? (
                            <button
                                onClick={handleNext}
                                className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-primary-foreground rounded-lg text-sm font-medium transition-colors cursor-pointer"
                            >
                                Next <ArrowRight className="h-4 w-4" />
                            </button>
                        ) : (
                            <button
                                onClick={handleSave}
                                disabled={saving || (isBatchMode && batchCapacityExceeded)}
                                className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-50 text-primary-foreground rounded-lg text-sm font-medium transition-colors cursor-pointer"
                            >
                                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                                <Check className="h-4 w-4" /> {isEdit ? 'Save Changes' : 'Create Resource'}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
