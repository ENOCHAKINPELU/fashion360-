"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShieldCheck, ShieldAlert, Truck, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MultiImageUpload } from "@/shared/components/multi-image-upload";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { DEFAULT_QC_ITEMS } from "@/lib/quality-control-items";
import type { QualityControlChecklistData, DeliveryData } from "@/features/orders/types";

const QC_RESULT_STYLES: Record<string, string> = {
  PENDING: "bg-muted text-muted-foreground",
  PASSED: "bg-success-soft text-success",
  FAILED: "bg-danger-soft text-danger",
};

const DELIVERY_STATUS_OPTIONS = ["COURIER_ASSIGNED", "PICKUP_SCHEDULED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "FAILED", "CANCELLED", "RETURNED"];

export function OrderQualityDeliveryTab({
  orderId,
  orderStatus,
  checklists,
  delivery,
}: {
  orderId: string;
  orderStatus: string;
  checklists: QualityControlChecklistData[];
  delivery: DeliveryData | null;
}) {
  const [qcOpen, setQcOpen] = useState(false);
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const latest = checklists[0] ?? null;
  const canCreateDelivery = latest?.result === "PASSED" && !delivery;

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-sm">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm">Quality Control</CardTitle>
          {orderStatus !== "QUALITY_CHECK_FAILED" ? (
            <Button size="sm" className="gap-1.5" onClick={() => setQcOpen(true)}>
              <ShieldCheck className="size-3.5" /> Run Quality Check
            </Button>
          ) : (
            <ResumeProductionButton orderId={orderId} />
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {checklists.length === 0 ? (
            <p className="text-sm text-muted-foreground">No quality check has been recorded yet.</p>
          ) : (
            checklists.map((c) => (
              <div key={c.id} className="rounded-xl border border-border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-foreground">Attempt {c.attemptNumber}</p>
                  <Badge className={QC_RESULT_STYLES[c.result]}>{c.result}</Badge>
                </div>
                <ul className="mt-2 space-y-1">
                  {c.items.map((item) => (
                    <li key={item.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                      {item.passed ? <ShieldCheck className="size-3 text-success" /> : <ShieldAlert className="size-3 text-danger" />}
                      {item.label}
                    </li>
                  ))}
                </ul>
                {c.failure && (
                  <div className="mt-2 rounded-lg bg-danger-soft p-2 text-xs text-danger">
                    <p>
                      <span className="font-medium">Issue: </span>
                      {c.failure.issue}
                    </p>
                    <p>
                      <span className="font-medium">Correction required: </span>
                      {c.failure.correctionRequired}
                    </p>
                    {c.failure.expectedCorrectionDate && <p>Expected by {formatDate(c.failure.expectedCorrectionDate)}</p>}
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm">Delivery</CardTitle>
          {canCreateDelivery && (
            <Button size="sm" className="gap-1.5" onClick={() => setDeliveryOpen(true)}>
              <Truck className="size-3.5" /> Create Delivery
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {!delivery ? (
            <p className="text-sm text-muted-foreground">
              {latest?.result === "PASSED" ? "No delivery created yet." : "Quality control must pass before a delivery can be created."}
            </p>
          ) : (
            <DeliveryDetail delivery={delivery} />
          )}
        </CardContent>
      </Card>

      <QualityCheckDialog open={qcOpen} onOpenChange={setQcOpen} orderId={orderId} />
      <CreateDeliveryDialog open={deliveryOpen} onOpenChange={setDeliveryOpen} orderId={orderId} />
    </div>
  );
}

function ResumeProductionButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function resume() {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/resume-production`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not resume production");
      toast.success("Order returned to production");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not resume production");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button size="sm" variant="outline" className="gap-1.5" onClick={resume} disabled={loading}>
      <RotateCcw className="size-3.5" /> {loading ? "Resuming..." : "Resume Production After Correction"}
    </Button>
  );
}

function DeliveryDetail({ delivery }: { delivery: DeliveryData }) {
  const router = useRouter();
  const [eventOpen, setEventOpen] = useState(false);

  return (
    <div className="space-y-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{delivery.status.replace(/_/g, " ")}</Badge>
        <span className="text-muted-foreground">{delivery.provider}</span>
        {delivery.trackingNumber && <span className="text-muted-foreground">· {delivery.trackingNumber}</span>}
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        <div>
          <dt className="text-muted-foreground">Pickup</dt>
          <dd className="text-foreground">{delivery.pickupAddress}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Delivery Address</dt>
          <dd className="text-foreground">{delivery.deliveryAddress}</dd>
        </div>
        {delivery.customerConfirmedAt && (
          <div>
            <dt className="text-muted-foreground">Customer Confirmed</dt>
            <dd className="text-foreground">{formatDate(delivery.customerConfirmedAt)}</dd>
          </div>
        )}
        {delivery.confirmationDeadline && !delivery.customerConfirmedAt && (
          <div>
            <dt className="text-muted-foreground">Dispute Window Ends</dt>
            <dd className="text-foreground">{formatDate(delivery.confirmationDeadline)}</dd>
          </div>
        )}
      </dl>

      {!["DELIVERED", "CANCELLED", "RETURNED"].includes(delivery.status) && (
        <Button size="sm" variant="outline" onClick={() => setEventOpen(true)}>
          Update Delivery Status
        </Button>
      )}

      {delivery.events.length > 0 && (
        <ul className="space-y-1.5 border-t border-border pt-2">
          {delivery.events.map((e) => (
            <li key={e.id} className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{e.status.replace(/_/g, " ")}</span> · {formatRelativeTime(e.occurredAt)}
              {e.description ? ` (${e.description})` : ""}
            </li>
          ))}
        </ul>
      )}

      <DeliveryEventDialog
        open={eventOpen}
        onOpenChange={setEventOpen}
        deliveryId={delivery.id}
        onDone={() => router.refresh()}
      />
    </div>
  );
}

function DeliveryEventDialog({ open, onOpenChange, deliveryId, onDone }: { open: boolean; onOpenChange: (open: boolean) => void; deliveryId: string; onDone: () => void }) {
  const [status, setStatus] = useState<string>("COURIER_ASSIGNED");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/deliveries/${deliveryId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, description: description || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not update delivery");
      toast.success("Delivery updated");
      onOpenChange(false);
      setDescription("");
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update delivery");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (submitting ? null : onOpenChange(v))}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Update delivery status</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DELIVERY_STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Note (optional)</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "Saving..." : "Update"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function QualityCheckDialog({ open, onOpenChange, orderId }: { open: boolean; onOpenChange: (open: boolean) => void; orderId: string }) {
  const router = useRouter();
  const [items, setItems] = useState(DEFAULT_QC_ITEMS.map((label) => ({ label, passed: true })));
  const [confirmed, setConfirmed] = useState(false);
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [issue, setIssue] = useState("");
  const [correctionRequired, setCorrectionRequired] = useState("");
  const [expectedCorrectionDate, setExpectedCorrectionDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const allPassed = items.every((i) => i.passed);

  function reset() {
    setItems(DEFAULT_QC_ITEMS.map((label) => ({ label, passed: true })));
    setConfirmed(false);
    setNotes("");
    setPhotos([]);
    setIssue("");
    setCorrectionRequired("");
    setExpectedCorrectionDate("");
  }

  async function submit() {
    if (allPassed && !confirmed) {
      toast.error('Check "I confirm this order has passed quality control" to submit a pass');
      return;
    }
    if (!allPassed && (!issue.trim() || !correctionRequired.trim())) {
      toast.error("Describe the issue and the correction required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/quality-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          confirmed: allPassed && confirmed,
          notes: notes || undefined,
          photos,
          failure: !allPassed ? { issue, correctionRequired, expectedCorrectionDate: expectedCorrectionDate || undefined } : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not submit quality check");
      toast.success(allPassed ? "Quality check passed" : "Quality check recorded as failed");
      onOpenChange(false);
      reset();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit quality check");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (submitting ? null : onOpenChange(v))}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Quality Control Checklist</DialogTitle>
          <DialogDescription>Check every item that passes inspection.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            {items.map((item, index) => (
              <label key={item.label} className="flex items-center gap-2.5 rounded-xl border border-border p-2.5 text-sm">
                <Checkbox
                  checked={item.passed}
                  onCheckedChange={(checked) =>
                    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, passed: checked === true } : it)))
                  }
                />
                {item.label}
              </label>
            ))}
          </div>

          {allPassed ? (
            <label className="flex items-start gap-2.5 rounded-xl border border-success/30 bg-success-soft p-3 text-sm">
              <Checkbox checked={confirmed} onCheckedChange={(c) => setConfirmed(c === true)} className="mt-0.5" />
              <span>I confirm this order has passed quality control.</span>
            </label>
          ) : (
            <div className="space-y-3 rounded-xl border border-danger/30 bg-danger-soft p-3">
              <div className="space-y-1.5">
                <Label>Issue</Label>
                <Textarea rows={2} value={issue} onChange={(e) => setIssue(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Correction Required</Label>
                <Textarea rows={2} value={correctionRequired} onChange={(e) => setCorrectionRequired(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Expected Correction Date</Label>
                <Input type="date" value={expectedCorrectionDate} onChange={(e) => setExpectedCorrectionDate(e.target.value)} />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Photos (optional)</Label>
            <MultiImageUpload value={photos} onChange={setPhotos} folder="production-photos" label="Add photo" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Quality Check"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateDeliveryDialog({ open, onOpenChange, orderId }: { open: boolean; onOpenChange: (open: boolean) => void; orderId: string }) {
  const router = useRouter();
  const [provider, setProvider] = useState<"MOCK" | "MANUAL">("MANUAL");
  const [pickupAddress, setPickupAddress] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [customerContactName, setCustomerContactName] = useState("");
  const [customerContactPhone, setCustomerContactPhone] = useState("");
  const [packageDescription, setPackageDescription] = useState("");
  const [packageWeightKg, setPackageWeightKg] = useState("");
  const [packageDimensions, setPackageDimensions] = useState("");
  const [manualTrackingNumber, setManualTrackingNumber] = useState("");
  const [manualCourierName, setManualCourierName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/delivery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          pickupAddress,
          deliveryAddress,
          customerContactName: customerContactName || undefined,
          customerContactPhone: customerContactPhone || undefined,
          packageDescription: packageDescription || undefined,
          packageWeightKg: packageWeightKg || undefined,
          packageDimensions: packageDimensions || undefined,
          manualTrackingNumber: provider === "MANUAL" ? manualTrackingNumber || undefined : undefined,
          manualCourierName: provider === "MANUAL" ? manualCourierName || undefined : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create delivery");
      toast.success("Delivery created, order is ready for dispatch");
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create delivery");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (submitting ? null : onOpenChange(v))}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create delivery</DialogTitle>
          <DialogDescription>Your outfit is ready, the customer will be notified it will be dispatched soon.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Provider</Label>
            <Select value={provider} onValueChange={(v) => setProvider(v as "MOCK" | "MANUAL")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MANUAL">Manual (enter tracking myself)</SelectItem>
                <SelectItem value="MOCK">Demo Courier (requires connecting it in Settings)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Pickup Address</Label>
              <Input value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Delivery Address</Label>
              <Input value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Customer Contact Name</Label>
              <Input value={customerContactName} onChange={(e) => setCustomerContactName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Customer Contact Phone</Label>
              <Input value={customerContactPhone} onChange={(e) => setCustomerContactPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Package Weight (kg)</Label>
              <Input type="number" min={0} step="0.1" value={packageWeightKg} onChange={(e) => setPackageWeightKg(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Package Dimensions</Label>
              <Input placeholder="30x20x10 cm" value={packageDimensions} onChange={(e) => setPackageDimensions(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Package Description</Label>
            <Textarea rows={2} value={packageDescription} onChange={(e) => setPackageDescription(e.target.value)} />
          </div>

          {provider === "MANUAL" && (
            <div className="grid gap-3 border-t border-border pt-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Tracking Number (optional)</Label>
                <Input value={manualTrackingNumber} onChange={(e) => setManualTrackingNumber(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Courier Name (optional)</Label>
                <Input value={manualCourierName} onChange={(e) => setManualCourierName(e.target.value)} />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting || !pickupAddress.trim() || !deliveryAddress.trim()}>
            {submitting ? "Creating..." : "Create Delivery"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
