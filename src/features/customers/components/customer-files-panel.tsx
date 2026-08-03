"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/shared/components/empty-state";
import { formatDate } from "@/lib/utils";

export interface CustomerFileItem {
  id: string;
  name: string;
  url: string;
  sizeBytes: number | null;
  createdAt: string;
}

export function CustomerFilesPanel({ customerId, files }: { customerId: string; files: CustomerFileItem[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("folder", "avatars");
      const uploadRes = await fetch("/api/uploads", { method: "POST", body: form });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error ?? "Upload failed");

      const res = await fetch(`/api/customers/${customerId}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: uploadData.url, name: file.name, fileType: file.type, sizeBytes: file.size }),
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
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading} className="gap-1.5">
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          Upload File
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
        <EmptyState icon={FileText} title="No files yet" className="border-none py-8" />
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {files.map((file) => (
            <li key={file.id} className="flex items-center justify-between gap-3 p-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <a href={file.url} target="_blank" rel="noreferrer" className="truncate text-sm font-medium text-foreground hover:underline">
                    {file.name}
                  </a>
                  <p className="text-xs text-muted-foreground">{formatDate(file.createdAt)}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
