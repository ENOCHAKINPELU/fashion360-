"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Ban, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";

// Shared by the list row actions and the profile page's own controls.
// Suspend requires typing a reason (collected here, not in the generic
// ConfirmDialog, which only ever shows static text); Reactivate needs no
// input, so it reuses ConfirmDialog directly. Both call routes that
// require confirmation server-side too (a POST with no body still needs
// the reason for suspend) and are fully audit-logged — see
// lib/admin-customers.ts.
export function AdminCustomerActions({ customerId, suspended, size = "sm" }: { customerId: string; suspended: boolean; size?: "sm" | "default" }) {
  const router = useRouter();
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [reactivateOpen, setReactivateOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submitSuspend() {
    if (!reason.trim()) {
      toast.error("A reason is required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/customers/${customerId}/suspend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not suspend this customer");
      toast.success("Customer suspended");
      setSuspendOpen(false);
      setReason("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not suspend this customer");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitReactivate() {
    const res = await fetch(`/api/admin/customers/${customerId}/reactivate`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Could not reactivate this customer");
    toast.success("Customer reactivated");
    router.refresh();
  }

  if (suspended) {
    return (
      <>
        <Button size={size} variant="outline" className="gap-1.5" onClick={() => setReactivateOpen(true)}>
          <RotateCcw className="size-3.5" /> Reactivate
        </Button>
        <ConfirmDialog
          open={reactivateOpen}
          onOpenChange={setReactivateOpen}
          title="Reactivate this customer?"
          description="They'll be able to log in and use Fashion360 again immediately."
          confirmLabel="Reactivate"
          onConfirm={submitReactivate}
        />
      </>
    );
  }

  return (
    <>
      <Button size={size} variant="outline" className="gap-1.5 text-danger hover:text-danger" onClick={() => setSuspendOpen(true)}>
        <Ban className="size-3.5" /> Suspend
      </Button>
      <Dialog
        open={suspendOpen}
        onOpenChange={(open) => {
          setSuspendOpen(open);
          if (!open) setReason("");
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Suspend this customer?</DialogTitle>
            <DialogDescription>
              They won&apos;t be able to log in or use Fashion360 until reactivated. This is recorded in the admin activity log.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="suspend-reason">Reason</Label>
            <Textarea
              id="suspend-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this account being suspended?"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={submitSuspend} disabled={submitting}>
              {submitting ? "Suspending..." : "Suspend"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
