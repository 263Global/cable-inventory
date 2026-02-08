/**
 * cable cost card template.
 */

export const cableCostCardTemplate = `
                                                                                                                        <div class="cost-card cost-card-multi" data-cost-type="cable" style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem; margin-bottom: 1rem; position: relative;">
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
                                                                                                                        `;
