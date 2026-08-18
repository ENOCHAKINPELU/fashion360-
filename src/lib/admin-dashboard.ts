import type { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Admin Phase 2 — every number here is a real aggregate against models that
// already exist elsewhere in the app; nothing is fabricated or estimated.
// One function, one round of parallel queries, so the page component stays
// a pure render and every query here is `select`/`count`/`aggregate`
// scoped (never a full-row fetch) — see the file's own comments below for
// why each shape was chosen over the more obvious one.

const ORDER_INACTIVE_STATUSES = ["CANCELLED", "COMPLETED"] as const;
const ORDER_PRODUCTION_STATUSES = ["IN_PRODUCTION", "FITTING", "ALTERATION", "FINAL_INSPECTION", "QUALITY_CHECK", "QUALITY_CHECK_FAILED"] as const;
const ORDER_DELIVERY_STATUSES = ["READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "IN_TRANSIT"] as const;
const REQUEST_TERMINAL_STATUSES = ["ACCEPTED", "DECLINED", "CANCELLED", "EXPIRED", "CONVERTED_TO_APPOINTMENT", "CONVERTED_TO_ORDER"] as const;
const DELIVERY_TERMINAL_STATUSES = ["DELIVERED", "CANCELLED", "FAILED", "RETURNED"] as const;

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Orders-by-status bar chart buckets into the same stage groupings the stat
// cards already use, plus Pending and Cancelled — six bars total, matching
// the dataviz skill's "5-6 = soft cap" guidance rather than showing all ~19
// raw enum values.
const STATUS_BUCKETS: { label: string; statuses: OrderStatus[]; token: "muted" | "info" | "warning" | "success" | "danger" }[] = [
  { label: "Pending", statuses: ["DRAFT", "PENDING_CONFIRMATION", "CONFIRMED", "AWAITING_PAYMENT"], token: "muted" },
  { label: "In Production", statuses: [...ORDER_PRODUCTION_STATUSES, "READY_FOR_PRODUCTION"], token: "info" },
  { label: "In Delivery", statuses: [...ORDER_DELIVERY_STATUSES], token: "warning" },
  { label: "Completed", statuses: ["COMPLETED", "DELIVERED"], token: "success" },
  { label: "Disputed", statuses: ["DISPUTED", "REFUND_PROCESSING", "REFUNDED"], token: "danger" },
  { label: "Cancelled", statuses: ["CANCELLED"], token: "muted" },
];

function monthBuckets(count: number) {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1);
    const next = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i) + 1, 1);
    return { label: MONTH_LABELS[d.getMonth()], start: d, end: next };
  });
}

// Buckets a flat list of {createdAt/paidAt, value} rows into month labels in
// JS after ONE query, rather than firing one aggregate query per month
// (the pattern financial-charts.tsx uses per-business) — six months of
// platform-wide rows is small enough that one indexed range query beats six
// round trips, and it's the same total data either way.
function bucketByMonth<T>(rows: T[], getDate: (row: T) => Date, getValue: (row: T) => number, buckets: ReturnType<typeof monthBuckets>) {
  const sums = buckets.map(() => 0);
  for (const row of rows) {
    const date = getDate(row);
    const idx = buckets.findIndex((b) => date >= b.start && date < b.end);
    if (idx >= 0) sums[idx] += getValue(row);
  }
  return buckets.map((b, i) => ({ label: b.label, value: sums[i] }));
}

