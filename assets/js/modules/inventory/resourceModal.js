/**
 * Inventory create/edit modal rendering and submit logic.
 */

import { initInventoryFormDropdowns } from './formDropdowns.js';
import { setupInventoryBatchEditor } from './batchEditor.js';
import { resolveSupplierName } from './supplierUtils.js';
import {
    buildInventoryPayloadFromForm,
    buildInventoryBatchesFromForm,
    validateInventoryBatchCapacity
} from './resourceModalPayload.js';

const { escapeHtml } = window.DomUtils;

const {
    buildSalesIndex,
    computeInventoryStatus
} = window.InventoryStatus;

function setFormError(message = '') {
    const errorEl = document.getElementById('inventory-form-error');
    if (!errorEl) return;

    if (!message) {
        errorEl.style.display = 'none';
        errorEl.textContent = '';
        return;
    }

    errorEl.style.display = 'block';
    errorEl.textContent = message;
}

function buildDefaultInventoryItem() {
    return {
        resourceId: '',
        status: 'Draft',
        acquisition: {
            type: 'Purchased',
            ownership: 'Leased',
            supplierId: '',
            supplierName: '',
            contractRef: ''
        },
        cableSystem: '',
        segmentType: 'E2E',
        handoffType: 'OTU-4',
        routeDescription: '',
        protection: 'Unprotected',
        protectionCableSystem: '',
        capacity: {
            value: 0,
            unit: 'Gbps'
        },
        location: {
            aEnd: { country: '', city: '', pop: '', port: '', device: '' },
            zEnd: { country: '', city: '', pop: '', port: '', device: '' }
        },
        financials: {
            mrc: 0,
            nrc: 0,
            otc: 0,
            term: 12,
            omRate: 0,
            annualOmCost: 0
        },
        costMode: 'single',
        baseCost: {
            orderId: '',
            model: 'IRU',
            mrc: 0,
            otc: 0,
            omRate: 0,
            annualOm: 0,
            termMonths: 0
        },
        batches: [],
        dates: {
            start: '',
            end: ''
        },
        usage: {
            currentUser: '',
            orderLink: ''
        }
    };
}

