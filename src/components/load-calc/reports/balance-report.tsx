import { useLoadCalcProjectStore } from "@/stores/load-calc-project-store";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function BalanceReport() {
  const { reportData } = useLoadCalcProjectStore();
  const balanceData = reportData?.balance || [];

  if (balanceData.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center text-muted-foreground">
          No 3-phase tables found in this project. Ensure 3-phase tables are created and calculated.
        </CardContent>
      </Card>
    );
  }

  const getImbalanceBadgeVariant = (pct: number | null): "default" | "destructive" | "outline" | "secondary" => {
    if (pct === null) return "outline";
    if (pct > 20) return "destructive";
    return "secondary";
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">3-Phase Balance Report</CardTitle>
          <p className="text-sm text-muted-foreground">
            Phase loading and imbalance calculation for 3-phase voltage tables.
            Imbalance: (Max-Min)/Max &times; 100.
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Enclosure / Table</TableHead>
                <TableHead className="text-right">L1 (W)</TableHead>
                <TableHead className="text-right">L2 (W)</TableHead>
                <TableHead className="text-right">L3 (W)</TableHead>
                <TableHead className="text-center w-[150px]">Imbalance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {balanceData.map((row) => (
                <TableRow key={row.voltageTableId}>
                  <TableCell className="font-medium">
                    <div>{row.locationName}</div>
                    <div className="text-[10px] text-muted-foreground font-mono uppercase">{row.voltageType}</div>
                  </TableCell>
                  <TableCell className="text-right font-mono">{row.L1.toLocaleString()} W</TableCell>
                  <TableCell className="text-right font-mono">{row.L2.toLocaleString()} W</TableCell>
                  <TableCell className="text-right font-mono">{row.L3.toLocaleString()} W</TableCell>
                  <TableCell className="text-center">
                    {row.balancePct === null ? (
                      <span className="text-muted-foreground text-xs italic">N/A</span>
                    ) : (
                      <Badge 
                        variant={getImbalanceBadgeVariant(row.balancePct)}
                        className={cn(
                          row.balancePct <= 10 && "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20",
                          row.balancePct > 10 && row.balancePct <= 20 && "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-500/20"
                        )}
                      >
                        {row.balancePct.toFixed(1)}%
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
