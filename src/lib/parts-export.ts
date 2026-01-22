import { save } from '@tauri-apps/plugin-dialog';
import * as XLSX from 'xlsx';
import type { PartWithManufacturer } from '@/types/parts';
import { isTauri } from '@/lib/db/client';

/**
 * Generate CSV content from parts array
 */
export function generatePartsCSV(parts: PartWithManufacturer[]): string {
  const headers = [
    'Manufacturer',
    'Part Number',
    'Description',
    'Secondary Description',
    'Unit',
    'Category'
  ];

  const rows = parts.map(part => [
    part.manufacturer_name || '',
    part.part_number || '',
    part.description || '',
    part.secondary_description || '',
    part.unit || '',
    part.category_name || ''
  ]);

  // Combine headers and rows
  const allRows = [headers, ...rows];

  // Convert to CSV string
  return allRows
    .map(row =>
      row
        .map(String)
        .map(field => {
          // Escape quotes and wrap in quotes if contains comma, quote, or newline
          if (field.includes(',') || field.includes('"') || field.includes('\n')) {
            return `"${field.replace(/"/g, '""')}"`;
          }
          return field;
        })
        .join(',')
    )
    .join('\r\n');
}

/**
 * Generate XLSX content from parts array
 */
export function generatePartsXLSX(parts: PartWithManufacturer[]): Uint8Array {
  const data = parts.map(part => ({
    'Manufacturer': part.manufacturer_name || '',
    'Part Number': part.part_number || '',
    'Description': part.description || '',
    'Secondary Description': part.secondary_description || '',
    'Unit': part.unit || '',
    'Category': part.category_name || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Parts');

  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
}

/**
 * Export parts to CSV file
 */
export async function exportPartsToCSV(parts: PartWithManufacturer[], filename = 'parts-export.csv'): Promise<void> {
  const csv = generatePartsCSV(parts);

  if (isTauri) {
    const filePath = await save({
      filters: [{ name: 'CSV Files', extensions: ['csv'] }],
      defaultPath: filename
    });

    if (filePath) {
      // Use native Tauri API to write file (expects Uint8Array)
      const { writeFile } = await import('@tauri-apps/plugin-fs');
      const encoder = new TextEncoder();
      await writeFile(filePath, encoder.encode(csv));
    }
  } else {
    // Browser fallback
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }
}

/**
 * Export parts to XLSX file
 */
export async function exportPartsToXLSX(parts: PartWithManufacturer[], filename = 'parts-export.xlsx'): Promise<void> {
  const xlsx = generatePartsXLSX(parts);

  if (isTauri) {
    const filePath = await save({
      filters: [{ name: 'Excel Files', extensions: ['xlsx'] }],
      defaultPath: filename
    });

    if (filePath) {
      // Use native Tauri API to write file
      const { writeFile } = await import('@tauri-apps/plugin-fs');
      await writeFile(filePath, xlsx);
    }
  } else {
    // Browser fallback - convert Uint8Array to regular ArrayBuffer for Blob
    const arrayBuffer = new ArrayBuffer(xlsx.byteLength);
    new Uint8Array(arrayBuffer).set(xlsx);
    const blob = new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }
}

export type ExportFormat = 'csv' | 'xlsx';

/**
 * Export parts to specified format
 */
export async function exportParts(parts: PartWithManufacturer[], format: ExportFormat): Promise<void> {
  if (format === 'csv') {
    await exportPartsToCSV(parts);
  } else {
    await exportPartsToXLSX(parts);
  }
}
