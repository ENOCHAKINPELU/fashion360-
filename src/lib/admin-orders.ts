import type { Prisma, OrderStatus, OrderPaymentStatus, OrderPriority, DeliveryStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/rbac";
import { logAuditEvent } from "@/lib/audit-log";
import { HIGH_VALUE_THRESHOLD_NGN } from "@/lib/admin-customers";

const PAGE_SIZE = 20;

// Admin Phase 6 reuses Order's real, already-enforced lifecycle (OrderStatus
// in schema.prisma — 21 real values, already driving the business's own
// order board/detail pages) rather than the brief's fallback
// PENDING_PAYMENT/PAID/PRODUCTION/.../COMPLETED chain. DRAFT is excluded
// everywhere below (a staff-started order never shown to the customer isn't
// yet a real, submitted order for Admin to oversee) — same reasoning Phase 5
// applied to ServiceRequest's DRAFT.
const NON_OVERDUE_ELIGIBLE_STATUSES: OrderStatus[] = ["DRAFT", "COMPLETED", "CANCELLED", "DELIVERED", "REFUNDED"];

// Matches admin-dashboard.ts's own bucket groupings exactly (ORDER_PRODUCTION_STATUSES
// + READY_FOR_PRODUCTION = its "In Production" chart bucket) so the two
// pages never disagree about what "in production" means.
const PRODUCTION_STATUSES: OrderStatus[] = ["READY_FOR_PRODUCTION", "IN_PRODUCTION", "FITTING", "ALTERATION", "FINAL_INSPECTION", "QUALITY_CHECK", "QUALITY_CHECK_FAILED"];
const DELIVERY_IN_PROGRESS_STATUSES: OrderStatus[] = ["OUT_FOR_DELIVERY", "IN_TRANSIT"];

// Configurable "stuck order" thresholds (brief's Needs Attention section):
// no SLA exists yet for order production/activity, so — same reasoning as
// Phase 5's stuck-request thresholds — these are plain, documented,
// adjustable numbers rather than a business rule invented and hidden
// inside a query.
export const PRODUCTION_STALL_DAYS = 5; // a production stage IN_PROGRESS with no completion
export const NO_ACTIVITY_STALL_DAYS = 7; // order untouched while still active
export const REPEATED_REVISIONS_THRESHOLD = 3; // alteration cycles logged against one order
export const RECENT_CANCELLED_WINDOW_DAYS = 7; // surfaced for visibility, not action

export interface AttentionFlag {
  orderId: string;
  reason: string;
  since: Date;
}

// The six real signals the brief asks for, each a cheap indexed aggregate
// over the whole table — never per-row, never N+1. "Orders overdue" reuses
// the real, already-enforced isDelayed flag (set by the business's own
// /api/orders/[id]/delay route — see lib/production.ts) union'd with orders
// past their own expectedCompletionDate that the business hasn't flagged
// yet, so Admin catches what the business hasn't noticed too. "Failed
// transitions" maps directly onto the real QUALITY_CHECK_FAILED status —
// no invented "transition failure" concept needed.
async function resolveAttentionFlags(): Promise<AttentionFlag[]> {
  const now = new Date();
  const productionStallCutoff = new Date(now.getTime() - PRODUCTION_STALL_DAYS * 24 * 60 * 60 * 1000);
  const noActivityCutoff = new Date(now.getTime() - NO_ACTIVITY_STALL_DAYS * 24 * 60 * 60 * 1000);
  const recentCancelledCutoff = new Date(now.getTime() - RECENT_CANCELLED_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [overdueFlagged, overdueUnflagged, stalledStages, staleOrders, recentCancelled, failedQc, revisionGroups] = await Promise.all([
    prisma.order.findMany({ where: { isDelayed: true, status: { notIn: NON_OVERDUE_ELIGIBLE_STATUSES } }, select: { id: true, delayedAt: true, updatedAt: true } }),
    prisma.order.findMany({
      where: { isDelayed: false, expectedCompletionDate: { lt: now }, status: { notIn: NON_OVERDUE_ELIGIBLE_STATUSES } },
      select: { id: true, expectedCompletionDate: true },
    }),
    prisma.orderProductionStage.findMany({
      where: { status: "IN_PROGRESS", startDate: { lte: productionStallCutoff } },
      select: { orderId: true, startDate: true },
    }),
    prisma.order.findMany({
      where: { status: { notIn: NON_OVERDUE_ELIGIBLE_STATUSES }, updatedAt: { lte: noActivityCutoff } },
      select: { id: true, updatedAt: true },
    }),
    prisma.order.findMany({ where: { status: "CANCELLED", updatedAt: { gte: recentCancelledCutoff } }, select: { id: true, updatedAt: true } }),
    prisma.order.findMany({ where: { status: "QUALITY_CHECK_FAILED" }, select: { id: true, updatedAt: true } }),
    prisma.alteration.groupBy({ by: ["orderId"], _count: true, having: { orderId: { _count: { gte: REPEATED_REVISIONS_THRESHOLD } } } }),
  ]);

  const flags: AttentionFlag[] = [
    ...overdueFlagged.map((o) => ({ orderId: o.id, reason: "Overdue — flagged delayed by the business", since: o.delayedAt ?? o.updatedAt })),
    ...overdueUnflagged.map((o) => ({ orderId: o.id, reason: "Overdue — past expected completion, not yet flagged", since: o.expectedCompletionDate! })),
    ...stalledStages.map((s) => ({ orderId: s.orderId, reason: `Production stalled for over ${PRODUCTION_STALL_DAYS} days`, since: s.startDate! })),
    ...staleOrders.map((o) => ({ orderId: o.id, reason: `No activity for over ${NO_ACTIVITY_STALL_DAYS} days`, since: o.updatedAt })),
    ...recentCancelled.map((o) => ({ orderId: o.id, reason: "Recently cancelled", since: o.updatedAt })),
    ...failedQc.map((o) => ({ orderId: o.id, reason: "Failed quality check", since: o.updatedAt })),
  ];

  if (revisionGroups.length) {
    const ids = revisionGroups.map((g) => g.orderId);
    const orders = await prisma.order.findMany({ where: { id: { in: ids } }, select: { id: true, updatedAt: true } });
    for (const o of orders) flags.push({ orderId: o.id, reason: "Repeated revisions requested", since: o.updatedAt });
  }

  return flags;
}

export interface AdminOrderListParams {
  q?: string;
  status?: OrderStatus;
  paymentStatus?: OrderPaymentStatus;
  deliveryStatus?: DeliveryStatus;
  priority?: OrderPriority;
  inProduction?: boolean;
  city?: string;
  dateFrom?: string;
  dateTo?: string;
  highValue?: boolean;
  delayed?: boolean;
  needsAttention?: boolean;
  // Deep-link only (from a specific customer's/designer's own Admin detail
  // page) — not their own text inputs, same reasoning as Phase 5's
  // designerId/customerId: the search box already covers "search by
  // customer/designer name," so a second, identical-looking pair of filter
  // inputs would be exactly the interface overload the brief elsewhere
  // warns against.
  designerId?: string;
  customerProfileId?: string;
  page?: number;
}

export async function getAdminOrderList(params: AdminOrderListParams) {
  const page = Math.max(1, params.page ?? 1);
  const search = params.q?.trim();

  const attentionFlags = await resolveAttentionFlags();
  const attentionByOrderId = new Map<string, AttentionFlag>();
  for (const f of attentionFlags) if (!attentionByOrderId.has(f.orderId)) attentionByOrderId.set(f.orderId, f);

  const conditions: Prisma.OrderWhereInput[] = [{ status: { not: "DRAFT" } }];
  if (search) {
    conditions.push({
      OR: [
        { id: { equals: search } },
        { orderCode: { contains: search, mode: "insensitive" } },
        { customer: { firstName: { contains: search, mode: "insensitive" } } },
        { customer: { lastName: { contains: search, mode: "insensitive" } } },
        { customer: { email: { contains: search, mode: "insensitive" } } },
        { customer: { phone: { contains: search, mode: "insensitive" } } },
        { business: { name: { contains: search, mode: "insensitive" } } },
        { business: { email: { contains: search, mode: "insensitive" } } },
        { business: { phone: { contains: search, mode: "insensitive" } } },
      ],
    });
  }
  if (params.status) conditions.push({ status: params.status });
  if (params.paymentStatus) conditions.push({ paymentStatus: params.paymentStatus });
  if (params.deliveryStatus) conditions.push({ delivery: { is: { status: params.deliveryStatus } } });
  if (params.priority) conditions.push({ priority: params.priority });
  if (params.inProduction) conditions.push({ status: { in: PRODUCTION_STATUSES } });
  if (params.city) {
    conditions.push({ OR: [{ customer: { city: { contains: params.city, mode: "insensitive" } } }, { business: { city: { contains: params.city, mode: "insensitive" } } }] });
  }
  if (params.dateFrom || params.dateTo) {
    conditions.push({
      orderDate: {
        ...(params.dateFrom ? { gte: new Date(params.dateFrom) } : {}),
        ...(params.dateTo ? { lte: new Date(`${params.dateTo}T23:59:59.999Z`) } : {}),
      },
    });
  }
  if (params.highValue) conditions.push({ totalValue: { gte: HIGH_VALUE_THRESHOLD_NGN } });
  if (params.delayed) conditions.push({ isDelayed: true });
  if (params.designerId) conditions.push({ businessId: params.designerId });
  if (params.customerProfileId) conditions.push({ customerProfileId: params.customerProfileId });
  if (params.needsAttention) conditions.push({ id: { in: [...attentionByOrderId.keys()] } });

  const where: Prisma.OrderWhereInput = { AND: conditions };

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { orderDate: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        orderCode: true,
        orderType: true,
        status: true,
        paymentStatus: true,
        priority: true,
        totalValue: true,
        orderDate: true,
        expectedCompletionDate: true,
        customer: { select: { id: true, firstName: true, lastName: true } },
        customerProfileId: true,
        business: { select: { id: true, name: true } },
        delivery: { select: { status: true } },
        items: { select: { designCategorySnapshot: true, designNameSnapshot: true }, orderBy: { sortOrder: "asc" }, take: 1 },
        _count: { select: { items: true } },
      },
    }),
  ]);

  return {
    orders: orders.map((o) => ({
      id: o.id,
      orderCode: o.orderCode,
      status: o.status,
      paymentStatus: o.paymentStatus,
      priority: o.priority,
      deliveryStatus: o.delivery?.status ?? null,
      totalValue: o.totalValue,
      orderDate: o.orderDate,
      expectedCompletionDate: o.expectedCompletionDate,
      customerId: o.customer.id,
      customerName: `${o.customer.firstName} ${o.customer.lastName}`.trim(),
      customerProfileId: o.customerProfileId,
      designerId: o.business.id,
      designerName: o.business.name,
      garmentType: o.items[0]?.designCategorySnapshot ?? o.items[0]?.designNameSnapshot ?? o.orderType.replace(/_/g, " "),
      extraItemCount: Math.max(0, o._count.items - 1),
      attention: attentionByOrderId.get(o.id) ?? null,
    })),
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

// The brief's 8 metric cards — a single groupBy (never one count() per
// bucket) so this stays cheap regardless of table size. Buckets mirror
// admin-dashboard.ts's own groupings where they overlap (Production;
// Delayed via the real isDelayed flag) — this phase additionally splits
// "Orders Ready" (READY_FOR_PICKUP) from "Orders in Delivery"
// (OUT_FOR_DELIVERY/IN_TRANSIT), which dashboard.ts's coarser chart bucket
// doesn't need to.
export async function getAdminOrderStats() {
  const [statusGroups, delayedCount, attentionFlags] = await Promise.all([
    prisma.order.groupBy({ by: ["status"], _count: true }),
    prisma.order.count({ where: { isDelayed: true, status: { notIn: NON_OVERDUE_ELIGIBLE_STATUSES } } }),
    resolveAttentionFlags(),
  ]);
  const counts = new Map(statusGroups.map((g) => [g.status, g._count]));
  const get = (s: OrderStatus) => counts.get(s) ?? 0;
  const sumStatuses = (statuses: OrderStatus[]) => statuses.reduce((sum, s) => sum + get(s), 0);
  const total = [...counts.entries()].filter(([status]) => status !== "DRAFT").reduce((sum, [, count]) => sum + count, 0);

  return {
    total,
    inProduction: sumStatuses(PRODUCTION_STATUSES),
    awaitingPayment: get("AWAITING_PAYMENT"),
    ready: get("READY_FOR_PICKUP"),
    inDelivery: sumStatuses(DELIVERY_IN_PROGRESS_STATUSES),
    completed: get("COMPLETED"),
    cancelled: get("CANCELLED"),
    delayed: delayedCount,
    needsAttention: new Set(attentionFlags.map((f) => f.orderId)).size,
  };
}

export async function getOrdersNeedingAttention(limit = 10) {
  const flags = await resolveAttentionFlags();
  if (flags.length === 0) return [];

  const byOrderId = new Map<string, AttentionFlag>();
  for (const f of flags) if (!byOrderId.has(f.orderId)) byOrderId.set(f.orderId, f);

  const sorted = [...byOrderId.values()].sort((a, b) => a.since.getTime() - b.since.getTime()).slice(0, limit);
  const orders = await prisma.order.findMany({
    where: { id: { in: sorted.map((f) => f.orderId) } },
    select: { id: true, orderCode: true, customer: { select: { firstName: true, lastName: true } }, business: { select: { name: true } } },
  });
  const orderById = new Map(orders.map((o) => [o.id, o]));

  return sorted
    .map((f) => {
      const o = orderById.get(f.orderId);
      if (!o) return null;
      return { orderId: o.id, orderCode: o.orderCode, customerName: `${o.customer.firstName} ${o.customer.lastName}`.trim(), designerName: o.business.name, reason: f.reason, since: f.since };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

// Full order detail for the Admin page — mirrors ORDER_DETAIL_INCLUDE's own
// section groupings (api/orders/[id]/route.ts) since that literal *is* the
// brief's own "Sections" list already modeled for real, but built as its
// own query rather than importing that literal: Admin's notes must include
// every category (including ADMIN), the opposite of what the business-
// facing include deliberately excludes, and Admin links back to
// CustomerProfile-keyed pages (/admin/customers/[id]) rather than the
// legacy Customer CRM record ORDER_DETAIL_INCLUDE was built around.
export async function getAdminOrderDetail(id: string) {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, firstName: true, lastName: true, customerCode: true, phone: true, email: true, city: true, state: true, country: true } },
      customerProfile: { select: { id: true } },
      business: { select: { id: true, name: true, city: true, country: true, businessType: true, rating: { select: { averageRating: true, totalReviews: true } }, verification: { select: { status: true } } } },
      assignedDesigner: { select: { id: true, name: true } },
      measurementProfile: { select: { name: true } },
      passportMeasurementProfile: { select: { name: true } },
      items: { include: { customization: true }, orderBy: { sortOrder: "asc" } },
      timeline: { where: { isApplicable: true }, orderBy: { sortOrder: "asc" }, include: { actor: { select: { name: true } } } },
      productionStages: { orderBy: { sortOrder: "asc" }, include: { completedBy: { select: { name: true } } } },
      notes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } },
      files: { orderBy: { createdAt: "desc" }, include: { uploadedBy: { select: { name: true } } } },
      activities: { orderBy: { createdAt: "desc" }, take: 50, include: { actor: { select: { name: true } } } },
      payments: { orderBy: { createdAt: "desc" } },
      delivery: true,
    },
  });
  if (!order) return null;

  const revisionCount = await prisma.alteration.count({ where: { orderId: id } });
  const attention = computeAttentionForOrder(order, revisionCount);

  return { order, attention, revisionCount };
}

