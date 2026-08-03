import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireCustomerContext } from "@/lib/rbac";
import { generateDesignRecommendations } from "@/lib/recommendations";

export async function GET() {
  try {
    const { profile } = await requireCustomerContext();
    const settings = await prisma.personalizationSettings.findUnique({ where: { customerProfileId: profile.id } });
    if (settings?.personalizationEnabled === false) return NextResponse.json({ recommendations: [] });

    const recommendations = await prisma.$transaction((tx) => generateDesignRecommendations(tx, profile.id), { timeout: 20000 });
    const designs = await prisma.design.findMany({
      where: { id: { in: recommendations.map((r) => r.targetId) } },
      select: { id: true, name: true, mainImageUrl: true, basePrice: true, businessId: true, business: { select: { name: true, logoUrl: true } } },
    });
    const designById = new Map(designs.map((d) => [d.id, d]));

    return NextResponse.json({
      recommendations: recommendations.map((r) => ({ id: r.id, reasonText: r.reasonText, design: designById.get(r.targetId) ?? null })).filter((r) => r.design),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
