import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireCustomerContext } from "@/lib/rbac";
import { revokeMeasurementAccess } from "@/lib/measurement-access";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; grantId: string }> }) {
  try {
    const { session, profile } = await requireCustomerContext();
    const { id, grantId } = await params;

    const grant = await prisma.measurementAccessGrant.findUnique({ where: { id: grantId } });
    if (!grant || grant.measurementProfileId !== id) throw new ApiError(404, "Access grant not found");

    const measurementProfile = await prisma.passportMeasurementProfile.findUnique({ where: { id } });
    if (!measurementProfile || measurementProfile.customerProfileId !== profile.id) {
      throw new ApiError(404, "Measurement profile not found");
    }

    const revoked = await prisma.$transaction((tx) => revokeMeasurementAccess(tx, grantId, session.user.id));

    return NextResponse.json({ grant: revoked });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
