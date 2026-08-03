"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserAvatar } from "@/shared/components/user-avatar";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { OrderStatusBadge } from "@/features/orders/components/order-status-badge";
import { OrderPriorityBadge } from "@/features/orders/components/order-priority-badge";
import { OrderPaymentStatusBadge } from "@/features/orders/components/order-payment-status-badge";
import { OrderStatusDialog } from "@/features/orders/components/order-status-dialog";
import { OrderNoteDialog } from "@/features/orders/components/order-note-dialog";
import { CancelOrderDialog } from "@/features/orders/components/cancel-order-dialog";
import { OrderOverviewTab } from "@/features/orders/components/order-overview-tab";
import { OrderDesignTab } from "@/features/orders/components/order-design-tab";
import { OrderTimelineView } from "@/features/orders/components/order-timeline-view";
import { OrderProductionTab } from "@/features/orders/components/order-production-tab";
import { OrderQualityDeliveryTab } from "@/features/orders/components/order-quality-delivery-tab";
import { OrderDisputeTab } from "@/features/orders/components/order-dispute-tab";
import { OrderFittingTab } from "@/features/orders/components/order-fitting-tab";
import { OrderAlterationTab } from "@/features/orders/components/order-alteration-tab";
import { OrderNotesTab } from "@/features/orders/components/order-notes-tab";
import { OrderFilesTab } from "@/features/orders/components/order-files-tab";
import { OrderActivityTab } from "@/features/orders/components/order-activity-tab";
import { OrderFinancialsTab } from "@/features/orders/components/order-financials-tab";
import { cn, formatDate } from "@/lib/utils";
import type { OrderDetailData } from "@/features/orders/types";

const TERMINAL_STATUSES = ["COMPLETED", "DELIVERED", "CANCELLED"];

