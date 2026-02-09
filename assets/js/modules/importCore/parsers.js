/**
 * CSV/Excel parsing helpers.
 */

function normalizeHeader(header) {
    return String(header || '').trim().toLowerCase().replace(/\s+/g, '_');
}

function formatIsoDate(year, month, day) {
    if (!year || !month || !day) return '';
    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
}

function formatDateObject(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
    return formatIsoDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

function excelSerialToIsoDate(serial) {
    if (typeof serial !== 'number' || !Number.isFinite(serial)) return '';

    if (typeof XLSX !== 'undefined' && XLSX?.SSF?.parse_date_code) {
        const parsed = XLSX.SSF.parse_date_code(serial);
        if (parsed?.y && parsed?.m && parsed?.d) {
            return formatIsoDate(parsed.y, parsed.m, parsed.d);
        }
    }

    // Fallback conversion when SSF parsing is unavailable.
    const excelEpochUtc = Date.UTC(1899, 11, 30);
    const millis = Math.round(serial * 24 * 60 * 60 * 1000);
    return formatDateObject(new Date(excelEpochUtc + millis));
}

function stringToIsoDate(value) {
    const text = String(value || '').trim();
    if (!text) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    const parsed = new Date(text);
    if (Number.isNaN(parsed.getTime())) return '';
    return formatDateObject(parsed);
}

function isLikelyDateHeader(normalizedHeader) {
    return normalizedHeader.includes('date') || normalizedHeader.endsWith('_at');
}

function normalizeExcelValue(header, value) {
    if (value === null || value === undefined || value === '') return '';
    if (!isLikelyDateHeader(header)) return value;

    if (value instanceof Date) {
        return formatDateObject(value) || value;
    }

    if (typeof value === 'number') {
        return excelSerialToIsoDate(value) || value;
    }

    if (typeof value === 'string') {
        return stringToIsoDate(value) || value.trim();
    }

    return value;
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
                        const normalizedHeader = normalizeHeader(key);
                        normalizedRow[normalizedHeader] = normalizeExcelValue(normalizedHeader, row[key]);
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
