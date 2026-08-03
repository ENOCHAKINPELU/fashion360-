import type { OrderTimelineStage, OrderType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = typeof prisma | Prisma.TransactionClient;

// Ordered, human-labeled definition of every milestone the Order Progress
// Timeline can display (section 8 of the Phase 6 spec).
export const ORDER_TIMELINE_STAGES: { stage: OrderTimelineStage; label: string }[] = [
  { stage: "ORDER_CREATED", label: "Order Created" },
  { stage: "CONSULTATION", label: "Consultation" },
  { stage: "MEASUREMENTS_CONFIRMED", label: "Measurements Confirmed" },
  { stage: "DESIGN_SELECTED", label: "Design Selected" },
  { stage: "DESIGN_CUSTOMIZED", label: "Design Customized" },
  { stage: "DESIGN_APPROVED", label: "Design Approved" },
  { stage: "QUOTATION_CREATED", label: "Quotation Created" },
  { stage: "DEPOSIT_PAID", label: "Deposit Paid" },
  { stage: "PRODUCTION_STARTED", label: "Production Started" },
  { stage: "CUTTING", label: "Cutting" },
  { stage: "SEWING", label: "Sewing" },
  { stage: "FINISHING", label: "Finishing" },
  { stage: "FITTING_SCHEDULED", label: "Fitting Scheduled" },
  { stage: "FITTING_COMPLETED", label: "Fitting Completed" },
  { stage: "ALTERATION_REQUIRED", label: "Alteration Required" },
  { stage: "FINAL_INSPECTION", label: "Final Inspection" },
  { stage: "QUALITY_CHECK", label: "Quality Check" },
  { stage: "COMPLETED", label: "Completed" },
  { stage: "READY_FOR_PICKUP", label: "Ready for Pickup" },
  { stage: "DELIVERY_CREATED", label: "Delivery Created" },
  { stage: "COURIER_ASSIGNED", label: "Courier Assigned" },
  { stage: "PICKED_UP", label: "Picked Up" },
  { stage: "IN_TRANSIT", label: "In Transit" },
  { stage: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
  { stage: "DELIVERED", label: "Delivered" },
  { stage: "CUSTOMER_CONFIRMED", label: "Customer Confirmed Receipt" },
  { stage: "PAYMENT_RELEASED", label: "Payment Released" },
  { stage: "CANCELLED", label: "Cancelled" },
];

const STAGES_NOT_APPLICABLE_BY_ORDER_TYPE: Record<OrderType, OrderTimelineStage[]> = {
  BESPOKE: ["CANCELLED", "ALTERATION_REQUIRED"],
  CUSTOM: ["CANCELLED", "ALTERATION_REQUIRED"],
  REMAKE: ["CANCELLED", "ALTERATION_REQUIRED"],
  READY_TO_WEAR: [
    "CANCELLED",
    "ALTERATION_REQUIRED",
    "CONSULTATION",
    "MEASUREMENTS_CONFIRMED",
    "DESIGN_SELECTED",
    "DESIGN_CUSTOMIZED",
    "DESIGN_APPROVED",
    "CUTTING",
    "SEWING",
  ],
  ALTERATION: [
    "CANCELLED",
    "DESIGN_SELECTED",
    "DESIGN_CUSTOMIZED",
    "DESIGN_APPROVED",
    "PRODUCTION_STARTED",
    "CUTTING",
    "SEWING",
  ],
};

export function defaultTimelineApplicability(orderType: OrderType): Record<OrderTimelineStage, boolean> {
  const excluded = new Set(STAGES_NOT_APPLICABLE_BY_ORDER_TYPE[orderType]);
  return Object.fromEntries(
    ORDER_TIMELINE_STAGES.map(({ stage }) => [stage, !excluded.has(stage)])
  ) as Record<OrderTimelineStage, boolean>;
}

export async function createOrderTimeline(
  db: Db,
  params: { orderId: string; businessId: string; orderType: OrderType; actorId?: string | null }
) {
  const applicability = defaultTimelineApplicability(params.orderType);
  const now = new Date();

  await db.orderTimelineEntry.createMany({
    data: ORDER_TIMELINE_STAGES.map(({ stage }, index) => ({
      orderId: params.orderId,
      businessId: params.businessId,
      stage,
      sortOrder: index,
      isApplicable: applicability[stage],
      status: stage === "ORDER_CREATED" ? "COMPLETED" : "NOT_STARTED",
      occurredAt: stage === "ORDER_CREATED" ? now : null,
      actorId: stage === "ORDER_CREATED" ? params.actorId ?? null : null,
    })),
  });
}

export async function markOrderTimelineStage(
  db: Db,
  params: {
    orderId: string;
    businessId: string;
    stage: OrderTimelineStage;
    status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED";
    note?: string;
    actorId?: string | null;
  }
) {
  await db.orderTimelineEntry.upsert({
    where: { orderId_stage: { orderId: params.orderId, stage: params.stage } },
    update: {
      status: params.status,
      isApplicable: true,
      occurredAt: params.status === "COMPLETED" ? new Date() : undefined,
      note: params.note,
      actorId: params.actorId ?? null,
    },
    create: {
      orderId: params.orderId,
      businessId: params.businessId,
      stage: params.stage,
      status: params.status,
      isApplicable: true,
      occurredAt: params.status === "COMPLETED" ? new Date() : null,
      note: params.note,
      actorId: params.actorId ?? null,
      sortOrder: ORDER_TIMELINE_STAGES.findIndex((s) => s.stage === params.stage),
    },
  });
}

// The subset of OrderStatus transitions with an unambiguous matching
// timeline milestone; other statuses (DRAFT, AWAITING_PAYMENT, ON_HOLD, ...)
// don't move the timeline by themselves.
export const STATUS_TIMELINE_STAGE: Partial<Record<string, OrderTimelineStage>> = {
  CONFIRMED: "DESIGN_APPROVED",
  IN_PRODUCTION: "PRODUCTION_STARTED",
  FITTING: "FITTING_SCHEDULED",
  ALTERATION: "ALTERATION_REQUIRED",
  FINAL_INSPECTION: "FINAL_INSPECTION",
  COMPLETED: "COMPLETED",
  READY_FOR_PICKUP: "READY_FOR_PICKUP",
  OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
  QUALITY_CHECK: "QUALITY_CHECK",
  IN_TRANSIT: "IN_TRANSIT",
};
