/**
 * Renewal modal cost context and HTML helpers.
 */

export function createRenewalCostContext(order) {
    const costs = order.costs || {};
    const cableSegments = Array.isArray(costs.cableSegments) && costs.cableSegments.length
        ? costs.cableSegments
        : (costs.cable ? [costs.cable] : []);
    const cableCost = cableSegments[0] || {};
    const hasCableCost = cableSegments.length > 0 && (cableCost.mrc > 0 || cableCost.otc > 0 || cableCost.annualOm > 0);
    const isIruCable = cableCost.model === 'IRU';

    const backhaulA = costs.backhaul?.aEnd || {};
    const backhaulZ = costs.backhaul?.zEnd || {};
    const xcA = costs.crossConnect?.aEnd || {};
    const xcZ = costs.crossConnect?.zEnd || {};
    const otherCosts = costs.otherCosts || {};

    const hasBackhaulA = backhaulA.monthly > 0 || backhaulA.nrc > 0;
    const hasBackhaulZ = backhaulZ.monthly > 0 || backhaulZ.nrc > 0;
    const hasXcA = xcA.monthly > 0 || xcA.nrc > 0;
    const hasXcZ = xcZ.monthly > 0 || xcZ.nrc > 0;
    const hasOther = otherCosts.monthly > 0 || otherCosts.oneOff > 0;
    const hasAnyCost = hasCableCost || hasBackhaulA || hasBackhaulZ || hasXcA || hasXcZ || hasOther;

    return {
        costs,
        cableSegments,
        cableCost,
        isIruCable,
        backhaulA,
        backhaulZ,
        xcA,
        xcZ,
        otherCosts,
        hasCableCost,
        hasBackhaulA,
        hasBackhaulZ,
        hasXcA,
        hasXcZ,
        hasOther,
        hasAnyCost
    };
}

