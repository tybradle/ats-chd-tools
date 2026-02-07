import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectView } from "@/components/load-calc/project-view";
import { PartsBrowser } from "@/components/load-calc/parts-browser";
import { PartsImport } from "@/components/load-calc/parts-import";
import { ReportsView } from "@/components/load-calc/reports-view";
import { useLoadCalcProjectStore } from "@/stores/load-calc-project-store";
import { Database, FolderKanban, Calculator, BarChart3 } from "lucide-react";

export function LoadCalcPage() {
  const { currentProject } = useLoadCalcProjectStore();

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
          <TabsTrigger value="reports" className="flex items-center gap-2" disabled={!currentProject}>
            <BarChart3 className="h-4 w-4" />
            Reports
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

        <TabsContent value="reports">
          <ReportsView />
        </TabsContent>

        <TabsContent value="import">
          <div className="max-w-2xl">
            <PartsImport />
          </div>
        </TabsContent>
      </Tabs>

    </div>
  );
}
