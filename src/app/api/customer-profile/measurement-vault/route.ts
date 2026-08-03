import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireCustomerContext } from "@/lib/rbac";
import { passportMeasurementProfileSchema } from "@/lib/validations/measurement";
import { syncFashionPassport } from "@/lib/fashion-passport";
import { createMeasurementVersion } from "@/lib/measurement-vault";
import { valuesToCm } from "@/lib/measurement-conversion";

export async function GET() {
  try {
    const { profile } = await requireCustomerContext();

    const profiles = await prisma.passportMeasurementProfile.findMany({
      where: { customerProfileId: profile.id, isArchived: false },
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
      include: {
        currentVersion: true,
        accessGrants: {
          where: { revokedAt: null },
          include: { business: { select: { id: true, name: true, logoUrl: true } } },
        },
      },
    });

    return NextResponse.json({ profiles });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

// Self-entered profiles go straight to CONFIRMED — the customer is the
// authority on their own entry, unlike a business capture (Part 15/20),
// which starts DRAFT/PENDING_REVIEW until the customer reviews it.
export async function POST(req: NextRequest) {
  try {
    const { profile, session } = await requireCustomerContext();
    const data = passportMeasurementProfileSchema.parse(await req.json());

    const created = await prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.passportMeasurementProfile.updateMany({
          where: { customerProfileId: profile.id, isDefault: true },
          data: { isDefault: false },
        });
      }
      const result = await tx.passportMeasurementProfile.create({
        data: {
          customerProfileId: profile.id,
          name: data.name,
          isDefault: data.isDefault,
          preferredUnit: data.unit,
        },
      });
      await createMeasurementVersion(tx, {
        profileId: result.id,
        values: valuesToCm(data.values, data.unit),
        status: "CONFIRMED",
        reason: "Initial self-reported measurements",
        notes: data.notes,
        createdById: session.user.id,
      });
      await syncFashionPassport(tx, profile);
      return tx.passportMeasurementProfile.findUniqueOrThrow({ where: { id: result.id }, include: { currentVersion: true } });
    });

    return NextResponse.json({ profile: created }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