export function buildCostRenewalHtml(ctx) {
    if (!ctx.hasAnyCost) {
        return '';
    }

    const costCard = (title, icon, fields) => `
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

    let costCards = '';

    if (ctx.hasCableCost) {
        if (ctx.isIruCable) {
            costCards += costCard('🔌 Cable (IRU)', 'flash-outline', `
                <div class="form-group" style="margin-bottom: 0;">
                    <label style="font-size: 0.7rem; color: var(--text-muted);">Annual O&M ($)</label>
                    <input type="number" class="form-control" id="renew-cable-om" value="${ctx.cableCost.annualOm || 0}" min="0" step="0.01" style="font-size: 0.85rem; padding: 0.4rem;">
                    <small style="color: var(--text-muted);">原: $${(ctx.cableCost.annualOm || 0).toLocaleString()}</small>
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                    <label style="font-size: 0.7rem; color: var(--text-muted);">O&M Rate (%)</label>
                    <input type="number" class="form-control" id="renew-cable-om-rate" value="${ctx.cableCost.omRate || 0}" min="0" step="0.1" style="font-size: 0.85rem; padding: 0.4rem;">
                </div>
            `);
        } else {
            costCards += costCard('🔌 Cable (Lease)', 'flash-outline', `
                <div class="form-group" style="margin-bottom: 0;">
                    <label style="font-size: 0.7rem; color: var(--text-muted);">MRC ($)</label>
                    <input type="number" class="form-control" id="renew-cable-mrc" value="${ctx.cableCost.mrc || 0}" min="0" step="0.01" style="font-size: 0.85rem; padding: 0.4rem;">
                    <small style="color: var(--text-muted);">原: $${(ctx.cableCost.mrc || 0).toLocaleString()}</small>
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                    <label style="font-size: 0.7rem; color: var(--text-muted);">NRC ($)</label>
                    <input type="number" class="form-control" id="renew-cable-nrc" value="${ctx.cableCost.nrc || 0}" min="0" step="0.01" style="font-size: 0.85rem; padding: 0.4rem;">
                </div>
            `);
        }
    }

    if (ctx.hasBackhaulA) {
        costCards += costCard('📡 Backhaul A-End', 'radio-outline', `
            <div class="form-group" style="margin-bottom: 0;">
                <label style="font-size: 0.7rem; color: var(--text-muted);">Monthly ($)</label>
                <input type="number" class="form-control" id="renew-bh-a-mrc" value="${ctx.backhaulA.monthly || 0}" min="0" step="0.01" style="font-size: 0.85rem; padding: 0.4rem;">
                <small style="color: var(--text-muted);">原: $${(ctx.backhaulA.monthly || 0).toLocaleString()}</small>
            </div>
            <div class="form-group" style="margin-bottom: 0;">
                <label style="font-size: 0.7rem; color: var(--text-muted);">NRC ($)</label>
                <input type="number" class="form-control" id="renew-bh-a-nrc" value="${ctx.backhaulA.nrc || 0}" min="0" step="0.01" style="font-size: 0.85rem; padding: 0.4rem;">
            </div>
        `);
    }

    if (ctx.hasBackhaulZ) {
        costCards += costCard('📡 Backhaul Z-End', 'radio-outline', `
            <div class="form-group" style="margin-bottom: 0;">
                <label style="font-size: 0.7rem; color: var(--text-muted);">Monthly ($)</label>
                <input type="number" class="form-control" id="renew-bh-z-mrc" value="${ctx.backhaulZ.monthly || 0}" min="0" step="0.01" style="font-size: 0.85rem; padding: 0.4rem;">
                <small style="color: var(--text-muted);">原: $${(ctx.backhaulZ.monthly || 0).toLocaleString()}</small>
            </div>
            <div class="form-group" style="margin-bottom: 0;">
                <label style="font-size: 0.7rem; color: var(--text-muted);">NRC ($)</label>
                <input type="number" class="form-control" id="renew-bh-z-nrc" value="${ctx.backhaulZ.nrc || 0}" min="0" step="0.01" style="font-size: 0.85rem; padding: 0.4rem;">
            </div>
        `);
    }

    if (ctx.hasXcA) {
        costCards += costCard('🔗 Cross-Connect A', 'link-outline', `
            <div class="form-group" style="margin-bottom: 0;">
                <label style="font-size: 0.7rem; color: var(--text-muted);">Monthly ($)</label>
                <input type="number" class="form-control" id="renew-xc-a-mrc" value="${ctx.xcA.monthly || 0}" min="0" step="0.01" style="font-size: 0.85rem; padding: 0.4rem;">
                <small style="color: var(--text-muted);">原: $${(ctx.xcA.monthly || 0).toLocaleString()}</small>
            </div>
            <div class="form-group" style="margin-bottom: 0;">
                <label style="font-size: 0.7rem; color: var(--text-muted);">NRC ($)</label>
                <input type="number" class="form-control" id="renew-xc-a-nrc" value="${ctx.xcA.nrc || 0}" min="0" step="0.01" style="font-size: 0.85rem; padding: 0.4rem;">
            </div>
        `);
    }

    if (ctx.hasXcZ) {
        costCards += costCard('🔗 Cross-Connect Z', 'link-outline', `
            <div class="form-group" style="margin-bottom: 0;">
                <label style="font-size: 0.7rem; color: var(--text-muted);">Monthly ($)</label>
                <input type="number" class="form-control" id="renew-xc-z-mrc" value="${ctx.xcZ.monthly || 0}" min="0" step="0.01" style="font-size: 0.85rem; padding: 0.4rem;">
                <small style="color: var(--text-muted);">原: $${(ctx.xcZ.monthly || 0).toLocaleString()}</small>
            </div>
            <div class="form-group" style="margin-bottom: 0;">
                <label style="font-size: 0.7rem; color: var(--text-muted);">NRC ($)</label>
                <input type="number" class="form-control" id="renew-xc-z-nrc" value="${ctx.xcZ.nrc || 0}" min="0" step="0.01" style="font-size: 0.85rem; padding: 0.4rem;">
            </div>
        `);
    }

    if (ctx.hasOther) {
        costCards += costCard('💰 Other Costs', 'wallet-outline', `
            <div class="form-group" style="margin-bottom: 0;">
                <label style="font-size: 0.7rem; color: var(--text-muted);">Monthly ($)</label>
                <input type="number" class="form-control" id="renew-other-mrc" value="${ctx.otherCosts.monthly || 0}" min="0" step="0.01" style="font-size: 0.85rem; padding: 0.4rem;">
                <small style="color: var(--text-muted);">原: $${(ctx.otherCosts.monthly || 0).toLocaleString()}</small>
            </div>
            <div class="form-group" style="margin-bottom: 0;">
                <label style="font-size: 0.7rem; color: var(--text-muted);">One-off ($)</label>
                <input type="number" class="form-control" id="renew-other-nrc" value="${ctx.otherCosts.oneOff || 0}" min="0" step="0.01" style="font-size: 0.85rem; padding: 0.4rem;">
            </div>
        `);
    }

    return `
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
