"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ORDER_STAGES, STAGE_LABELS } from "@/lib/validations/order";

type Order = {
  id: string;
  orderNumber: string;
  stage: (typeof ORDER_STAGES)[number];
  notes: string | null;
  price: string | null;
  deliveryDate: string | null;
  fabric: string | null;
  color: string | null;
  neckline: string | null;
  sleeveStyle: string | null;
  customer: { id: string; name: string };
  designApprovals: Array<{ id: string; status: string; comment: string | null; createdAt: string }>;
};

const DESIGN_LOCK_INDEX = ORDER_STAGES.indexOf("PRODUCTION");

export function OrderDetailClient({ order }: { order: Order }) {
  const router = useRouter();
  const [stage, setStage] = useState(order.stage);
  const [saving, setSaving] = useState(false);

  const stageIndex = ORDER_STAGES.indexOf(stage);
  const designLocked = stageIndex >= DESIGN_LOCK_INDEX;

  async function updateStage(next: string) {
    setSaving(true);
    const res = await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: next }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error("Could not update stage");
      return;
    }
    setStage(next as typeof stage);
    toast.success("Order stage updated");
    router.refresh();
  }

  async function submitApproval(status: "APPROVED" | "REJECTED" | "CHANGES_REQUESTED") {
    setSaving(true);
    const res = await fetch(`/api/orders/${order.id}/approvals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error("Could not record approval");
      return;
    }
    if (status === "APPROVED") setStage("PRODUCTION");
    toast.success(`Design ${status.toLowerCase().replace("_", " ")}`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/orders" className="text-sm text-muted hover:text-foreground">
          ← Back to orders
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl text-foreground">{order.orderNumber}</h1>
            <Link href={`/dashboard/customers/${order.customer.id}`} className="text-sm text-accent">
              {order.customer.name}
            </Link>
          </div>
          <Badge tone="accent" className="text-sm">
            {STAGE_LABELS[stage]}
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {ORDER_STAGES.filter((s) => s !== "CANCELLED").map((s, i) => (
              <button
                key={s}
                disabled={saving}
                onClick={() => updateStage(s)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  i <= stageIndex
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-border text-muted hover:bg-muted-surface"
                }`}
              >
                {STAGE_LABELS[s]}
              </button>
            ))}
          </div>
          {designLocked && (
            <p className="mt-3 text-xs text-warning">
              Design details are locked — production has started on this order.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Design details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <Detail label="Fabric" value={order.fabric} />
            <Detail label="Color" value={order.color} />
            <Detail label="Neckline" value={order.neckline} />
            <Detail label="Sleeve style" value={order.sleeveStyle} />
            <Detail label="Price" value={order.price ? formatCurrency(order.price) : null} />
            <Detail label="Delivery date" value={order.deliveryDate ? formatDate(order.deliveryDate) : null} />
            <div className="col-span-2">
              <Detail label="Notes" value={order.notes} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Design approval</CardTitle>
          </CardHeader>
          <CardContent>
            {stage === "DESIGN_APPROVAL" ? (
              <div className="flex gap-2">
                <Button size="sm" onClick={() => submitApproval("APPROVED")} disabled={saving}>
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => submitApproval("CHANGES_REQUESTED")}
                  disabled={saving}
                >
                  Request changes
                </Button>
                <Button size="sm" variant="danger" onClick={() => submitApproval("REJECTED")} disabled={saving}>
                  Reject
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted">
                Approval actions are available once the order reaches the Design Approval stage.
              </p>
            )}

            {order.designApprovals.length > 0 && (
              <div className="mt-4 space-y-2 border-t border-border pt-4">
                {order.designApprovals.map((a) => (
                  <div key={a.id} className="text-xs text-muted">
                    <Badge tone={a.status === "APPROVED" ? "success" : a.status === "REJECTED" ? "danger" : "warning"}>
                      {a.status.replace("_", " ")}
                    </Badge>{" "}
                    {formatDate(a.createdAt)}
                    {a.comment && <p className="mt-1 text-foreground">{a.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="text-foreground">{value || "—"}</p>
    </div>
  );
}
