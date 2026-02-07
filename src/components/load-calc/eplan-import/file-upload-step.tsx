import React, { useState } from 'react';
import { useLoadCalcImportStore } from '@/stores/load-calc-import-store';
import { Upload, FileSpreadsheet, Loader2, ClipboardPaste } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

export function FileUploadStep() {
  const { setFile, setClipboardData, isLoading } = useLoadCalcImportStore();
  const [isPasting, setIsPasting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handlePasteFromClipboard = async () => {
    setIsPasting(true);
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        toast.error('Clipboard is empty. Copy data from Excel first.');
        return;
      }
      setClipboardData(text);
    } catch (error) {
      console.error('Clipboard read error:', error);
      toast.error('Could not read clipboard. Please allow clipboard access or use file upload instead.');
    } finally {
      setIsPasting(false);
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

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground uppercase tracking-wider">or</span>
        <Separator className="flex-1" />
      </div>

      <Card className="border-dashed">
        <CardContent className="py-6 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="p-3 rounded-full bg-secondary">
              {isPasting ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <ClipboardPaste className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-medium">Paste from Clipboard</h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Copy rows from Excel (with headers), then click the button below.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handlePasteFromClipboard}
              disabled={isLoading || isPasting}
              className="gap-2"
            >
              <ClipboardPaste className="h-4 w-4" />
              Paste from Clipboard
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="bg-secondary/30 rounded-lg p-4 flex items-start gap-3 border">
        <FileSpreadsheet className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium">Import Guidelines</p>
          <ul className="text-muted-foreground list-disc list-inside mt-1 space-y-1">
            <li>Ensure the first row contains column headers</li>
            <li>Supported formats: .xlsx, .csv, or tab-delimited clipboard data</li>
            <li>You will map columns to fields in the next step</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
