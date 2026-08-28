"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { EyeOff, RotateCcw, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type DialogKind = "hide" | "restore" | "flag" | null;

// Admin Phase 9's review moderation bar — every action here calls the
// pre-existing lib/reviews.ts moderateReview through the pre-existing
// POST /api/admin/reviews/[id]/moderate route (moderate/restore already
// had a working backend and API before this phase; only FLAG is new, added
// to that same enum/route rather than a third route). Same required-
// reason-dialog shape every prior Admin phase established.
export function AdminReviewActions({ reviewId, status }: { reviewId: string; status: string }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function closeDialog() {
    setDialog(null);
    setReason("");
  }

  async function submit(action: "HIDE" | "RESTORE" | "FLAG", successMessage: string) {
    if (!reason.trim()) {
      toast.error("A reason is required");
      return;
    }
    setSubmitting(true);
    try {
      const url = action === "RESTORE" ? `/api/admin/reviews/${reviewId}/restore` : `/api/admin/reviews/${reviewId}/moderate`;
      const body = action === "RESTORE" ? { reason } : { action, reason };
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Action failed");
      toast.success(successMessage);
      closeDialog();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed");
    } finally {
      setSubmitting(false);
    }
  }

  const isHidden = status === "HIDDEN" || status === "REMOVED" || status === "REJECTED";

  return (
    <div className="flex flex-wrap gap-2">
      {isHidden ? (
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setDialog("restore")}>
          <RotateCcw className="size-3.5" /> Restore Review
        </Button>
      ) : (
        <Button size="sm" variant="outline" className="gap-1.5 text-danger hover:text-danger" onClick={() => setDialog("hide")}>
          <EyeOff className="size-3.5" /> Hide Review
        </Button>
      )}
      {status !== "FLAGGED" && (
        <Button size="sm" variant="outline" className="gap-1.5 text-warning hover:text-warning" onClick={() => setDialog("flag")}>
          <Flag className="size-3.5" /> Flag for Investigation
        </Button>
      )}

      <Dialog open={dialog === "hide"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hide this review?</DialogTitle>
            <DialogDescription>Removed from public view and excluded from the designer&apos;s rating. The customer is notified. Recorded in this review&apos;s moderation history.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="review-hide-reason">Reason</Label>
            <Textarea id="review-hide-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this review being hidden?" rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => submit("HIDE", "Review hidden")} disabled={submitting}>
              {submitting ? "Hiding..." : "Hide Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "restore"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Restore this review?</DialogTitle>
            <DialogDescription>Publishes it again and counts it toward the designer&apos;s rating. The customer is notified.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="review-restore-reason">Reason</Label>
            <Textarea id="review-restore-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this review being restored?" rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={() => submit("RESTORE", "Review restored")} disabled={submitting}>
              {submitting ? "Restoring..." : "Restore Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "flag"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Flag for investigation?</DialogTitle>
            <DialogDescription>Excludes it from the designer&apos;s rating while you look into it, without taking it down. The customer is notified.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="review-flag-reason">Reason</Label>
            <Textarea id="review-flag-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="What's being investigated?" rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={() => submit("FLAG", "Review flagged")} disabled={submitting}>
              {submitting ? "Flagging..." : "Flag for Investigation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
