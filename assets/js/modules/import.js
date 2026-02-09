/**
 * CSV/Excel Import Module
 * Bulk import functionality for Customers, Suppliers, Inventory, and Sales
 */

const { escapeHtml: escapeImportHtml } = window.DomUtils;

const importCoreFacade = window.CsvImportCore;
if (!importCoreFacade) {
    throw new Error('CsvImportCore not loaded. Ensure assets/js/modules/importCore.js is loaded before import.js');
}

const {
    SCHEMAS: importSchemas,
    parseCSV: coreParseCSV,
    parseExcel: coreParseExcel,
    parseFile: coreParseFile,
    validateRows: coreValidateRows,
    importRows: coreImportRows,
    downloadTemplateCSV: coreDownloadTemplateCSV,
    downloadTemplateExcel: coreDownloadTemplateExcel
} = importCoreFacade;

const importUiFacade = window.CsvImportUi;
if (!importUiFacade) {
    throw new Error('CsvImportUi not loaded. Ensure assets/js/modules/importUi.js is loaded before import.js');
}

const {
    renderStep1,
    renderStep2,
    renderStep3,
    ensureImportStyles
} = importUiFacade;

// ==================== Import Modal UI ====================

let currentImportState = {
    entityType: null,
    file: null,
    parsedData: null,
    validationResult: null
};

function handleImportAction(action, source) {
    const entityType = source?.dataset?.entityType || currentImportState.entityType;

    if (action === 'close-modal') {
        closeImportModal();
        return;
    }
    if (action === 'download-template-csv') {
        coreDownloadTemplateCSV(entityType);
        return;
    }
    if (action === 'download-template-excel') {
        coreDownloadTemplateExcel(entityType);
        return;
    }
    if (action === 'go-step-1') {
        goToStep1();
        return;
    }
    if (action === 'go-step-2') {
        goToStep2();
        return;
    }
    if (action === 'validate-preview') {
        validateAndPreview();
        return;
    }
    if (action === 'execute-import') {
        executeImport();
        return;
    }
    if (action === 'open-file-picker') {
        document.getElementById('import-file-input')?.click();
        return;
    }
    if (action === 'clear-file') {
        clearFile();
        return;
    }
    if (action === 'import-done') {
        closeImportModal();
        if (!window.App || !entityType) return;
        const renderMethod = `render${entityType.charAt(0).toUpperCase()}${entityType.slice(1)}`;
        if (typeof window.App[renderMethod] === 'function') {
            window.App[renderMethod]();
        }
    }
}

function bindImportModalActions() {
    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) return;

    modalContainer.querySelectorAll('[data-import-action]').forEach(el => {
        if (el.dataset.importBound === 'true') return;
        el.dataset.importBound = 'true';
        el.addEventListener('click', () => handleImportAction(el.dataset.importAction, el));
    });

    const dropZone = modalContainer.querySelector('#import-drop-zone');
    if (dropZone && dropZone.dataset.dragBound !== 'true') {
        dropZone.dataset.dragBound = 'true';
        dropZone.addEventListener('dragover', handleDragOver);
        dropZone.addEventListener('dragleave', handleDragLeave);
        dropZone.addEventListener('drop', handleDrop);
    }

    const fileInput = modalContainer.querySelector('#import-file-input');
    if (fileInput && fileInput.dataset.changeBound !== 'true') {
        fileInput.dataset.changeBound = 'true';
        fileInput.addEventListener('change', handleFileSelect);
    }
}

/**
 * Open import modal for entity type
 */
function openImportModal(entityType) {
    const schema = importSchemas[entityType];
    if (!schema) {
        alert(`Import not supported for: ${entityType}`);
        return;
    }

    currentImportState = {
        entityType,
        file: null,
        parsedData: null,
        validationResult: null
    };

    const modalHtml = `
        <div class="modal-backdrop" id="import-modal-backdrop">
            <div class="modal modal-lg">
                <div class="modal-header">
                    <h3>Import ${schema.displayName}</h3>
                    <button type="button" class="btn btn-icon" data-import-action="close-modal"><ion-icon name="close-outline"></ion-icon></button>
                </div>
                <div class="modal-body" id="import-modal-body">
                    ${renderStep1(entityType)}
                </div>
                <div class="modal-footer" id="import-modal-footer">
                    <button type="button" class="btn btn-secondary" data-import-action="close-modal">Cancel</button>
                </div>
            </div>
        </div>
    `;
    document.getElementById('modal-container').innerHTML = modalHtml;

    const backdrop = document.getElementById('import-modal-backdrop');
    backdrop?.addEventListener('click', (event) => {
        if (event.target === backdrop) closeImportModal();
    });
    bindImportModalActions();
}

/**
 * Close import modal
 */
function closeImportModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('modal-container').innerHTML = '';
    currentImportState = { entityType: null, file: null, parsedData: null, validationResult: null };
}

/**
 * Go to Step 2: Upload File
 */
function goToStep2() {
    document.getElementById('import-modal-body').innerHTML = renderStep2();
    bindImportModalActions();
}

/**
 * Go back to Step 1
 */
function goToStep1() {
    document.getElementById('import-modal-body').innerHTML = renderStep1(currentImportState.entityType);
    bindImportModalActions();
}

