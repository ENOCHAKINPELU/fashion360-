import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { measurementCreateSchema } from "@/lib/validations/measurement";
import { logMeasurementHistory } from "@/lib/measurement-history";
import { logCustomerActivity } from "@/lib/customer-activity";
import type { Prisma, MeasurementSource, MeasurementRecordStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { businessId } = await requireBusinessContext();
    const params = req.nextUrl.searchParams;

    const customerId = params.get("customerId");
    const profileId = params.get("profileId");
    const source = params.get("source") as MeasurementSource | null;
    const status = params.get("status") as MeasurementRecordStatus | null;
    const search = params.get("search")?.trim();

    const where: Prisma.MeasurementWhereInput = {
      businessId,
      ...(customerId ? { customerId } : {}),
      ...(profileId ? { profileId } : {}),
      ...(source ? { source } : {}),
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { customer: { firstName: { contains: search, mode: "insensitive" } } },
              { customer: { lastName: { contains: search, mode: "insensitive" } } },
              { profile: { name: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const measurements = await prisma.measurement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, profilePhotoUrl: true } },
        profile: { select: { id: true, name: true } },
        template: { select: { id: true, name: true } },
        createdBy: { select: { name: true } },
      },
      take: 200,
    });

    return NextResponse.json({ measurements });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const data = measurementCreateSchema.parse(await req.json());

    const customer = await prisma.customer.findFirst({ where: { id: data.customerId, businessId } });
    if (!customer) throw new ApiError(404, "Customer not found");

    const measurement = await prisma.$transaction(async (tx) => {
      let profileId = data.profileId;

      if (!profileId) {
        const existingCount = await tx.measurementProfile.count({ where: { businessId, customerId: data.customerId } });
        const profile = await tx.measurementProfile.create({
          data: {
            businessId,
            customerId: data.customerId,
            name: data.newProfileName?.trim() || "Latest Measurements",
            isDefault: existingCount === 0,
          },
        });
        await logMeasurementHistory(tx, {
          businessId,
          profileId: profile.id,
          action: "PROFILE_CREATED",
          actorId: session.user.id,
        });
        profileId = profile.id;
      } else {
        const profile = await tx.measurementProfile.findFirst({ where: { id: profileId, businessId } });
        if (!profile) throw new ApiError(404, "Measurement profile not found");
      }

      const created = await tx.measurement.create({
        data: {
          businessId,
          customerId: data.customerId,
          profileId,
          templateId: data.templateId,
          source: "MANUAL",
          status: data.status,
          unit: data.unit,
          values: data.values,
          fitPreference: data.fitPreference,
          createdById: session.user.id,
        },
      });

      await logMeasurementHistory(tx, {
        businessId,
        measurementId: created.id,
        profileId,
        action: "CREATED",
        currentValues: data.values,
        actorId: session.user.id,
      });

      await logCustomerActivity(tx, {
        customerId: data.customerId,
        businessId,
        type: "MEASUREMENT_ADDED",
        title: "Measurement recorded",
        actorId: session.user.id,
      });

      return created;
    });

    return NextResponse.json({ measurement }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
