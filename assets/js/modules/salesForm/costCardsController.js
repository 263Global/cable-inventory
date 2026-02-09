/**
 * Cost card lifecycle and synchronization for sales form.
 */

import { initSearchableDropdown, renderSimpleDropdown, initSimpleDropdown } from '../searchableDropdown.js';
import { costCardTemplates } from './costCardTemplates.js';
import { createCostSummaryController } from './costCardSummary.js';
import { createCostSyncController } from './costCardSync.js';
import { attachCostCardSpecialHandlers } from './costCardSpecialHandlers.js';

export function initCostCardsController(context, { createSupplierDropdown }) {
    const cardsContainer = document.getElementById('cost-cards-container');
    const addedCostTypes = new Set();
    const summaryController = createCostSummaryController(cardsContainer);
    const syncController = createCostSyncController({
        cardsContainer,
        updateCostDisplays: summaryController.updateCostDisplays
    });

    const syncAndRecalculate = () => {
        syncController.syncCostInputs();
        context.calculateSalesFinancials();
    };

    const setCostToggleState = (type, isActive) => {
        const btn = document.querySelector(`.cost-toggle-btn[data-cost-type="${type}"]`);
        if (!btn) return;

        btn.classList.toggle('btn-primary', isActive);
        btn.classList.toggle('btn-secondary', !isActive);
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');

        const icon = btn.querySelector('ion-icon');
        if (icon) {
            icon.setAttribute('name', isActive ? 'checkmark-outline' : 'add-outline');
        }
    };

    let multiCostCounter = 0;

    const addCostCard = (type, isMulti = false) => {
        const allowMultiple = isMulti || type === 'cable';

        if (!allowMultiple && addedCostTypes.has(type)) return;

        const template = costCardTemplates[type];
        if (!template) return;

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = template.trim();
        const card = tempDiv.firstChild;

        if (allowMultiple) {
            card.dataset.uniqueId = `${type}_${++multiCostCounter}`;
        } else {
            addedCostTypes.add(type);
        }

        cardsContainer.appendChild(card);

        // Add entrance animation
        card.classList.add('cost-card-enter');

        const supplierPlaceholder = card.querySelector('.supplier-dropdown-placeholder');
        if (supplierPlaceholder) {
            const fieldName = supplierPlaceholder.dataset.field || supplierPlaceholder.dataset.fieldBase;
            const dropdownId = `supplier-${type}-${Date.now()}`;
            supplierPlaceholder.outerHTML = createSupplierDropdown(fieldName, dropdownId);

            setTimeout(() => {
                initSearchableDropdown(`${dropdownId}-container`);
                const supplierInput = card.querySelector(`input[name="${fieldName}"]`);
                supplierInput?.addEventListener('change', syncAndRecalculate);
            }, 10);
        }

        if (type === 'cable') {
            const timestamp = Date.now();

            const costModelPlaceholder = card.querySelector('.cable-cost-model-dropdown-placeholder');
            if (costModelPlaceholder) {
                const costModelId = `cable-cost-model-${timestamp}`;
                costModelPlaceholder.outerHTML = renderSimpleDropdown({
                    name: 'costs.cable.model',
                    id: costModelId,
                    options: [
                        { value: 'Lease', label: 'Lease' },
                        { value: 'IRU', label: 'IRU' }
                    ],
                    selectedValue: 'Lease',
                    placeholder: 'Select...'
                });
                setTimeout(() => initSimpleDropdown(`${costModelId}-container`), 10);
            }

            const protectionPlaceholder = card.querySelector('.cable-protection-dropdown-placeholder');
            if (protectionPlaceholder) {
                const protectionId = `cable-protection-${timestamp}`;
                protectionPlaceholder.outerHTML = renderSimpleDropdown({
                    name: 'costs.cable.protection',
                    id: protectionId,
                    options: [
                        { value: 'Unprotected', label: 'Unprotected' },
                        { value: 'Protected', label: 'Protected' }
                    ],
                    selectedValue: 'Unprotected',
                    placeholder: 'Select...'
                });
                setTimeout(() => initSimpleDropdown(`${protectionId}-container`), 10);
            }
        }

        if (!allowMultiple) {
            setCostToggleState(type, true);
        }

        card.querySelector('.cost-remove-btn')?.addEventListener('click', () => {
            removeCostCard(type, card);
        });

        card.querySelectorAll('.cost-input').forEach((input) => {
            input.addEventListener('input', syncAndRecalculate);
            input.addEventListener('change', syncAndRecalculate);
        });

        attachCostCardSpecialHandlers(type, card, {
            syncCostInputs: syncController.syncCostInputs,
            calculateSalesFinancials: () => context.calculateSalesFinancials()
        });

        // Auto-fill cost card dates from main sales order contract
        const salesStartDate = document.getElementById('sales-start-date')?.value;
        const salesTerm = document.getElementById('sales-term')?.value;
        if (salesStartDate || salesTerm) {
            card.querySelectorAll('.cost-input').forEach((input) => {
                const field = input.dataset.field || input.dataset.fieldBase || '';
                if (field.endsWith('.startDate') && !input.value && salesStartDate) {
                    input.value = salesStartDate;
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                }
                if (field.endsWith('.termMonths') && salesTerm) {
                    input.value = salesTerm;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                }
            });
        }

        syncAndRecalculate();
    };

    const removeCostCard = (type, card) => {
        const isMulti = card.classList.contains('cost-card-multi');
        card.remove();

        if (!isMulti) {
            addedCostTypes.delete(type);
            setCostToggleState(type, false);
            syncController.resetCostInputs(type);
        }

        syncAndRecalculate();
    };

    document.querySelectorAll('.cost-toggle-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.costType;
            const existingCard = cardsContainer.querySelector(`.cost-card[data-cost-type="${type}"]`);

            if (existingCard) {
                removeCostCard(type, existingCard);
            } else {
                addCostCard(type, false);
            }
            // Close dropdown menu after selection
            document.getElementById('cost-type-menu')?.classList.remove('open');
        });
    });

    document.querySelectorAll('.cost-add-btn.cost-add-multi').forEach((btn) => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.costType;
            addCostCard(type, true);
            // Close dropdown menu after selection
            document.getElementById('cost-type-menu')?.classList.remove('open');
        });
    });

    // Dropdown trigger toggle
    const costTypeTrigger = document.getElementById('cost-type-trigger');
    const costTypeMenu = document.getElementById('cost-type-menu');
    if (costTypeTrigger && costTypeMenu) {
        costTypeTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            costTypeMenu.classList.toggle('open');
        });
        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!costTypeMenu.contains(e.target) && e.target !== costTypeTrigger) {
                costTypeMenu.classList.remove('open');
            }
        });
    }

    document.querySelectorAll('.cost-toggle-btn').forEach((btn) => {
        const type = btn.dataset.costType;
        const hasCard = Boolean(cardsContainer.querySelector(`.cost-card[data-cost-type="${type}"]`));
        setCostToggleState(type, hasCard);
    });

    return {
        cardsContainer,
        addCostCard,
        removeCostCard,
        syncCostInputs: syncController.syncCostInputs,
        updateCostTotals: summaryController.updateCostTotals
    };
}
