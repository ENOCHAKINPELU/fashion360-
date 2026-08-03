import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = typeof prisma | Prisma.TransactionClient;

export async function nextCustomerCode(db: Db, businessId: string) {
  const count = await db.customer.count({ where: { businessId } });
  return `CUS-${String(count + 1).padStart(4, "0")}`;
}
