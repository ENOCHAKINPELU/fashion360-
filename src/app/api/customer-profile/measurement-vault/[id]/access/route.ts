import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireCustomerContext } from "@/lib/rbac";
import { measurementAccessGrantSchema } from "@/lib/validations/measurement";
import { grantMeasurementAccess } from "@/lib/measurement-access";

// Part 15: the customer explicitly choosing to share a vault profile with a
// business (or with every business they're actively connected to). No grant
// means no access — this is the only write path that creates one.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, profile } = await requireCustomerContext();
    const { id } = await params;

    const measurementProfile = await prisma.passportMeasurementProfile.findUnique({ where: { id } });
    if (!measurementProfile || measurementProfile.customerProfileId !== profile.id) {
      throw new ApiError(404, "Measurement profile not found");
    }

    const data = measurementAccessGrantSchema.parse(await req.json());

    if (data.scope === "SHARED_WITH_BUSINESS") {
      if (!data.businessId) throw new ApiError(400, "Select a business to share with");
      const relationship = await prisma.businessCustomerRelationship.findUnique({
        where: { businessId_customerProfileId: { businessId: data.businessId, customerProfileId: profile.id } },
      });
      if (!relationship || relationship.status !== "ACTIVE") {
        throw new ApiError(403, "You can only share measurements with a business you're actively connected to");
      }

      const existing = await prisma.measurementAccessGrant.findFirst({
        where: { measurementProfileId: id, businessId: data.businessId, revokedAt: null },
      });
      if (existing) throw new ApiError(409, "This business already has access");
    }

    const grant = await prisma.$transaction((tx) =>
      grantMeasurementAccess(tx, {
        measurementProfileId: id,
        scope: data.scope,
        businessId: data.businessId ?? null,
        grantedById: session.user.id,
      })
    );

    return NextResponse.json({ grant }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
