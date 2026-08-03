"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  MoreHorizontal,
  Eye,
  RefreshCw,
  StickyNote,
  FileText,
  User as UserIcon,
  Archive,
  ArchiveRestore,
  XCircle,
  ShoppingBag,
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/shared/components/user-avatar";
import { EmptyState } from "@/shared/components/empty-state";
import { formatDate } from "@/lib/utils";
import { OrderStatusBadge } from "@/features/orders/components/order-status-badge";
import { OrderPriorityBadge } from "@/features/orders/components/order-priority-badge";
import { OrderPaymentStatusBadge } from "@/features/orders/components/order-payment-status-badge";
import { OrderStatusDialog } from "@/features/orders/components/order-status-dialog";
import { OrderNoteDialog } from "@/features/orders/components/order-note-dialog";
import { CancelOrderDialog } from "@/features/orders/components/cancel-order-dialog";
import type { OrderListItem } from "@/features/orders/types";

const NON_CANCELLABLE_STATUSES = new Set(["COMPLETED", "DELIVERED", "CANCELLED"]);

export function OrdersTable({
  orders,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
}: {
  orders: OrderListItem[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
}) {
  const router = useRouter();
  const [statusDialogOrder, setStatusDialogOrder] = useState<OrderListItem | null>(null);
  const [noteDialogOrder, setNoteDialogOrder] = useState<OrderListItem | null>(null);
  const [cancelDialogOrder, setCancelDialogOrder] = useState<OrderListItem | null>(null);

  async function handleArchiveToggle(order: OrderListItem) {
    const res = await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: order.isArchived ? "unarchive" : "archive" }),
    });
    if (!res.ok) {
      toast.error("Could not update order");
      return;
    }
    toast.success(order.isArchived ? "Order restored" : "Order archived");
    router.refresh();
  }

  if (orders.length === 0) {
    return (
      <EmptyState
        icon={ShoppingBag}
        title="No orders found"
        description="Try adjusting your search or filters, or create your first order."
      />
    );
  }

  const allSelected = orders.every((o) => selectedIds.has(o.id));

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox checked={allSelected} onCheckedChange={onToggleSelectAll} aria-label="Select all" />
            </TableHead>
            <TableHead>Order ID</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Design</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Order Date</TableHead>
            <TableHead>Expected Completion</TableHead>
            <TableHead>Current Stage</TableHead>
            <TableHead>Payment Status</TableHead>
            <TableHead>Order Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Assigned Designer</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => {
            const firstItem = order.items[0];
            const canCancel = !NON_CANCELLABLE_STATUSES.has(order.status);
            return (
              <TableRow
                key={order.id}
                className="cursor-pointer"
                onClick={() => router.push(`/dashboard/orders/${order.id}`)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.has(order.id)}
                    onCheckedChange={() => onToggleSelect(order.id)}
                    aria-label={`Select ${order.orderCode}`}
                  />
                </TableCell>
                <TableCell className="font-medium text-foreground">{order.orderCode}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      name={`${order.customer.firstName} ${order.customer.lastName}`}
                      image={order.customer.profilePhotoUrl}
                    />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {order.customer.firstName} {order.customer.lastName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {order.customer.phone ?? order.customer.email ?? "N/A"}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{firstItem?.designNameSnapshot ?? "Custom"}</TableCell>
                <TableCell className="text-muted-foreground">{firstItem?.designCategorySnapshot ?? "N/A"}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(order.orderDate)}</TableCell>
                <TableCell className="text-muted-foreground">
                  {order.expectedCompletionDate ? formatDate(order.expectedCompletionDate) : "N/A"}
                </TableCell>
                <TableCell className="text-muted-foreground">{order.currentStage ?? "N/A"}</TableCell>
                <TableCell>
                  <OrderPaymentStatusBadge status={order.paymentStatus} />
                </TableCell>
                <TableCell>
                  <OrderStatusBadge status={order.status} />
                </TableCell>
                <TableCell>
                  <OrderPriorityBadge priority={order.priority} />
                </TableCell>
                <TableCell>
                  {order.assignedDesigner ? (
                    <div className="flex items-center gap-2">
                      <UserAvatar name={order.assignedDesigner.name} image={order.assignedDesigner.image} className="size-7" />
                      <span className="truncate text-sm text-foreground">{order.assignedDesigner.name ?? "N/A"}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Unassigned</span>
                  )}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                        aria-label="Row actions"
                      >
                        <MoreHorizontal className="size-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/orders/${order.id}`}>
                          <Eye /> View Order
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatusDialogOrder(order)}>
                        <RefreshCw /> Update Status
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setNoteDialogOrder(order)}>
                        <StickyNote /> Add Note
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/quotations?orderId=${order.id}`}>
                          <FileText /> Create Quotation
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/customers/${order.customer.id}`}>
                          <UserIcon /> View Customer
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleArchiveToggle(order)}>
                        {order.isArchived ? (
                          <>
                            <ArchiveRestore /> Unarchive
                          </>
                        ) : (
                          <>
                            <Archive /> Archive
                          </>
                        )}
                      </DropdownMenuItem>
                      {canCancel && (
                        <DropdownMenuItem variant="destructive" onClick={() => setCancelDialogOrder(order)}>
                          <XCircle /> Cancel Order
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {statusDialogOrder && (
        <OrderStatusDialog
          open={!!statusDialogOrder}
          onOpenChange={(open) => !open && setStatusDialogOrder(null)}
          orderId={statusDialogOrder.id}
          currentStatus={statusDialogOrder.status}
        />
      )}

      {noteDialogOrder && (
        <OrderNoteDialog
          open={!!noteDialogOrder}
          onOpenChange={(open) => !open && setNoteDialogOrder(null)}
          orderId={noteDialogOrder.id}
        />
      )}

      {cancelDialogOrder && (
        <CancelOrderDialog
          open={!!cancelDialogOrder}
          onOpenChange={(open) => !open && setCancelDialogOrder(null)}
          orderId={cancelDialogOrder.id}
          orderCode={cancelDialogOrder.orderCode}
        />
      )}
    </div>
  );
}
