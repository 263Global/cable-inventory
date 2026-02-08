/**
 * Sales form shared listeners: status/date, annual O&M, and anchor navigation.
 */

const { computeSalesStatus } = window.SalesStatus;

export function initSalesFormMetaListeners(context, { updateCostTotals }) {
    // ===== Status Auto-calc =====
    const startDateInput = document.getElementById('sales-start-date');
    const termInput = document.getElementById('sales-term');
    const endDateInput = document.getElementById('sales-end-date');
    const statusDisplay = document.getElementById('sales-status-display');

    const calculateEndDate = () => {
        if (!startDateInput.value || !termInput.value) return;
        const start = new Date(startDateInput.value);
        const months = parseInt(termInput.value) || 0;
        const end = new Date(start);
        end.setMonth(end.getMonth() + months);
        end.setDate(end.getDate() - 1); // End date is the last day of the term
        endDateInput.value = end.toISOString().split('T')[0];
        updateStatus();
    };

    const updateStatus = () => {
        if (!startDateInput.value || !endDateInput.value) return;
        statusDisplay.value = computeSalesStatus(startDateInput.value, endDateInput.value);
    };

    if (startDateInput && termInput && endDateInput) {
        startDateInput.addEventListener('change', calculateEndDate);
        termInput.addEventListener('input', calculateEndDate);
        termInput.addEventListener('input', () => updateCostTotals());
    }

    // ===== IRU Revenue: Auto-calculate Annual O&M Fee =====
    const salesOtc = document.getElementById('sales-otc');
    const salesOmRate = document.getElementById('sales-om-rate');
    const salesAnnualOm = document.getElementById('sales-annual-om');

    const calculateAnnualOm = () => {
        if (salesOtc && salesOmRate && salesAnnualOm) {
            const otc = Number(salesOtc.value) || 0;
            const rate = Number(salesOmRate.value) || 0;
            salesAnnualOm.value = (otc * rate / 100).toFixed(2);
        }
    };

    if (salesOtc && salesOmRate) {
        salesOtc.addEventListener('input', calculateAnnualOm);
        salesOmRate.addEventListener('input', calculateAnnualOm);
    }

    // Real-time Financial Calculation (for non-dynamic inputs)
    const calcTriggers = document.querySelectorAll('.calc-trigger');
    calcTriggers.forEach(input => {
        input.addEventListener('input', () => context.calculateSalesFinancials());
    });

    // ===== Anchor Navigation =====
    const anchorNav = document.getElementById('sales-anchor-nav');
    if (anchorNav) {
        const anchorItems = anchorNav.querySelectorAll('.anchor-nav-item');
        const modalBody = document.querySelector('.modal-body');

        // Click handler for anchor navigation
        anchorItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = item.dataset.target;
                const targetSection = document.getElementById(targetId);

                if (targetSection && modalBody) {
                    // Calculate offset within modal body
                    const modalBodyRect = modalBody.getBoundingClientRect();
                    const targetRect = targetSection.getBoundingClientRect();
                    const scrollOffset = targetRect.top - modalBodyRect.top + modalBody.scrollTop - 60;

                    modalBody.scrollTo({
                        top: scrollOffset,
                        behavior: 'smooth'
                    });

                    // Update active states
                    anchorItems.forEach(nav => nav.classList.remove('active'));
                    item.classList.add('active');
                }
            });
        });

        // Scroll spy - highlight current section on scroll
        if (modalBody) {
            const sections = ['section-sales-info', 'section-location', 'section-revenue', 'section-costs', 'section-notes'];

            modalBody.addEventListener('scroll', () => {
                const modalBodyRect = modalBody.getBoundingClientRect();
                let currentSection = sections[0];

                sections.forEach(sectionId => {
                    const section = document.getElementById(sectionId);
                    if (section) {
                        const sectionRect = section.getBoundingClientRect();
                        // If section top is within viewport upper half, mark it as current
                        if (sectionRect.top <= modalBodyRect.top + 150) {
                            currentSection = sectionId;
                        }
                    }
                });

                // Update active nav item
                anchorItems.forEach(nav => {
                    nav.classList.toggle('active', nav.dataset.target === currentSection);
                });
            });
        }
    }
}
