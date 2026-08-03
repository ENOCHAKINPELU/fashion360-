"use client";

import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OrderPriorityBadge } from "@/features/orders/components/order-priority-badge";
import { OrderPaymentStatusBadge } from "@/features/orders/components/order-payment-status-badge";
import { UserAvatar } from "@/shared/components/user-avatar";
import { cn, formatDate } from "@/lib/utils";
import type { OrderListItem } from "@/features/orders/types";
import type { BoardColumn } from "@/features/orders/components/board/production-board";

const COMPLETED_LIKE = new Set(["COMPLETED", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"]);

export function MobileProductionList({
  columns,
  orders,
  columnOrders,
  onMove,
  loading,
}: {
  columns: BoardColumn[];
  orders: OrderListItem[];
  columnOrders: Map<string, OrderListItem[]>;
  onMove: (orderId: string, targetColumn: BoardColumn) => void;
  loading: boolean;
}) {
  const router = useRouter();
  const movableColumns = columns.filter((c) => c.dropStatus !== null);

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  if (orders.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No orders on the board yet.</p>;
  }

  return (
    <div className="space-y-5">
      {columns.map((col) => {
        const colOrders = columnOrders.get(col.key) ?? [];
        if (colOrders.length === 0) return null;

        return (
          <section key={col.key} className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">{col.label}</h3>
              <span className="flex size-5 items-center justify-center rounded-full bg-muted text-[11px] font-medium text-muted-foreground">
                {colOrders.length}
              </span>
            </div>
            <div className="space-y-2">
              {colOrders.map((order) => {
                const designName = order.items[0]?.designNameSnapshot ?? "Custom";
                const isOverdue =
                  !!order.expectedCompletionDate &&
                  new Date(order.expectedCompletionDate).getTime() < Date.now() &&
                  !COMPLETED_LIKE.has(order.status);

                return (
                  <div key={order.id} className="space-y-2.5 rounded-xl border border-border bg-card p-3 shadow-sm">
                    <div
                      className="cursor-pointer space-y-2.5"
                      onClick={() => router.push(`/dashboard/orders/${order.id}`)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-semibold text-foreground">{order.orderCode}</span>
                        <OrderPriorityBadge priority={order.priority} />
                      </div>
                      <div className="flex items-center gap-2">
                        <UserAvatar
                          name={`${order.customer.firstName} ${order.customer.lastName}`}
                          image={order.customer.profilePhotoUrl}
                          className="size-6"
                        />
                        <span className="truncate text-xs text-muted-foreground">
                          {order.customer.firstName} {order.customer.lastName}
                        </span>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{designName}</p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <OrderPaymentStatusBadge status={order.paymentStatus} />
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "text-[11px]",
                            isOverdue ? "font-medium text-danger" : "text-muted-foreground"
                          )}
                        >
                          {order.expectedCompletionDate ? formatDate(order.expectedCompletionDate) : "No date"}
                          {isOverdue && " · Overdue"}
                        </span>
                        {order.assignedDesigner && (
                          <UserAvatar
                            name={order.assignedDesigner.name}
                            image={order.assignedDesigner.image}
                            className="size-5"
                          />
                        )}
                      </div>
                    </div>

                    {order.status === "CANCELLED" ? (
                      <p className="text-[11px] text-muted-foreground">
                        Cancelled orders can&apos;t be moved. Open the order to see details.
                      </p>
                    ) : (
                      <Select
                        value={col.key}
                        onValueChange={(value) => {
                          const target = movableColumns.find((c) => c.key === value);
                          if (target) onMove(order.id, target);
                        }}
                      >
                        <SelectTrigger className="w-full" size="sm">
                          <SelectValue placeholder="Move to..." />
                        </SelectTrigger>
                        <SelectContent>
                          {movableColumns.map((c) => (
                            <SelectItem key={c.key} value={c.key}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
