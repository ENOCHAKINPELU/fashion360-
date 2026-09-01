"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Upload, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function ImageUpload({
  value,
  onChange,
  folder,
  shape = "square",
  label = "Upload image",
}: {
  value?: string | null;
  onChange: (url: string) => void;
  folder:
    | "logos"
    | "avatars"
    | "designs"
    | "fabrics"
    | "inspirations"
    | "orders"
    | "portfolio"
    | "service-requests"
    | "design-references"
    | "production-photos"
    | "dispute-evidence"
    | "verification-documents"
    | "delivery-evidence";
  shape?: "square" | "circle";
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("folder", folder);
      const res = await fetch("/api/uploads", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      onChange(data.url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div
        className={cn(
          "flex size-16 shrink-0 items-center justify-center overflow-hidden border border-border bg-muted text-muted-foreground",
          shape === "circle" ? "rounded-full" : "rounded-xl"
        )}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="size-full object-cover" />
        ) : (
          <UserIcon className="size-6" aria-hidden="true" />
        )}
      </div>
      <div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
        >
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {label}
        </button>
        <p className="mt-1 text-xs text-muted-foreground">PNG, JPEG, or WEBP. Max 5MB.</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
    </div>
  );
}
