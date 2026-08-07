import { prisma } from "@/lib/prisma";
import { AdminReviewModerationClient } from "@/features/admin/components/admin-review-moderation-client";

// Previously had a full backend (moderate/report/deletion-request resolve
// APIs) with no admin page to operate any of it from — this is that page.
export default async function AdminReviewsPage() {
  const [flaggedReviews, reports, deletionRequests] = await Promise.all([
    prisma.review.findMany({
      where: { status: { in: ["FLAGGED", "PENDING_MODERATION"] } },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        business: { select: { id: true, name: true } },
        customerProfile: { select: { id: true, username: true } },
        reports: { where: { status: "PENDING" } },
      },
    }),
    prisma.reviewReport.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      include: { review: { select: { id: true, bodyText: true, overallRating: true, status: true, businessId: true } } },
    }),
    prisma.reviewDeletionRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { requestedAt: "desc" },
      include: { review: { select: { id: true, bodyText: true, overallRating: true, businessId: true, createdAt: true } } },
    }),
  ]);

  const serialized = JSON.parse(JSON.stringify({ flaggedReviews, reports, deletionRequests }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Reviews</h1>
        <p className="text-sm text-muted-foreground">Moderate flagged reviews, resolve reports, and decide deletion requests.</p>
      </div>
      <AdminReviewModerationClient
        flaggedReviews={serialized.flaggedReviews}
        reports={serialized.reports}
        deletionRequests={serialized.deletionRequests}
      />
    </div>
  );
}
