import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { logAppointmentHistory } from "@/lib/appointment-history";
import { cancelPendingReminders, scheduleReminders } from "@/lib/appointment-reminders";
import { notifyCustomer } from "@/lib/service-request-notify";
import { z } from "zod";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;

    const appointment = await prisma.appointment.findFirst({
      where: { id, businessId },
      include: {
        customer: true,
        type: true,
        assignedStaff: { select: { id: true, name: true, image: true } },
        appointmentNotes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } },
        reminders: { orderBy: { scheduledFor: "asc" } },
        history: { orderBy: { createdAt: "desc" }, include: { actor: { select: { name: true } } } },
      },
    });
    if (!appointment) throw new ApiError(404, "Appointment not found");

    const [previous, upcoming] = await Promise.all([
      prisma.appointment.findMany({
        where: { businessId, customerId: appointment.customerId, startTime: { lt: appointment.startTime } },
        orderBy: { startTime: "desc" },
        take: 5,
        include: { type: true },
      }),
      prisma.appointment.findMany({
        where: {
          businessId,
          customerId: appointment.customerId,
          startTime: { gt: appointment.startTime },
          id: { not: appointment.id },
        },
        orderBy: { startTime: "asc" },
        take: 5,
        include: { type: true },
      }),
    ]);

    return NextResponse.json({ appointment, previous, upcoming });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

const editSchema = z.object({
  typeId: z.string().optional(),
  assignedStaffId: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

const actionSchema = z.object({
  action: z.enum(["confirm", "check-in", "start", "complete", "follow-up", "decline", "no-show", "approve-reschedule", "decline-reschedule"]),
  reason: z.string().optional(),
});

const ACTION_MAP = {
  confirm: { status: "CONFIRMED", history: "CONFIRMED" },
  "check-in": { status: "CHECKED_IN", history: "CHECKED_IN" },
  start: { status: "IN_PROGRESS", history: "STATUS_CHANGED" },
  complete: { status: "COMPLETED", history: "COMPLETED" },
  "follow-up": { status: "SCHEDULED", history: "FOLLOW_UP_SCHEDULED" },
  decline: { status: "DECLINED", history: "DECLINED" },
  "no-show": { status: "NO_SHOW", history: "NO_SHOW" },
} as const;

const CUSTOMER_NOTIFY_TITLES: Partial<Record<z.infer<typeof actionSchema>["action"], string>> = {
  confirm: "Your appointment was confirmed",
  complete: "Your appointment is complete",
  decline: "Your appointment request was declined",
  "no-show": "You were marked as a no-show",
};

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const { id } = await params;

    const appointment = await prisma.appointment.findFirst({ where: { id, businessId }, include: { type: true } });
    if (!appointment) throw new ApiError(404, "Appointment not found");

    // z.union([editSchema, actionSchema]) always matched editSchema first
    // (every field on it is optional, so any object — including one that's
    // only { action: ... } — parses successfully against it, silently
    // dropping `action`). Branching on the raw payload before validating
    // against the right schema avoids that ambiguity entirely.
    const rawBody = await req.json();
    const body = "action" in rawBody ? actionSchema.parse(rawBody) : editSchema.parse(rawBody);

    if ("action" in body) {
      if (body.action === "approve-reschedule" || body.action === "decline-reschedule") {
        if (appointment.status !== "RESCHEDULE_REQUESTED" || !appointment.proposedStartTime || !appointment.proposedEndTime) {
          throw new ApiError(400, "There's no pending reschedule request on this appointment");
        }

        const updated = await prisma.$transaction(async (tx) => {
          const approve = body.action === "approve-reschedule";
          const result = await tx.appointment.update({
            where: { id },
            data: {
              status: "CONFIRMED",
              ...(approve ? { startTime: appointment.proposedStartTime!, endTime: appointment.proposedEndTime! } : {}),
              proposedStartTime: null,
              proposedEndTime: null,
              proposedByRole: null,
              proposedReason: null,
              rescheduleCount: approve ? { increment: 1 } : undefined,
            },
          });
          await logAppointmentHistory(tx, {
            appointmentId: id,
            businessId,
            action: approve ? "RESCHEDULED" : "RESCHEDULE_DECLINED",
            actorId: session.user.id,
          });
          if (approve) await scheduleReminders(tx, id, appointment.proposedStartTime!);
          if (appointment.customerProfileId) {
            await notifyCustomer(tx, {
              businessId,
              customerProfileId: appointment.customerProfileId,
              title: approve ? "Your reschedule request was approved" : "Your reschedule request was declined",
              body: approve
                ? `Your ${appointment.type.name} is now scheduled for ${appointment.proposedStartTime!.toLocaleString()}.`
                : `The business kept your ${appointment.type.name} at its original time.`,
              type: approve ? "success" : "warning",
            });
          }
          return result;
        });
        return NextResponse.json({ appointment: updated });
      }

      const config = ACTION_MAP[body.action];
      const updated = await prisma.$transaction(async (tx) => {
        const result = await tx.appointment.update({
          where: { id },
          data: {
            status: config.status,
            ...(body.action === "check-in" ? { checkedInAt: new Date() } : {}),
            ...(body.action === "complete" ? { completedAt: new Date() } : {}),
            ...(body.action === "decline" ? { cancelReason: body.reason || null } : {}),
          },
          include: { type: true, customer: true },
        });
        await logAppointmentHistory(tx, {
          appointmentId: id,
          businessId,
          action: config.history,
          description: body.action === "decline" ? body.reason : undefined,
          actorId: session.user.id,
        });
        if (body.action === "decline" || body.action === "no-show") await cancelPendingReminders(tx, id);
        if (appointment.customerProfileId && CUSTOMER_NOTIFY_TITLES[body.action]) {
          await notifyCustomer(tx, {
            businessId,
            customerProfileId: appointment.customerProfileId,
            title: CUSTOMER_NOTIFY_TITLES[body.action]!,
            body: `Your ${appointment.type.name} on ${appointment.startTime.toLocaleDateString()}.`,
            type: body.action === "decline" || body.action === "no-show" ? "warning" : "success",
          });
        }
        return result;
      });
      return NextResponse.json({ appointment: updated });
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: body,
      include: { type: true, customer: true },
    });

    return NextResponse.json({ appointment: updated });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
