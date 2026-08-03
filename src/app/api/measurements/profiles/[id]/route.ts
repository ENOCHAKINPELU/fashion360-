import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { measurementProfileUpdateSchema } from "@/lib/validations/measurement";
import { logMeasurementHistory } from "@/lib/measurement-history";
import { z } from "zod";

async function getScopedProfile(businessId: string, id: string) {
  const profile = await prisma.measurementProfile.findFirst({ where: { id, businessId } });
  if (!profile) throw new ApiError(404, "Measurement profile not found");
  return profile;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;

    const profile = await prisma.measurementProfile.findFirst({
      where: { id, businessId },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, profilePhotoUrl: true } },
        measurements: {
          orderBy: { createdAt: "desc" },
          include: { template: { select: { name: true } }, createdBy: { select: { name: true } } },
        },
        files: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!profile) throw new ApiError(404, "Measurement profile not found");

    return NextResponse.json({ profile });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

const actionSchema = z.object({ action: z.enum(["archive", "unarchive"]) });
const patchSchema = z.union([measurementProfileUpdateSchema, actionSchema]);

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const { id } = await params;
    await getScopedProfile(businessId, id);

    const body = patchSchema.parse(await req.json());

    if ("action" in body) {
      const isArchiving = body.action === "archive";
      const profile = await prisma.$transaction(async (tx) => {
        const updated = await tx.measurementProfile.update({
          where: { id },
          data: { isArchived: isArchiving, archivedAt: isArchiving ? new Date() : null, ...(isArchiving ? { isDefault: false } : {}) },
        });
        await logMeasurementHistory(tx, {
          businessId,
          profileId: id,
          action: isArchiving ? "PROFILE_ARCHIVED" : "RESTORED",
          actorId: session.user.id,
        });
        return updated;
      });
      return NextResponse.json({ profile });
    }

    const profile = await prisma.$transaction(async (tx) => {
      const updated = await tx.measurementProfile.update({ where: { id }, data: { name: body.name } });
      await logMeasurementHistory(tx, {
        businessId,
        profileId: id,
        action: "PROFILE_RENAMED",
        actorId: session.user.id,
      });
      return updated;
    });

    return NextResponse.json({ profile });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const { id } = await params;
    const profile = await getScopedProfile(businessId, id);

    await prisma.$transaction(async (tx) => {
      await logMeasurementHistory(tx, {
        businessId,
        profileId: undefined,
        action: "PROFILE_DELETED",
        reason: `Deleted profile "${profile.name}"`,
        actorId: session.user.id,
      });
      await tx.measurementProfile.delete({ where: { id } });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
