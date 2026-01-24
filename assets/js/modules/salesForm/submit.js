/**
 * Sales form submission handling.
 */

const { computeSalesStatus } = window.SalesStatus;

export async function handleSalesSubmit(context, form) {
    // Validate form before processing
    if (!validateSalesForm(form)) {
        return false; // Prevent submission
    }

    // Collect Data
    const formData = new FormData(form);
    const getVal = (name) => form.querySelector(`[name="${name}"]`)?.value;
    const getNum = (name) => Number(getVal(name) || 0);

    // Check if we're editing an existing order
    const isEditMode = !!context._editingOrderId;

    // Calculate Status to ensure it's accurate at save time
    const status = computeSalesStatus(getVal('dates.start'), getVal('dates.end'));

    const orderData = {
        salesOrderId: isEditMode ? context._editingOrderId : (getVal('orderId') || null),
        customerId: getVal('customerId'),
        customerName: window.Store.getCustomerById(getVal('customerId'))?.short_name || '',
        inventoryLink: getVal('inventoryLink'),
        status: status,
        capacity: {
            value: getNum('capacity.value'),
            unit: getVal('capacity.unit')
        },
        salesperson: getVal('salesperson'),
        salesModel: getVal('salesModel'),
        salesType: getVal('salesType'),
        location: {
            aEnd: {
                city: getVal('location.aEnd.city'),
                pop: getVal('location.aEnd.pop')
            },
            zEnd: {
                city: getVal('location.zEnd.city'),
                pop: getVal('location.zEnd.pop')
            }
        },
        dates: {
            start: getVal('dates.start'),
            term: getNum('dates.term'),
            end: getVal('dates.end')
        },
        financials: {
            // Lease fields
            mrcSales: getNum('financials.mrcSales'),
            nrcSales: getNum('financials.nrcSales'),
            // IRU fields
            otc: getNum('financials.otc'),
            omRate: getNum('financials.omRate'),
            annualOm: getNum('financials.annualOm')
            // Computed fields will be added below
        },
        costs: {
            cable: {
                supplier: getVal('costs.cable.supplier'),
                orderNo: getVal('costs.cable.orderNo'),
                cableSystem: getVal('costs.cable.cableSystem'),
                capacity: getNum('costs.cable.capacity'),
                capacityUnit: getVal('costs.cable.capacityUnit'),
                model: getVal('costs.cable.model'),
                protection: getVal('costs.cable.protection'),
                protectionCableSystem: getVal('costs.cable.protectionCableSystem'),
                // Lease fields
                mrc: getNum('costs.cable.mrc'),
                nrc: getNum('costs.cable.nrc'),
                // IRU fields
                otc: getNum('costs.cable.otc'),
                omRate: getNum('costs.cable.omRate'),
                annualOm: getNum('costs.cable.annualOm'),
                // Contract dates
                startDate: getVal('costs.cable.startDate'),
                termMonths: getNum('costs.cable.termMonths'),
                endDate: getVal('costs.cable.endDate')
            },
            backhaul: {
                aEnd: {
                    supplier: getVal('costs.backhaulA.supplier'),
                    model: getVal('costs.backhaulA.model') || 'Lease',
                    monthly: getNum('costs.backhaul.aEnd.monthly'),
                    nrc: getNum('costs.backhaul.aEnd.nrc'),
                    otc: getNum('costs.backhaulA.otc'),
                    annualOm: getNum('costs.backhaulA.annualOm'),
                    termMonths: getNum('costs.backhaulA.termMonths'),
                    startDate: getVal('costs.backhaulA.startDate'),
                    endDate: getVal('costs.backhaulA.endDate')
                },
                zEnd: {
                    supplier: getVal('costs.backhaulZ.supplier'),
                    model: getVal('costs.backhaulZ.model') || 'Lease',
                    monthly: getNum('costs.backhaul.zEnd.monthly'),
                    nrc: getNum('costs.backhaul.zEnd.nrc'),
                    otc: getNum('costs.backhaulZ.otc'),
                    annualOm: getNum('costs.backhaulZ.annualOm'),
                    termMonths: getNum('costs.backhaulZ.termMonths'),
                    startDate: getVal('costs.backhaulZ.startDate'),
                    endDate: getVal('costs.backhaulZ.endDate')
                }
            },
            crossConnect: {
                aEnd: {
                    supplier: getVal('costs.xcA.supplier'),
                    monthly: getNum('costs.crossConnect.aEnd.monthly'),
                    nrc: getNum('costs.crossConnect.aEnd.nrc')
                },
                zEnd: {
                    supplier: getVal('costs.xcZ.supplier'),
                    monthly: getNum('costs.crossConnect.zEnd.monthly'),
                    nrc: getNum('costs.crossConnect.zEnd.nrc')
                }
            },
            otherCosts: {
                description: getVal('costs.otherCosts.description'),
                supplier: getVal('costs.other.supplier'),
                oneOff: getNum('costs.otherCosts.oneOff'),
                monthly: getNum('costs.otherCosts.monthly')
            }
        },
        notes: getVal('notes') || ''
    };

    // Calculate and store financial metrics using unified engine
    const computed = computeOrderFinancials(orderData);
    orderData.financials.marginPercent = computed.marginPercent;
    orderData.financials.monthlyProfit = computed.monthlyProfit;

    // Store IRU Resale specific metrics
    if (computed.isIruResale) {
        orderData.financials.firstMonthProfit = computed.firstMonthProfit;
        orderData.financials.firstMonthMargin = computed.firstMonthMargin;
        orderData.financials.recurringMargin = computed.recurringMargin;
    }

    // Use update or add based on edit mode
    if (isEditMode) {
        await window.Store.updateSalesOrder(context._editingOrderId, orderData);
    } else {
        await window.Store.addSalesOrder(orderData);
    }

    // Clear edit mode tracking
    context._editingOrderId = null;

    context.renderView('sales');
}

/**
 * Open a renewal modal for the given sales order.
 * Allows user to set new start date and term, keeping the same order ID.
 */
