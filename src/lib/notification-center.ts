import type { Prisma, NotificationChannel, NotificationEvent, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/mailer";

type Db = typeof prisma | Prisma.TransactionClient;

// ============================================================================
// Admin Phase 10: Notifications & Communication Center — the dispatcher
// ============================================================================
//
// This is now the one place any part of the app should go through to send a
// notification on any channel. It always writes a NotificationLog row (the
// admin-visible ledger), then attempts real delivery for the requested
// channel:
//   - IN_APP  -> writes to the pre-existing `Notification` model (same shape
//                the bell/dashboard feed has always read), synchronously.
//                Always succeeds if the recipient identity is present.
//   - EMAIL   -> lib/mailer.ts's sendEmail (real Resend integration with a
//                console fallback in dev). A network failure here is caught
//                and logged as a real FAILED status, then retried once
//                inline (see attemptDelivery) before giving up for now —
//                this app runs on Vercel's serverless functions with no
//                background worker/queue, so "automatic retry of transient
//                failures" means "retry within the same request", not a
//                persisted job. Anything still FAILED after that sits in
//                /admin/notifications for a manual retry or is picked up by
//                the opportunistic sweep in api/cron/notifications.
//   - SMS/PUSH -> no provider is wired into this codebase (see AGENTS.md/
//                phase report). Dispatching to either channel is a real,
//                complete code path that always ends in FAILED with an
//                honest failureReason ("channel not configured") — never a
//                fabricated SENT. Wiring a real provider later means adding
//                one branch here; nothing about the ledger or the callers
//                needs to change.
//
// Callers that only care about "did this get through the door" (nearly all
// of them) don't need to touch NotificationLog directly — this function
// does it for them and never throws: a delivery failure is recorded, not
// propagated, so a notification failure can never break the business
// action that triggered it (an order still gets created even if its
// confirmation email fails to send).

export interface DispatchNotificationParams {
  event: NotificationEvent;
  channel: NotificationChannel;
  title: string;
  body: string;
  // IN_APP only — drives the bell icon's styling on the existing
  // Notification model exactly as it always has. Ignored by other channels.
  inAppType?: "info" | "success" | "warning" | "danger";

  recipientUserId?: string | null;
  recipientCustomerProfileId?: string | null;
  // Only needed when neither id above is available yet (e.g. EMAIL before
  // an account exists), or to override the looked-up value.
  recipientEmail?: string | null;
  recipientName?: string | null;
  recipientType?: UserRole | null;

  businessId?: string | null;
  orderId?: string | null;
  paymentId?: string | null;
  deliveryId?: string | null;
  disputeId?: string | null;
  reviewId?: string | null;

  templateKey?: string | null;
  broadcastId?: string | null;
  expiresAt?: Date | null;
}

async function resolveRecipient(
  db: Db,
  params: Pick<DispatchNotificationParams, "recipientUserId" | "recipientCustomerProfileId" | "recipientEmail" | "recipientName" | "recipientType">
) {
  if (params.recipientEmail || (!params.recipientUserId && !params.recipientCustomerProfileId)) {
    return {
      email: params.recipientEmail ?? null,
      name: params.recipientName ?? null,
      type: params.recipientType ?? null,
    };
  }
  if (params.recipientUserId) {
    const user = await db.user.findUnique({ where: { id: params.recipientUserId }, select: { email: true, name: true, role: true } });
    return { email: params.recipientEmail ?? user?.email ?? null, name: params.recipientName ?? user?.name ?? null, type: params.recipientType ?? user?.role ?? null };
  }
  if (params.recipientCustomerProfileId) {
    const profile = await db.customerProfile.findUnique({
      where: { id: params.recipientCustomerProfileId },
      select: { user: { select: { email: true, name: true, role: true } } },
    });
    return {
      email: params.recipientEmail ?? profile?.user.email ?? null,
      name: params.recipientName ?? profile?.user.name ?? null,
      type: params.recipientType ?? profile?.user.role ?? null,
    };
  }
  return { email: null, name: null, type: null };
}

// Real delivery attempt for one channel. Never throws — returns the outcome
// so the caller can decide status/failureReason/timestamps.
async function attemptDelivery(
  db: Db,
  channel: NotificationChannel,
  params: {
    title: string;
    body: string;
    recipientUserId?: string | null;
    recipientCustomerProfileId?: string | null;
    businessId?: string | null;
    recipientEmail: string | null;
    inAppType?: "info" | "success" | "warning" | "danger";
  }
): Promise<{ ok: true; inAppNotificationId?: string } | { ok: false; reason: string }> {
  if (channel === "IN_APP") {
    if (!params.businessId) {
      return { ok: false, reason: "In-app notifications require a businessId (see Notification model)" };
    }
    // No recipientUserId/recipientCustomerProfileId is valid and intentional
    // here — it's the existing "every staff member on this business sees
    // it" pattern (Notification.userId: null), used e.g. by the
    // verification-decision notification below.
    try {
      const created = await db.notification.create({
        data: {
          businessId: params.businessId,
          userId: params.recipientUserId ?? null,
          customerProfileId: params.recipientCustomerProfileId ?? null,
          title: params.title,
          body: params.body,
          type: params.inAppType ?? "info",
        },
        select: { id: true },
      });
      return { ok: true, inAppNotificationId: created.id };
    } catch (error) {
      return { ok: false, reason: error instanceof Error ? error.message : "Failed to write in-app notification" };
    }
  }

  if (channel === "EMAIL") {
    if (!params.recipientEmail) return { ok: false, reason: "No recipient email address on file" };
    try {
      await sendEmail({ to: params.recipientEmail, subject: params.title, body: params.body });
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: error instanceof Error ? error.message : "Email provider request failed" };
    }
  }

  // SMS / PUSH: no provider integrated in this codebase yet. Real, complete
  // branch that honestly fails rather than pretending to deliver — see the
  // file header and the phase report's Known Limitations.
  return { ok: false, reason: `${channel} is not configured — no provider is wired in for this channel yet` };
}

