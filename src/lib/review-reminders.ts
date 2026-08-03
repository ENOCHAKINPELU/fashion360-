import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notifyCustomer } from "@/lib/service-request-notify";

type Db = typeof prisma | Prisma.TransactionClient;

const DAY_MS = 24 * 60 * 60 * 1000;

// Part 26: "24 hours after completion" and "7 days after completion",
// never more than once each, dismissible, and skipped entirely once the
// customer has already reviewed. Called lazily wherever a customer's
// completed orders are read (no cron; same pattern as Phase 7's
// releaseIfWindowExpired) rather than needing scheduling infrastructure.
export async function ensureReviewReminderSent(db: Db, params: { orderId: string }) {
  const order = await db.order.findUnique({ where: { id: params.orderId }, select: { id: true, businessId: true, customerProfileId: true, orderCode: true, status: true, updatedAt: true, review: { select: { id: true } } } });
  if (!order || order.status !== "COMPLETED" || !order.customerProfileId || order.review) return;

  const payout = await db.payout.findUnique({ where: { orderId: order.id }, select: { eligibleAt: true } });
  const completedAt = payout?.eligibleAt ?? order.updatedAt;
  const ageMs = Date.now() - completedAt.getTime();

  const reminder = await db.reviewReminder.upsert({
    where: { orderId: order.id },
    create: { orderId: order.id, businessId: order.businessId, customerProfileId: order.customerProfileId },
    update: {},
  });
  if (reminder.dismissedAt) return;

  if (!reminder.reminder24hSentAt && ageMs >= DAY_MS) {
    await db.reviewReminder.update({ where: { orderId: order.id }, data: { reminder24hSentAt: new Date() } });
    await notifyCustomer(db, {
      businessId: order.businessId,
      customerProfileId: order.customerProfileId,
      title: "How was your experience?",
      body: `Your order ${order.orderCode} is complete, share a review of your experience.`,
      type: "info",
    });
    return;
  }

  if (reminder.reminder24hSentAt && !reminder.reminder7dSentAt && ageMs >= 7 * DAY_MS) {
    await db.reviewReminder.update({ where: { orderId: order.id }, data: { reminder7dSentAt: new Date() } });
    await notifyCustomer(db, {
      businessId: order.businessId,
      customerProfileId: order.customerProfileId,
      title: "Still time to leave a review",
      body: `Your feedback on order ${order.orderCode} helps other customers, it only takes a minute.`,
      type: "info",
    });
  }
}

export async function dismissReviewReminder(db: Db, params: { orderId: string; customerProfileId: string }) {
  const order = await db.order.findUnique({ where: { id: params.orderId }, select: { customerProfileId: true, businessId: true } });
  if (!order || order.customerProfileId !== params.customerProfileId) return;

  await db.reviewReminder.upsert({
    where: { orderId: params.orderId },
    create: { orderId: params.orderId, businessId: order.businessId, customerProfileId: params.customerProfileId, dismissedAt: new Date() },
    update: { dismissedAt: new Date() },
  });
}
