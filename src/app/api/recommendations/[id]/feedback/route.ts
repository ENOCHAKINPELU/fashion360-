import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireCustomerContext } from "@/lib/rbac";
import { recommendationFeedbackSchema } from "@/lib/validations/personalization";
import { recordRecommendationEvent } from "@/lib/recommendation-events";

const ACTION_TO_EVENT = { "not-interested": "DISMISS", hide: "HIDE", "show-more-like-this": "SHOW_MORE_LIKE_THIS" } as const;

// Part 16: Save/Not Interested/Hide/Show More Like This — Save has its own
// dedicated route (POST /recommendations/:id/save) since it also creates a
// real DesignFavorite/CustomerPreferredDesigner row, not just an event.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { profile } = await requireCustomerContext();
    const data = recommendationFeedbackSchema.parse(await req.json());

    const event = await recordRecommendationEvent(prisma, { recommendationId: id, customerProfileId: profile.id, eventType: ACTION_TO_EVENT[data.action] });
    return NextResponse.json({ event });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
