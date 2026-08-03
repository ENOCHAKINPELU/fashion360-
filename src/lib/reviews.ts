import type { Prisma, ReviewRatingCategory, ReviewReportReason, ReviewModerationAction } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/rbac";
import { getReviewEligibility } from "@/lib/review-eligibility";
import { runBasicModerationCheck } from "@/lib/review-moderation";
import { computeReviewTrustWeight } from "@/lib/business-rating";
import { recomputeBusinessReputation } from "@/lib/reputation-recompute";
import { logOrderActivity } from "@/lib/order-activity";
import { notifyCustomer } from "@/lib/service-request-notify";
import { notifyDesignEvent } from "@/lib/design-notifications";
import { REVIEW_EDIT_WINDOW_DAYS } from "@/lib/validations/review";
import { recordReviewLeft } from "@/lib/fashion-milestones";
import { logCustomerBehavior } from "@/lib/customer-behavior";

type Db = typeof prisma | Prisma.TransactionClient;

interface CategoryRatingInput {
  category: ReviewRatingCategory;
  rating: number;
}
interface PhotoInput {
  url: string;
  isPublic: boolean;
}

// Part 3-9: the full submission flow — eligibility re-checked server-side
// (never trusts a client-side "you can review this" state), basic automatic
// moderation runs once, and reputation is recomputed synchronously in the
// same call so search/discovery/profile reads are never stale.
export async function submitReview(
  db: Db,
  params: {
    orderId: string;
    customerProfileId: string;
    overallRating: number;
    bodyText: string;
    categoryRatings?: CategoryRatingInput[];
    photos?: PhotoInput[];
  }
) {
  const eligibility = await getReviewEligibility(db, { orderId: params.orderId, customerProfileId: params.customerProfileId });
  if (!eligibility.eligible) throw new ApiError(400, eligibility.reason ?? "Not eligible to review this order");

  const order = await db.order.findUniqueOrThrow({ where: { id: params.orderId } });

  const payout = await db.payout.findUnique({ where: { orderId: params.orderId }, select: { eligibleAt: true } });
  const completedAt = payout?.eligibleAt ?? order.updatedAt;

  let serviceId: string | null = null;
  if (order.serviceRequestId) {
    const serviceRequest = await db.serviceRequest.findUnique({ where: { id: order.serviceRequestId }, select: { serviceId: true } });
    serviceId = serviceRequest?.serviceId ?? null;
  }

  const moderation = runBasicModerationCheck(params.bodyText);
  const trustWeight = await computeReviewTrustWeight(db, { customerProfileId: params.customerProfileId, createdAt: new Date() });

  const review = await db.review.create({
    data: {
      orderId: params.orderId,
      businessId: order.businessId,
      customerProfileId: params.customerProfileId,
      designerId: order.assignedDesignerId,
      serviceId,
      designPreviewId: order.designPreviewId,
      overallRating: params.overallRating,
      bodyText: params.bodyText,
      status: moderation.flagged ? "FLAGGED" : "PUBLISHED",
      orderValueSnapshot: order.totalValue,
      completedAt,
      trustWeight,
      trustWeightComputedAt: new Date(),
      flaggedAt: moderation.flagged ? new Date() : null,
      flagReasons: moderation.reasons,
      ratings: params.categoryRatings?.length ? { create: params.categoryRatings.map((r) => ({ category: r.category, rating: r.rating })) } : undefined,
      photos: params.photos?.length ? { create: params.photos.map((p, i) => ({ url: p.url, isPublic: p.isPublic, sortOrder: i })) } : undefined,
    },
  });

  if (review.status === "PUBLISHED") {
    await recomputeBusinessReputation(db, order.businessId);
  }

  await logOrderActivity(db, { orderId: params.orderId, businessId: order.businessId, type: "REVIEW_SUBMITTED", title: "Customer left a review" });

  await notifyDesignEvent(db, {
    businessId: order.businessId,
    orderId: params.orderId,
    title: "You received a new review",
    body: `${order.orderCode} received a ${params.overallRating}-star review.`,
    type: "info",
  });

  await notifyCustomer(db, {
    businessId: order.businessId,
    customerProfileId: params.customerProfileId,
    title: review.status === "PUBLISHED" ? "Your review is published" : "Your review was submitted",
    body:
      review.status === "PUBLISHED"
        ? "Thanks for sharing your experience, your review is now live."
        : "Thanks for your feedback, it's being checked before it goes live.",
    type: "success",
  });

  await recordReviewLeft(db, { customerProfileId: params.customerProfileId, businessId: order.businessId, orderCode: order.orderCode });
  await logCustomerBehavior(db, { customerProfileId: params.customerProfileId, businessId: order.businessId, type: "REVIEW_SUBMITTED", targetType: "ORDER", targetId: params.orderId });

  return review;
}

