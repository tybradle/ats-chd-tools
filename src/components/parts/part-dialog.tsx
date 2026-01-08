import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { usePartsStore } from "@/stores/parts-store";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PartWithManufacturer } from "@/types/parts";

const partSchema = z.object({
  part_number: z.string().min(1, "Part number is required"),
  manufacturer_id: z.number().min(1, "Manufacturer is required"),
  description: z.string().min(1, "Description is required"),
  secondary_description: z.string().optional(),
  category_id: z.number().optional(),
  unit: z.string().min(1, "Unit is required"),
});

type PartFormValues = z.infer<typeof partSchema>;

interface PartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partToEdit?: PartWithManufacturer | null;
}

export function PartDialog({ open, onOpenChange, partToEdit }: PartDialogProps) {
  const { manufacturers, categories, addPart, updatePart } = usePartsStore();
  
  const form = useForm<PartFormValues>({
    resolver: zodResolver(partSchema),
    defaultValues: {
      part_number: "",
      manufacturer_id: 0,
      description: "",
      secondary_description: "",
      category_id: undefined,
      unit: "EA",
    },
  });

  useEffect(() => {
    if (partToEdit) {
      form.reset({
        part_number: partToEdit.part_number,
        manufacturer_id: partToEdit.manufacturer_id,
        description: partToEdit.description,
        secondary_description: partToEdit.secondary_description || "",
        category_id: partToEdit.category_id || undefined,
        unit: partToEdit.unit,
      });
    } else {
      form.reset({
        part_number: "",
        manufacturer_id: 0,
        description: "",
        secondary_description: "",
        category_id: undefined,
        unit: "EA",
      });
    }
  }, [partToEdit, form, open]);

  const onSubmit = async (data: PartFormValues) => {
    try {
      if (partToEdit) {
        await updatePart(partToEdit.id, {
          ...data,
          secondary_description: data.secondary_description || null,
          category_id: data.category_id || null,
        });
      } else {
        await addPart({
          ...data,
          secondary_description: data.secondary_description || null,
          category_id: data.category_id || null,
        });
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save part:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{partToEdit ? "Edit Part" : "Add New Part"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="part_number" className="text-right">
              Part No.
            </Label>
            <div className="col-span-3">
              <Input
                id="part_number"
                {...form.register("part_number")}
                className={form.formState.errors.part_number ? "border-red-500" : ""}
              />
              {form.formState.errors.part_number && (
                <p className="text-xs text-red-500 mt-1">{form.formState.errors.part_number.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="manufacturer" className="text-right">
              Mfr
            </Label>
            <div className="col-span-3">
              <Select
                value={form.watch("manufacturer_id")?.toString() || ""}
                onValueChange={(value) => form.setValue("manufacturer_id", Number(value), { shouldValidate: true })}
              >
                <SelectTrigger className={form.formState.errors.manufacturer_id ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select manufacturer" />
                </SelectTrigger>
                <SelectContent>
                  {manufacturers.map((m) => (
                    <SelectItem key={m.id} value={m.id.toString()}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.manufacturer_id && (
                <p className="text-xs text-red-500 mt-1">{form.formState.errors.manufacturer_id.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Desc
            </Label>
            <div className="col-span-3">
              <Input
                id="description"
                {...form.register("description")}
                className={form.formState.errors.description ? "border-red-500" : ""}
              />
              {form.formState.errors.description && (
                <p className="text-xs text-red-500 mt-1">{form.formState.errors.description.message}</p>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="secondary_description" className="text-right">
              2nd Desc
            </Label>
            <div className="col-span-3">
              <Input
                id="secondary_description"
                {...form.register("secondary_description")}
              />
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="category" className="text-right">
              Category
            </Label>
            <div className="col-span-3">
              <Select
                value={form.watch("category_id")?.toString() || "0"}
                onValueChange={(value) => form.setValue("category_id", value === "0" ? undefined : Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">None</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="unit" className="text-right">
              Unit
            </Label>
            <div className="col-span-3">
              <Input
                id="unit"
                {...form.register("unit")}
                className={form.formState.errors.unit ? "border-red-500" : ""}
              />
              {form.formState.errors.unit && (
                <p className="text-xs text-red-500 mt-1">{form.formState.errors.unit.message}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {partToEdit ? "Save Changes" : "Create Part"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
