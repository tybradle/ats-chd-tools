import type { CSVRow, ColumnMapping, BOMItem } from '@/types/bom';

/**
 * Robustly parse a quantity string into a number.
 * Handles: "10", "10.5", "10 EA", "10 (Spare)", "Approx 10"
 * Returns the first valid number found, or 1 if no number found (defaulting safe).
 */
export function parseQuantity(value: string): number {
  if (!value) return 1;
  const clean = value.toString().trim();
  if (!clean) return 1;

  // Try to find the first number in the string (integer or float)
  // Fix: Allow commas in the match, then remove them to handle "1,200"
  const match = clean.match(/(\d{1,3}(,\d{3})*(\.\d+)?|\d+(\.\d+)?|\.\d+)/);
  if (match) {
    const numStr = match[0].replace(/,/g, '');
    const num = parseFloat(numStr);
    return isNaN(num) ? 1 : num;
  }

  return 1;
}

/**
 * Robustly parse a currency/price string into a number.
 * Handles: "$10.00", "€ 5", "10.00 USD", "Cost: 5.50"
 * Returns null if no valid number found.
 */
export function parseCurrency(value: string): number | null {
  if (!value) return null;
  const clean = value.toString().trim();
  if (!clean) return null;

  // Remove common currency symbols and non-numeric chars except . and -
  // But be careful not to strip digits.
  // Strategy: Extract the first valid number sequence

  const match = clean.match(/(\d{1,3}(,\d{3})*(\.\d+)?|\d+(\.\d+)?|\.\d+)/);
  if (match) {
    // Remove commas from "1,000.00" before parsing
    const numStr = match[0].replace(/,/g, '');
    const num = parseFloat(numStr);
    return isNaN(num) ? null : num;
  }

  return null;
}

/**
 * Map parsed import rows (CSV/Excel) to BOM items using column mapping.
 * Uses robust parsing for quantities and prices.
 */
export function mapImportRowsToBOM(
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

    // Robust parsing
    const quantityRaw = getVal(mapping.quantity);
    const priceRaw = getVal(mapping.unitPrice);

    return {
      project_id: projectId,
      location_id: locationId,
      part_id: null,
      part_number: getVal(mapping.partNumber) || 'UNKNOWN',
      description: getVal(mapping.description) || '',
      secondary_description: null,
      quantity: parseQuantity(quantityRaw),
      unit: getVal(mapping.unit) || 'EA',
      unit_price: parseCurrency(priceRaw),
      manufacturer: getVal(mapping.manufacturer) || null,
      supplier: getVal(mapping.supplier) || null,
      category: getVal(mapping.category) || null,
      reference_designator: getVal(mapping.referenceDesignator) || null,
      is_spare: 0,
      sort_order: index,
    };
  });
}
