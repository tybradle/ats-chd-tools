import { useState, useMemo } from 'react';
import { useLoadCalcProjectStore } from '@/stores/load-calc-project-store';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Lock,
  LockOpen,
  Trash2,
  Table as TableIcon,
  AlertCircle,
  FileUp
} from 'lucide-react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { LineItemTable } from './line-item-table';
import { AddLineItemDialog } from './add-line-item-dialog';
import { EplanImportWizard } from './eplan-import/eplan-import-wizard';
import { CalculateButton, CalculationSummary } from './calculation-panel';
import type { VoltageType } from '@/types/load-calc';

const VOLTAGE_TYPES: { value: VoltageType; label: string }[] = [
  { value: '480VAC_3PH', label: '480VAC 3-Phase' },
  { value: '120VAC_1PH', label: '120VAC 1-Phase' },
  { value: 'DC', label: '24VDC' },
  { value: '600VAC_3PH', label: '600VAC 3-Phase' },
  { value: '230VAC_3PH', label: '230VAC 3-Phase' },
  { value: '480VAC_1PH', label: '480VAC 1-Phase' },
];

export function VoltageTableTabs() {
  const { 
    currentProject, 
    currentLocation, 
    voltageTables, 
    currentVoltageTable,
    selectVoltageTable,
    createVoltageTable,
    toggleTableLock,
    deleteVoltageTable
  } = useLoadCalcProjectStore();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [newVoltage, setNewVoltage] = useState<string>('480VAC_3PH');

  const filteredTables = useMemo(() => {
    return voltageTables.filter(t => t.location_id === (currentLocation?.id || null));
  }, [voltageTables, currentLocation]);

  const handleAdd = async () => {
    if (!currentProject) return;
    await createVoltageTable(currentProject.id, currentLocation?.id || null, newVoltage);
    setIsAddOpen(false);
  };

  if (!currentLocation && currentProject?.bom_package_id) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4">
        <div className="bg-muted p-4 rounded-full">
          <TableIcon className="h-10 w-10 text-muted-foreground/50" />
        </div>
        <div className="max-w-xs space-y-2">
          <h3 className="text-lg font-semibold">No Location Selected</h3>
          <p className="text-sm text-muted-foreground">Select a location from the sidebar to view its voltage tables.</p>
        </div>
      </div>
    );
  }

  // If not linked to BOM, we might still want to support standalone tables (location_id IS NULL)
  // But the requirement says "Link to BOM package (Required for locations)"

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2 border-b flex items-center justify-between bg-muted/10">
        <div className="flex items-center gap-2">
          <TableIcon className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">Voltage Tables {currentLocation ? `for ${currentLocation.name}` : ''}</span>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-8 gap-1" 
          onClick={() => setIsAddOpen(true)}
          disabled={!currentProject}
        >
          <Plus className="h-3.5 w-3.5" />
          New Table
        </Button>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        {filteredTables.length > 0 ? (
          <Tabs 
            value={currentVoltageTable?.id.toString()} 
            onValueChange={(val) => {
              const table = filteredTables.find(t => t.id.toString() === val);
              if (table) selectVoltageTable(table);
            }}
            className="flex flex-col h-full"
          >
            <div className="px-4 border-b flex items-center gap-4">
              <TabsList className="h-10 bg-transparent p-0 gap-6">
                {filteredTables.map((table) => (
                  <TabsTrigger 
                    key={table.id} 
                    value={table.id.toString()}
                    className="relative h-10 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-1 pb-2 pt-2 transition-none"
                  >
                    <div className="flex items-center gap-2">
                      {table.voltage_type}
                      {table.is_locked && <Lock className="h-3 w-3 text-amber-500" />}
                    </div>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <div className="flex-1 overflow-hidden">
              {filteredTables.map((table) => (
                <TabsContent 
                  key={table.id} 
                  value={table.id.toString()} 
                  className="h-full m-0 outline-none flex flex-col"
                >
                  <div className="flex items-center justify-between px-4 py-2 bg-muted/20 border-b">
                    <div className="flex items-center gap-3">
                      <Badge variant={table.is_locked ? "outline" : "secondary"} className={table.is_locked ? "border-amber-500 text-amber-600 bg-amber-50" : ""}>
                        {table.voltage_type}
                      </Badge>
                      {table.is_locked ? (
                        <div className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                          <Lock className="h-3 w-3" />
                          Locked (Read Only)
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
                          <LockOpen className="h-3 w-3" />
                          Unlocked
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <CalculateButton />
                      {!table.is_locked && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5"
                            onClick={() => setIsImportOpen(true)}
                          >
                            <FileUp className="h-3.5 w-3.5" />
                            Import
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5"
                            onClick={() => setIsAddItemOpen(true)}
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add Item
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1.5"
                        onClick={() => toggleTableLock(table.id, !table.is_locked)}
                      >
                        {table.is_locked ? (
                          <>
                            <LockOpen className="h-3.5 w-3.5 text-amber-600" />
                            Unlock
                          </>
                        ) : (
                          <>
                            <Lock className="h-3.5 w-3.5 text-amber-600" />
                            Lock Table
                          </>
                        )}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => deleteVoltageTable(table.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  
                  <CalculationSummary />
                  <div className="flex-1 overflow-auto">
                    <LineItemTable />
                  </div>
                </TabsContent>
              ))}
            </div>
          </Tabs>
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 p-8 text-center space-y-4">
            <AlertCircle className="h-10 w-10 text-muted-foreground/30" />
            <div className="max-w-xs space-y-2">
              <h3 className="text-base font-semibold">No Voltage Tables</h3>
              <p className="text-sm text-muted-foreground">This location doesn't have any voltage tables yet.</p>
              <Button variant="outline" size="sm" onClick={() => setIsAddOpen(true)} className="mt-2">
                Create First Table
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Add Line Item Dialog */}
      <AddLineItemDialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen} />

      {/* EPLAN Import Wizard */}
      <EplanImportWizard open={isImportOpen} onOpenChange={setIsImportOpen} />

      {/* Add Voltage Table Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Voltage Table</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Voltage Type</Label>
              <Select value={newVoltage} onValueChange={setNewVoltage}>
                <SelectTrigger>
                  <SelectValue placeholder="Select voltage type" />
                </SelectTrigger>
                <SelectContent>
                  {VOLTAGE_TYPES.map((v) => (
                    <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Create Table</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
