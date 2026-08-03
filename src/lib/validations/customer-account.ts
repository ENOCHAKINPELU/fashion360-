import { z } from "zod";

// No `.default()` on any field — this pairs with react-hook-form's
// zodResolver on the client, and zod v4 + @hookform/resolvers v5 mis-infer
// the resolver's generic when a field carries a default (see the Phase 7
// fix in lib/validations/design.ts for the same issue).
export const customerProfileSchema = z.object({
  username: z
    .string()
    .trim()
    .regex(/^[a-z0-9][a-z0-9-]{1,29}$/, "Lowercase letters, numbers, and hyphens only (2-30 characters)")
    .optional()
    .or(z.literal("")),
  profilePhotoUrl: z.string().optional(),
  phone: z.string().optional(),
  country: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]).optional(),
  // Plain string, not z.coerce.date() — same zodResolver inference break as
  // .default() (see comment above). Parsed to a Date server-side.
  dateOfBirth: z.string().optional().or(z.literal("")),
  preferredFit: z.enum(["TIGHT", "REGULAR", "LOOSE"]).optional(),
  favoriteColors: z.array(z.string()),
  favoriteFabrics: z.array(z.string()),
  stylePreferences: z.array(z.string()),
  fashionInterests: z.array(z.string()),
  preferredClothingCategories: z.array(z.string()),
  commonOccasions: z.array(z.string()),
});
export type CustomerProfileInput = z.infer<typeof customerProfileSchema>;

export const privacySettingsSchema = z.object({
  profileVisibility: z.enum(["PRIVATE", "BUSINESS_ONLY", "PUBLIC"]),
  allowMeasurementAccessByDefault: z.boolean(),
  allowDesignSharing: z.boolean(),
  allowOrderDataAccess: z.boolean(),
});
export type PrivacySettingsInput = z.infer<typeof privacySettingsSchema>;

// accept/decline respond to a PENDING request from either side; block
// (business-only) and revoke (customer-only) end an existing relationship.
export const businessCustomerRelationshipActionSchema = z.object({
  action: z.enum(["accept", "decline", "block", "revoke"]),
});

export const businessConnectSchema = z.object({
  message: z.string().optional(),
});
