import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { appointmentNoteSchema } from "@/lib/validations/appointment";
import { logAppointmentHistory } from "@/lib/appointment-history";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const { id } = await params;

    const appointment = await prisma.appointment.findFirst({ where: { id, businessId } });
    if (!appointment) throw new ApiError(404, "Appointment not found");

    const { category, body } = appointmentNoteSchema.parse(await req.json());

    const note = await prisma.$transaction(async (tx) => {
      const created = await tx.appointmentNote.create({
        data: { appointmentId: id, category, body, authorId: session.user.id },
        include: { author: { select: { name: true } } },
      });
      await logAppointmentHistory(tx, {
        appointmentId: id,
        businessId,
        action: "NOTE_ADDED",
        description: body.slice(0, 80),
        actorId: session.user.id,
      });
      return created;
    });

    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
