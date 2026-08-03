"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { designNoteCategoryOptions } from "@/lib/validations/design";
import { formatDate } from "@/lib/utils";

interface DesignNote {
  id: string;
  category: string;
  body: string;
  createdAt: string;
  author: { name: string | null } | null;
}

export function DesignNotesPanel({ designId, notes: initialNotes }: { designId: string; notes: DesignNote[] }) {
  const [notes, setNotes] = useState(initialNotes);
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("CONSTRUCTION");
  const [submitting, setSubmitting] = useState(false);

  async function addNote() {
    if (!body.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/designs/${designId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, body }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not add note");
      setNotes((prev) => [json.note, ...prev]);
      setBody("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex gap-2">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {designNoteCategoryOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Textarea
          rows={2}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Construction notes, fabric advice, special instructions..."
        />
        <Button size="sm" onClick={addNote} disabled={submitting || !body.trim()} className="gap-1.5">
          <Plus className="size-4" /> Add Note
        </Button>
      </div>

      <div className="space-y-3">
        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notes yet.</p>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="rounded-xl border border-border p-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline">{designNoteCategoryOptions.find((o) => o.value === note.category)?.label ?? note.category}</Badge>
                <span className="text-xs text-muted-foreground">{formatDate(note.createdAt)}</span>
              </div>
              <p className="mt-2 text-sm text-foreground">{note.body}</p>
              {note.author?.name && <p className="mt-1 text-xs text-muted-foreground">by {note.author.name}</p>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
