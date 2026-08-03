import type { Prisma, CustomerActivityType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = typeof prisma | Prisma.TransactionClient;

export async function logCustomerActivity(
  db: Db,
  params: {
    customerId: string;
    businessId: string;
    type: CustomerActivityType;
    title: string;
    description?: string;
    actorId?: string | null;
  }
) {
  await db.customerActivity.create({
    data: {
      customerId: params.customerId,
      businessId: params.businessId,
      type: params.type,
      title: params.title,
      description: params.description,
      actorId: params.actorId ?? null,
    },
  });
}
