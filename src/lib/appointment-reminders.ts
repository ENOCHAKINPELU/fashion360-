import type { Prisma, ReminderChannel } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/mailer";

export const DEFAULT_REMINDER_OFFSETS = [1440, 720, 120, 30]; // 24h, 12h, 2h, 30m
export const DEFAULT_REMINDER_CHANNELS: ReminderChannel[] = ["EMAIL"];

type Db = typeof prisma | Prisma.TransactionClient;

export interface ReminderPreferences {
  channels?: ReminderChannel[];
  offsetsMinutes?: number[];
}

/** Schedules reminder rows for an appointment. Call again after a reschedule (previous pending ones should be cancelled first). */
export async function scheduleReminders(
  db: Db,
  appointmentId: string,
  startTime: Date,
  preferences?: ReminderPreferences | null
) {
  const channels = preferences?.channels?.length ? preferences.channels : DEFAULT_REMINDER_CHANNELS;
  const offsets = preferences?.offsetsMinutes?.length ? preferences.offsetsMinutes : DEFAULT_REMINDER_OFFSETS;
  const now = Date.now();

  const rows = channels.flatMap((channel) =>
    offsets
      .map((minutesBefore) => ({
        channel,
        minutesBefore,
        scheduledFor: new Date(startTime.getTime() - minutesBefore * 60_000),
      }))
      .filter((r) => r.scheduledFor.getTime() > now)
  );

  if (rows.length === 0) return;

  await db.appointmentReminder.createMany({
    data: rows.map((r) => ({ appointmentId, ...r })),
  });
}

export async function cancelPendingReminders(db: Db, appointmentId: string) {
  await db.appointmentReminder.updateMany({
    where: { appointmentId, status: "PENDING" },
    data: { status: "CANCELLED" },
  });
}

/**
 * Sends any reminders whose scheduledFor has passed. There's no background
 * job runner in this deployment yet, so this is invoked opportunistically
 * from the Appointments Dashboard on load. For production, point a real
 * scheduler (e.g. Vercel Cron) at GET /api/cron/reminders instead/as well.
 */
export async function processDueReminders() {
  const due = await prisma.appointmentReminder.findMany({
    where: { status: "PENDING", scheduledFor: { lte: new Date() } },
    include: {
      appointment: {
        include: { customer: true, business: true, type: true },
      },
    },
    take: 50,
  });

  for (const reminder of due) {
    const { appointment } = reminder;
    if (!appointment || ["CANCELLED", "NO_SHOW", "COMPLETED"].includes(appointment.status)) {
      await prisma.appointmentReminder.update({ where: { id: reminder.id }, data: { status: "CANCELLED" } });
      continue;
    }

    const when = appointment.startTime.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });
    const title = `Reminder: ${appointment.type.name} with ${appointment.business.name}`;
    const body = `Your ${appointment.type.name.toLowerCase()} appointment is on ${when}.`;

    try {
      if (reminder.channel === "EMAIL" && appointment.customer.email) {
        await sendEmail({ to: appointment.customer.email, subject: title, body });
      } else if (reminder.channel === "PUSH") {
        await prisma.notification.create({
          data: { businessId: appointment.businessId, title, body, type: "info" },
        });
      } else {
        // WhatsApp / SMS: stubbed until a provider is configured.
        console.info(`[${reminder.channel.toLowerCase()}:stub] ${title} — ${body}`);
      }

      await prisma.$transaction([
        prisma.appointmentReminder.update({
          where: { id: reminder.id },
          data: { status: "SENT", sentAt: new Date() },
        }),
        prisma.appointmentHistory.create({
          data: {
            appointmentId: appointment.id,
            businessId: appointment.businessId,
            action: "REMINDER_SENT",
            description: `${reminder.channel} reminder sent (${reminder.minutesBefore}m before)`,
          },
        }),
      ]);
    } catch (error) {
      console.error("Failed to send appointment reminder", error);
      await prisma.appointmentReminder.update({ where: { id: reminder.id }, data: { status: "FAILED" } });
    }
  }

  return due.length;
}
