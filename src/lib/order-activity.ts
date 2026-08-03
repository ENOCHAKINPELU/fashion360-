import type { Prisma, OrderActivityType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = typeof prisma | Prisma.TransactionClient;

export async function logOrderActivity(
  db: Db,
  params: {
    orderId: string;
    businessId: string;
    type: OrderActivityType;
    title: string;
    description?: string;
    previousValue?: string | null;
    newValue?: string | null;
    actorId?: string | null;
  }
) {
  await db.orderActivity.create({
    data: {
      orderId: params.orderId,
      businessId: params.businessId,
      type: params.type,
      title: params.title,
      description: params.description,
      previousValue: params.previousValue,
      newValue: params.newValue,
      actorId: params.actorId ?? null,
    },
  });
}
