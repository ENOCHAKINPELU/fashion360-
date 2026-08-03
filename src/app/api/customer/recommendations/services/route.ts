import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireCustomerContext } from "@/lib/rbac";
import { generateServiceRecommendations } from "@/lib/recommendations";

export async function GET() {
  try {
    const { profile } = await requireCustomerContext();
    const settings = await prisma.personalizationSettings.findUnique({ where: { customerProfileId: profile.id } });
    if (settings?.personalizationEnabled === false) return NextResponse.json({ recommendations: [] });

    const recommendations = await prisma.$transaction((tx) => generateServiceRecommendations(tx, profile.id), { timeout: 20000 });
    const services = await prisma.businessService.findMany({
      where: { id: { in: recommendations.map((r) => r.targetId) } },
      select: { id: true, name: true, category: true, priceMin: true, priceMax: true, businessId: true, business: { select: { name: true, logoUrl: true } } },
    });
    const serviceById = new Map(services.map((s) => [s.id, s]));

    return NextResponse.json({
      recommendations: recommendations.map((r) => ({ id: r.id, reasonText: r.reasonText, service: serviceById.get(r.targetId) ?? null })).filter((r) => r.service),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
