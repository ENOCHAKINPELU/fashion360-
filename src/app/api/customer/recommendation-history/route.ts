import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireCustomerContext } from "@/lib/rbac";
import { clearRecommendationHistory } from "@/lib/personalization-settings";

export async function DELETE() {
  try {
    const { profile } = await requireCustomerContext();
    await clearRecommendationHistory(prisma, profile.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
