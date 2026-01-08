import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
} from "@tanstack/react-table";
import { useState } from "react";
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
import { Edit, Trash2, Search } from "lucide-react";
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
import type { PartWithManufacturer } from "@/types/parts";

interface PartsTableProps {
  onEdit: (part: PartWithManufacturer) => void;
}

const columnHelper = createColumnHelper<PartWithManufacturer>();

export function PartsTable({ onEdit }: PartsTableProps) {
  const { parts, deletePart, searchQuery, setSearchQuery, searchParts } = usePartsStore();
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
                className="text-red-500 hover:text-red-600"
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
                  className="bg-red-500 hover:bg-red-600"
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchParts(searchQuery);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search parts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <Button type="submit">Search</Button>
        </form>
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
            {table.getRowModel().rows?.length ? (
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
