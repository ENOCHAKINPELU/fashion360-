"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, PauseCircle, PlayCircle, XCircle, RotateCcw, Undo2, Ban, Flag, FlagOff, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PayoutStatus = "NOT_ELIGIBLE" | "PENDING" | "ELIGIBLE" | "ON_HOLD" | "PROCESSING" | "PAID" | "FAILED" | "REVERSED";

type DialogKind = "approvePayout" | "holdPayout" | "releaseHold" | "rejectPayout" | "retryPayout" | "refund" | "rejectRefund" | "flagFraud" | "clearFraud" | "investigate" | null;

// Admin Phase 7's action bar — every button here maps to exactly one
// lib/admin-payments.ts function, which itself wraps an existing
// lib/payout.ts / lib/refund-processing.ts function rather than moving
// money on its own. Same required-reason-dialog shape Phase 5/6/7 already
// established (admin-request-actions.tsx, admin-delivery-actions.tsx):
// required text, confirm/cancel footer, disabled while submitting.
// "Admin cannot edit payment amounts" (the brief's own rule) is why there's
// no amount field anywhere here except the refund dialog, which is
// necessarily bounded to the refundable remainder server-side.
export function AdminPaymentActions({
  paymentId,
  payoutId,
  payoutStatus,
  isFlagged,
  refundableAmount,
  currency,
}: {
  paymentId: string;
  payoutId: string | null;
  payoutStatus: PayoutStatus | null;
  isFlagged: boolean;
  refundableAmount: number;
  currency: string;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [reason, setReason] = useState("");
  const [refundAmount, setRefundAmount] = useState(String(refundableAmount));
  const [submitting, setSubmitting] = useState(false);

  function closeDialog() {
    setDialog(null);
    setReason("");
    setRefundAmount(String(refundableAmount));
  }

  async function call(url: string, body: Record<string, unknown>, successMessage: string) {
    setSubmitting(true);
    try {
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

  function submitReasonAction(url: string, successMessage: string) {
    if (!reason.trim()) {
      toast.error("A reason is required");
      return;
    }
    call(url, { reason }, successMessage);
  }

  function submitRefund() {
    const amount = Number(refundAmount);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!reason.trim()) {
      toast.error("A reason is required");
      return;
    }
    call(`/api/admin/payments/${paymentId}/refund`, { amount, type: amount >= refundableAmount ? "FULL" : "PARTIAL", reason }, "Refund processed");
  }

  function submitInvestigate() {
    if (!reason.trim()) {
      toast.error("A note is required");
      return;
    }
    call(`/api/admin/payments/${paymentId}/investigate`, { note: reason }, "Investigation note added");
  }

  return (
    <div className="flex flex-wrap gap-2">
      {payoutId && payoutStatus === "ELIGIBLE" && (
        <>
          <Button size="sm" className="gap-1.5" onClick={() => setDialog("approvePayout")}>
            <CheckCircle2 className="size-3.5" /> Approve Payout
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setDialog("holdPayout")}>
            <PauseCircle className="size-3.5" /> Hold Payout
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-danger hover:text-danger" onClick={() => setDialog("rejectPayout")}>
            <XCircle className="size-3.5" /> Reject Payout
          </Button>
        </>
      )}
      {payoutId && payoutStatus === "ON_HOLD" && (
        <>
          <Button size="sm" className="gap-1.5" onClick={() => setDialog("releaseHold")}>
            <PlayCircle className="size-3.5" /> Release Hold
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-danger hover:text-danger" onClick={() => setDialog("rejectPayout")}>
            <XCircle className="size-3.5" /> Reject Payout
          </Button>
        </>
      )}
      {payoutId && payoutStatus === "FAILED" && (
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setDialog("retryPayout")}>
          <RotateCcw className="size-3.5" /> Retry Payout
        </Button>
      )}
      {refundableAmount > 0 && (
        <>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setDialog("refund")}>
            <Undo2 className="size-3.5" /> Process Refund
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setDialog("rejectRefund")}>
            <Ban className="size-3.5" /> Decline Refund
          </Button>
        </>
      )}
      {isFlagged ? (
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setDialog("clearFraud")}>
          <FlagOff className="size-3.5" /> Clear Fraud Flag
        </Button>
      ) : (
        <Button size="sm" variant="outline" className="gap-1.5 text-danger hover:text-danger" onClick={() => setDialog("flagFraud")}>
          <Flag className="size-3.5" /> Flag for Fraud
        </Button>
      )}
      <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => setDialog("investigate")}>
        <Search className="size-3.5" /> Investigate
      </Button>

      {/* Simple reason-only dialogs */}
      <Dialog open={dialog === "approvePayout"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Approve this payout?</DialogTitle>
            <DialogDescription>Fires a real Flutterwave transfer if the business has a verified payout account, otherwise marks it paid manually. Recorded in the admin audit log.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="approve-reason">Reason</Label>
            <Textarea id="approve-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this payout being approved now?" rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={() => submitReasonAction(`/api/admin/payouts/${payoutId}/approve`, "Payout approved")} disabled={submitting}>
              {submitting ? "Approving..." : "Approve Payout"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "holdPayout"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hold this payout?</DialogTitle>
            <DialogDescription>Pauses release without failing it — the business is notified and can be released again once you&apos;re done reviewing.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="hold-reason">Reason</Label>
            <Textarea id="hold-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this payout being held?" rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={() => submitReasonAction(`/api/admin/payouts/${payoutId}/hold`, "Payout on hold")} disabled={submitting}>
              {submitting ? "Holding..." : "Hold Payout"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "releaseHold"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Release this hold?</DialogTitle>
            <DialogDescription>Returns the payout to Eligible — it can then be approved and paid out.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="release-reason">Reason</Label>
            <Textarea id="release-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is the hold being released?" rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={() => submitReasonAction(`/api/admin/payouts/${payoutId}/release-hold`, "Hold released")} disabled={submitting}>
              {submitting ? "Releasing..." : "Release Hold"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "rejectPayout"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject this payout?</DialogTitle>
            <DialogDescription>Marks the payout Failed with your reason attached. The business is notified. This can&apos;t be undone from here.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-payout-reason">Reason</Label>
            <Textarea id="reject-payout-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this payout being rejected?" rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => submitReasonAction(`/api/admin/payouts/${payoutId}/reject`, "Payout rejected")} disabled={submitting}>
              {submitting ? "Rejecting..." : "Reject Payout"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "retryPayout"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Retry this payout?</DialogTitle>
            <DialogDescription>Moves it back to Processing so its transfer status can be checked or re-attempted from /admin/payouts.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="retry-reason">Reason</Label>
            <Textarea id="retry-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this payout being retried?" rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={() => submitReasonAction(`/api/admin/payouts/${payoutId}/retry`, "Payout retried")} disabled={submitting}>
              {submitting ? "Retrying..." : "Retry Payout"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "rejectRefund"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Decline a refund for this payment?</DialogTitle>
            <DialogDescription>Records your decision in the admin audit log. No money moves and nothing about this payment changes.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-refund-reason">Reason</Label>
            <Textarea id="reject-refund-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why isn't a refund being issued?" rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => submitReasonAction(`/api/admin/payments/${paymentId}/reject-refund`, "Decision recorded")} disabled={submitting}>
              {submitting ? "Recording..." : "Decline Refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "flagFraud"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Flag this payment for fraud review?</DialogTitle>
            <DialogDescription>Marks it for manual review across every payment list. Doesn&apos;t block or change the payment itself.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="flag-reason">Reason</Label>
            <Textarea id="flag-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="What's suspicious about this payment?" rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => submitReasonAction(`/api/admin/payments/${paymentId}/flag-fraud`, "Payment flagged")} disabled={submitting}>
              {submitting ? "Flagging..." : "Flag for Fraud"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "clearFraud"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Clear the fraud flag?</DialogTitle>
            <DialogDescription>Removes this payment from the fraud review list.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="clear-reason">Reason</Label>
            <Textarea id="clear-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this no longer a concern?" rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={() => submitReasonAction(`/api/admin/payments/${paymentId}/clear-fraud-flag`, "Fraud flag cleared")} disabled={submitting}>
              {submitting ? "Clearing..." : "Clear Flag"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "investigate"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add an investigation note</DialogTitle>
            <DialogDescription>Internal only — never visible to the customer or the business. Saved as an admin note on the order.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="investigate-note">Note</Label>
            <Textarea id="investigate-note" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="What are you looking into?" rows={4} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={submitInvestigate} disabled={submitting}>
              {submitting ? "Saving..." : "Add Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund dialog — the one place an amount is entered, bounded to the
          refundable remainder and validated again server-side. */}
      <Dialog open={dialog === "refund"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Process a refund</DialogTitle>
            <DialogDescription>Refunds through Fashion360&apos;s platform Flutterwave balance — the same path dispute resolution uses. Up to {refundableAmount} {currency} available.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="refund-amount">Amount (max {refundableAmount} {currency})</Label>
              <Input id="refund-amount" type="number" min={0.01} max={refundableAmount} step="0.01" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="refund-reason">Reason</Label>
              <Textarea id="refund-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this refund being issued?" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={submitRefund} disabled={submitting}>
              {submitting ? "Processing..." : "Process Refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
