import { useState } from 'react';
import { useLoadCalcImportStore } from '@/stores/load-calc-import-store';
import { LOAD_CALC_IMPORT_FIELDS } from '@/types/load-calc';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, FolderOpen, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';

export function ColumnMappingStep() {
  const { headers, mappings, setMapping, templates, saveTemplate, loadTemplate } = useLoadCalcImportStore();
  const [templateName, setTemplateName] = useState('');
  const [showSave, setShowSave] = useState(false);

  const handleSaveTemplate = () => {
    if (templateName.trim()) {
      saveTemplate(templateName);
      setTemplateName('');
      setShowSave(false);
    }
  };

  const isComplete = LOAD_CALC_IMPORT_FIELDS.every(field => !field.required || mappings[field.id]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Map Columns</h3>
          <p className="text-sm text-muted-foreground">
            Associate your file's columns with the expected fields.
          </p>
        </div>
        
        <div className="flex gap-2">
          {templates.length > 0 && (
            <Select onValueChange={loadTemplate}>
              <SelectTrigger className="w-[180px]">
                <FolderOpen className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Load Template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          {!showSave ? (
            <Button variant="outline" size="sm" onClick={() => setShowSave(true)}>
              <Save className="h-4 w-4 mr-2" />
              Save Template
            </Button>
          ) : (
            <div className="flex gap-2">
              <Input 
                placeholder="Template Name" 
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="h-9 w-[150px]"
              />
              <Button size="sm" onClick={handleSaveTemplate}>Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowSave(false)}>Cancel</Button>
            </div>
          )}
        </div>
      </div>

      <ScrollArea className="h-[400px] pr-4">
        <div className="grid gap-6">
          {LOAD_CALC_IMPORT_FIELDS.map((field) => (
            <div key={field.id} className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor={field.id} className="flex items-center gap-1 text-sm font-medium">
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                {mappings[field.id] && (
                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
                    <CheckCircle2 className="h-3 w-3" />
                    Mapped
                  </span>
                )}
              </div>
              <Select
                value={mappings[field.id] || "none"}
                onValueChange={(val) => setMapping(field.id, val === "none" ? null : val)}
              >
                <SelectTrigger id={field.id}>
                  <SelectValue placeholder="Select a column..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Unmapped --</SelectItem>
                  {headers.map((header) => (
                    <SelectItem key={header} value={header}>
                      {header}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </ScrollArea>

      {!isComplete && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Required Fields Missing</AlertTitle>
          <AlertDescription>
            Please map all required fields (*) before continuing.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
