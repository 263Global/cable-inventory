/**
 * backhaulA cost card template.
 */

export const backhaulACostCardTemplate = `
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
                                                                                                                        `;
