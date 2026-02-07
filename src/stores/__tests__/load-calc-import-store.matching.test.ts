import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useLoadCalcImportStore } from '../load-calc-import-store';
import { loadCalcLineItems } from '@/lib/db/client';
import * as matching from '@/lib/load-calc/matching';
import type { MatchResult, ImportMatchingConfig } from '@/types/load-calc';

// Mock dependencies
vi.mock('@/lib/db/client', () => ({
  loadCalcLineItems: {
    bulkCreate: vi.fn(),
  },
}));

vi.mock('@/lib/load-calc/matching', () => ({
  matchAllRows: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('LoadCalcImportStore - Matching Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state
    useLoadCalcImportStore.setState({
      step: 'upload',
      file: null,
      headers: [],
      rows: [],
      mappings: {},
      templates: [],
      isLoading: false,
      matchResults: [],
      isMatchingInProgress: false,
      isImporting: false,
      selectedVoltageTableId: null,
      matchingConfig: {
        normalizeWhitespace: true,
        normalizeCase: true,
        matchThreshold: 0.9,
      },
    });
  });

  describe('setSelectedVoltageTableId', () => {
    it('should set selected voltage table ID', () => {
      useLoadCalcImportStore.getState().setSelectedVoltageTableId(42);
      
      expect(useLoadCalcImportStore.getState().selectedVoltageTableId).toBe(42);
    });
  });

  describe('updateMatchingConfig', () => {
    it('should update matching configuration', () => {
      const newConfig: ImportMatchingConfig = {
        normalizeWhitespace: false,
        normalizeCase: false,
        matchThreshold: 0.8,
      };
      
      useLoadCalcImportStore.getState().updateMatchingConfig(newConfig);
      
      expect(useLoadCalcImportStore.getState().matchingConfig).toEqual(newConfig);
    });

    it('should merge partial configuration updates', () => {
      const partialConfig = { matchThreshold: 0.7 };
      
      useLoadCalcImportStore.getState().updateMatchingConfig(partialConfig);
      
      expect(useLoadCalcImportStore.getState().matchingConfig).toEqual({
        normalizeWhitespace: true,
        normalizeCase: true,
        matchThreshold: 0.7,
      });
    });
  });

  describe('runMatching', () => {
    const mockRows = [
      { 'Part Number': 'ABC-123', 'Manufacturer': 'Siemens' },
      { 'Part Number': 'DEF-456', 'Manufacturer': 'Allen Bradley' },
    ];

    const mockMatchResults: MatchResult[] = [
      {
        rowIndex: 0,
        partId: 1,
        confidence: 1.0,
        state: 'matched',
        matchedPartNumber: 'ABC-123',
        matchedManufacturer: 'Siemens',
        manualEntry: null,
      },
      {
        rowIndex: 1,
        partId: null,
        confidence: 0,
        state: 'unmatched',
        matchedPartNumber: null,
        matchedManufacturer: null,
        manualEntry: null,
      },
    ];

    beforeEach(() => {
      useLoadCalcImportStore.setState({
        rows: mockRows,
        mappings: {
          part_number: 'Part Number',
          manufacturer: 'Manufacturer',
          description: 'Description',
          qty: 'Qty',
        },
        matchingConfig: {
          normalizeWhitespace: true,
          normalizeCase: true,
          matchThreshold: 0.9,
        },
      });
    });

    it('should run matching and update results', async () => {
      vi.mocked(matching.matchAllRows).mockResolvedValue(mockMatchResults);
      
      await useLoadCalcImportStore.getState().runMatching();
      
      expect(matching.matchAllRows).toHaveBeenCalledWith(
        mockRows,
        'Part Number',
        'Manufacturer',
        expect.any(Object),
        expect.any(Function)
      );
      
      expect(useLoadCalcImportStore.getState().matchResults).toEqual(mockMatchResults);
      expect(useLoadCalcImportStore.getState().isMatchingInProgress).toBe(false);
    });

    it('should set isMatchingInProgress flag during matching', async () => {
      let resolvePromise: (value: MatchResult[]) => void;
      const promise = new Promise<MatchResult[]>((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(matching.matchAllRows).mockReturnValue(promise);
      
      const matchingPromise = useLoadCalcImportStore.getState().runMatching();
      
      // Should be in progress immediately
      expect(useLoadCalcImportStore.getState().isMatchingInProgress).toBe(true);
      
      // Resolve the promise
      resolvePromise!(mockMatchResults);
      await matchingPromise;
      
      // Should no longer be in progress
      expect(useLoadCalcImportStore.getState().isMatchingInProgress).toBe(false);
    });

    it('should handle matching errors', async () => {
      vi.mocked(matching.matchAllRows).mockRejectedValue(new Error('Matching failed'));
      
      await useLoadCalcImportStore.getState().runMatching();
      
      expect(useLoadCalcImportStore.getState().isMatchingInProgress).toBe(false);
      // Should not have updated matchResults on error
      expect(useLoadCalcImportStore.getState().matchResults).toEqual([]);
    });

    it('should run matching even if already in progress (no concurrency check)', async () => {
      useLoadCalcImportStore.setState({ isMatchingInProgress: true });
      
      vi.mocked(matching.matchAllRows).mockResolvedValue([]);
      
      await useLoadCalcImportStore.getState().runMatching();
      
      // Note: Store doesn't check isMatchingInProgress, so it will run anyway
      // This is a potential issue but matches current implementation
      expect(matching.matchAllRows).toHaveBeenCalled();
    });
  });

  describe('saveManualEntry', () => {
    const mockMatchResults: MatchResult[] = [
      {
        rowIndex: 0,
        partId: null,
        confidence: 0,
        state: 'unmatched',
        matchedPartNumber: null,
        matchedManufacturer: null,
        manualEntry: null,
      },
    ];

    beforeEach(() => {
      useLoadCalcImportStore.setState({ matchResults: mockMatchResults });
    });

    it('should update match result with manual entry', () => {
      const manualEntry = {
        partNumber: 'MANUAL-001',
        manufacturer: 'Manual Manufacturer',
        voltage: 24,
        current: 2.5,
        power: 60,
        description: 'Manual entry description',
      };
      
      useLoadCalcImportStore.getState().saveManualEntry(0, manualEntry);
      
      const updatedResults = useLoadCalcImportStore.getState().matchResults;
      expect(updatedResults[0].state).toBe('manual');
      expect(updatedResults[0].confidence).toBe(0.5);
      expect(updatedResults[0].manualEntry).toEqual(manualEntry);
    });

    it('should handle invalid row index', () => {
      const manualEntry = {
        partNumber: 'MANUAL-001',
        manufacturer: 'Manual Manufacturer',
        voltage: 24,
        current: 2.5,
        power: 60,
        description: 'Manual entry description',
      };
      
      // Should not throw error for invalid index
      expect(() => {
        useLoadCalcImportStore.getState().saveManualEntry(999, manualEntry);
      }).not.toThrow();
    });

    it('should do nothing if entry is null', () => {
      const originalResults = [...useLoadCalcImportStore.getState().matchResults];
      
      useLoadCalcImportStore.getState().saveManualEntry(0, null);
      
      // Should not have changed
      expect(useLoadCalcImportStore.getState().matchResults).toEqual(originalResults);
    });
  });

  describe('skipUnmatched', () => {
    const mockMatchResults: MatchResult[] = [
      {
        rowIndex: 0,
        partId: null,
        confidence: 0,
        state: 'unmatched',
        matchedPartNumber: null,
        matchedManufacturer: null,
        manualEntry: null,
      },
      {
        rowIndex: 1,
        partId: null,
        confidence: 0,
        state: 'unmatched',
        matchedPartNumber: null,
        matchedManufacturer: null,
        manualEntry: null,
      },
      {
        rowIndex: 2,
        partId: 1,
        confidence: 1.0,
        state: 'matched',
        matchedPartNumber: 'ABC-123',
        matchedManufacturer: 'Siemens',
        manualEntry: null,
      },
    ];

    beforeEach(() => {
      useLoadCalcImportStore.setState({ matchResults: mockMatchResults });
    });

    it('should skip single unmatched item', () => {
      useLoadCalcImportStore.getState().skipUnmatched(0);
      
      const updatedResults = useLoadCalcImportStore.getState().matchResults;
      expect(updatedResults[0].state).toBe('skipped');
      expect(updatedResults[0].confidence).toBe(0);
      // Other results should be unchanged
      expect(updatedResults[1].state).toBe('unmatched');
      expect(updatedResults[2].state).toBe('matched');
    });

    it('should skip multiple unmatched items', () => {
      useLoadCalcImportStore.getState().skipUnmatched([0, 1]);
      
      const updatedResults = useLoadCalcImportStore.getState().matchResults;
      expect(updatedResults[0].state).toBe('skipped');
      expect(updatedResults[1].state).toBe('skipped');
      expect(updatedResults[2].state).toBe('matched');
    });

    it('should handle invalid indices gracefully', () => {
      const originalResults = [...useLoadCalcImportStore.getState().matchResults];
      
      useLoadCalcImportStore.getState().skipUnmatched([999, 1000]);
      
      // Should not have changed
      expect(useLoadCalcImportStore.getState().matchResults).toEqual(originalResults);
    });
  });

  describe('importToDatabase', () => {
    const mockMatchResults: MatchResult[] = [
      {
        rowIndex: 0,
        partId: 1,
        confidence: 1.0,
        state: 'matched',
        matchedPartNumber: 'ABC-123',
        matchedManufacturer: 'Siemens',
        manualEntry: null,
      },
      {
        rowIndex: 1,
        partId: null,
        confidence: 0.5,
        state: 'manual',
        matchedPartNumber: null,
        matchedManufacturer: null,
        manualEntry: {
          partNumber: 'MANUAL-001',
          manufacturer: 'Manual Manufacturer',
          amperage: 2.5,
          wattage: 60,
          heatDissipation: 24,
          description: 'Manual entry',
        },
      },
      {
        rowIndex: 2,
        partId: null,
        confidence: 0,
        state: 'skipped',
        matchedPartNumber: null,
        matchedManufacturer: null,
        manualEntry: null,
      },
    ];

    const mockRows = [
      { 'Part Number': 'ABC-123', 'Manufacturer': 'Siemens', 'Description': 'Motor', 'Qty': '1' },
      { 'Part Number': 'MANUAL-001', 'Manufacturer': 'Manual', 'Description': 'Manual part', 'Qty': '1' },
      { 'Part Number': 'SKIPPED-001', 'Manufacturer': 'Skipped', 'Description': 'Skipped part', 'Qty': '1' },
    ];

    beforeEach(() => {
      useLoadCalcImportStore.setState({
        matchResults: mockMatchResults,
        rows: mockRows,
        selectedVoltageTableId: 42,
        mappings: {
          part_number: 'Part Number',
          manufacturer: 'Manufacturer',
          description: 'Description',
          qty: 'Qty',
        },
      });
    });

    it('should import matched and manual items to database', async () => {
      vi.mocked(loadCalcLineItems.bulkCreate).mockResolvedValue([
        { rowsAffected: 1, lastInsertId: undefined },
        { rowsAffected: 1, lastInsertId: undefined }
      ]);
      
      await useLoadCalcImportStore.getState().importToDatabase(42);
      
      expect(loadCalcLineItems.bulkCreate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            voltage_table_id: 42,
            part_id: 1,
            manual_part_number: null,
            description: 'Motor',
            qty: 1,
            utilization_pct: 1.0,
            amperage_override: null,
            wattage_override: null,
            heat_dissipation_override: null,
            power_group: null,
            phase_assignment: null,
            sort_order: 0,
          }),
          expect.objectContaining({
            voltage_table_id: 42,
            part_id: null,
            manual_part_number: 'MANUAL-001',
            description: 'Manual entry',
            qty: 1,
            utilization_pct: 1.0,
            amperage_override: 2.5,
            wattage_override: 60,
            heat_dissipation_override: 24,
            power_group: null,
            phase_assignment: null,
            sort_order: 1,
          }),
        ])
      );
      
      // Should not include skipped items
      const callArgs = vi.mocked(loadCalcLineItems.bulkCreate).mock.calls[0][0];
      expect(callArgs).toHaveLength(2); // Only matched and manual, not skipped
    });

    it('should use default electrical specs for matched items', async () => {
      vi.mocked(loadCalcLineItems.bulkCreate).mockResolvedValue([
        { rowsAffected: 1, lastInsertId: undefined }
      ]);
      
      await useLoadCalcImportStore.getState().importToDatabase(42);
      
      const callArgs = vi.mocked(loadCalcLineItems.bulkCreate).mock.calls[0][0];
      const matchedItem = callArgs[0];
      
      // Should have null values for matched items (not overridden)
      expect(matchedItem.amperage_override).toBeNull();
      expect(matchedItem.wattage_override).toBeNull();
      expect(matchedItem.heat_dissipation_override).toBeNull();
    });

    it('should show error toast if no voltage table selected', async () => {
      useLoadCalcImportStore.setState({ selectedVoltageTableId: null });
      
      await useLoadCalcImportStore.getState().importToDatabase(0); // 0 is invalid voltage table ID
      
      // Should show error toast
      const { toast } = await import('sonner');
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('No voltage table selected'));
    });

    it('should handle database errors with toast', async () => {
      vi.mocked(loadCalcLineItems.bulkCreate).mockRejectedValue(new Error('Database error'));
      
      await useLoadCalcImportStore.getState().importToDatabase(42);
      
      // Should show error toast
      const { toast } = await import('sonner');
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Failed to import'));
    });

    it('should handle missing rows for indices', async () => {
      // Set up state with more match results than rows
      useLoadCalcImportStore.setState({
        matchResults: [...mockMatchResults, {
          rowIndex: 3, // This index doesn't exist in rows array
          partId: null,
          confidence: 0,
          state: 'unmatched',
          matchedPartNumber: null,
          matchedManufacturer: null,
          manualEntry: null,
        }],
        rows: mockRows,
      });
      
      vi.mocked(loadCalcLineItems.bulkCreate).mockResolvedValue([
        { rowsAffected: 1, lastInsertId: undefined },
        { rowsAffected: 1, lastInsertId: undefined }
      ]);
      
      // Should not throw error for missing row
      await expect(
        useLoadCalcImportStore.getState().importToDatabase(42)
      ).resolves.not.toThrow();
    });
  });
});