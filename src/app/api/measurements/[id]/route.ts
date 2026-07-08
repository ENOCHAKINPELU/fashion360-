import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusinessContext, apiErrorResponse, ApiError } from "@/lib/rbac";
import { measurementSchema } from "@/lib/validations/measurement";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;

    const existing = await prisma.measurement.findFirst({ where: { id, businessId } });
    if (!existing) throw new ApiError(404, "Measurement not found");

    const body = await req.json();
    const data = measurementSchema.partial().parse(body);

    const measurement = await prisma.measurement.update({
      where: { id },
      data: {
        ...data,
        aiApprovedAt:
          data.source === "AI_ESTIMATED" && !existing.aiApprovedAt ? new Date() : undefined,
      },
    });

    return NextResponse.json({ measurement });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;

    const existing = await prisma.measurement.findFirst({ where: { id, businessId } });
    if (!existing) throw new ApiError(404, "Measurement not found");

    await prisma.measurement.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
