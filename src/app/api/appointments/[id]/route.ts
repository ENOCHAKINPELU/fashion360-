import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusinessContext, apiErrorResponse, ApiError } from "@/lib/rbac";
import { appointmentSchema } from "@/lib/validations/appointment";
import { z } from "zod";

const APPOINTMENT_STATUSES = ["SCHEDULED", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"] as const;

const patchSchema = appointmentSchema.partial().extend({
  status: z.enum(APPOINTMENT_STATUSES).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;

    const existing = await prisma.appointment.findFirst({ where: { id, businessId } });
    if (!existing) throw new ApiError(404, "Appointment not found");

    const body = await req.json();
    const data = patchSchema.parse(body);

    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        ...(data.status ? { status: data.status } : {}),
        ...(data.type ? { type: data.type } : {}),
        ...(data.startTime ? { startTime: new Date(data.startTime) } : {}),
        ...(data.endTime ? { endTime: new Date(data.endTime) } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
      },
    });

    return NextResponse.json({ appointment });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;

    const existing = await prisma.appointment.findFirst({ where: { id, businessId } });
    if (!existing) throw new ApiError(404, "Appointment not found");

    await prisma.appointment.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
