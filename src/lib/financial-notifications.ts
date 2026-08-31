import type { Prisma, NotificationEvent } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { dispatchNotification } from "@/lib/notification-center";

type Db = typeof prisma | Prisma.TransactionClient;

// Reuses the existing generic Notification model/bell, same pattern as
// lib/design-notifications.ts — routes financial events to the order's
// assigned designer plus every business owner, deduplicated.
//
// Admin Phase 10: routes through dispatchNotification (see
// lib/notification-center.ts) so every call site's in-app notification
// also lands in the admin-visible NotificationLog. `event` is optional
// (defaults to SYSTEM) — see the equivalent note on
// lib/service-request-notify.ts's notifyBusinessOwners.
export async function notifyFinancialEvent(
  db: Db,
  params: {
    businessId: string;
    orderId?: string | null;
    assignedDesignerId?: string | null;
    title: string;
    body: string;
    type?: "info" | "success" | "warning" | "danger";
    event?: NotificationEvent;
  }
) {
  const [order, owners] = await Promise.all([
    params.orderId
      ? db.order.findUnique({ where: { id: params.orderId }, select: { assignedDesignerId: true } })
      : Promise.resolve(null),
    db.user.findMany({ where: { businessId: params.businessId, role: "OWNER" }, select: { id: true } }),
  ]);

  const recipientIds = new Set<string>(owners.map((o) => o.id));
  const designerId = params.assignedDesignerId ?? order?.assignedDesignerId;
  if (designerId) recipientIds.add(designerId);
  if (recipientIds.size === 0) return;

  await Promise.all(
    Array.from(recipientIds).map((userId) =>
      dispatchNotification(db, {
        event: params.event ?? "SYSTEM",
        channel: "IN_APP",
        title: params.title,
        body: params.body,
        inAppType: params.type,
        recipientUserId: userId,
        businessId: params.businessId,
        orderId: params.orderId ?? null,
      })
    )
  );
}
