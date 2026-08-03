import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/rbac";
import type { Business, BusinessAvailability } from "@prisma/client";

const WEEKDAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

type WorkingHours = Record<string, { open: string; close: string; closed: boolean }>;

function timeToMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m ?? 0);
}

function minutesOfDay(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

/** Returns the {open, close, closed} entry for the given date's weekday, or null if unset. */
export function getDaySchedule(business: Pick<Business, "workingHours">, date: Date) {
  const hours = business.workingHours as WorkingHours | null;
  if (!hours) return null;
  const key = WEEKDAY_NAMES[date.getDay()];
  return hours[key] ?? null;
}

interface SlotCheckInput {
  businessId: string;
  business: Pick<Business, "workingHours">;
  availability: BusinessAvailability | null;
  startTime: Date;
  endTime: Date;
  assignedStaffId?: string | null;
  excludeAppointmentId?: string;
}

/**
 * The single gate every appointment create/update/reschedule must pass through.
 * Throws ApiError(409) with a specific, user-facing reason on the first rule broken.
 */
export async function assertSlotIsBookable(input: SlotCheckInput) {
  const { businessId, business, availability, startTime, endTime, assignedStaffId, excludeAppointmentId } = input;

  if (endTime <= startTime) {
    throw new ApiError(400, "End time must be after start time");
  }

  if (startTime < new Date(Date.now() - 60_000)) {
    throw new ApiError(400, "Cannot book an appointment in the past");
  }

  // --- Business hours ---
  const schedule = getDaySchedule(business, startTime);
  if (!schedule || schedule.closed) {
    throw new ApiError(409, "The business is closed on this day");
  }
  const startMin = minutesOfDay(startTime);
  const endMin = startMin + Math.round((endTime.getTime() - startTime.getTime()) / 60000);
  if (startMin < timeToMinutes(schedule.open) || endMin > timeToMinutes(schedule.close)) {
    throw new ApiError(409, `Outside business hours (${schedule.open}–${schedule.close})`);
  }

  // --- Break time ---
  if (availability?.breakStart && availability?.breakEnd) {
    const breakStart = timeToMinutes(availability.breakStart);
    const breakEnd = timeToMinutes(availability.breakEnd);
    if (startMin < breakEnd && endMin > breakStart) {
      throw new ApiError(409, `This time overlaps the business's break (${availability.breakStart}–${availability.breakEnd})`);
    }
  }

  // --- Vacation mode ---
  if (availability?.vacationMode && availability.vacationStart && availability.vacationEnd) {
    if (startTime >= availability.vacationStart && startTime <= availability.vacationEnd) {
      throw new ApiError(409, "The business is on vacation during this period");
    }
  }

  // --- Blocked dates / holidays ---
  const dayStart = new Date(startTime);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const blocked = await prisma.blockedDate.findFirst({
    where: {
      businessId,
      date: { lt: dayEnd },
      OR: [{ endDate: null, date: { gte: dayStart } }, { endDate: { gte: dayStart } }],
    },
  });
  if (blocked) {
    throw new ApiError(409, blocked.reason ? `Date is blocked: ${blocked.reason}` : "This date is blocked");
  }

  // --- Max daily appointments ---
  if (availability?.maxDailyAppointments) {
    const count = await prisma.appointment.count({
      where: {
        businessId,
        startTime: { gte: dayStart, lt: dayEnd },
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
        ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
      },
    });
    if (count >= availability.maxDailyAppointments) {
      throw new ApiError(409, `This day has reached its maximum of ${availability.maxDailyAppointments} appointments`);
    }
  }

  // --- Conflict detection (with buffer), scoped to the same business and,
  // if assigned, the same staff member ---
  const bufferMs = (availability?.bufferMinutes ?? 0) * 60_000;
  const bufferedStart = new Date(startTime.getTime() - bufferMs);
  const bufferedEnd = new Date(endTime.getTime() + bufferMs);

  const conflict = await prisma.appointment.findFirst({
    where: {
      businessId,
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
      ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
      ...(assignedStaffId ? { assignedStaffId } : {}),
      startTime: { lt: bufferedEnd },
      endTime: { gt: bufferedStart },
    },
    include: { customer: { select: { firstName: true, lastName: true } } },
  });
  if (conflict) {
    throw new ApiError(
      409,
      `Conflicts with ${conflict.customer.firstName} ${conflict.customer.lastName}'s appointment at ${conflict.startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    );
  }
}

export async function getOrCreateAvailability(businessId: string) {
  const existing = await prisma.businessAvailability.findUnique({ where: { businessId } });
  if (existing) return existing;
  return prisma.businessAvailability.create({ data: { businessId } });
}

/**
 * Shared by the business slot-picker (GET /api/appointments/slots) and the
 * Phase 4 customer booking flow (GET /api/customer/appointments/slots) —
 * one slot-generation implementation, so "available" can never mean two
 * different things depending on which side is asking.
 */
export async function getAvailableSlots(params: {
  businessId: string;
  date: string;
  durationMinutes: number;
  staffId?: string;
}) {
  const { businessId, date, durationMinutes, staffId } = params;
  const business = await prisma.business.findUniqueOrThrow({ where: { id: businessId } });
  const availability = await getOrCreateAvailability(businessId);

  const dayStart = new Date(`${date}T00:00:00`);
  const schedule = getDaySchedule(business, dayStart);

  if (!schedule || schedule.closed) return [];

  const interval = availability.slotIntervalMinutes;
  const [openH, openM] = schedule.open.split(":").map(Number);
  const [closeH, closeM] = schedule.close.split(":").map(Number);

  const slots: { start: string; available: boolean }[] = [];
  const cursor = new Date(dayStart);
  cursor.setHours(openH, openM, 0, 0);
  const closeTime = new Date(dayStart);
  closeTime.setHours(closeH, closeM, 0, 0);

  while (cursor.getTime() + durationMinutes * 60_000 <= closeTime.getTime()) {
    const slotStart = new Date(cursor);
    const slotEnd = new Date(cursor.getTime() + durationMinutes * 60_000);

    let available = true;
    try {
      await assertSlotIsBookable({ businessId, business, availability, startTime: slotStart, endTime: slotEnd, assignedStaffId: staffId });
    } catch {
      available = false;
    }

    slots.push({ start: slotStart.toISOString(), available });
    cursor.setMinutes(cursor.getMinutes() + interval);
  }

  return slots;
}
