import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = typeof prisma | Prisma.TransactionClient;

// Phase 7 pipeline: each set is "order has reached at least this stage" —
// OrderStatus isn't declared in strict pipeline order (legacy COMPLETED sits
// mid-enum), so membership sets are used rather than an index comparison.
// Exported for lib/cancellation-policy.ts, which needs the same
// paid/production/delivery stage boundaries to decide which cancellation
// refund percentage applies.
export const PRODUCTION_STARTED_STATUSES = new Set([
  "IN_PRODUCTION", "FITTING", "ALTERATION", "FINAL_INSPECTION", "QUALITY_CHECK", "QUALITY_CHECK_FAILED",
  "READY_FOR_PICKUP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "COMPLETED", "DISPUTED", "REFUND_PROCESSING", "REFUNDED",
]);
export const QUALITY_CHECK_STATUSES = new Set([
  "QUALITY_CHECK", "QUALITY_CHECK_FAILED", "READY_FOR_PICKUP", "IN_TRANSIT", "OUT_FOR_DELIVERY",
  "DELIVERED", "COMPLETED", "DISPUTED", "REFUND_PROCESSING", "REFUNDED",
]);
const READY_FOR_DELIVERY_STATUSES = new Set([
  "READY_FOR_PICKUP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "COMPLETED", "DISPUTED", "REFUND_PROCESSING", "REFUNDED",
]);
export const DELIVERED_STATUSES = new Set(["DELIVERED", "COMPLETED", "DISPUTED", "REFUND_PROCESSING", "REFUNDED"]);

export type JourneyStepState = "complete" | "current" | "upcoming";

export interface JourneyStep {
  key: string;
  label: string;
  state: JourneyStepState;
}

