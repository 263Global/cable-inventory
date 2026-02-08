/**
 * Suppliers Module
 * Supplier management functionality for CRM
 */

import { initCrmEntityModule } from './crmEntity.js';

const { escapeHtml } = window.DomUtils;

export function initSuppliersModule(App) {
    initCrmEntityModule(App, {
        entityType: 'suppliers',
        entityLabel: 'Supplier',
        renderMethod: 'renderSuppliers',
        openModalMethod: 'openSupplierModal',
        saveMethod: 'saveSupplier',
        deleteMethod: 'deleteSupplier',
        storeMethods: {
            list: 'getSuppliers',
            getById: 'getSupplierById',
            add: 'addSupplier',
            update: 'updateSupplier',
            delete: 'deleteSupplier'
        },
        searchFields: ['short_name', 'full_name'],
        searchPlaceholder: 'Search by name...',
        tableClassName: 'suppliers-table',
        emptyMessage: 'No suppliers found. Add your first supplier!',
        columns: [
            { label: 'Short Name', getValue: (row) => row.short_name || '', strong: true },
            { label: 'Full Name', className: 'mobile-hidden', dataLabel: 'Full Name', getValue: (row) => row.full_name || '-' },
            { label: 'Contact', className: 'mobile-hidden', dataLabel: 'Contact', getValue: (row) => row.contact_name || '-' }
        ],
        formId: 'supplier-form',
        renderForm: (existing) => `
            <div class="form-group">
                <label class="form-label">Short Name <span class="required-indicator">*</span></label>
                <input type="text" name="shortName" class="form-control" value="${escapeHtml(existing?.short_name || '')}" placeholder="e.g. Supplier-01" required>
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
                    <input type="email" name="contactEmail" class="form-control" value="${escapeHtml(existing?.contact_email || '')}" placeholder="contact@supplier.com">
                </div>
            </div>
            <div class="grid-2">
                <div class="form-group">
                    <label class="form-label">Contact Phone</label>
                    <input type="text" name="contactPhone" class="form-control" value="${escapeHtml(existing?.contact_phone || '')}" placeholder="+1 234 567 8900">
                </div>
                <div class="form-group">
                    <label class="form-label">Portal URL</label>
                    <input type="url" name="portalUrl" class="form-control" value="${escapeHtml(existing?.portal_url || '')}" placeholder="https://...">
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
            contactName: form.querySelector('[name="contactName"]').value.trim(),
            contactEmail: form.querySelector('[name="contactEmail"]').value.trim(),
            contactPhone: form.querySelector('[name="contactPhone"]').value.trim(),
            portalUrl: form.querySelector('[name="portalUrl"]').value.trim(),
            notes: form.querySelector('[name="notes"]').value.trim()
        }),
        validateData: (data) => {
            if (!data.shortName || !data.fullName) {
                return 'Short Name and Full Name are required';
            }
            return '';
        },
        deleteConfirmMessage: 'Are you sure you want to delete this supplier?'
    });
}