// File handling
function handleDragOver(event) {
    event.preventDefault();
    event.currentTarget.classList.add('drag-over');
}

function handleDragLeave(event) {
    event.currentTarget.classList.remove('drag-over');
}

function handleDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('drag-over');
    const files = event.dataTransfer.files;
    if (files.length > 0) {
        setFile(files[0]);
    }
}

function handleFileSelect(event) {
    const files = event.target.files;
    if (files.length > 0) {
        setFile(files[0]);
    }
}

function setFile(file) {
    currentImportState.file = file;
    const fileInfo = document.getElementById('import-file-info');
    const fileName = document.getElementById('import-file-name');
    const validateBtn = document.getElementById('import-validate-btn');
    if (fileInfo) fileInfo.style.display = 'block';
    if (fileName) fileName.textContent = file.name;
    if (validateBtn) validateBtn.disabled = false;
}

function clearFile() {
    currentImportState.file = null;
    currentImportState.parsedData = null;
    const fileInfo = document.getElementById('import-file-info');
    const fileInput = document.getElementById('import-file-input');
    const validateBtn = document.getElementById('import-validate-btn');
    if (fileInfo) fileInfo.style.display = 'none';
    if (fileInput) fileInput.value = '';
    if (validateBtn) validateBtn.disabled = true;
}

/**
 * Validate file and show preview
 */
async function validateAndPreview() {
    if (!currentImportState.file) return;

    const schema = importSchemas[currentImportState.entityType];
    const btn = document.getElementById('import-validate-btn');
    btn.disabled = true;
    btn.innerHTML = '<ion-icon name="hourglass-outline"></ion-icon> Validating...';

    try {
        const { data, errors } = await coreParseFile(currentImportState.file);
        if (errors.length > 0) {
            alert('Parse errors: ' + errors.map(e => e.message).join(', '));
            btn.disabled = false;
            btn.innerHTML = 'Validate & Preview <ion-icon name="arrow-forward-outline"></ion-icon>';
            return;
        }

        currentImportState.parsedData = data;
        const result = coreValidateRows(data, schema);
        currentImportState.validationResult = result;

        // Render Step 3
        document.getElementById('import-modal-body').innerHTML = renderStep3(result, schema);
        document.getElementById('import-modal-footer').innerHTML = `
            <button type="button" class="btn btn-secondary" data-import-action="go-step-2">Back</button>
            <button type="button" class="btn btn-primary" data-import-action="execute-import" ${result.valid.length === 0 ? 'disabled' : ''}>
                <ion-icon name="checkmark-outline"></ion-icon> Import ${result.valid.length} Row${result.valid.length !== 1 ? 's' : ''}
            </button>
        `;
        bindImportModalActions();
    } catch (err) {
        alert('Error parsing file: ' + err.message);
        btn.disabled = false;
        btn.innerHTML = 'Validate & Preview <ion-icon name="arrow-forward-outline"></ion-icon>';
    }
}

/**
 * Execute the import
 */
async function executeImport() {
    const { valid } = currentImportState.validationResult;
    if (valid.length === 0) return;

    const btn = document.querySelector('#import-modal-footer .btn-primary');
    btn.disabled = true;
    btn.innerHTML = '<ion-icon name="hourglass-outline"></ion-icon> Importing...';

    try {
        const result = await coreImportRows(currentImportState.entityType, valid);

        // Show result
        document.getElementById('import-modal-body').innerHTML = `
            <div class="import-result" style="text-align: center; padding: 2rem;">
                <ion-icon name="checkmark-circle" style="font-size: 4rem; color: var(--status-active);"></ion-icon>
                <h3 style="margin: 1rem 0;">Import Complete!</h3>
                <p style="color: var(--text-muted);">${result.success} record${result.success !== 1 ? 's' : ''} imported successfully.</p>
                ${result.failed.length > 0 ? `
                    <p style="color: var(--status-expired); margin-top: 1rem;">${result.failed.length} failed to import.</p>
                    <ul style="text-align: left; max-height: 150px; overflow: auto; margin-top: 0.5rem;">
                        ${result.failed.map(f => `<li>Row ${f.row}: ${escapeImportHtml(f.error)}</li>`).join('')}
                    </ul>
                ` : ''}
            </div>
        `;
        document.getElementById('import-modal-footer').innerHTML = `
            <button type="button" class="btn btn-primary" data-import-action="import-done" data-entity-type="${currentImportState.entityType}">Done</button>
        `;
        bindImportModalActions();
    } catch (err) {
        alert('Import failed: ' + err.message);
        btn.disabled = false;
        btn.innerHTML = `<ion-icon name="checkmark-outline"></ion-icon> Import ${valid.length} Rows`;
    }
}

// Inject styles on load
ensureImportStyles();

// ==================== Export ====================

window.CsvImport = {
    openImportModal,
    closeImportModal,
    downloadTemplateCSV: coreDownloadTemplateCSV,
    downloadTemplateExcel: coreDownloadTemplateExcel,
    goToStep1,
    goToStep2,
    validateAndPreview,
    executeImport,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileSelect,
    clearFile,
    // For testing
    parseCSV: coreParseCSV,
    parseExcel: coreParseExcel,
    parseFile: coreParseFile,
    validateRows: coreValidateRows,
    SCHEMAS: importSchemas
};
