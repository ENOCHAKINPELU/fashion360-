import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { measurementTypeSchema } from "@/lib/validations/measurement";
import { slugifyKey } from "@/lib/measurement-types";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;
    const data = measurementTypeSchema.parse(await req.json());

    const existing = await prisma.measurementType.findFirst({ where: { id, businessId } });
    if (!existing) throw new ApiError(404, "Measurement field not found");
    if (existing.isSystem) throw new ApiError(400, "Default measurement fields cannot be edited");

    const key = slugifyKey(data.label);
    const duplicate = await prisma.measurementType.findFirst({ where: { businessId, key, NOT: { id } } });
    if (duplicate) throw new ApiError(409, "A measurement field with this name already exists");

    const type = await prisma.measurementType.update({
      where: { id },
      data: { key, label: data.label, category: data.category, unit: data.unit },
    });

    return NextResponse.json({ type });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;

    const existing = await prisma.measurementType.findFirst({ where: { id, businessId } });
    if (!existing) throw new ApiError(404, "Measurement field not found");
    if (existing.isSystem) throw new ApiError(400, "Default measurement fields cannot be deleted");

    await prisma.measurementType.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
