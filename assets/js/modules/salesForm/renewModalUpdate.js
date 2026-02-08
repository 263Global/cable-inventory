/**
 * Renewal modal cost update builder.
 */

function readNumber(form, selector) {
    return parseFloat(form.querySelector(selector)?.value) || 0;
}

export function applyRenewalCostUpdates({ form, order, ctx, startDate, term, endDate }) {
    const costChanges = [];

    const costRenewBody = form.querySelector('#cost-renew-body');
    const costsWereEdited = costRenewBody && costRenewBody.style.display !== 'none';

    if (!costsWereEdited || !ctx.hasAnyCost) {
        return { nextCosts: null, costChanges };
    }

    const currentCosts = order.costs || {};
    const nextCosts = {
        ...currentCosts,
        backhaul: { ...(currentCosts.backhaul || {}) },
        crossConnect: { ...(currentCosts.crossConnect || {}) },
        otherCosts: { ...(currentCosts.otherCosts || {}) }
    };

    if (ctx.hasCableCost) {
        const cableSegmentsClone = ctx.cableSegments.map(seg => ({ ...seg }));
        nextCosts.cable = { ...(cableSegmentsClone[0] || currentCosts.cable || {}) };
        if (cableSegmentsClone.length) {
            cableSegmentsClone[0] = { ...nextCosts.cable };
        }
        nextCosts.cableSegments = cableSegmentsClone;

        nextCosts.cable.startDate = startDate;
        nextCosts.cable.termMonths = term;
        nextCosts.cable.endDate = endDate;
        if (nextCosts.cableSegments?.length) {
            nextCosts.cableSegments[0].startDate = startDate;
            nextCosts.cableSegments[0].termMonths = term;
            nextCosts.cableSegments[0].endDate = endDate;
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
            nextCosts.cable.mrc = newCableMrc;
            nextCosts.cable.nrc = newCableNrc;
            if (nextCosts.cableSegments?.length) {
                nextCosts.cableSegments[0].mrc = newCableMrc;
                nextCosts.cableSegments[0].nrc = newCableNrc;
            }
        }
    }

    if (ctx.hasBackhaulA) {
        const newBhAMrc = readNumber(form, '#renew-bh-a-mrc');
        const newBhANrc = readNumber(form, '#renew-bh-a-nrc');
        if (newBhAMrc !== (ctx.backhaulA.monthly || 0)) {
            costChanges.push(`BH-A: $${ctx.backhaulA.monthly || 0} → $${newBhAMrc}`);
        }
        const existingAEnd = nextCosts.backhaul?.aEnd || {};
        nextCosts.backhaul = {
            ...(nextCosts.backhaul || {}),
            aEnd: {
                ...existingAEnd,
                monthly: newBhAMrc,
                nrc: newBhANrc
            }
        };
    }

    if (ctx.hasBackhaulZ) {
        const newBhZMrc = readNumber(form, '#renew-bh-z-mrc');
        const newBhZNrc = readNumber(form, '#renew-bh-z-nrc');
        if (newBhZMrc !== (ctx.backhaulZ.monthly || 0)) {
            costChanges.push(`BH-Z: $${ctx.backhaulZ.monthly || 0} → $${newBhZMrc}`);
        }
        const existingZEnd = nextCosts.backhaul?.zEnd || {};
        nextCosts.backhaul = {
            ...(nextCosts.backhaul || {}),
            zEnd: {
                ...existingZEnd,
                monthly: newBhZMrc,
                nrc: newBhZNrc
            }
        };
    }

    if (ctx.hasXcA) {
        const newXcAMrc = readNumber(form, '#renew-xc-a-mrc');
        const newXcANrc = readNumber(form, '#renew-xc-a-nrc');
        if (newXcAMrc !== (ctx.xcA.monthly || 0)) {
            costChanges.push(`XC-A: $${ctx.xcA.monthly || 0} → $${newXcAMrc}`);
        }
        const existingXcAEnd = nextCosts.crossConnect?.aEnd || {};
        nextCosts.crossConnect = {
            ...(nextCosts.crossConnect || {}),
            aEnd: {
                ...existingXcAEnd,
                monthly: newXcAMrc,
                nrc: newXcANrc
            }
        };
    }

    if (ctx.hasXcZ) {
        const newXcZMrc = readNumber(form, '#renew-xc-z-mrc');
        const newXcZNrc = readNumber(form, '#renew-xc-z-nrc');
        if (newXcZMrc !== (ctx.xcZ.monthly || 0)) {
            costChanges.push(`XC-Z: $${ctx.xcZ.monthly || 0} → $${newXcZMrc}`);
        }
        const existingXcZEnd = nextCosts.crossConnect?.zEnd || {};
        nextCosts.crossConnect = {
            ...(nextCosts.crossConnect || {}),
            zEnd: {
                ...existingXcZEnd,
                monthly: newXcZMrc,
                nrc: newXcZNrc
            }
        };
    }

    if (ctx.hasOther) {
        const newOtherMrc = readNumber(form, '#renew-other-mrc');
        const newOtherNrc = readNumber(form, '#renew-other-nrc');
        if (newOtherMrc !== (ctx.otherCosts.monthly || 0)) {
            costChanges.push(`Other: $${ctx.otherCosts.monthly || 0} → $${newOtherMrc}`);
        }
        nextCosts.otherCosts = {
            ...(nextCosts.otherCosts || {}),
            monthly: newOtherMrc,
            oneOff: newOtherNrc
        };
    }

    return { nextCosts, costChanges };
}