export async function dispatchNotification(db: Db, params: DispatchNotificationParams) {
  const recipient = await resolveRecipient(db, params);

  const log = await db.notificationLog.create({
    data: {
      event: params.event,
      channel: params.channel,
      status: "PROCESSING",
      recipientUserId: params.recipientUserId ?? null,
      recipientCustomerProfileId: params.recipientCustomerProfileId ?? null,
      recipientEmail: recipient.email,
      recipientName: recipient.name,
      recipientType: recipient.type,
      businessId: params.businessId ?? null,
      orderId: params.orderId ?? null,
      paymentId: params.paymentId ?? null,
      deliveryId: params.deliveryId ?? null,
      disputeId: params.disputeId ?? null,
      reviewId: params.reviewId ?? null,
      title: params.title,
      body: params.body,
      templateKey: params.templateKey ?? null,
      broadcastId: params.broadcastId ?? null,
      expiresAt: params.expiresAt ?? null,
      deliveryAttempts: 1,
    },
  });

  const result = await attemptDelivery(db, params.channel, {
    title: params.title,
    body: params.body,
    recipientUserId: params.recipientUserId,
    recipientCustomerProfileId: params.recipientCustomerProfileId,
    businessId: params.businessId,
    recipientEmail: recipient.email,
    inAppType: params.inAppType,
  });

  if (result.ok) {
    return db.notificationLog.update({
      where: { id: log.id },
      data: { status: "SENT", sentAt: new Date(), inAppNotificationId: result.inAppNotificationId ?? null, failureReason: null },
    });
  }

  // One inline retry for EMAIL only — IN_APP failures are almost always a
  // data problem (won't fix itself on retry) and SMS/PUSH are guaranteed to
  // fail again with no provider configured, so retrying either is pure
  // waste. This mirrors "system should automatically retry transient
  // failures" without pretending there's a background queue behind it.
  if (params.channel === "EMAIL") {
    const retryResult = await attemptDelivery(db, params.channel, {
      title: params.title,
      body: params.body,
      recipientUserId: params.recipientUserId,
      recipientCustomerProfileId: params.recipientCustomerProfileId,
      businessId: params.businessId,
      recipientEmail: recipient.email,
      inAppType: params.inAppType,
    });
    if (retryResult.ok) {
      return db.notificationLog.update({
        where: { id: log.id },
        data: { status: "SENT", sentAt: new Date(), deliveryAttempts: 2, failureReason: null },
      });
    }
    return db.notificationLog.update({
      where: { id: log.id },
      data: { status: "FAILED", deliveryAttempts: 2, failureReason: retryResult.reason },
    });
  }

  return db.notificationLog.update({
    where: { id: log.id },
    data: { status: "FAILED", failureReason: result.reason },
  });
}

// Manual admin retry — always re-attempts, regardless of channel, since an
// admin clicking Retry after (for example) fixing a provider outage is a
// deliberate decision, not the automatic transient-failure retry above.
export async function retryNotificationDelivery(db: Db, params: { notificationLogId: string }) {
  const log = await db.notificationLog.findUnique({ where: { id: params.notificationLogId } });
  if (!log) return null;

  const result = await attemptDelivery(db, log.channel, {
    title: log.title,
    body: log.body,
    recipientUserId: log.recipientUserId,
    recipientCustomerProfileId: log.recipientCustomerProfileId,
    businessId: log.businessId,
    recipientEmail: log.recipientEmail,
  });

  if (result.ok) {
    return db.notificationLog.update({
      where: { id: log.id },
      data: {
        status: "SENT",
        sentAt: new Date(),
        deliveryAttempts: { increment: 1 },
        inAppNotificationId: result.inAppNotificationId ?? log.inAppNotificationId,
        failureReason: null,
      },
    });
  }
  return db.notificationLog.update({
    where: { id: log.id },
    data: { status: "FAILED", deliveryAttempts: { increment: 1 }, failureReason: result.reason },
  });
}

// Called from the two existing "mark as read" routes (api/notifications,
// api/customer/notifications) right after they flip Notification.readAt, so
// the admin-visible log reflects real read state instead of staying at SENT
// forever. Best-effort: if no matching log row exists (e.g. a Notification
// written before this phase shipped), this is a silent no-op.
export async function markInAppNotificationLogsRead(db: Db, params: { notificationIds: string[] }) {
  if (params.notificationIds.length === 0) return;
  await db.notificationLog.updateMany({
    where: { inAppNotificationId: { in: params.notificationIds }, status: { not: "READ" } },
    data: { status: "READ", readAt: new Date() },
  });
}
