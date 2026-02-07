import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  normalizeString,
  extractManufacturerAndPart,
  findExactMatch,
  matchRow,
  matchAllRows,
  updateMatchResultWithManualEntry,
  skipMatchResult
} from '../matching';
import { parts } from '@/lib/db/client';
import type { ImportMatchingConfig, MatchResult } from '@/types/load-calc';
import type { PartWithManufacturer } from '@/types/parts';

// Mock the database client
vi.mock('@/lib/db/client', () => ({
  parts: {
    getAll: vi.fn(),
  },
}));

describe('Matching Module', () => {
  const defaultConfig: ImportMatchingConfig = {
    normalizeWhitespace: true,
    normalizeCase: true,
    matchThreshold: 0.9,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('normalizeString', () => {
    it('should return empty string for null/undefined values', () => {
      expect(normalizeString(null, defaultConfig)).toBe('');
      expect(normalizeString(undefined, defaultConfig)).toBe('');
      expect(normalizeString('', defaultConfig)).toBe('');
    });

    it('should trim whitespace when normalizeWhitespace is true', () => {
      const config = { ...defaultConfig, normalizeWhitespace: true };
      expect(normalizeString('  part123  ', config)).toBe('part123');
      expect(normalizeString('part  123', config)).toBe('part 123');
    });

    it('should not trim whitespace when normalizeWhitespace is false', () => {
      const config = { ...defaultConfig, normalizeWhitespace: false };
      expect(normalizeString('  part123  ', config)).toBe('  part123  ');
    });

    it('should convert to lowercase when normalizeCase is true', () => {
      const config = { ...defaultConfig, normalizeCase: true };
      expect(normalizeString('PART123', config)).toBe('part123');
      expect(normalizeString('Part123', config)).toBe('part123');
    });

    it('should not convert case when normalizeCase is false', () => {
      const config = { ...defaultConfig, normalizeCase: false };
      expect(normalizeString('PART123', config)).toBe('PART123');
    });

    it('should apply both whitespace and case normalization', () => {
      const config = { ...defaultConfig, normalizeWhitespace: true, normalizeCase: true };
      expect(normalizeString('  PART  123  ', config)).toBe('part 123');
    });
  });

  describe('extractManufacturerAndPart', () => {
    it('should extract part number from row data', () => {
      const row = { 'Part Number': 'ABC-123', 'Manufacturer': 'Siemens' };
      const result = extractManufacturerAndPart(row, 'Part Number', 'Manufacturer');
      
      expect(result.partNumber).toBe('ABC-123');
      expect(result.manufacturer).toBe('Siemens');
    });

    it('should handle missing manufacturer field', () => {
      const row = { 'Part Number': 'ABC-123' };
      const result = extractManufacturerAndPart(row, 'Part Number');
      
      expect(result.partNumber).toBe('ABC-123');
      expect(result.manufacturer).toBeUndefined();
    });

    it('should convert values to strings', () => {
      const row = { 'Part Number': 12345, 'Manufacturer': null };
      const result = extractManufacturerAndPart(row, 'Part Number', 'Manufacturer');
      
      expect(result.partNumber).toBe('12345');
      expect(result.manufacturer).toBeUndefined(); // null becomes undefined
    });

    it('should return empty string for missing part number', () => {
      const row = { 'Manufacturer': 'Siemens' };
      const result = extractManufacturerAndPart(row, 'Part Number', 'Manufacturer');
      
      expect(result.partNumber).toBe('');
      expect(result.manufacturer).toBe('Siemens');
    });
  });

  describe('findExactMatch', () => {
    const mockParts: PartWithManufacturer[] = [
      { 
        id: 1, 
        part_number: 'ABC-123', 
        manufacturer_name: 'Siemens',
        manufacturer_code: 'SI',
        category_name: 'Electrical',
        manufacturer_id: 1,
        description: 'Siemens part ABC-123',
        secondary_description: null,
        category_id: 1,
        unit: 'EA',
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      },
      { 
        id: 2, 
        part_number: 'DEF-456', 
        manufacturer_name: 'Allen Bradley',
        manufacturer_code: 'AB',
        category_name: 'Electrical',
        manufacturer_id: 2,
        description: 'Allen Bradley part DEF-456',
        secondary_description: null,
        category_id: 1,
        unit: 'EA',
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      },
      { 
        id: 3, 
        part_number: 'ABC-123', 
        manufacturer_name: 'Generic',
        manufacturer_code: 'GEN',
        category_name: 'Electrical',
        manufacturer_id: 3,
        description: 'Generic part ABC-123',
        secondary_description: null,
        category_id: 1,
        unit: 'EA',
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      }, // Same part number, different manufacturer
    ];

    beforeEach(() => {
      vi.mocked(parts.getAll).mockResolvedValue(mockParts);
    });

    it('should return null for empty part number', async () => {
      const result = await findExactMatch('', defaultConfig);
      expect(result.partId).toBeNull();
      expect(result.confidence).toBe(0);
    });

    it('should find exact match with manufacturer', async () => {
      const result = await findExactMatch('ABC-123', defaultConfig, 'Siemens');
      
      expect(result.partId).toBe(1);
      expect(result.confidence).toBe(1.0);
      expect(result.matchedPartNumber).toBe('ABC-123');
      expect(result.matchedManufacturer).toBe('Siemens');
    });

    it('should find match without manufacturer when manufacturer not specified', async () => {
      const result = await findExactMatch('ABC-123', defaultConfig);
      
      expect(result.partId).toBe(1); // Should find first match (Siemens)
      expect(result.confidence).toBe(1.0);
    });

    it('should find match without manufacturer when manufacturer doesn\'t match', async () => {
      const result = await findExactMatch('ABC-123', defaultConfig, 'WrongManufacturer');
      
      expect(result.partId).toBe(1); // Should find first match (Siemens)
      expect(result.confidence).toBe(0.8); // Lower confidence because manufacturer didn't match
    });

    it('should return null when no match found', async () => {
      const result = await findExactMatch('NON-EXISTENT', defaultConfig, 'Siemens');
      
      expect(result.partId).toBeNull();
      expect(result.confidence).toBe(0);
    });

    it('should handle database errors gracefully', async () => {
      vi.mocked(parts.getAll).mockRejectedValue(new Error('Database error'));
      
      const result = await findExactMatch('ABC-123', defaultConfig, 'Siemens');
      
      expect(result.partId).toBeNull();
      expect(result.confidence).toBe(0);
    });

    it('should respect normalization settings', async () => {
      const config = { ...defaultConfig, normalizeCase: false };
      vi.mocked(parts.getAll).mockResolvedValue([
        { 
          id: 1, 
          part_number: 'ABC-123', 
          manufacturer_name: 'SIEMENS',
          manufacturer_code: 'SI',
          category_name: 'Electrical',
          manufacturer_id: 1,
          description: 'Siemens part ABC-123',
          secondary_description: null,
          category_id: 1,
          unit: 'EA',
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        }
      ]);
      
      const result = await findExactMatch('abc-123', config, 'siemens');
      
      expect(result.partId).toBeNull(); // Should not match due to case sensitivity
    });
  });

  describe('matchRow', () => {
    const mockConfig: ImportMatchingConfig = {
      normalizeWhitespace: true,
      normalizeCase: true,
      matchThreshold: 0.9,
    };

    beforeEach(() => {
      vi.mocked(parts.getAll).mockResolvedValue([
        { 
          id: 1, 
          part_number: 'ABC-123', 
          manufacturer_name: 'Siemens',
          manufacturer_code: 'SI',
          category_name: 'Electrical',
          manufacturer_id: 1,
          description: 'Siemens part ABC-123',
          secondary_description: null,
          category_id: 1,
          unit: 'EA',
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        }
      ]);
    });

    it('should return unmatched for empty part number', async () => {
      const row = { 'Manufacturer': 'Siemens' };
      const result = await matchRow(row, 0, 'Part Number', 'Manufacturer', mockConfig);
      
      expect(result.state).toBe('unmatched');
      expect(result.confidence).toBe(0);
      expect(result.partId).toBeNull();
    });

    it('should return matched when confidence meets threshold', async () => {
      const row = { 'Part Number': 'ABC-123', 'Manufacturer': 'Siemens' };
      const result = await matchRow(row, 0, 'Part Number', 'Manufacturer', mockConfig);
      
      expect(result.state).toBe('matched');
      expect(result.confidence).toBe(1.0);
      expect(result.partId).toBe(1);
    });

    it('should return unmatched when confidence below threshold', async () => {
      const config = { ...mockConfig, matchThreshold: 0.9 };
      vi.mocked(parts.getAll).mockResolvedValue([
        { 
          id: 1, 
          part_number: 'ABC-123', 
          manufacturer_name: 'Siemens',
          manufacturer_code: 'SI',
          category_name: 'Electrical',
          manufacturer_id: 1,
          description: 'Siemens part ABC-123',
          secondary_description: null,
          category_id: 1,
          unit: 'EA',
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        }
      ]);
      
      const row = { 'Part Number': 'ABC-123', 'Manufacturer': 'WrongManufacturer' };
      const result = await matchRow(row, 0, 'Part Number', 'Manufacturer', config);
      
      expect(result.state).toBe('unmatched'); // Confidence 0.8 < 0.9 threshold
      expect(result.confidence).toBe(0.8);
      expect(result.partId).toBe(1);
    });

    it('should include row index in result', async () => {
      const row = { 'Part Number': 'ABC-123', 'Manufacturer': 'Siemens' };
      const result = await matchRow(row, 42, 'Part Number', 'Manufacturer', mockConfig);
      
      expect(result.rowIndex).toBe(42);
    });
  });

  describe('matchAllRows', () => {
    const mockConfig: ImportMatchingConfig = {
      normalizeWhitespace: true,
      normalizeCase: true,
      matchThreshold: 0.9,
    };

    beforeEach(() => {
      vi.mocked(parts.getAll).mockResolvedValue([
        { 
          id: 1, 
          part_number: 'ABC-123', 
          manufacturer_name: 'Siemens',
          manufacturer_code: 'SI',
          category_name: 'Electrical',
          manufacturer_id: 1,
          description: 'Siemens part ABC-123',
          secondary_description: null,
          category_id: 1,
          unit: 'EA',
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        },
        { 
          id: 2, 
          part_number: 'DEF-456', 
          manufacturer_name: 'Allen Bradley',
          manufacturer_code: 'AB',
          category_name: 'Electrical',
          manufacturer_id: 2,
          description: 'Allen Bradley part DEF-456',
          secondary_description: null,
          category_id: 1,
          unit: 'EA',
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        },
      ]);
    });

    it('should match all rows in batches', async () => {
      const rows = [
        { 'Part Number': 'ABC-123', 'Manufacturer': 'Siemens' },
        { 'Part Number': 'DEF-456', 'Manufacturer': 'Allen Bradley' },
        { 'Part Number': 'GHI-789', 'Manufacturer': 'Unknown' }, // No match
      ];

      const results = await matchAllRows(rows, 'Part Number', 'Manufacturer', mockConfig);
      
      expect(results).toHaveLength(3);
      expect(results[0].state).toBe('matched');
      expect(results[0].partId).toBe(1);
      expect(results[1].state).toBe('matched');
      expect(results[1].partId).toBe(2);
      expect(results[2].state).toBe('unmatched');
      expect(results[2].partId).toBeNull();
    });

    it('should call progress callback', async () => {
      const rows = Array.from({ length: 75 }, (_, i) => ({
        'Part Number': `PART-${i}`,
        'Manufacturer': 'Test'
      }));

      const progressCalls: [number, number][] = [];
      const onProgress = (processed: number, total: number) => {
        progressCalls.push([processed, total]);
      };

      await matchAllRows(rows, 'Part Number', 'Manufacturer', mockConfig, onProgress);
      
      // Should be called for each batch (50, 75)
      expect(progressCalls.length).toBeGreaterThan(0);
      expect(progressCalls[0][0]).toBe(50);
      expect(progressCalls[0][1]).toBe(75);
    });

    it('should handle empty rows array', async () => {
      const results = await matchAllRows([], 'Part Number', 'Manufacturer', mockConfig);
      expect(results).toHaveLength(0);
    });
  });

  describe('updateMatchResultWithManualEntry', () => {
    const baseResult: MatchResult = {
      rowIndex: 0,
      partId: null,
      confidence: 0,
      state: 'unmatched',
      matchedPartNumber: null,
      matchedManufacturer: null,
      manualEntry: null,
    };

    it('should update result with manual entry', () => {
      const manualEntry = {
        partNumber: 'MANUAL-001',
        manufacturer: 'Manual Manufacturer',
        voltage: 24,
        current: 2.5,
        power: 60,
        description: 'Manual entry description',
      };

      const updated = updateMatchResultWithManualEntry(baseResult, manualEntry);
      
      expect(updated.state).toBe('manual');
      expect(updated.confidence).toBe(0.5);
      expect(updated.manualEntry).toEqual(manualEntry);
      expect(updated.partId).toBeNull();
    });

    it('should preserve other fields', () => {
      const manualEntry = {
        partNumber: 'MANUAL-001',
        manufacturer: 'Manual Manufacturer',
        voltage: 24,
        current: 2.5,
        power: 60,
        description: 'Manual entry description',
      };

      const updated = updateMatchResultWithManualEntry(baseResult, manualEntry);
      
      expect(updated.rowIndex).toBe(0);
      expect(updated.matchedPartNumber).toBeNull();
      expect(updated.matchedManufacturer).toBeNull();
    });
  });

  describe('skipMatchResult', () => {
    const baseResult: MatchResult = {
      rowIndex: 0,
      partId: null,
      confidence: 0.8,
      state: 'unmatched',
      matchedPartNumber: 'ABC-123',
      matchedManufacturer: 'Siemens',
      manualEntry: null,
    };

    it('should mark result as skipped', () => {
      const skipped = skipMatchResult(baseResult);
      
      expect(skipped.state).toBe('skipped');
      expect(skipped.confidence).toBe(0);
    });

    it('should preserve other fields', () => {
      const skipped = skipMatchResult(baseResult);
      
      expect(skipped.rowIndex).toBe(0);
      expect(skipped.partId).toBeNull();
      expect(skipped.matchedPartNumber).toBe('ABC-123');
      expect(skipped.matchedManufacturer).toBe('Siemens');
      expect(skipped.manualEntry).toBeNull();
    });
  });
});