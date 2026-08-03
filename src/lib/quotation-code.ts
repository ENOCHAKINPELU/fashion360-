import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOrCreateFinancialSettings } from "@/lib/financial-settings";

type Db = typeof prisma | Prisma.TransactionClient;

// Derived from the highest existing sequence number, not a row count — see
// the identical fix/reasoning in lib/invoice-code.ts.
export async function nextQuotationNumber(db: Db, businessId: string) {
  const settings = await getOrCreateFinancialSettings(db, businessId);
  const existing = await db.quotation.findMany({ where: { businessId }, select: { quotationNumber: true } });
  const highest = existing.reduce((max, q) => {
    const match = q.quotationNumber.match(/(\d+)$/);
    const n = match ? Number(match[1]) : 0;
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);
  return `${settings.quotationPrefix}-${String(highest + 1).padStart(4, "0")}`;
}
