/**
 * Sales Form Module (ES6)
 * Handles sales order form: modal, listeners, financials calculation, submission
 */

export { openAddSalesModal, openRenewModal } from './salesForm/modal.js';
export { attachSalesFormListeners } from './salesForm/listeners.js';
export { calculateSalesFinancials } from './salesForm/financials.js';
export { handleSalesSubmit } from './salesForm/submit.js';
