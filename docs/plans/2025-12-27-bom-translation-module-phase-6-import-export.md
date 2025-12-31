## Phase 7: CSV Import (2 hours)
# BOM Translation Module - Phase 6: CSV Import & Export

**Navigation:** [Phase 1](./2025-12-27-bom-translation-module-phase-1-database.md) | [Phase 2](./2025-12-27-bom-translation-module-phase-2-store.md) | [Phase 3](./2025-12-27-bom-translation-module-phase-3-projects-ui.md) | [Phase 4](./2025-12-27-bom-translation-module-phase-4-detail-locations.md) | [Phase 5](./2025-12-27-bom-translation-module-phase-5-bom-table.md) | **[Phase 6]** | [Index](./2025-12-27-bom-translation-module-INDEX.md)

**Prerequisites:**
- [ ] Phase 5 completed (BOM table for data display)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement CSV import workflow and multi-format export (XML, CSV, JSON) functionality.

**Architecture:** CSV parsing with column mapping, XML generation matching Eplan format, file dialog integration.

**Tech Stack:** CSV parsing, XML generation, Tauri file plugins, React file handling.

---

## Phase 7: CSV Import (2 hours)

### Task 7.1: Create CSV Parser Utility

**Files:**
- Create: `src/lib/csv-parser.ts`

**Step 1: Create utility**

```typescript
import { CSVRow, ColumnMapping, BOMItem } from '@/types/bom';

export async function parseCSV(text: string): Promise<CSVRow[]> {
  const lines = text.split(/\r?\n/);
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  
  return lines.slice(1)
    .filter(line => line.trim())
    .map(line => {
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const row: CSVRow = {};
      headers.forEach((header, i) => {
        row[header] = values[i] || '';
      });
      return row;
    });
}

export function mapCSVToBOM(
  rows: CSVRow[],
  mapping: ColumnMapping,
  projectId: number,
  locationId: number
): Omit<BOMItem, 'id' | 'created_at' | 'updated_at'>[] {
  const headers = Object.keys(rows[0] || {});
  
  return rows.map((row, index) => {
    const getVal = (idx?: number) => idx !== undefined ? row[headers[idx]] : '';
    
    return {
      project_id: projectId,
      location_id: locationId,
      part_id: null,
      part_number: getVal(mapping.partNumber) || 'UNKNOWN',
      description: getVal(mapping.description) || '',
      secondary_description: getVal(mapping.secondaryDescription) || null,
      quantity: parseFloat(getVal(mapping.quantity)) || 1,
      unit: getVal(mapping.unit) || 'EA',
      unit_price: parseFloat(getVal(mapping.unitPrice)) || null,
      manufacturer: getVal(mapping.manufacturer) || null,
      supplier: getVal(mapping.supplier) || null,
      category: getVal(mapping.category) || null,
      reference_designator: getVal(mapping.referenceDesignator) || null,
      is_spare: 0,
      sort_order: index,
    };
  });
}
```

### Task 7.2: Create Import Dialog

**Files:**
- Create: `src/components/bom/import-dialog.tsx`

**Step 1: Create component**

