/**
 * Sales model/revenue toggles and sales type smart hints (including batch allocation).
 */

export function initSalesModelAndTypeHints(context, {
    cardsContainer,
    addCostCard,
    syncCostInputs,
    updateCostTotals
}) {
    // ===== Sales Model Toggle (Lease vs IRU Revenue Fields) =====
    const salesModelSelect = document.getElementById('sales-model-select');
    const leaseRevenueFields = document.getElementById('lease-revenue-fields');
    const iruRevenueFields = document.getElementById('iru-revenue-fields');
    const salesModelContainer = document.getElementById('sales-model-select-container');
    const salesModelTrigger = salesModelContainer?.querySelector('.simple-dropdown-trigger');
    const salesModelText = salesModelContainer?.querySelector('.simple-dropdown-text');
    const salesModelMenu = salesModelContainer?.querySelector('.simple-dropdown-menu');
    const salesModelOptions = salesModelContainer?.querySelectorAll('.simple-dropdown-option');
    let salesModelLocked = false;
    let lastUnlockedSalesModel = salesModelSelect?.value || 'Lease';

    const setSalesModel = (value) => {
        if (!salesModelSelect) return;
        salesModelSelect.value = value;
        salesModelSelect.dispatchEvent(new Event('change', { bubbles: true }));
        if (salesModelText) {
            salesModelText.textContent = value === 'IRU' ? 'IRU (买断模式)' : 'Lease (月租模式)';
        }
        if (salesModelTrigger) {
            salesModelTrigger.classList.remove('placeholder');
        }
        if (salesModelOptions) {
            salesModelOptions.forEach(option => {
                option.classList.toggle('selected', option.dataset.value === value);
            });
        }
        if (salesModelMenu) {
            salesModelMenu.style.display = 'none';
        }
    };

    const updateRevenueFields = () => {
        const model = salesModelSelect?.value;
        if (leaseRevenueFields && iruRevenueFields) {
            leaseRevenueFields.style.display = model === 'Lease' ? 'block' : 'none';
            iruRevenueFields.style.display = model === 'IRU' ? 'block' : 'none';
        }
        context.calculateSalesFinancials();
    };

    if (salesModelSelect) {
        salesModelSelect.addEventListener('change', updateRevenueFields);
        salesModelSelect.addEventListener('change', () => {
            if (!salesModelLocked) {
                lastUnlockedSalesModel = salesModelSelect.value;
            }
        });
    }

    // ===== Sales Type Smart Hints =====
    const salesTypeSelect = document.getElementById('sales-type-select');
    const addCableBtn = document.getElementById('add-cable-btn');
    const linkedResourceGroup = document.getElementById('linked-resource-group');
    const inventoryLinkSelect = document.getElementById('inventory-link-select');
    const linkedResourceHint = document.getElementById('linked-resource-hint');
    const batchGroup = document.getElementById('batch-allocation-group');
    const batchTable = document.getElementById('batch-allocation-table');
    const batchSummary = document.getElementById('batch-allocation-summary');
    const batchAllocInput = document.getElementById('batch-allocations-input');
    const batchModeInput = document.getElementById('batch-allocation-mode');
    const batchAutoBtn = document.getElementById('batch-auto-btn');
    const batchClearBtn = document.getElementById('batch-clear-btn');
    const batchErrorEl = document.getElementById('batch-allocation-error');

    const getSelectedInventory = () => {
        const id = inventoryLinkSelect?.value;
        if (!id) return null;
        return window.Store.getInventory().find(i => i.resourceId === id) || null;
    };

    const isBatchActive = (batch, refDate) => {
        if (!batch) return false;
        if (batch.status === 'Planned' || batch.status === 'Ended') return false;
        if (batch.startDate) {
            const start = new Date(batch.startDate);
            if (!Number.isNaN(start.getTime()) && start > refDate) return false;
        }
        return true;
    };

    const readAllocationsFromInputs = () => {
        if (!batchTable) return [];
        return Array.from(batchTable.querySelectorAll('input[data-batch-id]'))
            .map(input => ({
                batchId: input.dataset.batchId,
                capacityAllocated: Number(input.value || 0)
            }))
            .filter(a => a.capacityAllocated > 0);
    };

    const updateBatchSummary = (salesCapacity, allocations) => {
        const total = allocations.reduce((sum, a) => sum + (a.capacityAllocated || 0), 0);
        const remaining = Math.max(0, (salesCapacity || 0) - total);
        if (batchSummary) {
            batchSummary.textContent = `Allocated ${total} / ${salesCapacity || 0} (${remaining} remaining).`;
        }
    };

    const setBatchAllocations = (allocations, mode) => {
        if (batchAllocInput) {
            batchAllocInput.value = JSON.stringify(allocations);
        }
        if (batchModeInput) {
            batchModeInput.value = mode;
        }
        updateBatchSummary(Number(document.querySelector('[name="capacity.value"]')?.value || 0), allocations);
        if (batchErrorEl) {
            batchErrorEl.style.display = 'none';
            batchErrorEl.textContent = '';
        }
    };

    const renderBatchTable = (batches, allocations, salesCapacity) => {
        if (!batchTable) return;
        const allocationMap = new Map(allocations.map(a => [a.batchId, a.capacityAllocated]));
        const now = new Date();
        const orderId = context._editingOrderId || null;
        const rows = batches.map(batch => {
            const active = isBatchActive(batch, now);
            const allocated = allocationMap.get(batch.batchId) || 0;
            const allocatedByOthers = window.Store.getBatchAllocatedCapacity(batch.batchId, orderId);
            const available = Math.max(0, (batch.capacity?.value || 0) - allocatedByOthers);
            const disabled = active ? '' : 'disabled';
            const statusText = active ? 'Active' : (batch.status || 'Planned');
            return `
                <tr>
                    <td>${batch.orderId || batch.batchId}</td>
                    <td>${batch.startDate || '-'}</td>
                    <td>${batch.model || 'IRU'}</td>
                    <td>${batch.capacity?.value || 0}</td>
                    <td>${available}</td>
                    <td>
                        <input type="number" class="form-control" data-batch-id="${batch.batchId}" value="${allocated}" min="0" max="${available}" ${disabled}>
                    </td>
                    <td>${statusText}</td>
                </tr>
            `;
        }).join('');

        batchTable.innerHTML = `
            <table style="width:100%; border-collapse: collapse;">
                <thead>
                    <tr style="text-align:left; font-size:0.75rem; color:var(--text-muted);">
                        <th style="padding:6px 4px;">Order ID</th>
                        <th style="padding:6px 4px;">Start Date</th>
                        <th style="padding:6px 4px;">Model</th>
                        <th style="padding:6px 4px;">Capacity</th>
                        <th style="padding:6px 4px;">Available</th>
                        <th style="padding:6px 4px;">Allocated</th>
                        <th style="padding:6px 4px;">Status</th>
                    </tr>
                </thead>
                <tbody>${rows || '<tr><td colspan="7" style="padding: 0.75rem; color: var(--text-muted);">No batches found.</td></tr>'}</tbody>
            </table>
        `;

        batchTable.querySelectorAll('input[data-batch-id]').forEach(input => {
            input.addEventListener('input', () => {
                if (batchModeInput) batchModeInput.value = 'manual';
                const current = readAllocationsFromInputs();
                setBatchAllocations(current, 'manual');
                context.calculateSalesFinancials();
            });
        });
    };

    const autoAllocateBatches = () => {
        const inventory = getSelectedInventory();
        const salesCapacity = Number(document.querySelector('[name="capacity.value"]')?.value || 0);
        if (!inventory || inventory.costMode !== 'batches') return;

        const now = new Date();
        const batches = (window.Store.getInventoryBatches(inventory.resourceId) || [])
            .slice()
            .sort((a, b) => new Date(a.startDate || 0) - new Date(b.startDate || 0));

        let remaining = salesCapacity;
        const allocations = [];
        const orderId = context._editingOrderId || null;
        batches.forEach(batch => {
            if (!isBatchActive(batch, now)) return;
            if (remaining <= 0) return;
            const available = Math.max(0, (batch.capacity?.value || 0) - window.Store.getBatchAllocatedCapacity(batch.batchId, orderId));
            if (available <= 0) return;
            const allocate = Math.min(available, remaining);
            if (allocate > 0) {
                allocations.push({ batchId: batch.batchId, capacityAllocated: allocate });
                remaining -= allocate;
            }
        });

        renderBatchTable(batches, allocations, salesCapacity);
        setBatchAllocations(allocations, 'auto');
        if (batchErrorEl && remaining > 0) {
            batchErrorEl.textContent = `Insufficient active batch capacity. Remaining ${remaining}.`;
            batchErrorEl.style.display = 'block';
        }
        context.calculateSalesFinancials();
    };

    const updateSmartHints = () => {
        const type = salesTypeSelect?.value;
        const isInventoryOrSwap = (type === 'Inventory' || type === 'Swapped Out');

        // ===== Sales Model Lock for Swapped Out =====
        if (type === 'Swapped Out') {
            if (!salesModelLocked) {
                lastUnlockedSalesModel = salesModelSelect?.value || lastUnlockedSalesModel;
            }
            salesModelLocked = true;
            setSalesModel('IRU');
            if (salesModelTrigger) {
                salesModelTrigger.classList.add('disabled');
                salesModelTrigger.style.pointerEvents = 'none';
            }
            if (salesModelMenu) {
                salesModelMenu.style.display = 'none';
            }
        } else if (salesModelLocked) {
            salesModelLocked = false;
            if (salesModelTrigger) {
                salesModelTrigger.classList.remove('disabled');
                salesModelTrigger.style.pointerEvents = '';
            }
            setSalesModel(lastUnlockedSalesModel || 'Lease');
        }

        // ===== Linked Resource Visibility =====
        if (linkedResourceGroup && inventoryLinkSelect) {
            if (type === 'Resale') {
                // Hide for Resale - not needed
                linkedResourceGroup.style.display = 'none';
                inventoryLinkSelect.removeAttribute('required');
                inventoryLinkSelect.value = ''; // Clear selection
            } else {
                // Required for Inventory / Hybrid / Swapped Out
                linkedResourceGroup.style.display = '';
                inventoryLinkSelect.setAttribute('required', 'required');
            }
        }
        if (linkedResourceHint) {
            if (type === 'Resale') {
                linkedResourceHint.textContent = '';
            } else if (type === 'Swapped Out') {
                linkedResourceHint.textContent = 'Required for Swapped Out.';
            } else {
                linkedResourceHint.textContent = 'Required for Inventory and Hybrid.';
            }
        }

        // ===== Cable Cost Card Logic =====
        if (addCableBtn) {
            if (isInventoryOrSwap) {
                // Hide 3rd Party Cable button for Inventory/Swapped Out
                addCableBtn.style.display = 'none';

                // Remove all cable cards if present
                const cableCards = cardsContainer.querySelectorAll('.cost-card[data-cost-type="cable"]');
                cableCards.forEach(card => card.remove());
                syncCostInputs();
            } else {
                // Show button
                addCableBtn.style.display = '';

                // Auto-add cable card for Resale/Hybrid if none exists
                if ((type === 'Resale' || type === 'Hybrid') && !cardsContainer.querySelector('.cost-card[data-cost-type="cable"]')) {
                    addCostCard('cable', true);
                }
            }
        }

        const inventory = getSelectedInventory();
        if (batchGroup) {
            if (inventory && inventory.costMode === 'batches' && type !== 'Resale') {
                batchGroup.style.display = '';
                const salesCapacity = Number(document.querySelector('[name="capacity.value"]')?.value || 0);
                const batches = (window.Store.getInventoryBatches(inventory.resourceId) || [])
                    .slice()
                    .sort((a, b) => new Date(a.startDate || 0) - new Date(b.startDate || 0));
                let allocations = [];
                if (batchModeInput?.value === 'manual' && batchAllocInput?.value) {
                    try {
                        allocations = JSON.parse(batchAllocInput.value) || [];
                    } catch {
                        allocations = [];
                    }
                }
                if (allocations.length === 0) {
                    autoAllocateBatches();
                } else {
                    renderBatchTable(batches, allocations, salesCapacity);
                    setBatchAllocations(allocations, 'manual');
                    context.calculateSalesFinancials();
                }
            } else {
                batchGroup.style.display = 'none';
                if (batchAllocInput) batchAllocInput.value = '[]';
                if (batchModeInput) batchModeInput.value = 'auto';
            }
        }
    };

    if (salesTypeSelect) {
        salesTypeSelect.addEventListener('change', updateSmartHints);
        // Initial check
        updateSmartHints();
    }

    if (inventoryLinkSelect) {
        inventoryLinkSelect.addEventListener('change', updateSmartHints);
    }

    const capacityInput = document.querySelector('[name="capacity.value"]');
    if (capacityInput) {
        capacityInput.addEventListener('input', () => {
            if (batchGroup && batchGroup.style.display !== 'none' && batchModeInput?.value === 'auto') {
                autoAllocateBatches();
            } else if (batchGroup && batchGroup.style.display !== 'none') {
                const allocations = readAllocationsFromInputs();
                setBatchAllocations(allocations, 'manual');
                context.calculateSalesFinancials();
            }
        });
    }

    if (batchAutoBtn) {
        batchAutoBtn.addEventListener('click', () => {
            autoAllocateBatches();
        });
    }

    if (batchClearBtn) {
        batchClearBtn.addEventListener('click', () => {
            if (batchTable) {
                batchTable.querySelectorAll('input[data-batch-id]').forEach(input => { input.value = 0; });
            }
            setBatchAllocations([], 'manual');
            context.calculateSalesFinancials();
        });
    }
}
