import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { estimationApproveSchema } from "@/lib/validations/measurement";
import { logMeasurementHistory } from "@/lib/measurement-history";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const { id } = await params;

    const existing = await prisma.measurement.findFirst({ where: { id, businessId } });
    if (!existing) throw new ApiError(404, "Measurement not found");
    if (existing.status === "APPROVED") throw new ApiError(400, "This measurement is already approved");

    const { values, fitPreference } = estimationApproveSchema.parse(await req.json());
    const previousValues = existing.values as Record<string, number>;

    const measurement = await prisma.$transaction(async (tx) => {
      const updated = await tx.measurement.update({
        where: { id },
        data: {
          values,
          status: "APPROVED",
          fitPreference,
          aiApprovedAt: new Date(),
          aiApprovedById: session.user.id,
        },
      });

      await logMeasurementHistory(tx, {
        businessId,
        measurementId: id,
        profileId: existing.profileId,
        action: "APPROVED",
        previousValues,
        currentValues: values,
        reason: "Designer reviewed and approved photo-estimated measurements",
        actorId: session.user.id,
      });

      return updated;
    });

    return NextResponse.json({ measurement });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
