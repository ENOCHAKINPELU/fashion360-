import { z } from "zod";

export const payoutRecipientSchema = z.object({
  legalName: z.string().trim().min(2, "Legal name is required"),
  businessName: z.string().trim().optional(),
  bankName: z.string().trim().min(2, "Bank name is required"),
  bankCode: z.string().trim().min(1, "Bank code is required"),
  accountNumber: z
    .string()
    .trim()
    .min(6, "Account number looks too short")
    .max(20, "Account number looks too long"),
});
export type PayoutRecipientInput = z.infer<typeof payoutRecipientSchema>;
