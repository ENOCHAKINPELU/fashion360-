import { z } from "zod";

// No `.default()` on any field — pairs with react-hook-form's zodResolver
// on the client, and zod v4 + @hookform/resolvers v5 mis-infer the
// resolver's generic when a field carries a default.
export const businessProfileSchema = z.object({
  username: z
    .string()
    .trim()
    .regex(/^[a-z0-9][a-z0-9-]{1,29}$/, "Lowercase letters, numbers, and hyphens only (2-30 characters)")
    .optional()
    .or(z.literal("")),
  description: z.string().optional(),
  serviceArea: z.string().optional(),
  website: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  registrationNumber: z.string().optional(),
  visibility: z.enum(["PUBLIC", "PRIVATE", "UNLISTED"]),
  // Plain string, not z.coerce.number() — coerce's input/output type mismatch
  // breaks zodResolver's generic inference the same way .default() does (see
  // the customerProfileSchema comment). Parsed to a number server-side.
  yearsOfExperience: z
    .string()
    .trim()
    .regex(/^\d+$/, "Enter a whole number")
    .refine((v) => Number(v) <= 100, "Must be 100 or less")
    .optional()
    .or(z.literal("")),
});
export type BusinessProfileInput = z.infer<typeof businessProfileSchema>;

export const businessProfileVisibilityOptions = [
  { value: "PUBLIC", label: "Public", description: "Anyone can find and view your profile." },
  { value: "PRIVATE", label: "Private", description: "Only customers you've connected with can see your profile." },
  { value: "UNLISTED", label: "Unlisted", description: "Only people with your direct profile link can view it." },
] as const;

export const portfolioItemSchema = z.object({
  imageUrl: z.string().url("An image is required"),
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()),
});
export type PortfolioItemInput = z.infer<typeof portfolioItemSchema>;

export const customSpecialtySchema = z.object({
  name: z.string().trim().min(1, "Specialty name is required").max(40),
});
