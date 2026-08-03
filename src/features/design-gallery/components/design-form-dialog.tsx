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
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUpload } from "@/shared/components/image-upload";
import { MultiImageUpload } from "@/shared/components/multi-image-upload";
import { DesignTagBadge } from "@/features/design-gallery/components/design-tag-badge";
import {
  designFormSchema,
  type DesignFormInput,
  designStatusOptions,
  designDifficultyOptions,
} from "@/lib/validations/design";
import type { DesignCategoryOption, DesignCollectionOption, DesignTagOption, DesignListItem } from "@/features/design-gallery/types";

const EMPTY_DEFAULTS: DesignFormInput = {
  name: "",
  description: "",
  categoryId: "",
  collectionId: "",
  mainImageUrl: "",
  occasion: "",
  fabricRecommendations: [],
  colorRecommendations: [],
  tags: [],
  status: "DRAFT",
  isFeatured: false,
  images: [],
  notes: "",
};

export function DesignFormDialog({
  open,
  onOpenChange,
  mode,
  design,
  categories,
  collections,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  design?: DesignListItem;
  categories: DesignCategoryOption[];
  collections: DesignCollectionOption[];
  onSaved?: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [tagOptions, setTagOptions] = useState<DesignTagOption[]>([]);

  const defaultValues: DesignFormInput = design
    ? {
        name: design.name,
        description: design.description ?? "",
        categoryId: design.category?.id ?? "",
        collectionId: design.collection?.id ?? "",
        mainImageUrl: design.mainImageUrl ?? "",
        occasion: design.occasion ?? "",
        estimatedCompletionDays: design.estimatedCompletionDays ?? undefined,
        basePrice: design.basePrice ?? undefined,
        difficulty: design.difficulty as DesignFormInput["difficulty"],
        fabricRecommendations: [],
        colorRecommendations: [],
        tags: design.tags.map((t) => t.id),
        status: design.status as DesignFormInput["status"],
        isFeatured: design.isFeatured,
        images: design.images.map((img) => img.url),
        notes: "",
      }
    : EMPTY_DEFAULTS;

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(designFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (!open) return;
    reset(defaultValues);
    fetch("/api/designs/tags")
      .then((res) => res.json())
      .then((data) => setTagOptions(data.tags ?? []))
      .catch(() => setTagOptions([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, design?.id]);

  const selectedTags = watch("tags");

  function toggleTag(id: string) {
    const next = selectedTags.includes(id) ? selectedTags.filter((t) => t !== id) : [...selectedTags, id];
    setValue("tags", next, { shouldDirty: true });
  }

  async function onSubmit(data: DesignFormInput) {
    setSubmitting(true);
    try {
      const url = mode === "create" ? "/api/designs" : `/api/designs/${design?.id}`;
      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something went wrong");

      toast.success(mode === "create" ? "Design added" : "Design updated");
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
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add Design" : "Edit Design"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Catalogue a new design for your gallery."
              : "Update this design's details."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Field label="Main Image" error={errors.mainImageUrl?.message} required>
            <ImageUpload
              value={watch("mainImageUrl")}
              onChange={(url) => setValue("mainImageUrl", url, { shouldDirty: true })}
              folder="designs"
              label="Upload main image"
            />
          </Field>

          <Field label="Gallery Images">
            <MultiImageUpload
              value={watch("images")}
              onChange={(urls) => setValue("images", urls, { shouldDirty: true })}
              folder="designs"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Design Name" error={errors.name?.message} required className="sm:col-span-2">
              <Input {...register("name")} />
            </Field>
            <Field label="Description" className="sm:col-span-2">
              <Textarea rows={3} {...register("description")} />
            </Field>
            <Field label="Category" error={errors.categoryId?.message} required>
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field label="Collection">
              <Controller
                control={control}
                name="collectionId"
                render={({ field }) => (
                  <Select value={field.value || "none"} onValueChange={(v) => field.onChange(v === "none" ? "" : v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="No collection" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No collection</SelectItem>
                      {collections.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field label="Occasion">
              <Input {...register("occasion")} placeholder="Wedding, corporate, casual..." />
            </Field>
            <Field label="Difficulty">
              <Controller
                control={control}
                name="difficulty"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      {designDifficultyOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field label="Estimated Completion (days)">
              <Input type="number" min={0} {...register("estimatedCompletionDays")} />
            </Field>
            <Field label="Base Price">
              <Input type="number" min={0} step="0.01" {...register("basePrice")} />
            </Field>
            <Field label="Status">
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {designStatusOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field label="Fabric Recommendations" className="sm:col-span-2">
              <Input
                placeholder="Comma-separated, e.g. Silk, Velvet, Lace"
                defaultValue={defaultValues.fabricRecommendations.join(", ")}
                onChange={(e) =>
                  setValue(
                    "fabricRecommendations",
                    e.target.value.split(",").map((v) => v.trim()).filter(Boolean),
                    { shouldDirty: true }
                  )
                }
              />
            </Field>
            <Field label="Colour Recommendations" className="sm:col-span-2">
              <Input
                placeholder="Comma-separated, e.g. Gold, Ivory, Burgundy"
                defaultValue={defaultValues.colorRecommendations.join(", ")}
                onChange={(e) =>
                  setValue(
                    "colorRecommendations",
                    e.target.value.split(",").map((v) => v.trim()).filter(Boolean),
                    { shouldDirty: true }
                  )
                }
              />
            </Field>
          </div>

          <div>
            <Label className="mb-2 block">Design Tags</Label>
            <div className="flex flex-wrap gap-2">
              {tagOptions.map((tag) => (
                <button
                  type="button"
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  className={selectedTags.includes(tag.id) ? "opacity-100" : "opacity-40 grayscale hover:opacity-70"}
                >
                  <DesignTagBadge name={tag.name} color={tag.color} />
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border p-4">
            <div>
              <p className="text-sm font-medium text-foreground">Feature this design</p>
              <p className="text-xs text-muted-foreground">Featured designs are highlighted across the gallery.</p>
            </div>
            <Controller
              control={control}
              name="isFeatured"
              render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
            />
          </div>

          <Field label="Notes">
            <Textarea rows={3} {...register("notes")} placeholder="Construction notes, fabric advice..." />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : mode === "create" ? "Save Design" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  error,
  required,
  className,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label>
        {label} {required && <span className="text-danger">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
