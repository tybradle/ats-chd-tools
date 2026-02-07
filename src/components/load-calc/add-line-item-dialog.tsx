import { useState, useEffect, useCallback } from 'react';
import { useLoadCalcProjectStore } from '@/stores/load-calc-project-store';
import { useLoadCalcPartsStore, type PartElectricalVariant } from '@/stores/load-calc-parts-store';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Package, PenLine, Loader2, Check } from 'lucide-react';

interface AddLineItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddLineItemDialog({ open, onOpenChange }: AddLineItemDialogProps) {
  const { currentVoltageTable, addLineItem } = useLoadCalcProjectStore();
  const { parts, isLoading, searchQuery, setSearchQuery, fetchParts, getElectricalVariants } = useLoadCalcPartsStore();

  const [tab, setTab] = useState<string>('library');
  const [adding, setAdding] = useState(false);

  // Library tab state
  const [selectedPartId, setSelectedPartId] = useState<number | null>(null);
  const [variants, setVariants] = useState<PartElectricalVariant[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [libraryQty, setLibraryQty] = useState(1);

  // Manual tab state
  const [manualPartNumber, setManualPartNumber] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const [manualQty, setManualQty] = useState(1);
  const [manualUtilization, setManualUtilization] = useState(100);
  const [manualAmperage, setManualAmperage] = useState('');
  const [manualWattage, setManualWattage] = useState('');
  const [manualHeat, setManualHeat] = useState('');

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedPartId(null);
      setVariants([]);
      setLibraryQty(1);
      setManualPartNumber('');
      setManualDescription('');
      setManualQty(1);
      setManualUtilization(100);
      setManualAmperage('');
      setManualWattage('');
      setManualHeat('');
      setAdding(false);
      // Load initial parts if empty
      if (parts.length === 0 && !searchQuery) {
        fetchParts();
      }
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load variants when a part is selected
  useEffect(() => {
    if (selectedPartId) {
      setLoadingVariants(true);
      getElectricalVariants(selectedPartId).then((data) => {
        setVariants(data);
        setLoadingVariants(false);
      });
    }
  }, [selectedPartId, getElectricalVariants]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, [setSearchQuery]);

  const selectedPart = selectedPartId ? parts.find(p => p.id === selectedPartId) : null;

  const handleAddFromLibrary = async () => {
    if (!currentVoltageTable || !selectedPart) return;
    setAdding(true);

    const variant = variants.find(v => v.voltage_type === currentVoltageTable.voltage_type) || variants[0];

    await addLineItem({
      voltage_table_id: currentVoltageTable.id,
      part_id: selectedPart.id,
      qty: libraryQty,
      utilization_pct: variant?.utilization_default ?? 1.0,
      amperage_override: null,
      wattage_override: null,
      heat_dissipation_override: null,
      description: selectedPart.description,
      manual_part_number: selectedPart.part_number,
      power_group: null,
      phase_assignment: null,
    });

    setAdding(false);
    onOpenChange(false);
  };

  const handleAddManual = async () => {
    if (!currentVoltageTable || !manualPartNumber.trim()) return;
    setAdding(true);

    await addLineItem({
      voltage_table_id: currentVoltageTable.id,
      part_id: null,
      qty: manualQty,
      utilization_pct: manualUtilization / 100,
      amperage_override: manualAmperage ? parseFloat(manualAmperage) : null,
      wattage_override: manualWattage ? parseFloat(manualWattage) : null,
      heat_dissipation_override: manualHeat ? parseFloat(manualHeat) : null,
      description: manualDescription || null,
      manual_part_number: manualPartNumber.trim(),
      power_group: null,
      phase_assignment: null,
    });

    setAdding(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Line Item</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="library" className="gap-2">
              <Package className="h-4 w-4" />
              From Parts Library
            </TabsTrigger>
            <TabsTrigger value="manual" className="gap-2">
              <PenLine className="h-4 w-4" />
              Manual Entry
            </TabsTrigger>
          </TabsList>

          {/* Library Tab */}
          <TabsContent value="library" className="flex-1 flex flex-col min-h-0 space-y-3 mt-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by part number, manufacturer, or description..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>

            <div className="flex-1 min-h-0 overflow-auto border rounded-md">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0">
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead>Part Number</TableHead>
                    <TableHead>Manufacturer</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-32 text-center">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : parts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-32 text-center text-sm text-muted-foreground italic">
                        {searchQuery ? 'No parts found matching your search.' : 'No parts in the library.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    parts.slice(0, 50).map((p) => (
                      <TableRow
                        key={p.id}
                        className={selectedPartId === p.id ? 'bg-primary/10' : 'cursor-pointer'}
                        onClick={() => setSelectedPartId(p.id)}
                      >
                        <TableCell className="px-2">
                          {selectedPartId === p.id && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{p.part_number}</TableCell>
                        <TableCell className="text-xs">{p.manufacturer_name}</TableCell>
                        <TableCell className="text-xs truncate max-w-[200px]" title={p.description || ''}>
                          {p.description || '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {parts.length > 50 && (
                <p className="text-[10px] text-muted-foreground text-center py-1 border-t">
                  Showing 50 of {parts.length} results. Refine your search to see more.
                </p>
              )}
            </div>

            {selectedPart && (
              <div className="border rounded-md p-3 bg-muted/20 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{selectedPart.part_number}</p>
                    <p className="text-xs text-muted-foreground">{selectedPart.manufacturer_name} - {selectedPart.description}</p>
                  </div>
                  {loadingVariants ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <div className="flex gap-1">
                      {variants.map(v => (
                        <Badge
                          key={v.id}
                          variant={v.voltage_type === currentVoltageTable?.voltage_type ? 'default' : 'outline'}
                          className="text-[10px]"
                        >
                          {v.voltage_type}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">QTY:</Label>
                    <Input
                      type="number"
                      min={1}
                      value={libraryQty}
                      onChange={(e) => setLibraryQty(Math.max(1, parseInt(e.target.value) || 1))}
                      className="h-8 w-[70px] text-xs"
                    />
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Manual Entry Tab */}
          <TabsContent value="manual" className="space-y-4 mt-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Part Number *</Label>
                <Input
                  value={manualPartNumber}
                  onChange={(e) => setManualPartNumber(e.target.value)}
                  placeholder="e.g. 1756-L82ES"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={manualDescription}
                  onChange={(e) => setManualDescription(e.target.value)}
                  placeholder="e.g. ControlLogix Controller"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  min={1}
                  value={manualQty}
                  onChange={(e) => setManualQty(Math.max(1, parseInt(e.target.value) || 1))}
                />
              </div>
              <div className="space-y-2">
                <Label>Utilization %</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={manualUtilization}
                  onChange={(e) => setManualUtilization(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                />
              </div>
            </div>

            <div className="border-t pt-4 space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Electrical Specs (Optional)</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Amperage (A)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="-"
                    value={manualAmperage}
                    onChange={(e) => setManualAmperage(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Wattage (W)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="-"
                    value={manualWattage}
                    onChange={(e) => setManualWattage(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Heat Dissipation (BTU/hr)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="-"
                    value={manualHeat}
                    onChange={(e) => setManualHeat(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {tab === 'library' ? (
            <Button
              onClick={handleAddFromLibrary}
              disabled={!selectedPart || adding}
            >
              {adding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Plus className="mr-2 h-4 w-4" />
              Add to Table
            </Button>
          ) : (
            <Button
              onClick={handleAddManual}
              disabled={!manualPartNumber.trim() || adding}
            >
              {adding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Plus className="mr-2 h-4 w-4" />
              Add Manual Item
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
