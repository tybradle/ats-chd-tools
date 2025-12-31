## Phase 6: Editable BOM Table (3-4 hours)
# BOM Translation Module - Phase 5: Editable BOM Table

**Navigation:** [Phase 1](./2025-12-27-bom-translation-module-phase-1-database.md) | [Phase 2](./2025-12-27-bom-translation-module-phase-2-store.md) | [Phase 3](./2025-12-27-bom-translation-module-phase-3-projects-ui.md) | [Phase 4](./2025-12-27-bom-translation-module-phase-4-detail-locations.md) | **[Phase 5]** | [Phase 6](./2025-12-27-bom-translation-module-phase-6-import-export.md) | [Index](./2025-12-27-bom-translation-module-INDEX.md)

**Prerequisites:**
- [ ] Phase 4 completed (location tabs for filtering)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create editable BOM table with TanStack Table, part search, and full CRUD operations.

**Architecture:** Editable data grid with inline editing, part lookup dialog, and optimistic updates via Zustand.

**Tech Stack:** TanStack Table, React components, Zustand store integration.

---

## Phase 6: Editable BOM Table (3-4 hours)

### Task 6.1: Install Dependencies

Run:
```bash
npm install @tanstack/react-table
```

### Task 6.2: Create Part Search Dialog (Simplified)

We need a way to add parts from the master library.

**Files:**
- Create: `src/components/bom/part-search-dialog.tsx`

**Step 1: Create component**

```typescript
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search } from 'lucide-react';
import { query } from '@/lib/db/client';

interface PartSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (part: any) => void;
}

export function PartSearchDialog({ open, onOpenChange, onSelect }: PartSearchDialogProps) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    if (!open) return;
    
    const timer = setTimeout(async () => {
      if (!search.trim()) {
        const rows = await query('SELECT * FROM parts LIMIT 20');
        setResults(rows);
        return;
      }

      const rows = await query(
        'SELECT * FROM parts WHERE part_number LIKE ? OR description LIKE ? LIMIT 50',
        [`%${search}%`, `%${search}%`]
      );
      setResults(rows);
    }, 300);

    return () => clearTimeout(timer);
  }, [search, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Search Master Parts</DialogTitle>
        </DialogHeader>
        
        <div className="relative mb-4">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by part number or description..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-auto border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Part Number</TableHead>
                <TableHead>Manufacturer</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No parts found
                  </TableCell>
                </TableRow>
              ) : (
                results.map((part) => (
                  <TableRow
                    key={part.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      onSelect(part);
                      onOpenChange(false);
                    }}
                  >
                    <TableCell className="font-mono">{part.part_number}</TableCell>
                    <TableCell>{part.manufacturer}</TableCell>
                    <TableCell className="max-w-xs truncate">{part.description}</TableCell>
                    <TableCell className="text-right">${part.unit_price?.toFixed(2) || '0.00'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### Task 6.3: Create Editable BOM Table

**Files:**
- Create: `src/components/bom/bom-table.tsx`

**Step 1: Create component**

```typescript
import { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Copy, Search, Plus, FileUp, FileDown } from 'lucide-react';
import { useBOMStore } from '@/stores/bom-store';
import { BOMItem } from '@/types/bom';
import { PartSearchDialog } from './part-search-dialog';
import { toast } from 'sonner';

const columnHelper = createColumnHelper<BOMItem>();

