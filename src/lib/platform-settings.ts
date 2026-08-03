import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = typeof prisma | Prisma.TransactionClient;

// Singleton (exactly one row, platform-wide) — lazily created on first read,
// same pattern as BusinessFinancialSettings's per-business singleton.
export async function getOrCreatePlatformSettings(db: Db) {
  const existing = await db.platformSettings.findFirst();
  if (existing) return existing;
  return db.platformSettings.create({ data: {} });
}
