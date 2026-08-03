import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { rescheduleSchema } from "@/lib/validations/appointment";
import { assertSlotIsBookable, getOrCreateAvailability } from "@/lib/availability";
import { cancelPendingReminders, scheduleReminders } from "@/lib/appointment-reminders";
import { logAppointmentHistory } from "@/lib/appointment-history";
import { notifyCustomer } from "@/lib/service-request-notify";
import { sendEmail } from "@/lib/mailer";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const { id } = await params;

    const appointment = await prisma.appointment.findFirst({
      where: { id, businessId },
      include: { customer: true, type: true },
    });
    if (!appointment) throw new ApiError(404, "Appointment not found");

    const data = rescheduleSchema.parse(await req.json());
    const business = await prisma.business.findUniqueOrThrow({ where: { id: businessId } });
    const availability = await getOrCreateAvailability(businessId);

    const durationMinutes =
      data.durationMinutes ?? Math.round((appointment.endTime.getTime() - appointment.startTime.getTime()) / 60_000);
    const newStart = new Date(`${data.date}T${data.time}:00`);
    const newEnd = new Date(newStart.getTime() + durationMinutes * 60_000);

    await assertSlotIsBookable({
      businessId,
      business,
      availability,
      startTime: newStart,
      endTime: newEnd,
      assignedStaffId: appointment.assignedStaffId,
      excludeAppointmentId: id,
    });

    const oldStart = appointment.startTime;

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.appointment.update({
        where: { id },
        data: {
          startTime: newStart,
          endTime: newEnd,
          status: "SCHEDULED",
          rescheduleCount: { increment: 1 },
        },
        include: { type: true, customer: true },
      });

      await logAppointmentHistory(tx, {
        appointmentId: id,
        businessId,
        action: "RESCHEDULED",
        description: `${oldStart.toLocaleString()} → ${newStart.toLocaleString()}${data.reason ? ` (${data.reason})` : ""}`,
        actorId: session.user.id,
      });

      await cancelPendingReminders(tx, id);
      await scheduleReminders(
        tx,
        id,
        newStart,
        appointment.reminderPreferences as { channels?: never; offsetsMinutes?: never } | null
      );

      if (appointment.customerProfileId) {
        await notifyCustomer(tx, {
          businessId,
          customerProfileId: appointment.customerProfileId,
          title: "Your appointment was rescheduled",
          body: `Your ${appointment.type.name} has been moved to ${newStart.toLocaleString()}.${data.reason ? ` Reason: ${data.reason}` : ""}`,
          type: "info",
        });
      }

      return result;
    });

    if (data.notifyCustomer && appointment.customer.email) {
      await sendEmail({
        to: appointment.customer.email,
        subject: "Your appointment has been rescheduled",
        body: `Hi ${appointment.customer.firstName}, your appointment has been moved to ${newStart.toLocaleString()}.${data.reason ? ` Reason: ${data.reason}` : ""}`,
      });
    }

    return NextResponse.json({ appointment: updated });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
