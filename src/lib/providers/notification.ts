import { prisma } from "@/lib/prisma";
import type { NotificationChannel } from "@prisma/client";

/**
 * Single interface for all outbound notifications. Email is the only channel that
 * actually sends today (console-logged in dev); SMS/WhatsApp/Push are wired to the
 * same interface but log-only until a provider is configured.
 */
export interface NotificationRequest {
  businessId: string;
  userId?: string | null;
  channel: NotificationChannel;
  title: string;
  body: string;
}

export interface NotificationProvider {
  send(req: NotificationRequest): Promise<void>;
}

class ConsoleNotificationProvider implements NotificationProvider {
  async send(req: NotificationRequest) {
    await prisma.notification.create({
      data: {
        businessId: req.businessId,
        userId: req.userId ?? null,
        channel: req.channel,
        title: req.title,
        body: req.body,
      },
    });

    if (req.channel === "EMAIL") {
      // Swap for Resend/Postmark/SES once RESEND_API_KEY (or similar) is configured.
      console.info(`[email] to user ${req.userId ?? "n/a"}: ${req.title}`);
    } else {
      console.info(`[${req.channel.toLowerCase()}] stubbed, not yet integrated: ${req.title}`);
    }
  }
}

export function getNotificationProvider(): NotificationProvider {
  return new ConsoleNotificationProvider();
}
