"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Ban, MessageCircle, TriangleAlert, ShieldCheck, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type ContactTarget = "customer" | "designer" | "courier";
type DialogKind = "cancel" | "contact" | "escalate" | "resolveEscalation" | "investigate" | null;

// Admin Phase 8's action bar. "Do NOT manually change delivery milestones
// unless permitted by business rules" (the brief's own instruction) — the
// only status-mutating action here is Cancel, which reuses lib/delivery.ts's
// recordDeliveryEvent, the exact function the business's own cancel route
// already uses. Everything else (Contact, Escalate, Investigate) writes an
// audit/note entry, never a status field. Same required-reason-dialog shape
// every prior Admin phase established: required text, confirm/cancel
// footer, disabled while submitting.
export function AdminDeliveryActions({ deliveryId, cancellable, escalated, hasCourier }: { deliveryId: string; cancellable: boolean; escalated: boolean; hasCourier: boolean }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [contactTarget, setContactTarget] = useState<ContactTarget>("customer");
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function closeDialog() {
    setDialog(null);
    setText("");
  }

  async function call(url: string, body: Record<string, unknown>, successMessage: string) {
    if (!text.trim()) {
      toast.error("This field is required");
      return;
    }
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

  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { setContactTarget("customer"); setDialog("contact"); }}>
        <MessageCircle className="size-3.5" /> Contact Customer
      </Button>
      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { setContactTarget("designer"); setDialog("contact"); }}>
        <MessageCircle className="size-3.5" /> Contact Designer
      </Button>
      <Button size="sm" variant="outline" className="gap-1.5" disabled={!hasCourier} onClick={() => { setContactTarget("courier"); setDialog("contact"); }}>
        <MessageCircle className="size-3.5" /> Contact Courier
      </Button>
      {escalated ? (
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setDialog("resolveEscalation")}>
          <ShieldCheck className="size-3.5" /> Resolve Escalation
        </Button>
      ) : (
        <Button size="sm" variant="outline" className="gap-1.5 text-warning hover:text-warning" onClick={() => setDialog("escalate")}>
          <TriangleAlert className="size-3.5" /> Escalate Issue
        </Button>
      )}
      <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => setDialog("investigate")}>
        <Search className="size-3.5" /> Investigate
      </Button>
      {cancellable && (
        <Button size="sm" variant="outline" className="gap-1.5 text-danger hover:text-danger" onClick={() => setDialog("cancel")}>
          <Ban className="size-3.5" /> Cancel Delivery
        </Button>
      )}

      <Dialog open={dialog === "cancel"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel this delivery?</DialogTitle>
            <DialogDescription>
              Attempts to cancel the shipment with the logistics provider (if one is connected), notifies both the customer and the designer, and is recorded in the admin activity log. This
              can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="delivery-cancel-reason">Reason</Label>
            <Textarea id="delivery-cancel-reason" value={text} onChange={(e) => setText(e.target.value)} placeholder="Why is this delivery being cancelled?" rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => call(`/api/admin/deliveries/${deliveryId}/cancel`, { reason: text }, "Delivery cancelled")} disabled={submitting}>
              {submitting ? "Cancelling..." : "Cancel Delivery"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "contact"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Message the {contactTarget}</DialogTitle>
            <DialogDescription>
              {contactTarget === "courier"
                ? "No courier has a Fashion360 account to notify in-app — this records that you contacted them directly (by the phone number on file) in the admin activity log."
                : "Sent as a Fashion360 notification and recorded in the admin activity log."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="delivery-contact-message">Message</Label>
            <Textarea id="delivery-contact-message" value={text} onChange={(e) => setText(e.target.value)} placeholder="What do you need them to know?" rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={() => call(`/api/admin/deliveries/${deliveryId}/contact`, { target: contactTarget, message: text }, "Message recorded")} disabled={submitting}>
              {submitting ? "Sending..." : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "escalate"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Escalate this delivery?</DialogTitle>
            <DialogDescription>Notifies the designer and the customer that Fashion360 is following up, and flags this delivery until you resolve the escalation.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="delivery-escalate-reason">Reason</Label>
            <Textarea id="delivery-escalate-reason" value={text} onChange={(e) => setText(e.target.value)} placeholder="What's going wrong with this delivery?" rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={() => call(`/api/admin/deliveries/${deliveryId}/escalate`, { reason: text }, "Delivery escalated")} disabled={submitting}>
              {submitting ? "Escalating..." : "Escalate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "resolveEscalation"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Resolve this escalation?</DialogTitle>
            <DialogDescription>Clears the escalation flag on this delivery.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="delivery-resolve-reason">Reason</Label>
            <Textarea id="delivery-resolve-reason" value={text} onChange={(e) => setText(e.target.value)} placeholder="How was this resolved?" rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={() => call(`/api/admin/deliveries/${deliveryId}/resolve-escalation`, { reason: text }, "Escalation resolved")} disabled={submitting}>
              {submitting ? "Resolving..." : "Resolve"}
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
            <Label htmlFor="delivery-investigate-note">Note</Label>
            <Textarea id="delivery-investigate-note" value={text} onChange={(e) => setText(e.target.value)} placeholder="What are you looking into?" rows={4} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={() => call(`/api/admin/deliveries/${deliveryId}/investigate`, { note: text }, "Note added")} disabled={submitting}>
              {submitting ? "Saving..." : "Add Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
