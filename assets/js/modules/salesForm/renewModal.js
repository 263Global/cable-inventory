/**
 * Sales renew modal flow.
 * Redesigned: costs always visible, per-cost checkboxes with
 * independent dates, auto-zeroed NRC, loading state on submit.
 */

import { createRenewalCostContext, buildCostRenewalHtml } from './renewModalCostContext.js';
import { applyRenewalCostUpdates } from './renewModalUpdate.js';

const { computeSalesStatus } = window.SalesStatus;

export function openRenewModal(context, salesOrderId) {
    const order = window.Store.getSales().find(s => s.salesOrderId === salesOrderId);
    if (!order) {
        alert('Order not found');
        return;
    }

    // Calculate default new start date (customer contract end + 1 day)
    const originalEndDate = order.dates?.end || '';
    let newStartDate = '';
    if (originalEndDate) {
        const endDate = new Date(originalEndDate);
        endDate.setDate(endDate.getDate() + 1);
        newStartDate = endDate.toISOString().split('T')[0];
    }

    const originalTerm = order.dates?.term || 12;

    // Current customer pricing
    const currentMRC = order.financials?.mrcSales || 0;
    const currentNRC = order.financials?.nrcSales || 0;

    const costContext = createRenewalCostContext(order);
    const costRenewalHTML = buildCostRenewalHtml(costContext);

    const modalContent = `
        <div style="max-width: 480px; margin: 0 auto;">
            <!-- Order info -->
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

            <!-- Customer contract section -->
            <div style="background: linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(37, 99, 235, 0.02)); border: 1px solid rgba(37, 99, 235, 0.2); border-radius: 12px; padding: 1.25rem; margin-bottom: 1rem;">
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
                    <ion-icon name="calendar-outline" style="font-size: 1.25rem; color: var(--accent-primary);"></ion-icon>
                    <h4 style="margin: 0; color: var(--text-primary);">客户合同</h4>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 100px 1fr; gap: 0.75rem; margin-bottom: 1rem;">
                    <div class="form-group" style="margin-bottom: 0;">
                        <label class="form-label" for="renew-start-date">新合同开始日期</label>
                        <input type="date" class="form-control" name="renewStartDate" id="renew-start-date" value="${newStartDate}" required>
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                        <label class="form-label" for="renew-term">期限 (月)</label>
                        <input type="number" class="form-control" name="renewTerm" id="renew-term" value="${originalTerm}" min="1" required>
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                        <label class="form-label" for="renew-end-date">结束日期</label>
                        <input type="date" class="form-control" name="renewEndDate" id="renew-end-date" readonly style="background: var(--bg-card-hover);">
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div class="form-group" style="margin-bottom: 0;">
                        <label class="form-label" for="renew-mrc" style="font-size: 0.8rem;">
                            月费 MRC ($)
                            <small style="color: var(--text-muted); display: block;">原: $${currentMRC.toLocaleString()}</small>
                        </label>
                        <input type="number" class="form-control" name="renewMRC" id="renew-mrc" value="${currentMRC}" min="0" step="0.01">
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                        <label class="form-label" for="renew-nrc" style="font-size: 0.8rem;">
                            一次性费用 NRC ($)
                            <small style="color: var(--text-muted); display: block;">原: $${currentNRC.toLocaleString()}</small>
                        </label>
                        <input type="number" class="form-control" name="renewNRC" id="renew-nrc" value="${currentNRC}" min="0" step="0.01">
                    </div>
                </div>
            </div>
            
            <!-- Cost renewal section (always visible, not collapsed) -->
            ${costRenewalHTML}
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

        // Build updated data
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

        const { nextCosts, costChanges } = applyRenewalCostUpdates({
            form,
            order,
            ctx: costContext
        });
        if (nextCosts) {
            updatedData.costs = nextCosts;
        }

        // Snapshot pre-renewal state into renewalHistory
        const snapshot = {
            renewedAt: new Date().toISOString(),
            dates: order.dates ? { ...order.dates } : null,
            financials: order.financials ? { ...order.financials } : null,
            costs: order.costs ? JSON.parse(JSON.stringify(order.costs)) : null,
            costChanges: costChanges.length ? costChanges : undefined
        };
        const history = Array.isArray(order.renewalHistory)
            ? [...order.renewalHistory, snapshot]
            : [snapshot];
        updatedData.renewalHistory = history;

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
            costChangeMsg = ` | 成本: ${costChanges.join(', ')}`;
        }

        context.showToast ? context.showToast(`订单 ${salesOrderId} 续约成功！${priceChangeMsg ? ' 价格:' + priceChangeMsg : ''}${costChangeMsg}`) : null;

        context.renderView('sales');
        return true;
    }, false);

    // Wire up event listeners after modal renders
    setTimeout(() => {
        wireCustomerDateListeners();
        wireCostCheckboxListeners();
        wireCostDateListeners();
    }, 100);
}

// ─── Customer contract date auto-calculation ─────────────────────

function wireCustomerDateListeners() {
    const startInput = document.getElementById('renew-start-date');
    const termInput = document.getElementById('renew-term');
    const endInput = document.getElementById('renew-end-date');

    const calculateEndDate = () => {
        if (!startInput?.value || !termInput?.value) return;
        const start = new Date(startInput.value);
        const months = parseInt(termInput.value) || 0;
        const end = new Date(start);
        end.setMonth(end.getMonth() + months);
        end.setDate(end.getDate() - 1);
        endInput.value = end.toISOString().split('T')[0];
    };

    if (startInput && termInput) {
        startInput.addEventListener('change', calculateEndDate);
        termInput.addEventListener('input', calculateEndDate);
        calculateEndDate();
    }
}

// ─── Per-cost checkbox toggle ────────────────────────────────────

function wireCostCheckboxListeners() {
    document.querySelectorAll('.cost-renew-check').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const key = e.target.dataset.costKey;
            const card = e.target.closest('.cost-renew-item');
            const body = card?.querySelector(`.cost-renew-body[data-cost-key="${key}"]`);
            if (!card || !body) return;

            if (e.target.checked) {
                card.style.opacity = '1';
                body.style.display = 'block';
                // Trigger per-cost date calculation
                calculateCostEndDate(key);
            } else {
                card.style.opacity = '0.5';
                body.style.display = 'none';
            }
        });
    });
}

// ─── Per-cost date auto-calculation ──────────────────────────────

function calculateCostEndDate(key) {
    const startInput = document.getElementById(`renew-${key}-start`);
    const termInput = document.getElementById(`renew-${key}-term`);
    const endInput = document.getElementById(`renew-${key}-end`);

    if (!startInput?.value || !termInput?.value) return;
    const start = new Date(startInput.value);
    const months = parseInt(termInput.value) || 0;
    const end = new Date(start);
    end.setMonth(end.getMonth() + months);
    end.setDate(end.getDate() - 1);
    endInput.value = end.toISOString().split('T')[0];
}

function wireCostDateListeners() {
    document.querySelectorAll('.cost-date-start, .cost-date-term').forEach(input => {
        const key = input.dataset.costKey;
        const eventType = input.classList.contains('cost-date-start') ? 'change' : 'input';
        input.addEventListener(eventType, () => calculateCostEndDate(key));
    });

    // Calculate initial end dates for all checked costs
    document.querySelectorAll('.cost-renew-check:checked').forEach(checkbox => {
        calculateCostEndDate(checkbox.dataset.costKey);
    });
}
