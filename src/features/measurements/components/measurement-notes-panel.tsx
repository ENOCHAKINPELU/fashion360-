"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { NotebookText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/shared/components/empty-state";
import { formatRelativeTime } from "@/lib/utils";
import { measurementNoteCategoryOptions } from "@/lib/validations/measurement";

export interface MeasurementNoteItem {
  id: string;
  category: string;
  body: string;
  createdAt: string;
  author?: { name: string | null } | null;
}

export function MeasurementNotesPanel({ measurementId, notes }: { measurementId: string; notes: MeasurementNoteItem[] }) {
  const router = useRouter();
  const [category, setCategory] = useState("DESIGNER_NOTE");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function addNote() {
    if (!body.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/measurements/${measurementId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, body }),
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
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {measurementNoteCategoryOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Textarea rows={3} placeholder="Add a note..." value={body} onChange={(e) => setBody(e.target.value)} />
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
              <div className="mb-1 flex items-center justify-between">
                <Badge variant="outline" className="font-normal text-muted-foreground">
                  {measurementNoteCategoryOptions.find((o) => o.value === note.category)?.label ?? note.category}
                </Badge>
                <span className="text-xs text-muted-foreground">{formatRelativeTime(note.createdAt)}</span>
              </div>
              <p className="text-sm text-foreground">{note.body}</p>
              {note.author?.name && <p className="mt-1 text-xs text-muted-foreground">by {note.author.name}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
