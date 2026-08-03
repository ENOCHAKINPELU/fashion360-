import { z } from "zod";

export const paymentProviderOptions = [
  { value: "PAYSTACK", label: "Paystack" },
  { value: "FLUTTERWAVE", label: "Flutterwave" },
  { value: "STRIPE", label: "Stripe" },
] as const;

export const gatewayConnectSchema = z.object({
  provider: z.enum(["PAYSTACK", "FLUTTERWAVE", "STRIPE"]),
  publicKey: z.string().optional(),
  secretKey: z.string().trim().min(1, "Secret key is required"),
  webhookSecret: z.string().optional(),
  currency: z.string().trim().min(3).max(3),
});
export type GatewayConnectInput = z.infer<typeof gatewayConnectSchema>;
