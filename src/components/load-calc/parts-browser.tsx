import { useEffect, useState } from 'react';
import { useLoadCalcPartsStore } from '@/stores/load-calc-parts-store';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Search, Info, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PartDetail } from './part-detail';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";

export function PartsBrowser() {
  const { parts, isLoading, searchQuery, setSearchQuery, fetchParts } = useLoadCalcPartsStore();
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);

  useEffect(() => {
    fetchParts();
  }, [fetchParts]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(debouncedQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [debouncedQuery, setSearchQuery]);

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search part number or description..."
          className="pl-8"
          value={debouncedQuery}
          onChange={(e) => setDebouncedQuery(e.target.value)}
        />
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Part Number</TableHead>
              <TableHead>Manufacturer</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && parts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading parts catalog...
                  </div>
                </TableCell>
              </TableRow>
            ) : parts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  No parts found matching your criteria.
                </TableCell>
              </TableRow>
            ) : (
              parts.map((part) => (
                <TableRow key={part.id}>
                  <TableCell className="font-medium font-mono">{part.part_number}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{part.manufacturer_name}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[400px] truncate">
                    {part.description}
                  </TableCell>
                  <TableCell className="text-right">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Info className="h-4 w-4" />
                          <span className="sr-only">Details</span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <PartDetail partId={part.id} />
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
