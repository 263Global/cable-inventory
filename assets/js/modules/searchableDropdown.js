/**
 * Searchable Dropdown Component
 * A reusable dropdown with search/filter functionality
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
        <div class="searchable-dropdown-option ${opt.value === selectedValue ? 'selected' : ''}" 
             data-value="${opt.value}" 
             data-label="${opt.label}"
             data-search="${(opt.label + ' ' + (opt.subtitle || '')).toLowerCase()}">
            <span class="option-text">
                ${opt.label}
                ${opt.subtitle ? `<span class="option-subtitle">${opt.subtitle}</span>` : ''}
            </span>
        </div>
    `).join('');

    // Using inline style to ensure hidden by default
    return `
        <div class="searchable-dropdown" id="${id}-container">
            <input type="hidden" name="${name}" id="${id}" value="${selectedValue}">
            <div class="searchable-dropdown-trigger" data-dropdown-id="${id}">
                <span class="selected-text ${isPlaceholder ? 'placeholder' : ''}">${displayText}</span>
                <ion-icon name="chevron-down-outline"></ion-icon>
            </div>
            <div class="searchable-dropdown-menu" style="display: none;">
                <div class="searchable-dropdown-search">
                    <ion-icon name="search-outline"></ion-icon>
                    <input type="text" placeholder="搜索..." data-search-input="${id}">
                </div>
                <div class="searchable-dropdown-options">
                    ${optionsHtml || '<div class="searchable-dropdown-empty">No options available</div>'}
                </div>
            </div>
        </div>
    `;
}

/**
 * Initialize searchable dropdown functionality
 * Call this after the dropdown HTML is rendered in the DOM
 * @param {string} containerId - The container ID (e.g., 'supplier-dropdown-container')
 */
export function initSearchableDropdown(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const trigger = container.querySelector('.searchable-dropdown-trigger');
    const menu = container.querySelector('.searchable-dropdown-menu');
    const searchInput = container.querySelector('.searchable-dropdown-search input');
    const hiddenInput = container.querySelector('input[type="hidden"]');
    const options = container.querySelectorAll('.searchable-dropdown-option');

    if (!trigger || !menu) return;

    // Helper to close dropdown
    const closeDropdown = () => {
        menu.style.display = 'none';
        trigger.classList.remove('active');
    };

    // Helper to open dropdown
    const openDropdown = () => {
        // Close all other dropdowns first
        document.querySelectorAll('.searchable-dropdown-menu').forEach(m => {
            if (m !== menu) {
                m.style.display = 'none';
                m.closest('.searchable-dropdown')?.querySelector('.searchable-dropdown-trigger')?.classList.remove('active');
            }
        });

        menu.style.display = 'block';
        trigger.classList.add('active');
        setTimeout(() => searchInput?.focus(), 50);
    };

    // Toggle dropdown on trigger click
    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        if (menu.style.display === 'none' || menu.style.display === '') {
            openDropdown();
        } else {
            closeDropdown();
        }
    });

    // Search functionality
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            let visibleCount = 0;

            options.forEach(opt => {
                const searchText = opt.dataset.search || '';
                const matches = !query || searchText.includes(query);
                opt.style.display = matches ? '' : 'none';
                if (matches) visibleCount++;
            });

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

        // Prevent dropdown close when clicking search
        searchInput.addEventListener('click', (e) => e.stopPropagation());
    }

    // Option selection
    options.forEach(opt => {
        opt.addEventListener('click', (e) => {
            e.stopPropagation();
            const value = opt.dataset.value;
            const label = opt.dataset.label;

            // Update hidden input
            if (hiddenInput) {
                hiddenInput.value = value;
                // Trigger change event for any listeners
                hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
            }

            // Update display text
            const selectedText = trigger.querySelector('.selected-text');
            if (selectedText) {
                selectedText.textContent = label;
                selectedText.classList.remove('placeholder');
            }

            // Update selected state
            options.forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');

            // Close dropdown
            closeDropdown();

            // Clear search and reset options visibility
            if (searchInput) {
                searchInput.value = '';
                options.forEach(o => o.style.display = '');
            }
        });
    });

    // Close on outside click
    const closeHandler = (e) => {
        if (!container.contains(e.target)) {
            closeDropdown();
        }
    };
    document.addEventListener('click', closeHandler);

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
