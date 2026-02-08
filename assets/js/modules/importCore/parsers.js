/**
 * CSV/Excel parsing helpers.
 */

function normalizeHeader(header) {
    return header.trim().toLowerCase().replace(/\s+/g, '_');
}

function parseCSV(file) {
    return new Promise((resolve, reject) => {
        if (typeof Papa === 'undefined') {
            reject(new Error('PapaParse library not loaded'));
            return;
        }

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            transformHeader: normalizeHeader,
            complete: (results) => resolve({ data: results.data, errors: results.errors }),
            error: (error) => reject(error)
        });
    });
}

function parseExcel(file) {
    return new Promise((resolve, reject) => {
        if (typeof XLSX === 'undefined') {
            reject(new Error('SheetJS library not loaded'));
            return;
        }

        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });

                const normalized = jsonData.map((row) => {
                    const normalizedRow = {};
                    Object.keys(row).forEach((key) => {
                        normalizedRow[normalizeHeader(key)] = row[key];
                    });
                    return normalizedRow;
                });

                resolve({ data: normalized, errors: [] });
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(file);
    });
}

async function parseFile(file) {
    const extension = file.name.split('.').pop().toLowerCase();

    if (extension === 'csv') return parseCSV(file);
    if (extension === 'xlsx' || extension === 'xls') return parseExcel(file);

    throw new Error(`Unsupported file format: .${extension}. Please use CSV or Excel (.xlsx) files.`);
}

window.CsvImportParsers = {
    parseCSV,
    parseExcel,
    parseFile
};
