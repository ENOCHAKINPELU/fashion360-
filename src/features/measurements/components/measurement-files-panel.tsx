"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/shared/components/empty-state";
import { formatDate } from "@/lib/utils";

export interface MeasurementFileItem {
  id: string;
  name: string;
  url: string;
  category: string;
  createdAt: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  reference_image: "Reference Image",
  sketch: "Body Sketch",
  previous_sheet: "Previous Measurement Sheet",
  document: "Document",
};

export function MeasurementFilesPanel({ measurementId, files }: { measurementId: string; files: MeasurementFileItem[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState("reference_image");
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("folder", "measurement-files");
      const uploadRes = await fetch("/api/uploads", { method: "POST", body: form });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error ?? "Upload failed");

      const res = await fetch(`/api/measurements/${measurementId}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: uploadData.url, name: file.name, category, fileType: file.type, sizeBytes: file.size }),
      });
      if (!res.ok) throw new Error("Could not save file");

      toast.success("File uploaded");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading} className="gap-1.5">
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          Upload
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,application/pdf"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>

      {files.length === 0 ? (
        <EmptyState icon={FileText} title="No attachments yet" className="border-none py-8" />
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {files.map((file) => (
            <li key={file.id} className="flex items-center justify-between gap-3 p-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <a href={file.url} target="_blank" rel="noreferrer" className="truncate text-sm font-medium text-foreground hover:underline">
                    {file.name}
                  </a>
                  <p className="text-xs text-muted-foreground">
                    {CATEGORY_LABELS[file.category] ?? file.category} · {formatDate(file.createdAt)}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
