"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { OrderFormDialog } from "@/components/dashboard/order-form-dialog";
import { formatDate, formatCurrency } from "@/lib/utils";
import { STAGE_LABELS } from "@/lib/validations/order";

type OrderRow = {
  id: string;
  orderNumber: string;
  stage: keyof typeof STAGE_LABELS;
  price: string | null;
  deliveryDate: string | null;
  createdAt: string;
  customer: { name: string };
};

export function OrdersClient({
  orders,
  customers,
  autoOpen,
}: {
  orders: OrderRow[];
  customers: { id: string; name: string }[];
  autoOpen: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(autoOpen);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-foreground">Orders</h1>
          <p className="text-sm text-muted">Track every custom order from consultation to delivery.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> New order
        </Button>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="No orders yet"
          description="Create an order once a customer is ready to move forward."
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> New order
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted-surface text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-6 py-3 font-medium">Order</th>
                <th className="px-6 py-3 font-medium">Customer</th>
                <th className="px-6 py-3 font-medium">Stage</th>
                <th className="px-6 py-3 font-medium">Price</th>
                <th className="px-6 py-3 font-medium">Delivery</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => router.push(`/dashboard/orders/${o.id}`)}
                  className="cursor-pointer hover:bg-muted-surface"
                >
                  <td className="px-6 py-3 font-medium text-foreground">{o.orderNumber}</td>
                  <td className="px-6 py-3 text-muted">{o.customer.name}</td>
                  <td className="px-6 py-3">
                    <Badge tone="accent">{STAGE_LABELS[o.stage]}</Badge>
                  </td>
                  <td className="px-6 py-3 text-muted">{o.price ? formatCurrency(o.price) : "—"}</td>
                  <td className="px-6 py-3 text-muted">
                    {o.deliveryDate ? formatDate(o.deliveryDate) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <OrderFormDialog open={open} onClose={() => setOpen(false)} customers={customers} />
    </div>
  );
}