// Part 12: edits are only allowed within the configured window, and every
// prior version is preserved in ReviewEditHistory before being overwritten
// — the review row itself always holds the current version.
export async function editReview(
  db: Db,
  params: {
    reviewId: string;
    customerProfileId: string;
    overallRating: number;
    bodyText: string;
    categoryRatings?: CategoryRatingInput[];
    photos?: PhotoInput[];
  }
) {
  const review = await db.review.findUniqueOrThrow({ where: { id: params.reviewId }, include: { ratings: true } });
  if (review.customerProfileId !== params.customerProfileId) throw new ApiError(404, "Review not found");
  if (review.status === "REMOVED" || review.status === "REJECTED") throw new ApiError(400, "This review can no longer be edited");

  const ageDays = (Date.now() - review.createdAt.getTime()) / (24 * 60 * 60 * 1000);
  if (ageDays > REVIEW_EDIT_WINDOW_DAYS) {
    throw new ApiError(400, `Reviews can only be edited within ${REVIEW_EDIT_WINDOW_DAYS} days of submission`);
  }

  await db.reviewEditHistory.create({
    data: {
      reviewId: review.id,
      previousOverallRating: review.overallRating,
      previousBodyText: review.bodyText,
      previousRatingsSnapshot: review.ratings.map((r) => ({ category: r.category, rating: r.rating })),
    },
  });

  const moderation = runBasicModerationCheck(params.bodyText);

  await db.reviewRating.deleteMany({ where: { reviewId: review.id } });
  if (params.photos) await db.reviewPhoto.deleteMany({ where: { reviewId: review.id } });

  const updated = await db.review.update({
    where: { id: review.id },
    data: {
      overallRating: params.overallRating,
      bodyText: params.bodyText,
      status: moderation.flagged ? "FLAGGED" : "PUBLISHED",
      flaggedAt: moderation.flagged ? new Date() : null,
      flagReasons: moderation.reasons,
      editedAt: new Date(),
      editCount: { increment: 1 },
      ratings: params.categoryRatings?.length ? { create: params.categoryRatings.map((r) => ({ category: r.category, rating: r.rating })) } : undefined,
      photos: params.photos?.length ? { create: params.photos.map((p, i) => ({ url: p.url, isPublic: p.isPublic, sortOrder: i })) } : undefined,
    },
  });

  await recomputeBusinessReputation(db, review.businessId);
  await logOrderActivity(db, { orderId: review.orderId, businessId: review.businessId, type: "REVIEW_EDITED", title: "Customer edited their review" });

  return updated;
}

// Part 13: a request, not a delete — the review stays live and counted
// until an admin actions it.
export async function requestReviewDeletion(db: Db, params: { reviewId: string; customerProfileId: string }) {
  const review = await db.review.findUniqueOrThrow({ where: { id: params.reviewId } });
  if (review.customerProfileId !== params.customerProfileId) throw new ApiError(404, "Review not found");

  const existing = await db.reviewDeletionRequest.findUnique({ where: { reviewId: review.id } });
  if (existing && existing.status === "PENDING") throw new ApiError(409, "A deletion request is already pending for this review");

  return db.reviewDeletionRequest.upsert({
    where: { reviewId: review.id },
    create: { reviewId: review.id },
    update: { status: "PENDING", requestedAt: new Date(), reviewedAt: null, reviewedById: null, resolutionNote: null },
  });
}

// Part 11: one public response per review — businesses can revise their own
// response, but can never touch the customer's review itself.
export async function respondToReview(db: Db, params: { reviewId: string; businessId: string; body: string; respondedById: string }) {
  const review = await db.review.findUniqueOrThrow({ where: { id: params.reviewId } });
  if (review.businessId !== params.businessId) throw new ApiError(404, "Review not found");

  const response = await db.reviewResponse.upsert({
    where: { reviewId: review.id },
    create: { reviewId: review.id, businessId: params.businessId, body: params.body, respondedById: params.respondedById },
    update: { body: params.body, respondedById: params.respondedById },
  });

  await notifyCustomer(db, {
    businessId: params.businessId,
    customerProfileId: review.customerProfileId,
    title: "The business responded to your review",
    body: params.body,
    type: "info",
  });

  return response;
}

