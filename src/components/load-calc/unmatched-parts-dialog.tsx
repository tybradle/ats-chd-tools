import { useState } from 'react';
import { useLoadCalcImportStore } from '@/stores/load-calc-import-store';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { XCircle, Edit, Save, SkipForward, PlusCircle } from 'lucide-react';
import { toast } from 'sonner';

interface UnmatchedPartsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ManualEntryForm {
  partNumber: string;
  description: string;
  manufacturer: string;
  amperage: string;
  wattage: string;
  heatDissipation: string;
}

export function UnmatchedPartsDialog({ open, onOpenChange }: UnmatchedPartsDialogProps) {
  const { rows, matchResults, saveManualEntry, skipUnmatched, mappings } = useLoadCalcImportStore();
  
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<'list' | 'manual'>('list');
  const [manualEntry, setManualEntry] = useState<ManualEntryForm>({
    partNumber: '',
    description: '',
    manufacturer: '',
    amperage: '',
    wattage: '',
    heatDissipation: ''
  });
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  
  // Get unmatched rows
  const unmatchedRows = matchResults
    .filter(r => r.state === 'unmatched')
    .map(result => ({
      ...result,
      rowData: rows[result.rowIndex] || {}
    }));
  
  // Note: selectedUnmatchedRows variable removed as it was unused
  
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(unmatchedRows.map(row => row.rowIndex));
    } else {
      setSelectedRows([]);
    }
  };
  
  const handleSelectRow = (rowIndex: number, checked: boolean) => {
    if (checked) {
      setSelectedRows(prev => [...prev, rowIndex]);
    } else {
      setSelectedRows(prev => prev.filter(index => index !== rowIndex));
    }
  };
  
  const handleSkipSelected = () => {
    if (selectedRows.length === 0) {
      toast.info('No items selected');
      return;
    }
    
    skipUnmatched(selectedRows);
    toast.success(`Skipped ${selectedRows.length} items`);
    setSelectedRows([]);
  };
  
  const handleSkipAll = () => {
    if (unmatchedRows.length === 0) {
      toast.info('No unmatched items');
      return;
    }
    
    const allIndices = unmatchedRows.map(row => row.rowIndex);
    skipUnmatched(allIndices);
    toast.success(`Skipped all ${unmatchedRows.length} unmatched items`);
    setSelectedRows([]);
  };
  
  const handleStartManualEntry = (rowIndex: number) => {
    const row = unmatchedRows.find(r => r.rowIndex === rowIndex);
    if (!row) return;
    
    const rowData = row.rowData;
    setManualEntry({
      partNumber: String(rowData[mappings['part_number'] || ''] || ''),
      description: String(rowData[mappings['description'] || ''] || ''),
      manufacturer: String(rowData[mappings['manufacturer'] || ''] || ''),
      amperage: '',
      wattage: '',
      heatDissipation: ''
    });
    setEditingRowIndex(rowIndex);
    setActiveTab('manual');
  };
  
  const handleSaveManualEntry = async () => {
    if (!manualEntry.partNumber.trim()) {
      toast.error('Part number is required');
      return;
    }
    
    if (editingRowIndex === null) {
      toast.error('No row selected for editing');
      return;
    }
    
    try {
      await saveManualEntry(editingRowIndex, {
        partNumber: manualEntry.partNumber.trim(),
        description: manualEntry.description.trim() || undefined,
        manufacturer: manualEntry.manufacturer.trim() || undefined,
        amperage: manualEntry.amperage ? parseFloat(manualEntry.amperage) : undefined,
        wattage: manualEntry.wattage ? parseFloat(manualEntry.wattage) : undefined,
        heatDissipation: manualEntry.heatDissipation ? parseFloat(manualEntry.heatDissipation) : undefined
      });
      
      toast.success('Manual entry saved');
      setManualEntry({
        partNumber: '',
        description: '',
        manufacturer: '',
        amperage: '',
        wattage: '',
        heatDissipation: ''
      });
      setEditingRowIndex(null);
      setActiveTab('list');
      
      // Remove from selected rows if it was selected
      setSelectedRows(prev => prev.filter(index => index !== editingRowIndex));
    } catch (error) {
      console.error('Failed to save manual entry:', error);
      toast.error('Failed to save manual entry');
    }
  };
  
  const handleAddToMasterParts = () => {
    // Placeholder for future feature
    toast.info('Add to master parts feature will be implemented in a future sprint');
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            Unmatched Parts
          </DialogTitle>
          <DialogDescription>
            {unmatchedRows.length} parts could not be automatically matched. You can manually enter them, skip them, or add them to the master parts list.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'list' | 'manual')} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="list">
              Unmatched List ({unmatchedRows.length})
            </TabsTrigger>
            <TabsTrigger value="manual" disabled={editingRowIndex === null}>
              Manual Entry {editingRowIndex !== null && `(Row ${editingRowIndex + 1})`}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="list" className="flex-1 overflow-hidden flex flex-col">
            {unmatchedRows.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Checkbox className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <p className="text-lg font-medium">All parts matched!</p>
                  <p className="text-sm">No unmatched items to review.</p>
                </div>
              </div>
            ) : (
              <>
                {/* Batch actions */}
                <div className="flex items-center justify-between p-4 border-b">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="select-all"
                        checked={selectedRows.length === unmatchedRows.length && unmatchedRows.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                      <Label htmlFor="select-all" className="text-sm">
                        Select all ({selectedRows.length} selected)
                      </Label>
                    </div>
                    
                    {selectedRows.length > 0 && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSkipSelected}
                        >
                          <SkipForward className="h-4 w-4 mr-2" />
                          Skip Selected
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSkipAll}
                    >
                      <SkipForward className="h-4 w-4 mr-2" />
                      Skip All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddToMasterParts}
                    >
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add to Master Parts
                    </Button>
                  </div>
                </div>
                
                {/* Table */}
                <div className="flex-1 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <span className="sr-only">Select</span>
                        </TableHead>
                        <TableHead>Row</TableHead>
                        <TableHead>Part Number</TableHead>
                        <TableHead>Manufacturer</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {unmatchedRows.map(({ rowIndex, rowData }) => (
                        <TableRow key={rowIndex}>
                          <TableCell>
                            <Checkbox
                              checked={selectedRows.includes(rowIndex)}
                              onCheckedChange={(checked) => 
                                handleSelectRow(rowIndex, checked as boolean)
                              }
                            />
                          </TableCell>
                          <TableCell className="font-mono">#{rowIndex + 1}</TableCell>
                          <TableCell className="font-medium">
                            {String(rowData[mappings['part_number'] || ''] || 'N/A')}
                          </TableCell>
                          <TableCell>
                            {String(rowData[mappings['manufacturer'] || ''] || 'N/A')}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {String(rowData[mappings['description'] || ''] || '')}
                          </TableCell>
                          <TableCell>
                            {String(rowData['qty'] || '1')}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStartManualEntry(rowIndex)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Enter Manually
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </TabsContent>
          
          <TabsContent value="manual" className="flex-1 overflow-auto">
            {editingRowIndex !== null && (
              <div className="space-y-6 p-1">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Manual Entry for Row #{editingRowIndex + 1}</h3>
                  <p className="text-sm text-muted-foreground">
                    Enter the correct part information for this unmatched item.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="partNumber">Part Number *</Label>
                    <Input
                      id="partNumber"
                      value={manualEntry.partNumber}
                      onChange={(e) => setManualEntry(prev => ({ ...prev, partNumber: e.target.value }))}
                      placeholder="Enter part number"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="manufacturer">Manufacturer</Label>
                    <Input
                      id="manufacturer"
                      value={manualEntry.manufacturer}
                      onChange={(e) => setManualEntry(prev => ({ ...prev, manufacturer: e.target.value }))}
                      placeholder="Enter manufacturer"
                    />
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={manualEntry.description}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setManualEntry(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Enter description"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="amperage">Amperage (A)</Label>
                    <Input
                      id="amperage"
                      type="number"
                      step="0.1"
                      value={manualEntry.amperage}
                      onChange={(e) => setManualEntry(prev => ({ ...prev, amperage: e.target.value }))}
                      placeholder="0.0"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="wattage">Wattage (W)</Label>
                    <Input
                      id="wattage"
                      type="number"
                      step="0.1"
                      value={manualEntry.wattage}
                      onChange={(e) => setManualEntry(prev => ({ ...prev, wattage: e.target.value }))}
                      placeholder="0.0"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="heatDissipation">Heat Dissipation (BTU/hr)</Label>
                    <Input
                      id="heatDissipation"
                      type="number"
                      step="0.1"
                      value={manualEntry.heatDissipation}
                      onChange={(e) => setManualEntry(prev => ({ ...prev, heatDissipation: e.target.value }))}
                      placeholder="0.0"
                    />
                  </div>
                </div>
                
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Original Import Data</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Part Number:</span>{' '}
                      {String(rows[editingRowIndex]?.[mappings['part_number'] || ''] || 'N/A')}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Manufacturer:</span>{' '}
                      {String(rows[editingRowIndex]?.[mappings['manufacturer'] || ''] || 'N/A')}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Quantity:</span>{' '}
                      {String(rows[editingRowIndex]?.['qty'] || '1')}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="flex justify-between">
          <div>
            {activeTab === 'list' && (
              <Badge variant="outline">
                {unmatchedRows.length} unmatched, {selectedRows.length} selected
              </Badge>
            )}
          </div>
          
          <div className="flex gap-2">
            {activeTab === 'manual' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setActiveTab('list');
                    setEditingRowIndex(null);
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveManualEntry}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Entry
                </Button>
              </>
            )}
            
            {activeTab === 'list' && (
              <Button onClick={() => onOpenChange(false)}>
                Close
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}