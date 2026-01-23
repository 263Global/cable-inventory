/**
 * Searchable Dropdown Component
 * A reusable dropdown with search/filter functionality
 * Design: Input-style trigger, click to show options with search
 */

/**
 * Render a searchable dropdown HTML
 * @param {Object} config - Configuration options
 * @param {string} config.name - Hidden input name for form submission
 * @param {string} config.id - Unique ID for the dropdown
 * @param {Array} config.options - Array of {value, label, subtitle?} objects
 * @param {string} config.selectedValue - Currently selected value
 * @param {string} config.placeholder - Placeholder text when nothing selected
 * @returns {string} HTML string for the dropdown
 */
export function renderSearchableDropdown(config) {
    const escapeHtml = (str) => {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    };

    const {
        name,
        id,
        options = [],
        selectedValue = '',
        placeholder = 'Select...'
    } = config;

    const selectedOption = options.find(opt => opt.value === selectedValue);
    const displayText = selectedOption ? selectedOption.label : '';
    const isPlaceholder = !selectedOption;

    const optionsHtml = options.map(opt => {
        const safeValue = escapeHtml(opt.value);
        const safeLabel = escapeHtml(opt.label);
        const safeSubtitle = escapeHtml(opt.subtitle || '');
        const safeSearch = escapeHtml((opt.label + ' ' + (opt.subtitle || '')).toLowerCase());

        return `
        <div class="searchable-dropdown-option ${opt.value === selectedValue ? 'selected' : ''}" 
             data-value="${safeValue}" 
             data-label="${safeLabel}"
             data-search="${safeSearch}">
            <span class="option-label">${safeLabel}</span>
            ${opt.subtitle ? `<span class="option-subtitle">${safeSubtitle}</span>` : ''}
        </div>
    `;
    }).join('');

    return `
        <div class="searchable-dropdown" id="${id}-container">
            <input type="hidden" name="${name}" id="${id}" value="${escapeHtml(selectedValue)}">
            <div class="searchable-dropdown-input-wrapper">
                <input type="text" 
                       class="form-control searchable-dropdown-input" 
                       placeholder="${escapeHtml(placeholder)}"
                       value="${escapeHtml(displayText)}"
                       data-selected-value="${escapeHtml(selectedValue)}"
                       autocomplete="off">
                <ion-icon name="chevron-down-outline" class="dropdown-arrow"></ion-icon>
            </div>
            <div class="searchable-dropdown-menu" style="display: none;">
                <div class="searchable-dropdown-options">
                    ${optionsHtml || '<div class="searchable-dropdown-empty">No options available</div>'}
                </div>
            </div>
        </div>
    `;
}

/**
 * Initialize searchable dropdown functionality
 * @param {string} containerId - The container ID (e.g., 'supplier-dropdown-container')
 */
export function initSearchableDropdown(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const inputWrapper = container.querySelector('.searchable-dropdown-input-wrapper');
    const input = container.querySelector('.searchable-dropdown-input');
    const menu = container.querySelector('.searchable-dropdown-menu');
    const hiddenInput = container.querySelector('input[type="hidden"]');
    const options = container.querySelectorAll('.searchable-dropdown-option');
    const arrow = container.querySelector('.dropdown-arrow');

    if (!input || !menu) return;

    let originalValue = input.value;

    // Helper to close dropdown
    const closeDropdown = () => {
        menu.style.display = 'none';
        inputWrapper.classList.remove('active');
        // Restore display text if nothing was selected
        const currentHiddenVal = hiddenInput?.value || '';
        if (currentHiddenVal) {
            const selectedOpt = Array.from(options).find(o => o.dataset.value === currentHiddenVal);
            if (selectedOpt) {
                input.value = selectedOpt.dataset.label;
            }
        } else {
            input.value = '';
        }
        // Reset filter
        options.forEach(o => o.style.display = '');
    };

    // Helper to open dropdown
    const openDropdown = () => {
        // Close all other dropdowns first
        document.querySelectorAll('.searchable-dropdown-menu').forEach(m => {
            if (m !== menu) {
                m.style.display = 'none';
                m.closest('.searchable-dropdown')?.querySelector('.searchable-dropdown-input-wrapper')?.classList.remove('active');
            }
        });

        menu.style.display = 'block';
        inputWrapper.classList.add('active');
        originalValue = input.value;
        input.select(); // Select all text for easy replacement
    };

    // Open on input click
    input.addEventListener('click', (e) => {
        e.stopPropagation();
        if (menu.style.display === 'none') {
            openDropdown();
        }
    });

    // Also open when clicking the arrow
    arrow?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (menu.style.display === 'none') {
            openDropdown();
        } else {
            closeDropdown();
        }
    });

    // Search/filter on input
    input.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        let visibleCount = 0;

        options.forEach(opt => {
            const searchText = opt.dataset.search || '';
            const matches = !query || searchText.includes(query);
            opt.style.display = matches ? '' : 'none';
            if (matches) visibleCount++;
        });

        // Make sure dropdown is open when typing
        if (menu.style.display === 'none') {
            openDropdown();
        }

        // Show empty message if no results
        let emptyMsg = container.querySelector('.searchable-dropdown-empty');
        if (visibleCount === 0) {
            if (!emptyMsg) {
                emptyMsg = document.createElement('div');
                emptyMsg.className = 'searchable-dropdown-empty';
                emptyMsg.textContent = '未找到匹配项';
                container.querySelector('.searchable-dropdown-options').appendChild(emptyMsg);
            }
            emptyMsg.style.display = 'block';
        } else if (emptyMsg) {
            emptyMsg.style.display = 'none';
        }
    });

    // Option selection
    options.forEach(opt => {
        opt.addEventListener('click', (e) => {
            e.stopPropagation();
            const value = opt.dataset.value;
            const label = opt.dataset.label;

            // Update hidden input
            if (hiddenInput) {
                hiddenInput.value = value;
                hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
            }

            // Update display text
            input.value = label;
            input.dataset.selectedValue = value;

            // Update selected state
            options.forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');

            // Close dropdown
            closeDropdown();
        });
    });

    // Close on outside click
    const closeHandler = (e) => {
        if (!container.contains(e.target)) {
            closeDropdown();
        }
    };
    document.addEventListener('click', closeHandler);

    // Handle escape key
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeDropdown();
            input.blur();
        }
    });

    // Store cleanup function
    container._cleanupDropdown = () => {
        document.removeEventListener('click', closeHandler);
    };
}

