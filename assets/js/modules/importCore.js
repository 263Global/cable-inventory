/**
 * CSV/Excel import core facade:
 * schema, parsing, validation, transform, and persistence.
 */

const SCHEMAS = window.CsvImportSchemas;
const parsers = window.CsvImportParsers;
const validation = window.CsvImportValidation;
const transform = window.CsvImportTransform;
const persistence = window.CsvImportPersistence;
const templates = window.CsvImportTemplates;

if (!SCHEMAS || !parsers || !validation || !transform || !persistence || !templates) {
    throw new Error('CsvImportCore dependencies are missing. Ensure importCore/*.js files are loaded before importCore.js');
}

window.CsvImportCore = {
    SCHEMAS,
    parseCSV: parsers.parseCSV,
    parseExcel: parsers.parseExcel,
    parseFile: parsers.parseFile,
    validateRows: validation.validateRows,
    transformRowForStore: transform.transformRowForStore,
    importRows: persistence.importRows,
    generateTemplateCSV: templates.generateTemplateCSV,
    downloadTemplateExcel: templates.downloadTemplateExcel,
    downloadTemplateCSV: templates.downloadTemplateCSV
};
