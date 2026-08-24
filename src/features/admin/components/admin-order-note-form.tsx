"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

// The only write action Phase 6 has — see lib/admin-orders.ts's comment on
// why this note is admin-only by construction (no category picker; the API
// route always writes OrderNoteCategory.ADMIN).
export function AdminOrderNoteForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!body.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
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
    <div className="space-y-2 rounded-xl border border-border p-3">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Add Admin Note (not visible to the customer or designer)</p>
      <Textarea rows={3} placeholder="Write an internal note about this order..." value={body} onChange={(e) => setBody(e.target.value)} />
      <div className="flex justify-end">
        <Button size="sm" onClick={submit} disabled={submitting || !body.trim()}>
          {submitting ? "Saving..." : "Add Note"}
        </Button>
      </div>
    </div>
  );
}
