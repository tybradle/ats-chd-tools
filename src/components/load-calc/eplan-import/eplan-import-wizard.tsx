import { useLoadCalcImportStore } from '@/stores/load-calc-import-store';
import { FileUploadStep } from './file-upload-step';
import { ColumnMappingStep } from './column-mapping-step';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { LOAD_CALC_IMPORT_FIELDS } from '@/types/load-calc';

interface EplanImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EplanImportWizard({ open, onOpenChange }: EplanImportWizardProps) {
  const { step, setStep, reset, mappings, isLoading, rows } = useLoadCalcImportStore();

  const handleClose = () => {
    onOpenChange(false);
  };

  const isMappingComplete = LOAD_CALC_IMPORT_FIELDS.every(field => !field.required || mappings[field.id]);

  const handleNext = () => {
    if (step === 'mapping') {
      setStep('preview');
    }
  };

  const handleBack = () => {
    if (step === 'mapping') {
      setStep('upload');
    } else if (step === 'preview') {
      setStep('mapping');
    }
  };

  const handleComplete = () => {
    setStep('complete');
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val) handleClose();
      else onOpenChange(val);
    }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import from EPLAN / Excel</DialogTitle>
          <DialogDescription>
            Step {step === 'upload' ? '1' : step === 'mapping' ? '2' : step === 'preview' ? '3' : '4'} of 4
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {step === 'upload' && <FileUploadStep />}
          {step === 'mapping' && <ColumnMappingStep />}
          {step === 'preview' && (
            <div className="space-y-4 text-center py-8">
              <div className="p-4 rounded-full bg-primary/10 w-16 h-16 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">Ready to Import</h3>
                <p className="text-muted-foreground">
                  Found {rows.length} rows to process. Columns have been mapped successfully.
                </p>
              </div>
              <div className="bg-secondary/30 p-4 rounded text-left text-sm font-mono max-w-md mx-auto">
                <p className="font-bold mb-2">Mapped Fields:</p>
                {Object.entries(mappings).map(([field, col]) => (
                  <div key={field} className="flex justify-between border-b border-border/50 py-1">
                    <span className="text-muted-foreground">{field}:</span>
                    <span>{col}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {step === 'complete' && (
            <div className="space-y-4 text-center py-12">
              <div className="p-4 rounded-full bg-green-500/10 w-20 h-20 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-10 w-10 text-green-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold">Import Configuration Ready</h3>
                <p className="text-muted-foreground">
                  The data mapping is configured. Part matching and database insertion will be available in Sprint 3b.
                </p>
              </div>
              <Button onClick={() => { reset(); onOpenChange(false); }} className="mt-4">
                Finish
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between sm:justify-between items-center">
          <div className="flex gap-2">
            {step !== 'upload' && step !== 'complete' && (
              <Button variant="ghost" onClick={handleBack} disabled={isLoading}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {step !== 'complete' && (
              <Button variant="ghost" onClick={() => { reset(); onOpenChange(false); }} disabled={isLoading}>
                Cancel
              </Button>
            )}
            {step === 'mapping' && (
              <Button onClick={handleNext} disabled={!isMappingComplete || isLoading}>
                Preview
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
            {step === 'preview' && (
              <Button onClick={handleComplete} disabled={isLoading}>
                Complete Import
                <CheckCircle2 className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