// Single-record counterpart of resolveAttentionFlags() above — computed in
// JS from the record the detail page already loaded, rather than firing the
// bulk aggregate queries again for one row. Same thresholds, same reasons
// as the bulk resolver, kept separate because the two operate over
// genuinely different data shapes (a table scan there vs. one fetched
// record plus its production stages here).
function computeAttentionForOrder(
  order: { status: OrderStatus; isDelayed: boolean; delayedAt: Date | null; expectedCompletionDate: Date | null; updatedAt: Date; productionStages: { status: string; startDate: Date | null }[] },
  revisionCount: number
): { reason: string; since: Date } | null {
  const now = Date.now();
  const overdueEligible = !NON_OVERDUE_ELIGIBLE_STATUSES.includes(order.status);
  if (overdueEligible && order.isDelayed) return { reason: "Overdue — flagged delayed by the business", since: order.delayedAt ?? order.updatedAt };
  if (overdueEligible && order.expectedCompletionDate && order.expectedCompletionDate.getTime() < now) {
    return { reason: "Overdue — past expected completion, not yet flagged", since: order.expectedCompletionDate };
  }
  const stalledStage = order.productionStages.find((s) => s.status === "IN_PROGRESS" && s.startDate && now - s.startDate.getTime() >= PRODUCTION_STALL_DAYS * 24 * 60 * 60 * 1000);
  if (stalledStage) return { reason: `Production stalled for over ${PRODUCTION_STALL_DAYS} days`, since: stalledStage.startDate! };
  if (overdueEligible && now - order.updatedAt.getTime() >= NO_ACTIVITY_STALL_DAYS * 24 * 60 * 60 * 1000) {
    return { reason: `No activity for over ${NO_ACTIVITY_STALL_DAYS} days`, since: order.updatedAt };
  }
  if (order.status === "CANCELLED" && now - order.updatedAt.getTime() <= RECENT_CANCELLED_WINDOW_DAYS * 24 * 60 * 60 * 1000) {
    return { reason: "Recently cancelled", since: order.updatedAt };
  }
  if (order.status === "QUALITY_CHECK_FAILED") return { reason: "Failed quality check", since: order.updatedAt };
  if (revisionCount >= REPEATED_REVISIONS_THRESHOLD) return { reason: "Repeated revisions requested", since: order.updatedAt };
  return null;
}

