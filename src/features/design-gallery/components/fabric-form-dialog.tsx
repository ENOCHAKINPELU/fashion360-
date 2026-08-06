"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ImageUpload } from "@/shared/components/image-upload";
import { fabricLibraryItemSchema, type FabricLibraryItemInput, fabricAvailabilityOptions } from "@/lib/validations/design";
import type { FabricLibraryItemData } from "@/features/design-gallery/types";

const EMPTY: FabricLibraryItemInput = {
  name: "",
  imageUrl: "",
  colorVariants: [],
  texture: "",
  description: "",
  recommendedUses: [],
  availability: "IN_STOCK",
  baseColorHex: "",
  roughness: 0.55,
  metalness: 0.03,
  opacity: 1,
  reflectivity: 0.5,
  textureMapUrl: "",
  normalMapUrl: "",
};

// 0-1 PBR sliders shown as a friendlier 0-100 scale in the UI.
const PBR_SLIDERS: {
  key: "roughness" | "metalness" | "opacity" | "reflectivity";
  label: string;
  hint: string;
}[] = [
  { key: "roughness", label: "Roughness", hint: "Lower = glossier/shinier (satin), higher = matte (raw cotton)" },
  { key: "metalness", label: "Metallic", hint: "Real fabrics are near 0 — only raise for metallic thread/lamé" },
  { key: "opacity", label: "Opacity", hint: "Lower for sheer fabrics like lace or organza" },
  { key: "reflectivity", label: "Reflectivity", hint: "How much light reflects straight back at the viewer" },
];

export function FabricFormDialog({
  open,
  onOpenChange,
  fabric,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fabric?: FabricLibraryItemData;
  onSaved?: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const defaultValues: FabricLibraryItemInput = fabric
    ? {
        name: fabric.name,
        imageUrl: fabric.imageUrl ?? "",
        colorVariants: fabric.colorVariants,
        texture: fabric.texture ?? "",
        description: fabric.description ?? "",
        recommendedUses: fabric.recommendedUses,
        availability: fabric.availability as FabricLibraryItemInput["availability"],
        baseColorHex: fabric.baseColorHex ?? "",
        roughness: fabric.roughness ?? 0.55,
        metalness: fabric.metalness ?? 0.03,
        opacity: fabric.opacity ?? 1,
        reflectivity: fabric.reflectivity ?? 0.5,
        textureMapUrl: fabric.textureMapUrl ?? "",
        normalMapUrl: fabric.normalMapUrl ?? "",
      }
    : EMPTY;

  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors } } = useForm<FabricLibraryItemInput>({
    resolver: zodResolver(fabricLibraryItemSchema),
    defaultValues,
  });

  useEffect(() => {
    if (open) reset(defaultValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, fabric?.id]);

  async function onSubmit(data: FabricLibraryItemInput) {
    setSubmitting(true);
    try {
      const url = fabric ? `/api/designs/fabrics/${fabric.id}` : "/api/designs/fabrics";
      const res = await fetch(url, {
        method: fabric ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something went wrong");
      toast.success(fabric ? "Fabric updated" : "Fabric added");
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
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{fabric ? "Edit Fabric" : "Add Fabric"}</DialogTitle>
          <DialogDescription>Catalogue a fabric for design recommendations and customization.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Fabric Image</Label>
            <ImageUpload value={watch("imageUrl")} onChange={(url) => setValue("imageUrl", url, { shouldDirty: true })} folder="fabrics" label="Upload fabric image" />
          </div>
          <div className="space-y-1.5">
            <Label>Name {errors.name && <span className="text-danger">*</span>}</Label>
            <Input {...register("name")} />
            {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Texture</Label>
            <Input {...register("texture")} placeholder="Smooth, textured, ribbed..." />
          </div>
          <div className="space-y-1.5">
            <Label>Colour Variants</Label>
            <Input
              defaultValue={defaultValues.colorVariants.join(", ")}
              placeholder="Comma-separated, e.g. Navy, Wine, Charcoal"
              onChange={(e) => setValue("colorVariants", e.target.value.split(",").map((v) => v.trim()).filter(Boolean))}
            />
          </div>
          <div className="space-y-3 rounded-xl border border-border bg-surface p-3.5">
            <div>
              <p className="text-sm font-medium text-foreground">3D Material</p>
              <p className="text-xs text-muted-foreground">
                Drives how this fabric actually renders on the 3D design preview — a real material, not just a flat color.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Base Colour</Label>
              <div className="flex items-center gap-2">
                <span
                  className="size-9 shrink-0 rounded-lg border border-border"
                  style={{ backgroundColor: /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(watch("baseColorHex") ?? "") ? watch("baseColorHex") : "transparent" }}
                />
                <Input {...register("baseColorHex")} placeholder="#5A1D92" className="font-mono" />
              </div>
              {errors.baseColorHex && <p className="text-xs text-danger">{errors.baseColorHex.message}</p>}
            </div>

            {PBR_SLIDERS.map((s) => (
              <div key={s.key} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>{s.label}</Label>
                  <span className="text-xs text-muted-foreground">{Math.round((watch(s.key) ?? 0) * 100)}%</span>
                </div>
                <Controller
                  control={control}
                  name={s.key}
                  render={({ field }) => (
                    <Slider
                      value={[field.value ?? 0]}
                      min={0}
                      max={1}
                      step={0.01}
                      onValueChange={([v]) => field.onChange(v)}
                    />
                  )}
                />
                <p className="text-[11px] text-muted-foreground">{s.hint}</p>
              </div>
            ))}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Texture Map</Label>
                <ImageUpload
                  value={watch("textureMapUrl")}
                  onChange={(url) => setValue("textureMapUrl", url, { shouldDirty: true })}
                  folder="fabrics"
                  label="Upload weave photo"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Normal Map</Label>
                <ImageUpload
                  value={watch("normalMapUrl")}
                  onChange={(url) => setValue("normalMapUrl", url, { shouldDirty: true })}
                  folder="fabrics"
                  label="Upload surface detail"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Recommended Uses</Label>
            <Input
              defaultValue={defaultValues.recommendedUses.join(", ")}
              placeholder="Comma-separated, e.g. Suits, Gowns"
              onChange={(e) => setValue("recommendedUses", e.target.value.split(",").map((v) => v.trim()).filter(Boolean))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Availability</Label>
            <Controller
              control={control}
              name="availability"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fabricAvailabilityOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea rows={3} {...register("description")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save Fabric"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
