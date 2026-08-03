import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = typeof prisma | Prisma.TransactionClient;

// Reuses the existing generic Notification model/bell, same pattern as
// lib/design-notifications.ts — routes financial events to the order's
// assigned designer plus every business owner, deduplicated.
export async function notifyFinancialEvent(
  db: Db,
  params: {
    businessId: string;
    orderId?: string | null;
    assignedDesignerId?: string | null;
    title: string;
    body: string;
    type?: "info" | "success" | "warning" | "danger";
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

  await db.notification.createMany({
    data: Array.from(recipientIds).map((userId) => ({
      businessId: params.businessId,
      userId,
      title: params.title,
      body: params.body,
      type: params.type ?? "info",
    })),
  });
}
