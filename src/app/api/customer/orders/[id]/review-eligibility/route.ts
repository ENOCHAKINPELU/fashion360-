import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireCustomerContext } from "@/lib/rbac";
import { getReviewEligibility } from "@/lib/review-eligibility";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { profile } = await requireCustomerContext();
    const eligibility = await getReviewEligibility(prisma, { orderId: id, customerProfileId: profile.id });
    return NextResponse.json(eligibility);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
