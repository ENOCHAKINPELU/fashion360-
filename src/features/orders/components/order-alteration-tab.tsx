"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Scissors } from "lucide-react";
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
import { EmptyState } from "@/shared/components/empty-state";
import { cn, formatDate } from "@/lib/utils";
import { alterationStatusOptions } from "@/lib/validations/order";
import type { AlterationData, FittingSessionData } from "@/features/orders/types";

const STATUS_LABELS = Object.fromEntries(alterationStatusOptions.map((o) => [o.value, o.label]));
const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-muted text-muted-foreground",
  IN_PROGRESS: "bg-accent-soft text-primary",
  COMPLETED: "bg-success-soft text-success",
  CANCELLED: "bg-danger-soft text-danger",
};

export function OrderAlterationTab({
  orderId,
  alterations,
  fittingSessions,
}: {
  orderId: string;
  alterations: AlterationData[];
  fittingSessions: FittingSessionData[];
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const sorted = [...alterations].sort((a, b) => b.cycleNumber - a.cycleNumber);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          Request Alteration
        </Button>
      </div>

      {sorted.length === 0 ? (
        <EmptyState icon={Scissors} title="No alterations requested" description="Alteration requests raised after fittings will appear here." className="border-none py-12" />
      ) : (
        <div className="space-y-3">
          {sorted.map((alteration) => (
            <AlterationCard key={alteration.id} orderId={orderId} alteration={alteration} />
          ))}
        </div>
      )}

      <RequestAlterationDialog orderId={orderId} fittingSessions={fittingSessions} open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function AlterationCard({ orderId, alteration }: { orderId: string; alteration: AlterationData }) {
  const router = useRouter();
  const [status, setStatus] = useState(alteration.status);
  const [requiredChange, setRequiredChange] = useState(alteration.requiredChange);
  const [description, setDescription] = useState(alteration.description ?? "");
  const [expectedCompletionDate, setExpectedCompletionDate] = useState(
    alteration.expectedCompletionDate ? alteration.expectedCompletionDate.slice(0, 10) : ""
  );
  const [notes, setNotes] = useState(alteration.notes ?? "");
  const [saving, setSaving] = useState(false);

  const dirty =
    status !== alteration.status ||
    requiredChange !== alteration.requiredChange ||
    description !== (alteration.description ?? "") ||
    expectedCompletionDate !== (alteration.expectedCompletionDate ? alteration.expectedCompletionDate.slice(0, 10) : "") ||
    notes !== (alteration.notes ?? "");

  async function save() {
    setSaving(true);
    try {
      const body: Record<string, unknown> = { status, requiredChange, description, notes };
      if (expectedCompletionDate) body.expectedCompletionDate = expectedCompletionDate;
      const res = await fetch(`/api/orders/${orderId}/alterations/${alteration.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not update alteration");
      toast.success("Alteration updated");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update alteration");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border-none shadow-sm">
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">Cycle {alteration.cycleNumber} · {alteration.issue}</p>
          <Badge className={cn("hover:bg-inherit", STATUS_STYLES[alteration.status] ?? STATUS_STYLES.PENDING)}>
            {STATUS_LABELS[alteration.status] ?? alteration.status}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Requested {formatDate(alteration.createdAt)}
          {alteration.completedAt ? ` · Completed ${formatDate(alteration.completedAt)}` : ""}
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {alterationStatusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Expected Completion</Label>
            <Input type="date" value={expectedCompletionDate} onChange={(e) => setExpectedCompletionDate(e.target.value)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Required Change</Label>
          <Textarea rows={2} value={requiredChange} onChange={(e) => setRequiredChange(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Description</Label>
          <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="flex justify-end border-t border-border pt-3">
          <Button size="sm" onClick={save} disabled={saving || !dirty}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function RequestAlterationDialog({
  orderId,
  fittingSessions,
  open,
  onOpenChange,
}: {
  orderId: string;
  fittingSessions: FittingSessionData[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [fittingSessionId, setFittingSessionId] = useState("");
  const [issue, setIssue] = useState("");
  const [requiredChange, setRequiredChange] = useState("");
  const [description, setDescription] = useState("");
  const [expectedCompletionDate, setExpectedCompletionDate] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  function reset() {
    setFittingSessionId("");
    setIssue("");
    setRequiredChange("");
    setDescription("");
    setExpectedCompletionDate("");
    setNotes("");
  }

  async function handleSubmit() {
    if (!issue.trim() || !requiredChange.trim()) {
      toast.error("Describe the issue and required change");
      return;
    }
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        issue,
        requiredChange,
        description,
        notes,
        fittingSessionId: fittingSessionId || undefined,
      };
      if (expectedCompletionDate) body.expectedCompletionDate = expectedCompletionDate;

      const res = await fetch(`/api/orders/${orderId}/alterations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not request alteration");
      toast.success("Alteration requested");
      reset();
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not request alteration");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Request Alteration</DialogTitle>
          <DialogDescription>Log an alteration cycle for this order.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] space-y-4 overflow-y-auto">
          {fittingSessions.length > 0 && (
            <div className="space-y-1.5">
              <Label>Linked Fitting Session (optional)</Label>
              <Select value={fittingSessionId || "__none"} onValueChange={(v) => setFittingSessionId(v === "__none" ? "" : v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">None</SelectItem>
                  {fittingSessions.map((fs) => (
                    <SelectItem key={fs.id} value={fs.id}>
                      Fitting · {formatDate(fs.fittingDate)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Issue</Label>
            <Textarea rows={2} value={issue} onChange={(e) => setIssue(e.target.value)} placeholder="What's wrong with the fit?" />
          </div>
          <div className="space-y-1.5">
            <Label>Required Change</Label>
            <Textarea rows={2} value={requiredChange} onChange={(e) => setRequiredChange(e.target.value)} placeholder="What needs to be adjusted?" />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Expected Completion Date</Label>
            <Input type="date" value={expectedCompletionDate} onChange={(e) => setExpectedCompletionDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Requesting..." : "Request Alteration"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
