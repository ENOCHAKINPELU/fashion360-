import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireCustomerContext } from "@/lib/rbac";
import { passportMeasurementProfileSchema } from "@/lib/validations/measurement";
import { createMeasurementVersion } from "@/lib/measurement-vault";
import { valuesToCm } from "@/lib/measurement-conversion";

async function loadOwnedProfile(profileId: string, customerProfileId: string) {
  const record = await prisma.passportMeasurementProfile.findUnique({ where: { id: profileId } });
  if (!record || record.customerProfileId !== customerProfileId) throw new ApiError(404, "Measurement profile not found");
  return record;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { profile, session } = await requireCustomerContext();
    const { id } = await params;
    await loadOwnedProfile(id, profile.id);
    const data = passportMeasurementProfileSchema.partial().parse(await req.json());

    const updated = await prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.passportMeasurementProfile.updateMany({
          where: { customerProfileId: profile.id, isDefault: true, id: { not: id } },
          data: { isDefault: false },
        });
      }

      await tx.passportMeasurementProfile.update({
        where: { id },
        data: {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.isDefault !== undefined ? { isDefault: data.isDefault } : {}),
          ...(data.unit !== undefined ? { preferredUnit: data.unit } : {}),
        },
      });

      // Editing values always creates a new immutable version (Part 18/19) —
      // even for the customer's own profile, so the history stays intact.
      if (data.values && data.unit) {
        await createMeasurementVersion(tx, {
          profileId: id,
          values: valuesToCm(data.values, data.unit),
          status: "CONFIRMED",
          reason: "Updated by customer",
          notes: data.notes,
          createdById: session.user.id,
        });
      }

      return tx.passportMeasurementProfile.findUniqueOrThrow({ where: { id }, include: { currentVersion: true } });
    });

    return NextResponse.json({ profile: updated });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { profile } = await requireCustomerContext();
    const { id } = await params;
    await loadOwnedProfile(id, profile.id);

    await prisma.passportMeasurementProfile.update({ where: { id }, data: { isArchived: true, isDefault: false, status: "ARCHIVED" } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
