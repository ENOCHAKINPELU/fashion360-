import type { Prisma, BroadcastTarget, BroadcastSegment, BroadcastStatus, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/rbac";
import { logAuditEvent } from "@/lib/audit-log";
import { dispatchNotification } from "@/lib/notification-center";
import { HIGH_VALUE_THRESHOLD_NGN } from "@/lib/admin-customers";

const PAGE_SIZE = 20;
// A customer with no order in this many days counts as inactive for the
// INACTIVE_CUSTOMERS segment — same "fixed, documented, adjustable" pattern
// as every other threshold introduced across the Admin phases.
const INACTIVE_CUSTOMER_DAYS = 90;

interface BroadcastRecipient {
  userId: string;
  email: string;
  name: string | null;
  customerProfileId: string | null;
  businessId: string | null;
  role: UserRole;
}

async function queryUsers(where: Prisma.UserWhereInput): Promise<BroadcastRecipient[]> {
  const users = await prisma.user.findMany({
    where,
    select: { id: true, email: true, name: true, businessId: true, role: true, customerProfile: { select: { id: true } } },
  });
  return users.map((u) => ({ userId: u.id, email: u.email, name: u.name, customerProfileId: u.customerProfile?.id ?? null, businessId: u.businessId, role: u.role }));
}

// Every target/segment resolves to a plain list of Users — see the phase
// report for why this is a fixed, named list rather than a free-form
// segment-builder.
async function resolveBroadcastRecipients(target: BroadcastTarget, segment: BroadcastSegment | null): Promise<BroadcastRecipient[]> {
  if (target === "ALL_USERS") return queryUsers({ role: { in: ["CUSTOMER", "OWNER"] } });
  if (target === "CUSTOMERS") return queryUsers({ role: "CUSTOMER" });
  if (target === "DESIGNERS") return queryUsers({ role: "OWNER" });

  switch (segment) {
    case "VERIFIED_DESIGNERS":
      return queryUsers({ role: "OWNER", business: { verification: { status: "VERIFIED" } } });
    case "UNVERIFIED_DESIGNERS":
      return queryUsers({ role: "OWNER", business: { verification: { status: { in: ["UNVERIFIED", "PENDING", "REJECTED"] } } } });
    case "SUSPENDED_ACCOUNTS":
      return queryUsers({
        OR: [
          { role: "CUSTOMER", suspendedAt: { not: null } },
          { role: "OWNER", business: { verification: { status: "SUSPENDED" } } },
        ],
      });
    case "HIGH_VALUE_CUSTOMERS": {
      // Mirrors lib/admin-customers.ts's own High Value filter exactly —
      // same threshold, same Order.amountPaid aggregate.
      const highValue = await prisma.order.groupBy({
        by: ["customerProfileId"],
        where: { customerProfileId: { not: null } },
        _sum: { amountPaid: true },
        having: { amountPaid: { _sum: { gte: HIGH_VALUE_THRESHOLD_NGN } } },
      });
      const ids = highValue.map((h) => h.customerProfileId).filter((id): id is string => !!id);
      if (ids.length === 0) return [];
      return queryUsers({ role: "CUSTOMER", customerProfile: { id: { in: ids } } });
    }
    case "INACTIVE_CUSTOMERS": {
      const cutoff = new Date(Date.now() - INACTIVE_CUSTOMER_DAYS * 24 * 60 * 60 * 1000);
      const recentOrderCustomerIds = await prisma.order.findMany({
        where: { customerProfileId: { not: null }, createdAt: { gte: cutoff } },
        select: { customerProfileId: true },
        distinct: ["customerProfileId"],
      });
      const excludeIds = recentOrderCustomerIds.map((o) => o.customerProfileId).filter((id): id is string => !!id);
      return queryUsers({ role: "CUSTOMER", customerProfile: { id: { notIn: excludeIds.length > 0 ? excludeIds : undefined } } });
    }
    default:
      return [];
  }
}

export interface AdminBroadcastListParams {
  status?: BroadcastStatus;
  page?: number;
}

export async function getAdminBroadcastList(params: AdminBroadcastListParams) {
  const page = Math.max(1, params.page ?? 1);
  const where: Prisma.BroadcastWhereInput = params.status ? { status: params.status } : {};
  const [items, total] = await Promise.all([
    prisma.broadcast.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { createdBy: { select: { name: true, email: true } } },
    }),
    prisma.broadcast.count({ where }),
  ]);
  return { items, total, page, pageSize: PAGE_SIZE, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function previewBroadcastRecipientCount(params: { target: BroadcastTarget; segment?: BroadcastSegment | null }) {
  const recipients = await resolveBroadcastRecipients(params.target, params.segment ?? null);
  return recipients.length;
}

export async function createBroadcast(params: {
  title: string;
  body: string;
  target: BroadcastTarget;
  segment?: BroadcastSegment | null;
  channel: "IN_APP" | "EMAIL";
  scheduledFor?: Date | null;
  expiresAt?: Date | null;
  actorId: string;
}) {
  if (params.target === "SEGMENT" && !params.segment) throw new ApiError(400, "A segment is required when targeting SEGMENT");

  const broadcast = await prisma.broadcast.create({
    data: {
      title: params.title,
      body: params.body,
      target: params.target,
      segment: params.target === "SEGMENT" ? params.segment : null,
      channel: params.channel,
      status: params.scheduledFor ? "SCHEDULED" : "DRAFT",
      scheduledFor: params.scheduledFor ?? null,
      expiresAt: params.expiresAt ?? null,
      createdById: params.actorId,
    },
  });

  await logAuditEvent(prisma, {
    action: "BROADCAST_CREATED",
    userId: params.actorId,
    entityType: "Broadcast",
    entityId: broadcast.id,
    metadata: { target: params.target, segment: params.segment ?? null, channel: params.channel, scheduled: !!params.scheduledFor },
  });

  return broadcast;
}

// The actual fan-out — called immediately for a DRAFT broadcast the admin
// sends right away, or by the opportunistic sweep (api/cron/notifications)
// once a SCHEDULED one comes due. Real dispatch, one NotificationLog +
// delivery attempt per recipient — not a fabricated "recipientCount" with
// nothing behind it.
export async function sendBroadcastNow(params: { broadcastId: string; actorId?: string | null }) {
  const broadcast = await prisma.broadcast.findUnique({ where: { id: params.broadcastId } });
  if (!broadcast) throw new ApiError(404, "Broadcast not found");
  if (broadcast.status === "SENT" || broadcast.status === "CANCELLED") throw new ApiError(400, `This broadcast is already ${broadcast.status.toLowerCase()}`);

  await prisma.broadcast.update({ where: { id: broadcast.id }, data: { status: "SENDING" } });

  const recipients = await resolveBroadcastRecipients(broadcast.target, broadcast.segment);

  await Promise.all(
    recipients.map((r) =>
      dispatchNotification(prisma, {
        event: "BROADCAST",
        channel: broadcast.channel,
        title: broadcast.title,
        body: broadcast.body,
        recipientUserId: r.userId,
        recipientCustomerProfileId: r.customerProfileId,
        recipientEmail: r.email,
        recipientName: r.name,
        recipientType: r.role,
        businessId: r.businessId,
        broadcastId: broadcast.id,
        expiresAt: broadcast.expiresAt,
      })
    )
  );

  const sent = await prisma.broadcast.update({
    where: { id: broadcast.id },
    data: { status: "SENT", sentAt: new Date(), recipientCount: recipients.length },
  });

  if (params.actorId) {
    await logAuditEvent(prisma, {
      action: "BROADCAST_SENT",
      userId: params.actorId,
      entityType: "Broadcast",
      entityId: broadcast.id,
      metadata: { recipientCount: recipients.length },
    });
  }

  return sent;
}

export async function cancelBroadcast(params: { broadcastId: string; actorId: string }) {
  const broadcast = await prisma.broadcast.findUnique({ where: { id: params.broadcastId } });
  if (!broadcast) throw new ApiError(404, "Broadcast not found");
  if (broadcast.status === "SENT") throw new ApiError(400, "This broadcast has already been sent and can't be cancelled");
  if (broadcast.status === "CANCELLED") throw new ApiError(400, "This broadcast is already cancelled");

  const cancelled = await prisma.broadcast.update({
    where: { id: broadcast.id },
    data: { status: "CANCELLED", cancelledById: params.actorId },
  });

  await logAuditEvent(prisma, {
    action: "BROADCAST_CANCELLED",
    userId: params.actorId,
    entityType: "Broadcast",
    entityId: broadcast.id,
  });

  return cancelled;
}

// Called opportunistically from api/cron/notifications — same pattern as
// lib/appointment-reminders.ts's processDueReminders. No persistent job
// queue exists in this deployment (Vercel serverless), so "scheduled
// broadcast" means "sent the next time this route is hit" — either by an
// external scheduler pointed at it, or by an admin loading the
// Notifications dashboard, which calls it opportunistically too.
export async function sendDueScheduledBroadcasts() {
  const due = await prisma.broadcast.findMany({
    where: { status: "SCHEDULED", scheduledFor: { lte: new Date() } },
    take: 10,
  });
  let sent = 0;
  for (const broadcast of due) {
    await sendBroadcastNow({ broadcastId: broadcast.id });
    sent += 1;
  }
  return sent;
}
