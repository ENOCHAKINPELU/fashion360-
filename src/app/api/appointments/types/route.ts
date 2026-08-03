import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { appointmentTypeSchema } from "@/lib/validations/appointment";
import { ensureDefaultAppointmentTypes } from "@/lib/appointment-types";

export async function GET() {
  try {
    const { businessId } = await requireBusinessContext();
    await ensureDefaultAppointmentTypes(prisma, businessId);

    const types = await prisma.appointmentType.findMany({
      where: { businessId },
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    });

    return NextResponse.json({ types });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { businessId } = await requireBusinessContext();
    const data = appointmentTypeSchema.parse(await req.json());

    const existing = await prisma.appointmentType.findUnique({
      where: { businessId_name: { businessId, name: data.name } },
    });
    if (existing) throw new ApiError(409, "This appointment type already exists");

    const type = await prisma.appointmentType.create({ data: { businessId, ...data } });
    return NextResponse.json({ type }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
