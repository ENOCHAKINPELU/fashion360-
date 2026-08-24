"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Ban, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

// Admin Phase 5's two supported interventions (#14): cancel and contact.
// Same reason-dialog shape admin-designer-actions.tsx already established
// for Suspend — required text, confirm/cancel footer, disabled while
// submitting. Reassignment is intentionally absent; see lib/admin-requests.ts
// for why.
export function AdminRequestActions({ requestId, cancellable }: { requestId: string; cancellable: boolean }) {
  const router = useRouter();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState<"customer" | "designer" | null>(null);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submitCancel() {
    if (!reason.trim()) {
      toast.error("A reason is required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/requests/${requestId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not cancel this request");
      toast.success("Request cancelled");
      setCancelOpen(false);
      setReason("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not cancel this request");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitContact() {
    if (!message.trim() || !contactOpen) {
      toast.error("A message is required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/requests/${requestId}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: contactOpen, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not send this message");
      toast.success(`Message sent to the ${contactOpen}`);
      setContactOpen(null);
      setMessage("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send this message");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setContactOpen("customer")}>
        <MessageCircle className="size-3.5" /> Contact Customer
      </Button>
      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setContactOpen("designer")}>
        <MessageCircle className="size-3.5" /> Contact Designer
      </Button>
      {cancellable && (
        <Button size="sm" variant="outline" className="gap-1.5 text-danger hover:text-danger" onClick={() => setCancelOpen(true)}>
          <Ban className="size-3.5" /> Cancel Request
        </Button>
      )}

      <Dialog
        open={cancelOpen}
        onOpenChange={(open) => {
          setCancelOpen(open);
          if (!open) setReason("");
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel this request?</DialogTitle>
            <DialogDescription>Notifies both the customer and the designer, and is recorded in the admin activity log. This can&apos;t be undone.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="request-cancel-reason">Reason</Label>
            <Textarea id="request-cancel-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this request being cancelled?" rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={submitCancel} disabled={submitting}>
              {submitting ? "Cancelling..." : "Cancel Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={contactOpen !== null}
        onOpenChange={(open) => {
          if (!open) {
            setContactOpen(null);
            setMessage("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Message the {contactOpen}</DialogTitle>
            <DialogDescription>Sent as a Fashion360 notification and recorded in the admin activity log.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="request-contact-message">Message</Label>
            <Textarea id="request-contact-message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="What do you need them to know?" rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContactOpen(null)}>
              Cancel
            </Button>
            <Button onClick={submitContact} disabled={submitting}>
              {submitting ? "Sending..." : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
