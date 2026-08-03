import { z } from "zod";

export const genderOptions = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
  { value: "PREFER_NOT_TO_SAY", label: "Prefer not to say" },
] as const;

export const statusOptions = [
  { value: "LEAD", label: "Lead" },
  { value: "PROSPECT", label: "Prospect" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "BLOCKED", label: "Blocked" },
] as const;

export const preferredCommunicationOptions = [
  { value: "EMAIL", label: "Email" },
  { value: "SMS", label: "SMS" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "PHONE_CALL", label: "Phone call" },
] as const;

export const PREDEFINED_TAGS = [
  "VIP",
  "Bride",
  "Celebrity",
  "Corporate",
  "Returning Customer",
  "New Customer",
  "Referral",
  "Wholesale",
  "Walk-In",
] as const;

const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email")
  .optional()
  .or(z.literal(""));

const optionalPhone = z
  .string()
  .trim()
  .regex(/^[+\d][\d\s-]{6,}$/, "Enter a valid phone number")
  .optional()
  .or(z.literal(""));

export const customerFormSchema = z.object({
  profilePhotoUrl: z.string().url().optional().or(z.literal("")),
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  email: optionalEmail,
  phone: optionalPhone,
  whatsapp: optionalPhone,
  gender: z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]).optional(),
  dateOfBirth: z.string().optional().or(z.literal("")),
  occupation: z.string().optional(),
  country: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: optionalPhone,
  referralSource: z.string().optional(),
  tags: z.array(z.string()),
  preferredCommunication: z.enum(["EMAIL", "SMS", "WHATSAPP", "PHONE_CALL"]).optional(),
  specialNotes: z.string().optional(),
  status: z.enum(["LEAD", "PROSPECT", "ACTIVE", "INACTIVE", "BLOCKED"]),
  isVip: z.boolean(),
});
export type CustomerFormInput = z.infer<typeof customerFormSchema>;

export const customerNoteSchema = z.object({
  body: z.string().trim().min(1, "Note cannot be empty"),
});

export const customerPreferenceSchema = z.object({
  fabricPreferences: z.array(z.string()).default([]),
  colorPreferences: z.array(z.string()).default([]),
  stylePreferences: z.array(z.string()).default([]),
  bodyShapeNotes: z.string().optional(),
  specialInstructions: z.string().optional(),
});
export type CustomerPreferenceInput = z.infer<typeof customerPreferenceSchema>;

export const customerTagSchema = z.object({
  name: z.string().trim().min(1).max(30),
  color: z.string().optional(),
});

export const customerBulkActionSchema = z.object({
  ids: z.array(z.string()).min(1),
  action: z.enum(["archive", "unarchive", "delete", "tag", "status"]),
  tagId: z.string().optional(),
  status: z.enum(["LEAD", "PROSPECT", "ACTIVE", "INACTIVE", "BLOCKED"]).optional(),
});
