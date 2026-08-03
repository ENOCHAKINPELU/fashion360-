"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Upload, X, Video as VideoIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function MultiVideoUpload({
  value,
  onChange,
  label = "Add videos",
  max = 3,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
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
        form.append("folder", "dispute-evidence");
        form.append("kind", "video");
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
      <div className="flex flex-wrap gap-3">
        {value.map((url, index) => (
          <div key={url + index} className="group relative flex items-center gap-2 rounded-xl border border-border bg-muted px-3 py-2">
            <VideoIcon className="size-4 text-muted-foreground" />
            <span className="text-xs text-foreground">Video {index + 1}</span>
            <button
              type="button"
              onClick={() => removeAt(index)}
              className="text-muted-foreground transition-colors hover:text-danger"
              aria-label="Remove video"
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
              "flex items-center gap-1.5 rounded-xl border border-dashed border-border bg-surface px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-60"
            )}
          >
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {label}
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">MP4, MOV, or WEBM. Max 25MB each, up to {max} videos.</p>
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