/**
 * Initialize all searchable dropdowns in a container
 * @param {HTMLElement|string} parentElement - Parent element or selector
 */
export function initAllSearchableDropdowns(parentElement) {
    const parent = typeof parentElement === 'string'
        ? document.querySelector(parentElement)
        : parentElement || document;

    const containers = parent.querySelectorAll('.searchable-dropdown');
    containers.forEach(container => {
        if (container.id) {
            initSearchableDropdown(container.id);
        }
    });
}

/**
 * Render a simple dropdown (no search) - for static options like Status, Sales Model, etc.
 * @param {Object} config - Configuration options
 * @param {string} config.name - Hidden input name for form submission
 * @param {string} config.id - Unique ID for the dropdown
 * @param {Array} config.options - Array of {value, label} objects
 * @param {string} config.selectedValue - Currently selected value
 * @param {string} config.placeholder - Placeholder text when nothing selected
 * @returns {string} HTML string for the dropdown
 */
export function renderSimpleDropdown(config) {
    const {
        name,
        id,
        options = [],
        selectedValue = '',
        placeholder = 'Select...'
    } = config;

    const selectedOption = options.find(opt => opt.value === selectedValue);
    const displayText = selectedOption ? selectedOption.label : placeholder;
    const isPlaceholder = !selectedOption;

    const optionsHtml = options.map(opt => `
        <div class="simple-dropdown-option ${opt.value === selectedValue ? 'selected' : ''}" 
             data-value="${opt.value}" 
             data-label="${opt.label}">
            ${opt.label}
        </div>
    `).join('');

    return `
        <div class="simple-dropdown" id="${id}-container">
            <input type="hidden" name="${name}" id="${id}" value="${selectedValue}">
            <div class="simple-dropdown-trigger ${isPlaceholder ? 'placeholder' : ''}">
                <span class="simple-dropdown-text">${displayText}</span>
                <ion-icon name="chevron-down-outline" class="dropdown-arrow"></ion-icon>
            </div>
            <div class="simple-dropdown-menu" style="display: none;">
                ${optionsHtml || '<div class="simple-dropdown-empty">No options</div>'}
            </div>
        </div>
    `;
}

/**
 * Initialize simple dropdown functionality
 * @param {string} containerId - The container ID
 */
export function initSimpleDropdown(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const trigger = container.querySelector('.simple-dropdown-trigger');
    const textEl = container.querySelector('.simple-dropdown-text');
    const menu = container.querySelector('.simple-dropdown-menu');
    const hiddenInput = container.querySelector('input[type=\"hidden\"]');
    const options = container.querySelectorAll('.simple-dropdown-option');
    const arrow = container.querySelector('.dropdown-arrow');

    if (!trigger || !menu) return;

    // Toggle dropdown
    const toggleDropdown = (e) => {
        e.stopPropagation();

        // Close all other dropdowns first
        document.querySelectorAll('.simple-dropdown-menu, .searchable-dropdown-menu').forEach(m => {
            if (m !== menu) {
                m.style.display = 'none';
                m.closest('.simple-dropdown, .searchable-dropdown')?.querySelector('.simple-dropdown-trigger, .searchable-dropdown-input-wrapper')?.classList.remove('active');
            }
        });

        if (menu.style.display === 'none') {
            menu.style.display = 'block';
            trigger.classList.add('active');
        } else {
            menu.style.display = 'none';
            trigger.classList.remove('active');
        }
    };

    trigger.addEventListener('click', toggleDropdown);

    // Option selection
    options.forEach(opt => {
        opt.addEventListener('click', (e) => {
            e.stopPropagation();
            const value = opt.dataset.value;
            const label = opt.dataset.label;

            // Update hidden input
            if (hiddenInput) {
                hiddenInput.value = value;
                hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
            }

            // Update display text
            textEl.textContent = label;
            trigger.classList.remove('placeholder');

            // Update selected state
            options.forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');

            // Close dropdown
            menu.style.display = 'none';
            trigger.classList.remove('active');
        });
    });

    // Close on outside click
    const closeHandler = (e) => {
        if (!container.contains(e.target)) {
            menu.style.display = 'none';
            trigger.classList.remove('active');
        }
    };
    document.addEventListener('click', closeHandler);

    // Store cleanup function
    container._cleanupDropdown = () => {
        document.removeEventListener('click', closeHandler);
    };
}

/**
 * Initialize all simple dropdowns in a container
 * @param {HTMLElement|string} parentElement - Parent element or selector
 */
export function initAllSimpleDropdowns(parentElement) {
    const parent = typeof parentElement === 'string'
        ? document.querySelector(parentElement)
        : parentElement || document;

    const containers = parent.querySelectorAll('.simple-dropdown');
    containers.forEach(container => {
        if (container.id) {
            initSimpleDropdown(container.id);
        }
    });
}
