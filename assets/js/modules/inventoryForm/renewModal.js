/**
 * Inventory renewal modal.
 * Adapted from salesForm/renewModal.js for inventory resources.
 * Simpler than sales renewal — no cost segments, just date + cost fields.
 */

export function openInventoryRenewModal(context, resourceId) {
    const item = window.Store.getInventory().find(i => i.resourceId === resourceId);
    if (!item) {
        alert('Resource not found');
        return;
    }

    const escapeHtml = window.DomUtils?.escapeHtml || (s => s);

    // Calculate default new start date (original end date + 1 day)
    const originalEndDate = item.dates?.end || '';
    let newStartDate = '';
    if (originalEndDate) {
        const endDate = new Date(originalEndDate);
        endDate.setDate(endDate.getDate() + 1);
        newStartDate = endDate.toISOString().split('T')[0];
    }

    const originalTerm = item.financials?.term || 12;
    const isIRU = item.acquisition?.ownership === 'IRU';

    // Current cost info
    const currentMRC = item.financials?.mrc || 0;
    const currentNRC = item.financials?.nrc || 0;
    const currentOTC = item.financials?.otc || 0;

    const modalContent = `
        <div style="max-width: 450px; margin: 0 auto;">
            <div style="background: var(--bg-secondary); border-radius: 12px; padding: 1.25rem; margin-bottom: 1rem;">
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
                    <ion-icon name="refresh-outline" style="font-size: 1.25rem; color: var(--accent-warning);"></ion-icon>
                    <h4 style="margin: 0; color: var(--text-primary);">续约资源</h4>
                </div>
                
                <div style="background: var(--bg-card); padding: 0.75rem; border-radius: 8px; margin-bottom: 1rem;">
                    <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.25rem;">资源编号 (不变)</div>
                    <div class="font-mono" style="font-size: 1rem; color: var(--accent-primary); font-weight: 600;">${escapeHtml(resourceId)}</div>
                </div>

                <div style="background: var(--bg-card); padding: 0.75rem; border-radius: 8px; margin-bottom: 1rem;">
                    <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.25rem;">海缆系统</div>
                    <div style="font-size: 0.9rem; color: var(--text-primary); font-weight: 600;">${escapeHtml(item.cableSystem || '-')}</div>
                </div>
                
                <div style="background: var(--bg-card); padding: 0.75rem; border-radius: 8px; margin-bottom: 1rem;">
                    <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.25rem;">原合同期限</div>
                    <div style="font-size: 0.9rem; color: var(--text-primary);">${item.dates?.start || '-'} 至 ${originalEndDate || '-'} (${originalTerm} 个月)</div>
                </div>
            </div>
            
            <!-- 成本信息区域 -->
            <div style="background: linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(37, 99, 235, 0.02)); border: 1px solid rgba(37, 99, 235, 0.2); border-radius: 12px; padding: 1.25rem; margin-bottom: 1rem;">
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
                    <ion-icon name="pricetag-outline" style="font-size: 1.25rem; color: var(--accent-primary);"></ion-icon>
                    <h4 style="margin: 0; color: var(--text-primary);">续约成本</h4>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    ${!isIRU ? `
                    <div class="form-group" style="margin-bottom: 0;">
                        <label class="form-label" style="font-size: 0.8rem;">
                            月费 MRC ($)
                            <small style="color: var(--text-muted); display: block;">原: $${currentMRC.toLocaleString()}</small>
                        </label>
                        <input type="number" class="form-control" name="renewMRC" id="inv-renew-mrc" value="${currentMRC}" min="0" step="0.01">
                    </div>
                    ` : ''}
                    <div class="form-group" style="margin-bottom: 0;">
                        <label class="form-label" style="font-size: 0.8rem;">
                            ${isIRU ? 'OTC ($)' : 'NRC ($)'}
                            <small style="color: var(--text-muted); display: block;">原: $${(isIRU ? currentOTC : currentNRC).toLocaleString()}</small>
                        </label>
                        <input type="number" class="form-control" name="renewOTC" id="inv-renew-otc" value="${isIRU ? currentOTC : currentNRC}" min="0" step="0.01">
                    </div>
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">新合同开始日期</label>
                <input type="date" class="form-control" name="renewStartDate" id="inv-renew-start-date" value="${newStartDate}" required>
            </div>
            
            <div class="form-group">
                <label class="form-label">新合同期限 (月)</label>
                <input type="number" class="form-control" name="renewTerm" id="inv-renew-term" value="${originalTerm}" min="1" required>
            </div>
            
            <div class="form-group">
                <label class="form-label">新合同结束日期 <small style="color: var(--text-muted);">(自动计算)</small></label>
                <input type="date" class="form-control" name="renewEndDate" id="inv-renew-end-date" readonly style="background: var(--bg-card-hover);">
            </div>
        </div>
    `;

    context.openModal(`续约: ${resourceId}`, modalContent, async (form) => {
        const startDate = form.querySelector('#inv-renew-start-date').value;
        const term = parseInt(form.querySelector('#inv-renew-term').value) || 12;
        const endDate = form.querySelector('#inv-renew-end-date').value;

        if (!startDate || !endDate) {
            alert('请填写完整的日期信息');
            return false;
        }

        // Build updated financials
        const updatedFinancials = { ...item.financials, term };
        if (isIRU) {
            updatedFinancials.otc = parseFloat(form.querySelector('#inv-renew-otc').value) || 0;
        } else {
            const mrcEl = form.querySelector('#inv-renew-mrc');
            if (mrcEl) updatedFinancials.mrc = parseFloat(mrcEl.value) || 0;
            updatedFinancials.nrc = parseFloat(form.querySelector('#inv-renew-otc').value) || 0;
        }

        // Snapshot pre-renewal state
        const snapshot = {
            renewedAt: new Date().toISOString(),
            dates: item.dates ? { ...item.dates } : null,
            financials: item.financials ? { ...item.financials } : null
        };
        const history = Array.isArray(item.renewalHistory)
            ? [...item.renewalHistory, snapshot]
            : [snapshot];

        const updatedData = {
            ...item,
            dates: { start: startDate, end: endDate },
            financials: updatedFinancials,
            renewalHistory: history,
            // Clear termination if renewing a terminated resource
            terminatedAt: null,
            terminationReason: null,
            status: 'Available'
        };

        await window.Store.updateInventory(resourceId, updatedData);

        // Build success message
        let costChangeMsg = '';
        if (!isIRU && updatedFinancials.mrc !== currentMRC) {
            costChangeMsg += ` MRC: $${currentMRC} → $${updatedFinancials.mrc}`;
        }
        const newOneTime = isIRU ? updatedFinancials.otc : updatedFinancials.nrc;
        const oldOneTime = isIRU ? currentOTC : currentNRC;
        if (newOneTime !== oldOneTime) {
            costChangeMsg += ` ${isIRU ? 'OTC' : 'NRC'}: $${oldOneTime} → $${newOneTime}`;
        }

        context.showToast ? context.showToast(`资源 ${resourceId} 续约成功！${costChangeMsg ? '成本已更新:' + costChangeMsg : ''}`) : null;
        context.renderView('inventory');
        return true;
    }, false);

    // Auto-calculate end date
    setTimeout(() => {
        const startInput = document.getElementById('inv-renew-start-date');
        const termInput = document.getElementById('inv-renew-term');
        const endInput = document.getElementById('inv-renew-end-date');

        const calculateEndDate = () => {
            if (!startInput.value || !termInput.value) return;
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
    }, 100);
}
