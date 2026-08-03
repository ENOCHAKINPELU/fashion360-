import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOrCreateFinancialSettings } from "@/lib/financial-settings";

type Db = typeof prisma | Prisma.TransactionClient;

// Respects the business's configured prefix/starting number/year format
// (section 13 of the Phase 8 spec), e.g. INV-2026-0001 or INV-1000.
//
// Derived from the highest existing sequence number, not a row count — a
// plain count() collides the moment the sequence has any gap (an invoice
// deleted, imported, or seeded out of order), which a unique constraint on
// invoiceNumber will then reject outright rather than silently overwrite.
export async function nextInvoiceNumber(db: Db, businessId: string) {
  const settings = await getOrCreateFinancialSettings(db, businessId);
  const year = new Date().getFullYear();

  const where: Prisma.InvoiceWhereInput = settings.invoiceUseYearFormat
    ? { businessId, createdAt: { gte: new Date(`${year}-01-01T00:00:00Z`), lt: new Date(`${year + 1}-01-01T00:00:00Z`) } }
    : { businessId };
  const existing = await db.invoice.findMany({ where, select: { invoiceNumber: true } });

  const highest = existing.reduce((max, inv) => {
    const match = inv.invoiceNumber.match(/(\d+)$/);
    const n = match ? Number(match[1]) : 0;
    return Number.isFinite(n) && n > max ? n : max;
  }, settings.invoiceStartingNumber - 1);

  const sequence = highest + 1;
  const padded = String(sequence).padStart(4, "0");
  return settings.invoiceUseYearFormat
    ? `${settings.invoicePrefix}-${year}-${padded}`
    : `${settings.invoicePrefix}-${padded}`;
}

export async function nextReceiptNumber(db: Db, businessId: string) {
  const existing = await db.receipt.findMany({ where: { businessId }, select: { receiptNumber: true } });
  const highest = existing.reduce((max, r) => {
    const match = r.receiptNumber.match(/(\d+)$/);
    const n = match ? Number(match[1]) : 0;
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);
  return `RCT-${String(highest + 1).padStart(4, "0")}`;
}
