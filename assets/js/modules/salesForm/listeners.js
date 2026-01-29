/**
 * Sales form event wiring and cost card handling.
 */

import { renderSearchableDropdown, initSearchableDropdown, renderSimpleDropdown, initSimpleDropdown } from '../searchableDropdown.js';

const { computeSalesStatus } = window.SalesStatus;

export function attachSalesFormListeners(context) {
    // Generate supplier options for searchable dropdowns
    const suppliers = window.Store.getSuppliers();
    const supplierOptions = suppliers.map(s => ({
        value: s.id,
        label: s.short_name,
        subtitle: s.full_name || ''
    }));

    // Helper function to create supplier searchable dropdown HTML
    const createSupplierDropdown = (fieldName, id) => {
        return renderSearchableDropdown({
            name: fieldName,
            id: id,
            options: supplierOptions,
            selectedValue: '',
            placeholder: '搜索供应商...'
        });
    };


    // ===== Cost Card Templates =====
    const costCardTemplates = {
        cable: `
                                                                                                                        <div class="cost-card" data-cost-type="cable" style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem; margin-bottom: 1rem; position: relative;">
                                                                                                                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; gap: 0.75rem;">
                                                                                                                                <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem;">
                                                                                                                                    <h5 style="color: var(--accent-primary); margin: 0; font-size: 0.9rem;">3rd Party Cable Cost</h5>
                                                                                                                                    <div data-cost-summary style="font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.35rem;">
                                                                                                                                        <span data-cost-summary-monthly>$0 / mo</span>
                                                                                                                                        <span style="opacity: 0.6;">•</span>
                                                                                                                                        <span data-cost-summary-onetime>$0 one-time</span>
                                                                                                                                    </div>
                                                                                                                                </div>
                                                                                                                                <button type="button" class="btn-icon cost-remove-btn" style="color: var(--accent-danger); padding: 0.25rem;" title="Remove">
                                                                                                                                    <ion-icon name="close-outline"></ion-icon>
                                                                                                                                </button>
                                                                                                                            </div>

                                                                                                                            <!-- Basic Info -->
                                                                                                                            <div class="grid-2">
                                                                                                                                <div class="form-group">
                                                                                                                                    <label class="form-label">Supplier</label>
                                                                                                                                    <div class="supplier-dropdown-placeholder" data-field="costs.cable.supplier"></div>
                                                                                                                                </div>
                                                                                                                                <div class="form-group">
                                                                                                                                    <label class="form-label">Order No.</label>
                                                                                                                                    <input type="text" class="form-control cost-input" data-field="costs.cable.orderNo">
                                                                                                                                </div>
                                                                                                                            </div>
                                                                                                                            <div class="grid-2">
                                                                                                                                <div class="form-group">
                                                                                                                                    <label class="form-label">Cable System</label>
                                                                                                                                    <input type="text" class="form-control cost-input" data-field="costs.cable.cableSystem">
                                                                                                                                </div>
                                                                                                                                <div class="form-group">
                                                                                                                                    <label class="form-label">Capacity</label>
                                                                                                                                    <div style="display: flex; gap: 0.5rem;">
                                                                                                                                        <input type="number" class="form-control cost-input" data-field="costs.cable.capacity" value="0" style="flex: 1;">
                                                                                                                                            <select class="form-control cost-input" data-field="costs.cable.capacityUnit" style="width: 100px;">
                                                                                                                                                <option value="Gbps">Gbps</option>
                                                                                                                                                <option value="Wavelength">Wavelength</option>
                                                                                                                                                <option value="Fiber Pair">Fiber Pair</option>
                                                                                                                                            </select>
                                                                                                                                    </div>
                                                                                                                                </div>
                                                                                                                            </div>
                                                                                                                            <div class="grid-2">
                                                                                                                                <div class="form-group">
                                                                                                                                    <label class="form-label">Cost Model</label>
                                                                                                                                    <div class="cable-cost-model-dropdown-placeholder" data-field="costs.cable.model"></div>
                                                                                                                                </div>
                                                                                                                                <div class="form-group">
                                                                                                                                    <label class="form-label">Protection</label>
                                                                                                                                    <div class="cable-protection-dropdown-placeholder" data-field="costs.cable.protection"></div>
                                                                                                                                </div>
                                                                                                                            </div>
                                                                                                                            <div class="cable-protection-system-container form-group" style="display: none;">
                                                                                                                                <label class="form-label">Protection Cable System</label>
                                                                                                                                <input type="text" class="form-control cost-input" data-field="costs.cable.protectionCableSystem" placeholder="Protection cable system name">
                                                                                                                            </div>

                                                                                                                            <!-- Lease Cost Fields -->
                                                                                                                            <div class="cable-lease-fields" style="background: rgba(255,255,255,0.02); padding: 0.75rem; border-radius: 4px; margin-top: 0.5rem;">
                                                                                                                                <h6 style="color: var(--accent-success); margin: 0 0 0.5rem 0; font-size: 0.8rem;">Lease Costs</h6>
                                                                                                                                <div class="grid-2">
                                                                                                                                    <div class="form-group">
                                                                                                                                        <label class="form-label">MRC ($)</label>
                                                                                                                                        <input type="number" class="form-control cost-input calc-trigger" data-field="costs.cable.mrc" value="0">
                                                                                                                                    </div>
                                                                                                                                    <div class="form-group">
                                                                                                                                        <label class="form-label">NRC ($)</label>
                                                                                                                                        <input type="number" class="form-control cost-input calc-trigger" data-field="costs.cable.nrc" value="0">
                                                                                                                                    </div>
                                                                                                                                </div>
                                                                                                                            </div>

                                                                                                                            <!-- IRU Cost Fields -->
                                                                                                                            <div class="cable-iru-fields" style="display: none; background: rgba(255,255,255,0.02); padding: 0.75rem; border-radius: 4px; margin-top: 0.5rem;">
                                                                                                                                <h6 style="color: var(--accent-warning); margin: 0 0 0.5rem 0; font-size: 0.8rem;">IRU Costs</h6>
                                                                                                                                <div class="grid-3c">
                                                                                                                                    <div class="form-group">
                                                                                                                                        <label class="form-label">OTC ($)</label>
                                                                                                                                        <input type="number" class="form-control cost-input calc-trigger cable-otc-input" data-field="costs.cable.otc" value="0">
                                                                                                                                    </div>
                                                                                                                                    <div class="form-group">
                                                                                                                                        <label class="form-label">O&M Rate (%)</label>
                                                                                                                                        <input type="number" class="form-control cost-input calc-trigger cable-om-rate-input" data-field="costs.cable.omRate" value="0" step="0.1">
                                                                                                                                    </div>
                                                                                                                                    <div class="form-group">
                                                                                                                                        <label class="form-label">Annual O&M ($)</label>
                                                                                                                                        <input type="number" class="form-control cost-input cable-annual-om-display" data-field="costs.cable.annualOm" value="0" readonly style="background: var(--bg-card-hover);">
                                                                                                                                    </div>
                                                                                                                                </div>
                                                                                                                            </div>

                                                                                                                            <!-- Contract Dates -->
                                                                                                                            <div style="background: rgba(255,255,255,0.02); padding: 0.75rem; border-radius: 4px; margin-top: 0.5rem;">
                                                                                                                                <h6 style="color: var(--text-muted); margin: 0 0 0.5rem 0; font-size: 0.8rem;">Contract Period</h6>
                                                                                                                                <div class="grid-3c">
                                                                                                                                    <div class="form-group">
                                                                                                                                        <label class="form-label">Start Date</label>
                                                                                                                                        <input type="date" class="form-control cost-input cable-start-date" data-field="costs.cable.startDate">
                                                                                                                                    </div>
                                                                                                                                    <div class="form-group">
                                                                                                                                        <label class="form-label">Term (Months)</label>
                                                                                                                                        <input type="number" class="form-control cost-input cable-term-months" data-field="costs.cable.termMonths" value="12">
                                                                                                                                    </div>
                                                                                                                                    <div class="form-group">
                                                                                                                                        <label class="form-label">End Date</label>
                                                                                                                                        <input type="date" class="form-control cost-input cable-end-date" data-field="costs.cable.endDate" readonly style="background: var(--bg-card-hover);">
                                                                                                                                    </div>
                                                                                                                                </div>
                                                                                                                            </div>
                                                                                                                            <!-- Notes -->
                                                                                                                            <div class="form-group" style="margin-top: 0.5rem;">
                                                                                                                                <label class="form-label">Notes</label>
                                                                                                                                <input type="text" class="form-control cost-input" data-field="costs.cable.notes" placeholder="Additional notes...">
                                                                                                                            </div>
                                                                                                                        </div>
                                                                                                                        `,
        backhaulA: `
                                                                                                                        <div class="cost-card" data-cost-type="backhaulA" style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem; margin-bottom: 1rem; position: relative;">
                                                                                                                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; gap: 0.75rem;">
                                                                                                                                <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem;">
                                                                                                                                    <h5 style="color: var(--accent-warning); margin: 0; font-size: 0.9rem;">Backhaul A-End</h5>
                                                                                                                                    <div data-cost-summary style="font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.35rem;">
                                                                                                                                        <span data-cost-summary-monthly>$0 / mo</span>
                                                                                                                                        <span style="opacity: 0.6;">•</span>
                                                                                                                                        <span data-cost-summary-onetime>$0 one-time</span>
                                                                                                                                    </div>
                                                                                                                                </div>
                                                                                                                                <button type="button" class="btn-icon cost-remove-btn" style="color: var(--accent-danger); padding: 0.25rem;" title="Remove">
                                                                                                                                    <ion-icon name="close-outline"></ion-icon>
                                                                                                                                </button>
                                                                                                                            </div>
                                                                                                                            <div class="grid-2">
                                                                                                                                <div class="form-group">
                                                                                                                                    <label class="form-label">Supplier</label>
                                                                                                                                    <div class="supplier-dropdown-placeholder" data-field="costs.backhaulA.supplier"></div>
                                                                                                                                </div>
                                                                                                                                <div class="form-group">
                                                                                                                                    <label class="form-label">Order No.</label>
                                                                                                                                    <input type="text" class="form-control cost-input" data-field="costs.backhaulA.orderNo">
                                                                                                                                </div>
                                                                                                                            </div>
                                                                                                                            <div class="form-group">
                                                                                                                                <label class="form-label">Cost Model</label>
                                                                                                                                <select class="form-control cost-input bh-a-cost-model-select" data-field="costs.backhaulA.model">
                                                                                                                                    <option value="Lease">Lease</option>
                                                                                                                                    <option value="IRU">IRU</option>
                                                                                                                                </select>
                                                                                                                            </div>
                                                                                                                            <div class="bh-a-lease-fields" style="background: rgba(255,255,255,0.02); padding: 0.75rem; border-radius: 4px; margin-top: 0.5rem;">
                                                                                                                                <div class="grid-2">
                                                                                                                                    <div class="form-group">
                                                                                                                                        <label class="form-label">MRC ($)</label>
                                                                                                                                        <input type="number" class="form-control cost-input calc-trigger" data-field="costs.backhaul.aEnd.monthly" value="0">
                                                                                                                                    </div>
                                                                                                                                    <div class="form-group">
                                                                                                                                        <label class="form-label">NRC ($)</label>
                                                                                                                                        <input type="number" class="form-control cost-input calc-trigger" data-field="costs.backhaul.aEnd.nrc" value="0">
                                                                                                                                    </div>
                                                                                                                                </div>
                                                                                                                            </div>
                                                                                                                            <div class="bh-a-iru-fields" style="display: none; background: rgba(255,255,255,0.02); padding: 0.75rem; border-radius: 4px; margin-top: 0.5rem;">
                                                                                                                                <div class="grid-3c">
                                                                                                                                    <div class="form-group">
                                                                                                                                        <label class="form-label">OTC ($)</label>
                                                                                                                                        <input type="number" class="form-control cost-input calc-trigger bh-a-otc" data-field="costs.backhaulA.otc" value="0">
                                                                                                                                    </div>
                                                                                                                                    <div class="form-group">
                                                                                                                                        <label class="form-label">O&M Rate (%)</label>
                                                                                                                                        <input type="number" class="form-control cost-input calc-trigger bh-a-om-rate" data-field="costs.backhaulA.omRate" value="0" step="0.1">
                                                                                                                                    </div>
                                                                                                                                    <div class="form-group">
                                                                                                                                        <label class="form-label">Annual O&M ($)</label>
                                                                                                                                        <input type="number" class="form-control cost-input bh-a-annual-om" data-field="costs.backhaulA.annualOm" value="0" readonly style="background: var(--bg-card-hover);">
                                                                                                                                    </div>
                                                                                                                                </div>
                                                                                                                            </div>
                                                                                                                            <div style="background: rgba(255,255,255,0.02); padding: 0.75rem; border-radius: 4px; margin-top: 0.5rem;">
                                                                                                                                <div class="grid-3c">
                                                                                                                                    <div class="form-group">
                                                                                                                                        <label class="form-label">Start Date</label>
                                                                                                                                        <input type="date" class="form-control cost-input bh-a-start-date" data-field="costs.backhaulA.startDate">
                                                                                                                                    </div>
                                                                                                                                    <div class="form-group">
                                                                                                                                        <label class="form-label">Term (Months)</label>
                                                                                                                                        <input type="number" class="form-control cost-input bh-a-term" data-field="costs.backhaulA.termMonths" value="12">
                                                                                                                                    </div>
                                                                                                                                    <div class="form-group">
                                                                                                                                        <label class="form-label">End Date</label>
                                                                                                                                        <input type="date" class="form-control cost-input bh-a-end-date" data-field="costs.backhaulA.endDate" readonly style="background: var(--bg-card-hover);">
                                                                                                                                    </div>
                                                                                                                                </div>
                                                                                                                            </div>
                                                                                                                            <div class="form-group" style="margin-top: 0.5rem;">
                                                                                                                                <label class="form-label">Notes</label>
                                                                                                                                <input type="text" class="form-control cost-input" data-field="costs.backhaulA.notes" placeholder="Additional notes...">
                                                                                                                            </div>
                                                                                                                        </div>
                                                                                                                        `,
        backhaulZ: `
                                                                                                                        <div class="cost-card" data-cost-type="backhaulZ" style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem; margin-bottom: 1rem; position: relative;">
                                                                                                                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; gap: 0.75rem;">
                                                                                                                                <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem;">
                                                                                                                                    <h5 style="color: var(--accent-warning); margin: 0; font-size: 0.9rem;">Backhaul Z-End</h5>
                                                                                                                                    <div data-cost-summary style="font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.35rem;">
                                                                                                                                        <span data-cost-summary-monthly>$0 / mo</span>
                                                                                                                                        <span style="opacity: 0.6;">•</span>
                                                                                                                                        <span data-cost-summary-onetime>$0 one-time</span>
                                                                                                                                    </div>
                                                                                                                                </div>
                                                                                                                                <button type="button" class="btn-icon cost-remove-btn" style="color: var(--accent-danger); padding: 0.25rem;" title="Remove">
                                                                                                                                    <ion-icon name="close-outline"></ion-icon>
                                                                                                                                </button>
                                                                                                                            </div>
                                                                                                                            <div class="grid-2">
                                                                                                                                <div class="form-group">
                                                                                                                                    <label class="form-label">Supplier</label>
                                                                                                                                    <div class="supplier-dropdown-placeholder" data-field="costs.backhaulZ.supplier"></div>
                                                                                                                                </div>
                                                                                                                                <div class="form-group">
                                                                                                                                    <label class="form-label">Order No.</label>
                                                                                                                                    <input type="text" class="form-control cost-input" data-field="costs.backhaulZ.orderNo">
                                                                                                                                </div>
                                                                                                                            </div>
                                                                                                                            <div class="form-group">
                                                                                                                                <label class="form-label">Cost Model</label>
                                                                                                                                <select class="form-control cost-input bh-z-cost-model-select" data-field="costs.backhaulZ.model">
                                                                                                                                    <option value="Lease">Lease</option>
                                                                                                                                    <option value="IRU">IRU</option>
                                                                                                                                </select>
                                                                                                                            </div>
                                                                                                                            <div class="bh-z-lease-fields" style="background: rgba(255,255,255,0.02); padding: 0.75rem; border-radius: 4px; margin-top: 0.5rem;">
                                                                                                                                <div class="grid-2">
                                                                                                                                    <div class="form-group">
                                                                                                                                        <label class="form-label">MRC ($)</label>
                                                                                                                                        <input type="number" class="form-control cost-input calc-trigger" data-field="costs.backhaul.zEnd.monthly" value="0">
                                                                                                                                    </div>
                                                                                                                                    <div class="form-group">
                                                                                                                                        <label class="form-label">NRC ($)</label>
                                                                                                                                        <input type="number" class="form-control cost-input calc-trigger" data-field="costs.backhaul.zEnd.nrc" value="0">
                                                                                                                                    </div>
                                                                                                                                </div>
                                                                                                                            </div>
                                                                                                                            <div class="bh-z-iru-fields" style="display: none; background: rgba(255,255,255,0.02); padding: 0.75rem; border-radius: 4px; margin-top: 0.5rem;">
                                                                                                                                <div class="grid-3c">
                                                                                                                                    <div class="form-group">
                                                                                                                                        <label class="form-label">OTC ($)</label>
                                                                                                                                        <input type="number" class="form-control cost-input calc-trigger bh-z-otc" data-field="costs.backhaulZ.otc" value="0">
                                                                                                                                    </div>
                                                                                                                                    <div class="form-group">
                                                                                                                                        <label class="form-label">O&M Rate (%)</label>
                                                                                                                                        <input type="number" class="form-control cost-input calc-trigger bh-z-om-rate" data-field="costs.backhaulZ.omRate" value="0" step="0.1">
                                                                                                                                    </div>
                                                                                                                                    <div class="form-group">
                                                                                                                                        <label class="form-label">Annual O&M ($)</label>
                                                                                                                                        <input type="number" class="form-control cost-input bh-z-annual-om" data-field="costs.backhaulZ.annualOm" value="0" readonly style="background: var(--bg-card-hover);">
                                                                                                                                    </div>
                                                                                                                                </div>
                                                                                                                            </div>
                                                                                                                            <div style="background: rgba(255,255,255,0.02); padding: 0.75rem; border-radius: 4px; margin-top: 0.5rem;">
                                                                                                                                <div class="grid-3c">
                                                                                                                                    <div class="form-group">
                                                                                                                                        <label class="form-label">Start Date</label>
                                                                                                                                        <input type="date" class="form-control cost-input bh-z-start-date" data-field="costs.backhaulZ.startDate">
                                                                                                                                    </div>
                                                                                                                                    <div class="form-group">
                                                                                                                                        <label class="form-label">Term (Months)</label>
                                                                                                                                        <input type="number" class="form-control cost-input bh-z-term" data-field="costs.backhaulZ.termMonths" value="12">
                                                                                                                                    </div>
                                                                                                                                    <div class="form-group">
                                                                                                                                        <label class="form-label">End Date</label>
                                                                                                                                        <input type="date" class="form-control cost-input bh-z-end-date" data-field="costs.backhaulZ.endDate" readonly style="background: var(--bg-card-hover);">
                                                                                                                                    </div>
                                                                                                                                </div>
                                                                                                                            </div>
                                                                                                                            <div class="form-group" style="margin-top: 0.5rem;">
                                                                                                                                <label class="form-label">Notes</label>
                                                                                                                                <input type="text" class="form-control cost-input" data-field="costs.backhaulZ.notes" placeholder="Additional notes...">
                                                                                                                            </div>
                                                                                                                        </div>
                                                                                                                        `,
        xcA: `
                                                                                                                        <div class="cost-card" data-cost-type="xcA" style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem; margin-bottom: 1rem; position: relative;">
                                                                                                                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; gap: 0.75rem;">
                                                                                                                                <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem;">
                                                                                                                                    <h5 style="color: var(--accent-secondary); margin: 0; font-size: 0.9rem;">Cross Connect A-End</h5>
                                                                                                                                    <div data-cost-summary style="font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.35rem;">
                                                                                                                                        <span data-cost-summary-monthly>$0 / mo</span>
                                                                                                                                        <span style="opacity: 0.6;">•</span>
                                                                                                                                        <span data-cost-summary-onetime>$0 one-time</span>
                                                                                                                                    </div>
                                                                                                                                </div>
                                                                                                                                <button type="button" class="btn-icon cost-remove-btn" style="color: var(--accent-danger); padding: 0.25rem;" title="Remove">
                                                                                                                                    <ion-icon name="close-outline"></ion-icon>
                                                                                                                                </button>
                                                                                                                            </div>
                                                                                                                            <div class="grid-2">
                                                                                                                                <div class="form-group">
                                                                                                                                    <label class="form-label">Supplier</label>
                                                                                                                                    <div class="supplier-dropdown-placeholder" data-field="costs.xcA.supplier"></div>
                                                                                                                                </div>
                                                                                                                                <div class="form-group">
                                                                                                                                    <label class="form-label">Order No.</label>
                                                                                                                                    <input type="text" class="form-control cost-input" data-field="costs.xcA.orderNo">
                                                                                                                                </div>
                                                                                                                            </div>
                                                                                                                            <div class="grid-2">
                                                                                                                                <div class="form-group">
                                                                                                                                    <label class="form-label">Monthly Fee ($)</label>
                                                                                                                                    <input type="number" class="form-control cost-input calc-trigger" data-field="costs.crossConnect.aEnd.monthly" value="0">
                                                                                                                                </div>
                                                                                                                                <div class="form-group">
                                                                                                                                    <label class="form-label">NRC ($)</label>
                                                                                                                                    <input type="number" class="form-control cost-input calc-trigger" data-field="costs.crossConnect.aEnd.nrc" value="0">
                                                                                                                                </div>
                                                                                                                            </div>
                                                                                                                            <div style="background: rgba(255,255,255,0.02); padding: 0.75rem; border-radius: 4px; margin-top: 0.5rem;">
                                                                                                                                <div class="grid-3c">
                                                                                                                                    <div class="form-group">
                                                                                                                                        <label class="form-label">Start Date</label>
                                                                                                                                        <input type="date" class="form-control cost-input xc-a-start-date" data-field="costs.xcA.startDate">
                                                                                                                                    </div>
                                                                                                                                    <div class="form-group">
                                                                                                                                        <label class="form-label">Term (Months)</label>
                                                                                                                                        <input type="number" class="form-control cost-input xc-a-term" data-field="costs.xcA.termMonths" value="12">
                                                                                                                                    </div>
                                                                                                                                    <div class="form-group">
                                                                                                                                        <label class="form-label">End Date</label>
                                                                                                                                        <input type="date" class="form-control cost-input xc-a-end-date" data-field="costs.xcA.endDate" readonly style="background: var(--bg-card-hover);">
                                                                                                                                    </div>
                                                                                                                                </div>
                                                                                                                            </div>
                                                                                                                            <div class="form-group" style="margin-top: 0.5rem;">
                                                                                                                                <label class="form-label">Notes</label>
                                                                                                                                <input type="text" class="form-control cost-input" data-field="costs.xcA.notes" placeholder="Additional notes...">
                                                                                                                            </div>
                                                                                                                        </div>
                                                                                                                        `,
        xcZ: `
                                                                                                                        <div class="cost-card" data-cost-type="xcZ" style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem; margin-bottom: 1rem; position: relative;">
                                                                                                                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; gap: 0.75rem;">
                                                                                                                                <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem;">
                                                                                                                                    <h5 style="color: var(--accent-secondary); margin: 0; font-size: 0.9rem;">Cross Connect Z-End</h5>
                                                                                                                                    <div data-cost-summary style="font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.35rem;">
                                                                                                                                        <span data-cost-summary-monthly>$0 / mo</span>
                                                                                                                                        <span style="opacity: 0.6;">•</span>
                                                                                                                                        <span data-cost-summary-onetime>$0 one-time</span>
                                                                                                                                    </div>
                                                                                                                                </div>
                                                                                                                                <button type="button" class="btn-icon cost-remove-btn" style="color: var(--accent-danger); padding: 0.25rem;" title="Remove">
                                                                                                                                    <ion-icon name="close-outline"></ion-icon>
                                                                                                                                </button>
                                                                                                                            </div>
                                                                                                                            <div class="grid-2">
                                                                                                                                <div class="form-group">
                                                                                                                                    <label class="form-label">Supplier</label>
                                                                                                                                    <div class="supplier-dropdown-placeholder" data-field="costs.xcZ.supplier"></div>
                                                                                                                                </div>
                                                                                                                                <div class="form-group">
                                                                                                                                    <label class="form-label">Order No.</label>
                                                                                                                                    <input type="text" class="form-control cost-input" data-field="costs.xcZ.orderNo">
                                                                                                                                </div>
                                                                                                                            </div>
                                                                                                                            <div class="grid-2">
                                                                                                                                <div class="form-group">
                                                                                                                                    <label class="form-label">Monthly Fee ($)</label>
                                                                                                                                    <input type="number" class="form-control cost-input calc-trigger" data-field="costs.crossConnect.zEnd.monthly" value="0">
                                                                                                                                </div>
                                                                                                                                <div class="form-group">
                                                                                                                                    <label class="form-label">NRC ($)</label>
                                                                                                                                    <input type="number" class="form-control cost-input calc-trigger" data-field="costs.crossConnect.zEnd.nrc" value="0">
                                                                                                                                </div>
                                                                                                                            </div>
                                                                                                                            <div style="background: rgba(255,255,255,0.02); padding: 0.75rem; border-radius: 4px; margin-top: 0.5rem;">
                                                                                                                                <div class="grid-3c">
                                                                                                                                    <div class="form-group">
                                                                                                                                        <label class="form-label">Start Date</label>
                                                                                                                                        <input type="date" class="form-control cost-input xc-z-start-date" data-field="costs.xcZ.startDate">
                                                                                                                                    </div>
                                                                                                                                    <div class="form-group">
                                                                                                                                        <label class="form-label">Term (Months)</label>
                                                                                                                                        <input type="number" class="form-control cost-input xc-z-term" data-field="costs.xcZ.termMonths" value="12">
                                                                                                                                    </div>
                                                                                                                                    <div class="form-group">
                                                                                                                                        <label class="form-label">End Date</label>
                                                                                                                                        <input type="date" class="form-control cost-input xc-z-end-date" data-field="costs.xcZ.endDate" readonly style="background: var(--bg-card-hover);">
                                                                                                                                    </div>
                                                                                                                                </div>
                                                                                                                            </div>
                                                                                                                            <div class="form-group" style="margin-top: 0.5rem;">
                                                                                                                                <label class="form-label">Notes</label>
                                                                                                                                <input type="text" class="form-control cost-input" data-field="costs.xcZ.notes" placeholder="Additional notes...">
                                                                                                                            </div>
                                                                                                                        </div>
                                                                                                                        `,
        other: `
                                                                                                                        <div class="cost-card cost-card-multi" data-cost-type="other" style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem; margin-bottom: 1rem; position: relative;">
                                                                                                                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; gap: 0.75rem;">
                                                                                                                                <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem;">
                                                                                                                                    <h5 style="color: var(--text-muted); margin: 0; font-size: 0.9rem;">Other Costs</h5>
                                                                                                                                    <div data-cost-summary style="font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.35rem;">
                                                                                                                                        <span data-cost-summary-monthly>$0 / mo</span>
                                                                                                                                        <span style="opacity: 0.6;">•</span>
                                                                                                                                        <span data-cost-summary-onetime>$0 one-time</span>
                                                                                                                                    </div>
                                                                                                                                </div>
                                                                                                                                <button type="button" class="btn-icon cost-remove-btn" style="color: var(--accent-danger); padding: 0.25rem;" title="Remove">
                                                                                                                                    <ion-icon name="close-outline"></ion-icon>
                                                                                                                                </button>
                                                                                                                            </div>
                                                                                                                            <div class="form-group">
                                                                                                                                <label class="form-label">Description</label>
                                                                                                                                <input type="text" class="form-control cost-input" data-field="costs.otherCosts.description" placeholder="e.g., Smart Hands, Testing, etc.">
                                                                                                                            </div>
                                                                                                                            <div class="grid-2">
                                                                                                                                <div class="form-group">
                                                                                                                                    <label class="form-label">Supplier</label>
                                                                                                                                    <div class="supplier-dropdown-placeholder" data-field-base="costs.other.supplier"></div>
                                                                                                                                </div>
                                                                                                                                <div class="form-group">
                                                                                                                                    <label class="form-label">Order No.</label>
                                                                                                                                    <input type="text" class="form-control cost-input" data-field-base="costs.other.orderNo">
                                                                                                                                </div>
                                                                                                                            </div>
                                                                                                                            <div class="grid-2">
                                                                                                                                <div class="form-group">
                                                                                                                                    <label class="form-label">One-off Fee ($)</label>
                                                                                                                                    <input type="number" class="form-control cost-input calc-trigger" data-field="costs.otherCosts.oneOff" value="0">
                                                                                                                                </div>
                                                                                                                                <div class="form-group">
                                                                                                                                    <label class="form-label">Monthly Fee ($)</label>
                                                                                                                                    <input type="number" class="form-control cost-input calc-trigger" data-field="costs.otherCosts.monthly" value="0">
                                                                                                                                </div>
                                                                                                                            </div>
                                                                                                                            <div style="background: rgba(255,255,255,0.02); padding: 0.75rem; border-radius: 4px; margin-top: 0.5rem;">
                                                                                                                                <div class="grid-3c">
                                                                                                                                    <div class="form-group">
                                                                                                                                        <label class="form-label">Start Date</label>
                                                                                                                                        <input type="date" class="form-control cost-input other-start-date" data-field-base="costs.other.startDate">
                                                                                                                                    </div>
                                                                                                                                    <div class="form-group">
                                                                                                                                        <label class="form-label">Term (Months)</label>
                                                                                                                                        <input type="number" class="form-control cost-input other-term" data-field-base="costs.other.termMonths" value="12">
                                                                                                                                    </div>
                                                                                                                                    <div class="form-group">
                                                                                                                                        <label class="form-label">End Date</label>
                                                                                                                                        <input type="date" class="form-control cost-input other-end-date" data-field-base="costs.other.endDate" readonly style="background: var(--bg-card-hover);">
                                                                                                                                    </div>
                                                                                                                                </div>
                                                                                                                            </div>
                                                                                                                            <div class="form-group" style="margin-top: 0.5rem;">
                                                                                                                                <label class="form-label">Notes</label>
                                                                                                                                <input type="text" class="form-control cost-input" data-field-base="costs.other.notes" placeholder="Additional notes...">
                                                                                                                            </div>
                                                                                                                        </div>
                                                                                                                        `
    };

    const cardsContainer = document.getElementById('cost-cards-container');
    const addedCostTypes = new Set();

    const formatCurrency = (value) => {
        const amount = Number(value) || 0;
        return '$' + amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    };

    const getCardValue = (card, selector) => {
        return Number(card.querySelector(selector)?.value || 0);
    };

    const getCableCostModel = () => {
        return document.querySelector('input[name="costs.cable.model"]')?.value || 'Lease';
    };

    const getCostSummaryForCard = (card) => {
        const type = card.dataset.costType;
        let monthly = 0;
        let onetime = 0;

        if (type === 'cable') {
            const model = getCableCostModel();
            if (model === 'IRU') {
                monthly = getCardValue(card, '[data-field="costs.cable.annualOm"]') / 12;
                onetime = getCardValue(card, '[data-field="costs.cable.otc"]');
            } else {
                monthly = getCardValue(card, '[data-field="costs.cable.mrc"]');
                onetime = getCardValue(card, '[data-field="costs.cable.nrc"]');
            }
        } else if (type === 'backhaulA') {
            const model = card.querySelector('.bh-a-cost-model-select')?.value || 'Lease';
            if (model === 'IRU') {
                monthly = getCardValue(card, '[data-field="costs.backhaulA.annualOm"]') / 12;
                onetime = getCardValue(card, '[data-field="costs.backhaulA.otc"]');
            } else {
                monthly = getCardValue(card, '[data-field="costs.backhaul.aEnd.monthly"]');
                onetime = getCardValue(card, '[data-field="costs.backhaul.aEnd.nrc"]');
            }
        } else if (type === 'backhaulZ') {
            const model = card.querySelector('.bh-z-cost-model-select')?.value || 'Lease';
            if (model === 'IRU') {
                monthly = getCardValue(card, '[data-field="costs.backhaulZ.annualOm"]') / 12;
                onetime = getCardValue(card, '[data-field="costs.backhaulZ.otc"]');
            } else {
                monthly = getCardValue(card, '[data-field="costs.backhaul.zEnd.monthly"]');
                onetime = getCardValue(card, '[data-field="costs.backhaul.zEnd.nrc"]');
            }
        } else if (type === 'xcA') {
            monthly = getCardValue(card, '[data-field="costs.crossConnect.aEnd.monthly"]');
            onetime = getCardValue(card, '[data-field="costs.crossConnect.aEnd.nrc"]');
        } else if (type === 'xcZ') {
            monthly = getCardValue(card, '[data-field="costs.crossConnect.zEnd.monthly"]');
            onetime = getCardValue(card, '[data-field="costs.crossConnect.zEnd.nrc"]');
        } else if (type === 'other') {
            monthly = getCardValue(card, '[data-field="costs.otherCosts.monthly"]');
            onetime = getCardValue(card, '[data-field="costs.otherCosts.oneOff"]');
        }

        return { monthly, onetime };
    };

    const updateCostSummary = (card) => {
        const summary = card.querySelector('[data-cost-summary]');
        if (!summary) return;

        const monthlyEl = summary.querySelector('[data-cost-summary-monthly]');
        const onetimeEl = summary.querySelector('[data-cost-summary-onetime]');
        const { monthly, onetime } = getCostSummaryForCard(card);

        if (monthlyEl) {
            monthlyEl.textContent = `${formatCurrency(monthly)} / mo`;
        }
        if (onetimeEl) {
            onetimeEl.textContent = `${formatCurrency(onetime)} one-time`;
        }
    };

    const updateCostTotals = () => {
        let totalMonthly = 0;
        let totalOnetime = 0;
        const cards = cardsContainer.querySelectorAll('.cost-card');
        cards.forEach(card => {
            const { monthly, onetime } = getCostSummaryForCard(card);
            totalMonthly += monthly;
            totalOnetime += onetime;
        });

        const term = Number(document.querySelector('[name="dates.term"]')?.value || 0) || 12;
        const amortized = term > 0 ? totalMonthly + (totalOnetime / term) : totalMonthly;

        const recurringEl = document.getElementById('cost-total-recurring');
        const onetimeEl = document.getElementById('cost-total-onetime');
        const amortizedEl = document.getElementById('cost-total-amortized');

        if (recurringEl) recurringEl.textContent = `${formatCurrency(totalMonthly)} / mo`;
        if (onetimeEl) onetimeEl.textContent = formatCurrency(totalOnetime);
        if (amortizedEl) amortizedEl.textContent = `${formatCurrency(amortized)} / mo`;
    };

    const updateCostDisplays = (card = null) => {
        if (card) {
            updateCostSummary(card);
        } else {
            cardsContainer.querySelectorAll('.cost-card').forEach(updateCostSummary);
        }
        updateCostTotals();
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

    // ===== Add Cost Card Function =====
    let otherCostCounter = 0; // Counter for unique Other Costs cards

    const addCostCard = (type, isMulti = false) => {
        // For non-multi types, prevent duplicates
        if (!isMulti && addedCostTypes.has(type)) return;

        const template = costCardTemplates[type];
        if (!template) return;

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = template.trim();
        const card = tempDiv.firstChild;

        // For multi-add cards, assign unique ID
        if (isMulti) {
            const uniqueId = `${type}_${++otherCostCounter}`;
            card.dataset.uniqueId = uniqueId;
        } else {
            addedCostTypes.add(type);
        }

        cardsContainer.appendChild(card);

        // Initialize supplier searchable dropdown
        const supplierPlaceholder = card.querySelector('.supplier-dropdown-placeholder');
        if (supplierPlaceholder) {
            const fieldName = supplierPlaceholder.dataset.field || supplierPlaceholder.dataset.fieldBase;
            const dropdownId = `supplier-${type}-${Date.now()}`;
            supplierPlaceholder.outerHTML = createSupplierDropdown(fieldName, dropdownId);
            // Initialize the dropdown after it's in the DOM
            setTimeout(() => initSearchableDropdown(`${dropdownId}-container`), 10);
        }

        // Initialize Cost Model and Protection SimpleDropdowns for cable card
        if (type === 'cable') {
            const timestamp = Date.now();

            // Cost Model dropdown
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

            // Protection dropdown
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

        // Update toggle state (only for non-multi types)
        if (!isMulti) {
            setCostToggleState(type, true);
        }

        // Attach remove handler
        card.querySelector('.cost-remove-btn').addEventListener('click', () => {
            removeCostCard(type, card);
        });

        // Attach input sync handlers
        card.querySelectorAll('.cost-input').forEach(input => {
            input.addEventListener('input', () => {
                syncCostInputs();
                context.calculateSalesFinancials();
            });
            input.addEventListener('change', () => {
                syncCostInputs();
                context.calculateSalesFinancials();
            });
        });

        // Attach special handlers for cable card
        if (type === 'cable') {
            const leaseFields = card.querySelector('.cable-lease-fields');
            const iruFields = card.querySelector('.cable-iru-fields');
            const protectionSystemContainer = card.querySelector('.cable-protection-system-container');
            const otcInput = card.querySelector('.cable-otc-input');
            const omRateInput = card.querySelector('.cable-om-rate-input');
            const annualOmDisplay = card.querySelector('.cable-annual-om-display');
            const startDateInput = card.querySelector('.cable-start-date');
            const termMonthsInput = card.querySelector('.cable-term-months');
            const endDateInput = card.querySelector('.cable-end-date');

            // Cost Model Toggle (Lease vs IRU) - using SimpleDropdown hidden input
            setTimeout(() => {
                const modelInput = document.querySelector('input[name="costs.cable.model"]');
                if (modelInput && leaseFields && iruFields) {
                    // Create MutationObserver to detect value changes
                    const modelObserver = new MutationObserver(() => {
                        const isIRU = modelInput.value === 'IRU';
                        leaseFields.style.display = isIRU ? 'none' : 'block';
                        iruFields.style.display = isIRU ? 'block' : 'none';
                        syncCostInputs();
                        context.calculateSalesFinancials();
                    });
                    modelObserver.observe(modelInput, { attributes: true, attributeFilter: ['value'] });
                    // Also listen to manual input changes
                    modelInput.addEventListener('change', () => {
                        const isIRU = modelInput.value === 'IRU';
                        leaseFields.style.display = isIRU ? 'none' : 'block';
                        iruFields.style.display = isIRU ? 'block' : 'none';
                        syncCostInputs();
                        context.calculateSalesFinancials();
                    });
                }

                // Protection Toggle - using SimpleDropdown hidden input
                const protectionInput = document.querySelector('input[name="costs.cable.protection"]');
                if (protectionInput && protectionSystemContainer) {
                    const protectionObserver = new MutationObserver(() => {
                        protectionSystemContainer.style.display = protectionInput.value === 'Protected' ? 'block' : 'none';
                        syncCostInputs();
                    });
                    protectionObserver.observe(protectionInput, { attributes: true, attributeFilter: ['value'] });
                    protectionInput.addEventListener('change', () => {
                        protectionSystemContainer.style.display = protectionInput.value === 'Protected' ? 'block' : 'none';
                        syncCostInputs();
                    });
                }
            }, 50);

            // Annual O&M Auto-calculation
            const calculateAnnualOm = () => {
                if (otcInput && omRateInput && annualOmDisplay) {
                    const otc = Number(otcInput.value) || 0;
                    const rate = Number(omRateInput.value) || 0;
                    annualOmDisplay.value = (otc * rate / 100).toFixed(2);
                    syncCostInputs();
                }
            };
            if (otcInput) otcInput.addEventListener('input', calculateAnnualOm);
            if (omRateInput) omRateInput.addEventListener('input', calculateAnnualOm);

            // Contract End Date Auto-calculation
            const calculateEndDate = () => {
                if (startDateInput && termMonthsInput && endDateInput && startDateInput.value) {
                    const start = new Date(startDateInput.value);
                    const months = parseInt(termMonthsInput.value) || 0;
                    const end = new Date(start);
                    end.setMonth(end.getMonth() + months);
                    end.setDate(end.getDate() - 1); // End date is the last day of the term
                    endDateInput.value = end.toISOString().split('T')[0];
                    syncCostInputs();
                }
            };
            if (startDateInput) startDateInput.addEventListener('change', calculateEndDate);
            if (termMonthsInput) termMonthsInput.addEventListener('input', calculateEndDate);
        }
        // Attach special handlers for Backhaul A card
        if (type === 'backhaulA') {
            const modelSelect = card.querySelector('.bh-a-cost-model-select');
            const leaseFields = card.querySelector('.bh-a-lease-fields');
            const iruFields = card.querySelector('.bh-a-iru-fields');
            const otcInput = card.querySelector('.bh-a-otc');
            const omRateInput = card.querySelector('.bh-a-om-rate');
            const annualOmDisplay = card.querySelector('.bh-a-annual-om');
            const startDateInput = card.querySelector('.bh-a-start-date');
            const termInput = card.querySelector('.bh-a-term');
            const endDateInput = card.querySelector('.bh-a-end-date');

            if (modelSelect && leaseFields && iruFields) {
                modelSelect.addEventListener('change', (e) => {
                    const isIRU = e.target.value === 'IRU';
                    leaseFields.style.display = isIRU ? 'none' : 'block';
                    iruFields.style.display = isIRU ? 'block' : 'none';
                    syncCostInputs();
                    context.calculateSalesFinancials();
                });
            }
            const calcAnnualOm = () => {
                if (otcInput && omRateInput && annualOmDisplay) {
                    annualOmDisplay.value = ((Number(otcInput.value) || 0) * (Number(omRateInput.value) || 0) / 100).toFixed(2);
                    syncCostInputs();
                }
            };
            if (otcInput) otcInput.addEventListener('input', calcAnnualOm);
            if (omRateInput) omRateInput.addEventListener('input', calcAnnualOm);
            const calcEndDate = () => {
                if (startDateInput && termInput && endDateInput && startDateInput.value) {
                    const start = new Date(startDateInput.value);
                    start.setMonth(start.getMonth() + (parseInt(termInput.value) || 0));
                    start.setDate(start.getDate() - 1); // End date is the last day of the term
                    endDateInput.value = start.toISOString().split('T')[0];
                    syncCostInputs();
                }
            };
            if (startDateInput) startDateInput.addEventListener('change', calcEndDate);
            if (termInput) termInput.addEventListener('input', calcEndDate);
        }

        // Attach special handlers for Backhaul Z card
        if (type === 'backhaulZ') {
            const modelSelect = card.querySelector('.bh-z-cost-model-select');
            const leaseFields = card.querySelector('.bh-z-lease-fields');
            const iruFields = card.querySelector('.bh-z-iru-fields');
            const otcInput = card.querySelector('.bh-z-otc');
            const omRateInput = card.querySelector('.bh-z-om-rate');
            const annualOmDisplay = card.querySelector('.bh-z-annual-om');
            const startDateInput = card.querySelector('.bh-z-start-date');
            const termInput = card.querySelector('.bh-z-term');
            const endDateInput = card.querySelector('.bh-z-end-date');

            if (modelSelect && leaseFields && iruFields) {
                modelSelect.addEventListener('change', (e) => {
                    const isIRU = e.target.value === 'IRU';
                    leaseFields.style.display = isIRU ? 'none' : 'block';
                    iruFields.style.display = isIRU ? 'block' : 'none';
                    syncCostInputs();
                    context.calculateSalesFinancials();
                });
            }
            const calcAnnualOm = () => {
                if (otcInput && omRateInput && annualOmDisplay) {
                    annualOmDisplay.value = ((Number(otcInput.value) || 0) * (Number(omRateInput.value) || 0) / 100).toFixed(2);
                    syncCostInputs();
                }
            };
            if (otcInput) otcInput.addEventListener('input', calcAnnualOm);
            if (omRateInput) omRateInput.addEventListener('input', calcAnnualOm);
            const calcEndDate = () => {
                if (startDateInput && termInput && endDateInput && startDateInput.value) {
                    const start = new Date(startDateInput.value);
                    start.setMonth(start.getMonth() + (parseInt(termInput.value) || 0));
                    start.setDate(start.getDate() - 1); // End date is the last day of the term
                    endDateInput.value = start.toISOString().split('T')[0];
                    syncCostInputs();
                }
            };
            if (startDateInput) startDateInput.addEventListener('change', calcEndDate);
            if (termInput) termInput.addEventListener('input', calcEndDate);
        }

        // Attach end date calculation for Cross Connect A
        if (type === 'xcA') {
            const startDateInput = card.querySelector('.xc-a-start-date');
            const termInput = card.querySelector('.xc-a-term');
            const endDateInput = card.querySelector('.xc-a-end-date');
            const calcEndDate = () => {
                if (startDateInput && termInput && endDateInput && startDateInput.value) {
                    const start = new Date(startDateInput.value);
                    start.setMonth(start.getMonth() + (parseInt(termInput.value) || 0));
                    start.setDate(start.getDate() - 1); // End date is the last day of the term
                    endDateInput.value = start.toISOString().split('T')[0];
                    syncCostInputs();
                }
            };
            if (startDateInput) startDateInput.addEventListener('change', calcEndDate);
            if (termInput) termInput.addEventListener('input', calcEndDate);
        }

        // Attach end date calculation for Cross Connect Z
        if (type === 'xcZ') {
            const startDateInput = card.querySelector('.xc-z-start-date');
            const termInput = card.querySelector('.xc-z-term');
            const endDateInput = card.querySelector('.xc-z-end-date');
            const calcEndDate = () => {
                if (startDateInput && termInput && endDateInput && startDateInput.value) {
                    const start = new Date(startDateInput.value);
                    start.setMonth(start.getMonth() + (parseInt(termInput.value) || 0));
                    start.setDate(start.getDate() - 1); // End date is the last day of the term
                    endDateInput.value = start.toISOString().split('T')[0];
                    syncCostInputs();
                }
            };
            if (startDateInput) startDateInput.addEventListener('change', calcEndDate);
            if (termInput) termInput.addEventListener('input', calcEndDate);
        }

        // Attach end date calculation for Other Costs
        if (type === 'other') {
            const startDateInput = card.querySelector('.other-start-date');
            const termInput = card.querySelector('.other-term');
            const endDateInput = card.querySelector('.other-end-date');
            const calcEndDate = () => {
                if (startDateInput && termInput && endDateInput && startDateInput.value) {
                    const start = new Date(startDateInput.value);
                    start.setMonth(start.getMonth() + (parseInt(termInput.value) || 0));
                    start.setDate(start.getDate() - 1); // End date is the last day of the term
                    endDateInput.value = start.toISOString().split('T')[0];
                    syncCostInputs();
                }
            };
            if (startDateInput) startDateInput.addEventListener('change', calcEndDate);
            if (termInput) termInput.addEventListener('input', calcEndDate);
        }

        syncCostInputs();
        context.calculateSalesFinancials();
    };

    // ===== Remove Cost Card Function =====
    const removeCostCard = (type, card) => {
        const isMulti = card.classList.contains('cost-card-multi');
        card.remove();

        if (!isMulti) {
            addedCostTypes.delete(type);

            setCostToggleState(type, false);

            // Reset hidden inputs for this type
            resetCostInputs(type);
        }

        updateCostDisplays();
        context.calculateSalesFinancials();
    };

    // ===== Sync visible inputs to hidden form inputs =====
    const syncCostInputs = () => {
        cardsContainer.querySelectorAll('.cost-input').forEach(input => {
            const field = input.dataset.field;
            const hiddenInput = document.querySelector(`[name="${field}"]`);
            if (hiddenInput) {
                hiddenInput.value = input.value;
            }
        });
        updateCostDisplays();
    };

    // ===== Reset hidden inputs when card is removed =====
    const resetCostInputs = (type) => {
        const fieldMappings = {
            cable: [
                'costs.cable.supplier', 'costs.cable.orderNo', 'costs.cable.cableSystem',
                'costs.cable.capacity', 'costs.cable.capacityUnit', 'costs.cable.model',
                'costs.cable.protection', 'costs.cable.protectionCableSystem',
                'costs.cable.mrc', 'costs.cable.nrc', 'costs.cable.otc',
                'costs.cable.omRate', 'costs.cable.annualOm',
                'costs.cable.startDate', 'costs.cable.termMonths', 'costs.cable.endDate'
            ],
            backhaulA: [
                'costs.backhaul.aEnd.monthly', 'costs.backhaul.aEnd.nrc',
                'costs.backhaulA.model', 'costs.backhaulA.otc', 'costs.backhaulA.omRate',
                'costs.backhaulA.annualOm', 'costs.backhaulA.startDate',
                'costs.backhaulA.termMonths', 'costs.backhaulA.endDate'
            ],
            backhaulZ: [
                'costs.backhaul.zEnd.monthly', 'costs.backhaul.zEnd.nrc',
                'costs.backhaulZ.model', 'costs.backhaulZ.otc', 'costs.backhaulZ.omRate',
                'costs.backhaulZ.annualOm', 'costs.backhaulZ.startDate',
                'costs.backhaulZ.termMonths', 'costs.backhaulZ.endDate'
            ],
            xcA: ['costs.crossConnect.aEnd.monthly', 'costs.crossConnect.aEnd.nrc'],
            xcZ: ['costs.crossConnect.zEnd.monthly', 'costs.crossConnect.zEnd.nrc'],
            other: ['costs.otherCosts.description', 'costs.otherCosts.oneOff', 'costs.otherCosts.monthly']
        };

        const fields = fieldMappings[type] || [];
        fields.forEach(field => {
            const input = document.querySelector(`[name="${field}"]`);
            if (input) {
                // Set appropriate default values
                if (field.includes('model')) input.value = 'Lease';
                else if (field.includes('protection') && !field.includes('System')) input.value = 'Unprotected';
                else if (field.includes('capacityUnit')) input.value = 'Gbps';
                else if (field.includes('termMonths')) input.value = '12';
                else if (field.includes('description') || field.includes('supplier') || field.includes('orderNo') ||
                    field.includes('cableSystem') || field.includes('protectionCableSystem') ||
                    field.includes('Date')) input.value = '';
                else input.value = '0';
            }
        });
    };

    // ===== Attach button click handlers =====
    document.querySelectorAll('.cost-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.costType;
            const existingCard = cardsContainer.querySelector(`.cost-card[data-cost-type="${type}"]`);
            if (existingCard) {
                removeCostCard(type, existingCard);
            } else {
                addCostCard(type, false);
            }
        });
    });

    document.querySelectorAll('.cost-add-btn.cost-add-multi').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.costType;
            addCostCard(type, true);
        });
    });

    document.querySelectorAll('.cost-toggle-btn').forEach(btn => {
        const type = btn.dataset.costType;
        const hasCard = !!cardsContainer.querySelector(`.cost-card[data-cost-type="${type}"]`);
        setCostToggleState(type, hasCard);
    });

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

                // Remove cable card if exists
                const cableCard = cardsContainer.querySelector('.cost-card[data-cost-type="cable"]');
                if (cableCard) {
                    removeCostCard('cable', cableCard);
                }
                setCostToggleState('cable', false);
            } else {
                // Show button
                addCableBtn.style.display = '';

                setCostToggleState('cable', addedCostTypes.has('cable'));

                // Auto-add cable card for Resale/Hybrid
                if ((type === 'Resale' || type === 'Hybrid') && !addedCostTypes.has('cable')) {
                    addCostCard('cable');
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

    // ===== Status Auto-calc =====
    const startDateInput = document.getElementById('sales-start-date');
    const termInput = document.getElementById('sales-term');
    const endDateInput = document.getElementById('sales-end-date');
    const statusDisplay = document.getElementById('sales-status-display');

    const calculateEndDate = () => {
        if (!startDateInput.value || !termInput.value) return;
        const start = new Date(startDateInput.value);
        const months = parseInt(termInput.value) || 0;
        const end = new Date(start);
        end.setMonth(end.getMonth() + months);
        end.setDate(end.getDate() - 1); // End date is the last day of the term
        endDateInput.value = end.toISOString().split('T')[0];
        updateStatus();
    };

    const updateStatus = () => {
        if (!startDateInput.value || !endDateInput.value) return;
        statusDisplay.value = computeSalesStatus(startDateInput.value, endDateInput.value);
    };

    if (startDateInput && termInput && endDateInput) {
        startDateInput.addEventListener('change', calculateEndDate);
        termInput.addEventListener('input', calculateEndDate);
        termInput.addEventListener('input', () => updateCostTotals());
    }

    // ===== IRU Revenue: Auto-calculate Annual O&M Fee =====
    const salesOtc = document.getElementById('sales-otc');
    const salesOmRate = document.getElementById('sales-om-rate');
    const salesAnnualOm = document.getElementById('sales-annual-om');

    const calculateAnnualOm = () => {
        if (salesOtc && salesOmRate && salesAnnualOm) {
            const otc = Number(salesOtc.value) || 0;
            const rate = Number(salesOmRate.value) || 0;
            salesAnnualOm.value = (otc * rate / 100).toFixed(2);
        }
    };

    if (salesOtc && salesOmRate) {
        salesOtc.addEventListener('input', calculateAnnualOm);
        salesOmRate.addEventListener('input', calculateAnnualOm);
    }

    // Real-time Financial Calculation (for non-dynamic inputs)
    const calcTriggers = document.querySelectorAll('.calc-trigger');
    calcTriggers.forEach(input => {
        input.addEventListener('input', () => context.calculateSalesFinancials());
    });
}
