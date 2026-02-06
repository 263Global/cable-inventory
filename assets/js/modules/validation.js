/**
 * Form Validation Module
 * Validation utilities for forms throughout the application
 */

/**
 * Validates sales order form and displays errors
 * @param {HTMLFormElement} form - The form to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function validateSalesForm(form) {
    // Clear previous errors
    form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid', 'shake'));
    form.querySelectorAll('.validation-error').forEach(el => el.remove());

    let isValid = true;
    const errors = [];

    // Helper to show error
    const showError = (fieldName, message) => {
        const field = form.querySelector(`[name="${fieldName}"]`);
        if (field) {
            field.classList.add('is-invalid', 'shake');
            // Remove shake after animation
            setTimeout(() => field.classList.remove('shake'), 400);
            // Add error message
            const errorEl = document.createElement('div');
            errorEl.className = 'validation-error';
            errorEl.innerHTML = `<ion-icon name="alert-circle-outline"></ion-icon> ${message}`;
            field.parentNode.appendChild(errorEl);
        }
        errors.push(message);
        isValid = false;
    };

    // Helper to get field value
    const getVal = (name) => form.querySelector(`[name="${name}"]`)?.value?.trim();
    const getNum = (name) => Number(form.querySelector(`[name="${name}"]`)?.value || 0);
    const getJson = (name) => {
        const raw = form.querySelector(`[name="${name}"]`)?.value || '';
        if (!raw) return [];
        try {
            return JSON.parse(raw);
        } catch {
            return [];
        }
    };

    // Required field validation
    if (!getVal('customerId')) {
        showError('customerId', 'Customer is required');
    }

    if (!getVal('salesperson')) {
        showError('salesperson', 'Salesperson is required');
    }

    // Only validate inventoryLink for non-Resale types
    const salesType = getVal('salesType');
    if (salesType !== 'Resale' && !getVal('inventoryLink')) {
        showError('inventoryLink', 'Linked Resource is required');
    }

    if (!getVal('dates.start')) {
        showError('dates.start', 'Contract Start date is required');
    }

    // Number validation (non-negative)
    const capacityValue = getNum('capacity.value');
    if (capacityValue <= 0) {
        showError('capacity.value', 'Capacity must be greater than 0');
    }

    const term = getNum('dates.term');
    if (term <= 0) {
        showError('dates.term', 'Term must be greater than 0');
    }

    // Batch allocation validation
    const inventoryId = getVal('inventoryLink');
    const inventory = inventoryId ? window.Store.getInventory().find(i => i.resourceId === inventoryId) : null;
    if (inventory?.costMode === 'batches') {
        const allocations = getJson('batchAllocations');
        const batchErrorEl = form.querySelector('#batch-allocation-error');
        if (batchErrorEl) {
            batchErrorEl.style.display = 'none';
            batchErrorEl.textContent = '';
        }
        const totalAllocated = allocations.reduce((sum, a) => sum + (Number(a.capacityAllocated) || 0), 0);
        if (totalAllocated <= 0) {
            if (batchErrorEl) {
                batchErrorEl.textContent = 'Please allocate capacity to active batches.';
                batchErrorEl.style.display = 'block';
            }
            errors.push('Batch allocation is required');
            isValid = false;
        } else if (Math.abs(totalAllocated - capacityValue) > 0.0001) {
            if (batchErrorEl) {
                batchErrorEl.textContent = `Allocated capacity (${totalAllocated}) must equal Sales Capacity (${capacityValue}).`;
                batchErrorEl.style.display = 'block';
            }
            errors.push('Batch allocation does not match sales capacity');
            isValid = false;
        } else {
            const orderId = getVal('orderId') || null;
            const batches = window.Store.getInventoryBatches(inventoryId);
            allocations.forEach(allocation => {
                const batch = batches.find(b => b.batchId === allocation.batchId);
                if (!batch) return;
                if (batch.status === 'Planned' || batch.status === 'Ended') {
                    if (batchErrorEl) {
                        batchErrorEl.textContent = 'Allocation can only use Active batches.';
                        batchErrorEl.style.display = 'block';
                    }
                    errors.push('Allocation includes inactive batch');
                    isValid = false;
                    return;
                }
                const available = (batch.capacity?.value || 0) - window.Store.getBatchAllocatedCapacity(batch.batchId, orderId);
                if ((allocation.capacityAllocated || 0) > available + 0.0001) {
                    if (batchErrorEl) {
                        batchErrorEl.textContent = `Allocated capacity exceeds available for batch ${batch.orderId || batch.batchId}.`;
                        batchErrorEl.style.display = 'block';
                    }
                    errors.push('Allocation exceeds batch capacity');
                    isValid = false;
                }
            });
        }
    }

    // Date logic validation
    const startDate = getVal('dates.start');
    const endDate = getVal('dates.end');
    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (end < start) {
            showError('dates.end', 'End date must be after start date');
        }
    }

    // Scroll to first error if any
    if (!isValid) {
        const firstError = form.querySelector('.is-invalid');
        if (firstError) {
            firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            firstError.focus();
        } else {
            const batchError = form.querySelector('#batch-allocation-error');
            if (batchError && batchError.style.display !== 'none') {
                batchError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }

    return isValid;
}

// Export to global scope for use by App
window.validateSalesForm = validateSalesForm;
