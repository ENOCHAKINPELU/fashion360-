import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = typeof prisma | Prisma.TransactionClient;

export const DEFAULT_APPOINTMENT_TYPES = [
  { name: "Consultation", color: "#6C3CF0", defaultDurationMinutes: 45, category: "IN_PERSON" },
  { name: "Measurement", color: "#2F80ED", defaultDurationMinutes: 30, category: "MEASUREMENT" },
  { name: "Fitting", color: "#F5A623", defaultDurationMinutes: 60, category: "FITTING" },
  { name: "Pickup", color: "#2BB673", defaultDurationMinutes: 15, category: "OTHER" },
  { name: "Virtual Consultation", color: "#8E63FF", defaultDurationMinutes: 30, category: "VIRTUAL" },
] as const;

export async function ensureDefaultAppointmentTypes(db: Db, businessId: string) {
  await db.appointmentType.createMany({
    data: DEFAULT_APPOINTMENT_TYPES.map((type) => ({ businessId, ...type, isSystem: true })),
    skipDuplicates: true,
  });
}
