import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireCustomerContext } from "@/lib/rbac";
import { customerBookingSchema } from "@/lib/validations/appointment";
import { assertSlotIsBookable, getOrCreateAvailability } from "@/lib/availability";
import { scheduleReminders } from "@/lib/appointment-reminders";
import { logAppointmentHistory } from "@/lib/appointment-history";
import { ensureLinkedCrmCustomer } from "@/lib/business-customer-relationship";
import { notifyBusinessOwners } from "@/lib/service-request-notify";

// Part 6/7: booking from a Service Request, a Business Profile, or an
// already-Connected Business — all three collapse to the same requirement:
// an ACTIVE BusinessCustomerRelationship. A service request that hasn't
// reached mutual acceptance yet has no ACTIVE relationship, so booking
// against it correctly fails here rather than needing a separate check.
export async function POST(req: NextRequest) {
  try {
    const { profile, session } = await requireCustomerContext();
    const data = customerBookingSchema.parse(await req.json());

    const relationship = await prisma.businessCustomerRelationship.findUnique({
      where: { businessId_customerProfileId: { businessId: data.businessId, customerProfileId: profile.id } },
    });
    if (!relationship || relationship.status !== "ACTIVE") {
      throw new ApiError(403, "You need an active connection with this business to book an appointment");
    }

    if (data.serviceRequestId) {
      const serviceRequest = await prisma.serviceRequest.findUnique({ where: { id: data.serviceRequestId } });
      if (!serviceRequest || serviceRequest.businessId !== data.businessId || serviceRequest.customerProfileId !== profile.id) {
        throw new ApiError(404, "Service request not found");
      }
    }

    const type = await prisma.appointmentType.findUnique({ where: { id: data.typeId } });
    if (!type || type.businessId !== data.businessId) throw new ApiError(400, "Invalid appointment type");

    const business = await prisma.business.findUniqueOrThrow({ where: { id: data.businessId } });
    const availability = await getOrCreateAvailability(data.businessId);

    const startTime = new Date(`${data.date}T${data.time}:00`);
    const endTime = new Date(startTime.getTime() + data.durationMinutes * 60_000);

    await assertSlotIsBookable({ businessId: data.businessId, business, availability, startTime, endTime });

    const appointment = await prisma.$transaction(async (tx) => {
      const customerId = await ensureLinkedCrmCustomer(tx, relationship);

      const result = await tx.appointment.create({
        data: {
          businessId: data.businessId,
          customerId,
          customerProfileId: profile.id,
          serviceRequestId: data.serviceRequestId || null,
          typeId: data.typeId,
          status: "PENDING_CONFIRMATION",
          startTime,
          endTime,
          location: data.location || null,
          notes: data.notes || null,
        },
      });

      await logAppointmentHistory(tx, { appointmentId: result.id, businessId: data.businessId, action: "CREATED", actorId: session.user.id });
      await scheduleReminders(tx, result.id, startTime);
      await notifyBusinessOwners(tx, {
        businessId: data.businessId,
        title: "New appointment request",
        body: `${session.user.name ?? "A customer"} requested a ${type.name} on ${startTime.toLocaleDateString()}.`,
        type: "info",
      });

      return result;
    });

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
