import { z } from "zod";
import { financialLineItemSchema } from "@/lib/validations/quotation";

export const paymentMethodOptions = [
  { value: "ONLINE", label: "Online Payment" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "CASH", label: "Cash" },
  { value: "POS", label: "POS" },
  { value: "CARD", label: "Card" },
  { value: "OTHER", label: "Other" },
] as const;

export const invoiceStatusOptions = [
  { value: "DRAFT", label: "Draft" },
  { value: "SENT", label: "Sent" },
  { value: "VIEWED", label: "Viewed" },
  { value: "PARTIALLY_PAID", label: "Partially Paid" },
  { value: "PAID", label: "Paid" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "VOID", label: "Void" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "REFUNDED", label: "Refunded" },
  { value: "PARTIALLY_REFUNDED", label: "Partially Refunded" },
  { value: "ARCHIVED", label: "Archived" },
] as const;

const milestoneInputSchema = z.object({
  label: z.string().trim().min(1, "Milestone label is required"),
  percentage: z.coerce.number().min(0).max(100).optional(),
  amount: z.coerce.number().min(0),
  dueDate: z.coerce.date().optional(),
});

export const invoiceCreateSchema = z.object({
  orderId: z.string().min(1, "Order is required"),
  customerId: z.string().min(1, "Customer is required"),
  quotationId: z.string().optional(),
  dueDate: z.coerce.date().optional(),
  items: z.array(financialLineItemSchema).min(1, "Add at least one line item"),
  discount: z.coerce.number().min(0),
  tax: z.coerce.number().min(0),
  deliveryFee: z.coerce.number().min(0),
  additionalCharges: z.coerce.number().min(0),
  paymentInstructions: z.string().optional(),
  paymentTerms: z.string().optional(),
  cancellationPolicy: z.string().optional(),
  refundPolicy: z.string().optional(),
  alterationPolicy: z.string().optional(),
  deliveryPolicy: z.string().optional(),
  customTerms: z.string().optional(),
  milestones: z.array(milestoneInputSchema).optional(),
});
export type InvoiceCreateInput = z.infer<typeof invoiceCreateSchema>;

export const invoiceUpdateSchema = invoiceCreateSchema.omit({ orderId: true, customerId: true, quotationId: true }).partial();

export const offlinePaymentSchema = z.object({
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  method: z.enum(["BANK_TRANSFER", "CASH", "POS", "CARD", "OTHER"]),
  reference: z.string().optional(),
  notes: z.string().optional(),
  milestoneId: z.string().optional(),
});
export type OfflinePaymentInput = z.infer<typeof offlinePaymentSchema>;

export const paymentLinkSchema = z.object({
  milestoneId: z.string().optional(),
});

export const refundCreateSchema = z.object({
  paymentId: z.string().min(1),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  type: z.enum(["FULL", "PARTIAL"]),
  reason: z.string().trim().min(1, "A reason is required"),
});
export type RefundCreateInput = z.infer<typeof refundCreateSchema>;