```typescript
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
import { parseCSV, mapCSVToBOM } from '@/lib/csv-parser';
import { useBOMStore } from '@/stores/bom-store';
import { ColumnMapping, CSVRow } from '@/types/bom';
import { toast } from 'sonner';

export function ImportDialog({ open: isOpen, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const { currentProject, currentLocationId, bulkImportItems } = useBOMStore();

  const handleFilePick = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'CSV', extensions: ['csv'] }]
      });

      if (selected && typeof selected === 'string') {
        const contents = await readFile(selected);
        const text = new TextDecoder().decode(contents);
        const rows = await parseCSV(text);
        if (rows.length > 0) {
          setCsvData(rows);
          setHeaders(Object.keys(rows[0]));
          setStep('mapping');
        }
      }
    } catch (error) {
      toast.error('Failed to read file');
    }
  };

  const handleImport = async () => {
    if (!currentProject || !currentLocationId) return;
    
    const items = mapCSVToBOM(csvData, mapping, currentProject.id, currentLocationId);
    try {
      await bulkImportItems(items);
      toast.success(`Imported ${items.length} items`);
      onOpenChange(false);
      setStep('upload');
    } catch (error) {
      toast.error('Import failed');
    }
  };

  const fields = [
    { key: 'partNumber', label: 'Part Number *' },
    { key: 'description', label: 'Description *' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'manufacturer', label: 'Manufacturer' },
    { key: 'unit', label: 'Unit' },
    { key: 'unitPrice', label: 'Unit Price' },
    { key: 'referenceDesignator', label: 'Ref Des' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import BOM from CSV</DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg">
            <p className="mb-4 text-muted-foreground">Select a CSV file to begin</p>
            <Button onClick={handleFilePick}>Choose File</Button>
          </div>
        )}

        {step === 'mapping' && (
          <div className="space-y-6 overflow-auto">
            <div className="grid grid-cols-2 gap-4">
              {fields.map(field => (
                <div key={field.key} className="space-y-1">
                  <label className="text-sm font-medium">{field.label}</label>
                  <Select
                    onValueChange={(val) => setMapping(prev => ({ ...prev, [field.key]: parseInt(val) }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select column..." />
                    </SelectTrigger>
                    <SelectContent>
                      {headers.map((h, i) => (
                        <SelectItem key={i} value={i.toString()}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep('upload')}>Back</Button>
              <Button onClick={() => setStep('preview')}>Preview</Button>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Part Number</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {csvData.slice(0, 10).map((row, i) => {
                    const getVal = (idx?: number) => idx !== undefined ? row[headers[idx]] : '';
                    return (
                      <TableRow key={i}>
                        <TableCell>{getVal(mapping.partNumber)}</TableCell>
                        <TableCell>{getVal(mapping.description)}</TableCell>
                        <TableCell>{getVal(mapping.quantity)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Showing first 10 rows of {csvData.length}</p>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setStep('mapping')}>Back</Button>
              <Button onClick={handleImport}>Confirm Import</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: Wire up to BOM Table**

Modify `src/components/bom/bom-table.tsx`:

1. Import ImportDialog:
```typescript
import { ImportDialog } from './import-dialog';
```

2. Add state:
```typescript
const [isImportOpen, setIsImportOpen] = useState(false);
```

3. Update Import button:
```typescript
<Button size="sm" variant="outline" onClick={() => setIsImportOpen(true)}>
  <FileUp className="w-4 h-4 mr-2" />
  Import CSV
</Button>
```

4. Add Dialog before end of render:
```typescript
<ImportDialog open={isImportOpen} onOpenChange={setIsImportOpen} />
```

**Step 3: Test workflow**

Run: `npm run tauri:dev`

Test:
1. Click Import CSV
2. Select a CSV file
3. Map columns (Part Number, Description, etc.)
4. Preview data
5. Confirm import → see items added to table

**Step 4: Commit**

```bash
git add src/lib/csv-parser.ts src/components/bom/import-dialog.tsx src/components/bom/bom-table.tsx
git commit -m "feat(ui): add CSV import with column mapping"
```

---

## Phase 8: Export Functionality (2 hours)

### Task 8.1: Create XML Generator (Eplan Schema)

**Files:**
- Create: `src/lib/export-utils.ts`

**Step 1: Create utility**

```typescript
import { BOMItem, BOMLocation } from '@/types/bom';

