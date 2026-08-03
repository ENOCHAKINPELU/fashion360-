import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/rbac";

// Part 16: "do not display misleading ratings if the review count is too
// low" — the client decides copy like "New on Fashion360" from
// totalReviews === 0; this just returns the honest numbers.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const rating = await prisma.businessRating.findUnique({ where: { businessId: id } });
    return NextResponse.json({
      rating: rating ?? { averageRating: 0, totalReviews: 0, verifiedReviewCount: 0, recentReviewCount: 0, categoryAverages: null },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
