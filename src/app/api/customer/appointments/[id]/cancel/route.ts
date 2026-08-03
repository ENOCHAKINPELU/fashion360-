import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireCustomerContext } from "@/lib/rbac";
import { cancelSchema } from "@/lib/validations/appointment";
import { cancelPendingReminders } from "@/lib/appointment-reminders";
import { logAppointmentHistory } from "@/lib/appointment-history";
import { notifyBusinessOwners } from "@/lib/service-request-notify";

const TERMINAL = new Set(["COMPLETED", "CANCELLED", "NO_SHOW", "EXPIRED"]);

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { profile, session } = await requireCustomerContext();
    const { id } = await params;

    const appointment = await prisma.appointment.findUnique({ where: { id }, include: { type: true } });
    if (!appointment || appointment.customerProfileId !== profile.id) throw new ApiError(404, "Appointment not found");
    if (TERMINAL.has(appointment.status)) throw new ApiError(400, "This appointment can no longer be cancelled");

    const { reason } = cancelSchema.parse(await req.json().catch(() => ({})));

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.appointment.update({
        where: { id },
        data: { status: "CANCELLED", cancelReason: reason || null },
      });
      await logAppointmentHistory(tx, { appointmentId: id, businessId: appointment.businessId, action: "CANCELLED", description: reason, actorId: session.user.id });
      await cancelPendingReminders(tx, id);
      await notifyBusinessOwners(tx, {
        businessId: appointment.businessId,
        title: "Customer cancelled an appointment",
        body: `${session.user.name ?? "A customer"} cancelled their ${appointment.type.name} on ${appointment.startTime.toLocaleDateString()}.`,
        type: "warning",
      });
      return result;
    });

    return NextResponse.json({ appointment: updated });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