// Part 29/30: computed live from real Phase 3/4 state, never stored — a
// persisted CustomerJourney/JourneyStage table would just be a second,
// driftable copy of ServiceRequest/BusinessCustomerRelationship/Appointment/
// PassportMeasurementProfile status (same simplification as Phase 2's
// profile-completion helpers).
export async function computeCustomerJourney(db: Db, params: { customerProfileId: string; businessId: string }): Promise<JourneyStep[]> {
  const [serviceRequest, relationship, appointments, measurementProfiles, designProject, quotation] = await Promise.all([
    db.serviceRequest.findFirst({
      where: { customerProfileId: params.customerProfileId, businessId: params.businessId },
      orderBy: { createdAt: "desc" },
    }),
    db.businessCustomerRelationship.findUnique({
      where: { businessId_customerProfileId: { businessId: params.businessId, customerProfileId: params.customerProfileId } },
    }),
    db.appointment.findMany({
      where: { businessId: params.businessId, customerProfileId: params.customerProfileId },
      orderBy: { startTime: "desc" },
    }),
    db.passportMeasurementProfile.findMany({
      where: { customerProfileId: params.customerProfileId, accessGrants: { some: { businessId: params.businessId, revokedAt: null } } },
    }),
    db.designPreview.findFirst({
      where: { customerProfileId: params.customerProfileId, businessId: params.businessId, orderId: null },
      orderBy: { updatedAt: "desc" },
    }),
    db.quotation.findFirst({
      where: { customerProfileId: params.customerProfileId, businessId: params.businessId },
      orderBy: { updatedAt: "desc" },
      include: { order: { select: { id: true, status: true, paymentStatus: true } } },
    }),
  ]);

  const delivery = quotation?.order
    ? await db.delivery.findUnique({ where: { orderId: quotation.order.id }, select: { status: true, customerConfirmedAt: true } })
    : null;

  const DESIGN_REVIEW_STATUSES = new Set([
    "CUSTOMER_REVIEW",
    "CHANGES_REQUESTED",
    "REVISION_IN_PROGRESS",
    "REVISION_SUBMITTED",
    "CUSTOMER_APPROVED",
    "DESIGN_LOCKED",
  ]);
  const DESIGN_APPROVED_STATUSES = new Set(["CUSTOMER_APPROVED", "DESIGN_LOCKED"]);

  const reached = {
    service_requested: !!serviceRequest,
    designer_connected: relationship?.status === "ACTIVE",
    consultation_scheduled: appointments.some((a) => ["PENDING_CONFIRMATION", "SCHEDULED", "CONFIRMED", "RESCHEDULE_REQUESTED", "CHECKED_IN", "IN_PROGRESS", "COMPLETED"].includes(a.status)),
    consultation_completed: appointments.some((a) => a.status === "COMPLETED"),
    measurements_pending: measurementProfiles.some((p) => p.status === "DRAFT" || p.status === "PENDING_REVIEW"),
    measurements_confirmed: measurementProfiles.some((p) => p.status === "CONFIRMED"),
    design_in_progress: !!designProject,
    design_review: !!designProject && DESIGN_REVIEW_STATUSES.has(designProject.status),
    design_approved: !!designProject && DESIGN_APPROVED_STATUSES.has(designProject.status),
    quotation_received: !!quotation && ["SENT", "VIEWED", "ACCEPTED", "CONVERTED"].includes(quotation.status),
    quotation_accepted: !!quotation && ["ACCEPTED", "CONVERTED"].includes(quotation.status),
    payment_secured: quotation?.order?.paymentStatus === "PAID",
    order_confirmed: !!quotation?.order && quotation.order.status !== "AWAITING_PAYMENT" && quotation.order.status !== "DRAFT",
    production_started: PRODUCTION_STARTED_STATUSES.has(quotation?.order?.status ?? ""),
    quality_check: QUALITY_CHECK_STATUSES.has(quotation?.order?.status ?? ""),
    ready_for_delivery: READY_FOR_DELIVERY_STATUSES.has(quotation?.order?.status ?? ""),
    delivered: DELIVERED_STATUSES.has(quotation?.order?.status ?? ""),
    customer_confirmed: !!delivery?.customerConfirmedAt,
    completed: quotation?.order?.status === "COMPLETED",
  };

  const ORDER: { key: keyof typeof reached; label: string }[] = [
    { key: "service_requested", label: "Service Requested" },
    { key: "designer_connected", label: "Designer Connected" },
    { key: "consultation_scheduled", label: "Consultation Scheduled" },
    { key: "consultation_completed", label: "Consultation Completed" },
    { key: "measurements_pending", label: "Measurements Pending" },
    { key: "measurements_confirmed", label: "Measurements Confirmed" },
    { key: "design_in_progress", label: "Design In Progress" },
    { key: "design_review", label: "Design Review" },
    { key: "design_approved", label: "Design Approved" },
    { key: "quotation_received", label: "Quotation Received" },
    { key: "quotation_accepted", label: "Quotation Accepted" },
    { key: "payment_secured", label: "Payment Verified" },
    { key: "order_confirmed", label: "Order Confirmed" },
    { key: "production_started", label: "Production Started" },
    { key: "quality_check", label: "Quality Check" },
    { key: "ready_for_delivery", label: "Ready for Delivery" },
    { key: "delivered", label: "Delivered" },
    { key: "customer_confirmed", label: "Receipt Confirmed" },
    { key: "completed", label: "Completed" },
  ];

  // "Measurements Pending" reads as satisfied by either an in-progress
  // capture OR having moved past it entirely (confirmed) — a customer who
  // goes straight from consultation to confirmed measurements shouldn't
  // show a false gap.
  const lastCompleteIndex = (() => {
    let last = -1;
    for (let i = 0; i < ORDER.length; i++) {
      const key = ORDER[i].key;
      const satisfied = key === "measurements_pending" ? reached.measurements_pending || reached.measurements_confirmed : reached[key];
      if (satisfied) last = i;
      else if (last >= 0) break; // stop at the first genuine gap after progress began
    }
    return last;
  })();

  return ORDER.map((step, i) => ({
    key: step.key,
    label: step.label,
    state: i <= lastCompleteIndex ? "complete" : i === lastCompleteIndex + 1 ? "current" : "upcoming",
  }));
}
