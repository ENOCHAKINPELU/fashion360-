"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function CancelOrderDialog({
  open,
  onOpenChange,
  orderId,
  orderCode,
  onCancelled,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderCode: string;
  onCancelled?: () => void;
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!reason.trim()) {
      toast.error("A cancellation reason is required");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not cancel order");
      if (data.refund?.refundAmount > 0) {
        toast.success(`${orderCode} cancelled, a refund of ${data.refund.refundAmount} (${data.refund.refundPercent}% of what was paid) has been initiated.`);
      } else {
        toast.success(`${orderCode} cancelled`);
      }
      onOpenChange(false);
      setReason("");
      onCancelled?.();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not cancel order");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel {orderCode}?</DialogTitle>
          <DialogDescription>This stops production and marks the order cancelled. A reason is required.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Cancellation reason</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Why is this order being cancelled?" />
          </div>
          <p className="text-xs text-muted-foreground">
            Any refund is calculated automatically from the platform&apos;s cancellation policy based on how far this order has progressed, it isn&apos;t a manual choice.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Keep Order
          </Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={loading}>
            {loading ? "Cancelling..." : "Cancel Order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
