import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireCustomerContext } from "@/lib/rbac";
import { generateDesignerRecommendations } from "@/lib/recommendations";

export async function GET() {
  try {
    const { profile } = await requireCustomerContext();
    const settings = await prisma.personalizationSettings.findUnique({ where: { customerProfileId: profile.id } });
    if (settings?.personalizationEnabled === false) return NextResponse.json({ recommendations: [] });

    const recommendations = await prisma.$transaction((tx) => generateDesignerRecommendations(tx, profile.id), { timeout: 20000 });
    const businesses = await prisma.business.findMany({
      where: { id: { in: recommendations.map((r) => r.targetId) } },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        city: true,
        rating: { select: { averageRating: true, totalReviews: true, verifiedReviewCount: true } },
        trustBadgeAssignments: { select: { trustBadge: { select: { type: true, label: true } } } },
        portfolioItems: { orderBy: { sortOrder: "asc" }, take: 3, select: { imageUrl: true } },
      },
    });
    const businessById = new Map(businesses.map((b) => [b.id, b]));

    return NextResponse.json({
      recommendations: recommendations.map((r) => ({ id: r.id, reasonText: r.reasonText, business: businessById.get(r.targetId) ?? null })).filter((r) => r.business),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
