const { escapeJsString } = window.DomUtils;

export function setupInventoryBatchEditor() {
    const singleFinancialsTitle = document.getElementById('single-financials-title');
    const financialsGrid = document.getElementById('financials-grid');
    const baseCostSection = document.getElementById('inventory-base-cost-section');
    const batchSection = document.getElementById('inventory-batch-section');
    const costModeInput = document.getElementById('inventory-cost-mode');
    const baseModelInput = document.getElementById('inventory-base-model');
    const baseMrcContainer = document.getElementById('base-mrc-container');
    const baseIruContainer = document.getElementById('base-iru-container');
    const baseAnnualOmContainer = document.getElementById('base-annual-om-container');
    const baseTermContainer = document.getElementById('base-term-container');
    const capacityLabelEl = document.getElementById('inventory-capacity-label');
    const capacityHelpEl = document.getElementById('inventory-capacity-help');

    const updateCapacityLabel = () => {
        const isBatchModeSelected = (costModeInput?.value || 'single') === 'batches';
        if (capacityLabelEl) {
            capacityLabelEl.textContent = isBatchModeSelected ? 'Base Capacity (Total, Unlit)' : 'Capacity Value';
        }
        if (!capacityHelpEl) return;
        if (isBatchModeSelected) {
            capacityHelpEl.textContent = 'Batches represent lit capacity drawn from this total.';
            capacityHelpEl.style.display = 'block';
            return;
        }
        capacityHelpEl.textContent = '';
        capacityHelpEl.style.display = 'none';
    };

    const updateCostModeDisplay = () => {
        const mode = costModeInput?.value || 'single';
        if (mode === 'batches') {
            if (singleFinancialsTitle) singleFinancialsTitle.style.display = 'none';
            if (financialsGrid) financialsGrid.style.display = 'none';
            if (baseCostSection) baseCostSection.style.display = 'block';
            if (batchSection) batchSection.style.display = 'block';
        } else {
            if (singleFinancialsTitle) singleFinancialsTitle.style.display = 'block';
            if (financialsGrid) financialsGrid.style.display = 'grid';
            if (baseCostSection) baseCostSection.style.display = 'none';
            if (batchSection) batchSection.style.display = 'none';
        }
        updateCapacityLabel();
    };

    const updateBaseModelDisplay = () => {
        const model = baseModelInput?.value || 'IRU';
        if (model === 'Lease') {
            if (baseMrcContainer) baseMrcContainer.style.display = 'block';
            if (baseIruContainer) baseIruContainer.style.display = 'none';
            if (baseAnnualOmContainer) baseAnnualOmContainer.style.display = 'none';
            if (baseTermContainer) baseTermContainer.style.display = 'none';
        } else {
            if (baseMrcContainer) baseMrcContainer.style.display = 'none';
            if (baseIruContainer) baseIruContainer.style.display = 'grid';
            if (baseAnnualOmContainer) baseAnnualOmContainer.style.display = 'grid';
            if (baseTermContainer) baseTermContainer.style.display = 'block';
        }
    };

    if (costModeInput) {
        costModeInput.addEventListener('change', updateCostModeDisplay);
        updateCostModeDisplay();
    }

    if (baseModelInput) {
        baseModelInput.addEventListener('change', updateBaseModelDisplay);
        updateBaseModelDisplay();
    }

    const baseOtcInput = document.querySelector('[name="baseCost.otc"]');
    const baseOmRateInput = document.getElementById('base-om-rate-input');
    const baseAnnualOmInput = document.getElementById('base-annual-om-input');
    const baseTermInput = document.querySelector('[name="baseCost.termMonths"]');
    const inventoryStartInput = document.getElementById('start-date-input');

    const calculateBaseOmCost = () => {
        if (!baseOtcInput || !baseOmRateInput || !baseAnnualOmInput) return;
        const otcVal = parseFloat(baseOtcInput.value) || 0;
        const omRateVal = parseFloat(baseOmRateInput.value) || 0;
        baseAnnualOmInput.value = (otcVal * omRateVal / 100).toFixed(2);
    };

    const computeBaseEndDate = () => {
        if (!inventoryStartInput || !baseTermInput) return null;
        const startVal = inventoryStartInput.value;
        const termVal = parseInt(baseTermInput.value, 10);
        if (!startVal || !termVal || termVal <= 0) return null;

        const endDate = new Date(startVal);
        if (Number.isNaN(endDate.getTime())) return null;
        endDate.setMonth(endDate.getMonth() + termVal);
        endDate.setDate(endDate.getDate() - 1);
        return endDate;
    };

    const computeBatchTermMonths = (batchStartVal) => {
        if (!batchStartVal) return 0;
        const baseEndDate = computeBaseEndDate();
        if (!baseEndDate) return 0;
        const start = new Date(batchStartVal);
        if (Number.isNaN(start.getTime()) || baseEndDate < start) return 0;
        return ((baseEndDate.getFullYear() - start.getFullYear()) * 12)
            + (baseEndDate.getMonth() - start.getMonth()) + 1;
    };

    if (baseOtcInput && baseOmRateInput) {
        baseOtcInput.addEventListener('input', calculateBaseOmCost);
        baseOmRateInput.addEventListener('input', calculateBaseOmCost);
        calculateBaseOmCost();
    }

    const batchRowsContainer = document.getElementById('inventory-batch-rows');
    const addBatchBtn = document.getElementById('add-batch-btn');
    const generateBatchId = () => `BAT-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;

    const syncBatchRowFields = (row) => {
        const modelSelect = row.querySelector('[data-field="model"]');
        const iruFields = row.querySelectorAll('.batch-iru-field');
        const leaseFields = row.querySelectorAll('.batch-lease-field');
        if (!modelSelect) return;
        const isLease = modelSelect.value === 'Lease';
        iruFields.forEach(el => { el.style.display = isLease ? 'none' : 'block'; });
        leaseFields.forEach(el => { el.style.display = isLease ? 'block' : 'none'; });
    };

    const calculateBatchOmCost = (row) => {
        const otcInput = row.querySelector('[data-field="otc"]');
        const rateInput = row.querySelector('[data-field="omRate"]');
        const annualInput = row.querySelector('[data-field="annualOm"]');
        if (!otcInput || !rateInput || !annualInput) return;
        const otcVal = parseFloat(otcInput.value) || 0;
        const rateVal = parseFloat(rateInput.value) || 0;
        annualInput.value = (otcVal * rateVal / 100).toFixed(2);
    };

    const updateBatchTermForRow = (row) => {
        const startInput = row.querySelector('[data-field="startDate"]');
        const termInput = row.querySelector('[data-field="termMonths"]');
        if (!startInput || !termInput) return;
        const computed = computeBatchTermMonths(startInput.value);
        if (computed > 0) {
            termInput.value = computed;
        }
    };

    const updateAllBatchTerms = () => {
        if (!batchRowsContainer) return;
        batchRowsContainer.querySelectorAll('.batch-row').forEach(row => updateBatchTermForRow(row));
    };

    const attachBatchRowListeners = (row) => {
        const modelSelect = row.querySelector('[data-field="model"]');
        if (modelSelect) {
            modelSelect.addEventListener('change', () => syncBatchRowFields(row));
        }
        const otcInput = row.querySelector('[data-field="otc"]');
        const rateInput = row.querySelector('[data-field="omRate"]');
        if (otcInput) otcInput.addEventListener('input', () => calculateBatchOmCost(row));
        if (rateInput) rateInput.addEventListener('input', () => calculateBatchOmCost(row));
        const startInput = row.querySelector('[data-field="startDate"]');
        if (startInput) {
            startInput.addEventListener('change', () => updateBatchTermForRow(row));
        }
        const removeBtn = row.querySelector('.batch-remove-btn');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => row.remove());
        }
        syncBatchRowFields(row);
        calculateBatchOmCost(row);
        updateBatchTermForRow(row);
    };

    if (batchRowsContainer) {
        batchRowsContainer.querySelectorAll('.batch-row').forEach(row => attachBatchRowListeners(row));
    }

    if (addBatchBtn && batchRowsContainer) {
        addBatchBtn.addEventListener('click', () => {
            const unit = document.querySelector('[name="capacity.unit"]')?.value || 'Gbps';
            const row = document.createElement('div');
            row.className = 'batch-row';
            row.dataset.batchId = generateBatchId();
            row.style.cssText = 'background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 8px; padding: 0.75rem; margin-bottom: 0.75rem;';
            row.innerHTML = `
                <div class="grid-4">
                    <div class="form-group">
                        <label class="form-label">Batch Order ID</label>
                        <input type="text" class="form-control batch-input" data-field="orderId" value="">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Model</label>
                        <select class="form-control batch-input" data-field="model">
                            <option value="IRU" selected>IRU</option>
                            <option value="Lease">Lease</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Start Date</label>
                        <input type="date" class="form-control batch-input" data-field="startDate" value="">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Status</label>
                        <select class="form-control batch-input" data-field="status">
                            <option value="Planned" selected>Planned</option>
                            <option value="Active">Active</option>
                            <option value="Ended">Ended</option>
                        </select>
                    </div>
                </div>
                <div class="grid-4">
                    <div class="form-group">
                        <label class="form-label">Capacity (${escapeJsString(unit)})</label>
                        <input type="number" class="form-control batch-input" data-field="capacity" value="0">
                    </div>
                    <div class="form-group batch-iru-field">
                        <label class="form-label">OTC ($)</label>
                        <input type="number" class="form-control batch-input" data-field="otc" value="0">
                    </div>
                    <div class="form-group batch-iru-field">
                        <label class="form-label">O&amp;M Rate (%)</label>
                        <input type="number" class="form-control batch-input batch-om-rate" data-field="omRate" value="0" step="0.1" min="0" max="100">
                    </div>
                    <div class="form-group batch-iru-field">
                        <label class="form-label">Term (Months)</label>
                        <input type="number" class="form-control batch-input" data-field="termMonths" value="0">
                    </div>
                </div>
                <div class="grid-2 batch-iru-field">
                    <div class="form-group">
                        <label class="form-label">Annual O&amp;M ($)</label>
                        <input type="number" class="form-control batch-input batch-annual-om" data-field="annualOm" value="0" readonly style="background-color: var(--bg-card-hover); cursor: not-allowed;">
                    </div>
                </div>
                <div class="grid-2">
                    <div class="form-group batch-lease-field">
                        <label class="form-label">MRC ($)</label>
                        <input type="number" class="form-control batch-input" data-field="mrc" value="0">
                    </div>
                    <div class="form-group" style="display:flex; align-items:flex-end;">
                        <button type="button" class="btn btn-secondary batch-remove-btn" style="font-size:0.75rem;">Remove Batch</button>
                    </div>
                </div>
            `;
            batchRowsContainer.appendChild(row);
            attachBatchRowListeners(row);
        });
    }

    if (inventoryStartInput) {
        inventoryStartInput.addEventListener('change', updateAllBatchTerms);
    }
    if (baseTermInput) {
        baseTermInput.addEventListener('input', updateAllBatchTerms);
    }
}
