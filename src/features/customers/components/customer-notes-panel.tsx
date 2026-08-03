"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { NotebookText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/shared/components/empty-state";
import { formatRelativeTime } from "@/lib/utils";

export interface CustomerNoteItem {
  id: string;
  body: string;
  createdAt: string;
  author?: { name: string | null } | null;
}

export function CustomerNotesPanel({ customerId, notes }: { customerId: string; notes: CustomerNoteItem[] }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function addNote() {
    if (!body.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) throw new Error("Could not add note");
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
      <div className="space-y-2">
        <Textarea
          rows={3}
          placeholder="Add a private note about this customer..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={addNote} disabled={submitting || !body.trim()}>
            {submitting ? "Saving..." : "Add Note"}
          </Button>
        </div>
      </div>

      {notes.length === 0 ? (
        <EmptyState icon={NotebookText} title="No notes yet" className="border-none py-8" />
      ) : (
        <ul className="space-y-3">
          {notes.map((note) => (
            <li key={note.id} className="rounded-xl border border-border p-3">
              <p className="text-sm text-foreground">{note.body}</p>
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
