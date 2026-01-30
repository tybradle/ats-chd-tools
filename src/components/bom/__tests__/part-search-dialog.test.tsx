import { render } from '@testing-library/react';
import { PartSearchDialog } from '@/components/bom/part-search-dialog';
import { describe, test, expect, vi } from 'vitest';

// Mock the db client to avoid real DB access during tests
vi.mock('@/lib/db/client', () => ({
  query: async () => []
}));

describe('PartSearchDialog', () => {
  test('dialog content uses near-full-screen sizing classes and description wraps', () => {
    const handleOpenChange = vi.fn();
    const handleSelect = vi.fn();

    render(
      <PartSearchDialog open={true} onOpenChange={handleOpenChange} onSelect={handleSelect} />
    );

    // Check for sizing classes on DialogContent by scanning elements for the new inset/translate/max-w classes
    const sizingClassFound = Array.from(document.querySelectorAll('*')).some((el) =>
      el.classList && (
        el.classList.contains('inset-2') &&
        el.classList.contains('translate-x-0') &&
        el.classList.contains('translate-y-0') &&
        el.classList.contains('max-w-none')
      )
    );
    expect(sizingClassFound).toBe(true);

    // Ensure no table cell uses the 'truncate' class (description should wrap)
    const tds = Array.from(document.querySelectorAll('td'));
    tds.forEach((td) => expect(td.className).not.toMatch(/\btruncate\b/));
  });
});
