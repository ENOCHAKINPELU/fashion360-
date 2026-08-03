import type { Prisma, AuditLogAction } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = typeof prisma | Prisma.TransactionClient;

// The platform-wide identity/access/security audit trail (Part 18) — every
// registration, login, password change, role change, and business-customer
// access grant/revoke should write one row here, distinct from the
// per-domain activity feeds (OrderActivity, DesignActivity, ...) which log
// business-process events instead.
export async function logAuditEvent(
  db: Db,
  params: {
    action: AuditLogAction;
    userId?: string | null;
    businessId?: string | null;
    entityType?: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string | null;
    userAgent?: string | null;
  }
) {
  await db.auditLog.create({
    data: {
      action: params.action,
      userId: params.userId ?? null,
      businessId: params.businessId ?? null,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: params.metadata as Prisma.InputJsonValue | undefined,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    },
  });
}
