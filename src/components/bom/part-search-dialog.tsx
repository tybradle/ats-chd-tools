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
import { parts } from '@/lib/db/client';
import type { PartWithManufacturer } from '@/types/parts';

export type SearchResult = PartWithManufacturer;

interface PartSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (part: SearchResult) => void;
}

export function PartSearchDialog({ open, onOpenChange, onSelect }: PartSearchDialogProps) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);

  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(async () => {
      // Use the centralized search function which handles JOINs correctly
      // passing empty Manufacturer filter array
      const rows = await parts.search(search, [], 50);
      setResults(rows);
    }, 300);

    return () => clearTimeout(timer);
  }, [search, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Near full-window with 8px inset and translation reset; remove width clamps so container can expand */}
      <DialogContent className="fixed inset-2 translate-x-0 translate-y-0 max-w-none sm:max-w-none w-auto h-auto flex flex-col">
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
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
                    <TableCell>{part.manufacturer_name}</TableCell>
                    <TableCell className="max-w-none whitespace-normal break-words">{part.description}</TableCell>
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
