import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireCustomerContext } from "@/lib/rbac";
import { requestReviewDeletion } from "@/lib/reviews";

// Part 13: DELETE here creates a deletion REQUEST, it never deletes the
// review itself — the verb matches the literal spec endpoint shape
// (DELETE /reviews/:id/request), the effect matches Part 13's own text.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { profile } = await requireCustomerContext();
    const request = await requestReviewDeletion(prisma, { reviewId: id, customerProfileId: profile.id });
    return NextResponse.json({ request });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
