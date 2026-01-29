/**
 * Sales form modal rendering and renewal flows.
 */

import { renderSearchableDropdown, initSearchableDropdown, renderSimpleDropdown, initSimpleDropdown } from '../searchableDropdown.js';
import { escapeHtml } from './utils.js';

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
                            <div id="capacity-unit-dropdown-placeholder" data-selected="${escapeHtml(existingOrder?.capacity?.unit || 'Gbps')}"></div>
                        </div>
                    </div>

                    <div class="form-group" id="linked-resource-group">
                        <label class="form-label">Linked Resource (Available)</label>
                        <div id="linked-resource-dropdown-placeholder" data-selected="${escapeHtml(existingOrder?.inventoryLink || '')}"></div>
                        <small id="linked-resource-hint" style="color:var(--text-muted)"></small>
                        ${availableResources.length === 0 ? '<small style="color:red">No available resources found.</small>' : ''}
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
                            <input type="text" class="form-control" id="sales-status-display" value="${escapeHtml(existingOrder?.status || 'Pending')}" readonly style="background: var(--bg-card-hover); color: var(--text-secondary);">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Salesperson <span class="required-indicator" style="color: var(--accent-danger);">*</span></label>
                            <div id="salesperson-dropdown-placeholder" data-selected="${escapeHtml(existingOrder?.salesperson || '')}"></div>
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
                            <button type="button" id="btn-edit-costs" class="btn btn-secondary" style="font-size: 0.75rem; padding: 0.35rem 0.75rem;" onclick="App.__enableEditCosts && App.__enableEditCosts()">
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

                    <!-- Cost Type Selector (Sticky with Wrapper) -->
                    <div id="cost-buttons" class="mb-4" style="display: ${isEditMode ? 'none' : 'flex'}; flex-wrap: wrap; gap: 0.5rem; position: sticky; top: 0; background: var(--bg-card); padding: 0.75rem; margin: -0.5rem -0.5rem 0.5rem -0.5rem; z-index: 10; box-shadow: 0 4px 12px rgba(0,0,0,0.3); border-radius: 8px;">
                        <div style="width: 100%; font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Cost Types</div>
                        <button type="button" class="btn btn-secondary cost-toggle-btn" data-cost-type="cable" id="add-cable-btn" style="font-size: 0.8rem;">
                            <ion-icon name="add-outline"></ion-icon> 3rd Party Cable
                        </button>
                        <button type="button" class="btn btn-secondary cost-toggle-btn" data-cost-type="backhaulA" id="add-backhaul-a-btn" style="font-size: 0.8rem;">
                            <ion-icon name="add-outline"></ion-icon> Backhaul A
                        </button>
                        <button type="button" class="btn btn-secondary cost-toggle-btn" data-cost-type="backhaulZ" id="add-backhaul-z-btn" style="font-size: 0.8rem;">
                            <ion-icon name="add-outline"></ion-icon> Backhaul Z
                        </button>
                        <button type="button" class="btn btn-secondary cost-toggle-btn" data-cost-type="xcA" id="add-xc-a-btn" style="font-size: 0.8rem;">
                            <ion-icon name="add-outline"></ion-icon> XC A
                        </button>
                        <button type="button" class="btn btn-secondary cost-toggle-btn" data-cost-type="xcZ" id="add-xc-z-btn" style="font-size: 0.8rem;">
                            <ion-icon name="add-outline"></ion-icon> XC Z
                        </button>
                        <button type="button" class="btn btn-secondary cost-add-btn cost-add-multi" data-cost-type="other" id="add-other-btn" style="font-size: 0.8rem;">
                            <ion-icon name="add-outline"></ion-icon> Add Other Cost
                        </button>
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
                    <input type="hidden" name="costs.xcZ.supplier" value="${escapeHtml(existingOrder?.costs?.crossConnect?.zEnd?.supplier || '')}">
                    <input type="hidden" name="costs.crossConnect.zEnd.monthly" value="${escapeHtml(existingOrder?.costs?.crossConnect?.zEnd?.monthly || 0)}">
                    <input type="hidden" name="costs.crossConnect.zEnd.nrc" value="${escapeHtml(existingOrder?.costs?.crossConnect?.zEnd?.nrc || 0)}">
                    <!-- Other Costs -->
                    <input type="hidden" name="costs.otherCosts.description" value="${escapeHtml(existingOrder?.costs?.otherCosts?.description || '')}">
                    <input type="hidden" name="costs.other.supplier" value="${escapeHtml(existingOrder?.costs?.otherCosts?.supplier || '')}">
                    <input type="hidden" name="costs.otherCosts.oneOff" value="${escapeHtml(existingOrder?.costs?.otherCosts?.oneOff || 0)}">
                    <input type="hidden" name="costs.otherCosts.monthly" value="${escapeHtml(existingOrder?.costs?.otherCosts?.monthly || 0)}">
                        </div>
                    </div>
                    <!-- Close nested 2-column grid -->
                
                    <!-- Order Notes - Inside right container, spans full width -->
                    <div class="section-card" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem 1.25rem;">
                        <h4 style="color: var(--text-muted); margin-bottom: 0.75rem; font-size: 0.9rem; display: flex; align-items: center; gap: 0.5rem;">
                            <ion-icon name="document-text-outline"></ion-icon> Order Notes
                        </h4>
                        <textarea class="form-control" name="notes" rows="3" placeholder="Additional notes about this order..." style="resize: vertical;">${escapeHtml(existingOrder?.notes || '')}</textarea>
                    </div>
                </div>
                <!-- Close Right Container -->
            </div>
            <!-- Close 2-Column Grid -->
            `;

    context.openModal(isEditMode ? `Edit Sales Order: ${escapeHtml(existingOrderId)}` : 'New Sales Order', modalContent, (form) => context.handleSalesSubmit(form), true); // true for large modal

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
        const otherCosts = existingOrder.costs?.otherCosts || {};

        // Sync cable costs
        syncHiddenInput('costs.cable.mrc', cableCost.mrc || 0);
        syncHiddenInput('costs.cable.nrc', cableCost.nrc || 0);
        syncHiddenInput('costs.cable.otc', cableCost.otc || 0);
        syncHiddenInput('costs.cable.supplier', cableCost.supplier || '');

        // Sync backhaul costs
        syncHiddenInput('costs.backhaulA.supplier', bhA.supplier || '');
        syncHiddenInput('costs.backhaul.aEnd.monthly', bhA.mrc || bhA.monthly || 0);
        syncHiddenInput('costs.backhaul.aEnd.nrc', bhA.nrc || 0);
        syncHiddenInput('costs.backhaulA.model', bhA.model || 'Lease');
        syncHiddenInput('costs.backhaulA.otc', bhA.otc || 0);
        syncHiddenInput('costs.backhaulA.omRate', bhA.omRate || 0);
        syncHiddenInput('costs.backhaulA.annualOm', bhA.annualOm || 0);
        syncHiddenInput('costs.backhaulA.startDate', bhA.startDate || '');
        syncHiddenInput('costs.backhaulA.termMonths', bhA.termMonths || 12);
        syncHiddenInput('costs.backhaulA.endDate', bhA.endDate || '');
        syncHiddenInput('costs.backhaulZ.supplier', bhZ.supplier || '');
        syncHiddenInput('costs.backhaul.zEnd.monthly', bhZ.mrc || bhZ.monthly || 0);
        syncHiddenInput('costs.backhaul.zEnd.nrc', bhZ.nrc || 0);
        syncHiddenInput('costs.backhaulZ.model', bhZ.model || 'Lease');
        syncHiddenInput('costs.backhaulZ.otc', bhZ.otc || 0);
        syncHiddenInput('costs.backhaulZ.omRate', bhZ.omRate || 0);
        syncHiddenInput('costs.backhaulZ.annualOm', bhZ.annualOm || 0);
        syncHiddenInput('costs.backhaulZ.startDate', bhZ.startDate || '');
        syncHiddenInput('costs.backhaulZ.termMonths', bhZ.termMonths || 12);
        syncHiddenInput('costs.backhaulZ.endDate', bhZ.endDate || '');

        // Sync cross-connect costs
        syncHiddenInput('costs.xcA.supplier', xcA.supplier || '');
        syncHiddenInput('costs.crossConnect.aEnd.monthly', xcA.mrc || xcA.monthly || 0);
        syncHiddenInput('costs.crossConnect.aEnd.nrc', xcA.nrc || 0);
        syncHiddenInput('costs.xcZ.supplier', xcZ.supplier || '');
        syncHiddenInput('costs.crossConnect.zEnd.monthly', xcZ.mrc || xcZ.monthly || 0);
        syncHiddenInput('costs.crossConnect.zEnd.nrc', xcZ.nrc || 0);
        syncHiddenInput('costs.other.supplier', otherCosts.supplier || '');

        // Trigger calculation after sync
        setTimeout(() => context.calculateSalesFinancials(), 100);

        // Add Edit Costs button handler
        const enableCostEditing = () => {
            // Hide the read-only summary
            const summary = document.getElementById('cost-summary-readonly');
            if (summary) summary.style.display = 'none';

            // Show the cost buttons and cards container
            const costButtons = document.getElementById('cost-buttons');
            const cardsContainer = document.getElementById('cost-cards-container');
            const costTotals = document.getElementById('cost-totals');
            if (costButtons) costButtons.style.display = 'flex';
            if (cardsContainer) cardsContainer.style.display = 'block';
            if (costTotals) costTotals.style.display = 'block';

            // Auto-create cost cards with existing data
            setTimeout(() => {
                // Helper to populate card field (for standard inputs)
                const populateCardField = (selector, value, allowZero = false) => {
                    const field = document.querySelector(selector);
                    if (field && value !== undefined && value !== null && value !== '') {
                        if (!allowZero && value === 0) return;
                        field.value = value;
                        // Trigger input event to sync hidden inputs
                        field.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                };

                // Helper to populate SimpleDropdown
                const populateSimpleDropdown = (containerId, value) => {
                    if (!value) return;
                    const container = document.getElementById(containerId);
                    if (!container) return;
                    const hiddenInput = container.querySelector('input[type="hidden"]');
                    const selectedDisplay = container.querySelector('.simple-dropdown-selected');
                    const options = container.querySelectorAll('.simple-dropdown-option');

                    if (hiddenInput) hiddenInput.value = value;
                    options.forEach(opt => {
                        if (opt.dataset.value === value) {
                            opt.classList.add('selected');
                            if (selectedDisplay) selectedDisplay.textContent = opt.textContent;
                        } else {
                            opt.classList.remove('selected');
                        }
                    });
                };

                // Helper to populate SearchableDropdown (for suppliers)
                const populateSearchableDropdown = (containerOrId, value) => {
                    if (!value) return;
                    const container = typeof containerOrId === 'string'
                        ? document.getElementById(containerOrId)
                        : containerOrId;
                    if (!container) return;
                    const hiddenInput = container.querySelector('input[type="hidden"]');
                    const selectedDisplay = container.querySelector('.searchable-dropdown-input');
                    const options = container.querySelectorAll('.searchable-dropdown-option');

                    if (hiddenInput) hiddenInput.value = value;
                    options.forEach(opt => {
                        if (opt.dataset.value === value) {
                            opt.classList.add('selected');
                            if (selectedDisplay) {
                                const label = opt.querySelector('.option-label')?.textContent || opt.textContent;
                                selectedDisplay.textContent = label;
                                selectedDisplay.value = label;
                                selectedDisplay.dataset.selectedValue = value;
                            }
                        } else {
                            opt.classList.remove('selected');
                        }
                    });
                };

                // ===== Cable Cost Card =====
                const hasCableCost = cableCost.mrc > 0 || cableCost.nrc > 0 || cableCost.otc > 0 || cableCost.supplier || cableCost.cableSystem;

                // Helper function to hydrate the cable card with data
                const hydrateCableCard = () => {
                    const cableCard = document.querySelector('.cost-card[data-cost-type="cable"]');
                    if (!cableCard) return;

                    // Basic fields - scope to cableCard
                    const populateField = (dataField, value, allowZero = false) => {
                        if (value === undefined || value === null || value === '') return;
                        if (!allowZero && value === 0) return;
                        const field = cableCard.querySelector(`[data-field="${dataField}"]`);
                        if (field) {
                            field.value = value;
                            field.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                    };

                    populateField('costs.cable.orderNo', cableCost.orderNo);
                    populateField('costs.cable.cableSystem', cableCost.cableSystem);
                    populateField('costs.cable.capacity', cableCost.capacity, true);
                    populateField('costs.cable.notes', cableCost.notes);

                    // Capacity unit dropdown (native select)
                    const capacityUnitSelect = cableCard.querySelector('[data-field="costs.cable.capacityUnit"]');
                    if (capacityUnitSelect && cableCost.capacityUnit) {
                        capacityUnitSelect.value = cableCost.capacityUnit;
                    }

                    // Cost Model SimpleDropdown - find by hidden input name within card
                    const costModelContainer = cableCard.querySelector('.simple-dropdown-container');
                    if (costModelContainer && cableCost.model) {
                        const hiddenInput = costModelContainer.querySelector('input[type="hidden"][name="costs.cable.model"]');
                        if (hiddenInput) {
                            hiddenInput.value = cableCost.model;
                            const selectedDisplay = costModelContainer.querySelector('.simple-dropdown-selected');
                            const options = costModelContainer.querySelectorAll('.simple-dropdown-option');
                            options.forEach(opt => {
                                if (opt.dataset.value === cableCost.model) {
                                    opt.classList.add('selected');
                                    if (selectedDisplay) selectedDisplay.textContent = opt.textContent;
                                } else {
                                    opt.classList.remove('selected');
                                }
                            });
                        }
                    }

                    // Protection SimpleDropdown - find by name
                    const allSimpleDropdowns = cableCard.querySelectorAll('.simple-dropdown-container');
                    allSimpleDropdowns.forEach(container => {
                        const hiddenInput = container.querySelector('input[type="hidden"]');
                        if (hiddenInput && hiddenInput.name === 'costs.cable.protection' && cableCost.protection) {
                            hiddenInput.value = cableCost.protection;
                            const selectedDisplay = container.querySelector('.simple-dropdown-selected');
                            const options = container.querySelectorAll('.simple-dropdown-option');
                            options.forEach(opt => {
                                if (opt.dataset.value === cableCost.protection) {
                                    opt.classList.add('selected');
                                    if (selectedDisplay) selectedDisplay.textContent = opt.textContent;
                                } else {
                                    opt.classList.remove('selected');
                                }
                            });
                        }
                    });

                    // Protection cable system (if protected)
                    if (cableCost.protection && cableCost.protection !== 'Unprotected') {
                        const protSystemContainer = cableCard.querySelector('.cable-protection-system-container');
                        if (protSystemContainer) protSystemContainer.style.display = 'block';
                        populateField('costs.cable.protectionCableSystem', cableCost.protectionCableSystem);
                    }

                    // Supplier searchable dropdown - find by class
                    const supplierContainer = cableCard.querySelector('.searchable-dropdown');
                    if (supplierContainer && cableCost.supplier) {
                        populateSearchableDropdown(supplierContainer, cableCost.supplier);
                    }

                    // Handle Cost Model: Lease vs IRU fields visibility and values
                    const costModel = cableCost.model || 'Lease';
                    const leaseFields = cableCard.querySelector('.cable-lease-fields');
                    const iruFields = cableCard.querySelector('.cable-iru-fields');

                    if (costModel === 'IRU') {
                        if (leaseFields) leaseFields.style.display = 'none';
                        if (iruFields) iruFields.style.display = 'block';
                        populateField('costs.cable.otc', cableCost.otc, true);
                        populateField('costs.cable.omRate', cableCost.omRate, true);
                        populateField('costs.cable.annualOm', cableCost.annualOm, true);
                    } else {
                        if (leaseFields) leaseFields.style.display = 'block';
                        if (iruFields) iruFields.style.display = 'none';
                        populateField('costs.cable.mrc', cableCost.mrc, true);
                        populateField('costs.cable.nrc', cableCost.nrc, true);
                    }

                    // Contract period
                    populateField('costs.cable.startDate', cableCost.startDate);
                    populateField('costs.cable.termMonths', cableCost.termMonths || 12, true);
                    populateField('costs.cable.endDate', cableCost.endDate);


                    context.calculateSalesFinancials();
                };

                if (hasCableCost) {
                    const addCableBtn = document.querySelector('.cost-toggle-btn[data-cost-type="cable"]');
                    const existingCableCard = document.querySelector('.cost-card[data-cost-type="cable"]');

                    if (existingCableCard) {
                        // Card already exists (e.g., auto-created for Resale), just hydrate it
                        setTimeout(hydrateCableCard, 50);
                    } else if (addCableBtn) {
                        // Need to create the card first, then hydrate
                        addCableBtn.click();
                        setTimeout(hydrateCableCard, 150);
                    }
                }

                // ===== Backhaul A-End Card =====
                const bhAMrc = bhA.mrc || bhA.monthly || 0;
                const bhANrc = bhA.nrc || 0;
                const hasBhA = bhAMrc > 0 || bhANrc > 0 || bhA.supplier || bhA.otc > 0;

                const hydrateBhACard = () => {
                    const card = document.querySelector('.cost-card[data-cost-type="backhaulA"]');
                    if (!card) return;

                    const supplierContainer = card.querySelector('.searchable-dropdown');
                    populateSearchableDropdown(supplierContainer, bhA.supplier);
                    populateCardField('[data-field="costs.backhaulA.orderNo"]', bhA.orderNo);

                    const bhAModelSelect = card.querySelector('.bh-a-cost-model-select');
                    if (bhAModelSelect && bhA.model) {
                        bhAModelSelect.value = bhA.model;
                        const leaseFields = card.querySelector('.bh-a-lease-fields');
                        const iruFields = card.querySelector('.bh-a-iru-fields');
                        if (bhA.model === 'IRU') {
                            if (leaseFields) leaseFields.style.display = 'none';
                            if (iruFields) iruFields.style.display = 'block';
                        }
                    }

                    populateCardField('[data-field="costs.backhaul.aEnd.monthly"]', bhAMrc, true);
                    populateCardField('[data-field="costs.backhaul.aEnd.nrc"]', bhANrc, true);
                    populateCardField('[data-field="costs.backhaulA.otc"]', bhA.otc, true);
                    populateCardField('[data-field="costs.backhaulA.omRate"]', bhA.omRate, true);
                    populateCardField('[data-field="costs.backhaulA.annualOm"]', bhA.annualOm, true);
                    populateCardField('[data-field="costs.backhaulA.startDate"]', bhA.startDate);
                    populateCardField('[data-field="costs.backhaulA.termMonths"]', bhA.termMonths || 12, true);
                    populateCardField('[data-field="costs.backhaulA.endDate"]', bhA.endDate);
                    populateCardField('[data-field="costs.backhaulA.notes"]', bhA.notes);

                    context.calculateSalesFinancials();
                };

                if (hasBhA) {
                    const addBtn = document.querySelector('.cost-toggle-btn[data-cost-type="backhaulA"]');
                    const existingCard = document.querySelector('.cost-card[data-cost-type="backhaulA"]');

                    if (existingCard) {
                        setTimeout(hydrateBhACard, 50);
                    } else if (addBtn) {
                        addBtn.click();
                        setTimeout(hydrateBhACard, 150);
                    }
                }

                // ===== Backhaul Z-End Card =====
                const bhZMrc = bhZ.mrc || bhZ.monthly || 0;
                const bhZNrc = bhZ.nrc || 0;
                const hasBhZ = bhZMrc > 0 || bhZNrc > 0 || bhZ.supplier || bhZ.otc > 0;

                const hydrateBhZCard = () => {
                    const card = document.querySelector('.cost-card[data-cost-type="backhaulZ"]');
                    if (!card) return;

                    const supplierContainer = card.querySelector('.searchable-dropdown');
                    populateSearchableDropdown(supplierContainer, bhZ.supplier);
                    populateCardField('[data-field="costs.backhaulZ.orderNo"]', bhZ.orderNo);

                    const bhZModelSelect = card.querySelector('.bh-z-cost-model-select');
                    if (bhZModelSelect && bhZ.model) {
                        bhZModelSelect.value = bhZ.model;
                        const leaseFields = card.querySelector('.bh-z-lease-fields');
                        const iruFields = card.querySelector('.bh-z-iru-fields');
                        if (bhZ.model === 'IRU') {
                            if (leaseFields) leaseFields.style.display = 'none';
                            if (iruFields) iruFields.style.display = 'block';
                        }
                    }

                    populateCardField('[data-field="costs.backhaul.zEnd.monthly"]', bhZMrc, true);
                    populateCardField('[data-field="costs.backhaul.zEnd.nrc"]', bhZNrc, true);
                    populateCardField('[data-field="costs.backhaulZ.otc"]', bhZ.otc, true);
                    populateCardField('[data-field="costs.backhaulZ.omRate"]', bhZ.omRate, true);
                    populateCardField('[data-field="costs.backhaulZ.annualOm"]', bhZ.annualOm, true);
                    populateCardField('[data-field="costs.backhaulZ.startDate"]', bhZ.startDate);
                    populateCardField('[data-field="costs.backhaulZ.termMonths"]', bhZ.termMonths || 12, true);
                    populateCardField('[data-field="costs.backhaulZ.endDate"]', bhZ.endDate);
                    populateCardField('[data-field="costs.backhaulZ.notes"]', bhZ.notes);

                    context.calculateSalesFinancials();
                };

                if (hasBhZ) {
                    const addBtn = document.querySelector('.cost-toggle-btn[data-cost-type="backhaulZ"]');
                    const existingCard = document.querySelector('.cost-card[data-cost-type="backhaulZ"]');

                    if (existingCard) {
                        setTimeout(hydrateBhZCard, 50);
                    } else if (addBtn) {
                        addBtn.click();
                        setTimeout(hydrateBhZCard, 200);
                    }
                }

                // ===== Cross-Connect A-End Card =====
                const xcAMrc = xcA.mrc || xcA.monthly || 0;
                const xcANrc = xcA.nrc || 0;
                const hasXcA = xcAMrc > 0 || xcANrc > 0 || xcA.supplier;

                const hydrateXcACard = () => {
                    const card = document.querySelector('.cost-card[data-cost-type="xcA"]');
                    if (!card) return;

                    const supplierContainer = card.querySelector('.searchable-dropdown');
                    populateSearchableDropdown(supplierContainer, xcA.supplier);
                    populateCardField('[data-field="costs.xcA.orderNo"]', xcA.orderNo);
                    populateCardField('[data-field="costs.crossConnect.aEnd.monthly"]', xcAMrc, true);
                    populateCardField('[data-field="costs.crossConnect.aEnd.nrc"]', xcANrc, true);
                    populateCardField('[data-field="costs.xcA.startDate"]', xcA.startDate);
                    populateCardField('[data-field="costs.xcA.termMonths"]', xcA.termMonths || 12, true);
                    populateCardField('[data-field="costs.xcA.endDate"]', xcA.endDate);
                    populateCardField('[data-field="costs.xcA.notes"]', xcA.notes);

                    context.calculateSalesFinancials();
                };

                if (hasXcA) {
                    const addBtn = document.querySelector('.cost-toggle-btn[data-cost-type="xcA"]');
                    const existingCard = document.querySelector('.cost-card[data-cost-type="xcA"]');

                    if (existingCard) {
                        setTimeout(hydrateXcACard, 50);
                    } else if (addBtn) {
                        addBtn.click();
                        setTimeout(hydrateXcACard, 250);
                    }
                }

                // ===== Cross-Connect Z-End Card =====
                const xcZMrc = xcZ.mrc || xcZ.monthly || 0;
                const xcZNrc = xcZ.nrc || 0;
                const hasXcZ = xcZMrc > 0 || xcZNrc > 0 || xcZ.supplier;

                const hydrateXcZCard = () => {
                    const card = document.querySelector('.cost-card[data-cost-type="xcZ"]');
                    if (!card) return;

                    const supplierContainer = card.querySelector('.searchable-dropdown');
                    populateSearchableDropdown(supplierContainer, xcZ.supplier);
                    populateCardField('[data-field="costs.xcZ.orderNo"]', xcZ.orderNo);
                    populateCardField('[data-field="costs.crossConnect.zEnd.monthly"]', xcZMrc, true);
                    populateCardField('[data-field="costs.crossConnect.zEnd.nrc"]', xcZNrc, true);
                    populateCardField('[data-field="costs.xcZ.startDate"]', xcZ.startDate);
                    populateCardField('[data-field="costs.xcZ.termMonths"]', xcZ.termMonths || 12, true);
                    populateCardField('[data-field="costs.xcZ.endDate"]', xcZ.endDate);
                    populateCardField('[data-field="costs.xcZ.notes"]', xcZ.notes);

                    context.calculateSalesFinancials();
                };

                if (hasXcZ) {
                    const addBtn = document.querySelector('.cost-toggle-btn[data-cost-type="xcZ"]');
                    const existingCard = document.querySelector('.cost-card[data-cost-type="xcZ"]');

                    if (existingCard) {
                        setTimeout(hydrateXcZCard, 50);
                    } else if (addBtn) {
                        addBtn.click();
                        setTimeout(hydrateXcZCard, 300);
                    }
                }

                // ===== Other Costs Card =====
                const hasOtherCosts = otherCosts.monthly > 0 || otherCosts.oneOff > 0 || otherCosts.description || otherCosts.supplier;

                const hydrateOtherCostsCard = () => {
                    const card = document.querySelector('.cost-card[data-cost-type="other"]');
                    if (!card) return;

                    populateCardField('[data-field="costs.otherCosts.description"]', otherCosts.description);
                    populateCardField('[data-field="costs.otherCosts.oneOff"]', otherCosts.oneOff, true);
                    populateCardField('[data-field="costs.otherCosts.monthly"]', otherCosts.monthly, true);
                    const supplierContainer = card.querySelector('.searchable-dropdown');
                    populateSearchableDropdown(supplierContainer, otherCosts.supplier);

                    context.calculateSalesFinancials();
                };

                if (hasOtherCosts) {
                    const addBtn = document.querySelector('.cost-add-btn[data-cost-type="other"]');
                    const existingCard = document.querySelector('.cost-card[data-cost-type="other"]');

                    if (existingCard) {
                        setTimeout(hydrateOtherCostsCard, 50);
                    } else if (addBtn) {
                        addBtn.click();
                        setTimeout(hydrateOtherCostsCard, 150);
                    }
                }
            }, 100);
        };

        context.__enableEditCosts = enableCostEditing;

        const editCostsBtn = document.getElementById('btn-edit-costs');
        if (editCostsBtn) {
            editCostsBtn.addEventListener('click', (event) => {
                event.preventDefault();
                enableCostEditing();
            });
        } else if (context.modalContainer) {
            if (context._editCostsDelegateHandler) {
                context.modalContainer.removeEventListener('click', context._editCostsDelegateHandler);
            }
            context._editCostsDelegateHandler = (event) => {
                const target = event.target.closest('#btn-edit-costs');
                if (!target) return;
                event.preventDefault();
                enableCostEditing();
            };
            context.modalContainer.addEventListener('click', context._editCostsDelegateHandler);
        }
    }
}

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

    // Get cost info for renewal section
    const costs = order.costs || {};
    const cableCost = costs.cable || {};
    const hasCableCost = cableCost.mrc > 0 || cableCost.otc > 0 || cableCost.annualOm > 0;
    const isIruCable = cableCost.model === 'IRU';
    const backhaulA = costs.backhaul?.aEnd || {};
    const backhaulZ = costs.backhaul?.zEnd || {};
    const hasBackhaulA = backhaulA.monthly > 0 || backhaulA.nrc > 0;
    const hasBackhaulZ = backhaulZ.monthly > 0 || backhaulZ.nrc > 0;
    const xcA = costs.crossConnect?.aEnd || {};
    const xcZ = costs.crossConnect?.zEnd || {};
    const hasXcA = xcA.monthly > 0 || xcA.nrc > 0;
    const hasXcZ = xcZ.monthly > 0 || xcZ.nrc > 0;
    const otherCosts = costs.otherCosts || {};
    const hasOther = otherCosts.monthly > 0 || otherCosts.oneOff > 0;
    const hasAnyCost = hasCableCost || hasBackhaulA || hasBackhaulZ || hasXcA || hasXcZ || hasOther;

    // Helper for cost renewal card
    const costCard = (id, title, icon, fields) => `
        <div class="cost-renew-card" style="background: var(--bg-card); border-radius: 8px; padding: 0.75rem; margin-bottom: 0.75rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;">
                <ion-icon name="${icon}" style="font-size: 1rem; color: var(--accent-info);"></ion-icon>
                <span style="font-weight: 500; font-size: 0.85rem;">${title}</span>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                ${fields}
            </div>
        </div>
    `;

    // Build cost renewal section HTML
    let costRenewalHTML = '';
    if (hasAnyCost) {
        let costCards = '';

        if (hasCableCost) {
            if (isIruCable) {
                // IRU Cable - only show Annual O&M renewal
                costCards += costCard('cable', '🔌 Cable (IRU)', 'flash-outline', `
                    <div class="form-group" style="margin-bottom: 0;">
                        <label style="font-size: 0.7rem; color: var(--text-muted);">Annual O&M ($)</label>
                        <input type="number" class="form-control" id="renew-cable-om" value="${cableCost.annualOm || 0}" min="0" step="0.01" style="font-size: 0.85rem; padding: 0.4rem;">
                        <small style="color: var(--text-muted);">原: $${(cableCost.annualOm || 0).toLocaleString()}</small>
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                        <label style="font-size: 0.7rem; color: var(--text-muted);">O&M Rate (%)</label>
                        <input type="number" class="form-control" id="renew-cable-om-rate" value="${cableCost.omRate || 0}" min="0" step="0.1" style="font-size: 0.85rem; padding: 0.4rem;">
                    </div>
                `);
            } else {
                // Lease Cable - show MRC/NRC renewal
                costCards += costCard('cable', '🔌 Cable (Lease)', 'flash-outline', `
                    <div class="form-group" style="margin-bottom: 0;">
                        <label style="font-size: 0.7rem; color: var(--text-muted);">MRC ($)</label>
                        <input type="number" class="form-control" id="renew-cable-mrc" value="${cableCost.mrc || 0}" min="0" step="0.01" style="font-size: 0.85rem; padding: 0.4rem;">
                        <small style="color: var(--text-muted);">原: $${(cableCost.mrc || 0).toLocaleString()}</small>
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                        <label style="font-size: 0.7rem; color: var(--text-muted);">NRC ($)</label>
                        <input type="number" class="form-control" id="renew-cable-nrc" value="${cableCost.nrc || 0}" min="0" step="0.01" style="font-size: 0.85rem; padding: 0.4rem;">
                    </div>
                `);
            }
        }

        if (hasBackhaulA) {
            costCards += costCard('bh-a', '📡 Backhaul A-End', 'radio-outline', `
                <div class="form-group" style="margin-bottom: 0;">
                    <label style="font-size: 0.7rem; color: var(--text-muted);">Monthly ($)</label>
                    <input type="number" class="form-control" id="renew-bh-a-mrc" value="${backhaulA.monthly || 0}" min="0" step="0.01" style="font-size: 0.85rem; padding: 0.4rem;">
                    <small style="color: var(--text-muted);">原: $${(backhaulA.monthly || 0).toLocaleString()}</small>
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                    <label style="font-size: 0.7rem; color: var(--text-muted);">NRC ($)</label>
                    <input type="number" class="form-control" id="renew-bh-a-nrc" value="${backhaulA.nrc || 0}" min="0" step="0.01" style="font-size: 0.85rem; padding: 0.4rem;">
                </div>
            `);
        }

        if (hasBackhaulZ) {
            costCards += costCard('bh-z', '📡 Backhaul Z-End', 'radio-outline', `
                <div class="form-group" style="margin-bottom: 0;">
                    <label style="font-size: 0.7rem; color: var(--text-muted);">Monthly ($)</label>
                    <input type="number" class="form-control" id="renew-bh-z-mrc" value="${backhaulZ.monthly || 0}" min="0" step="0.01" style="font-size: 0.85rem; padding: 0.4rem;">
                    <small style="color: var(--text-muted);">原: $${(backhaulZ.monthly || 0).toLocaleString()}</small>
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                    <label style="font-size: 0.7rem; color: var(--text-muted);">NRC ($)</label>
                    <input type="number" class="form-control" id="renew-bh-z-nrc" value="${backhaulZ.nrc || 0}" min="0" step="0.01" style="font-size: 0.85rem; padding: 0.4rem;">
                </div>
            `);
        }

        if (hasXcA) {
            costCards += costCard('xc-a', '🔗 Cross-Connect A', 'link-outline', `
                <div class="form-group" style="margin-bottom: 0;">
                    <label style="font-size: 0.7rem; color: var(--text-muted);">Monthly ($)</label>
                    <input type="number" class="form-control" id="renew-xc-a-mrc" value="${xcA.monthly || 0}" min="0" step="0.01" style="font-size: 0.85rem; padding: 0.4rem;">
                    <small style="color: var(--text-muted);">原: $${(xcA.monthly || 0).toLocaleString()}</small>
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                    <label style="font-size: 0.7rem; color: var(--text-muted);">NRC ($)</label>
                    <input type="number" class="form-control" id="renew-xc-a-nrc" value="${xcA.nrc || 0}" min="0" step="0.01" style="font-size: 0.85rem; padding: 0.4rem;">
                </div>
            `);
        }

        if (hasXcZ) {
            costCards += costCard('xc-z', '🔗 Cross-Connect Z', 'link-outline', `
                <div class="form-group" style="margin-bottom: 0;">
                    <label style="font-size: 0.7rem; color: var(--text-muted);">Monthly ($)</label>
                    <input type="number" class="form-control" id="renew-xc-z-mrc" value="${xcZ.monthly || 0}" min="0" step="0.01" style="font-size: 0.85rem; padding: 0.4rem;">
                    <small style="color: var(--text-muted);">原: $${(xcZ.monthly || 0).toLocaleString()}</small>
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                    <label style="font-size: 0.7rem; color: var(--text-muted);">NRC ($)</label>
                    <input type="number" class="form-control" id="renew-xc-z-nrc" value="${xcZ.nrc || 0}" min="0" step="0.01" style="font-size: 0.85rem; padding: 0.4rem;">
                </div>
            `);
        }

        if (hasOther) {
            costCards += costCard('other', '💰 Other Costs', 'wallet-outline', `
                <div class="form-group" style="margin-bottom: 0;">
                    <label style="font-size: 0.7rem; color: var(--text-muted);">Monthly ($)</label>
                    <input type="number" class="form-control" id="renew-other-mrc" value="${otherCosts.monthly || 0}" min="0" step="0.01" style="font-size: 0.85rem; padding: 0.4rem;">
                    <small style="color: var(--text-muted);">原: $${(otherCosts.monthly || 0).toLocaleString()}</small>
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                    <label style="font-size: 0.7rem; color: var(--text-muted);">One-off ($)</label>
                    <input type="number" class="form-control" id="renew-other-nrc" value="${otherCosts.oneOff || 0}" min="0" step="0.01" style="font-size: 0.85rem; padding: 0.4rem;">
                </div>
            `);
        }

        costRenewalHTML = `
            <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(16, 185, 129, 0.02)); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 12px; margin-bottom: 1rem; overflow: hidden;">
                <div id="cost-renew-header" style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; cursor: pointer; user-select: none;">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <ion-icon name="cash-outline" style="font-size: 1.1rem; color: var(--accent-success);"></ion-icon>
                        <span style="font-weight: 500; color: var(--text-primary);">成本同步续约</span>
                        <span style="font-size: 0.75rem; color: var(--text-muted);">(可选)</span>
                    </div>
                    <ion-icon name="chevron-down-outline" id="cost-renew-chevron" style="font-size: 1rem; color: var(--text-muted); transition: transform 0.2s;"></ion-icon>
                </div>
                <div id="cost-renew-body" style="display: none; padding: 0 1rem 1rem 1rem;">
                    <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.75rem; padding: 0.5rem; background: var(--bg-secondary); border-radius: 6px;">
                        💡 展开此面板可同时更新成本金额。成本合同日期将自动与销售合同同步。
                    </div>
                    ${costCards}
                </div>
            </div>
        `;
    }

    const modalContent = `
        <div style="max-width: 450px; margin: 0 auto;">
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
            
            <!-- 成本续约区域 (可折叠) -->
            ${costRenewalHTML}
            
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
        const newStatus = computeSalesStatus(startDate, endDate);

        // Start with base updated data
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

        // Collect cost changes
        const costChanges = [];

        // Check if cost renewal panel was expanded (user interacted with costs)
        const costRenewBody = document.getElementById('cost-renew-body');
        const costsWereEdited = costRenewBody && costRenewBody.style.display !== 'none';

        if (costsWereEdited && hasAnyCost) {
            // Initialize costs structure
            updatedData.costs = { ...order.costs };

            // Cable costs
            if (hasCableCost) {
                updatedData.costs.cable = { ...order.costs.cable };
                // Update contract dates to match sales dates
                updatedData.costs.cable.startDate = startDate;
                updatedData.costs.cable.termMonths = term;
                updatedData.costs.cable.endDate = endDate;

                if (isIruCable) {
                    const newOm = parseFloat(document.getElementById('renew-cable-om')?.value) || 0;
                    const newOmRate = parseFloat(document.getElementById('renew-cable-om-rate')?.value) || 0;
                    if (newOm !== (cableCost.annualOm || 0)) {
                        costChanges.push(`Cable O&M: $${cableCost.annualOm || 0} → $${newOm}`);
                    }
                    updatedData.costs.cable.annualOm = newOm;
                    updatedData.costs.cable.omRate = newOmRate;
                } else {
                    const newCableMrc = parseFloat(document.getElementById('renew-cable-mrc')?.value) || 0;
                    const newCableNrc = parseFloat(document.getElementById('renew-cable-nrc')?.value) || 0;
                    if (newCableMrc !== (cableCost.mrc || 0)) {
                        costChanges.push(`Cable MRC: $${cableCost.mrc || 0} → $${newCableMrc}`);
                    }
                    updatedData.costs.cable.mrc = newCableMrc;
                    updatedData.costs.cable.nrc = newCableNrc;
                }
            }

            // Backhaul A-End
            if (hasBackhaulA) {
                const newBhAMrc = parseFloat(document.getElementById('renew-bh-a-mrc')?.value) || 0;
                const newBhANrc = parseFloat(document.getElementById('renew-bh-a-nrc')?.value) || 0;
                if (newBhAMrc !== (backhaulA.monthly || 0)) {
                    costChanges.push(`BH-A: $${backhaulA.monthly || 0} → $${newBhAMrc}`);
                }
                updatedData.costs.backhaul = {
                    ...order.costs.backhaul,
                    aEnd: { monthly: newBhAMrc, nrc: newBhANrc }
                };
            }

            // Backhaul Z-End
            if (hasBackhaulZ) {
                const newBhZMrc = parseFloat(document.getElementById('renew-bh-z-mrc')?.value) || 0;
                const newBhZNrc = parseFloat(document.getElementById('renew-bh-z-nrc')?.value) || 0;
                if (newBhZMrc !== (backhaulZ.monthly || 0)) {
                    costChanges.push(`BH-Z: $${backhaulZ.monthly || 0} → $${newBhZMrc}`);
                }
                updatedData.costs.backhaul = {
                    ...updatedData.costs.backhaul,
                    zEnd: { monthly: newBhZMrc, nrc: newBhZNrc }
                };
            }

            // Cross-Connect A
            if (hasXcA) {
                const newXcAMrc = parseFloat(document.getElementById('renew-xc-a-mrc')?.value) || 0;
                const newXcANrc = parseFloat(document.getElementById('renew-xc-a-nrc')?.value) || 0;
                if (newXcAMrc !== (xcA.monthly || 0)) {
                    costChanges.push(`XC-A: $${xcA.monthly || 0} → $${newXcAMrc}`);
                }
                updatedData.costs.crossConnect = {
                    ...order.costs.crossConnect,
                    aEnd: { monthly: newXcAMrc, nrc: newXcANrc }
                };
            }

            // Cross-Connect Z
            if (hasXcZ) {
                const newXcZMrc = parseFloat(document.getElementById('renew-xc-z-mrc')?.value) || 0;
                const newXcZNrc = parseFloat(document.getElementById('renew-xc-z-nrc')?.value) || 0;
                if (newXcZMrc !== (xcZ.monthly || 0)) {
                    costChanges.push(`XC-Z: $${xcZ.monthly || 0} → $${newXcZMrc}`);
                }
                updatedData.costs.crossConnect = {
                    ...updatedData.costs.crossConnect,
                    zEnd: { monthly: newXcZMrc, nrc: newXcZNrc }
                };
            }

            // Other Costs
            if (hasOther) {
                const newOtherMrc = parseFloat(document.getElementById('renew-other-mrc')?.value) || 0;
                const newOtherNrc = parseFloat(document.getElementById('renew-other-nrc')?.value) || 0;
                if (newOtherMrc !== (otherCosts.monthly || 0)) {
                    costChanges.push(`Other: $${otherCosts.monthly || 0} → $${newOtherMrc}`);
                }
                updatedData.costs.otherCosts = {
                    ...order.costs.otherCosts,
                    monthly: newOtherMrc,
                    oneOff: newOtherNrc
                };
            }
        }

        await window.Store.updateSalesOrder(salesOrderId, updatedData);

        // Build success message
        let priceChangeMsg = '';
        if (newMRC !== currentMRC) {
            priceChangeMsg += ` MRC: $${currentMRC} → $${newMRC}`;
        }
        if (newNRC !== currentNRC) {
            priceChangeMsg += ` NRC: $${currentNRC} → $${newNRC}`;
        }

        let costChangeMsg = '';
        if (costChanges.length > 0) {
            costChangeMsg = ` | 成本更新: ${costChanges.join(', ')}`;
        }

        context.showToast ? context.showToast(`订单 ${salesOrderId} 续约成功！${priceChangeMsg ? '价格已更新:' + priceChangeMsg : ''}${costChangeMsg}`) : null;

        context.renderView('sales');
        return true;
    }, false);

    // Attach event listeners for auto-calculating end date and cost panel toggle
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

        // Cost panel toggle
        const costHeader = document.getElementById('cost-renew-header');
        const costBody = document.getElementById('cost-renew-body');
        const costChevron = document.getElementById('cost-renew-chevron');

        if (costHeader && costBody) {
            costHeader.addEventListener('click', () => {
                const isExpanded = costBody.style.display !== 'none';
                costBody.style.display = isExpanded ? 'none' : 'block';
                if (costChevron) {
                    costChevron.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(180deg)';
                }
            });
        }
    }, 100);
}