export function generateEplanXML(project: any, locations: BOMLocation[], items: BOMItem[]): string {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<EplanBomExport>
  <Project Number="${project.project_number}" Name="${project.package_name}" Version="${project.version}">
`;

  locations.forEach(loc => {
    const locItems = items.filter(i => i.location_id === loc.id);
    if (locItems.length === 0) return;

    xml += `    <KittingLocation Name="${loc.export_name || loc.name}">\n`;
    
    locItems.forEach(item => {
      xml += `      <Part>
        <PartNumber>${item.part_number}</PartNumber>
        <Description>${item.description}</Description>
        <Quantity>${item.quantity}</Quantity>
        <Unit>${item.unit}</Unit>
        <Manufacturer>${item.manufacturer || ''}</Manufacturer>
        <Supplier>${item.supplier || ''}</Supplier>
        <RefDes>${item.reference_designator || ''}</RefDes>
        <IsSpare>${item.is_spare ? 'true' : 'false'}</IsSpare>
      </Part>\n`;
    });

    xml += `    </KittingLocation>\n`;
  });

  xml += `  </Project>
</EplanBomExport>`;

  return xml;
}

export function generateCSV(items: BOMItem[]): string {
  const headers = ['Part Number', 'Manufacturer', 'Description', 'Qty', 'Unit', 'Ref Des'];
  const rows = items.map(i => [
    `"${i.part_number}"`,
    `"${i.manufacturer || ''}"`,
    `"${i.description}"`,
    i.quantity,
    `"${i.unit}"`,
    `"${i.reference_designator || ''}"`
  ].join(','));
  
  return [headers.join(','), ...rows].join('\n');
}
```

### Task 8.2: Create Export Dialog

**Files:**
- Create: `src/components/bom/export-dialog.tsx`

**Step 1: Create component**

```typescript
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { generateEplanXML, generateCSV } from '@/lib/export-utils';
import { useBOMStore } from '@/stores/bom-store';
import { toast } from 'sonner';

export function ExportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [format, setFormat] = useState<'XML' | 'CSV' | 'JSON'>('XML');
  const { currentProject, locations, items } = useBOMStore();

  const handleExport = async () => {
    if (!currentProject) return;

    let content = '';
    let ext = '';
    
    if (format === 'XML') {
      content = generateEplanXML(currentProject, locations, items);
      ext = 'xml';
    } else if (format === 'CSV') {
      content = generateCSV(items);
      ext = 'csv';
    } else {
      content = JSON.stringify({ project: currentProject, locations, items }, null, 2);
      ext = 'json';
    }

    try {
      const path = await save({
        defaultPath: `${currentProject.project_number}_BOM.${ext}`,
        filters: [{ name: format, extensions: [ext] }]
      });

      if (path) {
        await writeFile(path, new TextEncoder().encode(content));
        toast.success('File exported successfully');
        onOpenChange(false);
      }
    } catch (error) {
      toast.error('Export failed');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export BOM</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Export Format</label>
            <Select value={format} onValueChange={(val: any) => setFormat(val)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="XML">Eplan XML (P8)</SelectItem>
                <SelectItem value="CSV">Excel CSV</SelectItem>
                <SelectItem value="JSON">Raw JSON</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleExport} className="w-full">Export to File</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: Wire up to BOM Table**

Modify `src/components/bom/bom-table.tsx`:

1. Import ExportDialog:
```typescript
import { ExportDialog } from './export-dialog';
```

2. Add state:
```typescript
const [isExportOpen, setIsExportOpen] = useState(false);
```

3. Update Export button:
```typescript
<Button size="sm" variant="outline" onClick={() => setIsExportOpen(true)}>
  <FileDown className="w-4 h-4 mr-2" />
  Export
</Button>
```

4. Add Dialog before end of render:
```typescript
<ExportDialog open={isExportOpen} onOpenChange={setIsExportOpen} />
```

**Step 3: Test workflow**

Run: `npm run tauri:dev`

Test:
1. Click Export
2. Select XML format
3. Save file to Desktop
4. Open XML and verify structure
5. Repeat for CSV/JSON

**Step 4: Commit**

```bash
git add src/lib/export-utils.ts src/components/bom/export-dialog.tsx src/components/bom/bom-table.tsx
git commit -m "feat(ui): add BOM export to XML/CSV/JSON"
```

---

## Phase Complete Checklist

Before considering BOM Translation module complete, verify:
- [ ] CSV import with column mapping works correctly
- [ ] Validation prevents invalid data import
- [ ] XML export generates proper Eplan-compatible format
- [ ] CSV/JSON exports work and can be imported by other tools
- [ ] File dialogs integrate properly with Tauri
- [ ] Error handling for malformed files
- [ ] All import/export features tested and committed

---

## BOM Translation Module Complete! 🎉

The BOM Translation module now replicates the proven BOM_JS workflow in the new Tauri + React stack. Users can:
- Create/manage BOM projects and locations
- Import CSV data with column mapping
- Edit BOM items inline with catalog search
- Export to XML (Eplan), CSV, and JSON formats
- Full CRUD operations with optimistic updates
