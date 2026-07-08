import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusinessContext, apiErrorResponse, ApiError } from "@/lib/rbac";
import { appointmentSchema } from "@/lib/validations/appointment";
import { getNotificationProvider } from "@/lib/providers/notification";

export async function GET(req: NextRequest) {
  try {
    const { businessId } = await requireBusinessContext();
    const from = req.nextUrl.searchParams.get("from");
    const to = req.nextUrl.searchParams.get("to");

    const appointments = await prisma.appointment.findMany({
      where: {
        businessId,
        ...(from || to
          ? {
              startTime: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      orderBy: { startTime: "asc" },
      include: { customer: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ appointments });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { businessId } = await requireBusinessContext();
    const body = await req.json();
    const data = appointmentSchema.parse(body);

    const customer = await prisma.customer.findFirst({
      where: { id: data.customerId, businessId },
    });
    if (!customer) throw new ApiError(404, "Customer not found");

    const appointment = await prisma.appointment.create({
      data: {
        businessId,
        customerId: data.customerId,
        type: data.type,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        notes: data.notes,
      },
    });

    await getNotificationProvider().send({
      businessId,
      userId: customer.userId,
      channel: "EMAIL",
      title: "Appointment scheduled",
      body: `Your ${data.type.toLowerCase()} appointment is booked for ${data.startTime}.`,
    });

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
