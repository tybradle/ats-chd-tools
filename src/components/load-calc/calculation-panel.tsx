import { useLoadCalcProjectStore } from '@/stores/load-calc-project-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calculator,
  Loader2,
  AlertTriangle,
  AlertCircle,
  Zap,
  Thermometer,
  Gauge,
  BarChart3,
} from 'lucide-react';
import { isThreePhase } from '@/lib/load-calc/calculations';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useState } from 'react';

export function CalculateButton() {
  const { validateAndCalculate, isCalculating, lineItems, currentVoltageTable } = useLoadCalcProjectStore();

  const disabled = isCalculating || lineItems.length === 0 || !currentVoltageTable;

  return (
    <Button
      variant="default"
      size="sm"
      className="h-8 gap-1.5"
      onClick={() => validateAndCalculate()}
      disabled={disabled}
    >
      {isCalculating ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Calculator className="h-3.5 w-3.5" />
      )}
      {isCalculating ? 'Calculating...' : 'Calculate'}
    </Button>
  );
}

export function CalculationSummary() {
  const { calculationResult, validationIssues, currentVoltageTable } = useLoadCalcProjectStore();
  const [errorsOpen, setErrorsOpen] = useState(false);

  const errors = validationIssues.filter(i => i.severity === 'error');
  const warnings = validationIssues.filter(i => i.severity === 'warning');

  if (validationIssues.length > 0 && !calculationResult) {
    return (
      <>
        <div className="px-4 py-2 border-b bg-red-50/50 flex items-center gap-3">
          {errors.length > 0 && (
            <button
              onClick={() => setErrorsOpen(true)}
              className="flex items-center gap-1.5 text-xs text-red-700 font-medium hover:underline"
            >
              <AlertCircle className="h-3.5 w-3.5" />
              {errors.length} error{errors.length > 1 ? 's' : ''}
            </button>
          )}
          {warnings.length > 0 && (
            <button
              onClick={() => setErrorsOpen(true)}
              className="flex items-center gap-1.5 text-xs text-amber-700 font-medium hover:underline"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              {warnings.length} warning{warnings.length > 1 ? 's' : ''}
            </button>
          )}
          <span className="text-xs text-muted-foreground">Fix errors to run calculations.</span>
        </div>

        <ValidationDialog open={errorsOpen} onOpenChange={setErrorsOpen} issues={validationIssues} />
      </>
    );
  }

  if (!calculationResult) return null;

  const threePhase = currentVoltageTable ? isThreePhase(currentVoltageTable.voltage_type) : false;

  return (
    <>
      <div className="px-4 py-2.5 border-b bg-primary/5">
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-yellow-500" />
            <span className="text-xs text-muted-foreground">Watts:</span>
            <span className="text-sm font-semibold">{calculationResult.totalWatts.toLocaleString()} W</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Gauge className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-xs text-muted-foreground">Amps:</span>
            <span className="text-sm font-semibold">{calculationResult.totalAmperes.toLocaleString()} A</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Thermometer className="h-3.5 w-3.5 text-red-500" />
            <span className="text-xs text-muted-foreground">Heat:</span>
            <span className="text-sm font-semibold">{calculationResult.totalBtu.toLocaleString()} BTU/hr</span>
          </div>

          {threePhase && (
            <>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5 text-purple-500" />
                <span className="text-xs text-muted-foreground">L1:</span>
                <span className="text-xs font-medium">{calculationResult.phaseLoading.L1.toLocaleString()}W</span>
                <span className="text-xs text-muted-foreground">L2:</span>
                <span className="text-xs font-medium">{calculationResult.phaseLoading.L2.toLocaleString()}W</span>
                <span className="text-xs text-muted-foreground">L3:</span>
                <span className="text-xs font-medium">{calculationResult.phaseLoading.L3.toLocaleString()}W</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Imbalance:</span>
                {calculationResult.balancePct != null ? (
                  <Badge
                    variant="outline"
                    className={
                      calculationResult.balancePct <= 10
                        ? 'text-green-700 border-green-300 bg-green-50 text-[10px]'
                        : calculationResult.balancePct <= 20
                        ? 'text-amber-700 border-amber-300 bg-amber-50 text-[10px]'
                        : 'text-red-700 border-red-300 bg-red-50 text-[10px]'
                    }
                  >
                    {calculationResult.balancePct.toFixed(1)}%
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">N/A</span>
                )}
              </div>
            </>
          )}

          {warnings.length > 0 && (
            <button
              onClick={() => setErrorsOpen(true)}
              className="flex items-center gap-1 text-[10px] text-amber-600 hover:underline"
            >
              <AlertTriangle className="h-3 w-3" />
              {warnings.length} warning{warnings.length > 1 ? 's' : ''}
            </button>
          )}
        </div>
      </div>

      <ValidationDialog open={errorsOpen} onOpenChange={setErrorsOpen} issues={validationIssues} />
    </>
  );
}

function ValidationDialog({
  open,
  onOpenChange,
  issues,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  issues: import('@/lib/load-calc/validation').ValidationIssue[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Validation Issues</DialogTitle>
        </DialogHeader>
        <div className="max-h-[400px] overflow-auto space-y-2">
          {issues.map((issue, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 p-2.5 rounded-md border text-sm ${
                issue.severity === 'error'
                  ? 'border-red-200 bg-red-50 text-red-800'
                  : 'border-amber-200 bg-amber-50 text-amber-800'
              }`}
            >
              {issue.severity === 'error' ? (
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-medium text-xs">{issue.message}</p>
                <p className="text-[10px] opacity-70">Field: {issue.field}</p>
              </div>
            </div>
          ))}
          {issues.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No issues found.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
