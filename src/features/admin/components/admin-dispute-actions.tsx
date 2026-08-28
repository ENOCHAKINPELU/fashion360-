"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { UserCheck, MessageCircleQuestion, TriangleAlert, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type RequestTarget = "customer" | "designer";
type DialogKind = "requestInfo" | "escalate" | "close" | null;

// Admin Phase 9's dispute action bar. Resolve stays exactly where it was —
// DisputeResolveForm, lib/dispute.ts's resolveDispute, untouched — these
// are the four genuinely new actions the brief asks for that had no home
// before: Assign, Request Information, Escalate, Close.
export function AdminDisputeActions({ disputeId, assignedAdminId, cancellable }: { disputeId: string; assignedAdminId: string | null; cancellable: boolean }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [requestTarget, setRequestTarget] = useState<RequestTarget>("customer");
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function closeDialog() {
    setDialog(null);
    setText("");
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

  async function assignToMe() {
    const adminId = session?.user?.id;
    if (!adminId) {
      toast.error("Not signed in");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/disputes/${disputeId}/assign`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ adminId }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not assign");
      toast.success("Assigned to you");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not assign");
    } finally {
      setSubmitting(false);
    }
  }

  const alreadyAssignedToMe = !!session?.user?.id && assignedAdminId === session.user.id;

  return (
    <div className="flex flex-wrap gap-2">
      {!alreadyAssignedToMe && (
        <Button size="sm" variant="outline" className="gap-1.5" onClick={assignToMe} disabled={submitting}>
          <UserCheck className="size-3.5" /> {assignedAdminId ? "Reassign to Me" : "Assign to Me"}
        </Button>
      )}
      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { setRequestTarget("customer"); setDialog("requestInfo"); }}>
        <MessageCircleQuestion className="size-3.5" /> Request Info (Customer)
      </Button>
      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { setRequestTarget("designer"); setDialog("requestInfo"); }}>
        <MessageCircleQuestion className="size-3.5" /> Request Info (Designer)
      </Button>
      <Button size="sm" variant="outline" className="gap-1.5 text-warning hover:text-warning" onClick={() => setDialog("escalate")}>
        <TriangleAlert className="size-3.5" /> Escalate
      </Button>
      {cancellable && (
        <Button size="sm" variant="ghost" className="gap-1.5 text-muted-foreground" onClick={() => setDialog("close")}>
          <XCircle className="size-3.5" /> Close Without Resolution
        </Button>
      )}

      <Dialog open={dialog === "requestInfo"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request information from the {requestTarget}</DialogTitle>
            <DialogDescription>Posted to the dispute thread and sent as a notification. Moves this dispute to &quot;Waiting for {requestTarget === "customer" ? "Customer" : "Designer"}.&quot;</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="dispute-request-message">Message</Label>
            <Textarea id="dispute-request-message" value={text} onChange={(e) => setText(e.target.value)} placeholder="What do you need from them?" rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!text.trim()) {
                  toast.error("A message is required");
                  return;
                }
                call(`/api/admin/disputes/${disputeId}/request-info`, { target: requestTarget, message: text }, "Information requested");
              }}
              disabled={submitting}
            >
              {submitting ? "Sending..." : "Send Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "escalate"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Escalate this dispute?</DialogTitle>
            <DialogDescription>Raises priority to Urgent and notifies both sides that Fashion360 is prioritizing a decision.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="dispute-escalate-reason">Reason</Label>
            <Textarea id="dispute-escalate-reason" value={text} onChange={(e) => setText(e.target.value)} placeholder="Why does this need priority attention?" rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!text.trim()) {
                  toast.error("A reason is required");
                  return;
                }
                call(`/api/admin/disputes/${disputeId}/escalate`, { reason: text }, "Dispute escalated");
              }}
              disabled={submitting}
            >
              {submitting ? "Escalating..." : "Escalate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "close"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Close without a resolution?</DialogTitle>
            <DialogDescription>For a withdrawn or invalid dispute — no refund or payment decision is recorded. Both sides are notified. This can&apos;t be undone.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="dispute-close-reason">Reason</Label>
            <Textarea id="dispute-close-reason" value={text} onChange={(e) => setText(e.target.value)} placeholder="Why is this being closed without a resolution?" rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!text.trim()) {
                  toast.error("A reason is required");
                  return;
                }
                call(`/api/admin/disputes/${disputeId}/close`, { reason: text }, "Dispute closed");
              }}
              disabled={submitting}
            >
              {submitting ? "Closing..." : "Close Dispute"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
