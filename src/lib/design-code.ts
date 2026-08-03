import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = typeof prisma | Prisma.TransactionClient;

export async function nextDesignCode(db: Db, businessId: string) {
  const count = await db.design.count({ where: { businessId } });
  return `DES-${String(count + 1).padStart(4, "0")}`;
}
