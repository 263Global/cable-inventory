/**
 * Sales renew modal flow extracted from modal.js.
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

    const costContext = createRenewalCostContext(order);
    const costRenewalHTML = buildCostRenewalHtml(costContext);

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

        const { nextCosts, costChanges } = applyRenewalCostUpdates({
            form,
            order,
            ctx: costContext,
            startDate,
            term,
            endDate
        });
        if (nextCosts) {
            updatedData.costs = nextCosts;
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
