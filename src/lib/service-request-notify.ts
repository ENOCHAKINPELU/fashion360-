import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = typeof prisma | Prisma.TransactionClient;
type NotifyType = "info" | "success" | "warning" | "danger";

// Part 19: reuses the existing Notification model/foundation rather than
// building a second notification system — see the Notification model
// comment in schema.prisma for how customerProfileId extends it to target
// platform customers, not just business staff.
export async function notifyBusinessOwners(
  db: Db,
  params: { businessId: string; title: string; body: string; type?: NotifyType }
) {
  const owners = await db.user.findMany({ where: { businessId: params.businessId, role: "OWNER" }, select: { id: true } });
  if (owners.length === 0) return;
  await db.notification.createMany({
    data: owners.map((o) => ({
      businessId: params.businessId,
      userId: o.id,
      title: params.title,
      body: params.body,
      type: params.type ?? "info",
    })),
  });
}

export async function notifyCustomer(
  db: Db,
  params: { businessId: string; customerProfileId: string; title: string; body: string; type?: NotifyType }
) {
  await db.notification.create({
    data: {
      businessId: params.businessId,
      customerProfileId: params.customerProfileId,
      title: params.title,
      body: params.body,
      type: params.type ?? "info",
    },
  });
}
