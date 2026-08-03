import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = typeof prisma | Prisma.TransactionClient;

export interface ActionItem {
  label: string;
  href: string;
}

// Part 31: computed live from real pending state — no persisted
// CustomerAction table to keep in sync (same reasoning as the Journey
// tracker above it).
export async function getCustomerActionItems(db: Db, customerProfileId: string): Promise<ActionItem[]> {
  const [
    pendingReview,
    pendingAccessRequests,
    acceptedRequestsAwaitingConsultation,
    designProjectsAwaitingReview,
    quotationsAwaitingReview,
    ordersAwaitingPayment,
    deliveriesToConfirm,
    delayedOrders,
  ] = await Promise.all([
      db.passportMeasurementProfile.findMany({ where: { customerProfileId, status: "PENDING_REVIEW" }, select: { id: true, name: true } }),
      db.measurementAccessRequest.count({ where: { customerProfileId, status: "PENDING" } }),
      db.serviceRequest.findMany({
        where: { customerProfileId, status: "ACCEPTED", appointments: { none: {} } },
        select: { id: true, requestCode: true },
      }),
      db.designPreview.findMany({
        where: { customerProfileId, orderId: null, status: "CUSTOMER_REVIEW" },
        select: { id: true, name: true, revisionCount: true },
      }),
      db.quotation.findMany({
        where: { customerProfileId, status: { in: ["SENT", "VIEWED"] } },
        select: { id: true, quotationNumber: true },
      }),
      db.order.findMany({
        where: { customerProfileId, status: "AWAITING_PAYMENT" },
        select: { id: true, orderCode: true },
      }),
      // Part 30: delivered but not yet confirmed/reported — nudges the
      // customer toward the dispute-window action rather than letting it
      // silently expire.
      db.delivery.findMany({
        where: { status: "DELIVERED", customerConfirmedAt: null, reportedProblemAt: null, order: { customerProfileId } },
        select: { orderId: true, order: { select: { orderCode: true } } },
      }),
      db.order.findMany({
        where: { customerProfileId, isDelayed: true },
        select: { id: true, orderCode: true },
      }),
    ]);

  const items: ActionItem[] = [];
  for (const p of pendingReview) items.push({ label: `Review measurements: ${p.name}`, href: "/account/measurements" });
  if (pendingAccessRequests > 0) {
    items.push({
      label: `${pendingAccessRequests} business${pendingAccessRequests > 1 ? "es want" : " wants"} measurement access`,
      href: "/account/measurements",
    });
  }
  for (const r of acceptedRequestsAwaitingConsultation) items.push({ label: `Book a consultation for ${r.requestCode}`, href: `/account/requests/${r.id}` });
  for (const d of designProjectsAwaitingReview) {
    items.push({
      label: `${d.revisionCount > 0 ? "Review revision" : "Review new design"}: ${d.name}`,
      href: `/account/design-projects/${d.id}`,
    });
  }
  for (const q of quotationsAwaitingReview) items.push({ label: `Review quotation ${q.quotationNumber}`, href: `/account/quotations/${q.id}` });
  for (const o of ordersAwaitingPayment) items.push({ label: `Complete payment for order ${o.orderCode}`, href: `/account/orders/${o.id}` });
  for (const d of deliveriesToConfirm) items.push({ label: `Confirm receipt for order ${d.order.orderCode}`, href: `/account/orders/${d.orderId}` });
  for (const o of delayedOrders) items.push({ label: `Respond to a production delay on order ${o.orderCode}`, href: `/account/orders/${o.id}` });

  return items;
}

