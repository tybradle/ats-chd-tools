import { useEffect, useState } from 'react';
import { useLoadCalcPartsStore, type PartElectricalVariant } from '@/stores/load-calc-parts-store';
import { useLoadCalcProjectStore } from '@/stores/load-calc-project-store';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Zap, Plus } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface PartDetailProps {
  partId: number;
}

export function PartDetail({ partId }: PartDetailProps) {
  const { parts, getElectricalVariants } = useLoadCalcPartsStore();
  const { currentVoltageTable, addLineItem } = useLoadCalcProjectStore();
  const [variants, setVariants] = useState<PartElectricalVariant[]>([]);
  const [loading, setLoading] = useState(true);

  const part = parts.find(p => p.id === partId);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const data = await getElectricalVariants(partId);
      setVariants(data);
      setLoading(false);
    }
    load();
  }, [partId, getElectricalVariants]);

  const handleAddToProject = async () => {
    if (!currentVoltageTable || !part) return;
    
    // Find matching variant or first one
    const variant = variants.find(v => v.voltage_type === currentVoltageTable.voltage_type) || variants[0];
    
    await addLineItem({
      voltage_table_id: currentVoltageTable.id,
      part_id: part.id,
      qty: 1,
      utilization_pct: variant?.utilization_default ?? 1.0,
      amperage_override: null, // Don't override initially, let it use part spec
      wattage_override: null,
      heat_dissipation_override: null,
      description: part.description,
      power_group: null,
      phase_assignment: null
    });
  };

  if (!part) return null;

  return (
    <div className="space-y-6 py-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-primary">{part.part_number}</h2>
          <p className="text-muted-foreground">{part.manufacturer_name}</p>
        </div>
        <Button onClick={handleAddToProject} disabled={!currentVoltageTable} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add to Project
        </Button>
      </div>

      <Separator />

      <div className="space-y-2">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Description</h3>
        <p className="text-sm leading-relaxed">{part.description}</p>
        {part.secondary_description && (
          <p className="text-xs text-muted-foreground italic">{part.secondary_description}</p>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <Zap className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Electrical Specifications</h3>
        </div>

        <div className="rounded-md border bg-card/50 overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Voltage Type</TableHead>
                <TableHead>V</TableHead>
                <TableHead>PH</TableHead>
                <TableHead>FLA (A)</TableHead>
                <TableHead>Watts (W)</TableHead>
                <TableHead>BTU/h</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : variants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground italic">
                    No electrical specifications found for this part.
                  </TableCell>
                </TableRow>
              ) : (
                variants.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-[10px]">
                        {v.voltage_type}
                      </Badge>
                    </TableCell>
                    <TableCell>{v.voltage ?? '-'}</TableCell>
                    <TableCell>{v.phase ?? '-'}</TableCell>
                    <TableCell className="font-medium">{v.amperage ?? '-'}</TableCell>
                    <TableCell>{v.wattage ?? '-'}</TableCell>
                    <TableCell>{v.heat_dissipation_btu ?? '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
