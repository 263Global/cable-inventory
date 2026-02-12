/**
 * Renewal modal cost context and HTML helpers.
 * Redesigned: per-cost checkbox, independent dates, auto-zeroed NRC.
 */

/**
 * Determine whether a cost's end date is expiring soon relative to the
 * customer contract end date (within 90 days after customer end).
 */
function isExpiringSoon(costEndDate, customerEndDate) {
    if (!costEndDate) return true; // no date stored → treat as aligned with customer
    if (!customerEndDate) return true;
    const cEnd = new Date(costEndDate);
    const custEnd = new Date(customerEndDate);
    const diffMs = cEnd.getTime() - custEnd.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays <= 90; // within 90 days of customer end
}

/**
 * Compute the default new start date for a cost: original cost endDate + 1 day.
 */
function nextDay(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
}

export function createRenewalCostContext(order) {
    const costs = order.costs || {};
    const customerEndDate = order.dates?.end || '';

    // Cable
    const cableSegments = Array.isArray(costs.cableSegments) && costs.cableSegments.length
        ? costs.cableSegments
        : (costs.cable ? [costs.cable] : []);
    const cableCost = cableSegments[0] || {};
    const hasCableCost = cableSegments.length > 0 && (cableCost.mrc > 0 || cableCost.otc > 0 || cableCost.annualOm > 0);
    const isIruCable = cableCost.model === 'IRU';

    // Backhaul
    const backhaulA = costs.backhaul?.aEnd || {};
    const backhaulZ = costs.backhaul?.zEnd || {};
    // Cross-connect
    const xcA = costs.crossConnect?.aEnd || {};
    const xcZ = costs.crossConnect?.zEnd || {};
    // Other
    const otherCosts = costs.otherCosts || {};

    const hasBackhaulA = backhaulA.monthly > 0 || backhaulA.nrc > 0;
    const hasBackhaulZ = backhaulZ.monthly > 0 || backhaulZ.nrc > 0;
    const hasXcA = xcA.monthly > 0 || xcA.nrc > 0;
    const hasXcZ = xcZ.monthly > 0 || xcZ.nrc > 0;
    const hasOther = otherCosts.monthly > 0 || otherCosts.oneOff > 0;
    const hasAnyCost = hasCableCost || hasBackhaulA || hasBackhaulZ || hasXcA || hasXcZ || hasOther;

    // Classify each cost
    const costItems = [];

    if (hasCableCost) {
        costItems.push({
            key: 'cable',
            label: isIruCable ? 'Cable (IRU)' : 'Cable (Lease)',
            icon: 'flash-outline',
            hasRecurring: true,
            isIru: isIruCable,
            endDate: cableCost.endDate || '',
            startDate: cableCost.startDate || '',
            termMonths: cableCost.termMonths || 12,
            expiringSoon: isExpiringSoon(cableCost.endDate, customerEndDate),
            data: cableCost
        });
    }

    if (hasBackhaulA) {
        costItems.push({
            key: 'bh-a',
            label: 'Backhaul A-End',
            icon: 'radio-outline',
            hasRecurring: backhaulA.monthly > 0,
            endDate: costs.backhaulA?.endDate || backhaulA.endDate || '',
            startDate: costs.backhaulA?.startDate || backhaulA.startDate || '',
            termMonths: costs.backhaulA?.termMonths || backhaulA.termMonths || 12,
            expiringSoon: isExpiringSoon(costs.backhaulA?.endDate || backhaulA.endDate, customerEndDate),
            data: backhaulA
        });
    }

    if (hasBackhaulZ) {
        costItems.push({
            key: 'bh-z',
            label: 'Backhaul Z-End',
            icon: 'radio-outline',
            hasRecurring: backhaulZ.monthly > 0,
            endDate: costs.backhaulZ?.endDate || backhaulZ.endDate || '',
            startDate: costs.backhaulZ?.startDate || backhaulZ.startDate || '',
            termMonths: costs.backhaulZ?.termMonths || backhaulZ.termMonths || 12,
            expiringSoon: isExpiringSoon(costs.backhaulZ?.endDate || backhaulZ.endDate, customerEndDate),
            data: backhaulZ
        });
    }

    if (hasXcA) {
        costItems.push({
            key: 'xc-a',
            label: 'Cross-Connect A',
            icon: 'link-outline',
            hasRecurring: xcA.monthly > 0,
            endDate: costs.xcA?.endDate || xcA.endDate || '',
            startDate: costs.xcA?.startDate || xcA.startDate || '',
            termMonths: costs.xcA?.termMonths || xcA.termMonths || 12,
            expiringSoon: isExpiringSoon(costs.xcA?.endDate || xcA.endDate, customerEndDate),
            data: xcA
        });
    }

    if (hasXcZ) {
        costItems.push({
            key: 'xc-z',
            label: 'Cross-Connect Z',
            icon: 'link-outline',
            hasRecurring: xcZ.monthly > 0,
            endDate: costs.xcZ?.endDate || xcZ.endDate || '',
            startDate: costs.xcZ?.startDate || xcZ.startDate || '',
            termMonths: costs.xcZ?.termMonths || xcZ.termMonths || 12,
            expiringSoon: isExpiringSoon(costs.xcZ?.endDate || xcZ.endDate, customerEndDate),
            data: xcZ
        });
    }

    if (hasOther) {
        const isOneTimeOnly = (otherCosts.monthly || 0) === 0 && (otherCosts.oneOff || 0) > 0;
        costItems.push({
            key: 'other',
            label: 'Other Costs',
            icon: 'wallet-outline',
            hasRecurring: !isOneTimeOnly,
            isOneTimeOnly,
            endDate: costs.other?.endDate || otherCosts.endDate || '',
            startDate: costs.other?.startDate || otherCosts.startDate || '',
            termMonths: costs.other?.termMonths || otherCosts.termMonths || 12,
            expiringSoon: isOneTimeOnly ? false : isExpiringSoon(costs.other?.endDate || otherCosts.endDate, customerEndDate),
            data: otherCosts
        });
    }

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
        hasAnyCost,
        costItems,
        customerEndDate
    };
}

