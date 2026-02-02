import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectView } from "@/components/load-calc/project-view";
import { PartsBrowser } from "@/components/load-calc/parts-browser";
import { PartsImport } from "@/components/load-calc/parts-import";
import { Database, FolderKanban, Calculator } from "lucide-react";
import { EplanImportWizard } from "@/components/load-calc/eplan-import/eplan-import-wizard";

export function LoadCalcPage() {
  const [isImportOpen, setIsImportOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-primary font-heading">Load Calculator</h1>
        <p className="text-muted-foreground">
          System load and heat dissipation analysis tool.
        </p>
      </div>

      <Tabs defaultValue="browser" className="space-y-4">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="browser" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Parts Browser
          </TabsTrigger>
          <TabsTrigger value="project" className="flex items-center gap-2">
            <FolderKanban className="h-4 w-4" />
            Project View
          </TabsTrigger>
          <TabsTrigger value="import" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Import Master List
          </TabsTrigger>
        </TabsList>

        <TabsContent value="browser" className="space-y-4">
          <PartsBrowser />
        </TabsContent>

        <TabsContent value="project">
          <ProjectView />
        </TabsContent>

        <TabsContent value="import">
          <div className="max-w-2xl">
            <PartsImport />
          </div>
        </TabsContent>
      </Tabs>

      <EplanImportWizard open={isImportOpen} onOpenChange={setIsImportOpen} />
    </div>
  );
}
