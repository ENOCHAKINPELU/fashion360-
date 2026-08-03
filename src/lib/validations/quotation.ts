import { z } from "zod";

export const financialLineItemTypeOptions = [
  { value: "GARMENT", label: "Garment" },
  { value: "DESIGN_SERVICE", label: "Design Service" },
  { value: "CONSULTATION", label: "Consultation" },
  { value: "FABRIC", label: "Fabric" },
  { value: "CUSTOMIZATION", label: "Customization" },
  { value: "EMBROIDERY", label: "Embroidery" },
  { value: "ALTERATION", label: "Alteration" },
  { value: "FITTING", label: "Fitting" },
  { value: "DELIVERY", label: "Delivery" },
  { value: "ACCESSORIES", label: "Accessories" },
  { value: "OTHER", label: "Other" },
] as const;

export const quotationStatusOptions = [
  { value: "DRAFT", label: "Draft" },
  { value: "SENT", label: "Sent" },
  { value: "VIEWED", label: "Viewed" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "DECLINED", label: "Declined" },
  { value: "EXPIRED", label: "Expired" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "CONVERTED", label: "Converted" },
  { value: "ARCHIVED", label: "Archived" },
] as const;

// Note: no `.default()` on any field here — this schema pairs with
// react-hook-form's zodResolver on the client, and zod v4 + @hookform/
// resolvers v5 mis-infer the resolver's generic when a field carries a
// default (see the Phase 7 fix in lib/validations/design.ts for the same
// issue). Every field the UI always supplies is just required instead.
export const financialLineItemSchema = z.object({
  type: z.enum([
    "GARMENT",
    "DESIGN_SERVICE",
    "CONSULTATION",
    "FABRIC",
    "CUSTOMIZATION",
    "EMBROIDERY",
    "ALTERATION",
    "FITTING",
    "DELIVERY",
    "ACCESSORIES",
    "OTHER",
  ]),
  name: z.string().trim().min(1, "Item name is required"),
  description: z.string().optional(),
  quantity: z.coerce.number().min(0.01, "Quantity must be greater than 0"),
  unitPrice: z.coerce.number().min(0, "Unit price cannot be negative"),
  discount: z.coerce.number().min(0),
  tax: z.coerce.number().min(0),
});
export type FinancialLineItemInput = z.infer<typeof financialLineItemSchema>;

const quotationTermsSchema = z.object({
  paymentTerms: z.string().optional(),
  balanceDueDate: z.coerce.date().optional(),
  productionStartConditions: z.string().optional(),
  cancellationPolicy: z.string().optional(),
  refundPolicy: z.string().optional(),
  alterationPolicy: z.string().optional(),
  deliveryPolicy: z.string().optional(),
  customTerms: z.string().optional(),
});

export const quotationVersionInputSchema = quotationTermsSchema.extend({
  items: z.array(financialLineItemSchema).min(1, "Add at least one line item"),
  discount: z.coerce.number().min(0),
  tax: z.coerce.number().min(0),
  deliveryFee: z.coerce.number().min(0),
  additionalCharges: z.coerce.number().min(0),
  depositPercentage: z.coerce.number().min(0).max(100),
  changesSummary: z.string().optional(),
  notes: z.string().optional(),
});
export type QuotationVersionInput = z.infer<typeof quotationVersionInputSchema>;

export const quotationCreateSchema = quotationVersionInputSchema.extend({
  orderId: z.string().min(1, "Order is required"),
  customerId: z.string().min(1, "Customer is required"),
  expiresAt: z.coerce.date().optional(),
});
export type QuotationCreateInput = z.infer<typeof quotationCreateSchema>;

export const quotationCommentSchema = z.object({
  body: z.string().trim().min(1, "Comment cannot be empty"),
  versionId: z.string().optional(),
});

export const quotationRevisionRequestSchema = z.object({
  body: z.string().trim().min(1, "Please describe the requested changes"),
  versionId: z.string().optional(),
});

export const quotationApprovalDecisionSchema = z.object({
  decision: z.enum(["ACCEPTED", "DECLINED"]),
  confirm: z.literal(true, { message: "Confirmation is required" }),
});

export const financialShareCreateSchema = z.object({
  channel: z.enum(["LINK", "EMAIL", "WHATSAPP"]),
  expiresInDays: z.coerce.number().min(1).max(90).optional(),
});

