import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useLoadCalcPartsStore } from '@/stores/load-calc-parts-store';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function PartsImport() {
  const { importParts, isLoading } = useLoadCalcPartsStore();
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus('idle');
    }
  };

  const handleImport = async () => {
    if (!file) return;
    try {
      await importParts(file);
      setStatus('success');
      setFile(null);
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-primary" />
          Import Parts Catalog
        </CardTitle>
        <CardDescription>
          Upload a CSV file containing the master parts list and electrical specifications.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Input
            id="parts-csv"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            disabled={isLoading}
            className="cursor-pointer"
          />
        </div>

        {file && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary/30 p-2 rounded border border-dashed">
            <FileText className="h-4 w-4" />
            <span>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
          </div>
        )}

        <Button 
          onClick={handleImport} 
          disabled={!file || isLoading}
          className="w-full sm:w-auto"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Importing...
            </>
          ) : (
            'Process Import'
          )}
        </Button>

        {status === 'success' && (
          <Alert className="bg-green-500/10 border-green-500/50 text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>
              Parts catalog has been updated successfully.
            </AlertDescription>
          </Alert>
        )}

        {status === 'error' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Failed to process the parts catalog. Please check the file format.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
