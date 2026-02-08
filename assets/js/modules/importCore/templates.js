/**
 * Import template generation and downloads.
 */

function getSchema(entityType) {
    const schemas = window.CsvImportSchemas;
    const schema = schemas?.[entityType];
    if (!schema) {
        throw new Error(`Unknown entity type: ${entityType}`);
    }
    return schema;
}

function generateTemplateCSV(entityType) {
    const schema = getSchema(entityType);
    return schema.columns.map((column) => column.name).join(',');
}

function downloadTemplateExcel(entityType) {
    if (typeof XLSX === 'undefined') {
        alert('Excel library not loaded. Please try CSV instead.');
        return;
    }

    const schema = getSchema(entityType);
    const headers = schema.columns.map((column) => column.name);
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, schema.displayName);
    XLSX.writeFile(wb, `${entityType}_template.xlsx`);
}

function downloadTemplateCSV(entityType) {
    const csv = generateTemplateCSV(entityType);
    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `${entityType}_template.csv`;
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 100);
}

window.CsvImportTemplates = {
    generateTemplateCSV,
    downloadTemplateExcel,
    downloadTemplateCSV
};
