import type { CSVRow, ColumnMapping, BOMItem } from '@/types/bom';

/**
 * Parse CSV text into rows of key-value objects
 * Handles quoted values and basic CSV edge cases
 */
export function parseCSV(text: string): CSVRow[] {
  const lines = text.split(/\r?\n/);
  if (lines.length === 0) return [];

  // Parse header row
  const headers = parseCSVLine(lines[0]);
  
  // Parse data rows
  return lines.slice(1)
    .filter(line => line.trim())
    .map(line => {
      const values = parseCSVLine(line);
      const row: CSVRow = {};
      headers.forEach((header, i) => {
        row[header] = values[i] || '';
      });
      return row;
    });
}

/**
 * Parse a single CSV line, handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

/**
 * Map parsed CSV rows to BOM items using column mapping
 */
export function mapCSVToBOM(
  rows: CSVRow[],
  mapping: ColumnMapping,
  projectId: number,
  locationId: number
): Omit<BOMItem, 'id' | 'created_at' | 'updated_at' | 'metadata'>[] {
  if (rows.length === 0) return [];
  
  const headers = Object.keys(rows[0]);
  
  return rows.map((row, index) => {
    const getVal = (idx?: number): string => {
      if (idx === undefined) return '';
      const header = headers[idx];
      return header ? (row[header] || '') : '';
    };
    
    return {
      project_id: projectId,
      location_id: locationId,
      part_id: null,
      part_number: getVal(mapping.partNumber) || 'UNKNOWN',
      description: getVal(mapping.description) || '',
      secondary_description: getVal(mapping.secondaryDescription) || null,
      quantity: parseFloat(getVal(mapping.quantity)) || 1,
      unit: getVal(mapping.unit) || 'EA',
      unit_price: parseFloat(getVal(mapping.unitPrice)) || null,
      manufacturer: getVal(mapping.manufacturer) || null,
      supplier: getVal(mapping.supplier) || null,
      category: getVal(mapping.category) || null,
      reference_designator: getVal(mapping.referenceDesignator) || null,
      is_spare: 0,
      sort_order: index,
    };
  });
}

/**
 * Get column headers from CSV data
 */
export function getCSVHeaders(rows: CSVRow[]): string[] {
  if (rows.length === 0) return [];
  return Object.keys(rows[0]);
}
