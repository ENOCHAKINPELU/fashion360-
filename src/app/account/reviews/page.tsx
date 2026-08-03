import { prisma } from "@/lib/prisma";
import { requireCustomerContext } from "@/lib/rbac";
import { getReviewableOrders } from "@/lib/review-eligibility";
import { ensureReviewReminderSent } from "@/lib/review-reminders";
import { isReviewEditable } from "@/lib/validations/review";
import { CustomerReviewsPageClient } from "@/features/reviews/components/customer-reviews-page-client";

export default async function CustomerReviewsPage() {
  const { profile } = await requireCustomerContext();

  const reviewableOrders = await getReviewableOrders(prisma, profile.id);
  await Promise.all(reviewableOrders.map((o) => ensureReviewReminderSent(prisma, { orderId: o.id })));

  const reviews = await prisma.review.findMany({
    where: { customerProfileId: profile.id },
    orderBy: { createdAt: "desc" },
    include: {
      business: { select: { id: true, name: true, logoUrl: true } },
      order: { select: { id: true, orderCode: true } },
      ratings: true,
      photos: true,
      response: true,
    },
  });

  const reviewsWithEditability = reviews.map((review) => ({ ...review, canEdit: isReviewEditable(review) }));

  return (
    <CustomerReviewsPageClient
      reviewableOrders={JSON.parse(JSON.stringify(reviewableOrders))}
      reviews={JSON.parse(JSON.stringify(reviewsWithEditability))}
    />
  );
}
