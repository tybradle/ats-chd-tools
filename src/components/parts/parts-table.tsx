import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
} from "@tanstack/react-table";
import { useState, useEffect } from "react";
import { usePartsStore } from "@/stores/parts-store";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit, Trash2, Search, Filter, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PartWithManufacturer } from "@/types/parts";

interface PartsTableProps {
  onEdit: (part: PartWithManufacturer) => void;
}

const columnHelper = createColumnHelper<PartWithManufacturer>();

export function PartsTable({ onEdit }: PartsTableProps) {
  const { 
    parts, 
    manufacturers,
    deletePart, 
    searchQuery, 
    setSearchQuery, 
    selectedManufacturerIds,
    setManufacturerFilter,
    clearFilters,
    searchParts,
    isLoading
  } = usePartsStore();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [partToDelete, setPartToDelete] = useState<number | null>(null);

  const columns = [
    columnHelper.accessor("part_number", {
      header: "Part Number",
      cell: (info) => <span className="font-medium">{info.getValue()}</span>,
    }),
    columnHelper.accessor("manufacturer_name", {
      header: "Manufacturer",
    }),
    columnHelper.accessor("description", {
      header: "Description",
      cell: (info) => (
        <div className="max-w-[300px] truncate" title={info.getValue()}>
          {info.getValue()}
        </div>
      ),
    }),
    columnHelper.accessor("category_id", {
      header: "Unit",
      cell: (info) => info.row.original.unit,
    }),
    columnHelper.display({
      id: "actions",
      cell: (info) => (
        <div className="flex gap-2 justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(info.row.original)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <AlertDialog open={partToDelete === info.row.original.id} onOpenChange={(open) => !open && setPartToDelete(null)}>
              <AlertDialogTrigger asChild>
               <Button
                 variant="ghost"
                 size="icon"
                 className="text-destructive hover:text-destructive-foreground"
                 onClick={() => setPartToDelete(info.row.original.id)}
               >
                 <Trash2 className="h-4 w-4" />
               </Button>
             </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Part</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete {info.row.original.part_number}? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                 <AlertDialogAction
                   className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                   onClick={async () => {
                     await deletePart(info.row.original.id);
                     setPartToDelete(null);
                   }}
                 >
                   Delete
                 </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ),
    }),
  ];

  const table = useReactTable({
    data: parts,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      searchParts({ query: searchQuery, manufacturerIds: selectedManufacturerIds });
      table.setPageIndex(0);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery, selectedManufacturerIds, searchParts, table]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search parts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex gap-2">
                <Filter className="h-4 w-4" />
                Manufacturers
                {selectedManufacturerIds.length > 0 && (
                  <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                    {selectedManufacturerIds.length}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 max-h-[300px] overflow-y-auto" align="end">
              <DropdownMenuLabel>Filter by Manufacturer</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {manufacturers.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">No manufacturers</div>
              ) : (
                manufacturers.map((mfr) => (
                  <DropdownMenuCheckboxItem
                    key={mfr.id}
                    checked={selectedManufacturerIds.includes(mfr.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setManufacturerFilter([...selectedManufacturerIds, mfr.id]);
                      } else {
                        setManufacturerFilter(selectedManufacturerIds.filter(id => id !== mfr.id));
                      }
                    }}
                  >
                    {mfr.name}
                  </DropdownMenuCheckboxItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {(searchQuery || selectedManufacturerIds.length > 0) && (
            <Button variant="ghost" onClick={clearFilters} className="px-2">
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>


      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                    Searching...
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (

                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No parts found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
