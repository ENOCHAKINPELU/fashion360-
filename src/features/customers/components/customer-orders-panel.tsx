"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingBag, Repeat, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/shared/components/empty-state";
import { LoadingState } from "@/shared/components/loading-state";
import { OrderStatusBadge } from "@/features/orders/components/order-status-badge";
import { formatDate } from "@/lib/utils";
import type { OrderListItem } from "@/features/orders/types";

export function CustomerOrdersPanel({ customerId }: { customerId: string }) {
  const [orders, setOrders] = useState<OrderListItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/orders?customerId=${customerId}&pageSize=10&sort=orderDate:desc`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setOrders(data.orders ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Orders</p>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/orders?customerId=${customerId}`}>View All</Link>
          </Button>
          <Button asChild size="sm" className="gap-1.5">
            <Link href={`/dashboard/orders/new?customerId=${customerId}`}>
              <ShoppingBag className="size-3.5" /> New Order
            </Link>
          </Button>
        </div>
      </div>

      {orders === null ? (
        <LoadingState />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="No orders yet"
          description="Create this customer's first order to start tracking it through production."
          className="border-none py-8"
        />
      ) : (
        <ul className="space-y-2">
          {orders.map((order) => (
            <li
              key={order.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground">{order.orderCode}</p>
                  <OrderStatusBadge status={order.status} />
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {order.items[0]?.designNameSnapshot ?? "Custom design"} · {formatDate(order.orderDate)} · ₦
                  {order.totalValue.toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <Button asChild variant="ghost" size="sm" className="gap-1">
                  <Link href={`/dashboard/orders/new?reorderFrom=${order.id}`}>
                    <Repeat className="size-3.5" /> Reorder
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="sm" className="gap-1">
                  <Link href={`/dashboard/orders/${order.id}`}>
                    <Eye className="size-3.5" /> View
                  </Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