// Part 14: filed by either side — reviewerType/reporterId identify who.
export async function reportReview(
  db: Db,
  params: { reviewId: string; businessId: string; reporterType: "CUSTOMER" | "STAFF"; reporterId?: string | null; reason: ReviewReportReason; details?: string }
) {
  const review = await db.review.findUniqueOrThrow({ where: { id: params.reviewId } });

  const report = await db.reviewReport.create({
    data: {
      reviewId: review.id,
      businessId: params.businessId,
      reporterType: params.reporterType,
      reporterId: params.reporterId,
      reason: params.reason,
      details: params.details,
    },
  });

  if (review.status === "PUBLISHED") {
    await db.review.update({ where: { id: review.id }, data: { status: "FLAGGED", flaggedAt: new Date() } });
    await recomputeBusinessReputation(db, review.businessId);
  }

  // Part 30/31: notify whichever side didn't file the report.
  if (params.reporterType === "STAFF") {
    await notifyCustomer(db, {
      businessId: params.businessId,
      customerProfileId: review.customerProfileId,
      title: "Your review was reported",
      body: "The business reported your review for policy review. It's being checked by Fashion360.",
      type: "warning",
    });
  } else {
    await notifyDesignEvent(db, {
      businessId: params.businessId,
      title: "A review was reported",
      body: "A customer reported one of your reviews for policy review.",
      type: "warning",
    });
  }

  return report;
}

const MODERATION_STATUS: Record<ReviewModerationAction, "PUBLISHED" | "REJECTED" | "HIDDEN" | null> = {
  APPROVE: "PUBLISHED",
  REJECT: "REJECTED",
  HIDE: "HIDDEN",
  RESTORE: "PUBLISHED",
  SUSPEND_PRIVILEGES: null,
};

// Part 32: every moderation action is logged with a mandatory reason —
// SUSPEND_PRIVILEGES blocks the reviewer's account from submitting future
// reviews without changing the review's own status.
export async function moderateReview(db: Db, params: { reviewId: string; action: ReviewModerationAction; reason: string; actorId: string }) {
  const review = await db.review.findUniqueOrThrow({ where: { id: params.reviewId } });

  await db.reviewModeration.create({ data: { reviewId: review.id, action: params.action, reason: params.reason, actorId: params.actorId } });

  const nextStatus = MODERATION_STATUS[params.action];
  if (nextStatus) {
    await db.review.update({ where: { id: review.id }, data: { status: nextStatus, moderatedAt: new Date() } });
  }
  if (params.action === "SUSPEND_PRIVILEGES") {
    await db.customerProfile.update({ where: { id: review.customerProfileId }, data: { reviewPrivilegesSuspendedAt: new Date() } });
  }

  await recomputeBusinessReputation(db, review.businessId);

  // Part 31: an admin decision, not the customer's own action, changed
  // what counts toward this business's rating — worth a direct notice.
  if (nextStatus) {
    await notifyDesignEvent(db, {
      businessId: review.businessId,
      title: "Your rating has changed",
      body: "A review affecting your rating was updated by Fashion360's moderation team.",
      type: "info",
    });
  }

  await notifyCustomer(db, {
    businessId: review.businessId,
    customerProfileId: review.customerProfileId,
    title:
      params.action === "APPROVE" || params.action === "RESTORE"
        ? "Your review is published"
        : params.action === "REJECT"
          ? "Your review was rejected"
          : "Your review is under review",
    body: params.reason,
    type: params.action === "APPROVE" || params.action === "RESTORE" ? "success" : "warning",
  });

  return review;
}

export async function resolveReviewReport(db: Db, params: { reportId: string; status: "DISMISSED" | "ACTIONED"; resolutionNote?: string; resolvedById: string }) {
  const report = await db.reviewReport.findUniqueOrThrow({ where: { id: params.reportId } });
  return db.reviewReport.update({
    where: { id: report.id },
    data: { status: params.status, resolvedAt: new Date(), resolvedById: params.resolvedById, resolutionNote: params.resolutionNote },
  });
}

export async function resolveReviewDeletionRequest(db: Db, params: { requestId: string; approve: boolean; resolutionNote?: string; resolvedById: string }) {
  const request = await db.reviewDeletionRequest.findUniqueOrThrow({ where: { id: params.requestId }, include: { review: true } });

  const updated = await db.reviewDeletionRequest.update({
    where: { id: request.id },
    data: { status: params.approve ? "APPROVED" : "REJECTED", reviewedAt: new Date(), reviewedById: params.resolvedById, resolutionNote: params.resolutionNote },
  });

  if (params.approve) {
    await db.review.update({ where: { id: request.reviewId }, data: { status: "REMOVED", moderatedAt: new Date() } });
    await recomputeBusinessReputation(db, request.review.businessId);
    await notifyDesignEvent(db, {
      businessId: request.review.businessId,
      title: "Your rating has changed",
      body: "A review was removed from your profile, which may affect your rating.",
      type: "info",
    });
  }

  return updated;
}
