import { z } from "zod";

export const statusOptions = [
  { value: "PENDING_CONFIRMATION", label: "Pending Confirmation" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "CHECKED_IN", label: "Checked In" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "NO_SHOW", label: "No Show" },
  { value: "RESCHEDULED", label: "Rescheduled" },
  { value: "DECLINED", label: "Declined" },
  { value: "RESCHEDULE_REQUESTED", label: "Reschedule Requested" },
  { value: "EXPIRED", label: "Expired" },
] as const;

export const noteCategoryOptions = [
  { value: "CONSULTATION", label: "Consultation Notes" },
  { value: "MEASUREMENT_PREP", label: "Measurement Preparation" },
  { value: "FABRIC_REQUEST", label: "Fabric Requests" },
  { value: "CUSTOMER_REQUIREMENT", label: "Customer Requirements" },
  { value: "DESIGNER_NOTE", label: "Designer Notes" },
  { value: "PRIVATE", label: "Private Notes" },
] as const;

export const reminderOffsetOptions = [
  { value: 1440, label: "24 hours before" },
  { value: 720, label: "12 hours before" },
  { value: 120, label: "2 hours before" },
  { value: 30, label: "30 minutes before" },
] as const;

export const reminderChannelOptions = [
  { value: "EMAIL", label: "Email" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "SMS", label: "SMS" },
  { value: "PUSH", label: "Push Notification" },
] as const;

const newCustomerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
});

export const appointmentFormSchema = z.object({
  customerId: z.string().optional(),
  newCustomer: newCustomerSchema.optional(),
  typeId: z.string().min(1, "Choose an appointment type"),
  date: z.string().min(1, "Choose a date"),
  time: z.string().min(1, "Choose a time"),
  durationMinutes: z.number().int().min(5).max(480),
  assignedStaffId: z.string().optional(),
  location: z.string().optional(),
  meetingLink: z.string().trim().url("Enter a valid URL").optional().or(z.literal("")),
  notes: z.string().optional(),
  reminderChannels: z.array(z.enum(["EMAIL", "WHATSAPP", "SMS", "PUSH"])),
  reminderOffsets: z.array(z.number()),
  status: z.enum([
    "PENDING_CONFIRMATION",
    "SCHEDULED",
    "CONFIRMED",
    "CHECKED_IN",
    "IN_PROGRESS",
    "COMPLETED",
    "CANCELLED",
    "NO_SHOW",
    "RESCHEDULED",
  ]),
  recurrence: z
    .object({
      frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY"]),
      occurrences: z.number().int().min(2).max(52),
    })
    .optional(),
}).refine((data) => data.customerId || data.newCustomer, {
  message: "Select an existing customer or provide new customer details",
  path: ["customerId"],
});
export type AppointmentFormInput = z.infer<typeof appointmentFormSchema>;

export const appointmentNoteSchema = z.object({
  category: z.enum(["CONSULTATION", "MEASUREMENT_PREP", "FABRIC_REQUEST", "CUSTOMER_REQUIREMENT", "DESIGNER_NOTE", "PRIVATE"]),
  body: z.string().trim().min(1, "Note cannot be empty"),
});

export const rescheduleSchema = z.object({
  date: z.string().min(1),
  time: z.string().min(1),
  durationMinutes: z.number().int().min(5).max(480).optional(),
  reason: z.string().optional(),
  notifyCustomer: z.boolean(),
});

export const cancelSchema = z.object({
  reason: z.string().optional(),
});

export const checkInSchema = z.object({
  method: z.enum(["MANUAL", "QR", "WALK_IN"]).default("MANUAL"),
});

export const appointmentTypeSchema = z.object({
  name: z.string().trim().min(1).max(40),
  color: z.string().min(1),
  defaultDurationMinutes: z.number().int().min(5).max(480),
});

export const availabilitySchema = z.object({
  breakStart: z.string().optional().or(z.literal("")),
  breakEnd: z.string().optional().or(z.literal("")),
  slotIntervalMinutes: z.number().int().min(5).max(240),
  bufferMinutes: z.number().int().min(0).max(120),
  maxDailyAppointments: z.number().int().min(1).nullable().optional(),
  vacationMode: z.boolean(),
  vacationStart: z.string().optional().or(z.literal("")),
  vacationEnd: z.string().optional().or(z.literal("")),
  vacationMessage: z.string().optional(),
});

export const blockedDateSchema = z.object({
  date: z.string().min(1),
  endDate: z.string().optional().or(z.literal("")),
  reason: z.string().optional(),
});

// ===================== Phase 4: customer-facing booking =====================

export const customerBookingSchema = z.object({
  businessId: z.string().min(1),
  typeId: z.string().min(1, "Choose an appointment type"),
  serviceRequestId: z.string().optional(),
  date: z.string().min(1, "Choose a date"),
  time: z.string().min(1, "Choose a time"),
  durationMinutes: z.number().int().min(5).max(480),
  location: z.string().optional(),
  notes: z.string().optional(),
});
export type CustomerBookingInput = z.infer<typeof customerBookingSchema>;

// A *request* to reschedule, awaiting approval — distinct from the
// business's existing unilateral reschedule endpoint.
export const rescheduleRequestSchema = z.object({
  date: z.string().min(1),
  time: z.string().min(1),
  reason: z.string().optional(),
});
