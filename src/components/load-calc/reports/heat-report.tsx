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

export function HeatReport() {
  const { reportData } = useLoadCalcProjectStore();
  const heatData = reportData?.heat || [];

  if (heatData.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center text-muted-foreground">
          No heat data available. Ensure voltage tables are created and calculated.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Heat Dissipation Summary</CardTitle>
          <p className="text-sm text-muted-foreground">
            Total heat dissipation per enclosure location in Watts. 
            Color coded for high heat loads (&gt; 1000W).
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Enclosure Location</TableHead>
                <TableHead className="text-right w-[120px]">Tables</TableHead>
                <TableHead className="text-right w-[180px]">Total Heat (Watts)</TableHead>
                <TableHead className="text-center w-[120px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {heatData.map((row) => {
                const isHighHeat = row.totalWatts > 1000;
                return (
                  <TableRow key={row.locationId || 'unassigned'}>
                    <TableCell className="font-medium">{row.locationName}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{row.tableCount}</TableCell>
                    <TableCell className={cn(
                      "text-right font-mono",
                      isHighHeat && "text-destructive font-bold"
                    )}>
                      {row.totalWatts.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} W
                    </TableCell>
                    <TableCell className="text-center">
                      {isHighHeat ? (
                        <Badge variant="destructive">High Heat</Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20">
                          Normal
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {heatData.length > 1 && (
                <TableRow className="bg-muted/30 font-bold hover:bg-muted/30">
                  <TableCell>Total Project Heat</TableCell>
                  <TableCell className="text-right">
                    {heatData.reduce((sum, r) => sum + r.tableCount, 0)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {heatData.reduce((sum, r) => sum + r.totalWatts, 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} W
                  </TableCell>
                  <TableCell />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
