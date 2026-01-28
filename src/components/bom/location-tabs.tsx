import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Plus, X, Pencil } from 'lucide-react';
import { useBOMStore } from '@/stores/bom-store';
import type { BOMLocationWithCount } from '@/types/bom';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';


export function LocationTabs() {
  const {
    currentScopePackageId,
    locations,
    currentLocationId,
    setCurrentLocationId,
    createLocation,
    updateLocation,
    deleteLocation,
    loading,
  } = useBOMStore();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<{ id: number; name: string; export_name: string | null } | null>(null);
  const [locationToDelete, setLocationToDelete] = useState<BOMLocationWithCount | null>(null);
  const [newName, setNewName] = useState('');
  const [editName, setEditName] = useState('');
  const [editExportName, setEditExportName] = useState('');

  const handleAdd = async () => {

    if (!currentScopePackageId || !newName.trim()) return;

    try {
      await createLocation(currentScopePackageId, newName.trim());
      setNewName('');
      setIsAddOpen(false);
      toast.success('Location added');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add location');
    }
  };

  const handleEditClick = (loc: BOMLocationWithCount) => {
    setEditingLocation(loc);
    setEditName(loc.name);
    setEditExportName(loc.export_name || '');
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingLocation || !editName.trim()) return;

    try {
      await updateLocation(
        editingLocation.id,
        editName.trim(),
        editExportName.trim() || null
      );
      setIsEditOpen(false);
      setEditingLocation(null);
      toast.success('Location updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update location');
    }
  };

  const confirmDelete = async () => {
    if (!locationToDelete) return;

    try {
      await deleteLocation(locationToDelete.id);
      setLocationToDelete(null);
      toast.success('Location deleted');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete location');
    }
  };


  return (
    <div className="border-b bg-muted/30">
      <div className="flex items-center">
        {/* Tabs */}
        <div className="flex flex-1 overflow-x-auto no-scrollbar">
          {locations.length === 0 ? (
            <div className="px-4 py-2 text-sm text-muted-foreground italic">
              No locations created yet.
            </div>
          ) : (
            locations.map((loc) => (
              <div
                key={loc.id}
                className={cn(
                  "group relative flex items-center border-r border-t transition-colors",
                  currentLocationId === loc.id
                    ? "bg-background border-t-2 border-t-primary border-r-transparent"
                    : "bg-muted/50 hover:bg-muted/70 border-t-transparent"
                )}
              >
                <button
                  onClick={() => setCurrentLocationId(loc.id)}
                  className="px-6 py-2.5 text-sm font-medium text-left min-w-[100px]"
                  disabled={loading}
                >
                  <div className="flex items-center gap-2">
                    <span>{loc.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({loc.item_count})
                    </span>
                    {loc.export_name && (
                      <span className="text-[10px] text-blue-500 uppercase font-bold" title={`Export: ${loc.export_name}`}>
                        [{loc.export_name}]
                      </span>
                    )}
                  </div>
                </button>

                {/* Actions */}
                <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                  <button
                    onClick={() => handleEditClick(loc)}
                    className="p-1 rounded hover:bg-primary hover:text-primary-foreground"
                    title="Edit"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => setLocationToDelete(loc)}
                    className="p-1 rounded hover:bg-destructive hover:text-destructive-foreground"
                    title="Delete"
                  >
                    <X className="h-3 w-3" />
                  </button>

                </div>
              </div>
            ))
          )}
        </div>

        {/* Add Button */}
        <div className="border-l border-t">
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-10 px-4 border-0 rounded-none hover:bg-muted/50"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Location
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Location</DialogTitle>
                <DialogDescription>
                  e.g., CP1, MA, FIELD
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Location Name</Label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g., CP1"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                  />
                </div>
                <Button onClick={handleAdd} className="w-full" disabled={!newName.trim()}>
                  Add Location
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Location</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Location Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Export Name (Optional)</Label>
              <Input
                value={editExportName}
                onChange={(e) => setEditExportName(e.target.value)}
                placeholder="Name for XML export"
              />
            </div>
            <Button onClick={handleUpdate} className="w-full" disabled={!editName.trim()}>
              Update Location
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!locationToDelete} onOpenChange={(open) => !open && setLocationToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Location</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete location "{locationToDelete?.name}"? 
              This will also delete all {locationToDelete?.item_count} items in this location. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Location
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