// Compact "how long" duration (e.g. "5d 2h"), distinct from formatRelativeTime
// (lib/utils.ts) which reads as a past-tense sentence.
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

// ===================== Admin notes (the only write this phase touches) ====
//
// The brief has no "Admin Intervention" section for Order Management (unlike
// Phase 5's Request Management) — status changes, production advancement,
// and everything else stay the business's own job; Admin monitors. The one
// write action is an internal, admin-only note (schema.prisma's new
// OrderNoteCategory.ADMIN). Deliberately logged via the platform AuditLog
// (admin-only, never rendered on any business/customer page) rather than
// OrderActivity (the shared, business-visible activity feed also rendered
// on the business's own order detail page) — logging there would leak the
// note's existence to business staff even without exposing its content,
// which the brief's "not visible to customers or designers" rules out.
export async function addAdminOrderNote(db: typeof prisma, params: { orderId: string; body: string; actorId: string }) {
  const order = await db.order.findUnique({ where: { id: params.orderId }, select: { id: true, businessId: true } });
  if (!order) throw new ApiError(404, "Order not found");

  const note = await db.orderNote.create({
    data: { orderId: params.orderId, category: "ADMIN", body: params.body, authorId: params.actorId },
    include: { author: { select: { name: true } } },
  });

  await logAuditEvent(db, {
    action: "ORDER_NOTE_ADDED_BY_ADMIN",
    userId: params.actorId,
    businessId: order.businessId,
    entityType: "Order",
    entityId: params.orderId,
  });

  return note;
}
