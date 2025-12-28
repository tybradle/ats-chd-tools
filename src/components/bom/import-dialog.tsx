import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { readFile } from '@tauri-apps/plugin-fs';
import { open } from '@tauri-apps/plugin-dialog';
import { parseCSV, mapCSVToBOM, getCSVHeaders } from '@/lib/csv-parser';
import { useBOMStore } from '@/stores/bom-store';
import type { ColumnMapping, CSVRow } from '@/types/bom';
import { toast } from 'sonner';
import { FileUp, ArrowRight, ArrowLeft, Check } from 'lucide-react';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportDialog({ open: isOpen, onOpenChange }: ImportDialogProps) {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [importing, setImporting] = useState(false);
  const { currentProject, currentLocationId, bulkImportItems, loadItems } = useBOMStore();

  const resetState = () => {
    setStep('upload');
    setCsvData([]);
    setHeaders([]);
    setMapping({});
    setImporting(false);
  };

  const handleFilePick = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'CSV', extensions: ['csv', 'txt'] }]
      });

      if (selected && typeof selected === 'string') {
        const contents = await readFile(selected);
        const text = new TextDecoder().decode(contents);
        const rows = parseCSV(text);
        
        if (rows.length === 0) {
          toast.error('CSV file is empty or invalid');
          return;
        }
        
        setCsvData(rows);
        setHeaders(getCSVHeaders(rows));
        
        // Auto-map common column names
        const autoMapping: ColumnMapping = {};
        const headerLower = getCSVHeaders(rows).map(h => h.toLowerCase());
        
        const mappings: [keyof ColumnMapping, string[]][] = [
          ['partNumber', ['part number', 'partnumber', 'part_number', 'part #', 'pn', 'item']],
          ['description', ['description', 'desc', 'name', 'item description']],
          ['quantity', ['quantity', 'qty', 'count', 'amount']],
          ['manufacturer', ['manufacturer', 'mfg', 'mfr', 'vendor']],
          ['unit', ['unit', 'uom', 'units']],
          ['unitPrice', ['price', 'unit price', 'cost', 'unit_price']],
          ['referenceDesignator', ['ref des', 'refdes', 'reference', 'designator']],
        ];
        
        mappings.forEach(([key, patterns]) => {
          const idx = headerLower.findIndex(h => patterns.some(p => h.includes(p)));
          if (idx !== -1) autoMapping[key] = idx;
        });
        
        setMapping(autoMapping);
        setStep('mapping');
      }
    } catch (error) {
      console.error('File read error:', error);
      toast.error('Failed to read file');
    }
  };

  const handleImport = async () => {
    if (!currentProject || !currentLocationId) {
      toast.error('No location selected');
      return;
    }
    
    if (mapping.partNumber === undefined) {
      toast.error('Part Number column is required');
      return;
    }
    
    setImporting(true);
    
    try {
      const items = mapCSVToBOM(csvData, mapping, currentProject.id, currentLocationId);
      await bulkImportItems(items);
      await loadItems(currentProject.id, currentLocationId);
      toast.success(`Imported ${items.length} items`);
      onOpenChange(false);
      resetState();
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) resetState();
    onOpenChange(open);
  };

  const fields: { key: keyof ColumnMapping; label: string; required?: boolean }[] = [
    { key: 'partNumber', label: 'Part Number', required: true },
    { key: 'description', label: 'Description', required: true },
    { key: 'quantity', label: 'Quantity' },
    { key: 'manufacturer', label: 'Manufacturer' },
    { key: 'unit', label: 'Unit' },
    { key: 'unitPrice', label: 'Unit Price' },
    { key: 'referenceDesignator', label: 'Ref Des' },
    { key: 'supplier', label: 'Supplier' },
    { key: 'category', label: 'Category' },
  ];

  const getPreviewValue = (row: CSVRow, idx?: number): string => {
    if (idx === undefined) return '';
    const header = headers[idx];
    return header ? (row[header] || '') : '';
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Import BOM from CSV
            {step !== 'upload' && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({csvData.length} rows)
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-lg">
            <FileUp className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="mb-4 text-muted-foreground">Select a CSV file to import</p>
            <Button onClick={handleFilePick}>Choose File</Button>
          </div>
        )}

        {/* Step 2: Column Mapping */}
        {step === 'mapping' && (
          <div className="flex flex-col flex-1 min-h-0 space-y-4">
            <p className="text-sm text-muted-foreground">
              Map your CSV columns to BOM fields. Required fields are marked with *.
            </p>
            
            <div className="grid grid-cols-2 gap-4 overflow-auto flex-1">
              {fields.map(field => (
                <div key={field.key} className="space-y-1">
                  <label className="text-sm font-medium">
                    {field.label}
                    {field.required && <span className="text-destructive ml-1">*</span>}
                  </label>
                  <Select
                    value={mapping[field.key]?.toString() ?? ''}
                    onValueChange={(val) => setMapping(prev => ({ 
                      ...prev, 
                      [field.key]: val === '' ? undefined : parseInt(val) 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select column..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">-- Not Mapped --</SelectItem>
                      {headers.map((h, i) => (
                        <SelectItem key={i} value={i.toString()}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            
            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setStep('upload')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button onClick={() => setStep('preview')} disabled={mapping.partNumber === undefined}>
                Preview
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 'preview' && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Part Number</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-20">Qty</TableHead>
                    <TableHead>Manufacturer</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {csvData.slice(0, 15).map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {getPreviewValue(row, mapping.partNumber)}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {getPreviewValue(row, mapping.description)}
                      </TableCell>
                      <TableCell>
                        {getPreviewValue(row, mapping.quantity) || '1'}
                      </TableCell>
                      <TableCell>
                        {getPreviewValue(row, mapping.manufacturer)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            <p className="text-xs text-muted-foreground mt-2">
              Showing first {Math.min(15, csvData.length)} of {csvData.length} rows
            </p>
            
            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setStep('mapping')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button onClick={handleImport} disabled={importing}>
                <Check className="w-4 h-4 mr-2" />
                {importing ? 'Importing...' : `Import ${csvData.length} Items`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
