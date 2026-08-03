import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireBusinessContext } from "@/lib/rbac";

// Part 27: business review dashboard data — rating summary, recent reviews,
// and which ones are still awaiting a response. Never exposes another
// business's reviews or lets this route touch/delete a review.
export async function GET(req: NextRequest) {
  try {
    const { businessId } = await requireBusinessContext();
    const filter = req.nextUrl.searchParams.get("filter");

    const where: Prisma.ReviewWhereInput =
      filter === "pending-response"
        ? { businessId, status: "PUBLISHED", response: null }
        : filter === "flagged"
          ? { businessId, status: "FLAGGED" }
          : { businessId, status: { in: ["PUBLISHED", "FLAGGED"] } };

    const [rating, ranking, badges, reviews] = await Promise.all([
      prisma.businessRating.findUnique({ where: { businessId } }),
      prisma.businessRanking.findUnique({ where: { businessId }, select: { score: true } }),
      prisma.trustBadgeAssignment.findMany({ where: { businessId }, include: { trustBadge: { select: { type: true, label: true } } } }),
      prisma.review.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          customerProfile: { select: { username: true, profilePhotoUrl: true } },
          order: { select: { orderCode: true } },
          ratings: true,
          photos: true,
          response: true,
        },
      }),
    ]);

    return NextResponse.json({
      rating: rating ?? { averageRating: 0, totalReviews: 0, verifiedReviewCount: 0, recentReviewCount: 0, categoryAverages: null },
      rankingScore: ranking?.score ?? 0,
      badges: badges.map((b) => b.trustBadge),
      reviews,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
