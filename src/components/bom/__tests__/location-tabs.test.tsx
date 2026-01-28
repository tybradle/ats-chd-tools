import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LocationTabs } from '../location-tabs';
import { useBOMStore } from '@/stores/bom-store';
import type { Mock } from 'vitest';

// Mock the store
vi.mock('@/stores/bom-store', () => ({
  useBOMStore: vi.fn(),
}));

// Helper to get mocked store
const mockedUseBOMStore = useBOMStore as unknown as Mock;

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('LocationTabs - Delete Confirmation', () => {
  const mockDeleteLocation = vi.fn();
  const mockSetCurrentLocationId = vi.fn();

  const mockLocations = [
    { id: 1, name: 'Location 1', item_count: 5, export_name: null },
    { id: 2, name: 'Location 2', item_count: 0, export_name: 'LOC2' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseBOMStore.mockReturnValue({
      currentScopePackageId: 100,
      locations: mockLocations,
      currentLocationId: 1,
      setCurrentLocationId: mockSetCurrentLocationId,
      deleteLocation: mockDeleteLocation,
      loading: false,
    });
  });

  it('opens confirmation dialog when delete button is clicked and does not delete immediately', async () => {
    render(<LocationTabs />);
    
    // Find the delete button for the first location (using the X icon)
    // Note: The buttons are opacity-0 by default but should be in DOM
    const deleteButtons = screen.getAllByTitle('Delete');
    fireEvent.click(deleteButtons[0]);

    // Check if AlertDialog appears
    expect(screen.getByRole('heading', { name: /Delete Location/i })).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete location "Location 1"/i)).toBeInTheDocument();
    
    // Verify deleteLocation was NOT called yet
    expect(mockDeleteLocation).not.toHaveBeenCalled();
  });

  it('closes dialog and does not delete when Cancel is clicked', async () => {
    render(<LocationTabs />);
    
    fireEvent.click(screen.getAllByTitle('Delete')[0]);
    
    const cancelButton = screen.getByText(/Cancel/i);
    fireEvent.click(cancelButton);

    // Dialog should be closed (or at least the text should not be visible)
    await waitFor(() => {
      expect(screen.queryByText(/Are you sure you want to delete/i)).not.toBeInTheDocument();
    });

    expect(mockDeleteLocation).not.toHaveBeenCalled();
  });

  it('calls deleteLocation when Confirm is clicked', async () => {
    render(<LocationTabs />);
    
    fireEvent.click(screen.getAllByTitle('Delete')[0]);
    
    const confirmButton = screen.getByText(/Delete Location/i, { selector: 'button' });
    fireEvent.click(confirmButton);

    expect(mockDeleteLocation).toHaveBeenCalledWith(1);
    
    // Wait for dialog to close and success toast
    await waitFor(() => {
      expect(screen.queryByText(/Are you sure you want to delete/i)).not.toBeInTheDocument();
    });
  });

  it('disables buttons when store is loading', () => {
    mockedUseBOMStore.mockReturnValue({
      currentScopePackageId: 100,
      locations: mockLocations,
      currentLocationId: 1,
      setCurrentLocationId: mockSetCurrentLocationId,
      deleteLocation: mockDeleteLocation,
      loading: true, // Loading state
    });

    render(<LocationTabs />);
    
    fireEvent.click(screen.getAllByTitle('Delete')[0]);
    
    expect(screen.getByText(/Cancel/i)).toBeDisabled();
    expect(screen.getByText(/Delete Location/i, { selector: 'button' })).toBeDisabled();
  });
});
