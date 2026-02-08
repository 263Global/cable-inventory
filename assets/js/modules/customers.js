/**
 * Customers Module
 * Customer management functionality for CRM
 */

import { initCrmEntityModule } from './crmEntity.js';

const { escapeHtml } = window.DomUtils;

const COMPANY_TYPES = ['Enterprise', 'Carrier', 'OTT', 'Other'];

export function initCustomersModule(App) {
    initCrmEntityModule(App, {
        entityType: 'customers',
        entityLabel: 'Customer',
        renderMethod: 'renderCustomers',
        openModalMethod: 'openCustomerModal',
        saveMethod: 'saveCustomer',
        deleteMethod: 'deleteCustomer',
        storeMethods: {
            list: 'getCustomers',
            getById: 'getCustomerById',
            add: 'addCustomer',
            update: 'updateCustomer',
            delete: 'deleteCustomer'
        },
        searchFields: ['short_name', 'full_name', 'contact_email'],
        searchPlaceholder: 'Search by name or email...',
        tableClassName: 'customers-table',
        emptyMessage: 'No customers found. Add your first customer!',
        columns: [
            { label: 'Short Name', getValue: (row) => row.short_name || '', strong: true },
            { label: 'Full Name', className: 'mobile-hidden', dataLabel: 'Full Name', getValue: (row) => row.full_name || '-' },
            { label: 'Contact', className: 'mobile-hidden', dataLabel: 'Contact', getValue: (row) => row.contact_name || '-' },
            { label: 'Email', className: 'mobile-hidden', dataLabel: 'Email', getValue: (row) => row.contact_email || '-' }
        ],
        formId: 'customer-form',
        renderForm: (existing) => `
            <div class="grid-2">
                <div class="form-group">
                    <label class="form-label">Short Name <span class="required-indicator">*</span></label>
                    <input type="text" name="shortName" class="form-control" value="${escapeHtml(existing?.short_name || '')}" placeholder="e.g. ACME" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Company Type</label>
                    <select name="companyType" class="form-control">
                        <option value="">Select Type</option>
                        ${COMPANY_TYPES.map(type => `<option value="${escapeHtml(type)}" ${existing?.company_type === type ? 'selected' : ''}>${escapeHtml(type)}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">Full Name <span class="required-indicator">*</span></label>
                <input type="text" name="fullName" class="form-control" value="${escapeHtml(existing?.full_name || '')}" placeholder="Company legal name" required>
            </div>
            <div class="grid-2">
                <div class="form-group">
                    <label class="form-label">Contact Name</label>
                    <input type="text" name="contactName" class="form-control" value="${escapeHtml(existing?.contact_name || '')}" placeholder="John Doe">
                </div>
                <div class="form-group">
                    <label class="form-label">Contact Email</label>
                    <input type="email" name="contactEmail" class="form-control" value="${escapeHtml(existing?.contact_email || '')}" placeholder="contact@company.com">
                </div>
            </div>
            <div class="grid-2">
                <div class="form-group">
                    <label class="form-label">Contact Phone</label>
                    <input type="text" name="contactPhone" class="form-control" value="${escapeHtml(existing?.contact_phone || '')}" placeholder="+1 234 567 8900">
                </div>
                <div class="form-group">
                    <label class="form-label">Website</label>
                    <input type="url" name="website" class="form-control" value="${escapeHtml(existing?.website || '')}" placeholder="https://...">
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">Notes</label>
                <textarea name="notes" class="form-control" rows="3" placeholder="Additional notes...">${escapeHtml(existing?.notes || '')}</textarea>
            </div>
        `,
        readFormData: (form) => ({
            shortName: form.querySelector('[name="shortName"]').value.trim(),
            fullName: form.querySelector('[name="fullName"]').value.trim(),
            companyType: form.querySelector('[name="companyType"]').value,
            contactName: form.querySelector('[name="contactName"]').value.trim(),
            contactEmail: form.querySelector('[name="contactEmail"]').value.trim(),
            contactPhone: form.querySelector('[name="contactPhone"]').value.trim(),
            website: form.querySelector('[name="website"]').value.trim(),
            notes: form.querySelector('[name="notes"]').value.trim()
        }),
        validateData: (data) => {
            if (!data.shortName || !data.fullName) {
                return 'Short Name and Full Name are required';
            }
            return '';
        },
        deleteConfirmMessage: 'Are you sure you want to delete this customer?'
    });
}
