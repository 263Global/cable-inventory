/**
 * Sales Form Module (ES6)
 * Handles sales order form: modal, listeners, financials calculation, submission
 * 
 * All functions receive `context` (the App object) as the first parameter
 * to access shared state and utilities.
 */

import { renderSearchableDropdown, initSearchableDropdown, renderSimpleDropdown, initSimpleDropdown } from './searchableDropdown.js';

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
    const existingCustomerId = existingOrder?.customerId || '';

    // Generate supplier options for cost card dropdowns
    const suppliers = window.Store.getSuppliers();
    const supplierOptionsHTML = suppliers.map(s =>
        `<option value="${s.id}">${s.short_name}${s.full_name ? ' (' + s.full_name + ')' : ''}</option>`
    ).join('');

    const modalContent = `
            <!-- 2-Column Layout: Profitability (sticky) | Right Container -->
            <div class="sales-form-grid" style="display: grid; grid-template-columns: 280px 1fr; gap: 1.5rem; align-items: start;">
                
                <!-- COLUMN 1: Profitability Analysis (Sticky) -->
                <div style="position: sticky; top: 0; z-index: 10;">
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
                    <!-- Nested 2-Column Grid for Sales Info & Cost Structure -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
                        <!-- Sales Information -->
                        <div class="section-card">
                    <h4 class="mb-4" style="color: var(--accent-primary); border-bottom: 1px solid var(--border-color); padding-bottom:0.5rem;">Sales Information</h4>

                    <!-- Sales Model & Type (FIRST - determines other field behavior) -->
                    <div class="grid-2">
                        <div class="form-group">
                            <label class="form-label">Sales Model <span class="required-indicator" style="color: var(--accent-danger);">*</span></label>
                            <div id="sales-model-dropdown-placeholder" data-selected="${existingOrder?.salesModel || 'Lease'}"></div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Sales Type <span class="required-indicator" style="color: var(--accent-danger);">*</span></label>
                            <div id="sales-type-dropdown-placeholder" data-selected="${existingOrder?.salesType || 'Resale'}"></div>
                        </div>
                    </div>

                    <!-- Order ID + Customer -->
                    <div class="grid-2">
                        <div class="form-group">
                            <label class="form-label">Order ID <small style="color:var(--text-muted)">${isEditMode ? '(Read-only)' : '(Auto if blank)'}</small></label>
                            <input type="text" class="form-control font-mono" name="orderId" placeholder="e.g., ORD-001" value="${existingOrder?.salesOrderId || ''}" ${isEditMode ? 'readonly style="background: var(--bg-card-hover);"' : ''}>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Customer <span class="required-indicator" style="color: var(--accent-danger);">*</span></label>
                            <div id="customer-dropdown-placeholder" data-field="customerId" data-selected="${existingCustomerId}"></div>
                            ${customers.length === 0 ? '<small style="color:var(--text-muted)">No customers yet. <a href="#" onclick="App.renderView(\'customers\'); App.closeModal(); return false;">Add one first</a>.</small>' : ''}
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
                            <div id="capacity-unit-dropdown-placeholder" data-selected="${existingOrder?.capacity?.unit || 'Gbps'}"></div>
                        </div>
                    </div>

                    <div class="form-group" id="linked-resource-group">
                        <label class="form-label">Linked Resource (Available)</label>
                        <div id="linked-resource-dropdown-placeholder" data-selected="${existingOrder?.inventoryLink || ''}"></div>
                        ${availableResources.length === 0 ? '<small style="color:red">No available resources found.</small>' : ''}
                    </div>

                    <!-- Contract Period -->
                    <div class="grid-3">
                        <div class="form-group">
                            <label class="form-label">Contract Start</label>
                            <input type="date" class="form-control" name="dates.start" id="sales-start-date" required value="${existingOrder?.dates?.start || ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Term (Months)</label>
                            <input type="number" class="form-control" name="dates.term" id="sales-term" value="${existingOrder?.dates?.term || 12}" min="1" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Contract End <small style="color:var(--text-muted)">(Auto)</small></label>
                            <input type="date" class="form-control" name="dates.end" id="sales-end-date" readonly style="background: var(--bg-card-hover);" value="${existingOrder?.dates?.end || ''}">
                        </div>
                    </div>

                    <!-- Status + Salesperson -->
                    <div class="grid-2">
                        <div class="form-group">
                            <label class="form-label">Sales Status</label>
                            <input type="text" class="form-control" id="sales-status-display" value="${existingOrder?.status || 'Pending'}" readonly style="background: var(--bg-card-hover); color: var(--text-secondary);">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Salesperson <span class="required-indicator" style="color: var(--accent-danger);">*</span></label>
                            <div id="salesperson-dropdown-placeholder" data-selected="${existingOrder?.salesperson || ''}"></div>
                        </div>
                    </div>

                    <!-- Delivery Location -->
                    <h5 class="mt-4 mb-2">Delivery Location</h5>
                    <!-- A-End -->
                    <div style="background:rgba(255,255,255,0.02); padding:0.75rem; border-radius:4px; margin-bottom: 0.75rem;">
                        <h6 style="color:var(--accent-primary); margin: 0 0 0.5rem 0; font-size:0.8rem;">A-End</h6>
                        <div class="grid-2">
                            <div class="form-group">
                                <label class="form-label">City</label>
                                <input type="text" class="form-control" name="location.aEnd.city" placeholder="e.g., Hong Kong" value="${existingOrder?.location?.aEnd?.city || ''}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">PoP</label>
                                <input type="text" class="form-control" name="location.aEnd.pop" placeholder="e.g., Equinix HK1" value="${existingOrder?.location?.aEnd?.pop || ''}">
                            </div>
                        </div>
                    </div>
                    <!-- Z-End -->
                    <div style="background:rgba(255,255,255,0.02); padding:0.75rem; border-radius:4px;">
                        <h6 style="color:var(--accent-secondary); margin: 0 0 0.5rem 0; font-size:0.8rem;">Z-End</h6>
                        <div class="grid-2">
                            <div class="form-group">
                                <label class="form-label">City</label>
                                <input type="text" class="form-control" name="location.zEnd.city" placeholder="e.g., Singapore" value="${existingOrder?.location?.zEnd?.city || ''}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">PoP</label>
                                <input type="text" class="form-control" name="location.zEnd.pop" placeholder="e.g., Equinix SG1" value="${existingOrder?.location?.zEnd?.pop || ''}">
                            </div>
                        </div>
                    </div>

                    <!-- Revenue / Price -->
                    <h5 class="mt-4 mb-2">Revenue / Price</h5>
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
                        <div class="section-card">
                    <h4 class="mb-4" style="color: var(--accent-secondary); border-bottom: 1px solid var(--border-color); padding-bottom:0.5rem;">Cost Structure</h4>

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
                            ${existingOrder.costs.cable || existingOrder.costs.cableCost ? `
                            <tr>
                                <td style="padding: 0.3rem 0; color: var(--text-muted);">3rd Party Cable</td>
                                <td class="font-mono" style="text-align: right; color: var(--accent-danger);">
                                    MRC: $${((existingOrder.costs.cable?.mrc || existingOrder.costs.cableCost?.mrc || 0)).toLocaleString()}
                                    ${(existingOrder.costs.cable?.nrc || existingOrder.costs.cableCost?.nrc) ? ` / NRC: $${(existingOrder.costs.cable?.nrc || existingOrder.costs.cableCost?.nrc).toLocaleString()}` : ''}
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
                (existingOrder.costs.cable?.mrc || existingOrder.costs.cableCost?.mrc || 0) +
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

                    <!-- Add Cost Buttons (Sticky with Wrapper) -->
                    <div id="cost-buttons" class="mb-4" style="display: ${isEditMode ? 'none' : 'flex'}; flex-wrap: wrap; gap: 0.5rem; position: sticky; top: 0; background: var(--bg-card); padding: 0.75rem; margin: -0.5rem -0.5rem 0.5rem -0.5rem; z-index: 10; box-shadow: 0 4px 12px rgba(0,0,0,0.3); border-radius: 8px;">
                        <button type="button" class="btn btn-secondary cost-add-btn" data-cost-type="cable" id="add-cable-btn" style="font-size: 0.8rem;">
                            <ion-icon name="add-outline"></ion-icon> 3rd Party Cable
                        </button>
                        <button type="button" class="btn btn-secondary cost-add-btn" data-cost-type="backhaulA" id="add-backhaul-a-btn" style="font-size: 0.8rem;">
                            <ion-icon name="add-outline"></ion-icon> Backhaul A
                        </button>
                        <button type="button" class="btn btn-secondary cost-add-btn" data-cost-type="backhaulZ" id="add-backhaul-z-btn" style="font-size: 0.8rem;">
                            <ion-icon name="add-outline"></ion-icon> Backhaul Z
                        </button>
                        <button type="button" class="btn btn-secondary cost-add-btn" data-cost-type="xcA" id="add-xc-a-btn" style="font-size: 0.8rem;">
                            <ion-icon name="add-outline"></ion-icon> XC A
                        </button>
                        <button type="button" class="btn btn-secondary cost-add-btn" data-cost-type="xcZ" id="add-xc-z-btn" style="font-size: 0.8rem;">
                            <ion-icon name="add-outline"></ion-icon> XC Z
                        </button>
                        <button type="button" class="btn btn-secondary cost-add-btn cost-add-multi" data-cost-type="other" id="add-other-btn" style="font-size: 0.8rem;">
                            <ion-icon name="add-outline"></ion-icon> Other Costs
                        </button>
                    </div>

                    <!-- Dynamic Cost Cards Container -->
                    <div id="cost-cards-container" style="${isEditMode ? 'display: none;' : ''}">
                        <!-- Cost cards will be inserted here dynamically -->
                    </div>

                    <!-- Hidden inputs for form submission (will be populated by JS) -->
                    <!-- Cable Cost -->
                    <input type="hidden" name="costs.cable.supplier" value="${existingOrder?.costs?.cable?.supplier || ''}">
                    <input type="hidden" name="costs.cable.orderNo" value="${existingOrder?.costs?.cable?.orderNo || ''}">
                    <input type="hidden" name="costs.cable.cableSystem" value="${existingOrder?.costs?.cable?.cableSystem || ''}">
                    <input type="hidden" name="costs.cable.capacity" value="${existingOrder?.costs?.cable?.capacity || 0}">
                    <input type="hidden" name="costs.cable.capacityUnit" value="${existingOrder?.costs?.cable?.capacityUnit || 'Gbps'}">
                    <input type="hidden" name="costs.cable.model" value="${existingOrder?.costs?.cable?.model || 'Lease'}">
                    <input type="hidden" name="costs.cable.protection" value="${existingOrder?.costs?.cable?.protection || 'Unprotected'}">
                    <input type="hidden" name="costs.cable.protectionCableSystem" value="${existingOrder?.costs?.cable?.protectionCableSystem || ''}">
                    <input type="hidden" name="costs.cable.mrc" value="${existingOrder?.costs?.cable?.mrc || 0}">
                    <input type="hidden" name="costs.cable.nrc" value="${existingOrder?.costs?.cable?.nrc || 0}">
                    <input type="hidden" name="costs.cable.otc" value="${existingOrder?.costs?.cable?.otc || 0}">
                    <input type="hidden" name="costs.cable.omRate" value="${existingOrder?.costs?.cable?.omRate || 0}">
                    <input type="hidden" name="costs.cable.annualOm" value="${existingOrder?.costs?.cable?.annualOm || 0}">
                    <input type="hidden" name="costs.cable.startDate" value="${existingOrder?.costs?.cable?.startDate || ''}">
                    <input type="hidden" name="costs.cable.termMonths" value="${existingOrder?.costs?.cable?.termMonths || 12}">
                    <input type="hidden" name="costs.cable.endDate" value="${existingOrder?.costs?.cable?.endDate || ''}">
                    <!-- Backhaul -->
                    <input type="hidden" name="costs.backhaul.aEnd.monthly" value="${existingOrder?.costs?.backhaul?.aEnd?.monthly || 0}">
                    <input type="hidden" name="costs.backhaul.aEnd.nrc" value="${existingOrder?.costs?.backhaul?.aEnd?.nrc || 0}">
                    <input type="hidden" name="costs.backhaul.zEnd.monthly" value="${existingOrder?.costs?.backhaul?.zEnd?.monthly || 0}">
                    <input type="hidden" name="costs.backhaul.zEnd.nrc" value="${existingOrder?.costs?.backhaul?.zEnd?.nrc || 0}">
                    <!-- Cross Connect -->
                    <input type="hidden" name="costs.crossConnect.aEnd.monthly" value="${existingOrder?.costs?.crossConnect?.aEnd?.monthly || 0}">
                    <input type="hidden" name="costs.crossConnect.aEnd.nrc" value="${existingOrder?.costs?.crossConnect?.aEnd?.nrc || 0}">
                    <input type="hidden" name="costs.crossConnect.zEnd.monthly" value="${existingOrder?.costs?.crossConnect?.zEnd?.monthly || 0}">
                    <input type="hidden" name="costs.crossConnect.zEnd.nrc" value="${existingOrder?.costs?.crossConnect?.zEnd?.nrc || 0}">
                    <!-- Other Costs -->
                    <input type="hidden" name="costs.otherCosts.description" value="${existingOrder?.costs?.otherCosts?.description || ''}">
                    <input type="hidden" name="costs.otherCosts.oneOff" value="${existingOrder?.costs?.otherCosts?.oneOff || 0}">
                    <input type="hidden" name="costs.otherCosts.monthly" value="${existingOrder?.costs?.otherCosts?.monthly || 0}">
                        </div>
                    </div>
                    <!-- Close nested 2-column grid -->
                
                    <!-- Order Notes - Inside right container, spans full width -->
                    <div class="section-card" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem 1.25rem;">
                        <h4 style="color: var(--text-muted); margin-bottom: 0.75rem; font-size: 0.9rem; display: flex; align-items: center; gap: 0.5rem;">
                            <ion-icon name="document-text-outline"></ion-icon> Order Notes
                        </h4>
                        <textarea class="form-control" name="notes" rows="3" placeholder="Additional notes about this order..." style="resize: vertical;">${existingOrder?.notes || ''}</textarea>
                    </div>
                </div>
                <!-- Close Right Container -->
            </div>
            <!-- Close 2-Column Grid -->
            `;

    context.openModal(isEditMode ? `Edit Sales Order: ${existingOrderId}` : 'New Sales Order', modalContent, (form) => context.handleSalesSubmit(form), true); // true for large modal

    // Initialize Sales Model simple dropdown
    const salesModelPlaceholder = document.getElementById('sales-model-dropdown-placeholder');
    if (salesModelPlaceholder) {
        const selectedModel = salesModelPlaceholder.dataset.selected || 'Lease';
        salesModelPlaceholder.outerHTML = renderSimpleDropdown({
            name: 'salesModel',
            id: 'sales-model-select',
            options: [
                { value: 'Lease', label: 'Lease (月租模式)' },
                { value: 'IRU', label: 'IRU (买断模式)' }
            ],
            selectedValue: selectedModel,
            placeholder: 'Select...'
        });
        initSimpleDropdown('sales-model-select-container');
    }

    // Initialize Sales Type simple dropdown
    const salesTypePlaceholder = document.getElementById('sales-type-dropdown-placeholder');
    if (salesTypePlaceholder) {
        const selectedType = salesTypePlaceholder.dataset.selected || 'Resale';
        salesTypePlaceholder.outerHTML = renderSimpleDropdown({
            name: 'salesType',
            id: 'sales-type-select',
            options: [
                { value: 'Resale', label: 'Resale (外部资源)' },
                { value: 'Hybrid', label: 'Hybrid (混合资源)' },
                { value: 'Inventory', label: 'Inventory (自有资源)' },
                { value: 'Swapped Out', label: 'Swapped Out (置换出去)' }
            ],
            selectedValue: selectedType,
            placeholder: 'Select...'
        });
        initSimpleDropdown('sales-type-select-container');
    }

    // Initialize Customer searchable dropdown
    const customerPlaceholder = document.getElementById('customer-dropdown-placeholder');
    if (customerPlaceholder) {
        const selectedCustomerId = customerPlaceholder.dataset.selected || '';
        const dropdownId = 'sales-customer-dropdown';
        customerPlaceholder.outerHTML = renderSearchableDropdown({
            name: 'customerId',
            id: dropdownId,
            options: customerDropdownOptions,
            selectedValue: selectedCustomerId,
            placeholder: '搜索客户...'
        });
        initSearchableDropdown(`${dropdownId}-container`);
    }

    // Initialize Capacity Unit simple dropdown
    const capacityUnitPlaceholder = document.getElementById('capacity-unit-dropdown-placeholder');
    if (capacityUnitPlaceholder) {
        const selectedUnit = capacityUnitPlaceholder.dataset.selected || 'Gbps';
        capacityUnitPlaceholder.outerHTML = renderSimpleDropdown({
            name: 'capacity.unit',
            id: 'capacity-unit-select',
            options: [
                { value: 'Gbps', label: 'Gbps' },
                { value: 'Wavelength', label: 'Wavelength' },
                { value: 'Fiber Pair', label: 'Fiber Pair' }
            ],
            selectedValue: selectedUnit,
            placeholder: 'Select...'
        });
        initSimpleDropdown('capacity-unit-select-container');
    }

    // Initialize Linked Resource simple dropdown
    const linkedResourcePlaceholder = document.getElementById('linked-resource-dropdown-placeholder');
    if (linkedResourcePlaceholder) {
        const selectedResource = linkedResourcePlaceholder.dataset.selected || '';
        linkedResourcePlaceholder.outerHTML = renderSimpleDropdown({
            name: 'inventoryLink',
            id: 'inventory-link-select',
            options: [{ value: '', label: 'Select Resource...' }, ...resourceOptions],
            selectedValue: selectedResource,
            placeholder: 'Select Resource...'
        });
        initSimpleDropdown('inventory-link-select-container');
    }

    // Initialize Salesperson simple dropdown
    const salespersonPlaceholder = document.getElementById('salesperson-dropdown-placeholder');
    if (salespersonPlaceholder) {
        const selectedPerson = salespersonPlaceholder.dataset.selected || '';
        salespersonPlaceholder.outerHTML = renderSimpleDropdown({
            name: 'salesperson',
            id: 'salesperson-select',
            options: [
                { value: '', label: 'Select...' },
                { value: 'Janna Dai', label: 'Janna Dai' },
                { value: 'Miki Chen', label: 'Miki Chen' },
                { value: 'Wayne Jiang', label: 'Wayne Jiang' },
                { value: 'Kristen Gan', label: 'Kristen Gan' },
                { value: 'Becky Hai', label: 'Becky Hai' },
                { value: 'Wolf Yuan', label: 'Wolf Yuan' },
                { value: 'Yifeng Jiang', label: 'Yifeng Jiang' },
                { value: 'Procurement Team', label: 'Procurement Team' }
            ],
            selectedValue: selectedPerson,
            placeholder: 'Select...'
        });
        initSimpleDropdown('salesperson-select-container');
    }

    // Attach Event Listeners for Dynamic Logic
    context.attachSalesFormListeners();

    // If edit mode, sync hidden inputs and add Edit Costs button handler
    if (isEditMode && existingOrder) {
        // Sync hidden inputs from existing order data for correct calculation
        const syncHiddenInput = (name, value) => {
            const input = document.querySelector(`input[name="${name}"]`);
            if (input && value !== undefined && value !== null) {
                input.value = value;
            }
        };

        // Get cost data using both paths
        const cableCost = existingOrder.costs?.cableCost || existingOrder.costs?.cable || {};
        const bhA = existingOrder.costs?.backhaulA || existingOrder.costs?.backhaul?.aEnd || {};
        const bhZ = existingOrder.costs?.backhaulZ || existingOrder.costs?.backhaul?.zEnd || {};
        const xcA = existingOrder.costs?.crossConnectA || existingOrder.costs?.xcA || existingOrder.costs?.crossConnect?.aEnd || {};
        const xcZ = existingOrder.costs?.crossConnectZ || existingOrder.costs?.xcZ || existingOrder.costs?.crossConnect?.zEnd || {};

        // Sync cable costs
        syncHiddenInput('costs.cable.mrc', cableCost.mrc || 0);
        syncHiddenInput('costs.cable.nrc', cableCost.nrc || 0);
        syncHiddenInput('costs.cable.otc', cableCost.otc || 0);
        syncHiddenInput('costs.cable.supplier', cableCost.supplier || '');

        // Sync backhaul costs
        syncHiddenInput('costs.backhaul.aEnd.monthly', bhA.mrc || bhA.monthly || 0);
        syncHiddenInput('costs.backhaul.aEnd.nrc', bhA.nrc || 0);
        syncHiddenInput('costs.backhaul.zEnd.monthly', bhZ.mrc || bhZ.monthly || 0);
        syncHiddenInput('costs.backhaul.zEnd.nrc', bhZ.nrc || 0);

        // Sync cross-connect costs
        syncHiddenInput('costs.crossConnect.aEnd.monthly', xcA.mrc || xcA.monthly || 0);
        syncHiddenInput('costs.crossConnect.aEnd.nrc', xcA.nrc || 0);
        syncHiddenInput('costs.crossConnect.zEnd.monthly', xcZ.mrc || xcZ.monthly || 0);
        syncHiddenInput('costs.crossConnect.zEnd.nrc', xcZ.nrc || 0);

        // Trigger calculation after sync
        setTimeout(() => context.calculateSalesFinancials(), 100);

        // Add Edit Costs button handler
        const editCostsBtn = document.getElementById('btn-edit-costs');
        if (editCostsBtn) {
            editCostsBtn.addEventListener('click', () => {
                // Hide the read-only summary
                const summary = document.getElementById('cost-summary-readonly');
                if (summary) summary.style.display = 'none';

                // Show the cost buttons and cards container
                const costButtons = document.getElementById('cost-buttons');
                const cardsContainer = document.getElementById('cost-cards-container');
                if (costButtons) costButtons.style.display = 'flex';
                if (cardsContainer) cardsContainer.style.display = 'block';

                // Auto-create cost cards with existing data
                setTimeout(() => {
                    // Helper to populate card field
                    const populateCardField = (selector, value) => {
                        const field = document.querySelector(selector);
                        if (field && value !== undefined && value !== null && value !== '' && value !== 0) {
                            field.value = value;
                        }
                    };

                    // Cable cost card
                    if (cableCost.mrc > 0 || cableCost.otc > 0 || cableCost.supplier) {
                        const addCableBtn = document.querySelector('.cost-add-btn[data-cost-type="cable"]');
                        if (addCableBtn && !addCableBtn.disabled) {
                            addCableBtn.click();
                            setTimeout(() => {
                                populateCardField('[data-field="costs.cable.mrc"]', cableCost.mrc);
                                populateCardField('[data-field="costs.cable.nrc"]', cableCost.nrc);
                                populateCardField('[data-field="costs.cable.supplier"]', cableCost.supplier);
                                context.calculateSalesFinancials();
                            }, 50);
                        }
                    }

                    // Backhaul A
                    const bhAMrc = bhA.mrc || bhA.monthly || 0;
                    if (bhAMrc > 0) {
                        const addBtn = document.querySelector('.cost-add-btn[data-cost-type="backhaulA"]');
                        if (addBtn && !addBtn.disabled) {
                            addBtn.click();
                            setTimeout(() => {
                                populateCardField('[data-field="costs.backhaulA.mrc"]', bhAMrc);
                                populateCardField('[data-field="costs.backhaulA.nrc"]', bhA.nrc);
                            }, 50);
                        }
                    }

                    // Backhaul Z
                    const bhZMrc = bhZ.mrc || bhZ.monthly || 0;
                    if (bhZMrc > 0) {
                        const addBtn = document.querySelector('.cost-add-btn[data-cost-type="backhaulZ"]');
                        if (addBtn && !addBtn.disabled) {
                            addBtn.click();
                            setTimeout(() => {
                                populateCardField('[data-field="costs.backhaulZ.mrc"]', bhZMrc);
                                populateCardField('[data-field="costs.backhaulZ.nrc"]', bhZ.nrc);
                            }, 50);
                        }
                    }
                }, 100);
            });
        }
    }
}

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
                                                                                                                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                                                                                                                                <h5 style="color: var(--accent-primary); margin: 0; font-size: 0.9rem;">3rd Party Cable Cost</h5>
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
                                                                                                                                    <select class="form-control cost-input cable-cost-model-select" data-field="costs.cable.model">
                                                                                                                                        <option value="Lease">Lease</option>
                                                                                                                                        <option value="IRU">IRU</option>
                                                                                                                                    </select>
                                                                                                                                </div>
                                                                                                                                <div class="form-group">
                                                                                                                                    <label class="form-label">Protection</label>
                                                                                                                                    <select class="form-control cost-input cable-protection-select" data-field="costs.cable.protection">
                                                                                                                                        <option value="Unprotected">Unprotected</option>
                                                                                                                                        <option value="Protected">Protected</option>
                                                                                                                                    </select>
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
                                                                                                                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                                                                                                                                <h5 style="color: var(--accent-warning); margin: 0; font-size: 0.9rem;">Backhaul A-End</h5>
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
                                                                                                                                        <input type="number" class="form-control cost-input calc-trigger" data-field="costs.backhaulA.mrc" value="0">
                                                                                                                                    </div>
                                                                                                                                    <div class="form-group">
                                                                                                                                        <label class="form-label">NRC ($)</label>
                                                                                                                                        <input type="number" class="form-control cost-input calc-trigger" data-field="costs.backhaulA.nrc" value="0">
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
                                                                                                                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                                                                                                                                <h5 style="color: var(--accent-warning); margin: 0; font-size: 0.9rem;">Backhaul Z-End</h5>
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
                                                                                                                                        <input type="number" class="form-control cost-input calc-trigger" data-field="costs.backhaulZ.mrc" value="0">
                                                                                                                                    </div>
                                                                                                                                    <div class="form-group">
                                                                                                                                        <label class="form-label">NRC ($)</label>
                                                                                                                                        <input type="number" class="form-control cost-input calc-trigger" data-field="costs.backhaulZ.nrc" value="0">
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
                                                                                                                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                                                                                                                                <h5 style="color: var(--accent-secondary); margin: 0; font-size: 0.9rem;">Cross Connect A-End</h5>
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
                                                                                                                                    <input type="number" class="form-control cost-input calc-trigger" data-field="costs.xcA.monthly" value="0">
                                                                                                                                </div>
                                                                                                                                <div class="form-group">
                                                                                                                                    <label class="form-label">NRC ($)</label>
                                                                                                                                    <input type="number" class="form-control cost-input calc-trigger" data-field="costs.xcA.nrc" value="0">
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
                                                                                                                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                                                                                                                                <h5 style="color: var(--accent-secondary); margin: 0; font-size: 0.9rem;">Cross Connect Z-End</h5>
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
                                                                                                                                    <input type="number" class="form-control cost-input calc-trigger" data-field="costs.xcZ.monthly" value="0">
                                                                                                                                </div>
                                                                                                                                <div class="form-group">
                                                                                                                                    <label class="form-label">NRC ($)</label>
                                                                                                                                    <input type="number" class="form-control cost-input calc-trigger" data-field="costs.xcZ.nrc" value="0">
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
                                                                                                                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                                                                                                                                <h5 style="color: var(--text-muted); margin: 0; font-size: 0.9rem;">Other Costs</h5>
                                                                                                                                <button type="button" class="btn-icon cost-remove-btn" style="color: var(--accent-danger); padding: 0.25rem;" title="Remove">
                                                                                                                                    <ion-icon name="close-outline"></ion-icon>
                                                                                                                                </button>
                                                                                                                            </div>
                                                                                                                            <div class="form-group">
                                                                                                                                <label class="form-label">Description</label>
                                                                                                                                <input type="text" class="form-control cost-input" data-field-base="costs.other.description" placeholder="e.g., Smart Hands, Testing, etc.">
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
                                                                                                                                    <input type="number" class="form-control cost-input calc-trigger" data-field-base="costs.other.oneOff" value="0">
                                                                                                                                </div>
                                                                                                                                <div class="form-group">
                                                                                                                                    <label class="form-label">Monthly Fee ($)</label>
                                                                                                                                    <input type="number" class="form-control cost-input calc-trigger" data-field-base="costs.other.monthly" value="0">
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


        // Update button state (only for non-multi types)
        if (!isMulti) {
            const btn = document.querySelector(`.cost-add-btn[data-cost-type="${type}"]`);
            if (btn) {
                btn.disabled = true;
                btn.style.opacity = '0.5';
            }
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
            const modelSelect = card.querySelector('.cable-cost-model-select');
            const leaseFields = card.querySelector('.cable-lease-fields');
            const iruFields = card.querySelector('.cable-iru-fields');
            const protectionSelect = card.querySelector('.cable-protection-select');
            const protectionSystemContainer = card.querySelector('.cable-protection-system-container');
            const otcInput = card.querySelector('.cable-otc-input');
            const omRateInput = card.querySelector('.cable-om-rate-input');
            const annualOmDisplay = card.querySelector('.cable-annual-om-display');
            const startDateInput = card.querySelector('.cable-start-date');
            const termMonthsInput = card.querySelector('.cable-term-months');
            const endDateInput = card.querySelector('.cable-end-date');

            // Cost Model Toggle (Lease vs IRU)
            if (modelSelect && leaseFields && iruFields) {
                modelSelect.addEventListener('change', (e) => {
                    const isIRU = e.target.value === 'IRU';
                    leaseFields.style.display = isIRU ? 'none' : 'block';
                    iruFields.style.display = isIRU ? 'block' : 'none';
                    syncCostInputs();
                    context.calculateSalesFinancials();
                });
            }

            // Protection Toggle
            if (protectionSelect && protectionSystemContainer) {
                protectionSelect.addEventListener('change', (e) => {
                    protectionSystemContainer.style.display = e.target.value === 'Protected' ? 'block' : 'none';
                    syncCostInputs();
                });
            }

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

            // Re-enable button (only for non-multi types)
            const btn = document.querySelector(`.cost-add-btn[data-cost-type="${type}"]`);
            if (btn) {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.title = '';
            }

            // Reset hidden inputs for this type
            resetCostInputs(type);
        }

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
            backhaul: ['costs.backhaul.aEnd.monthly', 'costs.backhaul.aEnd.nrc', 'costs.backhaul.zEnd.monthly', 'costs.backhaul.zEnd.nrc'],
            crossConnect: ['costs.crossConnect.aEnd.monthly', 'costs.crossConnect.aEnd.nrc', 'costs.crossConnect.zEnd.monthly', 'costs.crossConnect.zEnd.nrc'],
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
    document.querySelectorAll('.cost-add-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.costType;
            const isMulti = btn.classList.contains('cost-add-multi');
            addCostCard(type, isMulti);
        });
    });

    // ===== Sales Type Smart Hints =====
    const salesTypeSelect = document.getElementById('sales-type-select');
    const addCableBtn = document.getElementById('add-cable-btn');
    const linkedResourceGroup = document.getElementById('linked-resource-group');
    const inventoryLinkSelect = document.getElementById('inventory-link-select');

    const updateSmartHints = () => {
        const type = salesTypeSelect?.value;
        const isInventoryOrSwap = (type === 'Inventory' || type === 'Swapped Out');

        // ===== Linked Resource Visibility =====
        if (linkedResourceGroup && inventoryLinkSelect) {
            if (type === 'Resale') {
                // Hide for Resale - not needed
                linkedResourceGroup.style.display = 'none';
                inventoryLinkSelect.removeAttribute('required');
                inventoryLinkSelect.value = ''; // Clear selection
            } else if (type === 'Swapped Out') {
                // Show but optional for Swapped Out
                linkedResourceGroup.style.display = '';
                inventoryLinkSelect.removeAttribute('required');
            } else {
                // Required for Inventory and Hybrid
                linkedResourceGroup.style.display = '';
                inventoryLinkSelect.setAttribute('required', 'required');
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
            } else {
                // Show button
                addCableBtn.style.display = '';

                // Enable button (unless already added)
                if (!addedCostTypes.has('cable')) {
                    addCableBtn.disabled = false;
                    addCableBtn.style.opacity = '1';
                    addCableBtn.title = '';
                }

                // Auto-add cable card for Resale/Hybrid
                if ((type === 'Resale' || type === 'Hybrid') && !addedCostTypes.has('cable')) {
                    addCostCard('cable');
                }
            }
        }
    };

    if (salesTypeSelect) {
        salesTypeSelect.addEventListener('change', updateSmartHints);
        // Initial check
        updateSmartHints();
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
        const today = new Date();
        const start = new Date(startDateInput.value);
        const end = new Date(endDateInput.value);

        let status = 'Active';
        if (today < start) status = 'Pending';
        if (today > end) status = 'Expired';

        statusDisplay.value = status;
    };

    if (startDateInput && termInput && endDateInput) {
        startDateInput.addEventListener('change', calculateEndDate);
        termInput.addEventListener('input', calculateEndDate);
    }

    // ===== Sales Model Toggle (Lease vs IRU Revenue Fields) =====
    const salesModelSelect = document.getElementById('sales-model-select');
    const leaseRevenueFields = document.getElementById('lease-revenue-fields');
    const iruRevenueFields = document.getElementById('iru-revenue-fields');

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

export function calculateSalesFinancials(context) {
    // ===== Helper Functions =====
    const getValue = (name) => Number(document.querySelector(`[name="${name}"]`)?.value || 0);
    const getVal = (name) => document.querySelector(`[name="${name}"]`)?.value || '';
    const fmt = (num) => '$' + num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // ===== Get Core Parameters =====
    const salesModel = getVal('salesModel');   // 'Lease' or 'IRU'
    const salesType = getVal('salesType');     // 'Resale', 'Inventory', 'Hybrid', 'Swapped Out'
    const salesTerm = getValue('dates.term') || 12;  // Sales contract term in months
    const salesCapacity = getValue('capacity.value') || 1;

    // ===== Get Linked Inventory (for Inventory/Hybrid types) =====
    const inventoryLink = getVal('inventoryLink');
    const linkedResource = inventoryLink ? window.Store.getInventory().find(r => r.resourceId === inventoryLink) : null;
    const inventoryCapacity = linkedResource?.capacity?.value || 1;
    const capacityRatio = salesCapacity / inventoryCapacity; // Capacity allocation ratio

    // ===== Calculate Inventory Monthly Cost (if applicable) =====
    let inventoryMonthlyCost = 0;
    if (linkedResource && (salesType === 'Inventory' || salesType === 'Hybrid')) {
        const invOwnership = linkedResource.acquisition?.ownership || 'Leased';
        if (invOwnership === 'IRU') {
            // IRU Inventory: (OTC / Term + Annual O&M / 12) × capacity ratio
            const invOtc = linkedResource.financials?.otc || 0;
            const invTerm = linkedResource.financials?.term || 1;
            const invAnnualOm = linkedResource.financials?.annualOmCost || 0;
            inventoryMonthlyCost = ((invOtc / invTerm) + (invAnnualOm / 12)) * capacityRatio;
        } else {
            // Leased Inventory: MRC × capacity ratio
            inventoryMonthlyCost = (linkedResource.financials?.mrc || 0) * capacityRatio;
        }
    }

    // ===== Get Operating Costs (Backhaul, XC, Other) =====
    const backhaulMRC = getValue('costs.backhaul.aEnd.monthly') + getValue('costs.backhaul.zEnd.monthly');
    const xcMRC = getValue('costs.crossConnect.aEnd.monthly') + getValue('costs.crossConnect.zEnd.monthly');
    const otherMonthly = getValue('costs.otherCosts.monthly');
    const operatingCosts = backhaulMRC + xcMRC + otherMonthly;

    // ===== Calculate based on Sales Model =====
    let monthlyRevenue = 0;
    let monthlyProfit = 0;
    let firstMonthProfit = 0;  // For IRU Resale (OTC profit in first month)
    let ongoingMonthlyProfit = 0;  // For IRU Resale (subsequent months)
    let isIruResale = false;

    if (salesModel === 'Lease') {
        // ========== LEASE MODEL ==========
        const mrcSales = getValue('financials.mrcSales');
        const nrcSales = getValue('financials.nrcSales');
        monthlyRevenue = mrcSales;

        // Get Cable MRC (only for Resale and Hybrid)
        let cableMRC = 0;
        if (salesType === 'Resale' || salesType === 'Hybrid') {
            const cableModel = getVal('costs.cable.model') || 'Lease';
            if (cableModel === 'Lease') {
                cableMRC = getValue('costs.cable.mrc');
            } else {
                // IRU cable: O&M / 12 as monthly cost
                cableMRC = getValue('costs.cable.annualOm') / 12;
            }
        }

        switch (salesType) {
            case 'Resale':
                monthlyProfit = mrcSales - cableMRC - operatingCosts;
                break;
            case 'Inventory':
                monthlyProfit = mrcSales - inventoryMonthlyCost - operatingCosts;
                break;
            case 'Hybrid':
                monthlyProfit = mrcSales - inventoryMonthlyCost - cableMRC - operatingCosts;
                break;
            default:
                monthlyProfit = mrcSales - operatingCosts;
        }

    } else if (salesModel === 'IRU') {
        // ========== IRU MODEL ==========
        const otcRevenue = getValue('financials.otc');
        const annualOmRevenue = getValue('financials.annualOm');
        const monthlyOmRevenue = annualOmRevenue / 12;

        // Get Cable costs (for Resale and Hybrid)
        const cableOtc = getValue('costs.cable.otc');
        const cableAnnualOm = getValue('costs.cable.annualOm');
        const cableTerm = getValue('costs.cable.termMonths') || salesTerm;
        const cableMonthlyOtc = cableOtc / cableTerm;
        const cableMonthlyOm = cableAnnualOm / 12;

        switch (salesType) {
            case 'Resale':
                // IRU Resale: OTC profit one-time in first month
                isIruResale = true;
                const otcProfit = otcRevenue - cableOtc;
                const monthlyOmProfit = monthlyOmRevenue - cableMonthlyOm;

                firstMonthProfit = otcProfit + monthlyOmProfit - operatingCosts;
                ongoingMonthlyProfit = monthlyOmProfit - operatingCosts;
                monthlyRevenue = monthlyOmRevenue;  // Ongoing revenue
                monthlyProfit = ongoingMonthlyProfit;  // Display ongoing profit
                break;

            case 'Inventory':
                // IRU Inventory: OTC revenue amortized monthly
                const monthlyOtcRevenue = otcRevenue / salesTerm;
                monthlyRevenue = monthlyOtcRevenue + monthlyOmRevenue;
                monthlyProfit = monthlyRevenue - inventoryMonthlyCost - operatingCosts;
                break;

            case 'Hybrid':
                // IRU Hybrid: OTC revenue amortized monthly, both inventory and cable costs
                const monthlyOtcRev = otcRevenue / salesTerm;
                monthlyRevenue = monthlyOtcRev + monthlyOmRevenue;
                monthlyProfit = monthlyRevenue - inventoryMonthlyCost - cableMonthlyOtc - cableMonthlyOm - operatingCosts;
                break;

            case 'Swapped Out':
                // Swapped Out: No profit calculation
                monthlyRevenue = 0;
                monthlyProfit = 0;
                break;

            default:
                monthlyProfit = 0;
        }
    }

    // ===== Calculate Overall Margin =====
    // For IRU Resale: first month margin is based on OTC + O&M
    // For others: based on monthly revenue
    const firstMonthMargin = isIruResale && (monthlyRevenue + (getValue('financials.otc') || 0)) > 0
        ? (firstMonthProfit / (getValue('financials.otc') + monthlyRevenue)) * 100
        : 0;
    const recurringMargin = monthlyRevenue > 0 ? (ongoingMonthlyProfit / monthlyRevenue) * 100 : 0;
    const marginPercent = monthlyRevenue > 0 ? (monthlyProfit / monthlyRevenue) * 100 : 0;
    const totalMonthlyCost = monthlyRevenue - monthlyProfit;

    // ===== Update UI =====
    document.getElementById('disp-total-cost').textContent = fmt(totalMonthlyCost);

    const marginEl = document.getElementById('disp-gross-margin');
    marginEl.textContent = fmt(monthlyProfit);
    marginEl.style.color = monthlyProfit >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)';

    const percentEl = document.getElementById('disp-margin-percent');
    const marginLabel = document.getElementById('margin-percent-label');
    const recurringRow = document.getElementById('recurring-margin-row');
    const recurringEl = document.getElementById('disp-recurring-margin');

    if (isIruResale) {
        // Show dual margins for IRU Resale
        marginLabel.textContent = '首月利润率:';
        percentEl.textContent = firstMonthMargin.toFixed(1) + '%';
        percentEl.style.color = firstMonthMargin >= 20 ? 'var(--accent-success)' : (firstMonthMargin > 0 ? 'var(--accent-warning)' : 'var(--accent-danger)');

        // Show recurring margin row
        recurringRow.style.display = 'flex';
        recurringEl.textContent = recurringMargin.toFixed(1) + '%';
        recurringEl.style.color = recurringMargin >= 20 ? 'var(--accent-success)' : (recurringMargin > 0 ? 'var(--accent-warning)' : 'var(--accent-danger)');
    } else {
        // Standard single margin display
        marginLabel.textContent = 'Margin (%):';
        percentEl.textContent = marginPercent.toFixed(1) + '%';
        percentEl.style.color = marginPercent >= 20 ? 'var(--accent-success)' : (marginPercent > 0 ? 'var(--accent-warning)' : 'var(--accent-danger)');

        // Hide recurring margin row
        recurringRow.style.display = 'none';
    }

    // NRC Profit display - for IRU Resale show first month profit, otherwise show regular NRC
    const nrcEl = document.getElementById('disp-nrc-profit');
    if (isIruResale) {
        nrcEl.textContent = fmt(firstMonthProfit) + ' (1st Mo)';
        nrcEl.style.color = firstMonthProfit >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)';
    } else {
        const nrcSales = getValue('financials.nrcSales');
        const cableNrc = getValue('costs.cable.nrc');
        const bhNrc = getValue('costs.backhaul.aEnd.nrc') + getValue('costs.backhaul.zEnd.nrc');
        const xcNrc = getValue('costs.crossConnect.aEnd.nrc') + getValue('costs.crossConnect.zEnd.nrc');
        const otherOneOff = getValue('costs.otherCosts.oneOff');
        const nrcProfit = nrcSales - cableNrc - bhNrc - xcNrc - otherOneOff;
        nrcEl.textContent = fmt(nrcProfit);
        nrcEl.style.color = nrcProfit >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)';
    }

    // ===== Check for cost date mismatch warning =====
    const salesStartDate = getVal('dates.start');
    const cableStartDate = getVal('costs.cable.startDate');
    const warningEl = document.getElementById('cost-date-warning');
    const warningText = document.getElementById('cost-date-warning-text');

    if (warningEl && salesStartDate && cableStartDate && cableStartDate < salesStartDate) {
        warningEl.style.display = 'block';
        warningText.textContent = `成本开始日期 (${cableStartDate}) 早于销售合同 (${salesStartDate})`;
    } else if (warningEl) {
        warningEl.style.display = 'none';
    }
}

export async function handleSalesSubmit(context, form) {
    // Validate form before processing
    if (!validateSalesForm(form)) {
        return false; // Prevent submission
    }

    // Collect Data
    const formData = new FormData(form);
    const getVal = (name) => form.querySelector(`[name="${name}"]`)?.value;
    const getNum = (name) => Number(getVal(name) || 0);

    // Check if we're editing an existing order
    const isEditMode = !!context._editingOrderId;

    // Calculate Status to ensure it's accurate at save time
    let status = 'Active';
    const today = new Date();
    const start = new Date(getVal('dates.start'));
    const end = new Date(getVal('dates.end'));

    if (today < start) status = 'Pending';
    if (today > end) status = 'Expired';

    const orderData = {
        salesOrderId: isEditMode ? context._editingOrderId : (getVal('orderId') || null),
        customerId: getVal('customerId'),
        customerName: window.Store.getCustomerById(getVal('customerId'))?.short_name || '',
        inventoryLink: getVal('inventoryLink'),
        status: status,
        capacity: {
            value: getNum('capacity.value'),
            unit: getVal('capacity.unit')
        },
        salesperson: getVal('salesperson'),
        salesModel: getVal('salesModel'),
        salesType: getVal('salesType'),
        location: {
            aEnd: {
                city: getVal('location.aEnd.city'),
                pop: getVal('location.aEnd.pop')
            },
            zEnd: {
                city: getVal('location.zEnd.city'),
                pop: getVal('location.zEnd.pop')
            }
        },
        dates: {
            start: getVal('dates.start'),
            term: getNum('dates.term'),
            end: getVal('dates.end')
        },
        financials: {
            // Lease fields
            mrcSales: getNum('financials.mrcSales'),
            nrcSales: getNum('financials.nrcSales'),
            // IRU fields
            otc: getNum('financials.otc'),
            omRate: getNum('financials.omRate'),
            annualOm: getNum('financials.annualOm')
            // Computed fields will be added below
        },
        costs: {
            cable: {
                supplier: getVal('costs.cable.supplier'),
                orderNo: getVal('costs.cable.orderNo'),
                cableSystem: getVal('costs.cable.cableSystem'),
                capacity: getNum('costs.cable.capacity'),
                capacityUnit: getVal('costs.cable.capacityUnit'),
                model: getVal('costs.cable.model'),
                protection: getVal('costs.cable.protection'),
                protectionCableSystem: getVal('costs.cable.protectionCableSystem'),
                // Lease fields
                mrc: getNum('costs.cable.mrc'),
                nrc: getNum('costs.cable.nrc'),
                // IRU fields
                otc: getNum('costs.cable.otc'),
                omRate: getNum('costs.cable.omRate'),
                annualOm: getNum('costs.cable.annualOm'),
                // Contract dates
                startDate: getVal('costs.cable.startDate'),
                termMonths: getNum('costs.cable.termMonths'),
                endDate: getVal('costs.cable.endDate')
            },
            backhaul: {
                aEnd: { monthly: getNum('costs.backhaul.aEnd.monthly'), nrc: getNum('costs.backhaul.aEnd.nrc') },
                zEnd: { monthly: getNum('costs.backhaul.zEnd.monthly'), nrc: getNum('costs.backhaul.zEnd.nrc') }
            },
            crossConnect: {
                aEnd: { monthly: getNum('costs.crossConnect.aEnd.monthly'), nrc: getNum('costs.crossConnect.aEnd.nrc') },
                zEnd: { monthly: getNum('costs.crossConnect.zEnd.monthly'), nrc: getNum('costs.crossConnect.zEnd.nrc') }
            },
            otherCosts: {
                description: getVal('costs.otherCosts.description'),
                oneOff: getNum('costs.otherCosts.oneOff'),
                monthly: getNum('costs.otherCosts.monthly')
            }
        },
        notes: getVal('notes') || ''
    };

    // Calculate and store financial metrics using unified engine
    const computed = computeOrderFinancials(orderData);
    orderData.financials.marginPercent = computed.marginPercent;
    orderData.financials.monthlyProfit = computed.monthlyProfit;

    // Store IRU Resale specific metrics
    if (computed.isIruResale) {
        orderData.financials.firstMonthProfit = computed.firstMonthProfit;
        orderData.financials.firstMonthMargin = computed.firstMonthMargin;
        orderData.financials.recurringMargin = computed.recurringMargin;
    }

    // Use update or add based on edit mode
    if (isEditMode) {
        await window.Store.updateSalesOrder(context._editingOrderId, orderData);
    } else {
        await window.Store.addSalesOrder(orderData);
    }

    // Clear edit mode tracking
    context._editingOrderId = null;

    context.renderView('sales');
}

/**
 * Open a renewal modal for the given sales order.
 * Allows user to set new start date and term, keeping the same order ID.
 */
export function openRenewModal(context, salesOrderId) {
    const order = window.Store.getSales().find(s => s.salesOrderId === salesOrderId);
    if (!order) {
        alert('Order not found');
        return;
    }

    // Calculate default new start date (original end date + 1 day)
    const originalEndDate = order.dates?.end || '';
    let newStartDate = '';
    if (originalEndDate) {
        const endDate = new Date(originalEndDate);
        endDate.setDate(endDate.getDate() + 1);
        newStartDate = endDate.toISOString().split('T')[0];
    }

    const originalTerm = order.dates?.term || 12;

    // Get current pricing info
    const currentMRC = order.financials?.mrcSales || 0;
    const currentNRC = order.financials?.nrcSales || 0;

    const modalContent = `
        <div style="max-width: 400px; margin: 0 auto;">
            <div style="background: var(--bg-secondary); border-radius: 12px; padding: 1.25rem; margin-bottom: 1rem;">
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
                    <ion-icon name="refresh-outline" style="font-size: 1.25rem; color: var(--accent-warning);"></ion-icon>
                    <h4 style="margin: 0; color: var(--text-primary);">续约订单</h4>
                </div>
                
                <div style="background: var(--bg-card); padding: 0.75rem; border-radius: 8px; margin-bottom: 1rem;">
                    <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.25rem;">订单号 (不变)</div>
                    <div class="font-mono" style="font-size: 1rem; color: var(--accent-primary); font-weight: 600;">${salesOrderId}</div>
                </div>
                
                <div style="background: var(--bg-card); padding: 0.75rem; border-radius: 8px; margin-bottom: 1rem;">
                    <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.25rem;">原合同期限</div>
                    <div style="font-size: 0.9rem; color: var(--text-primary);">${order.dates?.start || '-'} 至 ${originalEndDate || '-'} (${originalTerm} 个月)</div>
                </div>
            </div>
            
            <!-- 价格信息区域 -->
            <div style="background: linear-gradient(135deg, rgba(99, 91, 255, 0.08), rgba(99, 91, 255, 0.02)); border: 1px solid rgba(99, 91, 255, 0.2); border-radius: 12px; padding: 1.25rem; margin-bottom: 1rem;">
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
                    <ion-icon name="pricetag-outline" style="font-size: 1.25rem; color: var(--accent-primary);"></ion-icon>
                    <h4 style="margin: 0; color: var(--text-primary);">续约价格</h4>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div class="form-group" style="margin-bottom: 0;">
                        <label class="form-label" style="font-size: 0.8rem;">
                            月费 MRC ($)
                            <small style="color: var(--text-muted); display: block;">原: $${currentMRC.toLocaleString()}</small>
                        </label>
                        <input type="number" class="form-control" name="renewMRC" id="renew-mrc" value="${currentMRC}" min="0" step="0.01">
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                        <label class="form-label" style="font-size: 0.8rem;">
                            一次性费用 NRC ($)
                            <small style="color: var(--text-muted); display: block;">原: $${currentNRC.toLocaleString()}</small>
                        </label>
                        <input type="number" class="form-control" name="renewNRC" id="renew-nrc" value="${currentNRC}" min="0" step="0.01">
                    </div>
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">新合同开始日期</label>
                <input type="date" class="form-control" name="renewStartDate" id="renew-start-date" value="${newStartDate}" required>
            </div>
            
            <div class="form-group">
                <label class="form-label">新合同期限 (月)</label>
                <input type="number" class="form-control" name="renewTerm" id="renew-term" value="${originalTerm}" min="1" required>
            </div>
            
            <div class="form-group">
                <label class="form-label">新合同结束日期 <small style="color: var(--text-muted);">(自动计算)</small></label>
                <input type="date" class="form-control" name="renewEndDate" id="renew-end-date" readonly style="background: var(--bg-card-hover);">
            </div>
        </div>
    `;

    context.openModal(`续约: ${salesOrderId}`, modalContent, async (form) => {
        const startDate = form.querySelector('#renew-start-date').value;
        const term = parseInt(form.querySelector('#renew-term').value) || 12;
        const endDate = form.querySelector('#renew-end-date').value;
        const newMRC = parseFloat(form.querySelector('#renew-mrc').value) || 0;
        const newNRC = parseFloat(form.querySelector('#renew-nrc').value) || 0;

        if (!startDate || !endDate) {
            alert('请填写完整的日期信息');
            return false;
        }

        // Calculate new status based on dates
        const today = new Date();
        const start = new Date(startDate);
        const end = new Date(endDate);
        let newStatus = 'Active';
        if (today < start) newStatus = 'Pending';
        if (today > end) newStatus = 'Expired';

        // Update order with new dates and prices
        const updatedData = {
            ...order,
            dates: {
                start: startDate,
                term: term,
                end: endDate
            },
            financials: {
                ...order.financials,
                mrcSales: newMRC,
                nrcSales: newNRC
            },
            status: newStatus
        };

        await window.Store.updateSalesOrder(salesOrderId, updatedData);

        // Build success message
        let priceChangeMsg = '';
        if (newMRC !== currentMRC) {
            priceChangeMsg += ` MRC: $${currentMRC} → $${newMRC}`;
        }
        if (newNRC !== currentNRC) {
            priceChangeMsg += ` NRC: $${currentNRC} → $${newNRC}`;
        }

        context.showToast ? context.showToast(`订单 ${salesOrderId} 续约成功！${priceChangeMsg ? '价格已更新:' + priceChangeMsg : ''}`) : null;

        context.renderView('sales');
        return true;
    }, false);

    // Attach event listeners for auto-calculating end date
    setTimeout(() => {
        const startInput = document.getElementById('renew-start-date');
        const termInput = document.getElementById('renew-term');
        const endInput = document.getElementById('renew-end-date');

        const calculateEndDate = () => {
            if (!startInput.value || !termInput.value) return;
            const start = new Date(startInput.value);
            const months = parseInt(termInput.value) || 0;
            const end = new Date(start);
            end.setMonth(end.getMonth() + months);
            end.setDate(end.getDate() - 1); // End date is the last day of the term
            endInput.value = end.toISOString().split('T')[0];
        };

        if (startInput && termInput) {
            startInput.addEventListener('change', calculateEndDate);
            termInput.addEventListener('input', calculateEndDate);
            // Calculate initial end date
            calculateEndDate();
        }
    }, 100);
}
