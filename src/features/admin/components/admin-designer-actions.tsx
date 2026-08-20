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

// Same shape as admin-customer-actions.tsx — see that file's comment for
// why Suspend needs its own dialog (a reason to collect) while Reactivate
// reuses the generic ConfirmDialog.
export function AdminDesignerActions({ businessId, suspended, size = "sm" }: { businessId: string; suspended: boolean; size?: "sm" | "default" }) {
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
      const res = await fetch(`/api/admin/designers/${businessId}/suspend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not suspend this designer");
      toast.success("Designer suspended");
      setSuspendOpen(false);
      setReason("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not suspend this designer");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitReactivate() {
    const res = await fetch(`/api/admin/designers/${businessId}/reactivate`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Could not reactivate this designer");
    toast.success("Designer reactivated");
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
          title="Reactivate this designer?"
          description="Their business becomes discoverable again and the team can log back in immediately, restored to its verification status from before the suspension."
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
            <DialogTitle>Suspend this designer?</DialogTitle>
            <DialogDescription>
              Hides their business from customer discovery and blocks their whole team from logging in until reactivated. Recorded in the admin activity log.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="designer-suspend-reason">Reason</Label>
            <Textarea
              id="designer-suspend-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this designer being suspended?"
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
