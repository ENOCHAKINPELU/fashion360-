"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/shared/components/user-avatar";
import { formatDate } from "@/lib/utils";
import type { DesignCommentData } from "@/features/design-studio/types";

export function DesignCommentsPanel({ previewId, comments }: { previewId: string; comments: DesignCommentData[] }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!body.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/design-previews/${previewId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not add comment");
      setBody("");
      toast.success("Comment added");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add comment");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
        {comments.length === 0 && <p className="text-sm text-muted-foreground">No comments yet.</p>}
        {comments.map((c) => {
          const authorName = c.author?.name ?? (c.authorType === "CUSTOMER" ? "Customer" : "Staff");
          return (
            <div key={c.id} className="flex gap-2.5">
              <UserAvatar name={authorName} className="size-7 shrink-0" />
              <div className="min-w-0 flex-1 rounded-xl border border-border bg-surface p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-foreground">{authorName}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(c.createdAt)}</p>
                </div>
                <p className="mt-1 text-sm text-foreground">{c.body}</p>
                {c.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.imageUrl} alt="" className="mt-2 max-h-40 rounded-lg border border-border object-cover" />
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="space-y-2">
        <Textarea
          rows={2}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a comment for the customer or team..."
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={submit} disabled={submitting || !body.trim()} className="gap-1.5">
            <Send className="size-3.5" /> {submitting ? "Sending..." : "Post Comment"}
          </Button>
        </div>
      </div>
    </div>
  );
}
