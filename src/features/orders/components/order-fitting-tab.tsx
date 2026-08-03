"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Shirt } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MultiImageUpload } from "@/shared/components/multi-image-upload";
import { EmptyState } from "@/shared/components/empty-state";
import { cn, formatDate } from "@/lib/utils";
import { fittingStatusOptions } from "@/lib/validations/order";
import type { FittingSessionData } from "@/features/orders/types";

const STATUS_LABELS = Object.fromEntries(fittingStatusOptions.map((o) => [o.value, o.label]));
const STATUS_STYLES: Record<string, string> = {
  SCHEDULED: "bg-info-soft text-info",
  COMPLETED: "bg-success-soft text-success",
  ADJUSTMENT_REQUIRED: "bg-warning-soft text-warning",
  APPROVED: "bg-success-soft text-success",
};

export function OrderFittingTab({
  orderId,
  fittingSessions,
  createOpen,
  onCreateOpenChange,
}: {
  orderId: string;
  fittingSessions: FittingSessionData[];
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => onCreateOpenChange(true)}>
          Schedule Fitting
        </Button>
      </div>

      {fittingSessions.length === 0 ? (
        <EmptyState icon={Shirt} title="No fitting sessions yet" description="Schedule a fitting session to track fit issues and adjustments." className="border-none py-12" />
      ) : (
        <div className="space-y-3">
          {fittingSessions.map((session) => (
            <FittingSessionCard key={session.id} orderId={orderId} session={session} />
          ))}
        </div>
      )}

      <ScheduleFittingDialog orderId={orderId} open={createOpen} onOpenChange={onCreateOpenChange} />
    </div>
  );
}

function FittingSessionCard({ orderId, session }: { orderId: string; session: FittingSessionData }) {
  const router = useRouter();
  const [status, setStatus] = useState(session.status);
  const [fitIssues, setFitIssues] = useState(session.fitIssues ?? "");
  const [requiredAdjustments, setRequiredAdjustments] = useState(session.requiredAdjustments ?? "");
  const [designerComments, setDesignerComments] = useState(session.designerComments ?? "");
  const [customerComments, setCustomerComments] = useState(session.customerComments ?? "");
  const [photos, setPhotos] = useState<string[]>(session.photos);
  const [saving, setSaving] = useState(false);

  const dirty =
    status !== session.status ||
    fitIssues !== (session.fitIssues ?? "") ||
    requiredAdjustments !== (session.requiredAdjustments ?? "") ||
    designerComments !== (session.designerComments ?? "") ||
    customerComments !== (session.customerComments ?? "") ||
    JSON.stringify(photos) !== JSON.stringify(session.photos);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/fittings/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, fitIssues, requiredAdjustments, designerComments, customerComments, photos }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not update fitting session");
      toast.success("Fitting session updated");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update fitting session");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border-none shadow-sm">
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">Fitting · {formatDate(session.fittingDate)}</p>
          <Badge className={cn("hover:bg-inherit", STATUS_STYLES[session.status] ?? STATUS_STYLES.SCHEDULED)}>
            {STATUS_LABELS[session.status] ?? session.status}
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fittingStatusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Fit Issues</Label>
            <Textarea rows={2} value={fitIssues} onChange={(e) => setFitIssues(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Required Adjustments</Label>
            <Textarea rows={2} value={requiredAdjustments} onChange={(e) => setRequiredAdjustments(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Designer Comments</Label>
            <Textarea rows={2} value={designerComments} onChange={(e) => setDesignerComments(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Customer Comments</Label>
            <Textarea rows={2} value={customerComments} onChange={(e) => setCustomerComments(e.target.value)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Photos</Label>
          <MultiImageUpload value={photos} onChange={setPhotos} folder="orders" />
        </div>

        {session.alterations.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {session.alterations.length} alteration{session.alterations.length > 1 ? "s" : ""} linked to this fitting.
          </p>
        )}

        <div className="flex justify-end border-t border-border pt-3">
          <Button size="sm" onClick={save} disabled={saving || !dirty}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ScheduleFittingDialog({
  orderId,
  open,
  onOpenChange,
}: {
  orderId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [fittingDate, setFittingDate] = useState("");
  const [status, setStatus] = useState("SCHEDULED");
  const [fitIssues, setFitIssues] = useState("");
  const [requiredAdjustments, setRequiredAdjustments] = useState("");
  const [designerComments, setDesignerComments] = useState("");
  const [customerComments, setCustomerComments] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  function reset() {
    setFittingDate("");
    setStatus("SCHEDULED");
    setFitIssues("");
    setRequiredAdjustments("");
    setDesignerComments("");
    setCustomerComments("");
    setPhotos([]);
  }

  async function handleSubmit() {
    if (!fittingDate) {
      toast.error("Choose a fitting date");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/fittings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fittingDate, status, fitIssues, requiredAdjustments, designerComments, customerComments, photos }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not schedule fitting");
      toast.success("Fitting session scheduled");
      reset();
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not schedule fitting");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Schedule Fitting</DialogTitle>
          <DialogDescription>Book a fitting session and record fit feedback as it comes in.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] space-y-4 overflow-y-auto">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Fitting Date</Label>
              <Input type="date" value={fittingDate} onChange={(e) => setFittingDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fittingStatusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Fit Issues</Label>
            <Textarea rows={2} value={fitIssues} onChange={(e) => setFitIssues(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Required Adjustments</Label>
            <Textarea rows={2} value={requiredAdjustments} onChange={(e) => setRequiredAdjustments(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Designer Comments</Label>
            <Textarea rows={2} value={designerComments} onChange={(e) => setDesignerComments(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Customer Comments</Label>
            <Textarea rows={2} value={customerComments} onChange={(e) => setCustomerComments(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Photos</Label>
            <MultiImageUpload value={photos} onChange={setPhotos} folder="orders" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Scheduling..." : "Schedule Fitting"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
