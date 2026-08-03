import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireBusinessContext } from "@/lib/rbac";
import { availabilitySchema } from "@/lib/validations/appointment";
import { getOrCreateAvailability } from "@/lib/availability";

export async function GET() {
  try {
    const { businessId } = await requireBusinessContext();
    const availability = await getOrCreateAvailability(businessId);
    return NextResponse.json({ availability });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { businessId } = await requireBusinessContext(["OWNER", "SUPER_ADMIN"]);
    const data = availabilitySchema.parse(await req.json());

    const availability = await prisma.businessAvailability.upsert({
      where: { businessId },
      update: {
        breakStart: data.breakStart || null,
        breakEnd: data.breakEnd || null,
        slotIntervalMinutes: data.slotIntervalMinutes,
        bufferMinutes: data.bufferMinutes,
        maxDailyAppointments: data.maxDailyAppointments ?? null,
        vacationMode: data.vacationMode,
        vacationStart: data.vacationStart ? new Date(data.vacationStart) : null,
        vacationEnd: data.vacationEnd ? new Date(data.vacationEnd) : null,
        vacationMessage: data.vacationMessage || null,
      },
      create: {
        businessId,
        breakStart: data.breakStart || null,
        breakEnd: data.breakEnd || null,
        slotIntervalMinutes: data.slotIntervalMinutes,
        bufferMinutes: data.bufferMinutes,
        maxDailyAppointments: data.maxDailyAppointments ?? null,
        vacationMode: data.vacationMode,
        vacationStart: data.vacationStart ? new Date(data.vacationStart) : null,
        vacationEnd: data.vacationEnd ? new Date(data.vacationEnd) : null,
        vacationMessage: data.vacationMessage || null,
      },
    });

    return NextResponse.json({ availability });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
