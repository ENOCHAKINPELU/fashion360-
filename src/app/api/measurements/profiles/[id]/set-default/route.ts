import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { logMeasurementHistory } from "@/lib/measurement-history";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const { id } = await params;

    const profile = await prisma.measurementProfile.findFirst({ where: { id, businessId } });
    if (!profile) throw new ApiError(404, "Measurement profile not found");

    await prisma.$transaction(async (tx) => {
      await tx.measurementProfile.updateMany({
        where: { businessId, customerId: profile.customerId, isDefault: true },
        data: { isDefault: false },
      });
      await tx.measurementProfile.update({ where: { id }, data: { isDefault: true } });
      await logMeasurementHistory(tx, {
        businessId,
        profileId: id,
        action: "SET_DEFAULT",
        actorId: session.user.id,
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
