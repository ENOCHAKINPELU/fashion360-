import { z } from "zod";

// Name/email/phone are always collected regardless of role (both forms show
// them). Role-specific fields are optional — asking for e.g. years of
// experience is useful signal but shouldn't block a designer from joining
// the list if they skip it.
export const waitlistSignupSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  name: z.string().trim().min(1, "Enter your name").max(120),
  phone: z.string().trim().min(1, "Enter your phone or WhatsApp number").max(40),
  role: z.enum(["CUSTOMER", "DESIGNER"]),
  source: z.string().trim().max(60).optional(),

  // Shared by both forms
  city: z.string().trim().max(120).optional().or(z.literal("")),
  country: z.string().trim().max(80).optional().or(z.literal("")),

  // Customer-only (ignored if present on a DESIGNER submission)
  fashionInterest: z.string().trim().max(200).optional().or(z.literal("")),

  // Designer-only (ignored if present on a CUSTOMER submission)
  businessName: z.string().trim().max(160).optional().or(z.literal("")),
  specialty: z.string().trim().max(160).optional().or(z.literal("")),
  yearsExperience: z.coerce.number().int().min(0).max(80).optional(),
  portfolioUrl: z.string().trim().max(200).optional().or(z.literal("")),
});
export type WaitlistSignupInput = z.infer<typeof waitlistSignupSchema>;
