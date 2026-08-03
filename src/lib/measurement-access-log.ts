import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = typeof prisma | Prisma.TransactionClient;

// Part 24: every time a business actually reads a customer's measurement
// values through an active grant, log it — distinct from the grant/revoke
// lifecycle already in AuditLog.
export async function logMeasurementAccess(db: Db, params: { grantId: string; viewedById?: string | null }) {
  await db.measurementAccessLog.create({
    data: { grantId: params.grantId, viewedById: params.viewedById ?? null },
  });
}
