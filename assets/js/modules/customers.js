/**
 * Customers Module
 * Customer management functionality for CRM
 */

/**
 * Initializes customer management methods and binds them to the App object
 * @param {Object} App - The main application object
 */
function initCustomersModule(App) {

    App.renderCustomers = function (filters = {}) {
        const searchQuery = filters.search || '';
        const currentPage = filters.page || 1;
        const ITEMS_PER_PAGE = 15;

        let data = window.Store.getCustomers();

        // Search filter
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            data = data.filter(c =>
                (c.short_name || '').toLowerCase().includes(q) ||
                (c.full_name || '').toLowerCase().includes(q) ||
                (c.contact_email || '').toLowerCase().includes(q)
            );
        }

        // Pagination
        const totalItems = data.length;
        const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
        const page = Math.min(Math.max(1, currentPage), totalPages || 1);
        const startIndex = (page - 1) * ITEMS_PER_PAGE;
        const paginatedData = data.slice(startIndex, startIndex + ITEMS_PER_PAGE);

        // Clear and add button to header
        this.headerActions.innerHTML = '';
        const addBtn = document.createElement('button');
        addBtn.className = 'btn btn-primary';
        addBtn.innerHTML = '<ion-icon name="add-outline"></ion-icon> Add Customer';
        addBtn.onclick = () => this.openCustomerModal();
        this.headerActions.appendChild(addBtn);

        const html = `
            <div class="filter-bar mb-4">
                <div class="search-box">
                    <ion-icon name="search-outline"></ion-icon>
                    <input type="text" id="customer-search" placeholder="Search by name or email..." value="${searchQuery}">
                </div>
            </div>

            <div class="table-container">
                <table class="customers-table">
                    <thead>
                        <tr>
                            <th>Short Name</th>
                            <th class="mobile-hidden">Full Name</th>
                            <th class="mobile-hidden">Contact</th>
                            <th class="mobile-hidden">Email</th>
                            <th style="width: 100px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${paginatedData.length === 0 ? `
                            <tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:2rem;">No customers found. Add your first customer!</td></tr>
                        ` : paginatedData.map(c => `
                            <tr>
                                <td><strong>${c.short_name || ''}</strong></td>
                                <td class="mobile-hidden">${c.full_name || '-'}</td>
                                <td class="mobile-hidden">${c.contact_name || '-'}</td>
                                <td class="mobile-hidden">${c.contact_email || '-'}</td>
                                <td>
                                    <div class="flex gap-2">
                                        <button class="btn btn-icon" onclick="App.openCustomerModal('${c.id}')" title="Edit">
                                            <ion-icon name="create-outline"></ion-icon>
                                        </button>
                                        <button class="btn btn-icon" onclick="App.deleteCustomer('${c.id}')" title="Delete">
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
                    <button class="btn btn-secondary" ${page <= 1 ? 'disabled' : ''} onclick="App.renderCustomers({search:'${searchQuery}',page:${page - 1}})">
                        <ion-icon name="chevron-back-outline"></ion-icon>
                    </button>
                    <span style="padding: 0 1rem;">Page ${page} of ${totalPages}</span>
                    <button class="btn btn-secondary" ${page >= totalPages ? 'disabled' : ''} onclick="App.renderCustomers({search:'${searchQuery}',page:${page + 1}})">
                        <ion-icon name="chevron-forward-outline"></ion-icon>
                    </button>
                </div>
            ` : ''}
        `;
        this.container.innerHTML = html;

        // Bind search
        document.getElementById('customer-search')?.addEventListener('input', (e) => {
            this.renderCustomers({ search: e.target.value, page: 1 });
        });
    };

    App.openCustomerModal = function (customerId = null) {
        const existing = customerId ? window.Store.getCustomerById(customerId) : null;
        const isEdit = !!existing;

        const companyTypes = ['Enterprise', 'Carrier', 'OTT', 'Other'];

        const modalHtml = `
            <div class="modal-backdrop" onclick="App.closeModal(event)">
                <div class="modal" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3>${isEdit ? 'Edit Customer' : 'Add Customer'}</h3>
                        <button class="btn btn-icon" onclick="App.closeModal()"><ion-icon name="close-outline"></ion-icon></button>
                    </div>
                    <div class="modal-body">
                        <form id="customer-form">
                            <div class="grid-2">
                                <div class="form-group">
                                    <label class="form-label">Short Name <span class="required-indicator">*</span></label>
                                    <input type="text" name="shortName" class="form-control" value="${existing?.short_name || ''}" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Company Type</label>
                                    <select name="companyType" class="form-control">
                                        <option value="">Select Type</option>
                                        ${companyTypes.map(t => `<option value="${t}" ${existing?.company_type === t ? 'selected' : ''}>${t}</option>`).join('')}
                                    </select>
                                </div>
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
                                    <label class="form-label">Website</label>
                                    <input type="url" name="website" class="form-control" value="${existing?.website || ''}" placeholder="https://...">
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
                        <button type="button" class="btn btn-primary" onclick="App.saveCustomer('${customerId || ''}')">${isEdit ? 'Save Changes' : 'Add Customer'}</button>
                    </div>
                </div>
            </div>
        `;
        this.modalContainer.innerHTML = modalHtml;
    };

    App.saveCustomer = async function (customerId) {
        const form = document.getElementById('customer-form');
        const data = {
            shortName: form.querySelector('[name="shortName"]').value.trim(),
            fullName: form.querySelector('[name="fullName"]').value.trim(),
            companyType: form.querySelector('[name="companyType"]').value,
            contactName: form.querySelector('[name="contactName"]').value.trim(),
            contactEmail: form.querySelector('[name="contactEmail"]').value.trim(),
            contactPhone: form.querySelector('[name="contactPhone"]').value.trim(),
            website: form.querySelector('[name="website"]').value.trim(),
            notes: form.querySelector('[name="notes"]').value.trim()
        };

        if (!data.shortName || !data.fullName) {
            alert('Short Name and Full Name are required');
            return;
        }

        try {
            if (customerId) {
                await window.Store.updateCustomer(customerId, data);
            } else {
                await window.Store.addCustomer(data);
            }
            this.closeModal();
            this.renderCustomers();
        } catch (err) {
            alert('Error saving customer: ' + err.message);
        }
    };

    App.deleteCustomer = async function (customerId) {
        if (!confirm('Are you sure you want to delete this customer?')) return;
        try {
            await window.Store.deleteCustomer(customerId);
            this.renderCustomers();
        } catch (err) {
            alert('Error deleting customer: ' + err.message);
        }
    };
}

// Export initializer to global scope
window.initCustomersModule = initCustomersModule;
