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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { generateEplanXML, generateCSV, generateJSON, generateZW1Header } from '@/lib/export-utils';
import { useBOMStore } from '@/stores/bom-store';
import { toast } from 'sonner';
import { FileDown, FileText, FileCode, FileJson } from 'lucide-react';
import { isTauri } from '@/lib/db/client';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ExportFormatOption = 'XML' | 'CSV' | 'JSON';

export function ExportDialog({ open, onOpenChange }: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormatOption>('XML');
  const [includeZW1, setIncludeZW1] = useState(true);
  const [exporting, setExporting] = useState(false);
  const { currentScope, locations, items } = useBOMStore();

  const handleExport = async () => {
    if (!currentScope) {
      toast.error('No package selected');
      return;
    }

    if (items.length === 0) {
      toast.error('No items to export');
      return;
    }

    setExporting(true);

    try {
      let content = '';
      let ext = '';
      let filterName = '';
      
      switch (format) {
        case 'XML':
          content = generateEplanXML(currentScope, locations, items);
          ext = 'xml';
          filterName = 'Eplan XML';
          break;
        case 'CSV':
          content = generateCSV(items);
          ext = 'csv';
          filterName = 'CSV Files';
          break;
        case 'JSON':
          content = generateJSON(currentScope, locations, items);
          ext = 'json';
          filterName = 'JSON Files';
          break;
      }

      const defaultFilename = `${currentScope.project_number}_${currentScope.package_name}_BOM.${ext}`;

      // Browser Download Fallback
      if (!isTauri) {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = defaultFilename;
        a.click();
        URL.revokeObjectURL(url);

        if (format === 'XML' && includeZW1) {
          const zw1Content = generateZW1Header(currentScope.project_number);
          const zw1Blob = new Blob([zw1Content], { type: 'text/plain;charset=utf-8' });
          const zw1Url = URL.createObjectURL(zw1Blob);
          const zw1A = document.createElement('a');
          zw1A.href = zw1Url;
          zw1A.download = defaultFilename.replace(/\.xml$/i, '.zw1');
          zw1A.click();
          URL.revokeObjectURL(zw1Url);
        }

        toast.success(`Downloaded ${defaultFilename}`);
        onOpenChange(false);
        return;
      }

      const path = await save({
        defaultPath: defaultFilename,
        filters: [{ name: filterName, extensions: [ext] }]
      });

      if (path) {
        await writeFile(path, new TextEncoder().encode(content));

        // For XML exports, optionally create .zw1 header file
        if (format === 'XML' && includeZW1) {
          const zw1Content = generateZW1Header(currentScope.project_number);
          const zw1Path = path.replace(/\.xml$/i, '.zw1');
          await writeFile(zw1Path, new TextEncoder().encode(zw1Content));
          toast.success(`Exported to ${path} and ${zw1Path}`);
        } else {
          toast.success(`Exported to ${path}`);
        }

        onOpenChange(false);
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const formatIcons: Record<ExportFormatOption, React.ReactNode> = {
    XML: <FileCode className="w-4 h-4" />,
    CSV: <FileText className="w-4 h-4" />,
    JSON: <FileJson className="w-4 h-4" />,
  };

  const formatDescriptions: Record<ExportFormatOption, string> = {
    XML: 'Eplan P8-compatible XML format with location grouping',
    CSV: 'Comma-separated values for Excel or other spreadsheet apps',
    JSON: 'Full project structure in JSON format for backup or integration',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="w-5 h-5" />
            Export BOM
          </DialogTitle>
          <DialogDescription>
            Export {items.length} items from {currentScope?.project_number || 'package'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div className="space-y-2">
            <Label>Export Format</Label>
            <Select 
              value={format} 
              onValueChange={(val) => setFormat(val as ExportFormatOption)}
            >
              <SelectTrigger>
                <div className="flex items-center gap-2">
                  {formatIcons[format]}
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="XML">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4" />
                    Eplan XML (.xml)
                  </div>
                </SelectItem>
                <SelectItem value="CSV">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Excel CSV (.csv)
                  </div>
                </SelectItem>
                <SelectItem value="JSON">
                  <div className="flex items-center gap-2">
                    <FileJson className="w-4 h-4" />
                    JSON (.json)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {formatDescriptions[format]}
            </p>
          </div>

          {/* ZW1 Header Option (XML only) */}
          {format === 'XML' && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-zw1"
                checked={includeZW1}
                onCheckedChange={(checked) => setIncludeZW1(checked === true)}
              />
              <Label htmlFor="include-zw1" className="text-sm font-normal cursor-pointer">
                Include .zw1 header file for Eplan import
              </Label>
            </div>
          )}

          {/* Export Summary */}
          <div className="rounded-md bg-muted p-3 text-sm">
            <div className="font-medium mb-1">Export Summary</div>
            <div className="text-muted-foreground space-y-1">
              <div>Package: {currentScope?.project_number} / {currentScope?.package_name}</div>
              <div>Locations: {locations.length}</div>
              <div>Items: {items.length}</div>
            </div>
          </div>

          {/* Export Button */}
          <Button 
            onClick={handleExport} 
            disabled={exporting || items.length === 0} 
            className="w-full"
          >
            <FileDown className="w-4 h-4 mr-2" />
            {exporting ? 'Exporting...' : 'Export to File'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
