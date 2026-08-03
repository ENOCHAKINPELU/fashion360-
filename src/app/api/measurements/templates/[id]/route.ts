import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { measurementTemplateSchema } from "@/lib/validations/measurement";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;

    const template = await prisma.measurementTemplate.findFirst({
      where: { id, businessId },
      include: { fields: { include: { measurementType: true }, orderBy: { sortOrder: "asc" } } },
    });
    if (!template) throw new ApiError(404, "Template not found");

    return NextResponse.json({ template });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;
    const data = measurementTemplateSchema.parse(await req.json());

    const existing = await prisma.measurementTemplate.findFirst({ where: { id, businessId } });
    if (!existing) throw new ApiError(404, "Template not found");
    if (existing.isSystem) throw new ApiError(400, "Default templates cannot be edited");

    const duplicate = await prisma.measurementTemplate.findFirst({
      where: { businessId, name: data.name, NOT: { id } },
    });
    if (duplicate) throw new ApiError(409, "A template with this name already exists");

    const validFieldCount = await prisma.measurementType.count({
      where: { businessId, id: { in: data.fields.map((field) => field.measurementTypeId) } },
    });
    if (validFieldCount !== new Set(data.fields.map((field) => field.measurementTypeId)).size) {
      throw new ApiError(400, "One or more measurement fields are invalid");
    }

    const template = await prisma.$transaction(async (tx) => {
      await tx.measurementTemplate.update({
        where: { id },
        data: { name: data.name, category: data.category },
      });

      await tx.measurementTemplateField.deleteMany({ where: { templateId: id } });
      await tx.measurementTemplateField.createMany({
        data: data.fields.map((field, index) => ({
          templateId: id,
          measurementTypeId: field.measurementTypeId,
          required: field.required,
          sortOrder: index,
        })),
      });

      return tx.measurementTemplate.findUniqueOrThrow({
        where: { id },
        include: { fields: { include: { measurementType: true }, orderBy: { sortOrder: "asc" } } },
      });
    });

    return NextResponse.json({ template });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;

    const existing = await prisma.measurementTemplate.findFirst({ where: { id, businessId } });
    if (!existing) throw new ApiError(404, "Template not found");
    if (existing.isSystem) throw new ApiError(400, "Default templates cannot be deleted");

    await prisma.measurementTemplate.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
