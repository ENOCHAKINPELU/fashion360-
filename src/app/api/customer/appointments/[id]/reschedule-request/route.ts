import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireCustomerContext } from "@/lib/rbac";
import { rescheduleRequestSchema } from "@/lib/validations/appointment";
import { logAppointmentHistory } from "@/lib/appointment-history";
import { notifyBusinessOwners } from "@/lib/service-request-notify";

const TERMINAL = new Set(["COMPLETED", "CANCELLED", "NO_SHOW", "EXPIRED"]);

// Part 10: a *request*, not a direct move — the business must approve or
// decline (see POST /api/appointments/[id]/reschedule for the business's
// own unilateral move of their calendar, which stays untouched by this).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { profile, session } = await requireCustomerContext();
    const { id } = await params;

    const appointment = await prisma.appointment.findUnique({ where: { id }, include: { type: true } });
    if (!appointment || appointment.customerProfileId !== profile.id) throw new ApiError(404, "Appointment not found");
    if (TERMINAL.has(appointment.status)) throw new ApiError(400, "This appointment can no longer be rescheduled");

    const data = rescheduleRequestSchema.parse(await req.json());
    const durationMinutes = Math.round((appointment.endTime.getTime() - appointment.startTime.getTime()) / 60_000);
    const proposedStartTime = new Date(`${data.date}T${data.time}:00`);
    const proposedEndTime = new Date(proposedStartTime.getTime() + durationMinutes * 60_000);

    if (proposedStartTime < new Date()) throw new ApiError(400, "Cannot propose a time in the past");

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.appointment.update({
        where: { id },
        data: {
          status: "RESCHEDULE_REQUESTED",
          proposedStartTime,
          proposedEndTime,
          proposedByRole: "CUSTOMER",
          proposedReason: data.reason || null,
        },
      });
      await logAppointmentHistory(tx, {
        appointmentId: id,
        businessId: appointment.businessId,
        action: "RESCHEDULE_REQUESTED",
        description: `Customer proposed ${proposedStartTime.toLocaleString()}${data.reason ? ` (${data.reason})` : ""}`,
        actorId: session.user.id,
      });
      await notifyBusinessOwners(tx, {
        businessId: appointment.businessId,
        title: "Customer requested a reschedule",
        body: `${session.user.name ?? "A customer"} proposed moving their ${appointment.type.name} to ${proposedStartTime.toLocaleString()}.`,
        type: "info",
      });
      return result;
    });

    return NextResponse.json({ appointment: updated });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
