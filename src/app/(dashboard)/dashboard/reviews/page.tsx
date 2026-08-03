import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BusinessReviewsPageClient } from "@/features/reviews/components/business-reviews-page-client";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default async function BusinessReviewsPage() {
  const session = await auth();
  const businessId = session!.user.businessId!;

  const [rating, ranking, badges, reviews] = await Promise.all([
    prisma.businessRating.findUnique({ where: { businessId } }),
    prisma.businessRanking.findUnique({ where: { businessId }, select: { score: true } }),
    prisma.trustBadgeAssignment.findMany({ where: { businessId }, include: { trustBadge: { select: { type: true, label: true } } } }),
    prisma.review.findMany({
      where: { businessId, status: { in: ["PUBLISHED", "FLAGGED", "PENDING_MODERATION"] } },
      orderBy: { createdAt: "desc" },
      include: {
        customerProfile: { select: { username: true, profilePhotoUrl: true } },
        order: { select: { orderCode: true } },
        ratings: true,
        photos: true,
        response: true,
      },
    }),
  ]);

  const now = new Date();
  const monthBuckets = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const monthlyReviews = await Promise.all(
    monthBuckets.map(({ year, month }) =>
      prisma.review.findMany({
        where: { businessId, status: "PUBLISHED", createdAt: { gte: new Date(year, month, 1), lt: new Date(year, month + 1, 1) } },
        select: { overallRating: true },
      })
    )
  );
  const volumeData = monthBuckets.map((b, i) => ({ label: MONTH_LABELS[b.month], value: monthlyReviews[i].length }));
  const ratingTrendData = monthBuckets.map((b, i) => {
    const rows = monthlyReviews[i];
    const avg = rows.length > 0 ? rows.reduce((s, r) => s + r.overallRating, 0) / rows.length : 0;
    return { label: MONTH_LABELS[b.month], value: Math.round(avg * 10) / 10 };
  });

  return (
    <BusinessReviewsPageClient
      rating={
        rating
          ? {
              averageRating: rating.averageRating,
              totalReviews: rating.totalReviews,
              verifiedReviewCount: rating.verifiedReviewCount,
              recentReviewCount: rating.recentReviewCount,
              categoryAverages: rating.categoryAverages as Record<string, number> | null,
            }
          : null
      }
      rankingScore={ranking?.score ?? 0}
      badges={badges.map((b) => b.trustBadge)}
      reviews={JSON.parse(JSON.stringify(reviews))}
      volumeTrend={volumeData}
      ratingTrend={ratingTrendData}
    />
  );
}
