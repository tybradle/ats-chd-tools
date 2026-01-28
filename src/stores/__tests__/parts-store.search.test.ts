import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePartsStore } from '../parts-store';
import { parts } from '@/lib/db/client';
import type { PartWithManufacturer } from '@/types/parts';

vi.mock('@/lib/db/client', () => ({
  parts: {
    getAll: vi.fn(),
    search: vi.fn(),
  },
  manufacturers: {
    getAll: vi.fn(),
  },
  categories: {
    getAll: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('PartsStore - Search and Filtering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePartsStore.setState({
      parts: [],
      searchQuery: '',
      selectedManufacturerIds: [],
      isLoading: false,
      error: null,
      lastRequestId: 0
    });
  });

  it('searchParts calls parts.search with correct parameters', async () => {
    const mockResults = [{ id: 1, part_number: 'P1', manufacturer_id: 10 } as unknown as PartWithManufacturer];
    vi.mocked(parts.search).mockResolvedValue(mockResults);

    await usePartsStore.getState().searchParts({ query: 'test', manufacturerIds: [10] });

    expect(parts.search).toHaveBeenCalledWith('test', [10]);
    expect(usePartsStore.getState().parts).toEqual(mockResults);
  });

  it('searchParts handles empty query and filters by calling getAll', async () => {
    const mockAll = [{ id: 1, part_number: 'P1' } as unknown as PartWithManufacturer];
    vi.mocked(parts.getAll).mockResolvedValue(mockAll);

    await usePartsStore.getState().searchParts({ query: '', manufacturerIds: [] });

    expect(parts.getAll).toHaveBeenCalled();
    expect(usePartsStore.getState().parts).toEqual(mockAll);
  });

  it('prevents stale results using lastRequestId', async () => {
    let firstResolve: (value: PartWithManufacturer[]) => void;
    const firstPromise = new Promise<PartWithManufacturer[]>(resolve => { firstResolve = resolve; });
    
    vi.mocked(parts.search).mockImplementationOnce(() => firstPromise);
    vi.mocked(parts.search).mockResolvedValueOnce([{ id: 2, part_number: 'P2' } as unknown as PartWithManufacturer]);

    const store = usePartsStore.getState();
    
    // Start first search
    const p1 = store.searchParts({ query: 'first' });
    
    // Start second search immediately
    const p2 = store.searchParts({ query: 'second' });
    
    await p2; // Second completes
    expect(usePartsStore.getState().parts).toEqual([{ id: 2, part_number: 'P2' }]);

    // Resolve first search
    firstResolve!([{ id: 1, part_number: 'P1' } as unknown as PartWithManufacturer]);
    await p1;

    // Results should NOT be overwritten by first search
    expect(usePartsStore.getState().parts).toEqual([{ id: 2, part_number: 'P2' }]);
  });

  it('setManufacturerFilter updates state correctly', () => {
    usePartsStore.getState().setManufacturerFilter([1, 2, 3]);
    expect(usePartsStore.getState().selectedManufacturerIds).toEqual([1, 2, 3]);
  });

  it('clearFilters resets state correctly', () => {
    usePartsStore.setState({ searchQuery: 'test', selectedManufacturerIds: [1] });
    usePartsStore.getState().clearFilters();
    expect(usePartsStore.getState().searchQuery).toBe('');
    expect(usePartsStore.getState().selectedManufacturerIds).toEqual([]);
  });
});