export async function getAdminDashboardData() {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const buckets = monthBuckets(6);

  const [
    customerCount,
    designerCount,
    pendingRequestCount,
    activeOrderCount,
    inProductionCount,
    inDeliveryCount,
    completedOrderCount,
    revenueAgg,
    pendingPayoutAgg,
    verificationPendingCount,
    delayedOrderCount,
    amountMismatchCount,
    failedPaymentCount,
    delayedDeliveries,
    openDisputeCount,
    orderStatusGroups,
    recentCustomers,
    recentDesigners,
    recentRequests,
    recentPayments,
    recentReviews,
    recentTimelineEntries,
    monthlyPayments,
    monthlyCustomers,
    monthlyDesigners,
  ] = await Promise.all([
    prisma.customerProfile.count(),
    prisma.business.count(),
    prisma.serviceRequest.count({ where: { status: { notIn: [...REQUEST_TERMINAL_STATUSES] } } }),
    prisma.order.count({ where: { status: { notIn: [...ORDER_INACTIVE_STATUSES] } } }),
    prisma.order.count({ where: { status: { in: [...ORDER_PRODUCTION_STATUSES] } } }),
    prisma.order.count({ where: { status: { in: [...ORDER_DELIVERY_STATUSES] } } }),
    prisma.order.count({ where: { status: "COMPLETED" } }),
    prisma.payment.aggregate({ where: { status: "SUCCESSFUL" }, _sum: { amount: true } }),
    prisma.payout.aggregate({ where: { status: { in: ["ELIGIBLE", "PROCESSING"] } }, _sum: { netAmount: true }, _count: true }),
    prisma.businessVerification.count({ where: { status: "PENDING" } }),
    prisma.order.count({ where: { isDelayed: true } }),
    prisma.payment.count({ where: { status: "AMOUNT_MISMATCH" } }),
    prisma.payment.count({ where: { status: "FAILED" } }),
    prisma.delivery.count({ where: { estimatedDeliveryDate: { lt: now }, status: { notIn: [...DELIVERY_TERMINAL_STATUSES] } } }),
    prisma.dispute.count({ where: { status: { in: ["OPEN", "UNDER_REVIEW"] } } }),
    prisma.order.groupBy({ by: ["status"], _count: true }),

    prisma.customerProfile.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, createdAt: true, user: { select: { name: true } } },
    }),
    prisma.business.findMany({
      where: { onboardingCompletedAt: { not: null } },
      orderBy: { onboardingCompletedAt: "desc" },
      take: 6,
      select: { id: true, name: true, slug: true, onboardingCompletedAt: true },
    }),
    prisma.serviceRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, requestCode: true, createdAt: true, business: { select: { name: true } } },
    }),
    prisma.payment.findMany({
      where: { status: "SUCCESSFUL", paidAt: { not: null } },
      orderBy: { paidAt: "desc" },
      take: 6,
      select: { id: true, amount: true, currency: true, paidAt: true, orderId: true, business: { select: { name: true } } },
    }),
    prisma.review.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, overallRating: true, createdAt: true, business: { select: { name: true } } },
    }),
    prisma.orderTimelineEntry.findMany({
      where: { occurredAt: { not: null }, stage: { in: ["PRODUCTION_STARTED", "OUT_FOR_DELIVERY", "COMPLETED", "CUSTOMER_CONFIRMED"] } },
      orderBy: { occurredAt: "desc" },
      take: 8,
      select: { id: true, stage: true, occurredAt: true, order: { select: { id: true, orderCode: true, business: { select: { name: true } } } } },
    }),

    prisma.payment.findMany({
      where: { status: "SUCCESSFUL", paidAt: { gte: sixMonthsAgo } },
      select: { amount: true, paidAt: true },
    }),
    prisma.customerProfile.findMany({ where: { createdAt: { gte: sixMonthsAgo } }, select: { createdAt: true } }),
    prisma.business.findMany({ where: { createdAt: { gte: sixMonthsAgo } }, select: { createdAt: true } }),
  ]);

  const statusCounts = new Map(orderStatusGroups.map((g) => [g.status, g._count]));
  const ordersByStatus = STATUS_BUCKETS.map((bucket) => ({
    label: bucket.label,
    token: bucket.token,
    count: bucket.statuses.reduce((sum, status) => sum + (statusCounts.get(status) ?? 0), 0),
  }));

  const TIMELINE_STAGE_LABEL: Record<string, string> = {
    PRODUCTION_STARTED: "Production started",
    OUT_FOR_DELIVERY: "Out for delivery",
    COMPLETED: "Order completed",
    CUSTOMER_CONFIRMED: "Customer confirmed receipt",
  };

  type ActivityItem = { id: string; kind: string; description: string; sub: string | null; timestamp: Date; href: string };

  const activity: ActivityItem[] = [
    ...recentCustomers.map((c) => ({
      id: `cust_${c.id}`,
      kind: "customer",
      description: `${c.user.name ?? "A customer"} joined Fashion360`,
      sub: null,
      timestamp: c.createdAt,
      href: `/admin/customers/${c.id}`,
    })),
    ...recentDesigners.map((b) => ({
      id: `biz_${b.id}`,
      kind: "designer",
      description: `${b.name} onboarded as a designer`,
      sub: null,
      timestamp: b.onboardingCompletedAt!,
      href: `/admin/businesses`,
    })),
    ...recentRequests.map((r) => ({
      id: `req_${r.id}`,
      kind: "request",
      description: `New request ${r.requestCode} submitted`,
      sub: r.business.name,
      timestamp: r.createdAt,
      href: `/admin/requests`,
    })),
    ...recentPayments.map((p) => ({
      id: `pay_${p.id}`,
      kind: "payment",
      description: `Payment of ${p.currency} ${p.amount.toLocaleString()} received`,
      sub: p.business.name,
      timestamp: p.paidAt!,
      href: `/admin/transactions`,
    })),
    ...recentReviews.map((r) => ({
      id: `rev_${r.id}`,
      kind: "review",
      description: `${r.overallRating}★ review submitted`,
      sub: r.business.name,
      timestamp: r.createdAt,
      href: `/admin/reviews`,
    })),
    ...recentTimelineEntries.map((t) => ({
      id: `tl_${t.id}`,
      kind: "order",
      description: `${TIMELINE_STAGE_LABEL[t.stage] ?? t.stage} — ${t.order.orderCode}`,
      sub: t.order.business.name,
      timestamp: t.occurredAt!,
      href: `/admin/orders`,
    })),
  ]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 12);

  return {
    stats: {
      customerCount,
      designerCount,
      pendingRequestCount,
      activeOrderCount,
      inProductionCount,
      inDeliveryCount,
      completedOrderCount,
      totalRevenue: revenueAgg._sum.amount ?? 0,
      pendingPayoutAmount: pendingPayoutAgg._sum.netAmount ?? 0,
      pendingPayoutCount: pendingPayoutAgg._count,
    },
    needsAttention: [
      { label: "Designers awaiting verification", count: verificationPendingCount, priority: "medium" as const, href: "/admin/verifications" },
      { label: "Requests awaiting a response", count: pendingRequestCount, priority: "medium" as const, href: "/admin/requests" },
      { label: "Orders delayed", count: delayedOrderCount, priority: "high" as const, href: "/admin/orders" },
      { label: "Payments requiring investigation", count: amountMismatchCount, priority: "critical" as const, href: "/admin/transactions" },
      { label: "Failed payments", count: failedPaymentCount, priority: "high" as const, href: "/admin/transactions" },
      { label: "Deliveries running late", count: delayedDeliveries, priority: "high" as const, href: "/admin/deliveries" },
      { label: "Open customer disputes", count: openDisputeCount, priority: "high" as const, href: "/admin/disputes" },
    ],
    activity,
    charts: {
      ordersByStatus,
      revenueTrend: bucketByMonth(monthlyPayments, (p) => p.paidAt!, (p) => p.amount, buckets),
      customerGrowth: bucketByMonth(monthlyCustomers, (c) => c.createdAt, () => 1, buckets),
      designerGrowth: bucketByMonth(monthlyDesigners, (b) => b.createdAt, () => 1, buckets),
    },
  };
}

export type AdminDashboardData = Awaited<ReturnType<typeof getAdminDashboardData>>;
