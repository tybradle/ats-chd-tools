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
import type { BOMItem } from '@/types/bom';
import type { PartWithManufacturer } from '@/types/parts';
import { PartSearchDialog } from './part-search-dialog';
import { ImportDialog } from './import-dialog';
import { ExportDialog } from './export-dialog';
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
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

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

  const handlePartSelect = (part: PartWithManufacturer) => {
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
      unit_price: null,
      manufacturer: part.manufacturer_name,
      supplier: '',
      category: part.category_name || '',
      reference_designator: '',
      is_spare: 0,
      sort_order: items.length + 1,
      metadata: null,
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
      metadata: null,
    });
  };

  if (!currentLocationId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground border-2 border-dashed rounded-lg py-12">
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
          <Button size="sm" variant="outline" onClick={() => setIsImportOpen(true)}>
            <FileUp className="w-4 h-4 mr-2" />
            Import CSV
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {selectedItemIds.length > 0 && (
            <Button size="sm" variant="destructive" onClick={() => bulkDeleteItems(selectedItemIds)}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete ({selectedItemIds.length})
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setIsExportOpen(true)}>
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

      <ImportDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
      />

      <ExportDialog
        open={isExportOpen}
        onOpenChange={setIsExportOpen}
      />
    </div>
  );
}
