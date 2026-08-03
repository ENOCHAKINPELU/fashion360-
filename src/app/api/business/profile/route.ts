import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { businessProfileSchema } from "@/lib/validations/business-profile";
import { logAuditEvent } from "@/lib/audit-log";

export async function GET() {
  try {
    const { businessId } = await requireBusinessContext();

    const profile = await prisma.businessProfile.upsert({
      where: { businessId },
      update: {},
      create: { businessId },
      include: { business: { include: { specialties: true, verification: true } } },
    });

    return NextResponse.json({ profile });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const data = businessProfileSchema.parse(await req.json());

    if (data.username) {
      const existing = await prisma.businessProfile.findUnique({ where: { username: data.username } });
      if (existing && existing.businessId !== businessId) {
        throw new ApiError(409, "This username is already taken");
      }
    }

    const profile = await prisma.$transaction(async (tx) => {
      const result = await tx.businessProfile.upsert({
        where: { businessId },
        update: {
          username: data.username || null,
          description: data.description,
          serviceArea: data.serviceArea,
          website: data.website || null,
          registrationNumber: data.registrationNumber,
          visibility: data.visibility,
          yearsOfExperience: data.yearsOfExperience ? Number(data.yearsOfExperience) : null,
        },
        create: {
          businessId,
          username: data.username || null,
          description: data.description,
          serviceArea: data.serviceArea,
          website: data.website || null,
          registrationNumber: data.registrationNumber,
          visibility: data.visibility,
          yearsOfExperience: data.yearsOfExperience ? Number(data.yearsOfExperience) : null,
        },
      });

      await logAuditEvent(tx, {
        action: "BUSINESS_PROFILE_UPDATED",
        userId: session.user.id,
        businessId,
        entityType: "BusinessProfile",
        entityId: result.id,
      });

      return result;
    });

    return NextResponse.json({ profile });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