export function OrderDetailClient({ order }: { order: OrderDetailData }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");

  const [statusOpen, setStatusOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [completeConfirmOpen, setCompleteConfirmOpen] = useState(false);
  const [duplicateConfirmOpen, setDuplicateConfirmOpen] = useState(false);
  const [overviewEditOpen, setOverviewEditOpen] = useState(false);
  const [fittingCreateOpen, setFittingCreateOpen] = useState(false);

  const isTerminal = TERMINAL_STATUSES.includes(order.status);
  const fullCustomerName = `${order.customer.firstName} ${order.customer.lastName}`;

  async function markCompleted() {
    try {
      const res = await fetch(`/api/orders/${order.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not mark order completed");
      toast.success("Order marked completed");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not mark order completed");
    }
  }

  async function duplicateOrder() {
    try {
      const res = await fetch(`/api/orders/${order.id}/duplicate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not duplicate order");
      toast.success(`Duplicated as ${data.order.orderCode}`);
      router.push(`/dashboard/orders/${data.order.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not duplicate order");
    }
  }

  function openEditOrder() {
    setActiveTab("overview");
    setOverviewEditOpen(true);
  }

  function openScheduleFitting() {
    setActiveTab("fitting");
    setFittingCreateOpen(true);
  }

  const pillClass =
    "inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-accent-soft disabled:pointer-events-none disabled:opacity-50";

  return (
    <div className="space-y-6">
      <Link href="/dashboard/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Back to orders
      </Link>

      {order.cancellation && (
        <Card className="border-none bg-danger-soft shadow-sm">
          <CardContent className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-danger" />
            <div>
              <p className="text-sm font-semibold text-danger">This order was cancelled</p>
              <p className="text-sm text-danger/90">{order.cancellation.reason}</p>
              <p className="mt-1 text-xs text-danger/70">
                {formatDate(order.cancellation.cancelledAt)}
                {order.cancellation.cancelledBy?.name ? ` · by ${order.cancellation.cancelledBy.name}` : ""}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-none shadow-sm">
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold text-foreground">{order.orderCode}</h1>
                <OrderStatusBadge status={order.status} />
                <OrderPriorityBadge priority={order.priority} />
                <OrderPaymentStatusBadge status={order.paymentStatus} />
              </div>
              <Link href={`/dashboard/customers/${order.customer.id}`} className="inline-flex items-center gap-2 hover:opacity-80">
                <UserAvatar name={fullCustomerName} image={order.customer.profilePhotoUrl} className="size-7" />
                <span className="text-sm text-foreground">{fullCustomerName}</span>
                <span className="text-xs text-muted-foreground">{order.customer.customerCode}</span>
              </Link>
            </div>
            <div className="space-y-1 text-right text-sm">
              <p className="text-muted-foreground">
                Expected completion: <span className="text-foreground">{order.expectedCompletionDate ? formatDate(order.expectedCompletionDate) : "N/A"}</span>
              </p>
              <p className="text-muted-foreground">
                Event date: <span className="text-foreground">{order.eventDate ? formatDate(order.eventDate) : "N/A"}</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardContent>
          <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Quick Actions</p>
          <div className="flex flex-wrap gap-2">
            <button className={pillClass} onClick={() => setStatusOpen(true)}>
              Update Status
            </button>
            <button className={pillClass} onClick={openEditOrder}>
              Edit Order
            </button>
            <button className={pillClass} onClick={() => setNoteOpen(true)}>
              Add Note
            </button>
            <Link href={`/dashboard/quotations?orderId=${order.id}`} className={pillClass}>
              Create Quotation
            </Link>
            <Link href={`/dashboard/invoices/new?orderId=${order.id}`} className={pillClass}>
              Create Invoice
            </Link>
            <button className={pillClass} onClick={openScheduleFitting}>
              Schedule Fitting
            </button>
            {!isTerminal && (
              <button className={pillClass} onClick={() => setCompleteConfirmOpen(true)}>
                Mark Completed
              </button>
            )}
            <button className={pillClass} onClick={() => setDuplicateConfirmOpen(true)}>
              Duplicate
            </button>
            {!isTerminal && (
              <button
                className={cn(pillClass, "hover:border-danger/40 hover:bg-danger-soft hover:text-danger")}
                onClick={() => setCancelOpen(true)}
              >
                Cancel Order
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto scrollbar-thin">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="design">Design</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="production">Production</TabsTrigger>
            <TabsTrigger value="quality-delivery">Quality &amp; Delivery</TabsTrigger>
            {order.disputes.length > 0 && <TabsTrigger value="dispute">Dispute</TabsTrigger>}
            <TabsTrigger value="fitting">Fitting</TabsTrigger>
            <TabsTrigger value="alterations">Alterations</TabsTrigger>
            <TabsTrigger value="financials">Financials</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="activity-log">Activity Log</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview">
          <OrderOverviewTab order={order} editOpen={overviewEditOpen} onEditOpenChange={setOverviewEditOpen} />
        </TabsContent>

        <TabsContent value="design">
          <OrderDesignTab items={order.items} />
        </TabsContent>

        <TabsContent value="timeline">
          <Card className="border-none shadow-sm">
            <CardContent>
              <OrderTimelineView timeline={order.timeline} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="production">
          <OrderProductionTab
            orderId={order.id}
            status={order.status}
            stages={order.productionStages}
            updates={order.productionUpdates}
            isDelayed={order.isDelayed}
            delayReason={order.delayReason}
            expectedCompletionDate={order.expectedCompletionDate}
          />
        </TabsContent>

        <TabsContent value="quality-delivery">
          <OrderQualityDeliveryTab orderId={order.id} orderStatus={order.status} checklists={order.qualityControlChecklists} delivery={order.delivery} />
        </TabsContent>

        {order.disputes.length > 0 && (
          <TabsContent value="dispute">
            <OrderDisputeTab orderId={order.id} hasDispute={order.disputes.length > 0} />
          </TabsContent>
        )}

        <TabsContent value="fitting">
          <OrderFittingTab
            orderId={order.id}
            fittingSessions={order.fittingSessions}
            createOpen={fittingCreateOpen}
            onCreateOpenChange={setFittingCreateOpen}
          />
        </TabsContent>

        <TabsContent value="alterations">
          <OrderAlterationTab orderId={order.id} alterations={order.alterations} fittingSessions={order.fittingSessions} />
        </TabsContent>

        <TabsContent value="financials">
          <OrderFinancialsTab
            orderId={order.id}
            totalValue={order.totalValue}
            amountPaid={order.amountPaid}
            balanceDue={order.balanceDue}
            paymentStatus={order.paymentStatus}
            payout={order.payout}
          />
        </TabsContent>

        <TabsContent value="notes">
          <Card className="border-none shadow-sm">
            <CardContent>
              <OrderNotesTab orderId={order.id} notes={order.notes} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files">
          <Card className="border-none shadow-sm">
            <CardContent>
              <OrderFilesTab orderId={order.id} files={order.files} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity-log">
          <Card className="border-none shadow-sm">
            <CardContent>
              <OrderActivityTab activities={order.activities} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <OrderStatusDialog open={statusOpen} onOpenChange={setStatusOpen} orderId={order.id} currentStatus={order.status} />
      <OrderNoteDialog open={noteOpen} onOpenChange={setNoteOpen} orderId={order.id} />
      <CancelOrderDialog open={cancelOpen} onOpenChange={setCancelOpen} orderId={order.id} orderCode={order.orderCode} />
      <ConfirmDialog
        open={completeConfirmOpen}
        onOpenChange={setCompleteConfirmOpen}
        title="Mark order completed?"
        description={`${order.orderCode} will be marked as completed.`}
        confirmLabel="Mark Completed"
        onConfirm={markCompleted}
      />
      <ConfirmDialog
        open={duplicateConfirmOpen}
        onOpenChange={setDuplicateConfirmOpen}
        title="Duplicate this order?"
        description={`A new draft order will be created with the same customer, design, and pricing as ${order.orderCode}. You'll be taken to the new order to review it.`}
        confirmLabel="Duplicate"
        onConfirm={duplicateOrder}
      />
    </div>
  );
}
