import { useState } from 'react';
import { useLoadCalcProjectStore } from '@/stores/load-calc-project-store';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  MapPin, 
  MoreVertical, 
  Pencil, 
  Trash2,
  Loader2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Dialog, 
  DialogContent, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export function LocationSidebar() {
  const { 
    currentProject, 
    locations, 
    currentLocation, 
    selectLocation,
    createLocation,
    updateLocation,
    deleteLocation,
    loading
  } = useLoadCalcProjectStore();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingLoc, setEditingLoc] = useState<{id: number, name: string} | null>(null);
  const [newName, setNewName] = useState('');

  const handleAdd = async () => {
    if (!newName) return;
    await createLocation(newName);
    setIsAddOpen(false);
    setNewName('');
  };

  const handleEdit = async () => {
    if (!editingLoc || !newName) return;
    await updateLocation(editingLoc.id, newName);
    setIsEditOpen(false);
    setEditingLoc(null);
    setNewName('');
  };

  const openEdit = (loc: {id: number, name: string}) => {
    setEditingLoc(loc);
    setNewName(loc.name);
    setIsEditOpen(true);
  };

  if (!currentProject?.bom_package_id) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center space-y-2">
        <MapPin className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">Link to a BOM package to manage locations.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b flex items-center justify-between bg-muted/30">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Locations</h3>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsAddOpen(true)}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-2">
        {loading.locations && locations.length === 0 ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-1">
            {locations.map((loc) => (
              <div
                key={loc.id}
                className={cn(
                  "group flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors text-sm",
                  currentLocation?.id === loc.id 
                    ? "bg-primary text-primary-foreground" 
                    : "hover:bg-muted"
                )}
                onClick={() => selectLocation(loc)}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <MapPin className={cn("h-3.5 w-3.5 shrink-0", currentLocation?.id === loc.id ? "text-primary-foreground" : "text-muted-foreground")} />
                  <span className="truncate">{loc.name}</span>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className={cn("h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity", currentLocation?.id === loc.id && "text-primary-foreground hover:bg-primary-foreground/20")}>
                      <MoreVertical className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(loc)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-destructive focus:text-destructive"
                      onClick={() => deleteLocation(loc.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
            {locations.length === 0 && (
              <p className="text-xs text-center py-8 text-muted-foreground">No locations added.</p>
            )}
          </div>
        )}
      </div>

      {/* Add Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Location</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="loc-name">Location Name</Label>
              <Input 
                id="loc-name" 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)} 
                placeholder="e.g. EC1"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!newName}>Add Location</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Location</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Location Name</Label>
              <Input 
                id="edit-name" 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)} 
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={!newName}>Update Location</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
