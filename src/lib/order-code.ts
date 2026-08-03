import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = typeof prisma | Prisma.TransactionClient;

// Derived from the highest existing sequence number, not a row count — see
// the identical fix/reasoning in lib/invoice-code.ts.
export async function nextOrderCode(db: Db, businessId: string) {
  const existing = await db.order.findMany({ where: { businessId }, select: { orderCode: true } });
  const highest = existing.reduce((max, o) => {
    const match = o.orderCode.match(/(\d+)$/);
    const n = match ? Number(match[1]) : 0;
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);
  return `ORD-${String(highest + 1).padStart(4, "0")}`;
}
