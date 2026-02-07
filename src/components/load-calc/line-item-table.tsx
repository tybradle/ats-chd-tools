import { useState, useCallback, Fragment } from 'react';
import { useLoadCalcProjectStore } from '@/stores/load-calc-project-store';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, AlertCircle, ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { LoadCalcLineItem, PhaseAssignment } from '@/types/load-calc';

const PHASE_OPTIONS: { value: string; label: string }[] = [
  { value: '_none', label: '-' },
  { value: 'L1', label: 'L1' },
  { value: 'L2', label: 'L2' },
  { value: 'L3', label: 'L3' },
  { value: 'N', label: 'N' },
  { value: 'UNK', label: 'UNK' },
];

interface EditableCellProps {
  value: string | number;
  type?: 'text' | 'number';
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  onSave: (value: string) => void;
}

function EditableCell({ value, type = 'text', disabled, min, max, step, className, onSave }: EditableCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  const handleFocus = () => {
    setDraft(String(value));
    setEditing(true);
  };

  const handleBlur = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed !== String(value)) {
      onSave(trimmed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      setDraft(String(value));
      setEditing(false);
    }
  };

  if (disabled) {
    return <span className={cn("text-xs", className)}>{value}</span>;
  }

  return (
    <Input
      type={type}
      value={editing ? draft : String(value)}
      min={min}
      max={max}
      step={step}
      className={cn(
        "h-7 text-xs px-2 py-0 border-transparent bg-transparent hover:border-input focus:border-input rounded-sm",
        className
      )}
      onFocus={handleFocus}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    />
  );
}

