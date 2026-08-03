import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { appointmentFormSchema } from "@/lib/validations/appointment";
import { assertSlotIsBookable, getOrCreateAvailability } from "@/lib/availability";
import { scheduleReminders } from "@/lib/appointment-reminders";
import { logAppointmentHistory } from "@/lib/appointment-history";
import { logCustomerActivity } from "@/lib/customer-activity";
import { nextCustomerCode } from "@/lib/customer-code";
import crypto from "crypto";
import type { Prisma, AppointmentStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { businessId } = await requireBusinessContext();
    const params = req.nextUrl.searchParams;

    const search = params.get("search")?.trim();
    const status = params.get("status") as AppointmentStatus | null;
    const typeId = params.get("typeId");
    const staffId = params.get("staffId");
    const from = params.get("from");
    const to = params.get("to");
    const customerId = params.get("customerId");

    const where: Prisma.AppointmentWhereInput = {
      businessId,
      ...(status ? { status } : {}),
      ...(typeId ? { typeId } : {}),
      ...(staffId ? { assignedStaffId: staffId } : {}),
      ...(customerId ? { customerId } : {}),
      ...(from || to
        ? {
            startTime: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { id: { contains: search, mode: "insensitive" } },
              { customer: { firstName: { contains: search, mode: "insensitive" } } },
              { customer: { lastName: { contains: search, mode: "insensitive" } } },
              { customer: { phone: { contains: search, mode: "insensitive" } } },
              { customer: { customerCode: { contains: search, mode: "insensitive" } } },
              { type: { name: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const appointments = await prisma.appointment.findMany({
      where,
      orderBy: { startTime: "asc" },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, phone: true, profilePhotoUrl: true } },
        type: true,
        assignedStaff: { select: { id: true, name: true, image: true } },
      },
      take: 500,
    });

    return NextResponse.json({ appointments });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const data = appointmentFormSchema.parse(await req.json());

    const business = await prisma.business.findUniqueOrThrow({ where: { id: businessId } });
    const availability = await getOrCreateAvailability(businessId);

    const startTime = new Date(`${data.date}T${data.time}:00`);
    const endTime = new Date(startTime.getTime() + data.durationMinutes * 60_000);

    const occurrenceCount = data.recurrence?.occurrences ?? 1;
    const frequency = data.recurrence?.frequency;
    const recurrenceGroupId = occurrenceCount > 1 ? crypto.randomUUID() : null;

    function offsetOccurrence(index: number) {
      const s = new Date(startTime);
      if (frequency === "DAILY") s.setDate(s.getDate() + index);
      else if (frequency === "WEEKLY") s.setDate(s.getDate() + index * 7);
      else if (frequency === "MONTHLY") s.setMonth(s.getMonth() + index);
      const e = new Date(s.getTime() + data.durationMinutes * 60_000);
      return { start: s, end: e };
    }

    const created = await prisma.$transaction(async (tx) => {
      let customerId = data.customerId;

      if (!customerId && data.newCustomer) {
        const customerCode = await nextCustomerCode(tx, businessId);
        const customer = await tx.customer.create({
          data: {
            businessId,
            customerCode,
            firstName: data.newCustomer.firstName,
            lastName: data.newCustomer.lastName,
            email: data.newCustomer.email || null,
            phone: data.newCustomer.phone || null,
          },
        });
        await logCustomerActivity(tx, {
          customerId: customer.id,
          businessId,
          type: "CUSTOMER_CREATED",
          title: "Customer profile created",
          actorId: session.user.id,
        });
        customerId = customer.id;
      }
      if (!customerId) throw new ApiError(400, "A customer is required");

      const results: { appointmentId: string; startTime: Date; skipped?: string }[] = [];

      for (let i = 0; i < occurrenceCount; i++) {
        const { start, end } = i === 0 ? { start: startTime, end: endTime } : offsetOccurrence(i);

        try {
          await assertSlotIsBookable({
            businessId,
            business,
            availability,
            startTime: start,
            endTime: end,
            assignedStaffId: data.assignedStaffId || null,
          });
        } catch (error) {
          if (i === 0) throw error; // the primary occurrence must succeed
          results.push({ appointmentId: "", startTime: start, skipped: error instanceof ApiError ? error.message : "Conflict" });
          continue;
        }

        const appointment = await tx.appointment.create({
          data: {
            businessId,
            customerId,
            typeId: data.typeId,
            status: data.status,
            startTime: start,
            endTime: end,
            assignedStaffId: data.assignedStaffId || null,
            location: data.location || null,
            notes: data.notes || null,
            reminderPreferences: { channels: data.reminderChannels, offsetsMinutes: data.reminderOffsets },
            recurrenceGroupId,
          },
        });

        await logAppointmentHistory(tx, {
          appointmentId: appointment.id,
          businessId,
          action: "CREATED",
          actorId: session.user.id,
        });
        await logCustomerActivity(tx, {
          customerId,
          businessId,
          type: "APPOINTMENT_BOOKED",
          title: "Appointment booked",
          actorId: session.user.id,
        });
        await scheduleReminders(tx, appointment.id, start, {
          channels: data.reminderChannels,
          offsetsMinutes: data.reminderOffsets,
        });

        results.push({ appointmentId: appointment.id, startTime: start });
      }

      return results;
    });

    return NextResponse.json({ appointments: created }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
