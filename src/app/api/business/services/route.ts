import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireBusinessContext } from "@/lib/rbac";
import { businessServiceSchema } from "@/lib/validations/service";
import { notifyFollowersOfNewService } from "@/lib/personalization-notifications";

export async function GET() {
  try {
    const { businessId } = await requireBusinessContext();
    const services = await prisma.businessService.findMany({ where: { businessId }, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ services });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { businessId } = await requireBusinessContext();
    const data = businessServiceSchema.parse(await req.json());

    const service = await prisma.businessService.create({
      data: {
        businessId,
        name: data.name,
        description: data.description || undefined,
        category: data.category,
        priceMin: data.priceMin ? data.priceMin : undefined,
        priceMax: data.priceMax ? data.priceMax : undefined,
        estimatedDurationDays: data.estimatedDurationDays ? Number(data.estimatedDurationDays) : undefined,
        isActive: data.isActive,
      },
    });

    if (service.isActive) {
      const business = await prisma.business.findUnique({ where: { id: businessId }, select: { name: true } });
      await notifyFollowersOfNewService(prisma, { businessId, businessName: business?.name ?? "A designer you follow", serviceName: service.name });
    }

    return NextResponse.json({ service }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
