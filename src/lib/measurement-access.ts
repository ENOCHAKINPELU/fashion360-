import type { Prisma, MeasurementAccessScope } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit-log";

type Db = typeof prisma | Prisma.TransactionClient;

// Part 15: grant/revoke foundation for the Measurement Vault. Revoking sets
// revokedAt rather than deleting — "View Access History" is just querying a
// customer's own grants (including revoked ones), and the same event is
// mirrored into AuditLog for the platform-wide security trail.
export async function grantMeasurementAccess(
  db: Db,
  params: {
    measurementProfileId: string;
    scope: MeasurementAccessScope;
    businessId?: string | null;
    orderId?: string | null;
    grantedById: string;
    accessRequestId?: string | null;
    expiresAt?: Date | null;
  }
) {
  const grant = await db.measurementAccessGrant.create({
    data: {
      measurementProfileId: params.measurementProfileId,
      scope: params.scope,
      businessId: params.businessId ?? null,
      orderId: params.orderId ?? null,
      grantedById: params.grantedById,
      accessRequestId: params.accessRequestId ?? null,
      expiresAt: params.expiresAt ?? null,
    },
  });

  await logAuditEvent(db, {
    action: "MEASUREMENT_ACCESS_GRANTED",
    userId: params.grantedById,
    businessId: params.businessId,
    entityType: "MeasurementAccessGrant",
    entityId: grant.id,
  });

  return grant;
}

export async function revokeMeasurementAccess(db: Db, grantId: string, revokedById: string) {
  const grant = await db.measurementAccessGrant.update({
    where: { id: grantId },
    data: { revokedAt: new Date() },
  });

  await logAuditEvent(db, {
    action: "MEASUREMENT_ACCESS_REVOKED",
    userId: revokedById,
    businessId: grant.businessId,
    entityType: "MeasurementAccessGrant",
    entityId: grant.id,
  });

  return grant;
}

// Part 22/24/35: the single gate every business-side measurement read must
// pass through. Revoked or expired access must stop working immediately —
// this checks live, not against a cached/remembered grant.
export async function findActiveGrant(db: Db, params: { measurementProfileId: string; businessId: string }) {
  return db.measurementAccessGrant.findFirst({
    where: {
      measurementProfileId: params.measurementProfileId,
      businessId: params.businessId,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { grantedAt: "desc" },
  });
}
