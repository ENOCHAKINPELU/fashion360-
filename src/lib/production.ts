import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/rbac";
import { logOrderActivity } from "@/lib/order-activity";
import { markOrderTimelineStage } from "@/lib/order-timeline";
import { notifyFinancialEvent } from "@/lib/financial-notifications";
import { notifyCustomer } from "@/lib/service-request-notify";

type Db = typeof prisma | Prisma.TransactionClient;

// Part 3/4: the moment production actually begins — only valid once the
// order is confirmed and paid (READY_FOR_PRODUCTION is the status Phase 6's
// platform-mediated order flow already lands an order in the instant it's
// fully paid).
export async function startProduction(db: Db, params: { orderId: string; businessId: string; actorId?: string | null }) {
  const order = await db.order.findUniqueOrThrow({ where: { id: params.orderId } });
  if (order.businessId !== params.businessId) throw new ApiError(404, "Order not found");
  if (order.status !== "READY_FOR_PRODUCTION") {
    throw new ApiError(400, "Production can only start once the order is confirmed and ready for production");
  }

  const updated = await db.order.update({ where: { id: params.orderId }, data: { status: "IN_PRODUCTION", currentStage: "In Production" } });

  await markOrderTimelineStage(db, { orderId: params.orderId, businessId: params.businessId, stage: "PRODUCTION_STARTED", status: "COMPLETED", actorId: params.actorId });
  await logOrderActivity(db, {
    orderId: params.orderId,
    businessId: params.businessId,
    type: "STATUS_CHANGED",
    title: "Production started",
    previousValue: "READY_FOR_PRODUCTION",
    newValue: "IN_PRODUCTION",
    actorId: params.actorId,
  });

  if (order.customerProfileId) {
    await notifyCustomer(db, {
      businessId: params.businessId,
      customerProfileId: order.customerProfileId,
      title: "Production has started",
      body: `Work on your order ${order.orderCode} has begun.`,
      type: "info",
      event: "PRODUCTION_STARTED",
    });
  }

  return updated;
}

// Part 8: a customer-facing status note, deliberately separate from
// OrderProductionStage.notes (internal-only, never shown to the customer).
export async function postProductionUpdate(
  db: Db,
  params: { orderId: string; businessId: string; title: string; body: string; photos?: string[]; createdById: string }
) {
  const order = await db.order.findUniqueOrThrow({ where: { id: params.orderId } });
  if (order.businessId !== params.businessId) throw new ApiError(404, "Order not found");

  const update = await db.productionUpdate.create({
    data: {
      orderId: params.orderId,
      businessId: params.businessId,
      title: params.title,
      body: params.body,
      photos: params.photos ?? [],
      createdById: params.createdById,
    },
  });

  await logOrderActivity(db, {
    orderId: params.orderId,
    businessId: params.businessId,
    type: "PRODUCTION_UPDATE_POSTED",
    title: params.title,
    description: params.body,
    actorId: params.createdById,
  });

  if (order.customerProfileId) {
    await notifyCustomer(db, {
      businessId: params.businessId,
      customerProfileId: order.customerProfileId,
      title: params.title,
      body: params.body,
      type: "info",
    });
  }

  return update;
}

// Part 9/36: the business flags its own order as delayed with a reason and a
// revised date — never inferred automatically, and never auto-cancels
// anything (the customer decides what happens next from here).
export async function flagProductionDelay(
  db: Db,
  params: { orderId: string; businessId: string; reason: string; updatedExpectedCompletionDate: Date; actorId: string }
) {
  const order = await db.order.findUniqueOrThrow({ where: { id: params.orderId } });
  if (order.businessId !== params.businessId) throw new ApiError(404, "Order not found");

  const updated = await db.order.update({
    where: { id: params.orderId },
    data: {
      isDelayed: true,
      delayReason: params.reason,
      delayedAt: new Date(),
      expectedCompletionDate: params.updatedExpectedCompletionDate,
    },
  });

  await logOrderActivity(db, {
    orderId: params.orderId,
    businessId: params.businessId,
    type: "ORDER_UPDATED",
    title: "Production delayed",
    description: params.reason,
    actorId: params.actorId,
  });

  await notifyFinancialEvent(db, {
    businessId: params.businessId,
    orderId: params.orderId,
    assignedDesignerId: order.assignedDesignerId,
    title: "Order marked as delayed",
    body: `${order.orderCode} was flagged as delayed: ${params.reason}`,
    type: "warning",
  });

  if (order.customerProfileId) {
    await notifyCustomer(db, {
      businessId: params.businessId,
      customerProfileId: order.customerProfileId,
      title: "Your order has been delayed",
      body: `${params.reason} A new expected completion date has been set.`,
      type: "warning",
    });
  }

  return updated;
}

// Part 36: the customer's own response to a delay — never auto-cancels.
export async function respondToProductionDelay(
  db: Db,
  params: { orderId: string; customerProfileId: string; action: "accept" | "request-cancellation" | "report-issue"; note?: string }
) {
  const order = await db.order.findUniqueOrThrow({ where: { id: params.orderId } });
  if (order.customerProfileId !== params.customerProfileId) throw new ApiError(404, "Order not found");
  if (!order.isDelayed) throw new ApiError(400, "This order isn't currently flagged as delayed");

  if (params.action === "accept") {
    const updated = await db.order.update({ where: { id: params.orderId }, data: { isDelayed: false } });
    await logOrderActivity(db, { orderId: params.orderId, businessId: order.businessId, type: "ORDER_UPDATED", title: "Customer accepted the new completion date" });
    await notifyFinancialEvent(db, {
      businessId: order.businessId,
      orderId: params.orderId,
      assignedDesignerId: order.assignedDesignerId,
      title: "Customer accepted the delay",
      body: `${order.orderCode}'s customer accepted the updated completion date.`,
      type: "info",
    });
    return updated;
  }

  const title = params.action === "request-cancellation" ? "Customer requested cancellation due to delay" : "Customer reported an issue with the delay";
  await logOrderActivity(db, { orderId: params.orderId, businessId: order.businessId, type: "ORDER_UPDATED", title, description: params.note });
  await notifyFinancialEvent(db, {
    businessId: order.businessId,
    orderId: params.orderId,
    assignedDesignerId: order.assignedDesignerId,
    title,
    body: params.note ?? `${order.orderCode}'s customer responded to the delay notice.`,
    type: "warning",
  });

  return order;
}
