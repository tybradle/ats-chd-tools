import { parts } from '@/lib/db/client';
import type { MatchResult, ImportMatchingConfig } from '@/types/load-calc';

/**
 * Normalize a string for matching
 */
export function normalizeString(value: string | null | undefined, config: ImportMatchingConfig): string {
  if (!value) return '';
  
  let normalized = String(value);
  
  if (config.normalizeWhitespace) {
    normalized = normalized.trim().replace(/\s+/g, ' ');
  }
  
  if (config.normalizeCase) {
    normalized = normalized.toLowerCase();
  }
  
  return normalized;
}

/**
 * Extract manufacturer and part number from EPLAN row data
 */
export function extractManufacturerAndPart(
  row: Record<string, unknown>,
  partNumberField: string,
  manufacturerField?: string
): { partNumber: string; manufacturer?: string } {
  const partNumber = row[partNumberField];
  const manufacturer = manufacturerField ? row[manufacturerField] : undefined;
  
  return {
    partNumber: partNumber ? String(partNumber) : '',
    manufacturer: manufacturer ? String(manufacturer) : undefined
  };
}

/**
 * Find exact match for a part in the database
 */
export async function findExactMatch(
  partNumber: string,
  config: ImportMatchingConfig,
  manufacturer?: string
): Promise<{ partId: number | null; confidence: number; matchedPartNumber?: string; matchedManufacturer?: string }> {
  if (!partNumber) {
    return { partId: null, confidence: 0 };
  }
  
  const normalizedPartNumber = normalizeString(partNumber, config);
  
  try {
    // Get all parts first (we'll need to filter in memory since we need to match on normalized values)
    const allParts = await parts.getAll();
    
    // Try exact match with manufacturer if available
    if (manufacturer) {
      const normalizedManufacturer = normalizeString(manufacturer, config);
      
      for (const part of allParts) {
        const dbPartNumber = normalizeString(part.part_number, config);
        const dbManufacturer = normalizeString(part.manufacturer_name, config);
        
        if (dbPartNumber === normalizedPartNumber && dbManufacturer === normalizedManufacturer) {
          return {
            partId: part.id,
            confidence: 1.0,
            matchedPartNumber: part.part_number,
            matchedManufacturer: part.manufacturer_name
          };
        }
      }
    }
    
    // Try match without manufacturer (just part number)
    for (const part of allParts) {
      const dbPartNumber = normalizeString(part.part_number, config);
      
      if (dbPartNumber === normalizedPartNumber) {
        return {
          partId: part.id,
          confidence: manufacturer ? 0.8 : 1.0, // Lower confidence if manufacturer was specified but didn't match
          matchedPartNumber: part.part_number,
          matchedManufacturer: part.manufacturer_name
        };
      }
    }
    
    // No match found
    return { partId: null, confidence: 0 };
  } catch (error) {
    console.error('Error finding match:', error);
    return { partId: null, confidence: 0 };
  }
}

/**
 * Match a single row to database parts
 */
export async function matchRow(
  row: Record<string, unknown>,
  rowIndex: number,
  partNumberField: string,
  manufacturerField: string | undefined,
  config: ImportMatchingConfig
): Promise<MatchResult> {
  const { partNumber, manufacturer } = extractManufacturerAndPart(row, partNumberField, manufacturerField);
  
  if (!partNumber) {
    return {
      rowIndex,
      partId: null,
      confidence: 0,
      state: 'unmatched',
      matchedPartNumber: null,
      matchedManufacturer: null
    };
  }
  
  const match = await findExactMatch(partNumber, config, manufacturer);
  
  return {
    rowIndex,
    partId: match.partId,
    confidence: match.confidence,
    state: match.confidence >= config.matchThreshold ? 'matched' : 'unmatched',
    matchedPartNumber: match.matchedPartNumber || null,
    matchedManufacturer: match.matchedManufacturer || null,
    manualEntry: null
  };
}

/**
 * Match all rows in batch (processes in chunks for performance)
 */
export async function matchAllRows(
  rows: Record<string, unknown>[],
  partNumberField: string,
  manufacturerField: string | undefined,
  config: ImportMatchingConfig,
  onProgress?: (processed: number, total: number) => void
): Promise<MatchResult[]> {
  const results: MatchResult[] = [];
  const BATCH_SIZE = 50; // Process in batches to avoid overwhelming the database
  
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, Math.min(i + BATCH_SIZE, rows.length));
    const batchPromises = batch.map((row, batchIndex) => 
      matchRow(row, i + batchIndex, partNumberField, manufacturerField, config)
    );
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    if (onProgress) {
      onProgress(Math.min(i + BATCH_SIZE, rows.length), rows.length);
    }
  }
  
  return results;
}

/**
 * Update match results after manual entry
 */
export function updateMatchResultWithManualEntry(
  existingResult: MatchResult,
  manualEntry: NonNullable<MatchResult['manualEntry']>
): MatchResult {
  return {
    ...existingResult,
    state: 'manual',
    manualEntry,
    confidence: 0.5, // Manual entries have medium confidence
    partId: null // Manual entries don't link to existing parts
  };
}

/**
 * Skip unmatched items
 */
export function skipMatchResult(existingResult: MatchResult): MatchResult {
  return {
    ...existingResult,
    state: 'skipped',
    confidence: 0
  };
}