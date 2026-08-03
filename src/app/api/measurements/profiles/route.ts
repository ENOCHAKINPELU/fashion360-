import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { measurementProfileSchema } from "@/lib/validations/measurement";
import { logMeasurementHistory } from "@/lib/measurement-history";

export async function GET(req: NextRequest) {
  try {
    const { businessId } = await requireBusinessContext();
    const params = req.nextUrl.searchParams;
    const customerId = params.get("customerId");
    const archived = params.get("archived") === "true";

    const profiles = await prisma.measurementProfile.findMany({
      where: { businessId, isArchived: archived, ...(customerId ? { customerId } : {}) },
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
      include: {
        customer: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { measurements: true } },
        measurements: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    return NextResponse.json({ profiles });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const data = measurementProfileSchema.parse(await req.json());

    const customer = await prisma.customer.findFirst({ where: { id: data.customerId, businessId } });
    if (!customer) throw new ApiError(404, "Customer not found");

    const profile = await prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.measurementProfile.updateMany({
          where: { businessId, customerId: data.customerId, isDefault: true },
          data: { isDefault: false },
        });
      }

      const existingCount = await tx.measurementProfile.count({ where: { businessId, customerId: data.customerId } });

      const created = await tx.measurementProfile.create({
        data: {
          businessId,
          customerId: data.customerId,
          name: data.name,
          isDefault: data.isDefault ?? existingCount === 0,
        },
      });

      await logMeasurementHistory(tx, {
        businessId,
        profileId: created.id,
        action: "PROFILE_CREATED",
        actorId: session.user.id,
      });

      return created;
    });

    return NextResponse.json({ profile }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
