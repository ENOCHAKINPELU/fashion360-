import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireCustomerContext } from "@/lib/rbac";
import { measurementCorrectionRequestSchema } from "@/lib/validations/measurement";
import { inchesToCm } from "@/lib/measurement-conversion";
import { notifyBusinessOwners } from "@/lib/service-request-notify";

// Part 21: flags one field on a specific version as wrong. The version
// itself is never touched — only an Accept from the business (via
// /api/business/measurement-corrections/[id]/respond) creates a corrected
// new version.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { profile, session } = await requireCustomerContext();
    const { id } = await params;
    const data = measurementCorrectionRequestSchema.parse(await req.json());

    const record = await prisma.passportMeasurementProfile.findUnique({ where: { id } });
    if (!record || record.customerProfileId !== profile.id) throw new ApiError(404, "Measurement profile not found");

    const version = await prisma.measurementVersion.findUnique({ where: { id: data.versionId } });
    if (!version || version.profileId !== id) throw new ApiError(404, "Measurement version not found");

    const grant = await prisma.measurementAccessGrant.findFirst({
      where: { measurementProfileId: id, revokedAt: null, businessId: { not: null } },
      orderBy: { grantedAt: "desc" },
    });
    if (!grant?.businessId) throw new ApiError(400, "No business has access to this profile to notify");

    const correction = await prisma.$transaction(async (tx) => {
      const result = await tx.measurementCorrectionRequest.create({
        data: {
          measurementProfileId: id,
          versionId: data.versionId,
          fieldKey: data.fieldKey,
          requestedValue: data.unit === "METRIC" ? data.requestedValue : inchesToCm(data.requestedValue),
          reason: data.reason,
          requestedById: session.user.id,
        },
      });
      await notifyBusinessOwners(tx, {
        businessId: grant.businessId!,
        title: "Measurement correction requested",
        body: `A customer requested a correction on version ${version.versionNumber} of a measurement profile.`,
        type: "warning",
      });
      return result;
    });

    return NextResponse.json({ correction }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
