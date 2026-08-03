import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { measurementTemplateSchema } from "@/lib/validations/measurement";
import { ensureDefaultMeasurementTypes } from "@/lib/measurement-types";
import { ensureDefaultMeasurementTemplates } from "@/lib/measurement-templates";

export async function GET() {
  try {
    const { businessId } = await requireBusinessContext();
    await ensureDefaultMeasurementTypes(prisma, businessId);
    await ensureDefaultMeasurementTemplates(prisma, businessId);

    const templates = await prisma.measurementTemplate.findMany({
      where: { businessId },
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
      include: { fields: { include: { measurementType: true }, orderBy: { sortOrder: "asc" } } },
    });

    return NextResponse.json({ templates });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { businessId } = await requireBusinessContext();
    const data = measurementTemplateSchema.parse(await req.json());

    const existing = await prisma.measurementTemplate.findUnique({ where: { businessId_name: { businessId, name: data.name } } });
    if (existing) throw new ApiError(409, "A template with this name already exists");

    const template = await prisma.$transaction(async (tx) => {
      const created = await tx.measurementTemplate.create({
        data: { businessId, name: data.name, category: data.category, isSystem: false },
      });

      for (const [index, field] of data.fields.entries()) {
        await tx.measurementTemplateField.create({
          data: { templateId: created.id, measurementTypeId: field.measurementTypeId, required: field.required, sortOrder: index },
        });
      }

      return tx.measurementTemplate.findUniqueOrThrow({
        where: { id: created.id },
        include: { fields: { include: { measurementType: true } } },
      });
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
