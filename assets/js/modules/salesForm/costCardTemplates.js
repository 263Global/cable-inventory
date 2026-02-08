/**
 * Sales form cost card templates.
 */

import { cableCostCardTemplate } from './costCardTemplates/cableTemplate.js';
import { backhaulACostCardTemplate } from './costCardTemplates/backhaulATemplate.js';
import { backhaulZCostCardTemplate } from './costCardTemplates/backhaulZTemplate.js';
import { xcACostCardTemplate } from './costCardTemplates/xcATemplate.js';
import { xcZCostCardTemplate } from './costCardTemplates/xcZTemplate.js';
import { otherCostCardTemplate } from './costCardTemplates/otherTemplate.js';

export const costCardTemplates = {
    cable: cableCostCardTemplate,
    backhaulA: backhaulACostCardTemplate,
    backhaulZ: backhaulZCostCardTemplate,
    xcA: xcACostCardTemplate,
    xcZ: xcZCostCardTemplate,
    other: otherCostCardTemplate
};
