import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = typeof prisma | Prisma.TransactionClient;

// Lazily creates the settings row on first access, mirroring how
// BusinessAvailability is treated elsewhere — every business gets sane
// numbering/terms defaults without a migration-time backfill step.
export async function getOrCreateFinancialSettings(db: Db, businessId: string) {
  const existing = await db.businessFinancialSettings.findUnique({ where: { businessId } });
  if (existing) return existing;
  return db.businessFinancialSettings.create({ data: { businessId } });
}
