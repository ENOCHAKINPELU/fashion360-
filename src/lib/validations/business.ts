import { z } from "zod";

export const businessTypeOptions = [
  { value: "INDEPENDENT_DESIGNER", label: "Independent Designer" },
  { value: "TAILORING_SHOP", label: "Tailoring Shop" },
  { value: "FASHION_HOUSE", label: "Fashion House" },
  { value: "CLOTHING_BRAND", label: "Clothing Brand" },
  { value: "STUDIO", label: "Fashion Studio" },
  { value: "OTHER", label: "Other" },
] as const;

export const measurementUnitOptions = [
  { value: "METRIC", label: "Metric (cm, kg)" },
  { value: "IMPERIAL", label: "Imperial (in, lb)" },
] as const;

export const currencyOptions = [
  { value: "NGN", label: "NGN (Nigerian Naira)" },
  { value: "USD", label: "USD (US Dollar)" },
  { value: "GBP", label: "GBP (British Pound)" },
  { value: "EUR", label: "EUR (Euro)" },
  { value: "GHS", label: "GHS (Ghanaian Cedi)" },
  { value: "KES", label: "KES (Kenyan Shilling)" },
  { value: "ZAR", label: "ZAR (South African Rand)" },
] as const;

export const timezoneOptions = [
  { value: "Africa/Lagos", label: "Africa/Lagos (WAT)" },
  { value: "Africa/Accra", label: "Africa/Accra (GMT)" },
  { value: "Africa/Nairobi", label: "Africa/Nairobi (EAT)" },
  { value: "Africa/Johannesburg", label: "Africa/Johannesburg (SAST)" },
  { value: "Europe/London", label: "Europe/London (GMT/BST)" },
  { value: "America/New_York", label: "America/New York (ET)" },
] as const;

export const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

export const DEFAULT_WORKING_HOURS: Record<string, { open: string; close: string; closed: boolean }> =
  Object.fromEntries(WEEKDAYS.map((day) => [day, { open: "09:00", close: "18:00", closed: day === "sunday" }]));

export const businessRegistrationSchema = z.object({
  name: z.string().min(2, "Business name is required"),
  logoUrl: z.string().url().optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  country: z.string().min(1, "Country is required"),
  state: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  businessType: z.enum([
    "INDEPENDENT_DESIGNER",
    "TAILORING_SHOP",
    "FASHION_HOUSE",
    "CLOTHING_BRAND",
    "STUDIO",
    "OTHER",
  ]),
  currency: z.string().min(1),
  timezone: z.string().min(1),
  measurementUnit: z.enum(["METRIC", "IMPERIAL"]),
});
export type BusinessRegistrationInput = z.infer<typeof businessRegistrationSchema>;

export const businessSettingsSchema = z.object({
  name: z.string().min(2).optional(),
  logoUrl: z.string().url().optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  country: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  businessType: z
    .enum(["INDEPENDENT_DESIGNER", "TAILORING_SHOP", "FASHION_HOUSE", "CLOTHING_BRAND", "STUDIO", "OTHER"])
    .optional(),
  currency: z.string().optional(),
  timezone: z.string().optional(),
  measurementUnit: z.enum(["METRIC", "IMPERIAL"]).optional(),
  brandColors: z.object({ primary: z.string(), secondary: z.string() }).partial().optional(),
  workingHours: z.record(z.string(), z.object({ open: z.string(), close: z.string(), closed: z.boolean() })).optional(),
  socialLinks: z.object({ instagram: z.string(), facebook: z.string(), whatsapp: z.string() }).partial().optional(),
});
export type BusinessSettingsInput = z.infer<typeof businessSettingsSchema>;
