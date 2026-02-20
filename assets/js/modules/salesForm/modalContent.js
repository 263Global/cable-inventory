/**
 * Sales form modal content template.
 */

import { escapeHtml } from './utils.js';

export function buildSalesModalContent({
    existingOrder,
    isEditMode,
    existingCustomerId,
    customerCount,
    availableResourceCount,
    cableSummary,
    cableSegments,
    supplierOptionsHTML
}) {
    return `
            <!-- 2-Column Layout: Profitability (sticky) | Right Container -->
            <div class="sales-form-grid" style="display: grid; grid-template-columns: 1fr; gap: 1.5rem; align-items: start;">
                
                <!-- COLUMN 1: Profitability Analysis (MVP: hidden) -->
                <div style="display: none; position: sticky; top: 0; z-index: 10;">
                    <div id="profitability-widget" style="
                        background: var(--bg-secondary);
                        border-radius: 12px;
                        border: 1px solid var(--border-color);
                        padding: 1rem;
                        box-shadow: 0 2px 12px rgba(0,0,0,0.08);
                        overflow: hidden;
                        max-width: 100%;
                        box-sizing: border-box;
                    ">
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; padding-bottom: 0.75rem; border-bottom: 1px solid var(--border-color);">
                            <ion-icon name="analytics-outline" style="font-size: 1.2rem; color: var(--accent-primary);"></ion-icon>
                            <h5 style="margin: 0; font-weight: 600; font-size: 0.95rem;">Profitability Analysis</h5>
                        </div>
                        
                        <!-- Cost & Margin Summary -->
                        <div id="profit-summary-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 0.75rem;">
                            <div style="background: var(--bg-card); border-radius: 6px; padding: 0.5rem; text-align: center; border: 1px solid var(--border-color);">
                                <div style="font-size: 0.6rem; color: var(--text-muted); margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.3px;">
                                    Monthly Cost
                                </div>
                                <div class="font-mono" id="disp-total-cost" style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary);">$0</div>
                            </div>
                            <div style="background: var(--bg-card); border-radius: 6px; padding: 0.5rem; text-align: center; border: 1px solid var(--border-color);">
                                <div style="font-size: 0.6rem; color: var(--text-muted); margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.3px;">
                                    Gross Margin
                                </div>
                                <div class="font-mono" id="disp-gross-margin" style="font-size: 0.95rem; font-weight: 700; color: var(--accent-success);">$0</div>
                            </div>
                        </div>
                        
                        <!-- Main Margin Display -->
                        <div style="
                            background: var(--bg-card);
                            border-radius: 10px;
                            padding: 1.25rem 1rem;
                            text-align: center;
                            border: 1px solid var(--border-color);
                            margin-bottom: 0.75rem;
                        ">
                            <div style="font-size: 0.7rem; color: var(--text-muted); margin-bottom: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px;" id="margin-percent-label">
                                Monthly Margin
                            </div>
                            <div class="font-mono" id="disp-margin-percent" style="font-size: 2.25rem; font-weight: 800; color: var(--accent-success); line-height: 1; margin-top: 0.25rem;">0.0%</div>
                        </div>
                        
                        <!-- Recurring Margin Row (for IRU Resale only) -->
                        <div id="recurring-margin-row" style="
                            display: none;
                            background: var(--bg-card);
                            border-radius: 10px;
                            padding: 0.75rem 1rem;
                            border: 1px solid var(--border-color);
                            margin-bottom: 0.75rem;
                            justify-content: space-between;
                            align-items: center;
                        ">
                            <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">
                                RECURRING MARGIN
                            </div>
                            <div class="font-mono" id="disp-recurring-margin" style="font-size: 1.5rem; font-weight: 800; color: var(--accent-primary);">0.0%</div>
                        </div>
                        
                        <!-- NRC Profit -->
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 0.75rem; background: var(--bg-card); border-radius: 8px; border: 1px solid var(--border-color);">
                            <span style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">
                                NRC Profit
                            </span>
                            <span class="font-mono" id="disp-nrc-profit" style="font-weight: 700; font-size: 1rem; color: var(--text-primary);">$0</span>
                        </div>
                        
                        <!-- Cost Date Warning (hidden by default) -->
                        <div id="cost-date-warning" style="display: none; margin-top: 0.75rem; padding: 0.5rem 0.75rem; background: rgba(255, 193, 7, 0.15); border: 1px solid var(--accent-warning); border-radius: 6px; font-size: 0.75rem; color: var(--accent-warning);">
                            <ion-icon name="alert-circle-outline" style="vertical-align: middle; margin-right: 0.25rem;"></ion-icon>
                            <span id="cost-date-warning-text">成本开始日期早于销售合同</span>
                        </div>
                    </div>
                </div>

                <!-- RIGHT CONTAINER: Sales Info + Cost Structure + Order Notes -->
                <div>
                    <!-- Anchor Navigation -->
                    <nav class="anchor-nav" id="sales-anchor-nav">
                        <button type="button" class="anchor-nav-item active" data-target="section-sales-info">
                            <ion-icon name="document-text-outline"></ion-icon>
                            <span>Sales Info</span>
                        </button>
                        <button type="button" class="anchor-nav-item" data-target="section-location">
                            <ion-icon name="location-outline"></ion-icon>
                            <span>Location</span>
                        </button>
                        <button type="button" class="anchor-nav-item" data-target="section-revenue">
                            <ion-icon name="cash-outline"></ion-icon>
                            <span>Revenue</span>
                        </button>
                        <button type="button" class="anchor-nav-item" data-target="section-costs">
                            <ion-icon name="wallet-outline"></ion-icon>
                            <span>Costs</span>
                        </button>
                        <button type="button" class="anchor-nav-item" data-target="section-notes">
                            <ion-icon name="create-outline"></ion-icon>
                            <span>Notes</span>
                        </button>
                    </nav>
                    
                    <!-- Nested 2-Column Grid for Sales Info & Cost Structure -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
                        <!-- Sales Information -->
                        <div class="section-card" id="section-sales-info">
                    <div class="form-section-header">
                        <ion-icon name="document-text-outline"></ion-icon>
                        <span>Sales Information</span>
                    </div>

                    <!-- Sales Model & Type (FIRST - determines other field behavior) -->
                    <div class="grid-2">
                        <div class="form-group">
                            <label class="form-label">Sales Model <span class="required-indicator" style="color: var(--accent-danger);">*</span></label>
                            <div id="sales-model-dropdown-placeholder" data-selected="${escapeHtml(existingOrder?.salesModel || 'Lease')}"></div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Sales Type <span class="required-indicator" style="color: var(--accent-danger);">*</span></label>
                            <div id="sales-type-dropdown-placeholder" data-selected="${escapeHtml(existingOrder?.salesType || 'Resale')}"></div>
                        </div>
                    </div>

                    <!-- Order ID + Customer -->
                    <div class="grid-2">
                        <div class="form-group">
                            <label class="form-label">Order ID <small style="color:var(--text-muted)">${isEditMode ? '(Read-only)' : '(Auto if blank)'}</small></label>
                            <input type="text" class="form-control font-mono" name="orderId" placeholder="e.g., ORD-001" value="${escapeHtml(existingOrder?.salesOrderId || '')}" ${isEditMode ? 'readonly style="background: var(--bg-card-hover);"' : ''}>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Customer <span class="required-indicator" style="color: var(--accent-danger);">*</span></label>
                            <div id="customer-dropdown-placeholder" data-field="customerId" data-selected="${escapeHtml(existingCustomerId)}"></div>
                            ${customerCount === 0 ? '<small style="color:var(--text-muted)">No customers yet. <a href="#" data-action="navigate-customers-from-sales">Add one first</a>.</small>' : ''}
                        </div>
                    </div>

                    <!-- Capacity Sold -->
                    <div class="grid-2">
                        <div class="form-group">
                            <label class="form-label">Capacity Sold</label>
                            <input type="number" class="form-control" name="capacity.value" value="${existingOrder?.capacity?.value || 10}" min="1" placeholder="e.g., 10">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Unit</label>
                            <div id="capacity-unit-dropdown-placeholder" data-selected="${escapeHtml(existingOrder?.capacity?.unit || 'Gbps')}"></div>
                        </div>
                    </div>

                    <div class="form-group" id="linked-resource-group">
                        <label class="form-label">Linked Resource (Available)</label>
                        <div id="linked-resource-dropdown-placeholder" data-selected="${escapeHtml(existingOrder?.inventoryLink || '')}"></div>
                        <small id="linked-resource-hint" style="color:var(--text-muted)"></small>
                        ${availableResourceCount === 0 ? '<small style="color:red">No available resources found.</small>' : ''}
                    </div>

                    <div class="form-group" id="batch-allocation-group" style="display:none;">
                        <label class="form-label">Batch Allocation</label>
                        <div style="display:flex; justify-content: space-between; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
                            <small id="batch-allocation-summary" style="color: var(--text-muted);">Auto allocation by batch start date.</small>
                            <div style="display:flex; gap: 0.5rem;">
                                <button type="button" class="btn btn-secondary" id="batch-auto-btn" style="font-size: 0.75rem; padding: 0.35rem 0.65rem;">Auto Allocate</button>
                                <button type="button" class="btn btn-secondary" id="batch-clear-btn" style="font-size: 0.75rem; padding: 0.35rem 0.65rem;">Clear</button>
                            </div>
                        </div>
                        <div id="batch-allocation-table"></div>
                        <input type="hidden" name="batchAllocations" id="batch-allocations-input" value='${escapeHtml(JSON.stringify(existingOrder?.batchAllocations || []))}'>
                        <input type="hidden" name="batchAllocationMode" id="batch-allocation-mode" value="${existingOrder?.batchAllocations?.length ? 'manual' : 'auto'}">
                        <small id="batch-allocation-error" style="color: var(--accent-danger); display:none; margin-top: 0.5rem;"></small>
                    </div>

                    <!-- Contract Period -->
                    <div class="grid-3">
                        <div class="form-group">
                            <label class="form-label">Contract Start</label>
                            <input type="date" class="form-control" name="dates.start" id="sales-start-date" required value="${escapeHtml(existingOrder?.dates?.start || '')}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Term (Months)</label>
                            <input type="number" class="form-control" name="dates.term" id="sales-term" value="${existingOrder?.dates?.term || 12}" min="1" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Contract End <small style="color:var(--text-muted)">(Auto)</small></label>
                            <input type="date" class="form-control" name="dates.end" id="sales-end-date" readonly style="background: var(--bg-card-hover);" value="${escapeHtml(existingOrder?.dates?.end || '')}">
                        </div>
                    </div>

                    <!-- Status + Salesperson -->
                    <div class="grid-2">
                        <div class="form-group">
                            <label class="form-label">Sales Status</label>
                            <div>
                                <span class="status-badge-inline status-${(existingOrder?.status || 'Pending').toLowerCase()}" id="sales-status-display">
                                    ${escapeHtml(existingOrder?.status || 'Pending')}
                                </span>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Salesperson <span class="required-indicator" style="color: var(--accent-danger);">*</span></label>
                            <div id="salesperson-dropdown-placeholder" data-selected="${escapeHtml(existingOrder?.salesperson || '')}"></div>
                        </div>
                    </div>

                    <!-- Delivery Location -->
                    <div id="section-location" class="form-anchor-section">
                    <div class="form-section-header" style="margin-top: 0.75rem;">
                        <ion-icon name="location-outline"></ion-icon>
                        <span>Delivery Location</span>
                    </div></div>
                    <!-- A-End -->
                    <div style="background:rgba(255,255,255,0.02); padding:0.75rem; border-radius:4px; margin-bottom: 0.75rem;">
                        <h6 style="color:var(--accent-primary); margin: 0 0 0.5rem 0; font-size:0.8rem;">A-End</h6>
                        <div class="grid-2">
                            <div class="form-group">
                                <label class="form-label">City</label>
                                <input type="text" class="form-control" name="location.aEnd.city" placeholder="e.g., Hong Kong" value="${escapeHtml(existingOrder?.location?.aEnd?.city || '')}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">PoP</label>
                                <input type="text" class="form-control" name="location.aEnd.pop" placeholder="e.g., Equinix HK1" value="${escapeHtml(existingOrder?.location?.aEnd?.pop || '')}">
                            </div>
                        </div>
                    </div>
                    <!-- Z-End -->
                    <div style="background:rgba(255,255,255,0.02); padding:0.75rem; border-radius:4px;">
                        <h6 style="color:var(--accent-secondary); margin: 0 0 0.5rem 0; font-size:0.8rem;">Z-End</h6>
                        <div class="grid-2">
                            <div class="form-group">
                                <label class="form-label">City</label>
                                <input type="text" class="form-control" name="location.zEnd.city" placeholder="e.g., Singapore" value="${escapeHtml(existingOrder?.location?.zEnd?.city || '')}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">PoP</label>
                                <input type="text" class="form-control" name="location.zEnd.pop" placeholder="e.g., Equinix SG1" value="${escapeHtml(existingOrder?.location?.zEnd?.pop || '')}">
                            </div>
                        </div>
                    </div>

                    <!-- Revenue / Price -->
                    <div id="section-revenue" class="form-anchor-section">
                    <div class="form-section-header" style="margin-top: 0.75rem;">
                        <ion-icon name="cash-outline"></ion-icon>
                        <span>Revenue / Price</span>
                    </div></div>
                    <!-- Lease Revenue Fields -->
                    <div id="lease-revenue-fields" style="${existingOrder?.salesModel === 'IRU' ? 'display:none;' : ''}">
                        <div class="grid-2">
                            <div class="form-group">
                                <label class="form-label">MRC Sales ($)</label>
                                <input type="number" class="form-control calc-trigger" name="financials.mrcSales" value="${existingOrder?.financials?.mrcSales || 0}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">NRC Sales ($)</label>
                                <input type="number" class="form-control calc-trigger" name="financials.nrcSales" value="${existingOrder?.financials?.nrcSales || 0}">
                            </div>
                        </div>
                    </div>
                    <!-- IRU Revenue Fields -->
                    <div id="iru-revenue-fields" style="${existingOrder?.salesModel === 'IRU' ? '' : 'display:none;'}">
                        <div class="grid-3" style="align-items: end;">
                            <div class="form-group">
                                <label class="form-label">OTC ($)</label>
                                <input type="number" class="form-control calc-trigger" name="financials.otc" id="sales-otc" value="${existingOrder?.financials?.otc || 0}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">O&M Rate (%)</label>
                                <input type="number" class="form-control calc-trigger" name="financials.omRate" id="sales-om-rate" value="${existingOrder?.financials?.omRate || 3}" step="0.1">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Annual O&M</label>
                                <input type="number" class="form-control" name="financials.annualOm" id="sales-annual-om" value="${existingOrder?.financials?.annualOm || 0}" readonly style="background: var(--bg-card-hover);">
                            </div>
                        </div>
                    </div>
                        </div>

                        <!-- Cost Structure -->
                        <div class="section-card" id="section-costs">
                    <div class="form-section-header">
                        <ion-icon name="wallet-outline"></ion-icon>
                        <span>Cost Structure</span>
                    </div>

                    ${isEditMode && existingOrder?.costs ? `
                    <!-- Read-only Cost Summary (Edit Mode) -->
                    <div id="cost-summary-readonly" style="background: rgba(255,255,255,0.02); border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                            <h5 style="color: var(--text-primary); margin: 0; font-size: 0.85rem;">Current Costs</h5>
                            <button type="button" id="btn-edit-costs" class="btn btn-secondary" style="font-size: 0.75rem; padding: 0.35rem 0.75rem;">
                                <ion-icon name="create-outline"></ion-icon> Edit Costs
                            </button>
                        </div>
                        <table style="width: 100%; font-size: 0.85rem;">
                            ${cableSegments.length ? `
                            <tr>
                                <td style="padding: 0.3rem 0; color: var(--text-muted);">3rd Party Cable</td>
                                <td class="font-mono" style="text-align: right; color: var(--accent-danger);">
                                    Monthly: $${(cableSummary.monthly || 0).toLocaleString()}
                                    ${(cableSummary.onetime || 0) ? ` / One-time: $${(cableSummary.onetime || 0).toLocaleString()}` : ''}
                                </td>
                            </tr>` : ''}
                            ${existingOrder.costs.backhaulA || existingOrder.costs.backhaul?.aEnd ? `
                            <tr>
                                <td style="padding: 0.3rem 0; color: var(--text-muted);">Backhaul A-End</td>
                                <td class="font-mono" style="text-align: right; color: var(--accent-danger);">
                                    MRC: $${((existingOrder.costs.backhaulA?.mrc || existingOrder.costs.backhaul?.aEnd?.monthly || 0)).toLocaleString()}
                                </td>
                            </tr>` : ''}
                            ${existingOrder.costs.backhaulZ || existingOrder.costs.backhaul?.zEnd ? `
                            <tr>
                                <td style="padding: 0.3rem 0; color: var(--text-muted);">Backhaul Z-End</td>
                                <td class="font-mono" style="text-align: right; color: var(--accent-danger);">
                                    MRC: $${((existingOrder.costs.backhaulZ?.mrc || existingOrder.costs.backhaul?.zEnd?.monthly || 0)).toLocaleString()}
                                </td>
                            </tr>` : ''}
                            ${existingOrder.costs.crossConnectA || existingOrder.costs.xcA || existingOrder.costs.crossConnect?.aEnd ? `
                            <tr>
                                <td style="padding: 0.3rem 0; color: var(--text-muted);">Cross-Connect A</td>
                                <td class="font-mono" style="text-align: right; color: var(--accent-danger);">
                                    MRC: $${((existingOrder.costs.crossConnectA?.mrc || existingOrder.costs.xcA?.mrc || existingOrder.costs.crossConnect?.aEnd?.monthly || 0)).toLocaleString()}
                                </td>
                            </tr>` : ''}
                            ${existingOrder.costs.crossConnectZ || existingOrder.costs.xcZ || existingOrder.costs.crossConnect?.zEnd ? `
                            <tr>
                                <td style="padding: 0.3rem 0; color: var(--text-muted);">Cross-Connect Z</td>
                                <td class="font-mono" style="text-align: right; color: var(--accent-danger);">
                                    MRC: $${((existingOrder.costs.crossConnectZ?.mrc || existingOrder.costs.xcZ?.mrc || existingOrder.costs.crossConnect?.zEnd?.monthly || 0)).toLocaleString()}
                                </td>
                            </tr>` : ''}
                            <tr style="border-top: 1px solid var(--border-color);">
                                <td style="padding: 0.5rem 0 0.3rem; color: var(--text-primary); font-weight: 600;">Total Monthly Cost</td>
                                <td class="font-mono" style="text-align: right; color: var(--accent-danger); font-weight: 600;">
                                    $${(
                (cableSummary.monthly || 0) +
                (existingOrder.costs.backhaulA?.mrc || existingOrder.costs.backhaul?.aEnd?.monthly || 0) +
                (existingOrder.costs.backhaulZ?.mrc || existingOrder.costs.backhaul?.zEnd?.monthly || 0) +
                (existingOrder.costs.crossConnectA?.mrc || existingOrder.costs.xcA?.mrc || existingOrder.costs.crossConnect?.aEnd?.monthly || 0) +
                (existingOrder.costs.crossConnectZ?.mrc || existingOrder.costs.xcZ?.mrc || existingOrder.costs.crossConnect?.zEnd?.monthly || 0)
            ).toLocaleString()}
                                </td>
                            </tr>
                        </table>
                    </div>
                    ` : ''}

                    <!-- Cost Type Selector (Sticky with Wrapper) -->
                    <div id="cost-buttons" class="mb-4" style="display: ${isEditMode ? 'none' : 'block'}; position: sticky; top: 0; background: var(--bg-card); padding: 0.75rem; margin: -0.5rem -0.5rem 0.5rem -0.5rem; z-index: var(--z-sticky); box-shadow: 0 4px 12px rgba(0,0,0,0.3); border-radius: 8px;">
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <span style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Cost Types</span>
                            <div class="cost-type-dropdown">
                                <button type="button" class="btn btn-secondary" id="cost-type-trigger" style="font-size: 0.8rem;">
                                    <ion-icon name="add-outline"></ion-icon> Add Cost
                                </button>
                                <div class="cost-type-menu" id="cost-type-menu">
                                    <button type="button" class="cost-add-btn cost-add-multi" data-cost-type="cable" id="add-cable-btn">
                                        <ion-icon name="git-branch-outline"></ion-icon> Cable Segment
                                    </button>
                                    <button type="button" class="cost-toggle-btn" data-cost-type="backhaulA" id="add-backhaul-a-btn">
                                        <ion-icon name="arrow-forward-outline"></ion-icon> Backhaul A
                                    </button>
                                    <button type="button" class="cost-toggle-btn" data-cost-type="backhaulZ" id="add-backhaul-z-btn">
                                        <ion-icon name="arrow-back-outline"></ion-icon> Backhaul Z
                                    </button>
                                    <button type="button" class="cost-toggle-btn" data-cost-type="xcA" id="add-xc-a-btn">
                                        <ion-icon name="link-outline"></ion-icon> XC A
                                    </button>
                                    <button type="button" class="cost-toggle-btn" data-cost-type="xcZ" id="add-xc-z-btn">
                                        <ion-icon name="link-outline"></ion-icon> XC Z
                                    </button>
                                    <button type="button" class="cost-add-btn cost-add-multi" data-cost-type="other" id="add-other-btn">
                                        <ion-icon name="ellipsis-horizontal-outline"></ion-icon> Other Cost
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Dynamic Cost Cards Container -->
                    <div id="cost-cards-container" style="${isEditMode ? 'display: none;' : ''}">
                        <!-- Cost cards will be inserted here dynamically -->
                    </div>

                    <!-- Cost Totals Summary -->
                    <div id="cost-totals" style="display: ${isEditMode ? 'none' : 'block'}; background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 8px; padding: 0.75rem; margin-top: 0.75rem;">
                        <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-muted);">
                            <span>Recurring Cost</span>
                            <span id="cost-total-recurring" class="font-mono" style="color: var(--accent-danger);">$0</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-muted); margin-top: 0.35rem;">
                            <span>One-time Cost</span>
                            <span id="cost-total-onetime" class="font-mono" style="color: var(--accent-warning);">$0</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-muted); margin-top: 0.35rem;">
                            <span>Amortized (Contract Term)</span>
                            <span id="cost-total-amortized" class="font-mono">$0</span>
                        </div>
                    </div>

                    <!-- Hidden inputs for form submission (will be populated by JS) -->
                    <input type="hidden" name="costs.cableSegments" value='${escapeHtml(JSON.stringify(cableSegments || []))}'>
                    <!-- Cable Cost -->
                    <input type="hidden" name="costs.cable.supplier" value="${escapeHtml(existingOrder?.costs?.cable?.supplier || '')}">
                    <input type="hidden" name="costs.cable.orderNo" value="${escapeHtml(existingOrder?.costs?.cable?.orderNo || '')}">
                    <input type="hidden" name="costs.cable.cableSystem" value="${escapeHtml(existingOrder?.costs?.cable?.cableSystem || '')}">
                    <input type="hidden" name="costs.cable.capacity" value="${escapeHtml(existingOrder?.costs?.cable?.capacity || 0)}">
                    <input type="hidden" name="costs.cable.capacityUnit" value="${escapeHtml(existingOrder?.costs?.cable?.capacityUnit || 'Gbps')}">
                    <input type="hidden" name="costs.cable.model" value="${escapeHtml(existingOrder?.costs?.cable?.model || 'Lease')}">
                    <input type="hidden" name="costs.cable.protection" value="${escapeHtml(existingOrder?.costs?.cable?.protection || 'Unprotected')}">
                    <input type="hidden" name="costs.cable.protectionCableSystem" value="${escapeHtml(existingOrder?.costs?.cable?.protectionCableSystem || '')}">
                    <input type="hidden" name="costs.cable.mrc" value="${escapeHtml(existingOrder?.costs?.cable?.mrc || 0)}">
                    <input type="hidden" name="costs.cable.nrc" value="${escapeHtml(existingOrder?.costs?.cable?.nrc || 0)}">
                    <input type="hidden" name="costs.cable.otc" value="${escapeHtml(existingOrder?.costs?.cable?.otc || 0)}">
                    <input type="hidden" name="costs.cable.omRate" value="${escapeHtml(existingOrder?.costs?.cable?.omRate || 0)}">
                    <input type="hidden" name="costs.cable.annualOm" value="${escapeHtml(existingOrder?.costs?.cable?.annualOm || 0)}">
                    <input type="hidden" name="costs.cable.startDate" value="${escapeHtml(existingOrder?.costs?.cable?.startDate || '')}">
                    <input type="hidden" name="costs.cable.termMonths" value="${escapeHtml(existingOrder?.costs?.cable?.termMonths || 12)}">
                    <input type="hidden" name="costs.cable.endDate" value="${escapeHtml(existingOrder?.costs?.cable?.endDate || '')}">
                    <!-- Backhaul -->
                    <input type="hidden" name="costs.backhaulA.supplier" value="${escapeHtml(existingOrder?.costs?.backhaul?.aEnd?.supplier || '')}">
                    <input type="hidden" name="costs.backhaul.aEnd.monthly" value="${escapeHtml(existingOrder?.costs?.backhaul?.aEnd?.monthly || 0)}">
                    <input type="hidden" name="costs.backhaul.aEnd.nrc" value="${escapeHtml(existingOrder?.costs?.backhaul?.aEnd?.nrc || 0)}">
                    <input type="hidden" name="costs.backhaulA.model" value="${escapeHtml(existingOrder?.costs?.backhaul?.aEnd?.model || 'Lease')}">
                    <input type="hidden" name="costs.backhaulA.otc" value="${escapeHtml(existingOrder?.costs?.backhaul?.aEnd?.otc || 0)}">
                    <input type="hidden" name="costs.backhaulA.omRate" value="${escapeHtml(existingOrder?.costs?.backhaul?.aEnd?.omRate || 0)}">
                    <input type="hidden" name="costs.backhaulA.annualOm" value="${escapeHtml(existingOrder?.costs?.backhaul?.aEnd?.annualOm || 0)}">
                    <input type="hidden" name="costs.backhaulA.startDate" value="${escapeHtml(existingOrder?.costs?.backhaul?.aEnd?.startDate || '')}">
                    <input type="hidden" name="costs.backhaulA.termMonths" value="${escapeHtml(existingOrder?.costs?.backhaul?.aEnd?.termMonths || 12)}">
                    <input type="hidden" name="costs.backhaulA.endDate" value="${escapeHtml(existingOrder?.costs?.backhaul?.aEnd?.endDate || '')}">
                    <input type="hidden" name="costs.backhaulZ.supplier" value="${escapeHtml(existingOrder?.costs?.backhaul?.zEnd?.supplier || '')}">
                    <input type="hidden" name="costs.backhaul.zEnd.monthly" value="${escapeHtml(existingOrder?.costs?.backhaul?.zEnd?.monthly || 0)}">
                    <input type="hidden" name="costs.backhaul.zEnd.nrc" value="${escapeHtml(existingOrder?.costs?.backhaul?.zEnd?.nrc || 0)}">
                    <input type="hidden" name="costs.backhaulZ.model" value="${escapeHtml(existingOrder?.costs?.backhaul?.zEnd?.model || 'Lease')}">
                    <input type="hidden" name="costs.backhaulZ.otc" value="${escapeHtml(existingOrder?.costs?.backhaul?.zEnd?.otc || 0)}">
                    <input type="hidden" name="costs.backhaulZ.omRate" value="${escapeHtml(existingOrder?.costs?.backhaul?.zEnd?.omRate || 0)}">
                    <input type="hidden" name="costs.backhaulZ.annualOm" value="${escapeHtml(existingOrder?.costs?.backhaul?.zEnd?.annualOm || 0)}">
                    <input type="hidden" name="costs.backhaulZ.startDate" value="${escapeHtml(existingOrder?.costs?.backhaul?.zEnd?.startDate || '')}">
                    <input type="hidden" name="costs.backhaulZ.termMonths" value="${escapeHtml(existingOrder?.costs?.backhaul?.zEnd?.termMonths || 12)}">
                    <input type="hidden" name="costs.backhaulZ.endDate" value="${escapeHtml(existingOrder?.costs?.backhaul?.zEnd?.endDate || '')}">
                    <!-- Cross Connect -->
                    <input type="hidden" name="costs.xcA.supplier" value="${escapeHtml(existingOrder?.costs?.crossConnect?.aEnd?.supplier || '')}">
                    <input type="hidden" name="costs.crossConnect.aEnd.monthly" value="${escapeHtml(existingOrder?.costs?.crossConnect?.aEnd?.monthly || 0)}">
                    <input type="hidden" name="costs.crossConnect.aEnd.nrc" value="${escapeHtml(existingOrder?.costs?.crossConnect?.aEnd?.nrc || 0)}">
                    <input type="hidden" name="costs.xcA.startDate" value="${escapeHtml(existingOrder?.costs?.crossConnect?.aEnd?.startDate || '')}">
                    <input type="hidden" name="costs.xcA.termMonths" value="${escapeHtml(existingOrder?.costs?.crossConnect?.aEnd?.termMonths || 12)}">
                    <input type="hidden" name="costs.xcA.endDate" value="${escapeHtml(existingOrder?.costs?.crossConnect?.aEnd?.endDate || '')}">
                    <input type="hidden" name="costs.xcZ.supplier" value="${escapeHtml(existingOrder?.costs?.crossConnect?.zEnd?.supplier || '')}">
                    <input type="hidden" name="costs.crossConnect.zEnd.monthly" value="${escapeHtml(existingOrder?.costs?.crossConnect?.zEnd?.monthly || 0)}">
                    <input type="hidden" name="costs.crossConnect.zEnd.nrc" value="${escapeHtml(existingOrder?.costs?.crossConnect?.zEnd?.nrc || 0)}">
                    <input type="hidden" name="costs.xcZ.startDate" value="${escapeHtml(existingOrder?.costs?.crossConnect?.zEnd?.startDate || '')}">
                    <input type="hidden" name="costs.xcZ.termMonths" value="${escapeHtml(existingOrder?.costs?.crossConnect?.zEnd?.termMonths || 12)}">
                    <input type="hidden" name="costs.xcZ.endDate" value="${escapeHtml(existingOrder?.costs?.crossConnect?.zEnd?.endDate || '')}">
                    <!-- Other Costs -->
                    <input type="hidden" name="costs.otherCosts.description" value="${escapeHtml(existingOrder?.costs?.otherCosts?.description || '')}">
                    <input type="hidden" name="costs.other.supplier" value="${escapeHtml(existingOrder?.costs?.otherCosts?.supplier || '')}">
                    <input type="hidden" name="costs.otherCosts.oneOff" value="${escapeHtml(existingOrder?.costs?.otherCosts?.oneOff || 0)}">
                    <input type="hidden" name="costs.otherCosts.monthly" value="${escapeHtml(existingOrder?.costs?.otherCosts?.monthly || 0)}">
                    <input type="hidden" name="costs.other.startDate" value="${escapeHtml(existingOrder?.costs?.otherCosts?.startDate || '')}">
                    <input type="hidden" name="costs.other.termMonths" value="${escapeHtml(existingOrder?.costs?.otherCosts?.termMonths || 12)}">
                    <input type="hidden" name="costs.other.endDate" value="${escapeHtml(existingOrder?.costs?.otherCosts?.endDate || '')}">
                        </div>
                    </div>
                    <!-- Close nested 2-column grid -->
                
                    <!-- Order Notes - Inside right container, spans full width -->
                    <div class="section-card" id="section-notes" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem 1.25rem;">
                        <div class="form-section-header" style="margin-bottom: 0.75rem;">
                            <ion-icon name="create-outline"></ion-icon>
                            <span>Order Notes</span>
                        </div>
                        <textarea class="form-control" name="notes" rows="3" placeholder="Additional notes about this order..." style="resize: vertical;">${escapeHtml(existingOrder?.notes || '')}</textarea>
                    </div>
                </div>
                <!-- Close Right Container -->
            </div>
            <!-- Close 2-Column Grid -->
    `;
}
