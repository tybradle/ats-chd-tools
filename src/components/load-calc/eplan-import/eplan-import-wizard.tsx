import { useState } from 'react';
import { useLoadCalcImportStore } from '@/stores/load-calc-import-store';
import { useLoadCalcProjectStore } from '@/stores/load-calc-project-store';
import { FileUploadStep } from './file-upload-step';
import { ColumnMappingStep } from './column-mapping-step';
import { ImportPreviewStep } from './import-preview-step';
import { PartMatcher } from '@/components/load-calc/part-matcher';
import { UnmatchedPartsDialog } from '@/components/load-calc/unmatched-parts-dialog';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { LOAD_CALC_IMPORT_FIELDS } from '@/types/load-calc';

interface EplanImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EplanImportWizard({ open, onOpenChange }: EplanImportWizardProps) {
  const {
    step, setStep, reset, mappings, isLoading, isImporting,
    selectedVoltageTableId, importToDatabase, lastImportCount
  } = useLoadCalcImportStore();
  const { currentVoltageTable, fetchLineItems } = useLoadCalcProjectStore();
  const [unmatchedDialogOpen, setUnmatchedDialogOpen] = useState(false);

  const handleClose = () => {
    onOpenChange(false);
  };

  const isMappingComplete = LOAD_CALC_IMPORT_FIELDS.every(field => !field.required || mappings[field.id]);

  const handleNext = () => {
    if (step === 'mapping') {
      setStep('matching');
    } else if (step === 'matching') {
      setStep('preview');
    }
  };

  const handleBack = () => {
    if (step === 'mapping') {
      setStep('upload');
    } else if (step === 'matching') {
      setStep('mapping');
    } else if (step === 'preview') {
      setStep('matching');
    }
  };

  const handleImport = async () => {
    if (!selectedVoltageTableId) return;
    await importToDatabase(selectedVoltageTableId);
    // Refresh line items if the imported table is the currently viewed one
    if (currentVoltageTable && currentVoltageTable.id === selectedVoltageTableId) {
      await fetchLineItems(currentVoltageTable.id);
    }
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
            Step {
              step === 'upload' ? '1' :
              step === 'mapping' ? '2' :
              step === 'matching' ? '3' :
              step === 'preview' ? '4' : '5'
            } of 5
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {step === 'upload' && <FileUploadStep />}
          {step === 'mapping' && <ColumnMappingStep />}
          {step === 'matching' && (
            <PartMatcher onReviewUnmatched={() => setUnmatchedDialogOpen(true)} />
          )}
          {step === 'preview' && <ImportPreviewStep />}
          {step === 'complete' && (
            <div className="space-y-4 text-center py-12">
              <div className="p-4 rounded-full bg-green-500/10 w-20 h-20 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-10 w-10 text-green-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold">Import Complete</h3>
                <p className="text-muted-foreground">
                  Successfully imported {lastImportCount} line items into the voltage table.
                </p>
              </div>
              <Button onClick={() => { reset(); onOpenChange(false); }} className="mt-4">
                Finish
              </Button>
            </div>
           )}
        </div>

        <UnmatchedPartsDialog
          open={unmatchedDialogOpen}
          onOpenChange={setUnmatchedDialogOpen}
        />

        <DialogFooter className="flex justify-between sm:justify-between items-center">
          <div className="flex gap-2">
            {step !== 'upload' && step !== 'complete' && (
              <Button variant="ghost" onClick={handleBack} disabled={isLoading || isImporting}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
          </div>
           <div className="flex gap-2">
            {step !== 'complete' && (
              <Button variant="ghost" onClick={() => { reset(); onOpenChange(false); }} disabled={isLoading || isImporting}>
                Cancel
              </Button>
            )}
            {step === 'mapping' && (
              <Button onClick={handleNext} disabled={!isMappingComplete || isLoading}>
                Match Parts
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
            {step === 'matching' && (
              <Button onClick={handleNext} disabled={isLoading}>
                Preview
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
            {step === 'preview' && (
              <Button onClick={handleImport} disabled={!selectedVoltageTableId || isImporting}>
                {isImporting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {isImporting ? 'Importing...' : 'Import to Database'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
