import type { Prisma, AppointmentHistoryAction } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = typeof prisma | Prisma.TransactionClient;

export async function logAppointmentHistory(
  db: Db,
  params: {
    appointmentId: string;
    businessId: string;
    action: AppointmentHistoryAction;
    description?: string;
    actorId?: string | null;
  }
) {
  await db.appointmentHistory.create({
    data: {
      appointmentId: params.appointmentId,
      businessId: params.businessId,
      action: params.action,
      description: params.description,
      actorId: params.actorId ?? null,
    },
  });
}
