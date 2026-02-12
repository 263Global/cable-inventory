/**
 * Renewal modal cost update builder.
 * Redesigned: only updates checked costs, uses per-cost dates.
 */

function readNumber(form, selector) {
    return parseFloat(form.querySelector(selector)?.value) || 0;
}

function readValue(form, selector) {
    return form.querySelector(selector)?.value || '';
}

/**
 * Apply cost updates based on per-cost checkboxes and independent date fields.
 * Only checked costs are updated; unchecked costs retain original values.
 */
export function applyRenewalCostUpdates({ form, order, ctx }) {
    const costChanges = [];

    if (!ctx.hasAnyCost || !ctx.costItems?.length) {
        return { nextCosts: null, costChanges };
    }

    const currentCosts = order.costs || {};
    const nextCosts = {
        ...currentCosts,
        backhaul: { ...(currentCosts.backhaul || {}) },
        crossConnect: { ...(currentCosts.crossConnect || {}) },
        otherCosts: { ...(currentCosts.otherCosts || {}) }
    };

    // Process each cost item based on its checkbox state
    for (const item of ctx.costItems) {
        const checkbox = form.querySelector(`.cost-renew-check[data-cost-key="${item.key}"]`);
        if (!checkbox || !checkbox.checked) continue; // skip unchecked

        // Read per-cost dates
        const newStart = readValue(form, `#renew-${item.key}-start`);
        const newTerm = parseInt(readValue(form, `#renew-${item.key}-term`)) || 12;
        const newEnd = readValue(form, `#renew-${item.key}-end`);

        if (item.key === 'cable') {
            const cableSegmentsClone = ctx.cableSegments.map(seg => ({ ...seg }));
            nextCosts.cable = { ...(cableSegmentsClone[0] || currentCosts.cable || {}) };
            if (cableSegmentsClone.length) {
                cableSegmentsClone[0] = { ...nextCosts.cable };
            }
            nextCosts.cableSegments = cableSegmentsClone;

            // Update dates
            nextCosts.cable.startDate = newStart;
            nextCosts.cable.termMonths = newTerm;
            nextCosts.cable.endDate = newEnd;
            if (nextCosts.cableSegments?.length) {
                nextCosts.cableSegments[0].startDate = newStart;
                nextCosts.cableSegments[0].termMonths = newTerm;
                nextCosts.cableSegments[0].endDate = newEnd;
            }

            if (ctx.isIruCable) {
                const newOm = readNumber(form, '#renew-cable-om');
                const newOmRate = readNumber(form, '#renew-cable-om-rate');
                if (newOm !== (ctx.cableCost.annualOm || 0)) {
                    costChanges.push(`Cable O&M: $${ctx.cableCost.annualOm || 0} → $${newOm}`);
                }
                nextCosts.cable.annualOm = newOm;
                nextCosts.cable.omRate = newOmRate;
                if (nextCosts.cableSegments?.length) {
                    nextCosts.cableSegments[0].annualOm = newOm;
                    nextCosts.cableSegments[0].omRate = newOmRate;
                }
            } else {
                const newCableMrc = readNumber(form, '#renew-cable-mrc');
                const newCableNrc = readNumber(form, '#renew-cable-nrc');
                if (newCableMrc !== (ctx.cableCost.mrc || 0)) {
                    costChanges.push(`Cable MRC: $${ctx.cableCost.mrc || 0} → $${newCableMrc}`);
                }
                if (newCableNrc > 0) {
                    costChanges.push(`Cable NRC: $${newCableNrc} (new)`);
                }
                nextCosts.cable.mrc = newCableMrc;
                nextCosts.cable.nrc = newCableNrc;
                if (nextCosts.cableSegments?.length) {
                    nextCosts.cableSegments[0].mrc = newCableMrc;
                    nextCosts.cableSegments[0].nrc = newCableNrc;
                }
            }
            costChanges.push(`Cable dates: ${newStart} → ${newEnd}`);

        } else if (item.key === 'bh-a') {
            const newMrc = readNumber(form, '#renew-bh-a-mrc');
            const newNrc = readNumber(form, '#renew-bh-a-nrc');
            if (newMrc !== (ctx.backhaulA.monthly || 0)) {
                costChanges.push(`BH-A: $${ctx.backhaulA.monthly || 0} → $${newMrc}`);
            }
            const existingAEnd = nextCosts.backhaul?.aEnd || {};
            nextCosts.backhaul = {
                ...(nextCosts.backhaul || {}),
                aEnd: { ...existingAEnd, monthly: newMrc, nrc: newNrc }
            };
            // Store per-cost dates at the backhaulA level
            if (!nextCosts.backhaulA) nextCosts.backhaulA = {};
            Object.assign(nextCosts.backhaulA, { startDate: newStart, termMonths: newTerm, endDate: newEnd });
            costChanges.push(`BH-A dates: ${newStart} → ${newEnd}`);

        } else if (item.key === 'bh-z') {
            const newMrc = readNumber(form, '#renew-bh-z-mrc');
            const newNrc = readNumber(form, '#renew-bh-z-nrc');
            if (newMrc !== (ctx.backhaulZ.monthly || 0)) {
                costChanges.push(`BH-Z: $${ctx.backhaulZ.monthly || 0} → $${newMrc}`);
            }
            const existingZEnd = nextCosts.backhaul?.zEnd || {};
            nextCosts.backhaul = {
                ...(nextCosts.backhaul || {}),
                zEnd: { ...existingZEnd, monthly: newMrc, nrc: newNrc }
            };
            if (!nextCosts.backhaulZ) nextCosts.backhaulZ = {};
            Object.assign(nextCosts.backhaulZ, { startDate: newStart, termMonths: newTerm, endDate: newEnd });
            costChanges.push(`BH-Z dates: ${newStart} → ${newEnd}`);

        } else if (item.key === 'xc-a') {
            const newMrc = readNumber(form, '#renew-xc-a-mrc');
            const newNrc = readNumber(form, '#renew-xc-a-nrc');
            if (newMrc !== (ctx.xcA.monthly || 0)) {
                costChanges.push(`XC-A: $${ctx.xcA.monthly || 0} → $${newMrc}`);
            }
            const existingXcAEnd = nextCosts.crossConnect?.aEnd || {};
            nextCosts.crossConnect = {
                ...(nextCosts.crossConnect || {}),
                aEnd: { ...existingXcAEnd, monthly: newMrc, nrc: newNrc }
            };
            if (!nextCosts.xcA) nextCosts.xcA = {};
            Object.assign(nextCosts.xcA, { startDate: newStart, termMonths: newTerm, endDate: newEnd });
            costChanges.push(`XC-A dates: ${newStart} → ${newEnd}`);

        } else if (item.key === 'xc-z') {
            const newMrc = readNumber(form, '#renew-xc-z-mrc');
            const newNrc = readNumber(form, '#renew-xc-z-nrc');
            if (newMrc !== (ctx.xcZ.monthly || 0)) {
                costChanges.push(`XC-Z: $${ctx.xcZ.monthly || 0} → $${newMrc}`);
            }
            const existingXcZEnd = nextCosts.crossConnect?.zEnd || {};
            nextCosts.crossConnect = {
                ...(nextCosts.crossConnect || {}),
                zEnd: { ...existingXcZEnd, monthly: newMrc, nrc: newNrc }
            };
            if (!nextCosts.xcZ) nextCosts.xcZ = {};
            Object.assign(nextCosts.xcZ, { startDate: newStart, termMonths: newTerm, endDate: newEnd });
            costChanges.push(`XC-Z dates: ${newStart} → ${newEnd}`);

        } else if (item.key === 'other') {
            const newMrc = readNumber(form, '#renew-other-mrc');
            const newNrc = readNumber(form, '#renew-other-nrc');
            if (newMrc !== (ctx.otherCosts.monthly || 0)) {
                costChanges.push(`Other: $${ctx.otherCosts.monthly || 0} → $${newMrc}`);
            }
            nextCosts.otherCosts = {
                ...(nextCosts.otherCosts || {}),
                monthly: newMrc,
                oneOff: newNrc
            };
            if (!nextCosts.other) nextCosts.other = {};
            Object.assign(nextCosts.other, { startDate: newStart, termMonths: newTerm, endDate: newEnd });
            costChanges.push(`Other dates: ${newStart} → ${newEnd}`);
        }
    }

    // Check if any cost was actually updated
    const hasChanges = costChanges.length > 0;
    return { nextCosts: hasChanges ? nextCosts : null, costChanges };
}
