import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { measurementCaptureSchema } from "@/lib/validations/measurement";
import { valuesToCm } from "@/lib/measurement-conversion";
import { createMeasurementVersion } from "@/lib/measurement-vault";
import { grantMeasurementAccess } from "@/lib/measurement-access";
import { notifyCustomer } from "@/lib/service-request-notify";

// Part 15/27: manual capture only for Phase 4 — the abstraction (method +
// values on MeasurementVersion) leaves room for photo/video/device capture
// later without touching the Vault's shape.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const { id: appointmentId } = await params;
    const data = measurementCaptureSchema.parse(await req.json());

    const appointment = await prisma.appointment.findFirst({ where: { id: appointmentId, businessId } });
    if (!appointment) throw new ApiError(404, "Appointment not found");
    if (!appointment.customerProfileId) {
      throw new ApiError(400, "This appointment isn't linked to a platform customer, so it has no measurement vault to capture into");
    }

    // Continue an in-progress capture for this same appointment if one
    // exists, rather than creating a second profile every time the business
    // saves a draft.
    const existingVersion = await prisma.measurementVersion.findFirst({
      where: { capturedAtAppointmentId: appointmentId },
      orderBy: { versionNumber: "desc" },
      include: { profile: true },
    });

    const status = data.submitForReview ? "PENDING_REVIEW" : "DRAFT";

    const result = await prisma.$transaction(async (tx) => {
      const profileId =
        existingVersion?.profileId ??
        (
          await tx.passportMeasurementProfile.create({
            data: {
              customerProfileId: appointment.customerProfileId!,
              name: `Measurement Session (${appointment.startTime.toLocaleDateString()})`,
              preferredUnit: data.unit,
              status,
            },
          })
        ).id;

      const version = await createMeasurementVersion(tx, {
        profileId,
        values: valuesToCm(data.values, data.unit),
        status,
        reason: existingVersion ? "Updated capture" : "Captured during measurement session",
        notes: data.notes,
        createdById: session.user.id,
        capturedAtAppointmentId: appointmentId,
      });

      // The capturing business gets access to what they just captured —
      // separate from Part 22/23's business-initiated *request* flow, which
      // is for accessing a profile the business did NOT create.
      const existingGrant = await tx.measurementAccessGrant.findFirst({
        where: { measurementProfileId: profileId, businessId, revokedAt: null },
      });
      if (!existingGrant) {
        await grantMeasurementAccess(tx, {
          measurementProfileId: profileId,
          scope: "SHARED_WITH_BUSINESS",
          businessId,
          grantedById: session.user.id,
        });
      }

      if (data.submitForReview) {
        await notifyCustomer(tx, {
          businessId,
          customerProfileId: appointment.customerProfileId!,
          title: "Your measurements are ready for review",
          body: "A business has captured your measurements. Review and confirm them in your Measurement Vault.",
          type: "info",
        });
      }

      return tx.passportMeasurementProfile.findUniqueOrThrow({ where: { id: profileId }, include: { currentVersion: true } });
    });

    return NextResponse.json({ profile: result }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
