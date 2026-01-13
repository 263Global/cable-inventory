/**
 * Suppliers Module
 * Supplier management functionality for CRM
 */

/**
 * Initializes supplier management methods and binds them to the App object
 * @param {Object} App - The main application object
 */
function initSuppliersModule(App) {

    App.renderSuppliers = function (filters = {}) {
        const searchQuery = filters.search || '';
        const currentPage = filters.page || 1;
        const ITEMS_PER_PAGE = 15;

        let data = window.Store.getSuppliers();

        // Search filter
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            data = data.filter(s =>
                (s.short_name || '').toLowerCase().includes(q) ||
                (s.full_name || '').toLowerCase().includes(q)
            );
        }

        // Pagination
        const totalItems = data.length;
        const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
        const page = Math.min(Math.max(1, currentPage), totalPages || 1);
        const startIndex = (page - 1) * ITEMS_PER_PAGE;
        const paginatedData = data.slice(startIndex, startIndex + ITEMS_PER_PAGE);

        // Add button to header
        const addBtn = document.createElement('button');
        addBtn.className = 'btn btn-primary';
        addBtn.innerHTML = '<ion-icon name="add-outline"></ion-icon> Add Supplier';
        addBtn.onclick = () => this.openSupplierModal();
        this.headerActions.appendChild(addBtn);

        const html = `
            <div class="filter-bar mb-4">
                <div class="search-box">
                    <ion-icon name="search-outline"></ion-icon>
                    <input type="text" id="supplier-search" class="form-control" placeholder="Search..." value="${searchQuery}">
                </div>
            </div>

            <div class="table-container">
                <table class="suppliers-table">
                    <thead>
                        <tr>
                            <th>Short Name</th>
                            <th class="mobile-hidden">Full Name</th>
                            <th class="mobile-hidden">Contact</th>
                            <th style="width: 100px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${paginatedData.length === 0 ? `
                            <tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding:2rem;">No suppliers found. Add your first supplier!</td></tr>
                        ` : paginatedData.map(s => `
                            <tr>
                                <td><strong>${s.short_name || ''}</strong></td>
                                <td class="mobile-hidden">${s.full_name || '-'}</td>
                                <td class="mobile-hidden">${s.contact_name || '-'}</td>
                                <td>
                                    <div class="flex gap-2">
                                        <button class="btn btn-icon" onclick="App.openSupplierModal('${s.id}')" title="Edit">
                                            <ion-icon name="create-outline"></ion-icon>
                                        </button>
                                        <button class="btn btn-icon" onclick="App.deleteSupplier('${s.id}')" title="Delete">
                                            <ion-icon name="trash-outline" style="color:var(--accent-danger)"></ion-icon>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            ${totalPages > 1 ? `
                <div class="pagination mt-4">
                    <button class="btn btn-secondary" ${page <= 1 ? 'disabled' : ''} onclick="App.renderSuppliers({search:'${searchQuery}',page:${page - 1}})">
                        <ion-icon name="chevron-back-outline"></ion-icon>
                    </button>
                    <span style="padding: 0 1rem;">Page ${page} of ${totalPages}</span>
                    <button class="btn btn-secondary" ${page >= totalPages ? 'disabled' : ''} onclick="App.renderSuppliers({search:'${searchQuery}',page:${page + 1}})">
                        <ion-icon name="chevron-forward-outline"></ion-icon>
                    </button>
                </div>
            ` : ''}
        `;
        this.container.innerHTML = html;

        // Bind search
        document.getElementById('supplier-search')?.addEventListener('input', (e) => {
            this.renderSuppliers({ search: e.target.value, page: 1 });
        });
    };

    App.openSupplierModal = function (supplierId = null) {
        const existing = supplierId ? window.Store.getSupplierById(supplierId) : null;
        const isEdit = !!existing;

        const modalHtml = `
            <div class="modal-backdrop" onclick="App.closeModal(event)">
                <div class="modal" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3>${isEdit ? 'Edit Supplier' : 'Add Supplier'}</h3>
                        <button class="btn btn-icon" onclick="App.closeModal()"><ion-icon name="close-outline"></ion-icon></button>
                    </div>
                    <div class="modal-body">
                        <form id="supplier-form">
                            <div class="form-group">
                                <label class="form-label">Short Name <span class="required-indicator">*</span></label>
                                <input type="text" name="shortName" class="form-control" value="${existing?.short_name || ''}" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Full Name <span class="required-indicator">*</span></label>
                                <input type="text" name="fullName" class="form-control" value="${existing?.full_name || ''}" placeholder="Company legal name" required>
                            </div>
                            <div class="grid-2">
                                <div class="form-group">
                                    <label class="form-label">Contact Name</label>
                                    <input type="text" name="contactName" class="form-control" value="${existing?.contact_name || ''}">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Contact Email</label>
                                    <input type="email" name="contactEmail" class="form-control" value="${existing?.contact_email || ''}">
                                </div>
                            </div>
                            <div class="grid-2">
                                <div class="form-group">
                                    <label class="form-label">Contact Phone</label>
                                    <input type="text" name="contactPhone" class="form-control" value="${existing?.contact_phone || ''}">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Portal URL</label>
                                    <input type="url" name="portalUrl" class="form-control" value="${existing?.portal_url || ''}" placeholder="https://...">
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Notes</label>
                                <textarea name="notes" class="form-control" rows="2">${existing?.notes || ''}</textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="App.saveSupplier('${supplierId || ''}')">${isEdit ? 'Save Changes' : 'Add Supplier'}</button>
                    </div>
                </div>
            </div>
        `;
        this.modalContainer.innerHTML = modalHtml;
    };

    App.saveSupplier = async function (supplierId) {
        const form = document.getElementById('supplier-form');
        const data = {
            shortName: form.querySelector('[name="shortName"]').value.trim(),
            fullName: form.querySelector('[name="fullName"]').value.trim(),
            contactName: form.querySelector('[name="contactName"]').value.trim(),
            contactEmail: form.querySelector('[name="contactEmail"]').value.trim(),
            contactPhone: form.querySelector('[name="contactPhone"]').value.trim(),
            portalUrl: form.querySelector('[name="portalUrl"]').value.trim(),
            notes: form.querySelector('[name="notes"]').value.trim()
        };

        if (!data.shortName || !data.fullName) {
            alert('Short Name and Full Name are required');
            return;
        }

        try {
            if (supplierId) {
                await window.Store.updateSupplier(supplierId, data);
            } else {
                await window.Store.addSupplier(data);
            }
            this.closeModal();
            this.renderSuppliers();
        } catch (err) {
            alert('Error saving supplier: ' + err.message);
        }
    };

    App.deleteSupplier = async function (supplierId) {
        if (!confirm('Are you sure you want to delete this supplier?')) return;
        try {
            await window.Store.deleteSupplier(supplierId);
            this.renderSuppliers();
        } catch (err) {
            alert('Error deleting supplier: ' + err.message);
        }
    };
}

// Export initializer to global scope
window.initSuppliersModule = initSuppliersModule;
