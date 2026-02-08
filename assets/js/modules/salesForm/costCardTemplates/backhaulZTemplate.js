/**
 * backhaulZ cost card template.
 */

export const backhaulZCostCardTemplate = `
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
                                                                                                                        `;
