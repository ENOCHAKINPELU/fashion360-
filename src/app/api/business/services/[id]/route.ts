import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { businessServiceSchema } from "@/lib/validations/service";

async function loadOwnedService(id: string, businessId: string) {
  const service = await prisma.businessService.findUnique({ where: { id } });
  if (!service || service.businessId !== businessId) throw new ApiError(404, "Service not found");
  return service;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;
    await loadOwnedService(id, businessId);
    const data = businessServiceSchema.partial().parse(await req.json());

    const service = await prisma.businessService.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description || null } : {}),
        ...(data.category !== undefined ? { category: data.category } : {}),
        ...(data.priceMin !== undefined ? { priceMin: data.priceMin || null } : {}),
        ...(data.priceMax !== undefined ? { priceMax: data.priceMax || null } : {}),
        ...(data.estimatedDurationDays !== undefined
          ? { estimatedDurationDays: data.estimatedDurationDays ? Number(data.estimatedDurationDays) : null }
          : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });

    return NextResponse.json({ service });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;
    await loadOwnedService(id, businessId);

    await prisma.businessService.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
