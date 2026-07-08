import { z } from "zod";

export const APPOINTMENT_TYPES = [
  "CONSULTATION",
  "MEASUREMENT",
  "FITTING",
  "PICKUP",
  "VIRTUAL_CONSULTATION",
] as const;

export const appointmentSchema = z.object({
  customerId: z.string().min(1),
  type: z.enum(APPOINTMENT_TYPES),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  notes: z.string().optional().nullable(),
});

export type AppointmentInput = z.infer<typeof appointmentSchema>;

export const APPOINTMENT_TYPE_LABELS: Record<(typeof APPOINTMENT_TYPES)[number], string> = {
  CONSULTATION: "Consultation",
  MEASUREMENT: "Measurement",
  FITTING: "Fitting",
  PICKUP: "Pickup",
  VIRTUAL_CONSULTATION: "Virtual Consultation",
};
