import type { Prisma, OrderPaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { markOrderTimelineStage } from "@/lib/order-timeline";
import { logOrderActivity } from "@/lib/order-activity";

type Db = typeof prisma | Prisma.TransactionClient;

// Recomputes the existing Phase 6 Order.amountPaid/balanceDue/paymentStatus
// fields from this order's invoices, so the Orders module keeps reflecting
// reality without Phase 8 owning a parallel, disconnected set of totals.
// Deliberately never touches Order.status/currentStage (Phase 7's precedent:
// payment/approval events move the *timeline*, never auto-advance the order
// status a business hasn't configured for automatic progression) — and only
// overwrites Order.totalValue once a non-void invoice exists, since from
// that point the invoice — not the original item estimate — is the
// authoritative billed amount.
export async function syncOrderFinancials(db: Db, params: { orderId: string; businessId: string; actorId?: string | null }) {
  const invoices = await db.invoice.findMany({
    where: { orderId: params.orderId, status: { notIn: ["VOID", "CANCELLED"] } },
  });

  const order = await db.order.findUniqueOrThrow({ where: { id: params.orderId }, select: { totalValue: true } });

  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const amountPaid = invoices.reduce((sum, inv) => sum + inv.amountPaid, 0);
  const referenceTotal = invoices.length > 0 ? totalInvoiced : order.totalValue;
  const balanceDue = Math.max(0, referenceTotal - amountPaid);

  let paymentStatus: OrderPaymentStatus = "PENDING";
  if (invoices.length > 0) {
    const now = new Date();
    const isOverdue = invoices.some((inv) => inv.dueDate && inv.dueDate < now && inv.status !== "PAID");
    if (balanceDue <= 0.01 && amountPaid > 0) paymentStatus = "PAID";
    else if (amountPaid > 0) paymentStatus = "PARTIALLY_PAID";
    else paymentStatus = isOverdue ? "OVERDUE" : "PENDING";
  }

  // Part 14: "production cannot begin before payment verification" — the one
  // narrow, explicit exception to "never touches Order.status" above. Only
  // fires for an order still sitting in AWAITING_PAYMENT (the status the new
  // escrow flow creates orders in) once it's genuinely paid in full; a
  // business using AWAITING_PAYMENT manually gets the same correct behavior,
  // every other status is left entirely alone.
  const currentOrder = await db.order.findUniqueOrThrow({ where: { id: params.orderId }, select: { status: true } });
  const advanceToReadyForProduction = currentOrder.status === "AWAITING_PAYMENT" && paymentStatus === "PAID";

  await db.order.update({
    where: { id: params.orderId },
    data: {
      amountPaid,
      balanceDue,
      paymentStatus,
      ...(invoices.length > 0 ? { totalValue: totalInvoiced } : {}),
      ...(advanceToReadyForProduction ? { status: "READY_FOR_PRODUCTION" } : {}),
    },
  });

  if (amountPaid > 0) {
    await markOrderTimelineStage(db, {
      orderId: params.orderId,
      businessId: params.businessId,
      stage: "DEPOSIT_PAID",
      status: "COMPLETED",
      actorId: params.actorId,
    });
  }

  if (advanceToReadyForProduction) {
    await logOrderActivity(db, {
      orderId: params.orderId,
      businessId: params.businessId,
      type: "STATUS_CHANGED",
      title: "Payment verified, order confirmed, ready for production",
      previousValue: "AWAITING_PAYMENT",
      newValue: "READY_FOR_PRODUCTION",
      actorId: params.actorId,
    });
  }
}
