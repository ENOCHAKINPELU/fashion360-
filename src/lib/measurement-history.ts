import type { Prisma, MeasurementHistoryAction } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = typeof prisma | Prisma.TransactionClient;

export async function logMeasurementHistory(
  db: Db,
  params: {
    businessId: string;
    measurementId?: string;
    profileId?: string;
    action: MeasurementHistoryAction;
    previousValues?: Record<string, number> | null;
    currentValues?: Record<string, number> | null;
    reason?: string;
    notes?: string;
    actorId?: string | null;
  }
) {
  let changes: { field: string; from: number | null; to: number | null }[] | undefined;

  if (params.previousValues || params.currentValues) {
    const prev = params.previousValues ?? {};
    const curr = params.currentValues ?? {};
    const keys = new Set([...Object.keys(prev), ...Object.keys(curr)]);
    changes = Array.from(keys)
      .filter((key) => prev[key] !== curr[key])
      .map((key) => ({ field: key, from: prev[key] ?? null, to: curr[key] ?? null }));
  }

  await db.measurementHistory.create({
    data: {
      businessId: params.businessId,
      measurementId: params.measurementId,
      profileId: params.profileId,
      action: params.action,
      previousValues: params.previousValues ?? undefined,
      currentValues: params.currentValues ?? undefined,
      changes: changes && changes.length > 0 ? changes : undefined,
      reason: params.reason,
      notes: params.notes,
      actorId: params.actorId ?? null,
    },
  });
}
