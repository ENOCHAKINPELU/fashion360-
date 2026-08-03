import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireCustomerContext } from "@/lib/rbac";
import { nextServiceRequestCode } from "@/lib/service-request-code";
import { recordRecommendationEvent } from "@/lib/recommendation-events";
import { logCustomerBehavior } from "@/lib/customer-behavior";
import { notifyBusinessOwners } from "@/lib/service-request-notify";

// Turns a recommendation directly into a real ServiceRequest — the same
// intake every other "request a service" action in the app uses, so it
// shows up in the business's normal inbox rather than a parallel queue.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { profile } = await requireCustomerContext();

    const recommendation = await prisma.recommendation.findUniqueOrThrow({ where: { id } });
    if (recommendation.customerProfileId !== profile.id) throw new ApiError(404, "Recommendation not found");
    if (!recommendation.businessId) throw new ApiError(400, "This recommendation isn't linked to a business");

    let description = "Interested in working with you, found via Fashion360 recommendations.";
    let serviceId: string | undefined;
    if (recommendation.type === "DESIGN") {
      const design = await prisma.design.findUnique({ where: { id: recommendation.targetId }, select: { name: true } });
      description = `Interested in the design "${design?.name ?? recommendation.targetId}".`;
    } else if (recommendation.type === "SERVICE") {
      const service = await prisma.businessService.findUnique({ where: { id: recommendation.targetId }, select: { name: true, id: true } });
      description = `Interested in the service "${service?.name ?? recommendation.targetId}".`;
      serviceId = service?.id;
    }

    const requestCode = await nextServiceRequestCode(prisma, recommendation.businessId);
    const request = await prisma.serviceRequest.create({
      data: { businessId: recommendation.businessId, customerProfileId: profile.id, requestCode, description, status: "SUBMITTED", serviceId },
    });

    await logCustomerBehavior(prisma, {
      customerProfileId: profile.id,
      businessId: recommendation.businessId,
      type: recommendation.type === "SERVICE" ? "SERVICE_REQUESTED" : "SERVICE_REQUESTED",
      targetType: recommendation.type,
      targetId: recommendation.targetId,
    });
    await notifyBusinessOwners(prisma, { businessId: recommendation.businessId, title: "New service request", body: description, type: "info" });

    await recordRecommendationEvent(prisma, { recommendationId: id, customerProfileId: profile.id, eventType: "REQUEST" });

    return NextResponse.json({ request }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
