import type { CSVRow } from '@/types/bom';

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
 * Get column headers from CSV data
 */
export function getCSVHeaders(rows: CSVRow[]): string[] {
  if (rows.length === 0) return [];
  return Object.keys(rows[0]);
}
