import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = typeof prisma | Prisma.TransactionClient;

export interface ReviewEligibility {
  eligible: boolean;
  reason: string | null;
}

// Part 3/4: the only three conditions that matter — a completed order that
// belongs to this customer, and no review already attached to it (orderId's
// DB-level @unique is the hard guarantee; this is the friendly pre-check).
export async function getReviewEligibility(db: Db, params: { orderId: string; customerProfileId: string }): Promise<ReviewEligibility> {
  const order = await db.order.findUnique({ where: { id: params.orderId } });
  if (!order || order.customerProfileId !== params.customerProfileId) {
    return { eligible: false, reason: "Order not found" };
  }
  if (order.status !== "COMPLETED") {
    return { eligible: false, reason: "This order hasn't been completed yet" };
  }

  const profile = await db.customerProfile.findUnique({ where: { id: params.customerProfileId }, select: { reviewPrivilegesSuspendedAt: true } });
  if (profile?.reviewPrivilegesSuspendedAt) {
    return { eligible: false, reason: "Review privileges are currently suspended on this account" };
  }

  const existing = await db.review.findUnique({ where: { orderId: params.orderId } });
  if (existing) {
    return { eligible: false, reason: "This order has already been reviewed" };
  }

  return { eligible: true, reason: null };
}

// Part 25/39: every COMPLETED order this customer hasn't reviewed yet — the
// "orders you can review" list on the customer side.
export async function getReviewableOrders(db: Db, customerProfileId: string) {
  return db.order.findMany({
    where: { customerProfileId, status: "COMPLETED", review: null },
    orderBy: { updatedAt: "desc" },
    include: { business: { select: { id: true, name: true, logoUrl: true } } },
  });
}
