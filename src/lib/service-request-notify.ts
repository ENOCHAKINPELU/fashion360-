import type { Prisma, NotificationEvent } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { dispatchNotification } from "@/lib/notification-center";

type Db = typeof prisma | Prisma.TransactionClient;
type NotifyType = "info" | "success" | "warning" | "danger";

// Part 19: reuses the existing Notification model/foundation rather than
// building a second notification system — see the Notification model
// comment in schema.prisma for how customerProfileId extends it to target
// platform customers, not just business staff.
//
// Admin Phase 10: both functions below now route through
// lib/notification-center.ts's dispatchNotification instead of writing
// `Notification` rows directly, so every one of this function's ~30
// existing call sites gets a NotificationLog entry (full Admin visibility)
// for free, with no change to their own signatures. `event` is optional and
// defaults to SYSTEM — callers that map cleanly onto one of the Phase 10
// spec's named events (request submitted/accepted, etc.) pass it; the rest
// keep working exactly as before, just now logged under a generic event.
export async function notifyBusinessOwners(
  db: Db,
  params: { businessId: string; title: string; body: string; type?: NotifyType; event?: NotificationEvent }
) {
  const owners = await db.user.findMany({ where: { businessId: params.businessId, role: "OWNER" }, select: { id: true } });
  if (owners.length === 0) return;
  await Promise.all(
    owners.map((o) =>
      dispatchNotification(db, {
        event: params.event ?? "SYSTEM",
        channel: "IN_APP",
        title: params.title,
        body: params.body,
        inAppType: params.type,
        recipientUserId: o.id,
        businessId: params.businessId,
      })
    )
  );
}

export async function notifyCustomer(
  db: Db,
  params: { businessId: string; customerProfileId: string; title: string; body: string; type?: NotifyType; event?: NotificationEvent }
) {
  await dispatchNotification(db, {
    event: params.event ?? "SYSTEM",
    channel: "IN_APP",
    title: params.title,
    body: params.body,
    inAppType: params.type,
    recipientCustomerProfileId: params.customerProfileId,
    businessId: params.businessId,
  });
}
