/**
 * Generic CRM module factory for Customers/Suppliers style CRUD pages.
 */

const { escapeHtml } = window.DomUtils;

const toSearchableText = (value) => String(value || '').toLowerCase();
const openImportModalWithFallback = (entityType) => {
    if (window.CsvImport?.openImportModal) {
        window.CsvImport.openImportModal(entityType);
        return;
    }
    alert('Import module unavailable. Please refresh and try again.');
};

export function initCrmEntityModule(App, config) {
    const {
        entityType,
        entityLabel,
        renderMethod,
        openModalMethod,
        saveMethod,
        deleteMethod,
        storeMethods,
        searchFields,
        searchPlaceholder,
        tableClassName,
        emptyMessage,
        columns,
        formId,
        itemsPerPage = 15,
        importEntityType = entityType,
        renderForm,
        readFormData,
        validateData,
        deleteConfirmMessage
    } = config;

    const stateKey = `_${entityType}ViewState`;
    const getState = () => App[stateKey] || { search: '', page: 1 };
    const setState = (nextState) => {
        App[stateKey] = nextState;
    };

    const getList = () => window.Store[storeMethods.list]();
    const getById = (id) => window.Store[storeMethods.getById](id);
    const addItem = (payload) => window.Store[storeMethods.add](payload);
    const updateItem = (id, payload) => window.Store[storeMethods.update](id, payload);
    const removeItem = (id) => window.Store[storeMethods.delete](id);

    const searchInputId = `${entityType}-search`;

    App[renderMethod] = function (filters = {}) {
        const prevState = getState();
        const searchQuery = typeof filters.search === 'string' ? filters.search : prevState.search;
        const requestedPage = Number.isFinite(filters.page) ? filters.page : prevState.page;

        let data = getList();
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            data = data.filter(item => searchFields.some(field => toSearchableText(item[field]).includes(q)));
        }

        const totalItems = data.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        const page = Math.min(Math.max(1, requestedPage || 1), totalPages || 1);
        const startIndex = (page - 1) * itemsPerPage;
        const paginatedData = data.slice(startIndex, startIndex + itemsPerPage);
        setState({ search: searchQuery, page });

        this.headerActions.innerHTML = '';

        const importBtn = document.createElement('button');
        importBtn.className = 'btn btn-secondary';
        importBtn.type = 'button';
        importBtn.innerHTML = '<ion-icon name="cloud-upload-outline"></ion-icon> Import';
        importBtn.addEventListener('click', () => openImportModalWithFallback(importEntityType));
        this.headerActions.appendChild(importBtn);

        const addBtn = document.createElement('button');
        addBtn.className = 'btn btn-primary';
        addBtn.type = 'button';
        addBtn.innerHTML = `<ion-icon name="add-outline"></ion-icon> Add ${escapeHtml(entityLabel)}`;
        addBtn.addEventListener('click', () => this[openModalMethod]());
        this.headerActions.appendChild(addBtn);

        const headerHtml = columns.map(col => {
            const classAttr = col.className ? ` class="${escapeHtml(col.className)}"` : '';
            const styleAttr = col.style ? ` style="${escapeHtml(col.style)}"` : '';
            return `<th${classAttr}${styleAttr}>${escapeHtml(col.label)}</th>`;
        }).join('');

        const rowsHtml = paginatedData.length === 0
            ? `<tr><td colspan="${columns.length + 1}" style="text-align:center; color:var(--text-muted); padding:2rem;">${escapeHtml(emptyMessage)}</td></tr>`
            : paginatedData.map(item => {
                const cells = columns.map(col => {
                    const classAttr = col.className ? ` class="${escapeHtml(col.className)}"` : '';
                    const dataLabelAttr = col.dataLabel ? ` data-label="${escapeHtml(col.dataLabel)}"` : '';
                    const rawValue = col.getValue(item);
                    const safeValue = escapeHtml(rawValue || '-');
                    const renderedValue = col.strong ? `<strong>${safeValue}</strong>` : safeValue;
                    return `<td${classAttr}${dataLabelAttr}>${renderedValue}</td>`;
                }).join('');

                const itemId = escapeHtml(item.id);
                return `
                    <tr>
                        ${cells}
                        <td>
                            <div class="flex gap-2">
                                <button type="button" class="btn btn-icon" data-action="edit" data-id="${itemId}" title="Edit">
                                    <ion-icon name="create-outline"></ion-icon>
                                </button>
                                <button type="button" class="btn btn-icon" data-action="delete" data-id="${itemId}" title="Delete">
                                    <ion-icon name="trash-outline" style="color:var(--accent-danger)"></ion-icon>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');

        this.container.innerHTML = `
            <div class="filter-bar mb-4">
                <div class="search-box">
                    <ion-icon name="search-outline"></ion-icon>
                    <input type="text" id="${escapeHtml(searchInputId)}" placeholder="${escapeHtml(searchPlaceholder)}" value="${escapeHtml(searchQuery)}">
                </div>
            </div>
            <div class="table-container">
                <table class="${escapeHtml(tableClassName)}">
                    <thead>
                        <tr>
                            ${headerHtml}
                            <th style="width: 100px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                </table>
            </div>
            ${totalPages > 1 ? `
                <div class="pagination mt-4">
                    <button type="button" class="btn btn-secondary" data-action="page" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''}>
                        <ion-icon name="chevron-back-outline"></ion-icon>
                    </button>
                    <span style="padding: 0 1rem;">Page ${page} of ${totalPages}</span>
                    <button type="button" class="btn btn-secondary" data-action="page" data-page="${page + 1}" ${page >= totalPages ? 'disabled' : ''}>
                        <ion-icon name="chevron-forward-outline"></ion-icon>
                    </button>
                </div>
            ` : ''}
        `;

        const searchInput = document.getElementById(searchInputId);
        searchInput?.addEventListener('input', (event) => {
            this[renderMethod]({ search: event.target.value, page: 1 });
        });

        this.container.querySelectorAll('[data-action="edit"]').forEach(btn => {
            btn.addEventListener('click', () => this[openModalMethod](btn.dataset.id || ''));
        });
        this.container.querySelectorAll('[data-action="delete"]').forEach(btn => {
            btn.addEventListener('click', () => this[deleteMethod](btn.dataset.id || ''));
        });
        this.container.querySelectorAll('[data-action="page"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const nextPage = Number(btn.dataset.page || '1');
                this[renderMethod]({ search: searchInput?.value || '', page: nextPage });
            });
        });
    };

    App[openModalMethod] = function (entityId = null) {
        const existing = entityId ? getById(entityId) : null;
        const isEdit = !!existing;

        this.modalContainer.innerHTML = `
            <div class="modal-backdrop" data-role="modal-backdrop">
                <div class="modal" data-role="modal-card">
                    <div class="modal-header">
                        <h3>${isEdit ? `Edit ${escapeHtml(entityLabel)}` : `Add ${escapeHtml(entityLabel)}`}</h3>
                        <button type="button" class="btn btn-icon" data-role="close-modal"><ion-icon name="close-outline"></ion-icon></button>
                    </div>
                    <div class="modal-body">
                        <form id="${escapeHtml(formId)}">
                            ${renderForm(existing)}
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-role="cancel-modal">Cancel</button>
                        <button type="button" class="btn btn-primary" data-role="save-modal">
                            ${isEdit ? 'Save Changes' : `Add ${escapeHtml(entityLabel)}`}
                        </button>
                    </div>
                </div>
            </div>
        `;

        const backdrop = this.modalContainer.querySelector('[data-role="modal-backdrop"]');
        const closeBtn = this.modalContainer.querySelector('[data-role="close-modal"]');
        const cancelBtn = this.modalContainer.querySelector('[data-role="cancel-modal"]');
        const saveBtn = this.modalContainer.querySelector('[data-role="save-modal"]');

        const close = () => this.closeModal();
        closeBtn?.addEventListener('click', close);
        cancelBtn?.addEventListener('click', close);
        backdrop?.addEventListener('click', (event) => {
            if (event.target === backdrop) close();
        });
        saveBtn?.addEventListener('click', () => this[saveMethod](entityId || ''));
    };

    App[saveMethod] = async function (entityId) {
        const form = document.getElementById(formId);
        if (!form) return;

        const payload = readFormData(form);
        const validationMessage = validateData(payload);
        if (validationMessage) {
            alert(validationMessage);
            return;
        }

        try {
            if (entityId) {
                await updateItem(entityId, payload);
            } else {
                await addItem(payload);
            }
            this.closeModal();
            const state = getState();
            this[renderMethod]({ search: state.search, page: 1 });
        } catch (err) {
            alert(`Error saving ${entityLabel.toLowerCase()}: ${err.message}`);
        }
    };

    App[deleteMethod] = async function (entityId) {
        if (!confirm(deleteConfirmMessage)) return;
        try {
            await removeItem(entityId);
            const state = getState();
            this[renderMethod](state);
        } catch (err) {
            alert(`Error deleting ${entityLabel.toLowerCase()}: ${err.message}`);
        }
    };
}