// ─── HTML builders ───────────────────────────────────────────────

function costInputField(id, label, value, originalValue, opts = {}) {
    const { readonly, step, type } = { readonly: false, step: '0.01', type: 'number', ...opts };
    const origLabel = originalValue !== undefined ? `<small style="color: var(--text-muted);">原: $${Number(originalValue).toLocaleString()}</small>` : '';
    return `
        <div class="form-group" style="margin-bottom: 0;">
            <label for="${id}" style="font-size: 0.7rem; color: var(--text-muted);">${label}</label>
            <input type="${type}" class="form-control" id="${id}" value="${value}" min="0" step="${step}"
                   style="font-size: 0.85rem; padding: 0.4rem;${readonly ? ' background: var(--bg-card-hover);' : ''}"
                   ${readonly ? 'readonly' : ''}>
            ${origLabel}
        </div>`;
}

function buildCostItemHtml(item, customerEndDate) {
    const checked = item.expiringSoon && !item.isOneTimeOnly;
    const checkedAttr = checked ? 'checked' : '';
    const bodyDisplay = checked ? 'block' : 'none';
    const cardOpacity = checked ? '1' : '0.5';

    // Contract date info
    const dateRange = item.startDate && item.endDate
        ? `${item.startDate} → ${item.endDate}`
        : '(no contract dates)';

    // Default new start date: cost end + 1 day, fallback to customer end + 1 day
    const newStart = nextDay(item.endDate) || nextDay(customerEndDate) || '';
    const origTerm = item.termMonths || 12;

    // Status label
    let statusLabel = '';
    if (item.isOneTimeOnly) {
        statusLabel = `<span style="font-size: 0.7rem; color: var(--text-muted); background: var(--bg-secondary); padding: 2px 8px; border-radius: 10px;">一次性费用，无需续约</span>`;
    } else if (!item.expiringSoon && item.endDate) {
        const daysLeft = Math.ceil((new Date(item.endDate).getTime() - new Date(customerEndDate).getTime()) / (1000 * 60 * 60 * 24));
        statusLabel = `<span style="font-size: 0.7rem; color: var(--accent-info); background: rgba(37, 99, 235, 0.1); padding: 2px 8px; border-radius: 10px;">合同尚有 ${daysLeft} 天</span>`;
    }

    // Price fields depend on cost type
    let priceFields = '';
    const d = item.data;

    if (item.key === 'cable') {
        if (item.isIru) {
            priceFields = `
                ${costInputField(`renew-${item.key}-om`, 'Annual O&M ($)', d.annualOm || 0, d.annualOm || 0)}
                ${costInputField(`renew-${item.key}-om-rate`, 'O&M Rate (%)', d.omRate || 0, undefined, { step: '0.1' })}
            `;
        } else {
            priceFields = `
                ${costInputField(`renew-${item.key}-mrc`, 'MRC ($)', d.mrc || 0, d.mrc || 0)}
                ${costInputField(`renew-${item.key}-nrc`, 'NRC ($)', 0, d.nrc || 0)}
            `;
        }
    } else if (item.key === 'other') {
        priceFields = `
            ${costInputField(`renew-${item.key}-mrc`, 'Monthly ($)', d.monthly || 0, d.monthly || 0)}
            ${costInputField(`renew-${item.key}-nrc`, 'One-off ($)', 0, d.oneOff || 0)}
        `;
    } else {
        // backhaul A/Z, XC A/Z
        priceFields = `
            ${costInputField(`renew-${item.key}-mrc`, 'Monthly ($)', d.monthly || 0, d.monthly || 0)}
            ${costInputField(`renew-${item.key}-nrc`, 'NRC ($)', 0, d.nrc || 0)}
        `;
    }

    return `
        <div class="cost-renew-item" data-cost-key="${item.key}"
             style="background: var(--bg-card); border-radius: 8px; padding: 0.75rem; margin-bottom: 0.75rem; opacity: ${cardOpacity}; transition: opacity 150ms ease-out;">

            <!-- Header row: checkbox + label + status -->
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; margin-bottom: 0;">
                <input type="checkbox" class="cost-renew-check" data-cost-key="${item.key}"
                       ${checkedAttr} ${item.isOneTimeOnly ? 'disabled' : ''}
                       style="cursor: pointer; width: 16px; height: 16px;">
                <ion-icon name="${item.icon}" style="font-size: 1rem; color: var(--accent-info);"></ion-icon>
                <span style="font-weight: 500; font-size: 0.85rem; flex: 1;">${item.label}</span>
                ${statusLabel}
            </label>

            <!-- Current contract info -->
            <div style="font-size: 0.7rem; color: var(--text-muted); margin: 0.35rem 0 0 1.6rem;">
                合约: ${dateRange}
            </div>

            <!-- Expandable body: dates + prices -->
            <div class="cost-renew-body" data-cost-key="${item.key}"
                 style="display: ${bodyDisplay}; margin-top: 0.75rem; padding-left: 1.6rem; overflow: hidden; transition: max-height 150ms ease-out;">

                <!-- Per-cost date row -->
                <div style="display: grid; grid-template-columns: 1fr 80px 1fr; gap: 0.5rem; margin-bottom: 0.75rem;">
                    <div class="form-group" style="margin-bottom: 0;">
                        <label for="renew-${item.key}-start" style="font-size: 0.7rem; color: var(--text-muted);">New Start</label>
                        <input type="date" class="form-control cost-date-start" id="renew-${item.key}-start"
                               data-cost-key="${item.key}" value="${newStart}"
                               style="font-size: 0.8rem; padding: 0.35rem;">
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                        <label for="renew-${item.key}-term" style="font-size: 0.7rem; color: var(--text-muted);">Term</label>
                        <input type="number" class="form-control cost-date-term" id="renew-${item.key}-term"
                               data-cost-key="${item.key}" value="${origTerm}" min="1"
                               style="font-size: 0.8rem; padding: 0.35rem;">
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                        <label for="renew-${item.key}-end" style="font-size: 0.7rem; color: var(--text-muted);">End</label>
                        <input type="date" class="form-control cost-date-end" id="renew-${item.key}-end"
                               data-cost-key="${item.key}" readonly
                               style="font-size: 0.8rem; padding: 0.35rem; background: var(--bg-card-hover);">
                    </div>
                </div>

                <!-- Price fields -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                    ${priceFields}
                </div>
            </div>
        </div>`;
}

export function buildCostRenewalHtml(ctx) {
    if (!ctx.hasAnyCost || !ctx.costItems?.length) {
        return '';
    }

    const costCards = ctx.costItems.map(item => buildCostItemHtml(item, ctx.customerEndDate)).join('');

    return `
        <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(16, 185, 129, 0.02)); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 12px; padding: 1rem; margin-bottom: 1rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;">
                <ion-icon name="cash-outline" style="font-size: 1.1rem; color: var(--accent-success);"></ion-icon>
                <span style="font-weight: 500; color: var(--text-primary);">成本续约</span>
                <span style="font-size: 0.7rem; color: var(--text-muted);">仅勾选需要续约的成本</span>
            </div>
            <div style="font-size: 0.72rem; color: var(--text-muted); margin-bottom: 0.75rem; padding: 0.4rem 0.6rem; background: var(--bg-secondary); border-radius: 6px;">
                <ion-icon name="information-circle-outline" style="vertical-align: middle; margin-right: 2px;"></ion-icon>
                到期（或即将到期）的成本已自动勾选。未勾选的成本保持原合同不变。一次性费用默认归零。
            </div>
            ${costCards}
        </div>`;
}
