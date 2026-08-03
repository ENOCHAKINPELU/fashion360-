"use client";

import { useRouter } from "next/navigation";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { AlertTriangle } from "lucide-react";
import { OrderPriorityBadge } from "@/features/orders/components/order-priority-badge";
import { OrderPaymentStatusBadge } from "@/features/orders/components/order-payment-status-badge";
import { UserAvatar } from "@/shared/components/user-avatar";
import { cn, formatDate } from "@/lib/utils";
import type { OrderListItem } from "@/features/orders/types";

// Statuses where an expected-completion date in the past no longer counts as
// "overdue" — the order has already reached (or passed) its finish line.
const COMPLETED_LIKE = new Set(["COMPLETED", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"]);

export function KanbanCard({ order }: { order: OrderListItem }) {
  const router = useRouter();
  const draggable = order.status !== "CANCELLED";
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: order.id,
    disabled: !draggable,
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform), zIndex: isDragging ? 50 : undefined }
    : undefined;

  const designName = order.items[0]?.designNameSnapshot ?? "Custom";
  const isOverdue =
    !!order.expectedCompletionDate &&
    new Date(order.expectedCompletionDate).getTime() < Date.now() &&
    !COMPLETED_LIKE.has(order.status);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => {
        if (!isDragging) router.push(`/dashboard/orders/${order.id}`);
      }}
      role="button"
      tabIndex={0}
      className={cn(
        "touch-none space-y-2.5 rounded-xl border border-border bg-card p-3 shadow-sm transition-shadow",
        draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
        "hover:shadow-md",
        isDragging && "opacity-60 shadow-lg"
      )}
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

      <div className="flex items-center justify-between gap-2 pt-1">
        <span
          className={cn(
            "flex items-center gap-1 text-[11px]",
            isOverdue ? "font-medium text-danger" : "text-muted-foreground"
          )}
        >
          {isOverdue && <AlertTriangle className="size-3" />}
          {order.expectedCompletionDate ? formatDate(order.expectedCompletionDate) : "No date"}
          {isOverdue && " · Overdue"}
        </span>
        {order.assignedDesigner && (
          <UserAvatar name={order.assignedDesigner.name} image={order.assignedDesigner.image} className="size-5" />
        )}
      </div>
    </div>
  );
}
