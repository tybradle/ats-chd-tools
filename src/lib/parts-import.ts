import { manufacturers, categories, parts } from '@/lib/db/client';
import type { CSVRow } from '@/types/bom';

export interface PartsColumnMapping {
  manufacturer?: number;
  partNumber?: number;
  description?: number;
  secondaryDescription?: number;
  unit?: number;
  category?: number;
}

export interface PartsImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ rowIndex: number; message: string }>;
}

/**
 * Normalize a string value from CSV/Excel
 */
function normalizeValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim().replace(/\s+/g, ' ');
}

/**
 * Import parts from parsed rows with column mapping
 */
export async function importPartsFromRows(
  rows: CSVRow[],
  mapping: PartsColumnMapping,
  headers: string[]
): Promise<PartsImportResult> {
  const result: PartsImportResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: []
  };

  // Validate required mapping
  if (mapping.partNumber === undefined) {
    result.errors.push({ rowIndex: 0, message: 'Part Number column is required' });
    return result;
  }

  // Preload manufacturers and categories
  const allManufacturers = await manufacturers.getAll();
  const manufacturerMap = new Map(
    allManufacturers.map(m => [m.name.toLowerCase(), m.id])
  );

  const allCategories = await categories.getAll();
  const categoryMap = new Map(
    allCategories.map(c => [c.name.toLowerCase(), c.id])
  );

  // Process each row
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    try {
      // Extract manufacturer
      const manufacturerRaw = mapping.manufacturer !== undefined
        ? normalizeValue(row[headers[mapping.manufacturer]])
        : '';

      if (!manufacturerRaw) {
        result.errors.push({ rowIndex: i + 1, message: 'Manufacturer is required' });
        result.skipped++;
        continue;
      }

      // Resolve or create manufacturer
      const manufacturerLower = manufacturerRaw.toLowerCase();
      let manufacturerId = manufacturerMap.get(manufacturerLower);

       if (!manufacturerId) {
         // Auto-create manufacturer
         try {
           const createResult = await manufacturers.create(manufacturerRaw);
           manufacturerId = createResult.lastInsertId;

           // Reload to get the created manufacturer
           const newMfr = await manufacturers.getByName(manufacturerRaw);
           if (newMfr) {
             manufacturerMap.set(newMfr.name.toLowerCase(), newMfr.id);
             manufacturerId = newMfr.id;
           }
         } catch (error) {
           // Handle UNIQUE constraint collision - manufacturer already exists
           const existingMfr = await manufacturers.getByName(manufacturerRaw);
           if (existingMfr) {
             manufacturerMap.set(existingMfr.name.toLowerCase(), existingMfr.id);
             manufacturerId = existingMfr.id;
           } else {
             // Re-throw if it's not a UNIQUE constraint issue
             throw error;
           }
         }
       }

      // Extract part number
      const partNumber = mapping.partNumber !== undefined
        ? normalizeValue(row[headers[mapping.partNumber]])
        : '';

      if (!partNumber) {
        result.errors.push({ rowIndex: i + 1, message: 'Part Number is required' });
        result.skipped++;
        continue;
      }

      // Extract optional fields
      const description = mapping.description !== undefined
        ? normalizeValue(row[headers[mapping.description]])
        : '';

      const secondaryDescription = mapping.secondaryDescription !== undefined
        ? normalizeValue(row[headers[mapping.secondaryDescription]])
        : '';

      const unit = mapping.unit !== undefined
        ? normalizeValue(row[headers[mapping.unit]])
        : '';

      const categoryRaw = mapping.category !== undefined
        ? normalizeValue(row[headers[mapping.category]])
        : '';

       let categoryId: number | null = null;
       if (categoryRaw) {
         const categoryLower = categoryRaw.toLowerCase();
         categoryId = categoryMap.get(categoryLower) ?? null;
         // If category not found, silently skip (categoryId stays null)
         // Only set categoryId if both categoryRaw is non-empty AND category exists
         if (!categoryId) {
           categoryId = null; // Explicitly set to null when category doesn't exist
         }
       }

      // Check if part exists (duplicate detection)
      const existingPart = await parts.getByKey(partNumber, manufacturerId!);

      if (existingPart) {
        // UPDATE existing part
        const updates: {
          part_number?: string;
          manufacturer_id?: number;
          description?: string;
          secondary_description?: string | null;
          category_id?: number | null;
          unit?: string;
        } = {};

         // Only update non-empty fields
         if (description) updates.description = description;
         if (secondaryDescription) updates.secondary_description = secondaryDescription || null;
         if (unit) updates.unit = unit;
         // Only set category_id when category cell is non-empty AND category exists
         if (categoryRaw && categoryId !== null) updates.category_id = categoryId;

        // Only call update if there are changes
        if (Object.keys(updates).length > 0) {
          await parts.update(existingPart.id, updates);
          result.updated++;
        } else {
          result.skipped++;
        }
      } else {
        // CREATE new part
        if (!description) {
          result.errors.push({
            rowIndex: i + 1,
            message: 'Description is required for new parts'
          });
          result.skipped++;
          continue;
        }

        await parts.create({
          part_number: partNumber,
          manufacturer_id: manufacturerId!,
          description,
          secondary_description: secondaryDescription || null,
          category_id: categoryId,
          unit: unit || 'EA'
        });

        result.created++;
      }
    } catch (error) {
      console.error(`Error importing row ${i + 1}:`, error);
      result.errors.push({
        rowIndex: i + 1,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      result.skipped++;
    }
  }

  return result;
}
