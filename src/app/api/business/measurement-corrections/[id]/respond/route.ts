import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { measurementCorrectionResponseSchema } from "@/lib/validations/measurement";
import { createMeasurementVersion } from "@/lib/measurement-vault";
import { notifyCustomer } from "@/lib/service-request-notify";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const { id } = await params;
    const data = measurementCorrectionResponseSchema.parse(await req.json());

    const correction = await prisma.measurementCorrectionRequest.findUnique({
      where: { id },
      include: { version: true, measurementProfile: { include: { customerProfile: true } } },
    });
    if (!correction) throw new ApiError(404, "Correction request not found");
    if (correction.status !== "PENDING") throw new ApiError(400, "This correction request has already been resolved");

    const grant = await prisma.measurementAccessGrant.findFirst({
      where: { measurementProfileId: correction.measurementProfileId, businessId, revokedAt: null },
    });
    if (!grant) throw new ApiError(403, "You don't have access to this measurement profile");

    const status = data.action === "accept" ? "ACCEPTED" : data.action === "reject" ? "REJECTED" : "NEW_SESSION_REQUESTED";

    const updated = await prisma.$transaction(async (tx) => {
      if (data.action === "accept") {
        const correctedValues = { ...(correction.version.values as Record<string, number>), [correction.fieldKey]: correction.requestedValue };
        await createMeasurementVersion(tx, {
          profileId: correction.measurementProfileId,
          values: correctedValues,
          status: "CONFIRMED",
          reason: `Correction accepted: ${correction.fieldKey}`,
          createdById: session.user.id,
        });
      }

      const result = await tx.measurementCorrectionRequest.update({
        where: { id },
        data: { status, responseNote: data.responseNote || null, respondedAt: new Date(), respondedById: session.user.id },
      });

      await notifyCustomer(tx, {
        businessId,
        customerProfileId: correction.measurementProfile.customerProfileId,
        title:
          data.action === "accept"
            ? "Your correction was accepted"
            : data.action === "reject"
              ? "Your correction request was declined"
              : "A new measurement session is needed",
        body: data.responseNote || "The business responded to your correction request.",
        type: data.action === "accept" ? "success" : "info",
      });

      return result;
    });

    return NextResponse.json({ correction: updated });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
