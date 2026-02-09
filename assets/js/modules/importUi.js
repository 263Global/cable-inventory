/**
 * CSV/Excel import modal UI templates and style bootstrap.
 */

const { escapeHtml: escapeImportUiHtml } = window.DomUtils;

window.CsvImportUi = (() => {
    function renderStep1(entityType) {
        return `
        <div class="import-step">
            <div class="step-header">
                <span class="step-number active">1</span>
                <span class="step-title">Download Template</span>
                <span class="step-number">2</span>
                <span class="step-title">Upload File</span>
                <span class="step-number">3</span>
                <span class="step-title">Preview & Validate</span>
            </div>
            <div class="step-content" style="text-align: center; padding: 2rem;">
                <p style="margin-bottom: 1.5rem; color: var(--text-muted);">
                    Download a template file, fill it with your data, then upload it in the next step.
                </p>
                <div style="display: flex; gap: 1rem; justify-content: center;">
                    <button type="button" class="btn btn-secondary" data-import-action="download-template-csv" data-entity-type="${entityType}">
                        <ion-icon name="document-text-outline"></ion-icon> Download CSV
                    </button>
                    <button type="button" class="btn btn-secondary" data-import-action="download-template-excel" data-entity-type="${entityType}">
                        <ion-icon name="grid-outline"></ion-icon> Download Excel
                    </button>
                </div>
                <div style="margin-top: 2rem;">
                    <button type="button" class="btn btn-primary" data-import-action="go-step-2">
                        Next: Upload File <ion-icon name="arrow-forward-outline"></ion-icon>
                    </button>
                </div>
            </div>
        </div>
    `;
    }

    function renderStep2() {
        return `
        <div class="import-step">
            <div class="step-header">
                <span class="step-number done">1</span>
                <span class="step-title">Download Template</span>
                <span class="step-number active">2</span>
                <span class="step-title">Upload File</span>
                <span class="step-number">3</span>
                <span class="step-title">Preview & Validate</span>
            </div>
            <div class="step-content">
                <div class="file-drop-zone" id="import-drop-zone" data-import-action="open-file-picker">
                    <ion-icon name="cloud-upload-outline" style="font-size: 3rem; color: var(--accent-primary);"></ion-icon>
                    <p style="margin: 1rem 0 0.5rem; font-weight: 500;">Drag & drop your file here</p>
                    <p style="color: var(--text-muted); font-size: 0.875rem;">or click to browse</p>
                    <p style="color: var(--text-muted); font-size: 0.75rem; margin-top: 0.5rem;">Supports CSV and Excel (.xlsx)</p>
                    <input type="file" id="import-file-input" accept=".csv,.xlsx,.xls" style="display: none;">
                </div>
                <div id="import-file-info" style="display: none; margin-top: 1rem; padding: 1rem; background: var(--bg-tertiary); border-radius: 8px;">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <ion-icon name="document-attach-outline"></ion-icon>
                        <span id="import-file-name"></span>
                        <button type="button" class="btn btn-icon" data-import-action="clear-file" style="margin-left: auto;">
                            <ion-icon name="close-outline"></ion-icon>
                        </button>
                    </div>
                </div>
                <div style="margin-top: 2rem; display: flex; gap: 1rem; justify-content: space-between;">
                    <button type="button" class="btn btn-secondary" data-import-action="go-step-1">
                        <ion-icon name="arrow-back-outline"></ion-icon> Back
                    </button>
                    <button type="button" class="btn btn-primary" id="import-validate-btn" data-import-action="validate-preview" disabled>
                        Validate & Preview <ion-icon name="arrow-forward-outline"></ion-icon>
                    </button>
                </div>
            </div>
        </div>
    `;
    }

    function renderStep3(result, schema) {
        const { valid, invalid } = result;
        const allRows = [...invalid, ...valid].sort((a, b) => a._rowIndex - b._rowIndex);
        const displayRows = allRows.slice(0, 10);
        const headers = schema.columns.slice(0, 4);

        return `
        <div class="import-step">
            <div class="step-header">
                <span class="step-number done">1</span>
                <span class="step-title">Download Template</span>
                <span class="step-number done">2</span>
                <span class="step-title">Upload File</span>
                <span class="step-number active">3</span>
                <span class="step-title">Preview & Validate</span>
            </div>
            <div class="step-content">
                <div class="validation-summary" style="display: flex; gap: 1rem; margin-bottom: 1rem;">
                    <div style="padding: 0.75rem 1rem; background: var(--status-active-bg); border-radius: 8px; flex: 1;">
                        <ion-icon name="checkmark-circle" style="color: var(--status-active);"></ion-icon>
                        <strong>${valid.length}</strong> valid row${valid.length !== 1 ? 's' : ''}
                    </div>
                    ${invalid.length > 0 ? `
                        <div style="padding: 0.75rem 1rem; background: var(--status-expired-bg); border-radius: 8px; flex: 1;">
                            <ion-icon name="alert-circle" style="color: var(--status-expired);"></ion-icon>
                            <strong>${invalid.length}</strong> error${invalid.length !== 1 ? 's' : ''}
                        </div>
                    ` : ''}
                </div>

                <div class="table-container" style="max-height: 300px; overflow: auto;">
                    <table class="import-preview-table">
                        <thead>
                            <tr>
                                <th style="width: 40px;">Row</th>
                                <th style="width: 40px;"></th>
                                ${headers.map(h => `<th>${escapeImportUiHtml(h.label || h.name)}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${displayRows.map(row => {
            const hasError = row._errors && row._errors.length > 0;
            return `
                                    <tr class="${hasError ? 'row-error' : 'row-valid'}">
                                        <td>${row._rowIndex}</td>
                                        <td>
                                            ${hasError
                    ? `<ion-icon name="alert-circle" style="color: var(--status-expired);" title="${escapeImportUiHtml(row._errors.join('; '))}"></ion-icon>`
                    : `<ion-icon name="checkmark-circle" style="color: var(--status-active);"></ion-icon>`
                }
                                        </td>
                                        ${headers.map(h => `<td>${escapeImportUiHtml(row[h.name] || '')}</td>`).join('')}
                                    </tr>
                                    ${hasError ? `<tr class="error-detail"><td colspan="${headers.length + 2}" style="color: var(--status-expired); font-size: 0.8rem; padding: 0.25rem 0.5rem;">${escapeImportUiHtml(row._errors.join('; '))}</td></tr>` : ''}
                                `;
        }).join('')}
                        </tbody>
                    </table>
                </div>
                ${allRows.length > 10 ? `<p style="color: var(--text-muted); font-size: 0.875rem; margin-top: 0.5rem;">Showing first 10 of ${allRows.length} rows</p>` : ''}
            </div>
        </div>
    `;
    }

    function ensureImportStyles() {
        if (document.getElementById('import-module-styles')) return;
        const importStyles = `
<style id="import-module-styles">
.file-drop-zone {
    border: 2px dashed var(--border-color);
    border-radius: 12px;
    padding: 3rem 2rem;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s ease;
}
.file-drop-zone:hover, .file-drop-zone.drag-over {
    border-color: var(--accent-primary);
    background: var(--bg-tertiary);
}
.step-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border-color);
}
.step-number {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--bg-tertiary);
    color: var(--text-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 600;
}
.step-number.active {
    background: var(--accent-primary);
    color: white;
}
.step-number.done {
    background: var(--status-active);
    color: white;
}
.step-title {
    font-size: 0.875rem;
    color: var(--text-muted);
    margin-right: 1rem;
}
.import-preview-table {
    width: 100%;
    font-size: 0.875rem;
}
.import-preview-table th, .import-preview-table td {
    padding: 0.5rem;
    border-bottom: 1px solid var(--border-color);
}
.row-error {
    background: rgba(239, 68, 68, 0.1);
}
.row-valid {
    background: transparent;
}
.error-detail {
    background: rgba(239, 68, 68, 0.05);
}

</style>
`;
        document.head.insertAdjacentHTML('beforeend', importStyles);
    }

    return {
        renderStep1,
        renderStep2,
        renderStep3,
        ensureImportStyles
    };
})();
