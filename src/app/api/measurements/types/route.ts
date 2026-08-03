import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { measurementTypeSchema } from "@/lib/validations/measurement";
import { ensureDefaultMeasurementTypes, slugifyKey } from "@/lib/measurement-types";

export async function GET() {
  try {
    const { businessId } = await requireBusinessContext();
    await ensureDefaultMeasurementTypes(prisma, businessId);

    const types = await prisma.measurementType.findMany({
      where: { businessId },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    });

    return NextResponse.json({ types });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { businessId } = await requireBusinessContext();
    const data = measurementTypeSchema.parse(await req.json());
    const key = slugifyKey(data.label);

    const existing = await prisma.measurementType.findUnique({ where: { businessId_key: { businessId, key } } });
    if (existing) throw new ApiError(409, "A measurement field with this name already exists");

    const count = await prisma.measurementType.count({ where: { businessId } });
    const type = await prisma.measurementType.create({
      data: { businessId, key, label: data.label, category: data.category, unit: data.unit, sortOrder: count, isSystem: false },
    });

    return NextResponse.json({ type }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
