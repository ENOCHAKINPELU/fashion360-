"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

interface PayoutRow {
  id: string;
  netAmount: number;
  status: string;
  failureReason: string | null;
  eligibleAt: string;
  paidAt: string | null;
  business: { name: string };
  order: { orderCode: string };
}

const STATUS_STYLES: Record<string, string> = {
  NOT_ELIGIBLE: "bg-muted text-muted-foreground",
  PENDING: "bg-muted text-muted-foreground",
  ELIGIBLE: "bg-info-soft text-info",
  PROCESSING: "bg-warning-soft text-warning",
  PAID: "bg-success-soft text-success",
  FAILED: "bg-danger-soft text-danger",
};

export function AdminPayoutsClient({ payouts }: { payouts: PayoutRow[] }) {
  const router = useRouter();
  const [processingId, setProcessingId] = useState<string | null>(null);

  async function process(id: string, status: "PROCESSING" | "PAID" | "FAILED") {
    setProcessingId(id);
    try {
      const res = await fetch(`/api/payouts/${id}/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not update payout");
      toast.success(`Payout marked ${status.toLowerCase()}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update payout");
    } finally {
      setProcessingId(null);
    }
  }

  if (payouts.length === 0) {
    return <p className="text-sm text-muted-foreground">No payouts yet.</p>;
  }

  return (
    <div className="space-y-2">
      {payouts.map((p) => (
        <Card key={p.id} className="border-none shadow-sm">
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground">{p.order.orderCode}</p>
                <Badge className={STATUS_STYLES[p.status]}>{p.status}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {p.business.name} · Net {p.netAmount} · {p.paidAt ? `Paid ${formatDate(p.paidAt)}` : `Eligible ${formatDate(p.eligibleAt)}`}
              </p>
              {p.failureReason && <p className="text-xs text-danger">{p.failureReason}</p>}
            </div>
            <div className="flex items-center gap-2">
              {p.status === "ELIGIBLE" && (
                <Button size="sm" onClick={() => process(p.id, "PAID")} disabled={processingId === p.id}>
                  {processingId === p.id ? "Marking..." : "Mark Paid"}
                </Button>
              )}
              {p.status === "FAILED" && (
                <Button size="sm" variant="outline" onClick={() => process(p.id, "PROCESSING")} disabled={processingId === p.id}>
                  {processingId === p.id ? "Retrying..." : "Retry"}
                </Button>
              )}
              {p.status === "PROCESSING" && (
                <>
                  <Button size="sm" onClick={() => process(p.id, "PAID")} disabled={processingId === p.id}>
                    Mark Paid
                  </Button>
                  <Button size="sm" variant="ghost" className="text-danger hover:text-danger" onClick={() => process(p.id, "FAILED")} disabled={processingId === p.id}>
                    Mark Failed
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
