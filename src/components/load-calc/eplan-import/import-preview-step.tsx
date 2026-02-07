import { useMemo } from 'react';
import { useLoadCalcImportStore } from '@/stores/load-calc-import-store';
import { useLoadCalcProjectStore } from '@/stores/load-calc-project-store';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { CheckCircle2, PenLine, AlertTriangle } from 'lucide-react';

export function ImportPreviewStep() {
  const { matchResults, getPreviewLineItems, selectedVoltageTableId, setSelectedVoltageTableId } = useLoadCalcImportStore();
  const { voltageTables, currentLocation } = useLoadCalcProjectStore();

  const previewItems = useMemo(() => getPreviewLineItems(), [matchResults]); // eslint-disable-line react-hooks/exhaustive-deps

  const stats = useMemo(() => {
    const matched = matchResults.filter(r => r.state === 'matched').length;
    const manual = matchResults.filter(r => r.state === 'manual').length;
    const skipped = matchResults.filter(r => r.state === 'skipped').length;
    const unmatched = matchResults.filter(r => r.state === 'unmatched').length;
    return { matched, manual, skipped, unmatched, total: matchResults.length, importing: matched + manual };
  }, [matchResults]);

  const availableTables = useMemo(() => {
    return voltageTables.filter(t => t.location_id === (currentLocation?.id || null) && !t.is_locked);
  }, [voltageTables, currentLocation]);

  return (
    <div className="space-y-4">
      {/* Stats summary */}
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-md border p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{stats.matched}</p>
          <p className="text-[11px] text-muted-foreground">Matched</p>
        </div>
        <div className="rounded-md border p-3 text-center">
          <p className="text-2xl font-bold text-blue-600">{stats.manual}</p>
          <p className="text-[11px] text-muted-foreground">Manual</p>
        </div>
        <div className="rounded-md border p-3 text-center">
          <p className="text-2xl font-bold text-muted-foreground">{stats.skipped}</p>
          <p className="text-[11px] text-muted-foreground">Skipped</p>
        </div>
        <div className="rounded-md border p-3 text-center bg-primary/5">
          <p className="text-2xl font-bold text-primary">{stats.importing}</p>
          <p className="text-[11px] text-muted-foreground">To Import</p>
        </div>
      </div>

      {stats.unmatched > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 p-2.5 text-sm text-amber-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {stats.unmatched} unmatched items will not be imported. Go back to resolve them.
        </div>
      )}

      {/* Voltage table selector */}
      <div className="flex items-center gap-3">
        <Label className="shrink-0">Import into:</Label>
        <Select
          value={selectedVoltageTableId?.toString() || ''}
          onValueChange={(v) => setSelectedVoltageTableId(parseInt(v, 10))}
        >
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Select a voltage table..." />
          </SelectTrigger>
          <SelectContent>
            {availableTables.length === 0 ? (
              <SelectItem value="_none" disabled>No unlocked tables available</SelectItem>
            ) : (
              availableTables.map((t) => (
                <SelectItem key={t.id} value={t.id.toString()}>
                  {t.voltage_type} (ID: {t.id})
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Preview table */}
      <div className="max-h-[280px] overflow-auto border rounded-md">
        <Table>
          <TableHeader className="bg-muted/50 sticky top-0">
            <TableRow>
              <TableHead className="w-[30px]">#</TableHead>
              <TableHead className="w-[80px]">Source</TableHead>
              <TableHead className="w-[180px]">Part Number</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right w-[60px]">QTY</TableHead>
              <TableHead className="w-[100px]">Group</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {previewItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-sm text-muted-foreground italic">
                  No items to import. Go back and match or manually enter parts.
                </TableCell>
              </TableRow>
            ) : (
              previewItems.map((item, i) => (
                <TableRow key={i} className={item.source === 'matched' ? '' : 'bg-blue-50/50'}>
                  <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                  <TableCell>
                    {item.source === 'matched' ? (
                      <Badge variant="outline" className="text-[10px] border-green-300 text-green-700 bg-green-50 gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Match
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] border-blue-300 text-blue-700 bg-blue-50 gap-1">
                        <PenLine className="h-3 w-3" />
                        Manual
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{item.partNumber || '-'}</TableCell>
                  <TableCell className="text-xs truncate max-w-[200px]" title={item.description}>
                    {item.description || '-'}
                  </TableCell>
                  <TableCell className="text-right text-xs font-medium">{item.qty}</TableCell>
                  <TableCell className="text-xs">{item.powerGroup || '-'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
