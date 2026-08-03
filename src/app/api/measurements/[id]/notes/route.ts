import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { measurementNoteSchema } from "@/lib/validations/measurement";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const { id } = await params;

    const measurement = await prisma.measurement.findFirst({ where: { id, businessId } });
    if (!measurement) throw new ApiError(404, "Measurement not found");

    const { category, body } = measurementNoteSchema.parse(await req.json());

    const note = await prisma.measurementNote.create({
      data: { measurementId: id, category, body, authorId: session.user.id },
      include: { author: { select: { name: true } } },
    });

    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
