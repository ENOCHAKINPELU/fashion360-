"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/shared/components/empty-state";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import type { DisputeData } from "@/features/orders/types";

interface DisputeDetail extends DisputeData {
  evidence: { id: string; photos: string[]; videos: string[]; description: string | null; submittedByType: string; createdAt: string }[];
  responses: { id: string; authorType: string; body: string; createdAt: string }[];
  resolution: { resolutionType: string; notes: string; resolvedAt: string; resolvedBy: { name: string | null } | null } | null;
}

const RESOLUTION_OPTIONS = [
  { value: "RELEASE_FULL_PAYMENT", label: "Release Full Payment to Business" },
  { value: "PARTIAL_REFUND", label: "Partial Refund to Customer" },
  { value: "FULL_REFUND", label: "Full Refund to Customer" },
  { value: "REWORK_REQUIRED", label: "Rework Required" },
  { value: "RETURN_REQUIRED", label: "Return Required" },
  { value: "CANCEL_ORDER", label: "Cancel Order" },
];

export function OrderDisputeTab({ orderId, hasDispute }: { orderId: string; hasDispute: boolean }) {
  const router = useRouter();
  const [dispute, setDispute] = useState<DisputeDetail | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [respondBody, setRespondBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);
  const hasLoadedRef = useRef(false);

  async function load() {
    try {
      const res = await fetch(`/api/orders/${orderId}/dispute`);
      const data = await res.json();
      setDispute(data.dispute);
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    if (!hasDispute || hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasDispute, orderId]);

  if (!hasDispute) {
    return <EmptyState icon={ShieldAlert} title="No disputes" description="No problems have been reported for this order." className="border-none py-12" />;
  }

  if (!loaded) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  if (!dispute) {
    return <EmptyState icon={ShieldAlert} title="No disputes" description="No problems have been reported for this order." className="border-none py-12" />;
  }

  async function respond() {
    if (!respondBody.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/disputes/${dispute!.id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: respondBody.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not send response");
      toast.success("Response sent");
      setRespondBody("");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send response");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="border-none border-danger/20 bg-danger-soft shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-sm">
            <span>
              {dispute.issueType.replace(/_/g, " ")} · <Badge variant="outline">{dispute.status}</Badge>
            </span>
            {!dispute.resolution && (
              <Button size="sm" onClick={() => setResolveOpen(true)}>
                Resolve Dispute
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-foreground">{dispute.description}</p>
          {dispute.evidence.map((e) => (
            <div key={e.id} className="flex flex-wrap gap-2">
              {e.photos.map((p, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={p} alt="" className="size-16 rounded-lg border border-border object-cover" />
              ))}
              {e.videos.map((v, i) => (
                <a key={i} href={v} target="_blank" rel="noreferrer" className="rounded-lg border border-border bg-surface px-2 py-1 text-xs">
                  Video {i + 1}
                </a>
              ))}
            </div>
          ))}
        </CardContent>
      </Card>

      {dispute.resolution && (
        <Card className="border-none border-success/20 bg-success-soft shadow-sm">
          <CardContent>
            <p className="text-sm font-medium text-success">Resolved: {dispute.resolution.resolutionType.replace(/_/g, " ")}</p>
            <p className="mt-1 text-sm text-success/90">{dispute.resolution.notes}</p>
            <p className="mt-1 text-xs text-success/70">
              {formatDate(dispute.resolution.resolvedAt)}
              {dispute.resolution.resolvedBy?.name ? ` · by ${dispute.resolution.resolvedBy.name}` : ""}
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm">Discussion</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {dispute.responses.length === 0 && <p className="text-sm text-muted-foreground">No responses yet.</p>}
          {dispute.responses.map((r) => (
            <div key={r.id} className="rounded-xl border border-border p-3 text-sm">
              <p className="mb-1 text-xs text-muted-foreground">
                {r.authorType === "STAFF" ? "You" : "Customer"} · {formatRelativeTime(r.createdAt)}
              </p>
              <p className="text-foreground">{r.body}</p>
            </div>
          ))}
          {!dispute.resolution && (
            <div className="flex gap-2">
              <Textarea rows={2} value={respondBody} onChange={(e) => setRespondBody(e.target.value)} placeholder="Reply to the customer..." />
            </div>
          )}
          {!dispute.resolution && (
            <Button size="sm" onClick={respond} disabled={submitting || !respondBody.trim()}>
              {submitting ? "Sending..." : "Send Response"}
            </Button>
          )}
        </CardContent>
      </Card>

      <ResolveDisputeDialog
        open={resolveOpen}
        onOpenChange={setResolveOpen}
        disputeId={dispute.id}
        onDone={() => {
          load();
          router.refresh();
        }}
      />
    </div>
  );
}

function ResolveDisputeDialog({
  open,
  onOpenChange,
  disputeId,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disputeId: string;
  onDone: () => void;
}) {
  const [resolutionType, setResolutionType] = useState("RELEASE_FULL_PAYMENT");
  const [notes, setNotes] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const needsRefundDetails = resolutionType === "PARTIAL_REFUND" || resolutionType === "FULL_REFUND";

  async function submit() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/disputes/${disputeId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resolutionType,
          notes,
          refundAmount: needsRefundDetails ? refundAmount : undefined,
          paymentId: needsRefundDetails ? paymentId : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not resolve dispute");
      toast.success("Dispute resolved");
      onOpenChange(false);
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not resolve dispute");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (submitting ? null : onOpenChange(v))}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Resolve dispute</DialogTitle>
          <DialogDescription>This decision is final and recorded.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Outcome</Label>
            <Select value={resolutionType} onValueChange={setResolutionType}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESOLUTION_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {needsRefundDetails && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Payment ID</Label>
                <Input value={paymentId} onChange={(e) => setPaymentId(e.target.value)} placeholder="From Financials tab" />
              </div>
              <div className="space-y-1.5">
                <Label>Refund Amount</Label>
                <Input type="number" min={0} step="0.01" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} />
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Explain the decision, this is shared with the customer." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting || !notes.trim()}>
            {submitting ? "Resolving..." : "Resolve"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
