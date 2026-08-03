"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/shared/components/empty-state";
import { formatRelativeTime } from "@/lib/utils";
import type { DesignCommentData } from "@/features/design-studio/types";

// Mirrors the visual pattern of CustomerNotesPanel (list + inline add form),
// but this one is public-facing: language is written for the customer, not
// staff, and every comment here can be seen by whoever holds the share link.
export function CustomerCommentsPanel({
  comments,
  businessName,
  onAdd,
  submitting,
}: {
  comments: DesignCommentData[];
  businessName: string;
  onAdd: (body: string) => Promise<boolean>;
  submitting: boolean;
}) {
  const [body, setBody] = useState("");

  async function handleAdd() {
    if (!body.trim()) return;
    const ok = await onAdd(body.trim());
    if (ok) setBody("");
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Textarea
          rows={3}
          placeholder="Ask a question or leave a comment for the designer..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={submitting}
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={handleAdd} disabled={submitting || !body.trim()}>
            {submitting ? "Posting..." : "Post Comment"}
          </Button>
        </div>
      </div>

      {comments.length === 0 ? (
        <EmptyState icon={MessageCircle} title="No comments yet" description="Be the first to leave a note here." className="border-none py-8" />
      ) : (
        <ul className="space-y-3">
          {comments.map((comment) => {
            const isCustomer = comment.authorType === "CUSTOMER";
            const authorLabel = isCustomer ? "You" : comment.author?.name ?? businessName;
            return (
              <li key={comment.id} className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-foreground">
                    {authorLabel}
                    {!isCustomer && <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">Designer</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatRelativeTime(comment.createdAt)}</p>
                </div>
                <p className="mt-1 text-sm whitespace-pre-wrap text-foreground">{comment.body}</p>
                {comment.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={comment.imageUrl}
                    alt=""
                    className="mt-2 h-24 w-24 rounded-lg border border-border object-cover"
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
