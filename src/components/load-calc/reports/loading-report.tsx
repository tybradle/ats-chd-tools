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
import { CheckCircle2, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function LoadingReport() {
  const { reportData } = useLoadCalcProjectStore();
  const loadingData = reportData?.loading || [];

  if (loadingData.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center text-muted-foreground">
          No loading data available. Ensure voltage tables are created and calculated.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Project Loading Report</CardTitle>
          <p className="text-sm text-muted-foreground">
            Summary of electrical loading per voltage table across the entire project.
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Enclosure</TableHead>
                <TableHead>Voltage Type</TableHead>
                <TableHead className="text-right">Total Watts</TableHead>
                <TableHead className="text-right">Total Amps</TableHead>
                <TableHead className="text-center w-[100px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingData.map((row) => (
                <TableRow key={row.voltageTableId}>
                  <TableCell className="font-medium">{row.locationName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-[10px] uppercase">{row.voltageType}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {row.totalWatts.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} W
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {row.totalAmperes.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} A
                  </TableCell>
                  <TableCell className="text-center">
                    {!row.isCalculated ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-5 w-5 text-muted-foreground mx-auto" />
                          </TooltipTrigger>
                          <TooltipContent>Not calculated - totals may be inaccurate</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 mx-auto" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {loadingData.length > 1 && (
                <TableRow className="bg-muted/30 font-bold hover:bg-muted/30">
                  <TableCell colSpan={2}>Project Totals</TableCell>
                  <TableCell className="text-right font-mono">
                    {loadingData.reduce((sum, r) => sum + r.totalWatts, 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} W
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {loadingData.reduce((sum, r) => sum + r.totalAmperes, 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} A
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
