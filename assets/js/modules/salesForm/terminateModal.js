/**
 * Sales early termination modal.
 */

export function openTerminateModal(context, salesOrderId) {
    const order = window.Store.getSales().find(s => s.salesOrderId === salesOrderId);
    if (!order) {
        alert('Order not found');
        return;
    }

    const today = new Date().toISOString().split('T')[0];
    const escapeHtml = window.DomUtils?.escapeHtml || (s => s);

    const modalContent = `
        <div style="max-width: 420px; margin: 0 auto;">
            <div style="background: var(--bg-secondary); border-radius: 12px; padding: 1.25rem; margin-bottom: 1rem;">
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
                    <ion-icon name="close-circle-outline" style="font-size: 1.25rem; color: var(--accent-danger);"></ion-icon>
                    <h4 style="margin: 0; color: var(--text-primary);">提前终止订单</h4>
                </div>
                
                <div style="background: var(--bg-card); padding: 0.75rem; border-radius: 8px; margin-bottom: 1rem;">
                    <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.25rem;">订单号</div>
                    <div class="font-mono" style="font-size: 1rem; color: var(--accent-primary); font-weight: 600;">${escapeHtml(salesOrderId)}</div>
                </div>
                
                <div style="background: var(--bg-card); padding: 0.75rem; border-radius: 8px; margin-bottom: 1rem;">
                    <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.25rem;">原合同期限</div>
                    <div style="font-size: 0.9rem; color: var(--text-primary);">${order.dates?.start || '-'} 至 ${order.dates?.end || '-'} (${order.dates?.term || '-'} 个月)</div>
                </div>

                <div style="background: linear-gradient(135deg, rgba(255, 59, 48, 0.08), rgba(255, 59, 48, 0.02)); border: 1px solid rgba(255, 59, 48, 0.2); border-radius: 8px; padding: 0.75rem; margin-bottom: 0.5rem;">
                    <div style="font-size: 0.8rem; color: var(--accent-danger); font-weight: 600; margin-bottom: 0.5rem;">⚠️ 此操作将终止该订单的计费</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">终止后，该订单将不再计入 MRR 和容量统计。原合同日期将保留用于审计。</div>
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">终止日期</label>
                <input type="date" class="form-control" name="terminateDate" id="terminate-date" value="${today}" required>
            </div>
            
            <div class="form-group">
                <label class="form-label">终止原因 <small style="color: var(--text-muted);">(可选)</small></label>
                <textarea class="form-control" name="terminateReason" id="terminate-reason" rows="3" placeholder="例如：客户合同提前解除、业务调整等"></textarea>
            </div>
        </div>
    `;

    context.openModal(`终止: ${salesOrderId}`, modalContent, async (form) => {
        const terminateDate = form.querySelector('#terminate-date').value;
        const reason = form.querySelector('#terminate-reason').value.trim();

        if (!terminateDate) {
            alert('请选择终止日期');
            return false;
        }

        const updatedData = {
            ...order,
            terminatedAt: terminateDate,
            terminationReason: reason || null,
            status: 'Terminated'
        };

        await window.Store.updateSalesOrder(salesOrderId, updatedData);

        context.showToast ? context.showToast(`订单 ${salesOrderId} 已终止`) : null;
        context.renderView('sales');
        return true;
    }, false);
}
