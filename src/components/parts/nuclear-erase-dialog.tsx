import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Trash2 } from "lucide-react";
import { usePartsStore } from "@/stores/parts-store";

interface NuclearEraseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NuclearEraseDialog({ open, onOpenChange }: NuclearEraseDialogProps) {
  const { deleteAllParts } = usePartsStore();
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirmText !== "CONFIRM") return;
    
    setIsDeleting(true);
    try {
      await deleteAllParts();
      onOpenChange(false);
      setConfirmText("");
    } catch (error) {
      // Error is handled in store
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <DialogTitle>Nuclear Erase</DialogTitle>
          </div>
          <DialogDescription>
            This action cannot be undone. This will permanently delete all parts from your local database.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <p className="text-sm font-medium">
            To confirm, type <span className="font-bold select-all">CONFIRM</span> below:
          </p>
          <Input 
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Type CONFIRM"
            className="font-mono"
            autoComplete="off"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            disabled={confirmText !== "CONFIRM" || isDeleting}
          >
            {isDeleting ? "Erasing..." : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Erase All Parts
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
