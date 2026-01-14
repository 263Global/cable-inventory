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

    // Required field validation
    if (!getVal('customerId')) {
        showError('customerId', 'Customer is required');
    }

    if (!getVal('salesperson')) {
        showError('salesperson', 'Salesperson is required');
    }

    if (!getVal('inventoryLink')) {
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
        }
    }

    return isValid;
}

// Export to global scope for use by App
window.validateSalesForm = validateSalesForm;
