import { useLoadCalcProjectStore } from '@/stores/load-calc-project-store';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function LineItemTable() {
  const { 
    currentVoltageTable, 
    lineItems, 
    deleteLineItem,
    loading 
  } = useLoadCalcProjectStore();

  const isLocked = currentVoltageTable?.is_locked;

  if (loading.lineItems && lineItems.length === 0) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-sm text-muted-foreground italic">Loading line items...</p>
      </div>
    );
  }

  if (lineItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-3">
        <AlertCircle className="h-8 w-8 text-muted-foreground/20" />
        <div>
          <p className="text-sm font-medium text-muted-foreground">No line items in this table.</p>
          <p className="text-xs text-muted-foreground/70">Import from EPLAN or paste from clipboard to add items.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <Table>
        <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm">
          <TableRow>
            <TableHead className="w-[150px]">Manufacturer</TableHead>
            <TableHead className="w-[200px]">Part Number</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right w-[80px]">QTY</TableHead>
            <TableHead className="text-right w-[100px]">Util. %</TableHead>
            <TableHead className="w-[120px]">Group</TableHead>
            <TableHead className="w-[100px]">Phase</TableHead>
            {!isLocked && <TableHead className="w-[50px]"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {lineItems.map((item) => (
            <TableRow key={item.id} className={cn(isLocked && "hover:bg-transparent")}>
              <TableCell className="font-medium text-xs">
                {item.part_id ? 'Master' : (item.manual_part_number ? 'Manual' : '-')}
              </TableCell>
              <TableCell className="font-mono text-xs">
                {item.manual_part_number || '-'}
              </TableCell>
              <TableCell className="text-xs truncate max-w-[300px]" title={item.description || ''}>
                {item.description || '-'}
              </TableCell>
              <TableCell className="text-right font-medium text-xs">
                {item.qty}
              </TableCell>
              <TableCell className="text-right text-xs">
                {Math.round(item.utilization_pct * 100)}%
              </TableCell>
              <TableCell>
                {item.power_group ? (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                    {item.power_group}
                  </Badge>
                ) : '-'}
              </TableCell>
              <TableCell className="text-xs">
                {item.phase_assignment || '-'}
              </TableCell>
              {!isLocked && (
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => deleteLineItem(item.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      {isLocked && (
        <div className="absolute inset-0 bg-background/5 pointer-events-none" />
      )}
    </div>
  );
}
