import type { Prisma, NotificationChannel, NotificationEvent } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = typeof prisma | Prisma.TransactionClient;

// ============================================================================
// Admin Phase 10: reusable notification templates
// ============================================================================
//
// Eight starter templates, one per type named in the spec. Placeholders use
// {{token}} syntax and are simple string substitution — no logic, no
// conditionals, deliberately: a template engine is a bigger product concept
// than "admin can edit the wording of a notification without redeploying,"
// which is what's actually being asked for here.
//
// Seeded idempotently (upsert on `key`) the first time the admin Templates
// tab is loaded, rather than requiring a manual `prisma db seed` run in
// production — see ensureDefaultTemplates below.

export interface DefaultTemplate {
  key: string;
  name: string;
  description: string;
  channel: NotificationChannel;
  event: NotificationEvent | null;
  titleTemplate: string;
  bodyTemplate: string;
}

export const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  {
    key: "welcome_customer",
    name: "Welcome",
    description: "Sent when a new customer verifies their email.",
    channel: "EMAIL",
    event: "CUSTOMER_REGISTERED",
    titleTemplate: "Welcome to Fashion360, {{firstName}}!",
    bodyTemplate: "Your digital fashion journey starts here. Explore designers, save your measurements, and start your first request whenever you're ready.",
  },
  {
    key: "payment_success",
    name: "Payment Success",
    description: "Sent when a customer's payment is verified.",
    channel: "IN_APP",
    event: "PAYMENT_RECEIVED",
    titleTemplate: "Payment confirmed for order {{orderCode}}",
    bodyTemplate: "Your payment of {{amount}} has been verified. Fashion360 holds it securely until your order is fulfilled and confirmed.",
  },
  {
    key: "order_update",
    name: "Order Updates",
    description: "General order status change notice.",
    channel: "IN_APP",
    event: "ORDER_CREATED",
    titleTemplate: "Update on order {{orderCode}}",
    bodyTemplate: "Your order status changed to {{status}}.",
  },
  {
    key: "delivery_update",
    name: "Delivery Updates",
    description: "Courier/shipment status change notice.",
    channel: "IN_APP",
    event: "DELIVERY_COMPLETED",
    titleTemplate: "Delivery update for order {{orderCode}}",
    bodyTemplate: "{{statusMessage}}",
  },
  {
    key: "designer_verification",
    name: "Designer Verification",
    description: "Sent when Admin approves or rejects a business verification request.",
    channel: "IN_APP",
    event: "DESIGNER_VERIFIED",
    titleTemplate: "{{decision}}",
    bodyTemplate: "{{message}}",
  },
  {
    key: "review_reminder",
    name: "Review Reminder",
    description: "Nudges a customer to leave a review after delivery.",
    channel: "EMAIL",
    event: "REVIEW_SUBMITTED",
    titleTemplate: "How was your experience with {{businessName}}?",
    bodyTemplate: "Your order {{orderCode}} was delivered. Leave a review to help other customers and support your designer.",
  },
  {
    key: "password_reset",
    name: "Password Reset",
    description: "Sent when a user requests a password reset link.",
    channel: "EMAIL",
    event: "PASSWORD_RESET",
    titleTemplate: "Reset your Fashion360 password",
    bodyTemplate: "Reset your password: {{resetUrl}}",
  },
  {
    key: "dispute_update",
    name: "Dispute Updates",
    description: "Sent when a dispute's status changes.",
    channel: "IN_APP",
    event: "DISPUTE_OPENED",
    titleTemplate: "Update on your report for order {{orderCode}}",
    bodyTemplate: "{{message}}",
  },
];

export async function ensureDefaultTemplates(db: Db) {
  await Promise.all(
    DEFAULT_TEMPLATES.map((t) =>
      db.notificationTemplate.upsert({
        where: { key: t.key },
        create: {
          key: t.key,
          name: t.name,
          description: t.description,
          channel: t.channel,
          event: t.event,
          titleTemplate: t.titleTemplate,
          bodyTemplate: t.bodyTemplate,
        },
        update: {},
      })
    )
  );
}

// {{token}} -> value substitution. Any token left in `vars` that doesn't
// appear in the template is silently ignored; any {{token}} in the template
// with no matching var is left as literal text (visible, not silently
// dropped — a missing placeholder should be obvious to whoever's testing a
// template edit, not invisible).
export function renderTemplate(template: { titleTemplate: string; bodyTemplate: string }, vars: Record<string, string>) {
  const substitute = (input: string) => input.replace(/\{\{(\w+)\}\}/g, (match, key: string) => (key in vars ? vars[key] : match));
  return { title: substitute(template.titleTemplate), body: substitute(template.bodyTemplate) };
}
