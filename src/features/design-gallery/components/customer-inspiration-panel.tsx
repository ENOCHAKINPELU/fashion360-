"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MultiImageUpload } from "@/shared/components/multi-image-upload";
import { inspirationSourceOptions } from "@/lib/validations/design";
import { formatDate } from "@/lib/utils";
import type { DesignCustomerOption } from "@/features/design-gallery/types";

interface Inspiration {
  id: string;
  source: string;
  designerNotes: string | null;
  createdAt: string;
  images: { id: string; url: string }[];
}

export function CustomerInspirationPanel({
  customer,
  relatedDesignId,
}: {
  customer: DesignCustomerOption | null;
  relatedDesignId?: string;
}) {
  const [inspirations, setInspirations] = useState<Inspiration[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [source, setSource] = useState("UPLOAD");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!customer) {
      setInspirations([]);
      return;
    }
    setLoading(true);
    fetch(`/api/customers/${customer.id}/inspirations`)
      .then((res) => res.json())
      .then((data) => setInspirations(data.inspirations ?? []))
      .finally(() => setLoading(false));
  }, [customer]);

  async function addInspiration() {
    if (!customer || images.length === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/customers/${customer.id}/inspirations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images, source, designerNotes: notes, relatedDesignId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not save inspiration");
      setInspirations((prev) => [json.inspiration, ...prev]);
      setImages([]);
      setNotes("");
      toast.success("Inspiration saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function removeInspiration(id: string) {
    if (!customer) return;
    const res = await fetch(`/api/customers/${customer.id}/inspirations/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not remove inspiration");
      return;
    }
    setInspirations((prev) => prev.filter((i) => i.id !== id));
  }

  if (!customer) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-surface py-8 text-center text-sm text-muted-foreground">
        Select a customer in the Customize tab to record their inspiration references.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3 rounded-xl border border-border p-4">
        <MultiImageUpload value={images} onChange={setImages} folder="inspirations" label="Add reference images" />
        <div className="flex gap-2">
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {inspirationSourceOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Designer notes about this inspiration..." />
        <Button size="sm" onClick={addInspiration} disabled={submitting || images.length === 0}>
          {submitting ? "Saving..." : "Save Inspiration"}
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : inspirations.length === 0 ? (
        <p className="text-sm text-muted-foreground">No inspiration references saved for this customer yet.</p>
      ) : (
        <div className="space-y-3">
          {inspirations.map((inspiration) => (
            <div key={inspiration.id} className="rounded-xl border border-border p-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline">{inspirationSourceOptions.find((o) => o.value === inspiration.source)?.label}</Badge>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{formatDate(inspiration.createdAt)}</span>
                  <Button variant="ghost" size="icon-sm" onClick={() => removeInspiration(inspiration.id)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
              {inspiration.images.length > 0 && (
                <div className="mt-2 flex gap-2 overflow-x-auto">
                  {inspiration.images.map((img) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={img.id} src={img.url} alt="" className="size-16 shrink-0 rounded-lg object-cover" />
                  ))}
                </div>
              )}
              {inspiration.designerNotes && <p className="mt-2 text-sm text-foreground">{inspiration.designerNotes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
