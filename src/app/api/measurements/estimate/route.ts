import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { estimationRequestSchema } from "@/lib/validations/measurement";
import { z } from "zod";

const requestSchema = estimationRequestSchema.extend({ sessionId: z.string().optional() });
import { getMeasurementEstimationProvider } from "@/lib/providers/measurement-estimation";
import { logMeasurementHistory } from "@/lib/measurement-history";
import { logCustomerActivity } from "@/lib/customer-activity";

// Runs the (mocked) photo-based estimation and saves the result as a
// PENDING_REVIEW measurement for a designer to adjust and approve.
export async function POST(req: NextRequest) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const data = requestSchema.parse(await req.json());

    const customer = await prisma.customer.findFirst({ where: { id: data.customerId, businessId } });
    if (!customer) throw new ApiError(404, "Customer not found");

    let existingSession = null;
    if (data.sessionId) {
      existingSession = await prisma.measurementSession.findFirst({ where: { id: data.sessionId, businessId } });
      if (!existingSession) throw new ApiError(404, "Measurement session not found");
    }

    const provider = getMeasurementEstimationProvider();
    const result = await provider.estimate({
      heightCm: data.heightCm,
      weightKg: data.weightKg,
      gender: data.gender,
      frontImageUrl: data.frontImageUrl,
      sideImageUrl: data.sideImageUrl,
    });

    const measurement = await prisma.$transaction(async (tx) => {
      let profileId = data.profileId ?? existingSession?.profileId ?? undefined;

      if (!profileId) {
        const existingCount = await tx.measurementProfile.count({ where: { businessId, customerId: data.customerId } });
        const profile = await tx.measurementProfile.create({
          data: {
            businessId,
            customerId: data.customerId,
            name: data.newProfileName?.trim() || "Photo Estimated Measurements",
            isDefault: existingCount === 0,
          },
        });
        profileId = profile.id;
      }

      const created = await tx.measurement.create({
        data: {
          businessId,
          customerId: data.customerId,
          profileId,
          source: "AI_ESTIMATED",
          status: "PENDING_REVIEW",
          unit: "METRIC",
          values: result.values,
          heightCm: data.heightCm,
          weightKg: data.weightKg,
          gender: data.gender,
          frontImageUrl: data.frontImageUrl,
          sideImageUrl: data.sideImageUrl,
          createdById: session.user.id,
        },
      });

      await logMeasurementHistory(tx, {
        businessId,
        measurementId: created.id,
        profileId,
        action: "CREATED",
        currentValues: result.values,
        notes: "Estimated from uploaded photos, pending designer review",
        actorId: session.user.id,
      });

      await logCustomerActivity(tx, {
        customerId: data.customerId,
        businessId,
        type: "MEASUREMENT_ADDED",
        title: "Measurements estimated from photos",
        actorId: session.user.id,
      });

      if (existingSession) {
        await tx.measurementSession.update({
          where: { id: existingSession.id },
          data: { status: "COMPLETED", completedAt: new Date(), resultMeasurementId: created.id, profileId },
        });
      }

      return created;
    });

    return NextResponse.json({ measurement }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
