"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatRelativeTime } from "@/lib/utils";

interface DisputeDetail {
  id: string;
  issueType: string;
  description: string;
  status: string;
  createdAt: string;
  evidence: { id: string; photos: string[]; videos: string[]; description: string | null; submittedByType: string; createdAt: string }[];
  responses: { id: string; authorType: string; body: string; createdAt: string }[];
  resolution: { resolutionType: string; notes: string; resolvedAt: string } | null;
}

export function CustomerDisputeCard({ orderId }: { orderId: string }) {
  const [dispute, setDispute] = useState<DisputeDetail | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [respondBody, setRespondBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const hasLoadedRef = useRef(false);

  async function load() {
    try {
      const res = await fetch(`/api/customer/orders/${orderId}/dispute`);
      const data = await res.json();
      setDispute(data.dispute);
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  async function respond() {
    if (!respondBody.trim() || !dispute) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/customer/disputes/${dispute.id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: respondBody.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not send response");
      setRespondBody("");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send response");
    } finally {
      setSubmitting(false);
    }
  }

  if (!loaded || !dispute) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="size-4" /> Reported Problem
          <Badge variant="outline">{dispute.status.replace(/_/g, " ")}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium text-foreground">{dispute.issueType.replace(/_/g, " ")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{dispute.description}</p>
          <p className="mt-1 text-xs text-muted-foreground">Reported {formatDate(dispute.createdAt)}</p>
        </div>

        {dispute.resolution && (
          <div className="rounded-xl border border-success/20 bg-success-soft p-3">
            <p className="text-sm font-medium text-success">Resolved: {dispute.resolution.resolutionType.replace(/_/g, " ")}</p>
            <p className="mt-1 text-sm text-success/90">{dispute.resolution.notes}</p>
            <p className="mt-1 text-xs text-success/70">{formatDate(dispute.resolution.resolvedAt)}</p>
          </div>
        )}

        {dispute.responses.length > 0 && (
          <div className="space-y-2 border-t border-border pt-3">
            {dispute.responses.map((r) => (
              <div key={r.id} className="rounded-xl border border-border p-3 text-sm">
                <p className="mb-1 text-xs text-muted-foreground">
                  {r.authorType === "CUSTOMER" ? "You" : "Business"} · {formatRelativeTime(r.createdAt)}
                </p>
                <p className="text-foreground">{r.body}</p>
              </div>
            ))}
          </div>
        )}

        {!dispute.resolution && (
          <div className="flex flex-col gap-2 border-t border-border pt-3 sm:flex-row">
            <Textarea rows={2} value={respondBody} onChange={(e) => setRespondBody(e.target.value)} placeholder="Add more detail..." className="flex-1" />
            <Button size="sm" onClick={respond} disabled={submitting || !respondBody.trim()} className="self-start">
              {submitting ? "Sending..." : "Send"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
