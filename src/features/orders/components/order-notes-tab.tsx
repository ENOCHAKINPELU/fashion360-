"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { NotebookText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/shared/components/empty-state";
import { formatRelativeTime } from "@/lib/utils";
import { orderNoteCategoryOptions } from "@/lib/validations/order";
import type { OrderNoteData } from "@/features/orders/types";

const CATEGORY_LABELS = Object.fromEntries(orderNoteCategoryOptions.map((o) => [o.value, o.label]));
const CATEGORY_STYLES: Record<string, string> = {
  CUSTOMER: "bg-info-soft text-info",
  DESIGNER: "bg-accent-soft text-primary",
  PRODUCTION: "bg-warning-soft text-warning",
  FITTING: "bg-accent-soft text-secondary",
  ALTERATION: "bg-warning-soft text-warning",
  PRIVATE: "bg-muted text-muted-foreground",
};

export function OrderNotesTab({ orderId, notes }: { orderId: string; notes: OrderNoteData[] }) {
  const router = useRouter();
  const [category, setCategory] = useState<string>("DESIGNER");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function addNote() {
    if (!body.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not add note");
      setBody("");
      toast.success("Note added");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add note");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-xl border border-border p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Add Note</p>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {orderNoteCategoryOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Textarea rows={3} placeholder="Write a note about this order..." value={body} onChange={(e) => setBody(e.target.value)} />
        <div className="flex justify-end">
          <Button size="sm" onClick={addNote} disabled={submitting || !body.trim()}>
            {submitting ? "Saving..." : "Add Note"}
          </Button>
        </div>
      </div>

      {notes.length === 0 ? (
        <EmptyState icon={NotebookText} title="No notes yet" className="border-none py-10" />
      ) : (
        <ul className="space-y-3">
          {notes.map((note) => (
            <li key={note.id} className="rounded-xl border border-border p-3">
              <div className="mb-1.5 flex items-center gap-2">
                <Badge className={CATEGORY_STYLES[note.category] ?? CATEGORY_STYLES.DESIGNER}>
                  {CATEGORY_LABELS[note.category] ?? note.category}
                </Badge>
              </div>
              <p className="text-sm whitespace-pre-wrap text-foreground">{note.body}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatRelativeTime(note.createdAt)}
                {note.author?.name ? ` · ${note.author.name}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
