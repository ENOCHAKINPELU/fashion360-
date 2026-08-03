import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { measurementUpdateSchema } from "@/lib/validations/measurement";
import { logMeasurementHistory } from "@/lib/measurement-history";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;

    const measurement = await prisma.measurement.findFirst({
      where: { id, businessId },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, profilePhotoUrl: true } },
        profile: true,
        template: { include: { fields: { include: { measurementType: true }, orderBy: { sortOrder: "asc" } } } },
        notes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } },
        files: { orderBy: { createdAt: "desc" } },
        history: { orderBy: { createdAt: "desc" }, include: { actor: { select: { name: true } } } },
        createdBy: { select: { name: true } },
        aiApprovedBy: { select: { name: true } },
      },
    });
    if (!measurement) throw new ApiError(404, "Measurement not found");

    const types = await prisma.measurementType.findMany({ where: { businessId }, orderBy: { sortOrder: "asc" } });

    return NextResponse.json({ measurement, types });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const { id } = await params;

    const existing = await prisma.measurement.findFirst({ where: { id, businessId } });
    if (!existing) throw new ApiError(404, "Measurement not found");

    const data = measurementUpdateSchema.parse(await req.json());
    const previousValues = existing.values as Record<string, number>;
    const nextValues = data.values ? { ...previousValues, ...data.values } : undefined;

    const measurement = await prisma.$transaction(async (tx) => {
      const updated = await tx.measurement.update({
        where: { id },
        data: {
          ...(nextValues ? { values: nextValues } : {}),
          ...(data.fitPreference ? { fitPreference: data.fitPreference } : {}),
          ...(data.unit ? { unit: data.unit } : {}),
        },
      });

      if (nextValues) {
        await logMeasurementHistory(tx, {
          businessId,
          measurementId: id,
          profileId: existing.profileId,
          action: "UPDATED",
          previousValues,
          currentValues: nextValues,
          reason: data.reason,
          notes: data.notes,
          actorId: session.user.id,
        });
      }

      return updated;
    });

    return NextResponse.json({ measurement });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;

    const existing = await prisma.measurement.findFirst({ where: { id, businessId } });
    if (!existing) throw new ApiError(404, "Measurement not found");

    await prisma.measurement.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