export function openInventoryFormModal(context, resourceId = null) {
    const sourceItem = resourceId
        ? window.Store.getInventory().find((item) => item.resourceId === resourceId)
        : null;
    const defaults = buildDefaultInventoryItem();
    const isEdit = Boolean(sourceItem);
    const item = {
        ...defaults,
        ...(sourceItem || {}),
        acquisition: {
            ...defaults.acquisition,
            ...(sourceItem?.acquisition || {})
        },
        capacity: {
            ...defaults.capacity,
            ...(sourceItem?.capacity || {})
        },
        location: {
            aEnd: {
                ...defaults.location.aEnd,
                ...(sourceItem?.location?.aEnd || {})
            },
            zEnd: {
                ...defaults.location.zEnd,
                ...(sourceItem?.location?.zEnd || {})
            }
        },
        financials: {
            ...defaults.financials,
            ...(sourceItem?.financials || {})
        },
        baseCost: {
            ...defaults.baseCost,
            ...(sourceItem?.baseCost || {})
        },
        dates: {
            ...defaults.dates,
            ...(sourceItem?.dates || {})
        },
        usage: {
            ...defaults.usage,
            ...(sourceItem?.usage || {})
        },
        batches: Array.isArray(sourceItem?.batches) ? sourceItem.batches : []
    };

    let calculatedStatus = item.status || 'Draft';
    if (item.resourceId) {
        const { soldByResourceId } = buildSalesIndex(window.Store.getSales());
        const totalSoldCapacity = soldByResourceId.get(item.resourceId) || 0;
        const now = new Date();
        calculatedStatus = computeInventoryStatus(item, totalSoldCapacity, now).calculatedStatus;
    }

    // Generate supplier options for searchable dropdown
    const suppliers = window.Store.getSuppliers();
    const supplierOptions = suppliers.map(s => ({
        value: s.id,
        label: s.short_name,
        subtitle: s.full_name || ''
    }));
    const existingSupplier = item.acquisition?.supplierId || '';


    const isBatchMode = item.costMode === 'batches';
    const capacityLabel = isBatchMode ? 'Base Capacity (Total, Unlit)' : 'Capacity Value';
    const capacityHelp = isBatchMode ? 'Batches represent lit capacity drawn from this total.' : '';

    const formHTML = `
        ${item.usage?.currentUser ? `
        <!-- Usage Information -->
        <div class="mb-4 p-3" style="background: rgba(189, 39, 30, 0.1); border: 1px solid var(--accent-danger); border-radius: 8px;">
            <h4 class="mb-2" style="color: var(--accent-danger); font-size: 0.9rem;"><ion-icon name="link-outline"></ion-icon> Linked Sales</h4>
            <div style="display: flex; gap: 2rem; flex-wrap: wrap;">
                <div>
                    <span style="color: var(--text-muted); font-size: 0.85rem;">Customer:</span>
                    <div style="font-weight: 600; font-size: 1.1rem;">${escapeHtml(item.usage.currentUser)}</div>
                </div>
                <div>
                    <span style="color: var(--text-muted); font-size: 0.85rem;">Sales Order:</span>
                    <div class="font-mono" style="color: var(--accent-secondary);">${escapeHtml(item.usage.orderLink || 'N/A')}</div>
                </div>
            </div>
        </div>
        ` : ''}

        <div id="inventory-form-error" style="display:none; background: rgba(189, 39, 30, 0.1); border: 1px solid var(--accent-danger); color: var(--accent-danger); padding: 0.6rem 0.75rem; border-radius: 8px; margin-bottom: 1rem; font-size: 0.85rem;"></div>

        <!-- Stepper Navigation -->
        <div class="form-stepper" id="inventory-stepper">
            <div class="step active" data-step="1">
                <span class="step-number">1</span>
                <span class="step-label">Core Info</span>
            </div>
            <div class="step-connector"></div>
            <div class="step" data-step="2">
                <span class="step-number">2</span>
                <span class="step-label">Connectivity</span>
            </div>
            <div class="step-connector"></div>
            <div class="step" data-step="3">
                <span class="step-number">3</span>
                <span class="step-label">Financials</span>
            </div>
        </div>

        <!-- STEP 1: Core Info -->
        <div class="form-step" data-step="1" id="inventory-step-1">
            <!-- Identity -->
            <div class="form-section-header">
                <ion-icon name="finger-print-outline"></ion-icon>
                <span>Identity</span>
            </div>
                                                                                                                        <div class="grid-2">
                                                                                                                            <div class="form-group">
                                                                                                                                <label class="form-label">Resource ID</label>
                                                                                                                                <input type="text" class="form-control" name="resourceId" value="${escapeHtml(item.resourceId || '')}" ${isEdit ? 'readonly' : ''} placeholder="Auto-generated if empty">
                                                                                                                            </div>
                                                                                                                            <div class="form-group">
                                                                                                                                <label class="form-label">Status <small style="color:var(--text-muted)">(Auto-calculated)</small></label>
                                                                                                                                <div id="inventory-status-dropdown-placeholder" data-selected="${escapeHtml(calculatedStatus)}"></div>
                                                                                                                            </div>
                                                                                                                        </div>

                                                                                                                        <!--Acquisition -->
            <div class="form-section-header">
                <ion-icon name="cart-outline"></ion-icon>
                <span>Acquisition</span>
            </div>
                                                                                                                        <div class="grid-3">
                                                                                                                            <div class="form-group">
                                                                                                                                <label class="form-label">Acquisition Type</label>
                                                                                                                                <div id="inventory-acquisition-type-dropdown-placeholder" data-selected="${escapeHtml(item.acquisition?.type || 'Purchased')}"></div>
                                                                                                                            </div>
                                                                                                                            <div class="form-group">
                                                                                                                                <label class="form-label">Ownership</label>
                                                                                                                                <div id="inventory-ownership-dropdown-placeholder" data-selected="${escapeHtml(item.acquisition?.ownership || 'Leased')}"></div>
                                                                                                                            </div>
                                                                                                                            <div class="form-group">
                                                                                                                                <label class="form-label">Supplier</label>
                                                                                                                                <div id="inventory-supplier-dropdown-placeholder"></div>
                                                                                                                            </div>
                                                                                                                        </div>
                                                                                                                        <div class="grid-3">
                                                                                                                            <div class="form-group">
                                                                                                                                <label class="form-label">Contract Ref</label>
                                                                                                                                <input type="text" class="form-control" name="acquisition.contractRef" value="${escapeHtml(item.acquisition?.contractRef || '')}">
                                                                                                                            </div>
                                                                                                                            <div class="form-group">
                                                                                                                                <label class="form-label">Cost Mode</label>
                                                                                                                                <div id="inventory-cost-mode-dropdown-placeholder" data-selected="${escapeHtml(item.costMode || 'single')}"></div>
                                                                                                                                <small style="color:var(--text-muted)">Batches = capacity below is base pool</small>
                                                                                                                            </div>
                                                                                                                        </div>

                                                                                                                        <!-- Technical Specs -->
            <div class="form-section-header">
                <ion-icon name="settings-outline"></ion-icon>
                <span>Technical Specs</span>
            </div>
                                                                                                                        <div class="grid-2">
                                                                                                                            <div class="form-group">
                                                                                                                                <label class="form-label">Cable System</label>
                                                                                                                                <input type="text" class="form-control" name="cableSystem" value="${escapeHtml(item.cableSystem || '')}">
                                                                                                                            </div>
                                                                                                                            <div class="form-group">
                                                                                                                                <label class="form-label">Segment Type</label>
                                                                                                                                <div id="inventory-segment-type-dropdown-placeholder" data-selected="${escapeHtml(item.segmentType || 'Capacity')}"></div>
                                                                                                                            </div>
                                                                                                                        </div>
                                                                                                                        <div class="grid-2">
                                                                                                                            <div class="form-group">
                                                                                                                                <label class="form-label">Handoff Type</label>
                                                                                                                                <div id="inventory-handoff-type-dropdown-placeholder" data-selected="${escapeHtml(item.handoffType || 'OTU-4')}"></div>
                                                                                                                            </div>
                                                                                                                            <div class="form-group" id="handoff-type-custom-container" style="display: ${item.handoffType && !['OTU-4', '100GE', '400GE'].includes(item.handoffType) ? 'block' : 'none'}">
                                                                                                                                <label class="form-label">Custom Handoff Type</label>
                                                                                                                                <input type="text" class="form-control" name="handoffTypeCustom" id="handoff-type-custom" value="${escapeHtml(item.handoffType && !['OTU-4', '100GE', '400GE'].includes(item.handoffType) ? item.handoffType : '')}" placeholder="Enter custom handoff type">
                                                                                                                            </div>
                                                                                                                        </div>
                                                                                                                        <div class="grid-1">
                                                                                                                            <div class="form-group">
                                                                                                                               <label class="form-label">Route Description</label>
                                                                                                                                <textarea class="form-control" name="routeDescription" rows="3" placeholder="Describe the cable routing path...">${escapeHtml(item.routeDescription || '')}</textarea>
                                                                                                                            </div>
                                                                                                                        </div>
                                                                                                                        <div class="grid-3">
                                                                                                                            <div class="form-group">
                                                                                                                                <label class="form-label" id="inventory-capacity-label">${capacityLabel}</label>
                                                                                                                                <input type="number" class="form-control" name="capacity.value" value="${item.capacity?.value || 0}">
                                                                                                                                <div id="inventory-capacity-help" style="font-size: 0.7rem; color: var(--text-muted); margin-top: 0.35rem; ${capacityHelp ? '' : 'display:none;'}">${capacityHelp}</div>
                                                                                                                            </div>
                                                                                                                            <div class="form-group">
                                                                                                                               <label class="form-label">Unit</label>
                                                                                                                                <div id="inventory-capacity-unit-dropdown-placeholder" data-selected="${escapeHtml(item.capacity?.unit || 'Gbps')}"></div>
                                                                                                                            </div>
                                                                                                                            <div class="form-group">
                                                                                                                                <label class="form-label">Protection</label>
                                                                                                                                <div id="inventory-protection-dropdown-placeholder" data-selected="${escapeHtml(item.protection || 'Unprotected')}"></div>
                                                                                                                            </div>
                                                                                                                        </div>
                                                                                                                        <div class="grid-1" id="protection-cable-container" style="display: ${item.protection === 'Protected' ? 'block' : 'none'}">
                                                                                                                            <div class="form-group">
                                                                                                                                <label class="form-label">Protection Cable System</label>
                                                                                                                                <input type="text" class="form-control" name="protectionCableSystem" value="${escapeHtml(item.protectionCableSystem || '')}" placeholder="Specify the cable system used for protection">
                                                                                                                            </div>
                                                                                                                        </div>

            <!-- Step 1 Navigation -->
            <div class="form-step-nav">
                <div></div>
                <button type="button" class="btn btn-primary" id="step-next-1">Next: Connectivity <ion-icon name="arrow-forward-outline"></ion-icon></button>
            </div>
        </div>

        <!-- STEP 2: Connectivity -->
        <div class="form-step" data-step="2" id="inventory-step-2" style="display:none;">
            <div class="form-section-header">
                <ion-icon name="git-network-outline"></ion-icon>
                <span>Location Endpoints</span>
            </div>
            
            <div class="grid-2">
                                                                                                                            <div style="background:rgba(255,255,255,0.02); padding:1rem; border-radius:4px;">
                                                                                                                                <h5 class="mb-2" style="color:var(--accent-primary)">A-End</h5>
                                                                                                                                <div class="form-group"><label class="form-label">Country</label><input type="text" class="form-control" name="location.aEnd.country" value="${escapeHtml(item.location?.aEnd?.country || '')}"></div>
                                                                                                                                <div class="form-group"><label class="form-label">City</label><input type="text" class="form-control" name="location.aEnd.city" value="${escapeHtml(item.location?.aEnd?.city || '')}"></div>
                                                                                                                                <div class="form-group"><label class="form-label">PoP Site</label><input type="text" class="form-control" name="location.aEnd.pop" value="${escapeHtml(item.location?.aEnd?.pop || '')}"></div>
                                                                                                                                <div class="form-group"><label class="form-label">Device</label><input type="text" class="form-control" name="location.aEnd.device" value="${escapeHtml(item.location?.aEnd?.device || '')}" placeholder="e.g., Router-01, Switch-HK"></div>
                                                                                                                                <div class="form-group"><label class="form-label">Port</label><input type="text" class="form-control" name="location.aEnd.port" value="${escapeHtml(item.location?.aEnd?.port || '')}" placeholder="e.g., Eth1/1/1"></div>
                                                                                                                            </div>
                                                                                                                            <div style="background:rgba(255,255,255,0.02); padding:1rem; border-radius:4px;">
                                                                                                                                <h5 class="mb-2" style="color:var(--accent-secondary)">Z-End</h5>
                                                                                                                                <div class="form-group"><label class="form-label">Country</label><input type="text" class="form-control" name="location.zEnd.country" value="${escapeHtml(item.location?.zEnd?.country || '')}"></div>
                                                                                                                                <div class="form-group"><label class="form-label">City</label><input type="text" class="form-control" name="location.zEnd.city" value="${escapeHtml(item.location?.zEnd?.city || '')}"></div>
                                                                                                                                <div class="form-group"><label class="form-label">PoP Site</label><input type="text" class="form-control" name="location.zEnd.pop" value="${escapeHtml(item.location?.zEnd?.pop || '')}"></div>
                                                                                                                                <div class="form-group"><label class="form-label">Device</label><input type="text" class="form-control" name="location.zEnd.device" value="${escapeHtml(item.location?.zEnd?.device || '')}" placeholder="e.g., Router-02, Switch-SG"></div>
                                                                                                                                <div class="form-group"><label class="form-label">Port</label><input type="text" class="form-control" name="location.zEnd.port" value="${escapeHtml(item.location?.zEnd?.port || '')}" placeholder="e.g., Eth1/1/2"></div>
                                                                                                                            </div>
            </div>
            
            <!-- Copy A-End to Z-End -->
            <button type="button" class="btn btn-secondary copy-location-btn" id="copy-to-zend">
                <ion-icon name="copy-outline"></ion-icon> Copy A-End → Z-End
            </button>

            <!-- Step 2 Navigation -->
            <div class="form-step-nav">
                <button type="button" class="btn btn-secondary" id="step-prev-2"><ion-icon name="arrow-back-outline"></ion-icon> Back</button>
                <button type="button" class="btn btn-primary" id="step-next-2">Next: Financials <ion-icon name="arrow-forward-outline"></ion-icon></button>
            </div>
        </div>

        <!-- STEP 3: Financials -->
        <div class="form-step" data-step="3" id="inventory-step-3" style="display:none;">

            <div class="form-section-header">
                <ion-icon name="wallet-outline"></ion-icon>
                <span>Financials</span>
            </div>
                                                                                                                        <div class="grid-2">
                                                                                                                            <div class="form-group">
                                                                                                                                <label class="form-label">Base Order ID</label>
                                                                                                                                <input type="text" class="form-control" name="baseCost.orderId" value="${escapeHtml(item.baseCost?.orderId || '')}">
                                                                                                                            </div>
                                                                                                                        </div>


                                                                                                                        <!-- Base Cost (Batch Mode) -->
                                                                                                                        <div id="inventory-base-cost-section" style="display:${item.costMode === 'batches' ? 'block' : 'none'}; background:rgba(255,255,255,0.02); padding:0.75rem; border-radius:6px; margin-bottom:1rem;">
                                                                                                                            <h5 style="color:var(--accent-secondary); margin:0 0 0.5rem 0; font-size:0.85rem;">Base Cost Pool</h5>
                                                                                                                            <div class="grid-3">
                                                                                                                                <div class="form-group">
                                                                                                                                    <label class="form-label">Base Model</label>
                                                                                                                                    <div id="inventory-base-model-dropdown-placeholder" data-selected="${escapeHtml(item.baseCost?.model || 'IRU')}"></div>
                                                                                                                                </div>
                                                                                                                               <div class="form-group" id="base-mrc-container" style="display:${item.baseCost?.model === 'Lease' ? 'block' : 'none'};">
                                                                                                                                    <label class="form-label">Base MRC ($)</label>
                                                                                                                                    <input type="number" class="form-control" name="baseCost.mrc" value="${item.baseCost?.mrc || 0}">
                                                                                                                                </div>
                                                                                                                               <div class="form-group" id="base-term-container" style="display:${item.baseCost?.model === 'IRU' ? 'block' : 'none'};">
                                                                                                                                    <label class="form-label">Base Term (Months)</label>
                                                                                                                                    <input type="number" class="form-control" name="baseCost.termMonths" value="${item.baseCost?.termMonths || 0}">
                                                                                                                                </div>
                                                                                                                            </div>
                                                                                                                            <div class="grid-2" id="base-iru-container" style="display:${item.baseCost?.model === 'IRU' ? 'grid' : 'none'};">
                                                                                                                                <div class="form-group">
                                                                                                                                    <label class="form-label">Base OTC ($)</label>
                                                                                                                                    <input type="number" class="form-control" name="baseCost.otc" value="${item.baseCost?.otc || 0}">
                                                                                                                                </div>
                                                                                                                                <div class="form-group">
                                                                                                                                    <label class="form-label">Base O&amp;M Rate (%)</label>
                                                                                                                                    <input type="number" class="form-control" id="base-om-rate-input" name="baseCost.omRate" value="${item.baseCost?.omRate || 0}" step="0.1" min="0" max="100">
                                                                                                                                </div>
                                                                                                                            </div>
                                                                                                                            <div class="grid-2" id="base-annual-om-container" style="display:${item.baseCost?.model === 'IRU' ? 'grid' : 'none'};">
                                                                                                                                <div class="form-group">
                                                                                                                                    <label class="form-label">Base Annual O&amp;M ($)</label>
                                                                                                                                    <input type="number" class="form-control" id="base-annual-om-input" name="baseCost.annualOm" value="${item.baseCost?.annualOm || 0}" readonly style="background-color: var(--bg-card-hover); cursor: not-allowed;">
                                                                                                                                </div>
                                                                                                                            </div>
                                                                                                                        </div>

                                                                                                                        <!--Financials (Single Mode) -->
                                                                                                                        <h4 class="mb-4 mt-4" id="single-financials-title" style="border-bottom:1px solid var(--border-color); padding-bottom:0.5rem; display:${item.costMode === 'batches' ? 'none' : 'block'};">Financials & Terms</h4>
                                                                                                                        <div class="grid-3" id="financials-grid" style="display:${item.costMode === 'batches' ? 'none' : 'grid'};">
                                                                                                                            <div class="form-group" id="mrc-container" style="display: ${item.acquisition?.ownership === 'IRU' ? 'none' : 'block'}">
                                                                                                                                <label class="form-label">MRC Cost ($)</label>
                                                                                                                                <input type="number" class="form-control" name="financials.mrc" value="${item.financials?.mrc || 0}">
                                                                                                                            </div>
                                                                                                                            <div class="form-group">
                                                                                                                                <label class="form-label" id="otc-label">${item.acquisition?.ownership === 'IRU' ? 'OTC ($)' : 'NRC ($)'}</label>
                                                                                                                                <input type="number" class="form-control" name="financials.otc" value="${item.acquisition?.ownership === 'IRU' ? (item.financials?.otc || 0) : (item.financials?.nrc || 0)}">
                                                                                                                            </div>
                                                                                                                            <div class="form-group">
                                                                                                                                <label class="form-label">Term (Months)</label>
                                                                                                                                <input type="number" class="form-control" id="term-input" name="financials.term" value="${item.financials?.term || 12}">
                                                                                                                            </div>
                                                                                                                        </div>
                                                                                                                        <div class="grid-1" id="om-rate-container" style="display: ${['IRU', 'Owned'].includes(item.acquisition?.ownership) ? 'block' : 'none'}">
                                                                                                                            <div class="grid-2">
                                                                                                                                <div class="form-group">
                                                                                                                                    <label class="form-label">O&M Rate (%)</label>
                                                                                                                                    <input type="number" class="form-control" id="om-rate-input" name="financials.omRate" value="${item.financials?.omRate || 0}" placeholder="e.g., 2.5 for 2.5%" step="0.1" min="0" max="100">
                                                                                                                                </div>
                                                                                                                                <div class="form-group">
                                                                                                                                    <label class="form-label">Annual O&M Cost ($)</label>
                                                                                                                                    <input type="number" class="form-control" id="annual-om-cost" name="financials.annualOmCost" value="${item.financials?.annualOmCost || 0}" readonly style="background-color: var(--bg-card-hover); cursor: not-allowed;">
                                                                                                                                </div>
                                                                                                                            </div>
                                                                                                                        </div>
                                                                                                                        <div class="grid-2 mt-4">
                                                                                                                            <div class="form-group">
                                                                                                                                <label class="form-label">Start Date</label>
                                                                                                                                <input type="date" class="form-control" id="start-date-input" name="dates.start" value="${escapeHtml(item.dates?.start || '')}">
                                                                                                                            </div>
                                                                                                                            <div class="form-group">
                                                                                                                                <label class="form-label">End Date (Auto-calculated)</label>
                                                                                                                                <input type="date" class="form-control" id="end-date-input" name="dates.end" value="${escapeHtml(item.dates?.end || '')}" readonly style="background-color: var(--bg-card-hover); cursor: not-allowed;">
                                                                                                                            </div>
                                                                                                                        </div>
                                                                                                                        <div id="inventory-batch-section" style="display:${item.costMode === 'batches' ? 'block' : 'none'}; margin-top: 1rem;">
                                                                                                                            <h4 class="mb-3" style="border-bottom:1px solid var(--border-color); padding-bottom:0.5rem;">Inventory Batches</h4>
                                                                                                                            <div id="inventory-batch-rows">
                                                                                                                                ${(item.batches || []).map(batch => `
                                                                                                                                    <div class="batch-row" data-batch-id="${escapeHtml(batch.batchId || '')}" style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 8px; padding: 0.75rem; margin-bottom: 0.75rem;">
                                                                                                                                        <div class="grid-4">
                                                                                                                                            <div class="form-group">
                                                                                                                                                <label class="form-label">Batch Order ID</label>
                                                                                                                                                <input type="text" class="form-control batch-input" data-field="orderId" value="${escapeHtml(batch.orderId || '')}">
                                                                                                                                            </div>
                                                                                                                                            <div class="form-group">
                                                                                                                                                <label class="form-label">Model</label>
                                                                                                                                                <select class="form-control batch-input" data-field="model">
                                                                                                                                                    <option value="IRU" ${batch.model === 'IRU' ? 'selected' : ''}>IRU</option>
                                                                                                                                                    <option value="Lease" ${batch.model === 'Lease' ? 'selected' : ''}>Lease</option>
                                                                                                                                                </select>
                                                                                                                                            </div>
                                                                                                                                            <div class="form-group">
                                                                                                                                                <label class="form-label">Start Date</label>
                                                                                                                                                <input type="date" class="form-control batch-input" data-field="startDate" value="${escapeHtml(batch.startDate || '')}">
                                                                                                                                            </div>
                                                                                                                                            <div class="form-group">
                                                                                                                                                <label class="form-label">Status</label>
                                                                                                                                                <select class="form-control batch-input" data-field="status">
                                                                                                                                                    <option value="Planned" ${batch.status === 'Planned' ? 'selected' : ''}>Planned</option>
                                                                                                                                                    <option value="Active" ${batch.status === 'Active' ? 'selected' : ''}>Active</option>
                                                                                                                                                    <option value="Ended" ${batch.status === 'Ended' ? 'selected' : ''}>Ended</option>
                                                                                                                                                </select>
                                                                                                                                            </div>
                                                                                                                                        </div>
                                                                                                                                        <div class="grid-4">
                                                                                                                                            <div class="form-group">
                                                                                                                                                <label class="form-label">Capacity (${escapeHtml(item.capacity?.unit || 'Gbps')})</label>
                                                                                                                                                <input type="number" class="form-control batch-input" data-field="capacity" value="${batch.capacity?.value || 0}">
                                                                                                                                            </div>
                                                                                                                                            <div class="form-group batch-iru-field">
                                                                                                                                                <label class="form-label">OTC ($)</label>
                                                                                                                                                <input type="number" class="form-control batch-input" data-field="otc" value="${batch.financials?.otc || 0}">
                                                                                                                                            </div>
                                                                                                                                            <div class="form-group batch-iru-field">
                                                                                                                                                <label class="form-label">O&amp;M Rate (%)</label>
                                                                                                                                                <input type="number" class="form-control batch-input batch-om-rate" data-field="omRate" value="${batch.financials?.omRate || 0}" step="0.1" min="0" max="100">
                                                                                                                                            </div>
                                                                                                                                            <div class="form-group batch-iru-field">
                                                                                                                                                <label class="form-label">Term (Months)</label>
                                                                                                                                                <input type="number" class="form-control batch-input" data-field="termMonths" value="${batch.financials?.termMonths || 0}">
                                                                                                                                            </div>
                                                                                                                                        </div>
                                                                                                                                        <div class="grid-2 batch-iru-field">
                                                                                                                                            <div class="form-group">
                                                                                                                                                <label class="form-label">Annual O&amp;M ($)</label>
                                                                                                                                                <input type="number" class="form-control batch-input batch-annual-om" data-field="annualOm" value="${batch.financials?.annualOm || 0}" readonly style="background-color: var(--bg-card-hover); cursor: not-allowed;">
                                                                                                                                            </div>
                                                                                                                                        </div>
                                                                                                                                        <div class="grid-2">
                                                                                                                                            <div class="form-group batch-lease-field">
                                                                                                                                                <label class="form-label">MRC ($)</label>
                                                                                                                                                <input type="number" class="form-control batch-input" data-field="mrc" value="${batch.financials?.mrc || 0}">
                                                                                                                                            </div>
                                                                                                                                            <div class="form-group" style="display:flex; align-items:flex-end;">
                                                                                                                                                <button type="button" class="btn btn-secondary batch-remove-btn" style="font-size:0.75rem;">Remove Batch</button>
                                                                                                                                            </div>
                                                                                                                                        </div>
                                                                                                                                    </div>
                                                                                                                                `).join('')}
                                                                                                                            </div>
                                                                                                                            <button type="button" class="btn btn-secondary" id="add-batch-btn" style="font-size:0.8rem; padding:0.4rem 0.75rem;">+ Add Batch</button>
                                                                                                                        </div>

            <!-- Step 3 Navigation -->
            <div class="form-step-nav">
                <button type="button" class="btn btn-secondary" id="step-prev-3"><ion-icon name="arrow-back-outline"></ion-icon> Back</button>
                <div></div>
            </div>
        </div>
                                                                                                                        `;

    context.openModal(isEdit ? 'Edit Resource' : 'Add Resource', formHTML, async (form) => {
        const newItem = buildInventoryPayloadFromForm(form, { resolveSupplierName });
        const batches = buildInventoryBatchesFromForm(form, newItem);

        setFormError('');
        const capacityError = validateInventoryBatchCapacity(newItem, batches);
        if (capacityError) {
            setFormError(capacityError);
            return false;
        }

        if (isEdit) {
            await window.Store.updateInventory(newItem.resourceId, newItem);
        } else {
            await window.Store.addInventory(newItem);
        }

        if (newItem.costMode === 'batches') {
            await window.Store.replaceInventoryBatches(newItem.resourceId, batches);
        } else {
            await window.Store.replaceInventoryBatches(newItem.resourceId, []);
        }

        // Refresh the inventory view to show updated data
        context.renderView('inventory');
        return true;
    }, true);

    initInventoryFormDropdowns({ supplierOptions, existingSupplier });
    setupInventoryBatchEditor();

    // Attach Form Event Listeners after modal is rendered
    context.attachInventoryFormListeners();
}
