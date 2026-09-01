"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Truck, ExternalLink, ShieldCheck, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MultiImageUpload } from "@/shared/components/multi-image-upload";
import { MultiVideoUpload } from "@/shared/components/multi-video-upload";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import type { DeliveryData } from "@/features/orders/types";

const STATUS_LABELS: Record<string, string> = {
  CREATED: "Created",
  COURIER_ASSIGNED: "Courier Assigned",
  PICKUP_SCHEDULED: "Pickup Scheduled",
  PICKED_UP: "Picked Up",
  IN_TRANSIT: "In Transit",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
  RETURNED: "Returned",
};

const ISSUE_TYPES = [
  { value: "PACKAGE_MISSING", label: "Package Missing" },
  { value: "WRONG_ITEM", label: "Wrong Item" },
  { value: "DAMAGED", label: "Damaged" },
  { value: "MISSING_ITEMS", label: "Incomplete" },
  { value: "NEVER_DELIVERED", label: "Never Delivered" },
  { value: "POOR_QUALITY", label: "Poor Quality" },
  { value: "NOT_AS_DESCRIBED", label: "Not As Described" },
  { value: "SIZE_MISMATCH", label: "Size Mismatch" },
  { value: "LATE_DELIVERY", label: "Late Delivery" },
  { value: "OTHER", label: "Other" },
];

export function CustomerDeliveryTracker({
  orderId,
  delivery,
  hasDispute,
  onChanged,
}: {
  orderId: string;
  delivery: DeliveryData;
  hasDispute: boolean;
  onChanged: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const canRespond = delivery.status === "DELIVERED" && !delivery.customerConfirmedAt && !delivery.reportedProblemAt && !hasDispute;

  async function confirmReceipt() {
    setConfirming(true);
    try {
      const res = await fetch(`/api/customer/orders/${orderId}/confirm-delivery`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not confirm receipt");
      toast.success("Receipt confirmed, thank you!");
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not confirm receipt");
    } finally {
      setConfirming(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Truck className="size-4" /> Delivery
          </span>
          <Badge variant="outline">{STATUS_LABELS[delivery.status] ?? delivery.status}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          {delivery.trackingNumber && (
            <div className="flex justify-between sm:block">
              <span className="text-muted-foreground">Tracking Number</span>
              <span className="font-medium text-foreground sm:block">{delivery.trackingNumber}</span>
            </div>
          )}
          {delivery.courierName && (
            <div className="flex justify-between sm:block">
              <span className="text-muted-foreground">Courier</span>
              <span className="font-medium text-foreground sm:block">{delivery.courierName}</span>
            </div>
          )}
          {delivery.estimatedDeliveryDate && (
            <div className="flex justify-between sm:block">
              <span className="text-muted-foreground">Estimated Delivery</span>
              <span className="font-medium text-foreground sm:block">{formatDate(delivery.estimatedDeliveryDate)}</span>
            </div>
          )}
          {delivery.deliveredAt && (
            <div className="flex justify-between sm:block">
              <span className="text-muted-foreground">Delivered</span>
              <span className="font-medium text-foreground sm:block">{formatDate(delivery.deliveredAt)}</span>
            </div>
          )}
        </div>

        {delivery.trackingUrl ? (
          <Button asChild size="sm" variant="outline" className="gap-1.5">
            <a href={delivery.trackingUrl} target="_blank" rel="noreferrer">
              Track on {delivery.courierName ?? "Courier"} Website <ExternalLink className="size-3.5" />
            </a>
          </Button>
        ) : (
          delivery.trackingNumber && <p className="text-xs text-muted-foreground">No online tracking page for {delivery.courierName ?? "this courier"} — use the tracking number above directly with them.</p>
        )}

        {(delivery.packagePhotoUrl || delivery.waybillUrl) && (
          <div className="flex flex-wrap gap-2 border-t border-border pt-3">
            {delivery.packagePhotoUrl && (
              <a href={delivery.packagePhotoUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
                View Package Photo
              </a>
            )}
            {delivery.waybillUrl && (
              <a href={delivery.waybillUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
                View Shipping Receipt
              </a>
            )}
          </div>
        )}

        {delivery.events.length > 0 && (
          <ul className="space-y-2 border-t border-border pt-3">
            {delivery.events.map((e) => (
              <li key={e.id} className="flex items-start justify-between gap-3 text-sm">
                <div>
                  <p className="font-medium text-foreground">{STATUS_LABELS[e.status] ?? e.status}</p>
                  {e.description && <p className="text-xs text-muted-foreground">{e.description}</p>}
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{formatRelativeTime(e.occurredAt)}</span>
              </li>
            ))}
          </ul>
        )}

        {delivery.customerConfirmedAt && (
          <div className="flex items-center gap-2 rounded-xl border border-success/20 bg-success-soft p-3 text-sm text-success">
            <ShieldCheck className="size-4 shrink-0" /> You confirmed receipt on {formatDate(delivery.customerConfirmedAt)}.
          </div>
        )}
        {delivery.reportedProblemAt && !delivery.customerConfirmedAt && (
          <div className="flex items-center gap-2 rounded-xl border border-danger/20 bg-danger-soft p-3 text-sm text-danger">
            <AlertTriangle className="size-4 shrink-0" /> You reported a problem with this delivery. We&apos;re reviewing it.
          </div>
        )}

        {canRespond && (
          <div className="flex flex-wrap gap-2 border-t border-border pt-3">
            <Button size="sm" onClick={confirmReceipt} disabled={confirming} className="gap-1.5">
              <ShieldCheck className="size-4" /> {confirming ? "Confirming..." : "Confirm Receipt"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setReportOpen(true)} className="gap-1.5">
              <AlertTriangle className="size-4" /> Report a Problem
            </Button>
          </div>
        )}
      </CardContent>

      <ReportProblemDialog open={reportOpen} onOpenChange={setReportOpen} orderId={orderId} onDone={onChanged} />
    </Card>
  );
}

function ReportProblemDialog({
  open,
  onOpenChange,
  orderId,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  onDone: () => void;
}) {
  const [issueType, setIssueType] = useState("OTHER");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/customer/orders/${orderId}/report-problem`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueType, description: description.trim(), photos, videos }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not report problem");
      toast.success("Problem reported, the business has been notified.");
      setDescription("");
      setPhotos([]);
      setVideos([]);
      onOpenChange(false);
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not report problem");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (submitting ? null : onOpenChange(v))}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report a problem</DialogTitle>
          <DialogDescription>This will block payout to the business while it&apos;s reviewed.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Issue Type</Label>
            <Select value={issueType} onValueChange={setIssueType}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ISSUE_TYPES.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe what went wrong..." />
          </div>
          <div className="space-y-1.5">
            <Label>Photos</Label>
            <MultiImageUpload value={photos} onChange={setPhotos} folder="dispute-evidence" label="Add photos" />
          </div>
          <div className="space-y-1.5">
            <Label>Videos (optional)</Label>
            <MultiVideoUpload value={videos} onChange={setVideos} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting || !description.trim()}>
            {submitting ? "Submitting..." : "Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
