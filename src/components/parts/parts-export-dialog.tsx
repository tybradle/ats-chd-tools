import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, Download } from 'lucide-react';
import { exportParts, type ExportFormat } from '@/lib/parts-export';
import type { PartWithManufacturer } from '@/types/parts';
import { toast } from 'sonner';

interface PartsExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parts: PartWithManufacturer[];
}

export function PartsExportDialog({ open: isOpen, onOpenChange, parts }: PartsExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (parts.length === 0) {
      toast.error('No parts to export');
      return;
    }

    setExporting(true);

    try {
      await exportParts(parts, format);
      toast.success(`Exported ${parts.length} parts to ${format.toUpperCase()}`);
      onOpenChange(false);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) setFormat('csv');
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export Parts</DialogTitle>
          <DialogDescription>
            Export {parts.length} parts from your database.
          </DialogDescription>
        </DialogHeader>

        {exporting && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg p-6">
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
            <p className="text-lg font-medium">Exporting...</p>
          </div>
        )}

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="format">Export Format</Label>
            <Select value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
              <SelectTrigger id="format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV (.csv) - Comma-separated values</SelectItem>
                <SelectItem value="xlsx">Excel (.xlsx) - Microsoft Excel format</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-muted-foreground border-t pt-4">
            <p className="font-medium mb-2">Export includes:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Manufacturer</li>
              <li>Part Number</li>
              <li>Description</li>
              <li>Secondary Description</li>
              <li>Unit</li>
              <li>Category</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleExport} disabled={exporting || parts.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export {parts.length} Parts
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
