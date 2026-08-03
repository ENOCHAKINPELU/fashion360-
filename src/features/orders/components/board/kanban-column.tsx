"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { KanbanCard } from "@/features/orders/components/board/kanban-card";
import type { OrderListItem } from "@/features/orders/types";

export function KanbanColumn({
  id,
  label,
  orders,
  droppable = true,
}: {
  id: string;
  label: string;
  orders: OrderListItem[];
  droppable?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled: !droppable });

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-xl bg-muted/40">
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <h3 className="text-sm font-semibold text-foreground">{label}</h3>
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-medium text-muted-foreground">
          {orders.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-24 flex-1 flex-col gap-2 px-2 pb-3 transition-colors",
          isOver && droppable && "bg-accent-soft/60",
          isOver && !droppable && "bg-danger-soft/40"
        )}
      >
        {orders.length === 0 ? (
          <p className="px-1 py-6 text-center text-xs text-muted-foreground">No orders</p>
        ) : (
          orders.map((order) => <KanbanCard key={order.id} order={order} />)
        )}
      </div>
    </div>
  );
}