export function BomTable() {
  const {
    items,
    currentProject,
    currentLocationId,
    updateItem,
    deleteItem,
    bulkDeleteItems,
    duplicateItem,
    createItem,
    selectedItemIds,
    setSelectedItemIds,
  } = useBOMStore();

  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Define Columns
  const columns = useMemo(() => [
    columnHelper.display({
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
    }),
    columnHelper.accessor('part_number', {
      header: 'Part Number',
      cell: ({ getValue, row }) => (
        <Input
          value={getValue()}
          onChange={(e) => updateItem(row.original.id, { part_number: e.target.value })}
          className="h-8 font-mono"
        />
      ),
    }),
    columnHelper.accessor('manufacturer', {
      header: 'Manufacturer',
      cell: ({ getValue, row }) => (
        <Input
          value={getValue() || ''}
          onChange={(e) => updateItem(row.original.id, { manufacturer: e.target.value })}
          className="h-8"
        />
      ),
    }),
    columnHelper.accessor('description', {
      header: 'Description',
      cell: ({ getValue, row }) => (
        <Input
          value={getValue()}
          onChange={(e) => updateItem(row.original.id, { description: e.target.value })}
          className="h-8"
        />
      ),
    }),
    columnHelper.accessor('quantity', {
      header: 'Qty',
      cell: ({ getValue, row }) => (
        <Input
          type="number"
          value={getValue()}
          onChange={(e) => updateItem(row.original.id, { quantity: parseFloat(e.target.value) || 0 })}
          className="h-8 w-20"
        />
      ),
    }),
    columnHelper.accessor('unit', {
      header: 'Unit',
      cell: ({ getValue, row }) => (
        <Input
          value={getValue()}
          onChange={(e) => updateItem(row.original.id, { unit: e.target.value })}
          className="h-8 w-16"
        />
      ),
    }),
    columnHelper.accessor('reference_designator', {
      header: 'Ref Des',
      cell: ({ getValue, row }) => (
        <Input
          value={getValue() || ''}
          onChange={(e) => updateItem(row.original.id, { reference_designator: e.target.value })}
          className="h-8"
        />
      ),
    }),
    columnHelper.display({
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => duplicateItem(row.original.id)}>
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteItem(row.original.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    }),
  ], [updateItem, deleteItem, duplicateItem]);

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onRowSelectionChange: (updater) => {
      const nextSelection = typeof updater === 'function' ? updater(table.getState().rowSelection) : updater;
      const selectedIds = Object.keys(nextSelection).map(idx => items[parseInt(idx)].id);
      setSelectedItemIds(selectedIds);
      table.setRowSelection(nextSelection);
    },
    state: {
      rowSelection: useMemo(() => {
        const selection: Record<string, boolean> = {};
        selectedItemIds.forEach(id => {
          const idx = items.findIndex(item => item.id === id);
          if (idx !== -1) selection[idx] = true;
        });
        return selection;
      }, [selectedItemIds, items]),
    },
  });

  const handlePartSelect = (part: any) => {
    if (!currentProject || !currentLocationId) return;
    
    createItem({
      project_id: currentProject.id,
      location_id: currentLocationId,
      part_id: part.id,
      part_number: part.part_number,
      description: part.description,
      secondary_description: part.secondary_description,
      quantity: 1,
      unit: part.unit || 'EA',
      unit_price: part.unit_price,
      manufacturer: part.manufacturer,
      supplier: part.supplier,
      category: part.category,
      reference_designator: '',
      is_spare: 0,
      sort_order: items.length + 1,
    });
    toast.success('Part added to BOM');
  };

  const handleAddNew = () => {
    if (!currentProject || !currentLocationId) return;
    createItem({
      project_id: currentProject.id,
      location_id: currentLocationId,
      part_id: null,
      part_number: 'NEW-PART',
      description: 'New Item',
      secondary_description: null,
      quantity: 1,
      unit: 'EA',
      unit_price: null,
      manufacturer: '',
      supplier: '',
      category: '',
      reference_designator: '',
      is_spare: 0,
      sort_order: items.length + 1,
    });
  };

  if (!currentLocationId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground border-2 border-dashed rounded-lg">
        Select a location to view items
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Table Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setIsSearchOpen(true)}>
            <Search className="w-4 h-4 mr-2" />
            Add from Catalog
          </Button>
          <Button size="sm" variant="outline" onClick={handleAddNew}>
            <Plus className="w-4 h-4 mr-2" />
            Add Manual
          </Button>
          <Button size="sm" variant="outline" onClick={() => console.log('Import')}>
            <FileUp className="w-4 h-4 mr-2" />
            Import CSV
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {selectedItemIds.length > 0 && (
            <Button size="sm" variant="destructive" onClick={() => bulkDeleteItems(selectedItemIds)}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete (${selectedItemIds.length})
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => console.log('Export')}>
            <FileDown className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="p-1 px-2">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No items in this location.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <PartSearchDialog
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
        onSelect={handlePartSelect}
      />
    </div>
  );
}
```

**Step 2: Wire up to Project Detail Page**

Modify `src/pages/bom-project.tsx`:

1. Import BomTable:
```typescript
import { BomTable } from '@/components/bom/bom-table';
```

2. Replace placeholder in render:
```typescript
      {/* Table Area */}
      <div className="flex-1 min-h-0">
        <BomTable />
      </div>
```

**Step 3: Test workflow**

Run: `npm run tauri:dev`

Test:
1. Open project, select location
2. Add manual item → see it appear in table
3. Edit fields → check database/store updates
4. Search catalog → select part → see it added to BOM
5. Select rows → delete bulk
6. Duplicate row

**Step 4: Commit**

```bash
git add src/components/bom/part-search-dialog.tsx src/components/bom/bom-table.tsx src/pages/bom-project.tsx
git commit -m "feat(ui): add editable BOM table with catalog search"
```

---

## Phase Complete Checklist

Before moving to next phase, verify:
- [ ] TanStack Table installed and configured
- [ ] BOM table displays items filtered by selected location
- [ ] Inline editing works for all BOM fields
- [ ] Part search dialog allows catalog lookup and selection
- [ ] Bulk operations (delete, duplicate) work correctly
- [ ] Table integrates with store optimistic updates
- [ ] All code committed and ready for Phase 6 (Import & Export)

