"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Circle, Clock, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatDate, formatRelativeTime } from "@/lib/utils";

interface ProductionStage {
  id: string;
  name: string;
  status: string;
  startDate: string | null;
  completionDate: string | null;
}

interface ProductionUpdate {
  id: string;
  title: string;
  body: string;
  photos: string[];
  createdAt: string;
}

export function CustomerProductionTracker({
  orderId,
  stages,
  updates,
  isDelayed,
  delayReason,
  expectedCompletionDate,
  onChanged,
}: {
  orderId: string;
  stages: ProductionStage[];
  updates: ProductionUpdate[];
  isDelayed: boolean;
  delayReason: string | null;
  expectedCompletionDate: string | null;
  onChanged: () => void;
}) {
  if (stages.length === 0 && updates.length === 0 && !isDelayed) return null;

  return (
    <div className="space-y-6">
      {isDelayed && <DelayBanner orderId={orderId} delayReason={delayReason} onChanged={onChanged} />}

      {stages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Production Progress</CardTitle>
          </CardHeader>
          <CardContent>
            {expectedCompletionDate && (
              <p className="mb-3 text-sm text-muted-foreground">Expected completion: {formatDate(expectedCompletionDate)}</p>
            )}
            <ul className="space-y-3">
              {stages.map((stage) => {
                const done = stage.status === "COMPLETED";
                const inProgress = stage.status === "IN_PROGRESS";
                return (
                  <li key={stage.id} className="flex items-center gap-3">
                    {done ? (
                      <CheckCircle2 className="size-5 shrink-0 text-success" />
                    ) : inProgress ? (
                      <Clock className="size-5 shrink-0 text-warning" />
                    ) : (
                      <Circle className="size-5 shrink-0 text-muted-foreground" />
                    )}
                    <div className="flex-1">
                      <p className={cn("text-sm font-medium", done ? "text-foreground" : inProgress ? "text-foreground" : "text-muted-foreground")}>
                        {stage.name}
                      </p>
                      {stage.completionDate && <p className="text-xs text-muted-foreground">Completed {formatDate(stage.completionDate)}</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {updates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Updates From Your Business</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {updates.map((u) => (
              <div key={u.id} className="rounded-xl border border-border p-3">
                <p className="text-sm font-medium text-foreground">{u.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{u.body}</p>
                {u.photos.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {u.photos.map((p, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={i} src={p} alt="" className="size-16 rounded-lg border border-border object-cover" />
                    ))}
                  </div>
                )}
                <p className="mt-2 text-xs text-muted-foreground">{formatRelativeTime(u.createdAt)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DelayBanner({ orderId, delayReason, onChanged }: { orderId: string; delayReason: string | null; onChanged: () => void }) {
  const [note, setNote] = useState("");
  const [showReport, setShowReport] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);

  async function act(action: "accept" | "request-cancellation" | "report-issue") {
    if (action === "report-issue" && !note.trim()) {
      setShowReport(true);
      return;
    }
    setSubmitting(action);
    try {
      const res = await fetch(`/api/customer/orders/${orderId}/delay-response`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note: note.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not submit response");
      toast.success(action === "accept" ? "New date accepted" : action === "request-cancellation" ? "Cancellation requested" : "Issue reported");
      setNote("");
      setShowReport(false);
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit response");
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="rounded-2xl border border-warning/20 bg-warning-soft p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="size-5 shrink-0 text-warning" />
        <div className="flex-1">
          <p className="text-sm font-medium text-warning">Production Delayed</p>
          {delayReason && <p className="mt-1 text-sm text-warning/90">{delayReason}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => act("accept")} disabled={submitting !== null}>
              {submitting === "accept" ? "Saving..." : "Accept New Date"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => act("request-cancellation")} disabled={submitting !== null}>
              {submitting === "request-cancellation" ? "Saving..." : "Request Cancellation"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowReport((v) => !v)} disabled={submitting !== null}>
              Report Issue
            </Button>
          </div>
          {showReport && (
            <div className="mt-3 space-y-2">
              <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Describe the issue..." />
              <Button size="sm" onClick={() => act("report-issue")} disabled={submitting !== null || !note.trim()}>
                {submitting === "report-issue" ? "Sending..." : "Send"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
