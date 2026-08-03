"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const RESOLUTION_OPTIONS = [
  { value: "RELEASE_FULL_PAYMENT", label: "Reject dispute, release full payment" },
  { value: "PARTIAL_REFUND", label: "Approve partial refund" },
  { value: "FULL_REFUND", label: "Approve full refund" },
  { value: "REWORK_REQUIRED", label: "Require rework" },
  { value: "RETURN_REQUIRED", label: "Require return" },
  { value: "CANCEL_ORDER", label: "Cancel order" },
] as const;

export function DisputeResolveForm({
  disputeId,
  paymentId,
  maxRefundable,
}: {
  disputeId: string;
  paymentId: string | null;
  maxRefundable: number;
}) {
  const router = useRouter();
  const [resolutionType, setResolutionType] = useState<(typeof RESOLUTION_OPTIONS)[number]["value"]>("RELEASE_FULL_PAYMENT");
  const [notes, setNotes] = useState("");
  const [refundAmount, setRefundAmount] = useState(String(maxRefundable));
  const [submitting, setSubmitting] = useState(false);

  const needsRefund = resolutionType === "PARTIAL_REFUND" || resolutionType === "FULL_REFUND";

  async function submit() {
    if (!notes.trim()) {
      toast.error("Explain the resolution decision");
      return;
    }
    if (needsRefund && !paymentId) {
      toast.error("No payment found on this order to refund");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/disputes/${disputeId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resolutionType,
          notes,
          paymentId: needsRefund ? paymentId : undefined,
          refundAmount: needsRefund ? Number(refundAmount) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not resolve dispute");
      toast.success("Dispute resolved");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not resolve dispute");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="border-none shadow-sm">
      <CardContent className="space-y-4">
        <p className="text-sm font-medium text-foreground">Resolve Dispute</p>
        <div className="space-y-1.5">
          <Label>Decision</Label>
          <Select value={resolutionType} onValueChange={(v) => setResolutionType(v as typeof resolutionType)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RESOLUTION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {needsRefund && (
          <div className="space-y-1.5">
            <Label>Refund Amount</Label>
            <Input type="number" min={0} max={maxRefundable} value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} />
            <p className="text-xs text-muted-foreground">Up to {maxRefundable} available to refund on this payment.</p>
          </div>
        )}
        <div className="space-y-1.5">
          <Label>Notes (required, visible to the customer)</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Explain the decision" />
        </div>
        <Button onClick={submit} disabled={submitting} className="gap-1.5">
          {submitting ? "Submitting..." : "Confirm Resolution"}
        </Button>
      </CardContent>
    </Card>
  );
}
