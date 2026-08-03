import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireCustomerContext } from "@/lib/rbac";
import { recordRecommendationEvent } from "@/lib/recommendation-events";
import { logCustomerBehavior } from "@/lib/customer-behavior";

// Saving a recommendation both logs the analytics event AND performs the
// real save (DesignFavorite / CustomerPreferredDesigner) — a "saved"
// recommendation and a design/designer favorite are the same underlying
// fact, not two separate records to keep in sync.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { profile } = await requireCustomerContext();

    const recommendation = await prisma.recommendation.findUniqueOrThrow({ where: { id } });
    if (recommendation.customerProfileId !== profile.id) throw new ApiError(404, "Recommendation not found");

    if (recommendation.type === "DESIGN") {
      await prisma.designFavorite.upsert({
        where: { designId_customerProfileId: { designId: recommendation.targetId, customerProfileId: profile.id } },
        create: { businessId: recommendation.businessId!, designId: recommendation.targetId, customerProfileId: profile.id },
        update: {},
      });
      await logCustomerBehavior(prisma, { customerProfileId: profile.id, businessId: recommendation.businessId, type: "DESIGN_SAVED", targetType: "DESIGN", targetId: recommendation.targetId });
    } else if (recommendation.type === "DESIGNER") {
      await prisma.customerPreferredDesigner.upsert({
        where: { customerProfileId_businessId: { customerProfileId: profile.id, businessId: recommendation.targetId } },
        create: { customerProfileId: profile.id, businessId: recommendation.targetId },
        update: {},
      });
      await logCustomerBehavior(prisma, { customerProfileId: profile.id, businessId: recommendation.targetId, type: "DESIGNER_SAVED", targetType: "DESIGNER", targetId: recommendation.targetId });
    }

    const event = await recordRecommendationEvent(prisma, { recommendationId: id, customerProfileId: profile.id, eventType: "SAVE" });
    return NextResponse.json({ event });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
