import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PartsTable } from '../parts-table';
import { usePartsStore } from '@/stores/parts-store';
import type { Mock } from 'vitest';

// Mock the store
vi.mock('@/stores/parts-store', () => ({
  usePartsStore: vi.fn(),
}));

const mockedUsePartsStore = usePartsStore as unknown as Mock;

// Mock ResizeObserver which is used by some UI components
vi.stubGlobal('ResizeObserver', vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
})));

describe('PartsTable Render Test', () => {
  const mockOnEdit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockedUsePartsStore.mockReturnValue({
      parts: [],
      manufacturers: [
        { id: 1, name: 'Manufacturer 1' },
        { id: 2, name: 'Manufacturer 2' }
      ],
      deletePart: vi.fn(),
      searchQuery: '',
      setSearchQuery: vi.fn(),
      selectedManufacturerIds: [],
      setManufacturerFilter: vi.fn(),
      clearFilters: vi.fn(),
      searchParts: vi.fn(),
      isLoading: false,
    });
  });

  it('renders PartsTable and UI elements correctly', () => {
    render(<PartsTable onEdit={mockOnEdit} />);
    
    // Check for search input
    expect(screen.getByPlaceholderText(/Search parts.../i)).toBeInTheDocument();
    
    // Check for Manufacturers button (DropdownMenuTrigger)
    expect(screen.getByRole('button', { name: /Manufacturers/i })).toBeInTheDocument();
  });

  it('renders parts in the table', () => {
    mockedUsePartsStore.mockReturnValue({
      parts: [
        { 
          id: 1, 
          part_number: 'PART-001', 
          manufacturer_name: 'Manufacturer 1', 
          description: 'Test Part',
          unit: 'EA',
          category_id: 1,
          manufacturer_id: 1,
          created_at: '',
          updated_at: ''
        }
      ],
      manufacturers: [{ id: 1, name: 'Manufacturer 1' }],
      deletePart: vi.fn(),
      searchQuery: '',
      setSearchQuery: vi.fn(),
      selectedManufacturerIds: [],
      setManufacturerFilter: vi.fn(),
      clearFilters: vi.fn(),
      searchParts: vi.fn(),
      isLoading: false,
    });

    render(<PartsTable onEdit={mockOnEdit} />);
    
    expect(screen.getByText('PART-001')).toBeInTheDocument();
    expect(screen.getByText('Manufacturer 1')).toBeInTheDocument();
  });
});
