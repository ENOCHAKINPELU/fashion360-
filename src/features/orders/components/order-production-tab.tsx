"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Hammer, PlayCircle, Send, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/shared/components/empty-state";
import { MultiImageUpload } from "@/shared/components/multi-image-upload";
import { cn, formatDate, formatRelativeTime } from "@/lib/utils";
import { productionStageStatusOptions } from "@/lib/validations/order";
import type { OrderProductionStageData, ProductionUpdateData } from "@/features/orders/types";

const STATUS_LABELS = Object.fromEntries(productionStageStatusOptions.map((o) => [o.value, o.label]));
const STATUS_STYLES: Record<string, string> = {
  NOT_STARTED: "bg-muted text-muted-foreground",
  IN_PROGRESS: "bg-accent-soft text-primary",
  COMPLETED: "bg-success-soft text-success",
  SKIPPED: "bg-warning-soft text-warning",
};

export function OrderProductionTab({
  orderId,
  status,
  stages,
  updates,
  isDelayed,
  delayReason,
  expectedCompletionDate,
}: {
  orderId: string;
  status: string;
  stages: OrderProductionStageData[];
  updates: ProductionUpdateData[];
  isDelayed: boolean;
  delayReason: string | null;
  expectedCompletionDate: string | null;
}) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [delayOpen, setDelayOpen] = useState(false);

  async function startProduction() {
    setStarting(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/start-production`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start production");
      toast.success("Production started");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start production");
    } finally {
      setStarting(false);
    }
  }

  const isOverdue = expectedCompletionDate && new Date(expectedCompletionDate) < new Date() && !["COMPLETED", "DELIVERED", "CANCELLED"].includes(status);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {status === "READY_FOR_PRODUCTION" && (
          <Button size="sm" className="gap-1.5" onClick={startProduction} disabled={starting}>
            <PlayCircle className="size-3.5" /> {starting ? "Starting..." : "Start Production"}
          </Button>
        )}
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setUpdateOpen(true)}>
          <Send className="size-3.5" /> Post Customer Update
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setDelayOpen(true)}>
          <AlertTriangle className="size-3.5" /> Flag Delay
        </Button>
      </div>

      {(isDelayed || isOverdue) && (
        <div className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger-soft p-3 text-sm text-danger">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">{isDelayed ? "This order is flagged as delayed." : "This order is past its expected completion date."}</p>
            {delayReason && <p className="mt-0.5">{delayReason}</p>}
          </div>
        </div>
      )}

      {stages.length === 0 ? (
        <EmptyState
          icon={Hammer}
          title="No production stages configured"
          description="Production stages will appear here once assigned to this order."
          className="border-none py-12"
        />
      ) : (
        <div className="space-y-3">
          {[...stages].sort((a, b) => a.sortOrder - b.sortOrder).map((stage) => (
            <ProductionStageCard key={stage.id} orderId={orderId} stage={stage} />
          ))}
        </div>
      )}

      {updates.length > 0 && (
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm">Customer Updates Sent</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {updates.map((u) => (
              <div key={u.id} className="rounded-xl border border-border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-foreground">{u.title}</p>
                  <p className="text-xs text-muted-foreground">{formatRelativeTime(u.createdAt)}</p>
                </div>
                <p className="mt-1 text-muted-foreground">{u.body}</p>
                {u.photos.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {u.photos.map((p, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={i} src={p} alt="" className="size-14 rounded-lg border border-border object-cover" />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <PostUpdateDialog open={updateOpen} onOpenChange={setUpdateOpen} orderId={orderId} />
      <FlagDelayDialog open={delayOpen} onOpenChange={setDelayOpen} orderId={orderId} />
    </div>
  );
}

function ProductionStageCard({ orderId, stage }: { orderId: string; stage: OrderProductionStageData }) {
  const router = useRouter();
  const [notes, setNotes] = useState(stage.notes ?? "");
  const [photos, setPhotos] = useState<string[]>(stage.photos);
  const [statusLoading, setStatusLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function patchStage(body: Record<string, unknown>) {
    const res = await fetch(`/api/orders/${orderId}/production-stages/${stage.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Could not update stage");
    return data.stage;
  }

  async function updateStatus(status: string) {
    setStatusLoading(true);
    try {
      await patchStage({ status });
      toast.success(`${stage.name} marked ${STATUS_LABELS[status] ?? status}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update stage");
    } finally {
      setStatusLoading(false);
    }
  }

  async function saveDetails() {
    setSaving(true);
    try {
      await patchStage({ notes, photos });
      toast.success("Stage updated");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save stage");
    } finally {
      setSaving(false);
    }
  }

  const dirty = notes !== (stage.notes ?? "") || JSON.stringify(photos) !== JSON.stringify(stage.photos);

  return (
    <Card className="border-none shadow-sm">
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{stage.name}</p>
            <Badge className={cn("hover:bg-inherit", STATUS_STYLES[stage.status] ?? STATUS_STYLES.NOT_STARTED)}>
              {STATUS_LABELS[stage.status] ?? stage.status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {stage.startDate ? `Started ${formatDate(stage.startDate)}` : "Not started"}
            {stage.completionDate ? ` · Completed ${formatDate(stage.completionDate)}${stage.completedBy?.name ? ` by ${stage.completedBy.name}` : ""}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {productionStageStatusOptions.map((opt) => (
            <Button
              key={opt.value}
              size="sm"
              variant={stage.status === opt.value ? "default" : "outline"}
              disabled={statusLoading || stage.status === opt.value}
              onClick={() => updateStatus(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>

        <div className="space-y-1.5">
          <Textarea rows={2} placeholder="Internal notes for this stage (never shown to the customer)..." value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Photos</Label>
          <MultiImageUpload value={photos} onChange={setPhotos} folder="production-photos" label="Add photo" />
        </div>

        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={saveDetails} disabled={saving || !dirty}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>

        {stage.files.length > 0 && (
          <div className="flex flex-wrap gap-1.5 border-t border-border pt-2">
            {stage.files.map((file) => (
              <a
                key={file.id}
                href={file.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-foreground hover:bg-muted"
              >
                {file.name}
              </a>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PostUpdateDialog({ open, onOpenChange, orderId }: { open: boolean; onOpenChange: (open: boolean) => void; orderId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/production-updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, photos }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not post update");
      toast.success("Update sent to customer");
      onOpenChange(false);
      setTitle("");
      setBody("");
      setPhotos([]);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not post update");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (submitting ? null : onOpenChange(v))}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Post a customer-facing update</DialogTitle>
          <DialogDescription>e.g. &quot;Your outfit has moved into the sewing stage.&quot;</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Now sewing" />
          </div>
          <div className="space-y-1.5">
            <Label>Message</Label>
            <Textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
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
          <Button onClick={submit} disabled={submitting || !title.trim() || !body.trim()}>
            {submitting ? "Sending..." : "Send Update"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FlagDelayDialog({ open, onOpenChange, orderId }: { open: boolean; onOpenChange: (open: boolean) => void; orderId: string }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [newDate, setNewDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/delay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, updatedExpectedCompletionDate: newDate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not flag delay");
      toast.success("Order flagged as delayed");
      onOpenChange(false);
      setReason("");
      setNewDate("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not flag delay");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (submitting ? null : onOpenChange(v))}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Flag this order as delayed</DialogTitle>
          <DialogDescription>The customer will be notified with your reason and the new expected date.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>New Expected Completion Date</Label>
            <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting || !reason.trim() || !newDate}>
            {submitting ? "Saving..." : "Flag Delay"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