// Part 32.
export async function getBusinessActionItems(db: Db, businessId: string): Promise<ActionItem[]> {
  const [
    newRequests,
    pendingAppointments,
    pendingCorrections,
    overdueConsultations,
    designsToCreate,
    designsToRevise,
    openFeedback,
    quotationsToSend,
    quotationDiscussions,
    ordersInProduction,
    ordersReadyForDeliveryCreation,
    disputes,
    eligiblePayouts,
  ] = await Promise.all([
      db.serviceRequest.count({ where: { businessId, status: "SUBMITTED" } }),
      db.appointment.count({ where: { businessId, status: "PENDING_CONFIRMATION" } }),
      db.measurementCorrectionRequest.count({ where: { measurementProfile: { accessGrants: { some: { businessId, revokedAt: null } } }, status: "PENDING" } }),
      db.appointment.count({
        where: { businessId, status: { in: ["CONFIRMED", "CHECKED_IN", "IN_PROGRESS"] }, endTime: { lt: new Date() } },
      }),
      db.designPreview.count({ where: { businessId, orderId: null, status: { in: ["DRAFT", "DESIGN_IN_PROGRESS"] } } }),
      db.designPreview.count({ where: { businessId, orderId: null, status: "REVISION_IN_PROGRESS" } }),
      db.designRevisionRequest.count({ where: { businessId, status: "OPEN", preview: { orderId: null } } }),
      db.quotation.count({ where: { businessId, designPreviewId: { not: null }, status: "DRAFT" } }),
      db.quotationComment.count({
        where: { businessId, authorType: "CUSTOMER", quotation: { designPreviewId: { not: null }, status: { in: ["SENT", "VIEWED"] } } },
      }),
      // Part 31: "quality check due" — every production stage is done but no
      // QC attempt has been recorded yet.
      db.order.findMany({
        where: { businessId, status: "IN_PRODUCTION", productionStages: { some: {} }, qualityControlChecklists: { none: {} } },
        select: { id: true, orderCode: true, productionStages: { select: { status: true } } },
      }),
      // Part 31: "delivery to create" — QC passed, delivery not yet created
      // (Part 12/14 merged into one action, per the delivery lib's docs).
      db.order.findMany({
        where: { businessId, status: "QUALITY_CHECK", delivery: null },
        select: { id: true, orderCode: true },
      }),
      // Part 31: "dispute to respond to" — never responded, or the customer
      // spoke last.
      db.dispute.findMany({
        where: { businessId, status: { in: ["OPEN", "UNDER_REVIEW"] } },
        select: { id: true, orderId: true, order: { select: { orderCode: true } }, responses: { orderBy: { createdAt: "desc" }, take: 1, select: { authorType: true } } },
      }),
      db.payout.count({ where: { businessId, status: "ELIGIBLE" } }),
    ]);

  const qualityCheckDue = ordersInProduction.filter((o) => o.productionStages.every((s) => s.status === "COMPLETED" || s.status === "SKIPPED"));
  const disputesAwaitingBusiness = disputes.filter((d) => d.responses.length === 0 || d.responses[0].authorType === "CUSTOMER");

  const items: ActionItem[] = [];
  if (newRequests > 0) items.push({ label: `${newRequests} new service request${newRequests > 1 ? "s" : ""} to review`, href: "/dashboard/service-requests?status=SUBMITTED" });
  if (pendingAppointments > 0) items.push({ label: `${pendingAppointments} appointment${pendingAppointments > 1 ? "s" : ""} awaiting confirmation`, href: "/dashboard/appointments" });
  if (pendingCorrections > 0) items.push({ label: `${pendingCorrections} measurement correction request${pendingCorrections > 1 ? "s" : ""}`, href: "/dashboard/customer-measurements" });
  if (overdueConsultations > 0) items.push({ label: `${overdueConsultations} consultation${overdueConsultations > 1 ? "s" : ""} to mark completed`, href: "/dashboard/appointments" });
  if (designsToCreate > 0) items.push({ label: `${designsToCreate} design${designsToCreate > 1 ? "s" : ""} to create`, href: "/dashboard/design-projects" });
  if (openFeedback > 0) items.push({ label: `${openFeedback} design change request${openFeedback > 1 ? "s" : ""} to review`, href: "/dashboard/design-projects" });
  if (designsToRevise > 0) items.push({ label: `${designsToRevise} design revision${designsToRevise > 1 ? "s" : ""} to create`, href: "/dashboard/design-projects" });
  if (quotationsToSend > 0) items.push({ label: `${quotationsToSend} quotation${quotationsToSend > 1 ? "s" : ""} to send`, href: "/dashboard/quotations" });
  if (quotationDiscussions > 0) items.push({ label: `${quotationDiscussions} quotation message${quotationDiscussions > 1 ? "s" : ""} to reply to`, href: "/dashboard/quotations" });
  for (const o of qualityCheckDue) items.push({ label: `Quality check due for order ${o.orderCode}`, href: `/dashboard/orders/${o.id}?tab=quality-delivery` });
  for (const o of ordersReadyForDeliveryCreation) items.push({ label: `Create delivery for order ${o.orderCode}`, href: `/dashboard/orders/${o.id}?tab=quality-delivery` });
  for (const d of disputesAwaitingBusiness) items.push({ label: `Respond to a dispute on order ${d.order.orderCode}`, href: `/dashboard/orders/${d.orderId}?tab=dispute` });
  if (eligiblePayouts > 0) items.push({ label: `${eligiblePayouts} payout${eligiblePayouts > 1 ? "s" : ""} eligible for release`, href: "/dashboard/payouts" });

  return items;
}
