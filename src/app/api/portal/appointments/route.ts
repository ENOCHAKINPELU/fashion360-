import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCustomerContext, apiErrorResponse, ApiError } from "@/lib/rbac";
import { appointmentSchema } from "@/lib/validations/appointment";
import { getNotificationProvider } from "@/lib/providers/notification";

export async function POST(req: NextRequest) {
  try {
    const { session } = await requireCustomerContext();

    const customer = await prisma.customer.findUnique({ where: { userId: session.user.id } });
    if (!customer) throw new ApiError(404, "No customer profile linked to this account");

    const data = appointmentSchema.omit({ customerId: true }).parse(await req.json());

    const appointment = await prisma.appointment.create({
      data: {
        businessId: customer.businessId,
        customerId: customer.id,
        type: data.type,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        notes: data.notes,
      },
    });

    await getNotificationProvider().send({
      businessId: customer.businessId,
      channel: "EMAIL",
      title: "New appointment request",
      body: `${customer.name} requested a ${data.type.toLowerCase()} appointment.`,
    });

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
