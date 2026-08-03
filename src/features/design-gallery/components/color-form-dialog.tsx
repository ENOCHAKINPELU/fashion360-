"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { colorLibraryItemSchema, type ColorLibraryItemInput } from "@/lib/validations/design";
import type { ColorLibraryItemData } from "@/features/design-gallery/types";

const EMPTY: ColorLibraryItemInput = { name: "", hexValue: "#6C3CF0", pairsWith: [] };

export function ColorFormDialog({
  open,
  onOpenChange,
  color,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  color?: ColorLibraryItemData;
  onSaved?: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const defaultValues: ColorLibraryItemInput = color
    ? { name: color.name, hexValue: color.hexValue, pairsWith: color.pairsWith }
    : EMPTY;

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<ColorLibraryItemInput>({
    resolver: zodResolver(colorLibraryItemSchema),
    defaultValues,
  });

  useEffect(() => {
    if (open) reset(defaultValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, color?.id]);

  async function onSubmit(data: ColorLibraryItemInput) {
    setSubmitting(true);
    try {
      const url = color ? `/api/designs/colors/${color.id}` : "/api/designs/colors";
      const res = await fetch(url, {
        method: color ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something went wrong");
      toast.success(color ? "Colour updated" : "Colour added");
      onOpenChange(false);
      onSaved?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{color ? "Edit Colour" : "Add Colour"}</DialogTitle>
          <DialogDescription>Add a colour swatch to your colour library.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name {errors.name && <span className="text-danger">*</span>}</Label>
            <Input {...register("name")} placeholder="Royal Purple" />
            {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Hex Value {errors.hexValue && <span className="text-danger">*</span>}</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={watch("hexValue") || "#6C3CF0"}
                onChange={(e) => setValue("hexValue", e.target.value)}
                className="size-9 shrink-0 cursor-pointer rounded-lg border border-border"
              />
              <Input {...register("hexValue")} placeholder="#6C3CF0" className="flex-1" />
            </div>
            {errors.hexValue && <p className="text-xs text-danger">{errors.hexValue.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Pairs Well With</Label>
            <Input
              defaultValue={defaultValues.pairsWith.join(", ")}
              placeholder="Comma-separated hex or names"
              onChange={(e) => setValue("pairsWith", e.target.value.split(",").map((v) => v.trim()).filter(Boolean))}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save Colour"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
