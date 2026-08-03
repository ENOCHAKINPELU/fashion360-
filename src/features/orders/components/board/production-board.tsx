"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Loader2 } from "lucide-react";
import { KanbanColumn } from "@/features/orders/components/board/kanban-column";
import { KanbanCard } from "@/features/orders/components/board/kanban-card";
import { MobileProductionList } from "@/features/orders/components/board/mobile-production-list";
import type { OrderListItem } from "@/features/orders/types";

export interface BoardColumn {
  key: string;
  label: string;
  matchesStatus: (status: string) => boolean;
  /** Status to PATCH to when a card is dropped on this column. `null` means the column is not a valid drop target. */
  dropStatus: string | null;
}

// Order matches the Phase 6 spec's production board column mapping.
export const BOARD_COLUMNS: BoardColumn[] = [
  {
    key: "new",
    label: "New",
    matchesStatus: (s) => s === "DRAFT" || s === "PENDING_CONFIRMATION",
    dropStatus: "PENDING_CONFIRMATION",
  },
  {
    key: "confirmed",
    label: "Confirmed",
    matchesStatus: (s) => s === "CONFIRMED" || s === "AWAITING_PAYMENT",
    dropStatus: "CONFIRMED",
  },
  {
    key: "ready_for_production",
    label: "Ready for Production",
    matchesStatus: (s) => s === "READY_FOR_PRODUCTION",
    dropStatus: "READY_FOR_PRODUCTION",
  },
  {
    key: "in_production",
    label: "In Production",
    matchesStatus: (s) => s === "IN_PRODUCTION",
    dropStatus: "IN_PRODUCTION",
  },
  { key: "fitting", label: "Fitting", matchesStatus: (s) => s === "FITTING", dropStatus: "FITTING" },
  { key: "alteration", label: "Alteration", matchesStatus: (s) => s === "ALTERATION", dropStatus: "ALTERATION" },
  {
    key: "final_inspection",
    label: "Final Inspection",
    matchesStatus: (s) => s === "FINAL_INSPECTION",
    dropStatus: "FINAL_INSPECTION",
  },
  {
    key: "quality_check",
    label: "Quality Check",
    matchesStatus: (s) => s === "QUALITY_CHECK" || s === "QUALITY_CHECK_FAILED",
    dropStatus: "QUALITY_CHECK",
  },
  { key: "completed", label: "Completed", matchesStatus: (s) => s === "COMPLETED", dropStatus: "COMPLETED" },
  {
    key: "ready_for_pickup",
    label: "Ready for Pickup",
    matchesStatus: (s) => s === "READY_FOR_PICKUP",
    dropStatus: "READY_FOR_PICKUP",
  },
  {
    key: "in_transit",
    label: "In Transit",
    matchesStatus: (s) => s === "IN_TRANSIT",
    dropStatus: "IN_TRANSIT",
  },
  {
    key: "out_for_delivery",
    label: "Out for Delivery",
    matchesStatus: (s) => s === "OUT_FOR_DELIVERY",
    dropStatus: "OUT_FOR_DELIVERY",
  },
  { key: "delivered", label: "Delivered", matchesStatus: (s) => s === "DELIVERED", dropStatus: "DELIVERED" },
  {
    key: "disputed",
    label: "Disputed",
    matchesStatus: (s) => s === "DISPUTED",
    dropStatus: null, // Not a valid drop target — a dispute is only ever created by a customer action, never dragged into.
  },
  { key: "on_hold", label: "On Hold", matchesStatus: (s) => s === "ON_HOLD", dropStatus: "ON_HOLD" },
  {
    key: "cancelled",
    label: "Cancelled",
    matchesStatus: (s) => s === "CANCELLED",
    dropStatus: null, // Not a valid drop target — cancelling requires a reason via the dedicated Cancel action.
  },
];

// businessId isn't used directly here — every API call is already scoped to
// the signed-in user's business server-side — but it's kept as a prop so the
// server page can pass it down per the component's contract.
export function ProductionBoard({ businessId: _businessId }: { businessId: string }) {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeOrder, setActiveOrder] = useState<OrderListItem | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders?archived=false&pageSize=200`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load orders");
      setOrders(data.orders ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const columnOrders = useMemo(() => {
    const map = new Map<string, OrderListItem[]>();
    for (const col of BOARD_COLUMNS) {
      map.set(
        col.key,
        orders.filter((o) => col.matchesStatus(o.status))
      );
    }
    return map;
  }, [orders]);

  const moveOrder = useCallback(
    (orderId: string, targetColumn: BoardColumn) => {
      const order = orders.find((o) => o.id === orderId);
      if (!order) return;

      if (targetColumn.dropStatus === null) {
        toast.error("Cancelling an order requires a reason, use the Cancel action on the order instead.");
        return;
      }
      if (order.status === "CANCELLED") {
        toast.error("Cancelled orders can't be moved.");
        return;
      }
      if (targetColumn.matchesStatus(order.status)) return;

      const previousStatus = order.status;
      const newStatus = targetColumn.dropStatus;
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));

      (async () => {
        try {
          const res = await fetch(`/api/orders/${orderId}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error ?? "Could not update order status");
        } catch (error) {
          setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: previousStatus } : o)));
          toast.error(error instanceof Error ? error.message : "Could not update order status");
        }
      })();
    },
    [orders]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragStart(event: DragStartEvent) {
    const order = orders.find((o) => o.id === event.active.id);
    setActiveOrder(order ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveOrder(null);
    const { active, over } = event;
    if (!over) return;
    const targetColumn = BOARD_COLUMNS.find((c) => c.key === over.id);
    if (!targetColumn) return;
    moveOrder(String(active.id), targetColumn);
  }

  return (
    <>
      <div className="hidden md:block">
        {loading ? (
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : (
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex gap-3 overflow-x-auto pb-4">
              {BOARD_COLUMNS.map((col) => (
                <KanbanColumn
                  key={col.key}
                  id={col.key}
                  label={col.label}
                  orders={columnOrders.get(col.key) ?? []}
                  droppable={col.dropStatus !== null}
                />
              ))}
            </div>
            <DragOverlay>{activeOrder ? <KanbanCard order={activeOrder} /> : null}</DragOverlay>
          </DndContext>
        )}
      </div>

      <div className="md:hidden">
        <MobileProductionList
          columns={BOARD_COLUMNS}
          orders={orders}
          columnOrders={columnOrders}
          onMove={moveOrder}
          loading={loading}
        />
      </div>
    </>
  );
}
