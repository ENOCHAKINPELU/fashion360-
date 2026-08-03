import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = typeof prisma | Prisma.TransactionClient;

// Repaired (Phase 10 audit): count()-based numbering collides the instant
// the sequence has any gap (e.g. a deleted/archived request) — same class
// of bug fixed for invoice/order/quotation/receipt codes in Phase 7. Now
// derives the next number from the highest existing parsed suffix instead.
export async function nextServiceRequestCode(db: Db, businessId: string) {
  const existing = await db.serviceRequest.findMany({ where: { businessId }, select: { requestCode: true } });
  const highest = existing.reduce((max, r) => {
    const match = r.requestCode.match(/(\d+)$/);
    const n = match ? Number(match[1]) : 0;
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);
  return `SR-${String(highest + 1).padStart(4, "0")}`;
}
