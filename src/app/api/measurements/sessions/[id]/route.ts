import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { sessionDraftSchema, sessionCompleteSchema } from "@/lib/validations/measurement";
import { logMeasurementHistory } from "@/lib/measurement-history";
import { logCustomerActivity } from "@/lib/customer-activity";
import { z } from "zod";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;

    const session = await prisma.measurementSession.findFirst({
      where: { id, businessId },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, profilePhotoUrl: true } },
        profile: true,
        template: { include: { fields: { include: { measurementType: true }, orderBy: { sortOrder: "asc" } } } },
      },
    });
    if (!session) throw new ApiError(404, "Measurement session not found");

    return NextResponse.json({ session });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

const patchSchema = z.object({
  draftValues: sessionDraftSchema.shape.draftValues.optional(),
  action: z.enum(["pause", "resume", "cancel", "complete"]).optional(),
  values: sessionCompleteSchema.shape.values.optional(),
  unit: sessionCompleteSchema.shape.unit.optional(),
  fitPreference: sessionCompleteSchema.shape.fitPreference,
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId, session: authSession } = await requireBusinessContext();
    const { id } = await params;

    const existing = await prisma.measurementSession.findFirst({ where: { id, businessId } });
    if (!existing) throw new ApiError(404, "Measurement session not found");

    const body = patchSchema.parse(await req.json());

    // Autosave draft
    if (body.draftValues) {
      const updated = await prisma.measurementSession.update({
        where: { id },
        data: { draftValues: body.draftValues },
      });
      return NextResponse.json({ session: updated });
    }

    if (body.action === "pause" || body.action === "resume" || body.action === "cancel") {
      const nextStatus = body.action === "pause" ? "PAUSED" : body.action === "resume" ? "IN_PROGRESS" : "CANCELLED";
      const updated = await prisma.measurementSession.update({
        where: { id },
        data: {
          status: nextStatus,
          ...(body.action === "pause" ? { pausedAt: new Date() } : {}),
        },
      });
      return NextResponse.json({ session: updated });
    }

    // Complete: creates/updates the resulting Measurement and closes the session.
    if (body.action !== "complete" || !body.values || !body.unit) {
      throw new ApiError(400, "values and unit are required to complete a session");
    }
    if (existing.status === "COMPLETED") throw new ApiError(400, "This session is already completed");

    const completeValues = body.values;
    const completeUnit = body.unit;
    const completeFitPreference = body.fitPreference;

    const result = await prisma.$transaction(async (tx) => {
      let profileId = existing.profileId;
      if (!profileId) {
        const existingCount = await tx.measurementProfile.count({ where: { businessId, customerId: existing.customerId } });
        const profile = await tx.measurementProfile.create({
          data: {
            businessId,
            customerId: existing.customerId,
            name: "Latest Measurements",
            isDefault: existingCount === 0,
          },
        });
        profileId = profile.id;
      }

      const measurement = await tx.measurement.create({
        data: {
          businessId,
          customerId: existing.customerId,
          profileId,
          templateId: existing.templateId,
          source: existing.method === "PHOTO_ESTIMATION" ? "AI_ESTIMATED" : "MANUAL",
          status: "APPROVED",
          unit: completeUnit,
          values: completeValues,
          fitPreference: completeFitPreference,
          createdById: authSession.user.id,
        },
      });

      const updatedSession = await tx.measurementSession.update({
        where: { id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          resultMeasurementId: measurement.id,
          profileId,
        },
      });

      await logMeasurementHistory(tx, {
        businessId,
        measurementId: measurement.id,
        profileId,
        action: "CREATED",
        currentValues: completeValues,
        reason: "Completed via measurement session",
        actorId: authSession.user.id,
      });

      await logCustomerActivity(tx, {
        customerId: existing.customerId,
        businessId,
        type: "MEASUREMENT_ADDED",
        title: "Measurement session completed",
        actorId: authSession.user.id,
      });

      return updatedSession;
    });

    return NextResponse.json({ session: result });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
