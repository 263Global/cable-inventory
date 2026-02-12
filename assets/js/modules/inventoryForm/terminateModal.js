/**
 * Inventory early termination modal.
 * Adapted from salesForm/terminateModal.js for inventory resources.
 */

export function openInventoryTerminateModal(context, resourceId) {
    const item = window.Store.getInventory().find(i => i.resourceId === resourceId);
    if (!item) {
        alert('Resource not found');
        return;
    }

    const today = new Date().toISOString().split('T')[0];
    const escapeHtml = window.DomUtils?.escapeHtml || (s => s);

    const modalContent = `
        <div style="max-width: 420px; margin: 0 auto;">
            <div style="background: var(--bg-secondary); border-radius: 12px; padding: 1.25rem; margin-bottom: 1rem;">
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
                    <ion-icon name="close-circle-outline" style="font-size: 1.25rem; color: var(--accent-danger);"></ion-icon>
                    <h4 style="margin: 0; color: var(--text-primary);">提前终止资源</h4>
                </div>
                
                <div style="background: var(--bg-card); padding: 0.75rem; border-radius: 8px; margin-bottom: 1rem;">
                    <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.25rem;">资源编号</div>
                    <div class="font-mono" style="font-size: 1rem; color: var(--accent-primary); font-weight: 600;">${escapeHtml(resourceId)}</div>
                </div>

                <div style="background: var(--bg-card); padding: 0.75rem; border-radius: 8px; margin-bottom: 1rem;">
                    <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.25rem;">海缆系统</div>
                    <div style="font-size: 0.9rem; color: var(--text-primary); font-weight: 600;">${escapeHtml(item.cableSystem || '-')}</div>
                </div>
                
                <div style="background: var(--bg-card); padding: 0.75rem; border-radius: 8px; margin-bottom: 1rem;">
                    <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.25rem;">合同期限</div>
                    <div style="font-size: 0.9rem; color: var(--text-primary);">${item.dates?.start || '-'} 至 ${item.dates?.end || '-'}</div>
                </div>

                <div style="background: linear-gradient(135deg, rgba(255, 59, 48, 0.08), rgba(255, 59, 48, 0.02)); border: 1px solid rgba(255, 59, 48, 0.2); border-radius: 8px; padding: 0.75rem; margin-bottom: 0.5rem;">
                    <div style="font-size: 0.8rem; color: var(--accent-danger); font-weight: 600; margin-bottom: 0.5rem;">⚠️ 此操作将终止该资源</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">终止后，该资源将不再计入容量和成本统计。原合同日期将保留用于审计。</div>
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">终止日期</label>
                <input type="date" class="form-control" name="terminateDate" id="inv-terminate-date" value="${today}" required>
            </div>
            
            <div class="form-group">
                <label class="form-label">终止原因 <small style="color: var(--text-muted);">(可选)</small></label>
                <textarea class="form-control" name="terminateReason" id="inv-terminate-reason" rows="3" placeholder="例如：合同提前终止、供应商退网、线路替换等"></textarea>
            </div>
        </div>
    `;

    context.openModal(`终止: ${resourceId}`, modalContent, async (form) => {
        const terminateDate = form.querySelector('#inv-terminate-date').value;
        const reason = form.querySelector('#inv-terminate-reason').value.trim();

        if (!terminateDate) {
            alert('请选择终止日期');
            return false;
        }

        const updatedData = {
            ...item,
            terminatedAt: terminateDate,
            terminationReason: reason || null,
            status: 'Terminated'
        };

        await window.Store.updateInventory(resourceId, updatedData);

        context.showToast ? context.showToast(`资源 ${resourceId} 已终止`) : null;
        context.renderView('inventory');
        return true;
    }, false);
}
