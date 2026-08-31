import type { Prisma, NotificationChannel, NotificationStatus, NotificationEvent, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { retryNotificationDelivery } from "@/lib/notification-center";
import { logAuditEvent } from "@/lib/audit-log";

const PAGE_SIZE = 20;

// ============================================================================
// Admin Phase 10: Notifications & Communication Center — read layer + retry
// ============================================================================
// Every query here reads NotificationLog (lib/notification-center.ts's
// dispatcher is the only thing that writes it) — Admin is monitoring real
// dispatch attempts, not a separately-maintained mirror.

export interface AdminNotificationListParams {
  q?: string;
  channel?: NotificationChannel;
  status?: NotificationStatus;
  recipientType?: UserRole;
  event?: NotificationEvent;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
}

export async function getAdminNotificationList(params: AdminNotificationListParams) {
  const page = Math.max(1, params.page ?? 1);
  const search = params.q?.trim();

  const conditions: Prisma.NotificationLogWhereInput[] = [];
  if (search) {
    conditions.push({
      OR: [
        { id: { equals: search } },
        { recipientName: { contains: search, mode: "insensitive" } },
        { recipientEmail: { contains: search, mode: "insensitive" } },
        { orderId: { equals: search } },
      ],
    });
  }
  if (params.channel) conditions.push({ channel: params.channel });
  if (params.status) conditions.push({ status: params.status });
  if (params.recipientType) conditions.push({ recipientType: params.recipientType });
  if (params.event) conditions.push({ event: params.event });
  if (params.dateFrom || params.dateTo) {
    conditions.push({
      createdAt: {
        gte: params.dateFrom ? new Date(params.dateFrom) : undefined,
        lte: params.dateTo ? new Date(params.dateTo) : undefined,
      },
    });
  }

  const where: Prisma.NotificationLogWhereInput = conditions.length > 0 ? { AND: conditions } : {};

  const [items, total] = await Promise.all([
    prisma.notificationLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.notificationLog.count({ where }),
  ]);

  return { items, total, page, pageSize: PAGE_SIZE, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getAdminNotificationStats() {
  const [total, queued, sent, delivered, read, failed, broadcastCampaigns, systemAlerts] = await Promise.all([
    prisma.notificationLog.count(),
    prisma.notificationLog.count({ where: { status: { in: ["QUEUED", "PROCESSING"] } } }),
    prisma.notificationLog.count({ where: { status: "SENT" } }),
    prisma.notificationLog.count({ where: { status: "DELIVERED" } }),
    prisma.notificationLog.count({ where: { status: "READ" } }),
    prisma.notificationLog.count({ where: { status: "FAILED" } }),
    prisma.broadcast.count(),
    prisma.systemAlert.count({ where: { resolvedAt: null } }),
  ]);

  return { total, queued, sent, delivered, read, failed, broadcastCampaigns, systemAlerts };
}

export async function getAdminNotificationDetail(id: string) {
  return prisma.notificationLog.findUnique({
    where: { id },
    include: { broadcast: { select: { id: true, title: true } } },
  });
}

// Per-entity communication history — Order/Payment/Delivery use the plain
// id fields (no relation, see schema.prisma's NotificationLog comment);
// Customer/Designer use the real FK for a proper indexed lookup.
export async function getNotificationHistoryForOrder(orderId: string) {
  return prisma.notificationLog.findMany({ where: { orderId }, orderBy: { createdAt: "desc" } });
}
export async function getNotificationHistoryForPayment(paymentId: string) {
  return prisma.notificationLog.findMany({ where: { paymentId }, orderBy: { createdAt: "desc" } });
}
export async function getNotificationHistoryForDelivery(deliveryId: string) {
  return prisma.notificationLog.findMany({ where: { deliveryId }, orderBy: { createdAt: "desc" } });
}
export async function getNotificationHistoryForCustomer(customerProfileId: string) {
  return prisma.notificationLog.findMany({ where: { recipientCustomerProfileId: customerProfileId }, orderBy: { createdAt: "desc" }, take: 50 });
}
export async function getNotificationHistoryForBusiness(businessId: string) {
  return prisma.notificationLog.findMany({ where: { businessId }, orderBy: { createdAt: "desc" }, take: 50 });
}

export async function retryFailedNotification(params: { notificationLogId: string; actorId: string }) {
  const existing = await prisma.notificationLog.findUnique({ where: { id: params.notificationLogId } });
  if (!existing) return null;

  const updated = await retryNotificationDelivery(prisma, { notificationLogId: params.notificationLogId });

  await logAuditEvent(prisma, {
    action: "NOTIFICATION_RETRIED_BY_ADMIN",
    userId: params.actorId,
    entityType: "NotificationLog",
    entityId: params.notificationLogId,
    metadata: { previousStatus: existing.status, newStatus: updated?.status },
  });

  return updated;
}
