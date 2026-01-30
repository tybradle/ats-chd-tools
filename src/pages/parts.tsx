import { useEffect, useState } from "react";
import { usePartsStore } from "@/stores/parts-store";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Import, Download, Trash2 } from "lucide-react";
import { PartsTable } from "@/components/parts/parts-table";
import { PartDialog } from "@/components/parts/part-dialog";
import { PartsImportDialog } from "@/components/parts/parts-import-dialog";
import { PartsExportDialog } from "@/components/parts/parts-export-dialog";
import { NuclearEraseDialog } from "@/components/parts/nuclear-erase-dialog";
import type { PartWithManufacturer } from "@/types/parts";

export function PartsPage() {
  const { parts, loadInitialData } = usePartsStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [partToEdit, setPartToEdit] = useState<PartWithManufacturer | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isEraseDialogOpen, setIsEraseDialogOpen] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleCreate = () => {
    setPartToEdit(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (part: PartWithManufacturer) => {
    setPartToEdit(part);
    setIsDialogOpen(true);
  };

  const handleImported = () => {
    loadInitialData();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Parts Library</h1>
          <p className="text-muted-foreground mt-1">
            Manage your master parts database.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
            <Import className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" onClick={() => setIsExportDialogOpen(true)}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="destructive" onClick={() => setIsEraseDialogOpen(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Erase All
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add Part
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Parts Database</CardTitle>
          <CardDescription>
            Search and manage parts, manufacturers, and categories.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PartsTable onEdit={handleEdit} />
        </CardContent>
      </Card>

      <PartDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        partToEdit={partToEdit}
      />

      <PartsImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        onImported={handleImported}
      />

      <PartsExportDialog
        open={isExportDialogOpen}
        onOpenChange={setIsExportDialogOpen}
        parts={parts}
      />

      <NuclearEraseDialog
        open={isEraseDialogOpen}
        onOpenChange={setIsEraseDialogOpen}
      />
    </div>
  );
}
