import type { Prisma, CustomerBehaviorType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getBehaviorWeightMap } from "@/lib/personalization-weights";

type Db = typeof prisma | Prisma.TransactionClient;

// Part 4: the single write path for every behavioral signal — resolves the
// configured weight at write time so scoring reads never have to look it up
// again, and an admin retuning weights later doesn't rewrite history.
export async function logCustomerBehavior(
  db: Db,
  params: { customerProfileId: string; businessId?: string | null; type: CustomerBehaviorType; targetType?: string | null; targetId?: string | null; metadata?: Record<string, unknown> }
) {
  const weights = await getBehaviorWeightMap(db);
  const weight = weights[params.type] ?? 1;

  return db.customerBehaviorSignal.create({
    data: {
      customerProfileId: params.customerProfileId,
      businessId: params.businessId ?? null,
      type: params.type,
      targetType: params.targetType ?? null,
      targetId: params.targetId ?? null,
      weight,
      metadata: params.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}

// Part 16: "do not repeatedly recommend items the customer explicitly
// rejected" — the exclusion set every recommendation query filters against.
export async function getExcludedTargetIds(db: Db, params: { customerProfileId: string; targetType: "DESIGN" | "DESIGNER" | "SERVICE" }) {
  const rows = await db.customerBehaviorSignal.findMany({
    where: {
      customerProfileId: params.customerProfileId,
      targetType: params.targetType,
      type: { in: ["DESIGN_HIDDEN", "RECOMMENDATION_REJECTED"] },
    },
    select: { targetId: true },
  });
  return new Set(rows.map((r) => r.targetId).filter((id): id is string => !!id));
}
