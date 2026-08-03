"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiImageUpload } from "@/shared/components/multi-image-upload";
import { EmptyState } from "@/shared/components/empty-state";
import { formatDate } from "@/lib/utils";
import { orderFileCategoryOptions } from "@/lib/validations/order";
import type { OrderFileData } from "@/features/orders/types";

const CATEGORY_LABELS = Object.fromEntries(orderFileCategoryOptions.map((o) => [o.value, o.label]));

export function OrderFilesTab({ orderId, files }: { orderId: string; files: OrderFileData[] }) {
  const router = useRouter();
  const [category, setCategory] = useState<string>(orderFileCategoryOptions[0].value);
  const [pendingUrls, setPendingUrls] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  async function handleChange(urls: string[]) {
    const newOnes = urls.filter((u) => !pendingUrls.includes(u));
    setPendingUrls(urls);
    if (newOnes.length === 0) return;

    setSaving(true);
    try {
      for (const url of newOnes) {
        const name = `${CATEGORY_LABELS[category] ?? category} - ${url.split("/").pop() ?? "file"}`;
        const res = await fetch(`/api/orders/${orderId}/files`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category, url, name }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not save file");
      }
      toast.success(newOnes.length > 1 ? "Files uploaded" : "File uploaded");
      setPendingUrls([]);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save file");
    } finally {
      setSaving(false);
    }
  }

  const groups = orderFileCategoryOptions
    .map((opt) => ({ ...opt, items: files.filter((f) => f.category === opt.value) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      <div className="space-y-2 rounded-xl border border-border p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Upload File</p>
          <Select value={category} onValueChange={setCategory} disabled={saving}>
            <SelectTrigger size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {orderFileCategoryOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <MultiImageUpload value={pendingUrls} onChange={handleChange} folder="orders" label={saving ? "Saving..." : "Add files"} />
      </div>

      {groups.length === 0 ? (
        <EmptyState icon={FileText} title="No files yet" description="Upload design images, sketches, or reference documents for this order." className="border-none py-12" />
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.value}>
              <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">{group.label}</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {group.items.map((file) => (
                  <a
                    key={file.id}
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group overflow-hidden rounded-xl border border-border bg-surface"
                  >
                    <div className="aspect-square overflow-hidden bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={file.url} alt={file.name} className="size-full object-cover transition-transform group-hover:scale-105" />
                    </div>
                    <div className="p-2">
                      <p className="truncate text-xs font-medium text-foreground">{file.name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {formatDate(file.createdAt)}
                        {file.uploadedBy?.name ? ` · ${file.uploadedBy.name}` : ""}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
