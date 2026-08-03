import type { Prisma, MeasurementProfileStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = typeof prisma | Prisma.TransactionClient;

// Part 18/19: the only way values ever change on a profile — always a new
// immutable MeasurementVersion, never an update to an existing one. Confirmed
// history is therefore permanent; "which measurements were used" for any
// past moment is always answerable by version number.
export async function createMeasurementVersion(
  db: Db,
  params: {
    profileId: string;
    values: Record<string, number>; // centimeters
    status: MeasurementProfileStatus;
    reason?: string | null;
    notes?: string | null;
    createdById?: string | null;
    capturedAtAppointmentId?: string | null;
  }
) {
  const last = await db.measurementVersion.findFirst({
    where: { profileId: params.profileId },
    orderBy: { versionNumber: "desc" },
    select: { versionNumber: true },
  });
  const versionNumber = (last?.versionNumber ?? 0) + 1;

  const version = await db.measurementVersion.create({
    data: {
      profileId: params.profileId,
      versionNumber,
      status: params.status,
      values: params.values,
      reason: params.reason ?? null,
      notes: params.notes ?? null,
      createdById: params.createdById ?? null,
      capturedAtAppointmentId: params.capturedAtAppointmentId ?? null,
    },
  });

  await db.passportMeasurementProfile.update({
    where: { id: params.profileId },
    data: { currentVersionId: version.id, status: params.status },
  });

  return version;
}
