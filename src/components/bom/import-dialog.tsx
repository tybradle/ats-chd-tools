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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { readFile } from '@tauri-apps/plugin-fs';
import { open } from '@tauri-apps/plugin-dialog';
import { parseCSV, getCSVHeaders } from '@/lib/csv-parser';
import { parseExcel, getExcelSheets, parseExcelSheet, getWorkbook } from '@/lib/excel-parser';
import { mapImportRowsToBOM } from '@/lib/import-utils';
import { useBOMStore } from '@/stores/bom-store';
import type { ColumnMapping, CSVRow } from '@/types/bom';
import { toast } from 'sonner';
import { FileUp, ArrowRight, ArrowLeft, Check, RefreshCw, Loader2 } from 'lucide-react';
import { isTauri } from '@/lib/db/client';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportDialog({ open: isOpen, onOpenChange }: ImportDialogProps) {
  const [step, setStep] = useState<'upload' | 'sheet-select' | 'mapping' | 'preview'>('upload');
  const [fileType, setFileType] = useState<'csv' | 'excel'>('csv');
  const [fileBuffer, setFileBuffer] = useState<Uint8Array | null>(null);
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [headerRow, setHeaderRow] = useState<number>(1);
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [importing, setImporting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const { currentProject, currentLocationId, bulkImportItems, loadItems } = useBOMStore();

  const resetState = () => {
    setStep('upload');
    setFileType('csv');
    setFileBuffer(null);
    setAvailableSheets([]);
    setSelectedSheet('');
    setHeaderRow(1);
    setCsvData([]);
    setHeaders([]);
    setMapping({});
    setImporting(false);
    setProcessing(false);
  };

  const processParsedRows = (rows: CSVRow[]) => {
    setCsvData(rows);
    setHeaders(getCSVHeaders(rows));
    
    // Auto-map common column names
    const autoMapping: ColumnMapping = {};
    const headerLower = getCSVHeaders(rows).map(h => h.toLowerCase());
    
    const mappings: [keyof ColumnMapping, string[]][] = [
      ['partNumber', ['part number', 'partnumber', 'part_number', 'part #', 'pn', 'item']],
      ['description', ['description', 'desc', 'name', 'item description']],
      ['secondaryDescription', ['secondary description', 'details', 'specs', 'technical']],
      ['quantity', ['quantity', 'qty', 'count', 'amount']],
      ['manufacturer', ['manufacturer', 'mfg', 'mfr', 'vendor']],
      ['unit', ['unit', 'uom', 'units']],
      ['unitPrice', ['price', 'unit price', 'cost', 'unit_price']],
      ['referenceDesignator', ['ref des', 'refdes', 'reference', 'designator']],
      ['supplier', ['supplier', 'vendor', 'distributor']],
      ['category', ['category', 'cat', 'type']],
    ];
    
    mappings.forEach(([key, patterns]) => {
      const idx = headerLower.findIndex(h => patterns.some(p => h.includes(p)));
      if (idx !== -1) autoMapping[key] = idx;
    });
    
    setMapping(autoMapping);
  };

  const handleFilePick = async () => {
    // Browser Fallback
    if (!isTauri) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.csv,.txt,.xlsx,.xls';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        setProcessing(true);
        try {
          const buffer = await file.arrayBuffer();
          const contents = new Uint8Array(buffer);
          const fileName = file.name.toLowerCase();
          
          processFileContents(contents, fileName);
        } catch (error) {
          console.error('Browser file read error:', error);
          toast.error('Failed to read file');
          setProcessing(false);
        }
      };
      input.click();
      return;
    }

    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Spreadsheets', extensions: ['csv', 'txt', 'xlsx', 'xls'] }]
      });

      if (selected && typeof selected === 'string') {
        setProcessing(true);
        
        // Give React a frame to show the processing spinner
        setTimeout(async () => {
          try {
            const contents = await readFile(selected);
            const fileName = selected.toLowerCase();
            processFileContents(contents, fileName);
          } catch (error) {
            console.error('File read error:', error);
            toast.error('Failed to read file');
            setProcessing(false);
          }
        }, 10);
      }
    } catch (error) {
      console.error('Dialog error:', error);
      toast.error('Failed to open file dialog');
      setProcessing(false);
    }
  };

  const processFileContents = (contents: Uint8Array, fileName: string) => {
    try {
      // Detect file type
      const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
      setFileType(isExcel ? 'excel' : 'csv');
      setFileBuffer(contents);
      
      let rows: CSVRow[] = [];
      
      if (isExcel) {
        // Excel file - check for multiple sheets
        // USE OPTIMIZED SINGLE-PASS PARSING
        const workbook = getWorkbook(contents);
        const sheets = getExcelSheets(workbook);
        setAvailableSheets(sheets);
        
        if (sheets.length === 0) {
          toast.error('Excel file contains no sheets');
          setProcessing(false);
          return;
        }
        
        if (sheets.length === 1) {
          // Single sheet - parse directly
          setSelectedSheet(sheets[0]);
          rows = parseExcel(workbook, 0, headerRow - 1);
          console.log(`Parsing single Excel sheet: "${sheets[0]}"`);
        } else {
          // Multiple sheets - show selection step
          setStep('sheet-select');
          setProcessing(false);
          return;
        }
      } else {
        // CSV file
        const text = new TextDecoder().decode(contents);
        rows = parseCSV(text);
      }
      
      if (rows.length === 0) {
        toast.error('File is empty or invalid');
        setProcessing(false);
        return;
      }
      
      processParsedRows(rows);
      setStep('mapping');
    } catch (error) {
      console.error('File parse error:', error);
      toast.error('Failed to parse file');
      setProcessing(false);
    }
  };

  const handleSheetSelection = () => {
    if (!fileBuffer || !selectedSheet) {
      toast.error('Please select a sheet');
      return;
    }
    
    setProcessing(true);
    
    setTimeout(() => {
      try {
        const workbook = getWorkbook(fileBuffer);
        const rows = parseExcelSheet(workbook, selectedSheet, headerRow - 1);
        
        if (rows.length === 0) {
          toast.error(`Sheet "${selectedSheet}" is empty`);
          return;
        }
        
        console.log(`Parsing Excel sheet: "${selectedSheet}"`);
        processParsedRows(rows);
        setStep('mapping');
      } catch (error) {
        console.error('Sheet parse error:', error);
        toast.error('Failed to parse Excel sheet');
      } finally {
        setProcessing(false);
      }
    }, 10);
  };

  const handleHeaderRowChange = (value: string) => {
    const row = parseInt(value);
    if (isNaN(row) || row < 1) return;
    setHeaderRow(row);
  };

  const refreshData = () => {
    if (!fileBuffer) return;

    setProcessing(true);

    setTimeout(() => {
      try {
        let rows: CSVRow[] = [];
        if (fileType === 'excel' && selectedSheet) {
           const workbook = getWorkbook(fileBuffer);
           rows = parseExcelSheet(workbook, selectedSheet, headerRow - 1);
        } else if (fileType === 'csv') {
           const text = new TextDecoder().decode(fileBuffer);
           // Note: CSV parser currently doesn't support header row skipping
           rows = parseCSV(text);
        }
        
        if (rows.length > 0) {
          processParsedRows(rows);
          toast.success(`Reloaded with header row ${headerRow}`);
        }
      } catch (error) {
        console.error('Reparse error:', error);
        toast.error('Failed to reparse file');
      } finally {
        setProcessing(false);
      }
    }, 10);
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
      // Use the new robust mapping function
      const items = mapImportRowsToBOM(csvData, mapping, currentProject.id, currentLocationId);
      
      // Add metadata field which is required by createItem but not returned by mapImportRowsToBOM
      const itemsWithMetadata = items.map(item => ({ ...item, metadata: null }));
      await bulkImportItems(itemsWithMetadata);
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
    { key: 'secondaryDescription', label: 'Secondary Description' },
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
            Import BOM from {fileType === 'excel' ? 'Excel' : 'CSV'}
            {step !== 'upload' && step !== 'sheet-select' && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({csvData.length} rows)
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Processing Overlay */}
        {processing && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
            <p className="text-lg font-medium">Processing file...</p>
            <p className="text-sm text-muted-foreground">This may take a moment for large files</p>
          </div>
        )}

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-lg">
            <FileUp className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="mb-4 text-muted-foreground">Select a spreadsheet file to import</p>
            <p className="mb-4 text-xs text-muted-foreground">Supports CSV (.csv) and Excel (.xlsx, .xls)</p>
            <Button onClick={handleFilePick}>Choose File</Button>
          </div>
        )}

        {/* Step 2: Sheet Selection (Excel only) */}
        {step === 'sheet-select' && (
          <div className="flex flex-col space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              This Excel file contains {availableSheets.length} sheets. Select which sheet to import:
            </p>
            <Select value={selectedSheet} onValueChange={setSelectedSheet}>
              <SelectTrigger>
                <SelectValue placeholder="Select a sheet..." />
              </SelectTrigger>
              <SelectContent>
                {availableSheets.map(sheet => (
                  <SelectItem key={sheet} value={sheet}>
                    {sheet}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep('upload')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button onClick={handleSheetSelection} disabled={!selectedSheet}>
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Column Mapping */}
        {step === 'mapping' && (
          <div className="flex flex-col flex-1 min-h-0 space-y-4">
            
            {/* Header Row Selection */}
            <div className="flex items-end gap-4 p-4 bg-muted/20 rounded-md border">
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="header-row">Header Row</Label>
                <Input 
                  type="number" 
                  id="header-row" 
                  min={1} 
                  value={headerRow} 
                  onChange={(e) => handleHeaderRowChange(e.target.value)} 
                />
              </div>
              <Button variant="outline" size="sm" onClick={refreshData}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Reload Headers
              </Button>
              <div className="text-xs text-muted-foreground flex-1 flex items-center h-10">
                Change this if your column names are not in the first row.
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Map your columns to BOM fields. Required fields are marked with *.
            </p>
            
            <div className="grid grid-cols-2 gap-4 overflow-auto flex-1">
              {fields.map(field => (
                <div key={field.key} className="space-y-1">
                  <label className="text-sm font-medium">
                    {field.label}
                    {field.required && <span className="text-destructive ml-1">*</span>}
                  </label>
                  <Select
                    value={mapping[field.key]?.toString() ?? 'unmapped'}
                    onValueChange={(val) => setMapping(prev => ({ 
                      ...prev, 
                      [field.key]: val === 'unmapped' ? undefined : parseInt(val) 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select column..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unmapped">-- Not Mapped --</SelectItem>
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

        {/* Step 4: Preview */}
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
