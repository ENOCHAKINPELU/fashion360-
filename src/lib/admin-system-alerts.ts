import type { Prisma, SystemAlertCategory, SystemAlertSeverity } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/rbac";
import { logAuditEvent } from "@/lib/audit-log";

type Db = typeof prisma | Prisma.TransactionClient;
const PAGE_SIZE = 20;

// ============================================================================
// Admin Phase 10: System Alerts
// ============================================================================
// Ops-facing anomaly signals — distinct from NotificationLog, which is
// about outbound communication to users. raiseSystemAlert is the one
// function anything in the codebase should call to surface an operational
// failure to Admin; it's deliberately cheap to call (fire-and-forget from
// a catch block) and never throws itself, so raising an alert can never
// turn a handled failure into an unhandled one.
//
// KNOWN LIMITATION (see the phase report): this is wired into the
// highest-value real failure points already reachable in the codebase —
// payout/transfer failures (lib/payout.ts) and the automated high-dispute-
// rate check below — not into every conceivable failure surface (a
// database connection error, for instance, usually means the process
// calling raiseSystemAlert can't reach the database either). Wiring more
// categories in means adding one more call site each, not changing this
// file.
export async function raiseSystemAlert(
  db: Db,
  params: { category: SystemAlertCategory; severity?: SystemAlertSeverity; title: string; message: string; context?: Record<string, unknown> }
) {
  try {
    await db.systemAlert.create({
      data: {
        category: params.category,
        severity: params.severity ?? "WARNING",
        title: params.title,
        message: params.message,
        context: params.context as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (error) {
    // A logging failure should never break the caller's own error handling.
    console.error("raiseSystemAlert failed:", error);
  }
}

export interface AdminSystemAlertListParams {
  category?: SystemAlertCategory;
  severity?: SystemAlertSeverity;
  resolved?: boolean;
  page?: number;
}

export async function getAdminSystemAlertList(params: AdminSystemAlertListParams) {
  const page = Math.max(1, params.page ?? 1);
  const where: Prisma.SystemAlertWhereInput = {
    category: params.category,
    severity: params.severity,
    resolvedAt: params.resolved === undefined ? undefined : params.resolved ? { not: null } : null,
  };
  const [items, total] = await Promise.all([
    prisma.systemAlert.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.systemAlert.count({ where }),
  ]);
  return { items, total, page, pageSize: PAGE_SIZE, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function resolveSystemAlert(params: { alertId: string; actorId: string }) {
  const alert = await prisma.systemAlert.findUnique({ where: { id: params.alertId } });
  if (!alert) throw new ApiError(404, "Alert not found");
  if (alert.resolvedAt) throw new ApiError(400, "This alert is already resolved");

  const resolved = await prisma.systemAlert.update({
    where: { id: params.alertId },
    data: { resolvedAt: new Date(), resolvedById: params.actorId },
  });

  await logAuditEvent(prisma, {
    action: "SYSTEM_ALERT_RESOLVED_BY_ADMIN",
    userId: params.actorId,
    entityType: "SystemAlert",
    entityId: params.alertId,
  });

  return resolved;
}

// A real, computed signal rather than a stored one — "high dispute rate"
// is a ratio that changes with every new order/dispute, so it's evaluated
// live (opened disputes / orders created, both in the last 7 days) instead
// of trying to keep a stored alert in sync with a moving denominator.
// Raises a real SystemAlert only when it actually crosses the bar, and
// only once per rolling window (skips if an unresolved one already exists).
const HIGH_DISPUTE_RATE_THRESHOLD = 0.15; // 15% of recent orders disputed
const HIGH_DISPUTE_RATE_MIN_ORDERS = 10; // don't alarm on tiny sample sizes

export async function checkHighDisputeRate() {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [orderCount, disputeCount, existingUnresolved] = await Promise.all([
    prisma.order.count({ where: { createdAt: { gte: since } } }),
    prisma.dispute.count({ where: { createdAt: { gte: since } } }),
    prisma.systemAlert.findFirst({ where: { category: "HIGH_DISPUTE_RATE", resolvedAt: null } }),
  ]);

  if (orderCount < HIGH_DISPUTE_RATE_MIN_ORDERS || existingUnresolved) return null;
  const rate = disputeCount / orderCount;
  if (rate < HIGH_DISPUTE_RATE_THRESHOLD) return null;

  await raiseSystemAlert(prisma, {
    category: "HIGH_DISPUTE_RATE",
    severity: "CRITICAL",
    title: "Dispute rate is unusually high",
    message: `${disputeCount} of ${orderCount} orders in the last 7 days (${Math.round(rate * 100)}%) have an open dispute.`,
    context: { orderCount, disputeCount, rate, windowDays: 7 },
  });
  return { orderCount, disputeCount, rate };
}
