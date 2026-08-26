import type { Prisma, DeliveryStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/rbac";
import { logAuditEvent } from "@/lib/audit-log";
import { notifyCustomer, notifyBusinessOwners } from "@/lib/service-request-notify";
import { recordDeliveryEvent } from "@/lib/delivery";
import { resolveLogisticsProvider } from "@/lib/logistics-providers";
import { addAdminOrderNote } from "@/lib/admin-orders";

const PAGE_SIZE = 20;

// ============================================================================
// Admin Phase 8: Delivery & Logistics Management
// ============================================================================
//
// AUDIT SUMMARY (see the phase report for the full write-up): Delivery and
// DeliveryEvent (schema.prisma) already model a real 10-value lifecycle,
// already enforced by lib/delivery.ts's recordDeliveryEvent — the one place
// a Delivery's status is allowed to change, already called from the
// business's own create/cancel routes and from the courier webhook route
// (api/deliveries/webhook/[provider]/[businessId]). This file is a
// read-mostly layer over that, exactly like Phase 5/6/7 were over
// ServiceRequest/Order/Payment — no second delivery-tracking system.
//
// Escrow integration (the brief's own explicit instruction: "do NOT release
// funds here"): already true today, for free. recordDeliveryEvent updates
// Order.status on DELIVERED but never calls lib/payout.ts's
// makePayoutEligible — that decision is made entirely separately, by
// lib/payout.ts's evaluatePayoutEligibility (delivered + confirmed-or-
// window-expired + no dispute), triggered from customer confirmation, the
// lazy window-expiry sweep, or dispute resolution. The Delivery module and
// the Payment module were already decoupled before this phase touched
// anything; nothing here changes that boundary.

export const TERMINAL_STATUSES: DeliveryStatus[] = ["DELIVERED", "CANCELLED", "FAILED", "RETURNED"];

export const FILTERABLE_STATUSES: DeliveryStatus[] = [
  "CREATED",
  "COURIER_ASSIGNED",
  "PICKUP_SCHEDULED",
  "PICKED_UP",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "FAILED",
  "CANCELLED",
  "RETURNED",
];

// The brief's own "standardized statuses" (Awaiting Dispatch / Awaiting
// Pickup / Picked Up / In Transit / Out for Delivery / Delivered / Delivery
// Failed / Returned / Cancelled — 9 labels) mapped onto the real 10-value
// DeliveryStatus enum, exactly as every prior Admin phase relabeled a real
// enum for display rather than inventing a second, parallel status set.
// COURIER_ASSIGNED and PICKUP_SCHEDULED both read as "Awaiting Pickup" —
// the real enum's finer distinction (whether a courier has confirmed vs.
// merely a pickup slot is booked) still drives the raw status filter and
// the timeline, just not a second summary label.
export const STATUS_DISPLAY_LABELS: Record<DeliveryStatus, string> = {
  CREATED: "Awaiting Dispatch",
  COURIER_ASSIGNED: "Awaiting Pickup",
  PICKUP_SCHEDULED: "Awaiting Pickup",
  PICKED_UP: "Picked Up",
  IN_TRANSIT: "In Transit",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  FAILED: "Delivery Failed",
  CANCELLED: "Cancelled",
  RETURNED: "Returned",
};

// Configurable thresholds — no SLA exists yet anywhere in Fashion360 for
// logistics, so these are plain, documented, adjustable numbers, same
// reasoning every prior phase's stuck-record thresholds used.
export const LATE_PICKUP_HOURS = 48; // a courier assigned/scheduled with no pickup recorded
export const REPEATED_ATTEMPTS_THRESHOLD = 2; // FAILED DeliveryEvents logged against one delivery
export const RECENT_TERMINAL_WINDOW_DAYS = 7; // surfaced for visibility, not action

export type IssueCategory = "LATE_PICKUP" | "LATE_DELIVERY" | "FAILED_ATTEMPT" | "REPEATED_ATTEMPTS" | "RETURNED";

export interface AttentionFlag {
  deliveryId: string;
  category: IssueCategory;
  reason: string;
  recommendedAction: string;
  since: Date;
}

// The brief's own five delay/issue categories (#DELAYS), each a cheap
// indexed aggregate over the whole table — never per-row, never N+1. Every
// signal here is a real, already-stored field or event count; "Recommended
// Action" is plain guidance text, not a stored value or an automated
// consequence — the brief's own admin-actions section is explicit that
// Admin escalates or contacts, it doesn't auto-remediate.
async function resolveAttentionFlags(): Promise<AttentionFlag[]> {
  const now = new Date();
  const latePickupCutoff = new Date(now.getTime() - LATE_PICKUP_HOURS * 60 * 60 * 1000);

  const [latePickups, lateDeliveries, failedAttempts, repeatedAttemptGroups, returned] = await Promise.all([
    prisma.delivery.findMany({
      where: { status: { in: ["CREATED", "COURIER_ASSIGNED", "PICKUP_SCHEDULED"] }, pickedUpAt: null, createdAt: { lte: latePickupCutoff } },
      select: { id: true, createdAt: true },
    }),
    prisma.delivery.findMany({
      where: { estimatedDeliveryDate: { lt: now }, status: { notIn: TERMINAL_STATUSES } },
      select: { id: true, estimatedDeliveryDate: true },
    }),
    prisma.delivery.findMany({ where: { status: "FAILED" }, select: { id: true, updatedAt: true } }),
    prisma.deliveryEvent.groupBy({ by: ["deliveryId"], where: { type: "FAILED" }, _count: true, having: { deliveryId: { _count: { gte: REPEATED_ATTEMPTS_THRESHOLD } } } }),
    prisma.delivery.findMany({ where: { status: "RETURNED" }, select: { id: true, updatedAt: true } }),
  ]);

  const flags: AttentionFlag[] = [
    ...latePickups.map((d) => ({
      deliveryId: d.id,
      category: "LATE_PICKUP" as const,
      reason: `No pickup recorded over ${LATE_PICKUP_HOURS}h after dispatch`,
      recommendedAction: "Contact the courier to confirm pickup, or reassign",
      since: d.createdAt,
    })),
    ...lateDeliveries.map((d) => ({
      deliveryId: d.id,
      category: "LATE_DELIVERY" as const,
      reason: "Past the estimated delivery date, not yet delivered",
      recommendedAction: "Contact the courier for a status update; notify the customer of the delay",
      since: d.estimatedDeliveryDate!,
    })),
    ...failedAttempts.map((d) => ({
      deliveryId: d.id,
      category: "FAILED_ATTEMPT" as const,
      reason: "Delivery attempt failed",
      recommendedAction: "Review the failure reason; re-dispatch, contact the customer to reschedule, or process a return",
      since: d.updatedAt,
    })),
    ...returned.map((d) => ({
      deliveryId: d.id,
      category: "RETURNED" as const,
      reason: "Parcel returned to the business",
      recommendedAction: "Confirm the return was received; coordinate a refund or reshipment with the business",
      since: d.updatedAt,
    })),
  ];

  if (repeatedAttemptGroups.length) {
    const deliveryIds = repeatedAttemptGroups.map((g) => g.deliveryId);
    const deliveries = await prisma.delivery.findMany({ where: { id: { in: deliveryIds } }, select: { id: true, updatedAt: true } });
    for (const d of deliveries) {
      flags.push({
        deliveryId: d.id,
        category: "REPEATED_ATTEMPTS",
        reason: `${REPEATED_ATTEMPTS_THRESHOLD}+ failed delivery attempts logged`,
        recommendedAction: "Escalate to the courier for an updated attempt, or arrange manual delivery",
        since: d.updatedAt,
      });
    }
  }

  return flags;
}

export interface AdminDeliveryListParams {
  q?: string;
  status?: DeliveryStatus;
  courier?: string;
  city?: string;
  dateFrom?: string;
  dateTo?: string;
  delayed?: boolean;
  returned?: boolean;
  failed?: boolean;
  // Deep-link only (from a specific customer's/designer's own Admin detail
  // page) — same reasoning as every prior phase's designerId/
  // customerProfileId: the search box already covers "search by customer/
  // designer name."
  designerId?: string;
  customerProfileId?: string;
  page?: number;
}

export async function getAdminDeliveryList(params: AdminDeliveryListParams) {
  const page = Math.max(1, params.page ?? 1);
  const search = params.q?.trim();

  const [attentionFlags, escalatedIds] = await Promise.all([resolveAttentionFlags(), getEscalatedDeliveryIds()]);
  const attentionByDeliveryId = new Map<string, AttentionFlag>();
  for (const f of attentionFlags) if (!attentionByDeliveryId.has(f.deliveryId)) attentionByDeliveryId.set(f.deliveryId, f);

  const conditions: Prisma.DeliveryWhereInput[] = [];
  if (search) {
    conditions.push({
      OR: [
        { id: { equals: search } },
        { trackingNumber: { contains: search, mode: "insensitive" } },
        { courierName: { contains: search, mode: "insensitive" } },
        { order: { orderCode: { contains: search, mode: "insensitive" } } },
        { order: { customer: { firstName: { contains: search, mode: "insensitive" } } } },
        { order: { customer: { lastName: { contains: search, mode: "insensitive" } } } },
        { order: { customer: { email: { contains: search, mode: "insensitive" } } } },
        { order: { customer: { phone: { contains: search, mode: "insensitive" } } } },
        { business: { name: { contains: search, mode: "insensitive" } } },
      ],
    });
  }
  if (params.status) conditions.push({ status: params.status });
  if (params.courier) conditions.push({ courierName: { contains: params.courier, mode: "insensitive" } });
  if (params.city) {
    conditions.push({ OR: [{ order: { customer: { city: { contains: params.city, mode: "insensitive" } } } }, { business: { city: { contains: params.city, mode: "insensitive" } } }] });
  }
  if (params.dateFrom || params.dateTo) {
    conditions.push({
      createdAt: {
        ...(params.dateFrom ? { gte: new Date(params.dateFrom) } : {}),
        ...(params.dateTo ? { lte: new Date(`${params.dateTo}T23:59:59.999Z`) } : {}),
      },
    });
  }
  if (params.delayed) conditions.push({ estimatedDeliveryDate: { lt: new Date() }, status: { notIn: TERMINAL_STATUSES } });
  if (params.returned) conditions.push({ status: "RETURNED" });
  if (params.failed) conditions.push({ status: "FAILED" });
  if (params.designerId) conditions.push({ businessId: params.designerId });
  if (params.customerProfileId) conditions.push({ order: { customerProfileId: params.customerProfileId } });

  const where: Prisma.DeliveryWhereInput = conditions.length ? { AND: conditions } : {};

  const [total, deliveries] = await Promise.all([
    prisma.delivery.count({ where }),
    prisma.delivery.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        status: true,
        trackingNumber: true,
        courierName: true,
        pickedUpAt: true,
        estimatedDeliveryDate: true,
        updatedAt: true,
        order: {
          select: {
            id: true,
            orderCode: true,
            customer: { select: { firstName: true, lastName: true } },
            customerProfileId: true,
          },
        },
        business: { select: { id: true, name: true } },
      },
    }),
  ]);

  return {
    deliveries: deliveries.map((d) => ({
      id: d.id,
      status: d.status,
      trackingNumber: d.trackingNumber,
      courierName: d.courierName,
      pickedUpAt: d.pickedUpAt,
      estimatedDeliveryDate: d.estimatedDeliveryDate,
      updatedAt: d.updatedAt,
      orderId: d.order.id,
      orderCode: d.order.orderCode,
      customerProfileId: d.order.customerProfileId,
      customerName: `${d.order.customer.firstName} ${d.order.customer.lastName}`.trim(),
      designerId: d.business.id,
      designerName: d.business.name,
      attention: attentionByDeliveryId.get(d.id) ?? null,
      escalated: escalatedIds.has(d.id),
    })),
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

// The brief's 8 summary cards, computed from a single groupBy (never one
// count() per bucket). "Ready for Dispatch" reads as CREATED — in this
// system, a delivery is only ever created in the same action that marks its
// order READY_FOR_PICKUP (lib/delivery.ts's createDeliveryForOrder, Part
// 12/14: the two are folded into one step) — so there's no real
// "order ready, delivery not yet created" state to query separately, and
// CREATED (package made, courier not yet assigned) is the honest match for
// "ready to dispatch."
export async function getAdminDeliveryStats() {
  const [statusGroups, delayedCount, attentionFlags] = await Promise.all([
    prisma.delivery.groupBy({ by: ["status"], _count: true }),
    prisma.delivery.count({ where: { estimatedDeliveryDate: { lt: new Date() }, status: { notIn: TERMINAL_STATUSES } } }),
    resolveAttentionFlags(),
  ]);
  const counts = new Map(statusGroups.map((g) => [g.status, g._count]));
  const get = (s: DeliveryStatus) => counts.get(s) ?? 0;
  const sumStatuses = (statuses: DeliveryStatus[]) => statuses.reduce((sum, s) => sum + get(s), 0);

  return {
    readyForDispatch: get("CREATED"),
    awaitingCourierPickup: sumStatuses(["COURIER_ASSIGNED", "PICKUP_SCHEDULED"]),
    inTransit: sumStatuses(["PICKED_UP", "IN_TRANSIT"]),
    outForDelivery: get("OUT_FOR_DELIVERY"),
    delivered: get("DELIVERED"),
    delayed: delayedCount,
    failed: get("FAILED"),
    returned: get("RETURNED"),
    needsAttention: new Set(attentionFlags.map((f) => f.deliveryId)).size,
  };
}

export async function getDeliveriesNeedingAttention(limit = 10) {
  const flags = await resolveAttentionFlags();
  if (flags.length === 0) return [];

  const byDeliveryId = new Map<string, AttentionFlag>();
  for (const f of flags) if (!byDeliveryId.has(f.deliveryId)) byDeliveryId.set(f.deliveryId, f);

  const sorted = [...byDeliveryId.values()].sort((a, b) => a.since.getTime() - b.since.getTime()).slice(0, limit);
  const deliveries = await prisma.delivery.findMany({
    where: { id: { in: sorted.map((f) => f.deliveryId) } },
    select: { id: true, order: { select: { orderCode: true, customer: { select: { firstName: true, lastName: true } } } }, business: { select: { name: true } } },
  });
  const deliveryById = new Map(deliveries.map((d) => [d.id, d]));

  return sorted
    .map((f) => {
      const d = deliveryById.get(f.deliveryId);
      if (!d) return null;
      return {
        deliveryId: d.id,
        orderCode: d.order.orderCode,
        customerName: `${d.order.customer.firstName} ${d.order.customer.lastName}`.trim(),
        designerName: d.business.name,
        category: f.category,
        reason: f.reason,
        recommendedAction: f.recommendedAction,
        since: f.since,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

// Full delivery detail for the Admin page — Order/Customer/Designer sections
// mirror the same shape admin-orders.ts's getAdminOrderDetail already uses
// for the same relations, so every detail page in Admin reads consistently.
export async function getAdminDeliveryDetail(id: string) {
  const delivery = await prisma.delivery.findUnique({
    where: { id },
    include: {
      order: {
        select: {
          id: true,
          orderCode: true,
          status: true,
          totalValue: true,
          orderDate: true,
          customer: { select: { id: true, firstName: true, lastName: true, customerCode: true, phone: true, email: true, city: true, state: true, country: true } },
          customerProfile: { select: { id: true } },
          notes: { where: { category: "ADMIN" }, orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } },
        },
      },
      business: {
        select: { id: true, name: true, city: true, country: true, businessType: true, rating: { select: { averageRating: true, totalReviews: true } }, verification: { select: { status: true } } },
      },
      events: { orderBy: { occurredAt: "desc" } },
      createdBy: { select: { name: true } },
    },
  });
  if (!delivery) return null;

  const escalation = await getEscalationState(id);
  const attention = computeAttentionForDelivery(delivery);
  return { delivery, attention, escalation, cancellable: !TERMINAL_STATUSES.includes(delivery.status) };
}

// "Escalated" state — same AuditLog-as-cheap-flag pattern Phase 7 used for
// PAYMENT_FLAGGED_FOR_FRAUD: the latest of DELIVERY_ESCALATED_BY_ADMIN /
// DELIVERY_ESCALATION_RESOLVED_BY_ADMIN for this delivery wins, no schema
// field needed.
async function getEscalationState(deliveryId: string): Promise<{ escalated: boolean; reason: string | null; since: Date | null }> {
  const latest = await prisma.auditLog.findFirst({
    where: { action: { in: ["DELIVERY_ESCALATED_BY_ADMIN", "DELIVERY_ESCALATION_RESOLVED_BY_ADMIN"] }, entityType: "Delivery", entityId: deliveryId },
    orderBy: { createdAt: "desc" },
  });
  if (!latest || latest.action !== "DELIVERY_ESCALATED_BY_ADMIN") return { escalated: false, reason: null, since: null };
  const reason = latest.metadata && typeof latest.metadata === "object" && "reason" in latest.metadata ? String((latest.metadata as Record<string, unknown>).reason) : null;
  return { escalated: true, reason, since: latest.createdAt };
}

async function getEscalatedDeliveryIds(): Promise<Set<string>> {
  const rows = await prisma.auditLog.findMany({
    where: { action: { in: ["DELIVERY_ESCALATED_BY_ADMIN", "DELIVERY_ESCALATION_RESOLVED_BY_ADMIN"] }, entityType: "Delivery" },
    orderBy: { createdAt: "desc" },
    select: { entityId: true, action: true },
  });
  const seen = new Set<string>();
  const escalated = new Set<string>();
  for (const r of rows) {
    if (!r.entityId || seen.has(r.entityId)) continue;
    seen.add(r.entityId);
    if (r.action === "DELIVERY_ESCALATED_BY_ADMIN") escalated.add(r.entityId);
  }
  return escalated;
}

// Single-record counterpart of resolveAttentionFlags() above, computed in JS
// from the record the detail page already loaded rather than firing the
// bulk aggregate queries again for one row — same thresholds, same reasons.
function computeAttentionForDelivery(delivery: {
  status: DeliveryStatus;
  estimatedDeliveryDate: Date | null;
  pickedUpAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): { category: IssueCategory; reason: string; recommendedAction: string; since: Date } | null {
  const now = Date.now();
  const awaitingPickup = delivery.status === "CREATED" || delivery.status === "COURIER_ASSIGNED" || delivery.status === "PICKUP_SCHEDULED";
  if (awaitingPickup && !delivery.pickedUpAt && now - delivery.createdAt.getTime() >= LATE_PICKUP_HOURS * 60 * 60 * 1000) {
    return { category: "LATE_PICKUP", reason: `No pickup recorded over ${LATE_PICKUP_HOURS}h after dispatch`, recommendedAction: "Contact the courier to confirm pickup, or reassign", since: delivery.createdAt };
  }
  if (!TERMINAL_STATUSES.includes(delivery.status) && delivery.estimatedDeliveryDate && delivery.estimatedDeliveryDate.getTime() < now) {
    return {
      category: "LATE_DELIVERY",
      reason: "Past the estimated delivery date, not yet delivered",
      recommendedAction: "Contact the courier for a status update; notify the customer of the delay",
      since: delivery.estimatedDeliveryDate,
    };
  }
  if (delivery.status === "FAILED") {
    return { category: "FAILED_ATTEMPT", reason: "Delivery attempt failed", recommendedAction: "Review the failure reason; re-dispatch, contact the customer to reschedule, or process a return", since: delivery.updatedAt };
  }
  if (delivery.status === "RETURNED") {
    return { category: "RETURNED", reason: "Parcel returned to the business", recommendedAction: "Confirm the return was received; coordinate a refund or reshipment with the business", since: delivery.updatedAt };
  }
  return null;
}

// Compact "how long" duration (e.g. "5d 2h") — same shape as every prior
// phase's own formatDuration, kept as its own local copy per this
// codebase's established convention.
export function formatDuration(from: Date, to: Date = new Date()): string {
  const ms = Math.max(0, to.getTime() - from.getTime());
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
}

// ===================== Admin intervention actions =====================
//
// "Do NOT manually change delivery milestones unless permitted by business
// rules" (the brief's own instruction): the only status-mutating action
// here is Cancel, which reuses lib/delivery.ts's recordDeliveryEvent — the
// one function the business's own cancel route already uses, so a Delivery
// can never end up in a state that function wouldn't also recognize.
// Nothing here ever sets status/pickedUpAt/deliveredAt/tracking fields
// directly. Escalate and Investigate write audit/note entries only.

export async function cancelDeliveryByAdmin(db: typeof prisma, params: { deliveryId: string; reason: string; actorId: string }) {
  const delivery = await db.delivery.findUnique({
    where: { id: params.deliveryId },
    include: { order: { select: { orderCode: true, customerProfileId: true } } },
  });
  if (!delivery) throw new ApiError(404, "Delivery not found");
  if (TERMINAL_STATUSES.includes(delivery.status)) throw new ApiError(400, "This delivery has already reached a final state and can't be cancelled");

  // Best-effort provider-side cancel, same as the business's own cancel
  // route — outside the transaction since it's a network call, not a DB
  // write, and its failure should surface rather than be silently swallowed.
  if (delivery.provider !== "MANUAL" && delivery.providerDeliveryId) {
    const connection = await db.logisticsProviderConnection.findFirst({
      where: { businessId: delivery.businessId, provider: delivery.provider, isActive: true, status: "CONNECTED" },
    });
    if (connection) {
      const providerInstance = resolveLogisticsProvider(connection);
      await providerInstance.cancelShipment(delivery.providerDeliveryId);
    }
  }

  await db.$transaction(async (tx) => {
    // recordDeliveryEvent has no built-in customer copy for CANCELLED (the
    // business's own cancel route has no reason to tell the customer why —
    // it's usually the business's own change of plan). Admin cancellation
    // is different: the customer needs to know a human at Fashion360 acted
    // on their delivery, so that notification is sent explicitly below
    // rather than relying on recordDeliveryEvent's silent-on-cancel default.
    await recordDeliveryEvent(tx, {
      deliveryId: params.deliveryId,
      businessId: delivery.businessId,
      type: "CANCELLED",
      status: "CANCELLED",
      description: `Cancelled by Fashion360 admin: ${params.reason}`,
      actorType: "SYSTEM",
      actorId: params.actorId,
    });
    if (delivery.order.customerProfileId) {
      await notifyCustomer(tx, {
        businessId: delivery.businessId,
        customerProfileId: delivery.order.customerProfileId,
        title: "Your delivery was cancelled",
        body: params.reason,
        type: "warning",
      });
    }
    await notifyBusinessOwners(tx, {
      businessId: delivery.businessId,
      title: "A delivery was cancelled by Fashion360",
      body: `Order ${delivery.order.orderCode}: ${params.reason}`,
      type: "warning",
    });
    await logAuditEvent(tx, {
      action: "DELIVERY_CANCELLED_BY_ADMIN",
      userId: params.actorId,
      businessId: delivery.businessId,
      entityType: "Delivery",
      entityId: params.deliveryId,
      metadata: { reason: params.reason },
    });
  });
}

// "customer"/"designer" send a real in-app Notification. "courier" can't —
// no courier has a Fashion360 account or inbox (MOCK/MANUAL are the only
// providers, and even a real one is a webhook sender, not a logged-in
// user). Logged as an audit entry only: the honest record of "an admin
// contacted the courier outside the platform" (by the phone number already
// shown on this delivery), not a fabricated in-app message to nobody.
export async function contactDeliveryParty(db: typeof prisma, params: { deliveryId: string; target: "customer" | "designer" | "courier"; message: string; actorId: string }) {
  const delivery = await db.delivery.findUnique({ where: { id: params.deliveryId }, select: { id: true, businessId: true, courierName: true, courierPhone: true, order: { select: { customerProfileId: true } } } });
  if (!delivery) throw new ApiError(404, "Delivery not found");
  if (params.target === "customer" && !delivery.order.customerProfileId) throw new ApiError(400, "This customer has no Fashion360 platform account to notify");
  if (params.target === "courier" && !delivery.courierPhone && !delivery.courierName) throw new ApiError(400, "No courier is on file for this delivery yet");

  await db.$transaction(async (tx) => {
    if (params.target === "customer") {
      await notifyCustomer(tx, { businessId: delivery.businessId, customerProfileId: delivery.order.customerProfileId!, title: "Message from Fashion360 support", body: params.message, type: "info" });
    } else if (params.target === "designer") {
      await notifyBusinessOwners(tx, { businessId: delivery.businessId, title: "Message from Fashion360 support", body: params.message, type: "info" });
    }
    await logAuditEvent(tx, {
      action: "DELIVERY_CONTACT_SENT_BY_ADMIN",
      userId: params.actorId,
      businessId: delivery.businessId,
      entityType: "Delivery",
      entityId: params.deliveryId,
      metadata: { target: params.target, message: params.message, ...(params.target === "courier" ? { courierName: delivery.courierName, courierPhone: delivery.courierPhone } : {}) },
    });
  });
}

export async function escalateDeliveryIssue(db: typeof prisma, params: { deliveryId: string; reason: string; actorId: string }) {
  const delivery = await db.delivery.findUnique({ where: { id: params.deliveryId }, select: { id: true, businessId: true, order: { select: { orderCode: true, customerProfileId: true } } } });
  if (!delivery) throw new ApiError(404, "Delivery not found");

  await db.$transaction(async (tx) => {
    await logAuditEvent(tx, { action: "DELIVERY_ESCALATED_BY_ADMIN", userId: params.actorId, businessId: delivery.businessId, entityType: "Delivery", entityId: params.deliveryId, metadata: { reason: params.reason } });
    await notifyBusinessOwners(tx, { businessId: delivery.businessId, title: "Delivery escalated by Fashion360", body: `Order ${delivery.order.orderCode}: ${params.reason}`, type: "warning" });
    if (delivery.order.customerProfileId) {
      await notifyCustomer(tx, {
        businessId: delivery.businessId,
        customerProfileId: delivery.order.customerProfileId,
        title: "We're looking into your delivery",
        body: "Fashion360 is following up on your delivery with the business and courier.",
        type: "warning",
      });
    }
  });
}

export async function resolveDeliveryEscalation(db: typeof prisma, params: { deliveryId: string; reason: string; actorId: string }) {
  const delivery = await db.delivery.findUnique({ where: { id: params.deliveryId }, select: { id: true, businessId: true } });
  if (!delivery) throw new ApiError(404, "Delivery not found");

  await logAuditEvent(db, {
    action: "DELIVERY_ESCALATION_RESOLVED_BY_ADMIN",
    userId: params.actorId,
    businessId: delivery.businessId,
    entityType: "Delivery",
    entityId: params.deliveryId,
    metadata: { reason: params.reason },
  });
}

// "Mark for Investigation" reuses Phase 6's admin-only OrderNote (category
// ADMIN — never visible to the business or customer) against the order
// behind this delivery, exactly like Phase 7 did for a flagged payment,
// rather than a third internal-notes system.
export async function investigateDelivery(db: typeof prisma, params: { deliveryId: string; note: string; actorId: string }) {
  const delivery = await db.delivery.findUnique({ where: { id: params.deliveryId }, select: { orderId: true } });
  if (!delivery) throw new ApiError(404, "Delivery not found");
  return addAdminOrderNote(db, { orderId: delivery.orderId, body: params.note, actorId: params.actorId });
}

export { getEscalatedDeliveryIds };
