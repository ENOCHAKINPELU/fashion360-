import { z } from "zod";

export const serviceCategoryOptions = [
  { value: "CUSTOM_CLOTHING", label: "Custom Clothing" },
  { value: "TRADITIONAL_WEAR", label: "Traditional Wear" },
  { value: "BRIDAL_WEAR", label: "Bridal Wear" },
  { value: "WEDDING_OUTFIT", label: "Wedding Outfit" },
  { value: "CORPORATE_WEAR", label: "Corporate Wear" },
  { value: "CASUAL_WEAR", label: "Casual Wear" },
  { value: "ALTERATIONS", label: "Alterations" },
  { value: "CUSTOM_DESIGN", label: "Custom Design" },
  { value: "STYLING", label: "Styling" },
  { value: "CONSULTATION", label: "Consultation" },
  { value: "OTHER", label: "Other" },
] as const;

const moneyString = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount")
  .optional()
  .or(z.literal(""));

// No `.default()` / `.coerce()` on any field bound to react-hook-form — see
// customerProfileSchema's comment for why (zod v4 + @hookform/resolvers v5
// mis-infer the resolver's generic type otherwise).
export const businessServiceSchema = z.object({
  name: z.string().trim().min(1, "Service name is required"),
  description: z.string().optional(),
  category: z.enum([
    "CUSTOM_CLOTHING",
    "TRADITIONAL_WEAR",
    "BRIDAL_WEAR",
    "WEDDING_OUTFIT",
    "CORPORATE_WEAR",
    "CASUAL_WEAR",
    "ALTERATIONS",
    "CUSTOM_DESIGN",
    "STYLING",
    "CONSULTATION",
    "OTHER",
  ]),
  priceMin: moneyString,
  priceMax: moneyString,
  estimatedDurationDays: z.string().trim().regex(/^\d+$/, "Enter a whole number").optional().or(z.literal("")),
  isActive: z.boolean(),
});
export type BusinessServiceInput = z.infer<typeof businessServiceSchema>;

export const serviceRequestSchema = z.object({
  businessId: z.string().min(1),
  serviceId: z.string().optional().or(z.literal("")),
  preferredDate: z.string().optional().or(z.literal("")),
  preferredTime: z.string().optional(),
  locationPreference: z.string().optional(),
  description: z.string().trim().min(10, "Tell the business a bit more about what you need"),
  budgetMin: moneyString,
  budgetMax: moneyString,
  additionalNotes: z.string().optional(),
  attachmentUrls: z.array(z.string()),
});
export type ServiceRequestInput = z.infer<typeof serviceRequestSchema>;

export const businessResponseSchema = z.object({
  type: z.enum(["MESSAGE", "ACCEPTED", "DECLINED", "INFO_REQUESTED", "ALTERNATIVE_DATE_PROPOSED"]),
  message: z.string().optional(),
  proposedDate: z.string().optional().or(z.literal("")),
  estimatedPriceMin: moneyString,
  estimatedPriceMax: moneyString,
});
export type BusinessResponseInput = z.infer<typeof businessResponseSchema>;

export const customerResponseSchema = z.object({
  type: z.enum(["MESSAGE", "CUSTOMER_ACCEPTED", "CUSTOMER_DECLINED"]),
  message: z.string().optional(),
});
export type CustomerResponseInput = z.infer<typeof customerResponseSchema>;