export function LineItemTable() {
  const {
    currentVoltageTable,
    lineItems,
    updateLineItem,
    deleteLineItem,
    loading
  } = useLoadCalcProjectStore();

  const [expandedOverrides, setExpandedOverrides] = useState<Set<number>>(new Set());

  const isLocked = currentVoltageTable?.is_locked;

  const toggleOverrides = useCallback((id: number) => {
    setExpandedOverrides(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleFieldUpdate = useCallback((id: number, field: keyof LoadCalcLineItem, raw: string) => {
    let value: unknown;

    if (field === 'qty') {
      const n = parseInt(raw, 10);
      if (isNaN(n) || n < 1) return;
      value = n;
    } else if (field === 'utilization_pct') {
      const n = parseFloat(raw);
      if (isNaN(n) || n < 0 || n > 100) return;
      value = n / 100; // convert display % to ratio
    } else if (field === 'amperage_override' || field === 'wattage_override' || field === 'heat_dissipation_override') {
      if (raw === '' || raw === '-') {
        value = null;
      } else {
        const n = parseFloat(raw);
        if (isNaN(n)) return;
        value = n;
      }
    } else {
      value = raw || null;
    }

    updateLineItem(id, { [field]: value });
  }, [updateLineItem]);

  const handlePhaseChange = useCallback((id: number, val: string) => {
    const phase: PhaseAssignment = val === '_none' ? null : val as PhaseAssignment;
    updateLineItem(id, { phase_assignment: phase });
  }, [updateLineItem]);

  if (loading.lineItems && lineItems.length === 0) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-sm text-muted-foreground italic">Loading line items...</p>
      </div>
    );
  }

  if (lineItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-3">
        <AlertCircle className="h-8 w-8 text-muted-foreground/20" />
        <div>
          <p className="text-sm font-medium text-muted-foreground">No line items in this table.</p>
          <p className="text-xs text-muted-foreground/70">Use "Add Item" or import from EPLAN to add items.</p>
        </div>
      </div>
    );
  }

  const hasOverrides = (item: LoadCalcLineItem) =>
    item.amperage_override != null || item.wattage_override != null || item.heat_dissipation_override != null;

  return (
    <div className="relative">
      <Table>
        <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm">
          <TableRow>
            {!isLocked && <TableHead className="w-[30px]"></TableHead>}
            <TableHead className="w-[150px]">Source</TableHead>
            <TableHead className="w-[200px]">Part Number</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right w-[80px]">QTY</TableHead>
            <TableHead className="text-right w-[100px]">Util. %</TableHead>
            <TableHead className="w-[120px]">Group</TableHead>
            <TableHead className="w-[100px]">Phase</TableHead>
            {!isLocked && <TableHead className="w-[50px]"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {lineItems.map((item) => {
            const isExpanded = expandedOverrides.has(item.id);
            const itemHasOverrides = hasOverrides(item);

            return (
              <Fragment key={item.id}>
                <TableRow className={cn(isLocked && "hover:bg-transparent")}>
                  {!isLocked && (
                    <TableCell className="px-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => toggleOverrides(item.id)}
                        title="Toggle overrides"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronRight className={cn("h-3.5 w-3.5", itemHasOverrides && "text-blue-500")} />
                        )}
                      </Button>
                    </TableCell>
                  )}
                  <TableCell className="font-medium text-xs">
                    {item.part_id ? 'Master' : (item.manual_part_number ? 'Manual' : '-')}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {item.manual_part_number || '-'}
                  </TableCell>
                  <TableCell className="text-xs truncate max-w-[300px]" title={item.description || ''}>
                    {item.description || '-'}
                  </TableCell>
                  <TableCell className="text-right p-0">
                    <EditableCell
                      value={item.qty}
                      type="number"
                      min={1}
                      step={1}
                      disabled={!!isLocked}
                      className="text-right w-[70px] ml-auto"
                      onSave={(v) => handleFieldUpdate(item.id, 'qty', v)}
                    />
                  </TableCell>
                  <TableCell className="text-right p-0">
                    <EditableCell
                      value={Math.round(item.utilization_pct * 100)}
                      type="number"
                      min={0}
                      max={100}
                      step={5}
                      disabled={!!isLocked}
                      className="text-right w-[80px] ml-auto"
                      onSave={(v) => handleFieldUpdate(item.id, 'utilization_pct', v)}
                    />
                  </TableCell>
                  <TableCell className="p-0">
                    <EditableCell
                      value={item.power_group || ''}
                      disabled={!!isLocked}
                      className="w-[100px]"
                      onSave={(v) => handleFieldUpdate(item.id, 'power_group', v)}
                    />
                  </TableCell>
                  <TableCell className="p-0">
                    {isLocked ? (
                      <span className="text-xs px-2">{item.phase_assignment || '-'}</span>
                    ) : (
                      <Select
                        value={item.phase_assignment || '_none'}
                        onValueChange={(v) => handlePhaseChange(item.id, v)}
                      >
                        <SelectTrigger className="h-7 text-xs border-transparent bg-transparent hover:border-input w-[80px] px-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PHASE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value} className="text-xs">
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  {!isLocked && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => deleteLineItem(item.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>

                {/* Override row */}
                {!isLocked && isExpanded && (
                  <TableRow className="bg-muted/30 hover:bg-muted/40">
                    <TableCell colSpan={isLocked ? 8 : 9} className="py-2 px-6">
                      <div className="flex items-center gap-6">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Overrides</span>
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground">Amps:</span>
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="-"
                              defaultValue={item.amperage_override ?? ''}
                              className="h-7 w-[80px] text-xs px-2"
                              onBlur={(e) => handleFieldUpdate(item.id, 'amperage_override', e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                            />
                          </label>
                          <label className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground">Watts:</span>
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="-"
                              defaultValue={item.wattage_override ?? ''}
                              className="h-7 w-[80px] text-xs px-2"
                              onBlur={(e) => handleFieldUpdate(item.id, 'wattage_override', e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                            />
                          </label>
                          <label className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground">Heat (BTU/hr):</span>
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="-"
                              defaultValue={item.heat_dissipation_override ?? ''}
                              className="h-7 w-[80px] text-xs px-2"
                              onBlur={(e) => handleFieldUpdate(item.id, 'heat_dissipation_override', e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                            />
                          </label>
                        </div>
                        {itemHasOverrides && (
                          <Badge variant="outline" className="text-[10px] border-blue-300 text-blue-600 bg-blue-50">
                            Overridden
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>

      {isLocked && (
        <div className="absolute inset-0 bg-background/5 pointer-events-none" />
      )}
    </div>
  );
}
