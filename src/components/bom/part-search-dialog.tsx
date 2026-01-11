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
import type { Part } from '@/types/parts';

export interface SearchResult extends Part {
  manufacturer?: string;
  unit_price?: number;
}

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
      if (!search.trim()) {
        const rows = await query<SearchResult>('SELECT * FROM parts LIMIT 20');
        setResults(rows);
        return;
      }

      const rows = await query<SearchResult>(
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
