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
import { ImageUpload } from "@/shared/components/image-upload";
import { designCollectionSchema, type DesignCollectionInput, designStatusOptions } from "@/lib/validations/design";
import type { DesignCollectionOption } from "@/features/design-gallery/types";

const EMPTY: DesignCollectionInput = { name: "", description: "", coverImageUrl: "", status: "DRAFT" };

export function CollectionFormDialog({
  open,
  onOpenChange,
  collection,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collection?: DesignCollectionOption;
  onSaved?: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const defaultValues: DesignCollectionInput = collection
    ? {
        name: collection.name,
        description: collection.description ?? "",
        coverImageUrl: collection.coverImageUrl ?? "",
        status: collection.status as DesignCollectionInput["status"],
      }
    : EMPTY;

  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors } } = useForm<DesignCollectionInput>({
    resolver: zodResolver(designCollectionSchema),
    defaultValues,
  });

  useEffect(() => {
    if (open) reset(defaultValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, collection?.id]);

  async function onSubmit(data: DesignCollectionInput) {
    setSubmitting(true);
    try {
      const url = collection ? `/api/designs/collections/${collection.id}` : "/api/designs/collections";
      const res = await fetch(url, {
        method: collection ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something went wrong");
      toast.success(collection ? "Collection updated" : "Collection created");
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{collection ? "Edit Collection" : "New Collection"}</DialogTitle>
          <DialogDescription>Group designs into a themed collection, e.g. &quot;2026 Wedding Collection&quot;.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Cover Image</Label>
            <ImageUpload value={watch("coverImageUrl")} onChange={(url) => setValue("coverImageUrl", url, { shouldDirty: true })} folder="designs" label="Upload cover" />
          </div>
          <div className="space-y-1.5">
            <Label>Name {errors.name && <span className="text-danger">*</span>}</Label>
            <Input {...register("name")} />
            {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea rows={3} {...register("description")} />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
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
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save Collection"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
