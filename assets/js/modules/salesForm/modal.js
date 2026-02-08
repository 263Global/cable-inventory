/**
 * Sales form modal rendering and renewal flows.
 */

import { escapeHtml } from './utils.js';
import { buildSalesModalContent } from './modalContent.js';
import { setupEditModeCostHydration } from './editCostHydration.js';
import { initSalesModalDropdowns } from './modalDropdowns.js';

export function openAddSalesModal(context, existingOrderId = null) {
    // Get existing order for edit mode
    const existingOrder = existingOrderId ? window.Store.getSales().find(s => s.salesOrderId === existingOrderId) : null;
    const isEditMode = !!existingOrder;

    // Store edit mode info on App for submit handler
    context._editingOrderId = existingOrderId;

    // Get Available Resources
    const availableResources = window.Store.getAvailableResources();
    const allSales = window.Store.getSales();

    // For edit mode, include current linked resource even if not available
    let resourceOptionsArr = [...availableResources];
    if (isEditMode && existingOrder.inventoryLink) {
        const currentResource = window.Store.getInventory().find(r => r.resourceId === existingOrder.inventoryLink);
        if (currentResource && !resourceOptionsArr.find(r => r.resourceId === currentResource.resourceId)) {
            resourceOptionsArr.unshift(currentResource);
        }
    }

    const resourceOptions = resourceOptionsArr.map(r => {
        // Calculate available capacity
        const linkedSales = allSales.filter(s => s.inventoryLink === r.resourceId && s.salesOrderId !== existingOrderId);
        let soldCapacity = 0;
        linkedSales.forEach(s => { soldCapacity += (s.capacity?.value || 0); });
        const availableCapacity = (r.capacity?.value || 0) - soldCapacity;

        return {
            value: r.resourceId,
            label: `${r.resourceId} - ${r.cableSystem} (${availableCapacity} ${r.capacity?.unit || 'Gbps'} available)`
        };
    });

    // Generate customer options for searchable dropdown
    const customers = window.Store.getCustomers();
    const customerDropdownOptions = customers.map(c => ({
        value: c.id,
        label: c.short_name,
        subtitle: c.full_name || ''
    }));
    const existingCustomerId = existingOrder?.customerId || (() => {
        const name = (existingOrder?.customerName || '').trim().toLowerCase();
        if (!name) return '';
        const match = customers.find(c => {
            const shortName = (c.short_name || '').trim().toLowerCase();
            const fullName = (c.full_name || '').trim().toLowerCase();
            return shortName === name || fullName === name;
        });
        return match?.id || '';
    })();

    // Generate supplier options for cost card dropdowns
    const suppliers = window.Store.getSuppliers();
    const supplierOptionsHTML = suppliers.map(s => {
        const safeId = escapeHtml(s.id);
        const safeShort = escapeHtml(s.short_name || '');
        const safeFull = escapeHtml(s.full_name || '');
        const label = safeFull ? `${safeShort} (${safeFull})` : safeShort;
        return `<option value="${safeId}">${label}</option>`;
    }).join('');

    const normalizeCableSegments = (costs = {}) => {
        if (Array.isArray(costs.cableSegments) && costs.cableSegments.length) {
            return costs.cableSegments;
        }
        const legacy = costs.cable || costs.cableCost;
        return legacy ? [legacy] : [];
    };

    const summarizeCableSegments = (segments, salesModel, defaultTerm) => {
        const summary = { monthly: 0, onetime: 0 };
        const termFallback = defaultTerm || 12;
        segments.forEach(seg => {
            const model = seg.model || 'Lease';
            const annualOm = Number(seg.annualOm || 0);
            const otc = Number(seg.otc || 0);
            const term = Number(seg.termMonths || termFallback || 1);
            if (salesModel === 'IRU') {
                const monthlyOtc = term > 0 ? (otc / term) : 0;
                summary.monthly += monthlyOtc + (annualOm / 12);
                summary.onetime += otc;
            } else if (model === 'IRU') {
                summary.monthly += annualOm / 12;
            } else {
                summary.monthly += Number(seg.mrc || 0);
                summary.onetime += Number(seg.nrc || 0);
            }
        });
        return summary;
    };

    const existingSalesModel = existingOrder?.salesModel || 'Lease';
    const existingTerm = existingOrder?.dates?.term || 12;
    const cableSegments = normalizeCableSegments(existingOrder?.costs || {});
    const cableSummary = summarizeCableSegments(cableSegments, existingSalesModel, existingTerm);


    const modalContent = buildSalesModalContent({
        existingOrder,
        isEditMode,
        existingCustomerId,
        customerCount: customers.length,
        availableResourceCount: availableResources.length,
        cableSummary,
        cableSegments,
        supplierOptionsHTML
    });

    context.openModal(isEditMode ? `Edit Sales Order: ${existingOrderId}` : 'New Sales Order', modalContent, (form) => context.handleSalesSubmit(form), true); // true for large modal

    context.modalContainer.querySelectorAll('[data-action="navigate-customers-from-sales"]').forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            context.renderView('customers');
            context.closeModal();
        });
    });

    initSalesModalDropdowns({ customerDropdownOptions, resourceOptions });

    // Attach Event Listeners for Dynamic Logic
    context.attachSalesFormListeners();

    // Smart default: Auto-expand Cable cost card for new Resale orders
    if (!isEditMode) {
        // Check current sales type and auto-add cable card for Resale
        const checkAndAutoAddCable = () => {
            const salesTypeSelect = document.getElementById('sales-type-select');
            const addCableBtn = document.getElementById('add-cable-btn');
            const cardsContainer = document.getElementById('cost-cards-container');

            if (salesTypeSelect && addCableBtn && cardsContainer) {
                const salesType = salesTypeSelect.value || 'Resale';
                // Only auto-add if Resale and no cable card exists yet
                if (salesType === 'Resale' && !cardsContainer.querySelector('[data-cost-type="cable"]')) {
                    addCableBtn.click();
                }
            }
        };
        // Delay to allow dropdown initialization
        setTimeout(checkAndAutoAddCable, 200);
    }

    // If edit mode, sync hidden inputs and add Edit Costs button handler
    if (isEditMode && existingOrder) {
        setupEditModeCostHydration(context, existingOrder, cableSegments);
    }
}


export { openRenewModal } from './renewModal.js';
