import { z } from "zod";

export const quotationSchema = z.object({
  customerId: z.string().min(1),
  orderId: z.string().optional().nullable(),
  description: z.string().min(1),
  price: z.coerce.number().positive(),
  deposit: z.coerce.number().min(0),
  dueDate: z.string().optional().nullable(),
});

export type QuotationInput = z.infer<typeof quotationSchema>;
