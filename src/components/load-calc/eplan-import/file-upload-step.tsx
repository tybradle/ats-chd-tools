import React from 'react';
import { useLoadCalcImportStore } from '@/stores/load-calc-import-store';
import { Upload, FileSpreadsheet, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

export function FileUploadStep() {
  const { setFile, isLoading } = useLoadCalcImportStore();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-dashed">
        <CardContent className="pt-10 pb-10 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 rounded-full bg-primary/10">
              {isLoading ? (
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              ) : (
                <Upload className="h-8 w-8 text-primary" />
              )}
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Upload Electrical Data</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Select an Excel (.xlsx) or CSV file exported from EPLAN or other design tools.
              </p>
            </div>
            
            <div className="w-full max-w-sm mx-auto pt-2">
              <Input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                disabled={isLoading}
                className="cursor-pointer"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="bg-secondary/30 rounded-lg p-4 flex items-start gap-3 border">
        <FileSpreadsheet className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium">Import Guidelines</p>
          <ul className="text-muted-foreground list-disc list-inside mt-1 space-y-1">
            <li>Ensure the first row contains column headers</li>
            <li>Supported formats: .xlsx, .csv</li>
            <li>You will map columns to fields in the next step</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
