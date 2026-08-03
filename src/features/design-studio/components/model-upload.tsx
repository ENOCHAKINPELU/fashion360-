"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Upload, Box, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ModelUploadValue {
  url: string;
  format: string;
  fileSizeBytes: number;
}

export function ModelUpload({
  value,
  onChange,
  label = "Upload 3D model",
}: {
  value?: ModelUploadValue | null;
  onChange: (value: ModelUploadValue | null) => void;
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
      form.append("folder", "design-models");
      form.append("kind", "model");
      const res = await fetch("/api/uploads", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      onChange({ url: data.url, format: data.format, fileSizeBytes: data.fileSizeBytes });
      toast.success("3D model uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      {value ? (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-primary">
            <Box className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{value.format} model attached</p>
            <p className="text-xs text-muted-foreground">{(value.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB</p>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={() => onChange(null)} aria-label="Remove model">
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface py-6 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-60"
        >
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {uploading ? "Uploading..." : label}
        </button>
      )}
      <p className="text-xs text-muted-foreground">GLB, glTF, OBJ, or FBX. Max 50MB.</p>
      <input
        ref={inputRef}
        type="file"
        accept=".glb,.gltf,.obj,.fbx"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
