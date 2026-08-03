import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { cancelSchema } from "@/lib/validations/appointment";
import { cancelPendingReminders } from "@/lib/appointment-reminders";
import { logAppointmentHistory } from "@/lib/appointment-history";
import { notifyCustomer } from "@/lib/service-request-notify";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const { id } = await params;

    const appointment = await prisma.appointment.findFirst({ where: { id, businessId }, include: { type: true } });
    if (!appointment) throw new ApiError(404, "Appointment not found");

    const { reason } = cancelSchema.parse(await req.json().catch(() => ({})));

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.appointment.update({
        where: { id },
        data: { status: "CANCELLED", cancelReason: reason || null },
        include: { type: true, customer: true },
      });
      await logAppointmentHistory(tx, {
        appointmentId: id,
        businessId,
        action: "CANCELLED",
        description: reason,
        actorId: session.user.id,
      });
      await cancelPendingReminders(tx, id);
      if (appointment.customerProfileId) {
        await notifyCustomer(tx, {
          businessId,
          customerProfileId: appointment.customerProfileId,
          title: "Your appointment was cancelled",
          body: `Your ${appointment.type.name} on ${appointment.startTime.toLocaleDateString()} was cancelled by the business.${reason ? ` Reason: ${reason}` : ""}`,
          type: "warning",
        });
      }
      return result;
    });

    return NextResponse.json({ appointment: updated });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
