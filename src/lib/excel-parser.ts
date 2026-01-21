import * as XLSX from 'xlsx';
import type { CSVRow } from '@/types/bom';

/**
 * Get workbook from buffer
 */
export function getWorkbook(buffer: Uint8Array): XLSX.WorkBook {
  return XLSX.read(buffer, { type: 'array' });
}

/**
 * Parse an Excel file (buffer) into CSVRow format
 * Uses the first sheet by default
 * 
 * @param buffer - Uint8Array from file picker or a pre-read workbook
 * @param sheetIndex - Zero-based sheet index (default: 0)
 * @param headerRowIndex - Zero-based index of the header row (default: 0)
 * @returns Array of CSVRow objects
 */
export function parseExcel(buffer: Uint8Array | XLSX.WorkBook, sheetIndex = 0, headerRowIndex = 0): CSVRow[] {
  try {
    // Read workbook if buffer is provided
    const workbook = buffer instanceof Uint8Array ? getWorkbook(buffer) : buffer;
    
    if (workbook.SheetNames.length === 0) {
      throw new Error('Excel file contains no sheets');
    }
    
    if (sheetIndex >= workbook.SheetNames.length) {
      throw new Error(`Sheet index ${sheetIndex} out of range (file has ${workbook.SheetNames.length} sheets)`);
    }
    
    const sheetName = workbook.SheetNames[sheetIndex];
    return parseExcelSheet(workbook, sheetName, headerRowIndex);
    
  } catch (error) {
    throw new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get list of sheet names from an Excel file
 * 
 * @param buffer - Uint8Array from file picker or a pre-read workbook
 * @returns Array of sheet names
 */
export function getExcelSheets(buffer: Uint8Array | XLSX.WorkBook): string[] {
  try {
    const workbook = buffer instanceof Uint8Array ? getWorkbook(buffer) : buffer;
    return workbook.SheetNames;
  } catch (error) {
    throw new Error(`Failed to read Excel sheets: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse a specific sheet from an Excel file by name
 * 
 * @param buffer - Uint8Array from file picker or a pre-read workbook
 * @param sheetName - Name of the sheet to parse
 * @param headerRowIndex - Zero-based index of the header row (default: 0)
 * @returns Array of CSVRow objects
 */
export function parseExcelSheet(buffer: Uint8Array | XLSX.WorkBook, sheetName: string, headerRowIndex = 0): CSVRow[] {
  try {
    // Read workbook if buffer is provided
    const workbook = buffer instanceof Uint8Array ? getWorkbook(buffer) : buffer;
    
    // Get sheet
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      throw new Error(`Sheet "${sheetName}" not found in Excel file`);
    }
    
    // Convert to JSON with array of arrays format
    // Use range to start from the specified header row
    const rawData = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1, // Array of arrays format
      defval: '', // Default empty cells to empty string
      raw: false, // Convert all values to strings
      blankrows: false, // Skip blank rows
      range: headerRowIndex, // Start reading from this row index
    });
    
    if (rawData.length === 0) {
      return [];
    }
    
    // First row is headers (because we skipped previous rows using range)
    const headerRow = rawData[0];
    if (!Array.isArray(headerRow)) {
      throw new Error('Invalid Excel format: first row must contain headers');
    }
    
    const headers = headerRow.map(h => String(h || '').trim());
    
    // Convert remaining rows to CSVRow format
    const rows: CSVRow[] = [];
    
    for (let i = 1; i < rawData.length; i++) {
      const dataRow = rawData[i];
      if (!Array.isArray(dataRow)) continue;
      
      const row: CSVRow = {};
      headers.forEach((header, colIndex) => {
        const value = dataRow[colIndex];
        row[header] = String(value !== undefined && value !== null ? value : '').trim();
      });
      
      // Only include rows that have at least one non-empty value
      const hasData = Object.values(row).some(v => v !== '');
      if (hasData) {
        rows.push(row);
      }
    }
    
    return rows;
    
  } catch (error) {
    throw new Error(`Failed to parse Excel sheet "${sheetName}": ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Preview of an Excel sheet (headers + sample rows)
 */
export interface ExcelSheetPreview {
  headers: string[];
  rows: string[][];
  totalColumns: number;
}

/**
 * Normalize headers to be unique and non-empty
 * @internal
 */
function normalizeHeaders(headers: unknown[]): string[] {
  const normalized: string[] = [];
  const seen = new Map<string, number>();

  for (let i = 0; i < headers.length; i++) {
    let header = String(headers[i] || '').trim();

    if (!header) {
      header = `Column ${i + 1}`;
    }

    // Handle duplicates
    if (seen.has(header)) {
      const count = seen.get(header)! + 1;
      seen.set(header, count);
      header = `${header}_${count}`;
    } else {
      seen.set(header, 1);
    }

    normalized.push(header);
  }

  return normalized;
}

/**
 * Get a preview of an Excel sheet (headers + top N rows)
 * Does not convert the entire sheet, only reads the required range
 *
 * @param buffer - Uint8Array from file picker or a pre-read workbook
 * @param sheetName - Name of the sheet to preview
 * @param headerRowIndex - Zero-based index of the header row (default: 0)
 * @param maxDataRows - Maximum number of data rows to return (default: 5)
 * @param maxColumns - Maximum number of columns to return (default: 20)
 * @returns ExcelSheetPreview with headers and sample rows
 */
export function getExcelSheetPreview(
  buffer: Uint8Array | XLSX.WorkBook,
  sheetName: string,
  headerRowIndex = 0,
  maxDataRows = 5,
  maxColumns = 20
): ExcelSheetPreview {
  // Read workbook if buffer is provided
  const workbook = buffer instanceof Uint8Array ? getWorkbook(buffer) : buffer;

  // Get sheet
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" not found in Excel file`);
  }

  // Handle empty sheet (no range defined)
  if (!sheet['!ref']) {
    return { headers: [], rows: [], totalColumns: 0 };
  }

  // Decode the range to get dimensions
  const range = XLSX.utils.decode_range(sheet['!ref']);
  const lastRow = range.e.r;
  const lastCol = range.e.c;

  // Compute preview range
  const startRow = Math.max(0, Math.min(headerRowIndex, lastRow));
  const endRow = Math.min(startRow + maxDataRows, lastRow);
  const endCol = Math.min(lastCol, maxColumns - 1);

  // Encode the preview range
  const previewRange = XLSX.utils.encode_range({
    s: { r: startRow, c: 0 },
    e: { r: endRow, c: endCol }
  });

  // Convert to array of arrays
  const rawData = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
    blankrows: false,
    range: previewRange
  });

  // Handle empty data
  if (!rawData || rawData.length === 0) {
    return { headers: [], rows: [], totalColumns: 0 };
  }

  // First row is headers
  const rawHeaders = rawData[0];
  if (!Array.isArray(rawHeaders)) {
    return { headers: [], rows: [], totalColumns: 0 };
  }

  const headers = normalizeHeaders(rawHeaders);

  // Extract data rows (skip header row)
  const rows: string[][] = [];
  for (let i = 1; i < rawData.length; i++) {
    const dataRow = rawData[i];
    if (!Array.isArray(dataRow)) continue;

    // Ensure row has same length as headers
    const row: string[] = [];
    for (let colIndex = 0; colIndex < headers.length; colIndex++) {
      const value = dataRow[colIndex];
      row.push(String(value !== undefined && value !== null ? value : '').trim());
    }

    rows.push(row);
  }

  return {
    headers,
    rows,
    totalColumns: headers.length
  };
}
