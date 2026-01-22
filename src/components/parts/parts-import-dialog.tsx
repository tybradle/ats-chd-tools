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
import { getExcelSheets, parseExcelSheet, getWorkbook, getExcelSheetPreview, type ExcelSheetPreview } from '@/lib/excel-parser';
import { importPartsFromRows, type PartsColumnMapping } from '@/lib/parts-import';
import { toast } from 'sonner';
import { FileUp, ArrowRight, ArrowLeft, Check, RefreshCw, Loader2 } from 'lucide-react';
import type { CSVRow } from '@/types/bom';
import { isTauri } from '@/lib/db/client';

interface PartsImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: () => void;
}

export function PartsImportDialog({ open: isOpen, onOpenChange, onImported }: PartsImportDialogProps) {
  const [step, setStep] = useState<'upload' | 'sheet-select' | 'mapping' | 'preview'>('upload');
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [headerRow, setHeaderRow] = useState<number>(1);
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<PartsColumnMapping>({});
  const [importing, setImporting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [workbook, setWorkbook] = useState<import('xlsx').WorkBook | null>(null);
  const [sheetPreview, setSheetPreview] = useState<ExcelSheetPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const resetState = () => {
    setStep('upload');
    setAvailableSheets([]);
    setSelectedSheet('');
    setHeaderRow(1);
    setCsvData([]);
    setHeaders([]);
    setMapping({});
    setImporting(false);
    setProcessing(false);
    setWorkbook(null);
    setSheetPreview(null);
    setPreviewError(null);
  };

  const processParsedRows = (rows: CSVRow[]) => {
    setCsvData(rows);
    setHeaders(getCSVHeaders(rows));

    // Auto-map common column names
    const autoMapping: PartsColumnMapping = {};
    const headerLower = getCSVHeaders(rows).map(h => h.toLowerCase());

    const mappings: [keyof PartsColumnMapping, string[]][] = [
      ['manufacturer', ['manufacturer', 'mfr', 'mfg', 'vendor', 'mfg name']],
      ['partNumber', ['part number', 'partnumber', 'part_number', 'part #', 'pn', 'item']],
      ['description', ['description', 'desc', 'name', 'item description']],
      ['secondaryDescription', ['secondary description', 'secondary_description', 'desc2', '2nd desc', 'alt desc']],
      ['unit', ['unit', 'uom', 'units']],
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

          setTimeout(() => processFileContents(contents, fileName), 10);
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
      const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

      if (isExcel) {
        const wb = getWorkbook(contents);
        setWorkbook(wb);
        const sheets = getExcelSheets(wb);
        setAvailableSheets(sheets);

        if (sheets.length === 0) {
          toast.error('Excel file contains no sheets');
          setProcessing(false);
          return;
        }

        const initialSheet = sheets[0];
        setSelectedSheet(initialSheet);

        const preview = getExcelSheetPreview(wb, initialSheet, headerRow - 1, 5, 20);
        setSheetPreview(preview);
        setPreviewError(null);

        if (preview.headers.length === 0) {
          setPreviewError('No data found on this sheet');
        }

        setStep('sheet-select');
        setProcessing(false);
        return;
      } else {
        setWorkbook(null);
        setSheetPreview(null);
        setPreviewError(null);
        setAvailableSheets([]);
        setSelectedSheet('');

        const text = new TextDecoder().decode(contents);
        const rows = parseCSV(text);

        if (rows.length === 0) {
          toast.error('File is empty or invalid');
          setProcessing(false);
          return;
        }

        processParsedRows(rows);
        setStep('mapping');
        setProcessing(false);
      }
    } catch (error) {
      console.error('File parse error:', error);
      toast.error('Failed to parse file');
      setProcessing(false);
    }
  };

  const handleSheetSelection = () => {
    if (!workbook || !selectedSheet) {
      toast.error('Please select a sheet');
      return;
    }

    setProcessing(true);

    setTimeout(() => {
      try {
        const rows = parseExcelSheet(workbook, selectedSheet, headerRow - 1);

        if (rows.length === 0) {
          toast.error(`Sheet "${selectedSheet}" is empty`);
          return;
        }

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

  const updateSheetPreview = (sheetName: string) => {
    if (!workbook) return;
    try {
      const preview = getExcelSheetPreview(workbook, sheetName, headerRow - 1, 5, 20);
      setSheetPreview(preview);
      setPreviewError(preview.headers.length === 0 ? 'No data found on this sheet' : null);
    } catch (e) {
      setSheetPreview(null);
      setPreviewError(e instanceof Error ? e.message : 'Failed to load preview');
    }
  };

  const refreshData = () => {
    if (!workbook || !selectedSheet) return;

    setProcessing(true);

    setTimeout(() => {
      try {
        const rows = parseExcelSheet(workbook, selectedSheet, headerRow - 1);

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
    if (mapping.partNumber === undefined) {
      toast.error('Part Number column is required');
      return;
    }

    if (mapping.manufacturer === undefined) {
      toast.error('Manufacturer column is required');
      return;
    }

    setImporting(true);

    try {
      const result = await importPartsFromRows(csvData, mapping, headers);

      if (result.errors.length > 0) {
        toast.error(`Import completed with ${result.errors.length} errors`);
        console.error('Import errors:', result.errors);
      } else {
        toast.success(`Imported ${result.created} parts, updated ${result.updated} parts`);
      }

      if (onImported) {
        onImported();
      }

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

  const fields: { key: keyof PartsColumnMapping; label: string; required?: boolean }[] = [
    { key: 'manufacturer', label: 'Manufacturer', required: true },
    { key: 'partNumber', label: 'Part Number', required: true },
    { key: 'description', label: 'Description', required: true },
    { key: 'secondaryDescription', label: 'Secondary Description' },
    { key: 'unit', label: 'Unit' },
    { key: 'category', label: 'Category' },
  ];

  const getPreviewValue = (row: CSVRow, idx?: number): string => {
    if (idx === undefined) return '';
    const header = headers[idx];
    return header ? (row[header] || '') : '';
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={`max-h-[85vh] flex flex-col ${
        step === 'preview' ? '!w-[90vw] !max-w-[90vw]' :
        step === 'mapping' ? 'max-w-5xl' :
        'max-w-md'
      }`}>
        <DialogHeader>
          <DialogTitle>
            Import Parts
            {step !== 'upload' && step !== 'sheet-select' && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({csvData.length} rows)
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {(processing || importing) && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg p-6">
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
            <p className="text-lg font-medium mb-2">
              {importing ? 'Importing Parts...' : 'Processing file...'}
            </p>
            <p className="text-sm text-muted-foreground">This may take a moment for large files</p>
          </div>
        )}

        {step === 'upload' && (
          <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-lg">
            <FileUp className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="mb-4 text-muted-foreground">Select a spreadsheet file to import</p>
            <p className="mb-4 text-xs text-muted-foreground">Supports CSV (.csv) and Excel (.xlsx, .xls)</p>
            <Button onClick={handleFilePick}>Choose File</Button>
          </div>
        )}

        {step === 'sheet-select' && (
          <div className="flex flex-col space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              {availableSheets.length === 1
                ? 'This Excel file contains 1 sheet. Confirm the sheet to import:'
                : `This Excel file contains ${availableSheets.length} sheets. Select which sheet to import:`}
            </p>
            <Select
              value={selectedSheet}
              onValueChange={(value) => {
                setSelectedSheet(value);
                updateSheetPreview(value);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a sheet..." />
              </SelectTrigger>
              <SelectContent>
                {availableSheets.map(sheet => (
                  <SelectItem key={sheet} value={sheet}>{sheet}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {previewError && (
              <div className="text-sm text-muted-foreground p-4 bg-muted/20 rounded-md border">
                {previewError}
              </div>
            )}

            {sheetPreview && sheetPreview.headers.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Showing first {sheetPreview.headers.length} columns
                </p>
                <div className="border rounded-md overflow-auto max-h-64">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {sheetPreview.headers.map((header, i) => (
                          <TableHead key={i} className="text-xs font-medium">
                            {header || `(Column ${i + 1})`}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sheetPreview.rows.map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                          {sheetPreview.headers.map((_, colIndex) => (
                            <TableCell key={colIndex} className="text-xs font-mono py-2">
                              {row[colIndex] ?? ''}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

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

        {step === 'mapping' && (
          <div className="flex flex-col flex-1 min-h-0 space-y-4">
            <div className="flex flex-col gap-2 p-4 bg-muted/20 rounded-md border">
              <div className="flex items-end gap-4">
                <div className="grid w-full max-w-[200px] items-center gap-1.5">
                  <Label htmlFor="header-row">Header Row</Label>
                  <Input
                    type="number"
                    id="header-row"
                    min={1}
                    value={headerRow}
                    onChange={(e) => handleHeaderRowChange(e.target.value)}
                  />
                </div>
                <Button variant="outline" className="shrink-0" onClick={refreshData}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reload Headers
                </Button>
              </div>
              <div className="text-sm text-muted-foreground">
                Change this if your column names are not in the first row.
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Map your columns to Parts fields. Required fields are marked with *.
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
              <Button onClick={() => setStep('preview')} disabled={mapping.partNumber === undefined || mapping.manufacturer === undefined}>
                Preview
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Manufacturer</TableHead>
                    <TableHead>Part Number</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {csvData.slice(0, 15).map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell>{getPreviewValue(row, mapping.manufacturer)}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {getPreviewValue(row, mapping.partNumber)}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {getPreviewValue(row, mapping.description)}
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
                {importing ? 'Importing...' : `Import ${csvData.length} Parts`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
