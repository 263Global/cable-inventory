export function attachInventoryFormListeners() {
    const step1 = document.getElementById('inventory-step-1');
    const step2 = document.getElementById('inventory-step-2');
    const step3 = document.getElementById('inventory-step-3');
    const stepper = document.getElementById('inventory-stepper');

    const goToStep = (stepNum) => {
        [step1, step2, step3].forEach(s => { if (s) s.style.display = 'none'; });

        const targetStep = document.getElementById(`inventory-step-${stepNum}`);
        if (targetStep) {
            targetStep.style.display = 'block';
            targetStep.classList.remove('form-step');
            void targetStep.offsetWidth;
            targetStep.classList.add('form-step');
        }

        if (stepper) {
            stepper.querySelectorAll('.step').forEach(stepEl => {
                const sNum = parseInt(stepEl.dataset.step, 10);
                stepEl.classList.remove('active', 'completed');
                if (sNum < stepNum) stepEl.classList.add('completed');
                if (sNum === stepNum) stepEl.classList.add('active');
            });
            stepper.querySelectorAll('.step-connector').forEach((conn, idx) => {
                conn.classList.toggle('active', idx < stepNum - 1);
            });
        }

        const modalBody = document.querySelector('.modal-body');
        if (modalBody) modalBody.scrollTop = 0;
    };

    document.getElementById('step-next-1')?.addEventListener('click', () => goToStep(2));
    document.getElementById('step-prev-2')?.addEventListener('click', () => goToStep(1));
    document.getElementById('step-next-2')?.addEventListener('click', () => goToStep(3));
    document.getElementById('step-prev-3')?.addEventListener('click', () => goToStep(2));

    const copyToZEndBtn = document.getElementById('copy-to-zend');
    if (copyToZEndBtn) {
        copyToZEndBtn.addEventListener('click', () => {
            ['country', 'city', 'pop'].forEach(field => {
                const aVal = document.querySelector(`[name="location.aEnd.${field}"]`)?.value || '';
                const zInput = document.querySelector(`[name="location.zEnd.${field}"]`);
                if (zInput) zInput.value = aVal;
            });
        });
    }

    const protectionSelect = document.querySelector('[name="protection"]');
    const protectionContainer = document.getElementById('protection-cable-container');
    if (protectionSelect && protectionContainer) {
        protectionSelect.addEventListener('change', (e) => {
            protectionContainer.style.display = e.target.value === 'Protected' ? 'block' : 'none';
        });
    }

    const ownershipSelect = document.querySelector('[name="acquisition.ownership"]');
    const omRateContainer = document.getElementById('om-rate-container');
    const mrcContainer = document.getElementById('mrc-container');
    const otcLabel = document.getElementById('otc-label');
    if (ownershipSelect && omRateContainer) {
        ownershipSelect.addEventListener('change', (e) => {
            const isIRU = e.target.value === 'IRU';
            const showOm = ['IRU', 'Owned'].includes(e.target.value);
            omRateContainer.style.display = showOm ? 'block' : 'none';
            if (mrcContainer) {
                mrcContainer.style.display = isIRU ? 'none' : 'block';
            }
            if (otcLabel) {
                otcLabel.textContent = isIRU ? 'OTC ($)' : 'NRC ($)';
            }
        });
    }

    const handoffSelect = document.querySelector('[name="handoffType"]');
    const handoffCustomContainer = document.getElementById('handoff-type-custom-container');
    if (handoffSelect && handoffCustomContainer) {
        handoffSelect.addEventListener('change', (e) => {
            handoffCustomContainer.style.display = e.target.value === 'Other' ? 'block' : 'none';
        });
    }

    const startDateInput = document.getElementById('start-date-input');
    const termInput = document.getElementById('term-input');
    const endDateInput = document.getElementById('end-date-input');

    const calculateEndDate = () => {
        if (!startDateInput || !termInput || !endDateInput) return;
        const startVal = startDateInput.value;
        const termVal = parseInt(termInput.value, 10);
        if (!startVal || termVal <= 0) return;

        const startDate = new Date(startVal);
        startDate.setMonth(startDate.getMonth() + termVal);
        startDate.setDate(startDate.getDate() - 1);
        const year = startDate.getFullYear();
        const month = String(startDate.getMonth() + 1).padStart(2, '0');
        const day = String(startDate.getDate()).padStart(2, '0');
        endDateInput.value = `${year}-${month}-${day}`;
    };

    if (startDateInput && termInput) {
        startDateInput.addEventListener('change', calculateEndDate);
        termInput.addEventListener('input', calculateEndDate);
    }

    const otcInput = document.querySelector('[name="financials.otc"]');
    const omRateInput = document.getElementById('om-rate-input');
    const annualOmCostInput = document.getElementById('annual-om-cost');

    const calculateOmCost = () => {
        if (!otcInput || !omRateInput || !annualOmCostInput) return;
        const otcVal = parseFloat(otcInput.value) || 0;
        const omRateVal = parseFloat(omRateInput.value) || 0;
        annualOmCostInput.value = (otcVal * omRateVal / 100).toFixed(2);
    };

    if (otcInput && omRateInput) {
        otcInput.addEventListener('input', calculateOmCost);
        omRateInput.addEventListener('input', calculateOmCost);
    }
}
