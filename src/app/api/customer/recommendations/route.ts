import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireCustomerContext } from "@/lib/rbac";
import { generateDesignRecommendations, generateDesignerRecommendations, generateServiceRecommendations } from "@/lib/recommendations";

// The combined summary endpoint — GET /customer/recommendations/designs,
// /designers, and /services return the full detail per type; this is the
// lightweight "give me a bit of everything" view for a compact widget.
export async function GET() {
  try {
    const { profile } = await requireCustomerContext();
    const settings = await prisma.personalizationSettings.findUnique({ where: { customerProfileId: profile.id } });
    if (settings?.personalizationEnabled === false) {
      return NextResponse.json({ designs: [], designers: [], services: [] });
    }

    const [designRecs, designerRecs, serviceRecs] = await prisma.$transaction(
      (tx) => Promise.all([generateDesignRecommendations(tx, profile.id, { limit: 6 }), generateDesignerRecommendations(tx, profile.id, { limit: 6 }), generateServiceRecommendations(tx, profile.id, { limit: 6 })]),
      { timeout: 20000 }
    );

    const [designs, businesses, services] = await Promise.all([
      prisma.design.findMany({ where: { id: { in: designRecs.map((r) => r.targetId) } }, select: { id: true, name: true, mainImageUrl: true, businessId: true } }),
      prisma.business.findMany({ where: { id: { in: designerRecs.map((r) => r.targetId) } }, select: { id: true, name: true, logoUrl: true, rating: { select: { averageRating: true, totalReviews: true } } } }),
      prisma.businessService.findMany({ where: { id: { in: serviceRecs.map((r) => r.targetId) } }, select: { id: true, name: true, category: true, businessId: true } }),
    ]);
    const designById = new Map(designs.map((d) => [d.id, d]));
    const businessById = new Map(businesses.map((b) => [b.id, b]));
    const serviceById = new Map(services.map((s) => [s.id, s]));

    return NextResponse.json({
      designs: designRecs.map((r) => ({ id: r.id, reasonText: r.reasonText, design: designById.get(r.targetId) })).filter((r) => r.design),
      designers: designerRecs.map((r) => ({ id: r.id, reasonText: r.reasonText, business: businessById.get(r.targetId) })).filter((r) => r.business),
      services: serviceRecs.map((r) => ({ id: r.id, reasonText: r.reasonText, service: serviceById.get(r.targetId) })).filter((r) => r.service),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
