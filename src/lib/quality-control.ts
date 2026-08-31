import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/rbac";
import { logOrderActivity } from "@/lib/order-activity";
import { markOrderTimelineStage } from "@/lib/order-timeline";
import { notifyFinancialEvent } from "@/lib/financial-notifications";
import { notifyCustomer } from "@/lib/service-request-notify";

type Db = typeof prisma | Prisma.TransactionClient;

export { DEFAULT_QC_ITEMS } from "@/lib/quality-control-items";

// Part 10/11: one checklist attempt per call — a failed attempt never gets
// mutated into a pass; a fresh attempt (attemptNumber + 1) is created after
// correction, so the full QC history for an order is always intact. Only a
// checklist where every item passed AND the explicit confirmation statement
// was given can result in PASSED; anything else is FAILED and requires the
// Part 11 failure fields.
export async function submitQualityCheck(
  db: Db,
  params: {
    orderId: string;
    businessId: string;
    items: { label: string; passed: boolean; notes?: string }[];
    confirmed: boolean;
    notes?: string;
    photos?: string[];
    failure?: { issue: string; correctionRequired: string; expectedCorrectionDate?: Date | null };
    actorId: string;
  }
) {
  const order = await db.order.findUniqueOrThrow({ where: { id: params.orderId } });
  if (order.businessId !== params.businessId) throw new ApiError(404, "Order not found");
  if (params.items.length === 0) throw new ApiError(400, "Add at least one checklist item");

  const allPassed = params.items.every((i) => i.passed);
  const result = allPassed && params.confirmed ? "PASSED" : "FAILED";
  if (result === "FAILED" && !params.failure) {
    throw new ApiError(400, "Record the issue and required correction for a failed quality check");
  }

  const previousAttempts = await db.qualityControlChecklist.count({ where: { orderId: params.orderId } });
  const attemptNumber = previousAttempts + 1;

  const checklist = await db.qualityControlChecklist.create({
    data: {
      orderId: params.orderId,
      businessId: params.businessId,
      attemptNumber,
      result,
      confirmed: params.confirmed,
      notes: params.notes,
      photos: params.photos ?? [],
      confirmedById: params.actorId,
      completedAt: new Date(),
      items: { create: params.items.map((item, index) => ({ label: item.label, passed: item.passed, notes: item.notes, sortOrder: index })) },
      ...(result === "FAILED" && params.failure
        ? {
            failure: {
              create: {
                businessId: params.businessId,
                issue: params.failure.issue,
                correctionRequired: params.failure.correctionRequired,
                expectedCorrectionDate: params.failure.expectedCorrectionDate,
              },
            },
          }
        : {}),
    },
    include: { items: true, failure: true },
  });

  if (result === "PASSED") {
    await db.order.update({ where: { id: params.orderId }, data: { status: "QUALITY_CHECK" } });
    await markOrderTimelineStage(db, { orderId: params.orderId, businessId: params.businessId, stage: "QUALITY_CHECK", status: "COMPLETED", actorId: params.actorId });
    await logOrderActivity(db, { orderId: params.orderId, businessId: params.businessId, type: "QUALITY_CHECK_PASSED", title: "Quality check passed", actorId: params.actorId });
    await notifyFinancialEvent(db, {
      businessId: params.businessId,
      orderId: params.orderId,
      assignedDesignerId: order.assignedDesignerId,
      title: "Quality check passed",
      body: `${order.orderCode} passed quality control and can move to Ready for Delivery.`,
      type: "success",
      event: "PRODUCTION_COMPLETED",
    });
    if (order.customerProfileId) {
      await notifyCustomer(db, {
        businessId: params.businessId,
        customerProfileId: order.customerProfileId,
        title: "Your order passed quality control",
        body: `${order.orderCode} has passed quality control and is almost ready.`,
        type: "success",
        event: "PRODUCTION_COMPLETED",
      });
    }
  } else {
    // Part 11: the order returns to PRODUCTION — it must pass through
    // QUALITY_CHECK again after correction, never skip straight to
    // Ready for Delivery.
    await db.order.update({ where: { id: params.orderId }, data: { status: "QUALITY_CHECK_FAILED" } });
    await logOrderActivity(db, {
      orderId: params.orderId,
      businessId: params.businessId,
      type: "QUALITY_CHECK_FAILED",
      title: "Quality check failed",
      description: params.failure?.issue,
      actorId: params.actorId,
    });
    await notifyFinancialEvent(db, {
      businessId: params.businessId,
      orderId: params.orderId,
      assignedDesignerId: order.assignedDesignerId,
      title: "Quality check failed",
      body: `${order.orderCode} failed quality control: ${params.failure?.issue}`,
      type: "danger",
    });
  }

  return checklist;
}

// Part 11: after correcting the issue, the business sends the order back
// into PRODUCTION explicitly, ready for a fresh QC attempt.
export async function resumeProductionAfterQualityFailure(db: Db, params: { orderId: string; businessId: string; actorId: string }) {
  const order = await db.order.findUniqueOrThrow({ where: { id: params.orderId } });
  if (order.businessId !== params.businessId) throw new ApiError(404, "Order not found");
  if (order.status !== "QUALITY_CHECK_FAILED") throw new ApiError(400, "This order is not currently in a failed quality check state");

  const updated = await db.order.update({ where: { id: params.orderId }, data: { status: "IN_PRODUCTION" } });
  await logOrderActivity(db, { orderId: params.orderId, businessId: params.businessId, type: "STATUS_CHANGED", title: "Returned to production after correction", actorId: params.actorId });

  if (order.customerProfileId) {
    await notifyCustomer(db, {
      businessId: params.businessId,
      customerProfileId: order.customerProfileId,
      title: "Your order is being corrected",
      body: `${order.orderCode} is back in production to address a quality issue.`,
      type: "info",
    });
  }

  return updated;
}
