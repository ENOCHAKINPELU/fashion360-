"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Upload, X, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function MultiImageUpload({
  value,
  onChange,
  folder,
  label = "Add images",
  max = 12,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  folder:
    | "designs"
    | "fabrics"
    | "inspirations"
    | "orders"
    | "service-requests"
    | "design-references"
    | "production-photos"
    | "dispute-evidence"
    | "review-photos"
    | "delivery-evidence";
  label?: string;
  max?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remaining = Math.max(0, max - value.length);
    const selected = Array.from(files).slice(0, remaining);
    if (selected.length === 0) return;

    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of selected) {
        const form = new FormData();
        form.append("file", file);
        form.append("folder", folder);
        const res = await fetch("/api/uploads", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Upload failed");
        uploaded.push(data.url);
      }
      onChange([...value, ...uploaded]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {value.map((url, index) => (
          <div
            key={url + index}
            className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-muted"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="size-full object-cover" />
            <button
              type="button"
              onClick={() => removeAt(index)}
              className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
              aria-label="Remove image"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}

        {value.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className={cn(
              "flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-surface text-muted-foreground transition-colors hover:bg-muted disabled:opacity-60"
            )}
          >
            {uploading ? (
              <Loader2 className="size-5 animate-spin" />
            ) : value.length === 0 ? (
              <ImageIcon className="size-5" />
            ) : (
              <Upload className="size-5" />
            )}
            <span className="text-xs font-medium">{label}</span>
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">PNG, JPEG, or WEBP. Max 5MB each, up to {max} images.</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
