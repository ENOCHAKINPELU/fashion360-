import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { appointmentTypeSchema } from "@/lib/validations/appointment";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;

    const existing = await prisma.appointmentType.findFirst({ where: { id, businessId } });
    if (!existing) throw new ApiError(404, "Appointment type not found");

    const data = appointmentTypeSchema.partial().parse(await req.json());
    const type = await prisma.appointmentType.update({ where: { id }, data });

    return NextResponse.json({ type });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;

    const existing = await prisma.appointmentType.findFirst({ where: { id, businessId } });
    if (!existing) throw new ApiError(404, "Appointment type not found");
    if (existing.isSystem) throw new ApiError(400, "Default appointment types cannot be deleted");

    const inUse = await prisma.appointment.count({ where: { typeId: id } });
    if (inUse > 0) throw new ApiError(409, "This type is used by existing appointments and cannot be deleted");

    await prisma.appointmentType.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
