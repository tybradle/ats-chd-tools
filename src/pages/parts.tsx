import { useEffect, useState } from "react";
import { usePartsStore } from "@/stores/parts-store";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { PartsTable } from "@/components/parts/parts-table";
import { PartDialog } from "@/components/parts/part-dialog";
import type { PartWithManufacturer } from "@/types/parts";

export function PartsPage() {
  const { loadInitialData } = usePartsStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [partToEdit, setPartToEdit] = useState<PartWithManufacturer | null>(null);

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Parts Library</h1>
          <p className="text-muted-foreground mt-1">
            Manage your master parts database.
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Part
        </Button>
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
    </div>
  );
}
