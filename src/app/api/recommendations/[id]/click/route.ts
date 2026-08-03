import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireCustomerContext } from "@/lib/rbac";
import { recordRecommendationEvent } from "@/lib/recommendation-events";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { profile } = await requireCustomerContext();
    const event = await recordRecommendationEvent(prisma, { recommendationId: id, customerProfileId: profile.id, eventType: "CLICK" });
    return NextResponse.json({ event });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
