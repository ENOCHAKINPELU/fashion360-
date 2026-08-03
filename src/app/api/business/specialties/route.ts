import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { customSpecialtySchema } from "@/lib/validations/business-profile";

export async function GET() {
  try {
    const { businessId } = await requireBusinessContext();
    const specialties = await prisma.businessSpecialty.findMany({ where: { businessId }, orderBy: { name: "asc" } });
    return NextResponse.json({ specialties });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { businessId } = await requireBusinessContext();
    const { name } = customSpecialtySchema.parse(await req.json());

    const existing = await prisma.businessSpecialty.findUnique({ where: { businessId_name: { businessId, name } } });
    if (existing) throw new ApiError(409, "This specialty has already been added");

    const specialty = await prisma.businessSpecialty.create({ data: { businessId, name } });
    return NextResponse.json({ specialty }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
