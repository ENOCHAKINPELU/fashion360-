import { z } from "zod";

export const orderTypeOptions = [
  { value: "BESPOKE", label: "Bespoke" },
  { value: "CUSTOM", label: "Custom" },
  { value: "READY_TO_WEAR", label: "Ready-to-Wear" },
  { value: "ALTERATION", label: "Alteration" },
  { value: "REMAKE", label: "Remake" },
] as const;

export const orderPriorityOptions = [
  { value: "NORMAL", label: "Normal" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
] as const;

export const orderStatusOptions = [
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING_CONFIRMATION", label: "Pending Confirmation" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "AWAITING_PAYMENT", label: "Awaiting Payment" },
  { value: "READY_FOR_PRODUCTION", label: "Ready for Production" },
  { value: "IN_PRODUCTION", label: "In Production" },
  { value: "FITTING", label: "Fitting" },
  { value: "ALTERATION", label: "Alteration" },
  { value: "FINAL_INSPECTION", label: "Final Inspection" },
  { value: "QUALITY_CHECK", label: "Quality Check" },
  { value: "QUALITY_CHECK_FAILED", label: "Quality Check Failed" },
  { value: "COMPLETED", label: "Completed" },
  { value: "READY_FOR_PICKUP", label: "Ready for Pickup" },
  { value: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
  { value: "IN_TRANSIT", label: "In Transit" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "DISPUTED", label: "Disputed" },
  { value: "REFUND_PROCESSING", label: "Refund Processing" },
  { value: "REFUNDED", label: "Refunded" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "ON_HOLD", label: "On Hold" },
] as const;

export const orderPaymentStatusOptions = [
  { value: "PENDING", label: "Pending" },
  { value: "PARTIALLY_PAID", label: "Partially Paid" },
  { value: "PAID", label: "Paid" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "REFUNDED", label: "Refunded" },
] as const;

export const deliveryMethodOptions = [
  { value: "PICKUP", label: "Pickup" },
  { value: "DELIVERY", label: "Delivery" },
] as const;

export const orderNoteCategoryOptions = [
  { value: "CUSTOMER", label: "Customer Note" },
  { value: "DESIGNER", label: "Designer Note" },
  { value: "PRODUCTION", label: "Production Note" },
  { value: "FITTING", label: "Fitting Note" },
  { value: "ALTERATION", label: "Alteration Note" },
  { value: "PRIVATE", label: "Private Note" },
] as const;

export const orderFileCategoryOptions = [
  { value: "DESIGN_IMAGE", label: "Design Image" },
  { value: "INSPIRATION", label: "Inspiration" },
  { value: "SKETCH", label: "Sketch" },
  { value: "MEASUREMENT_SHEET", label: "Measurement Sheet" },
  { value: "FABRIC_IMAGE", label: "Fabric Image" },
  { value: "REFERENCE_DOCUMENT", label: "Reference Document" },
  { value: "FINAL_PHOTO", label: "Final Outfit Photo" },
] as const;

export const fittingStatusOptions = [
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ADJUSTMENT_REQUIRED", label: "Adjustment Required" },
  { value: "APPROVED", label: "Approved" },
] as const;

export const alterationStatusOptions = [
  { value: "PENDING", label: "Pending" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
] as const;

export const productionStageStatusOptions = [
  { value: "NOT_STARTED", label: "Not Started" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "SKIPPED", label: "Skipped" },
] as const;

const newCustomerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
});

export const orderCustomizationSchema = z.object({
  fabricId: z.string().optional().or(z.literal("")),
  fabricNameSnapshot: z.string().optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  pattern: z.string().optional(),
  sleeveStyle: z.string().optional(),
  neckline: z.string().optional(),
  collarStyle: z.string().optional(),
  length: z.string().optional(),
  buttonStyle: z.string().optional(),
  embroidery: z.string().optional(),
  pocketStyle: z.string().optional(),
  cuffStyle: z.string().optional(),
  lining: z.string().optional(),
  accessories: z.array(z.string()).default([]),
  customInstructions: z.string().optional(),
  referenceImages: z.array(z.string().url()).default([]),
});
export type OrderCustomizationInput = z.infer<typeof orderCustomizationSchema>;

const orderItemSchema = z
  .object({
    designId: z.string().optional().or(z.literal("")),
    isCustomDesign: z.boolean().default(false),
    customDesignDescription: z.string().optional(),
    designNameSnapshot: z.string().optional(),
    designImageSnapshot: z.string().optional(),
    designCategorySnapshot: z.string().optional(),
    basePrice: z.coerce.number().min(0).default(0),
    customization: orderCustomizationSchema,
  })
  .refine((data) => data.designId || data.isCustomDesign, {
    message: "Select a design or mark this as a custom design request",
    path: ["designId"],
  });

export const orderPricingSchema = z.object({
  fabricCost: z.coerce.number().min(0).default(0),
  customizationCost: z.coerce.number().min(0).default(0),
  additionalServicesCost: z.coerce.number().min(0).default(0),
  deliveryFee: z.coerce.number().min(0).default(0),
  discount: z.coerce.number().min(0).default(0),
  tax: z.coerce.number().min(0).default(0),
  depositRequired: z.coerce.number().min(0).default(0),
});
export type OrderPricingInput = z.infer<typeof orderPricingSchema>;

export const orderCreateSchema = z
  .object({
    customerId: z.string().optional(),
    newCustomer: newCustomerSchema.optional(),

    measurementProfileId: z.string().optional().or(z.literal("")),
    measurementSnapshot: z.record(z.string(), z.number()).optional(),

    item: orderItemSchema,

    orderType: z.enum(["BESPOKE", "CUSTOM", "READY_TO_WEAR", "ALTERATION", "REMAKE"]),
    priority: z.enum(["NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
    orderDate: z.coerce.date(),
    expectedCompletionDate: z.coerce.date().optional(),
    eventDate: z.coerce.date().optional(),
    occasion: z.string().optional(),
    deliveryMethod: z.enum(["PICKUP", "DELIVERY"]).default("PICKUP"),
    deliveryAddress: z.string().optional(),
    customerNotes: z.string().optional(),
    designerNotes: z.string().optional(),
    privateNotes: z.string().optional(),

    pricing: orderPricingSchema,

    saveAsDraft: z.boolean().default(false),
    assignedDesignerId: z.string().optional().or(z.literal("")),
    reorderedFromId: z.string().optional(),
  })
  .refine((data) => data.customerId || data.newCustomer, {
    message: "Select an existing customer or provide new customer details",
    path: ["customerId"],
  })
  .refine(
    (data) => !data.expectedCompletionDate || data.expectedCompletionDate >= data.orderDate,
    { message: "Expected completion date cannot be before the order date", path: ["expectedCompletionDate"] }
  )
  .refine((data) => !data.eventDate || data.eventDate >= data.orderDate, {
    message: "Event date cannot be before the order date",
    path: ["eventDate"],
  });
export type OrderCreateInput = z.infer<typeof orderCreateSchema>;

export const orderUpdateSchema = z.object({
  priority: z.enum(["NORMAL", "HIGH", "URGENT"]).optional(),
  expectedCompletionDate: z.coerce.date().optional(),
  eventDate: z.coerce.date().optional(),
  occasion: z.string().optional(),
  deliveryMethod: z.enum(["PICKUP", "DELIVERY"]).optional(),
  deliveryAddress: z.string().optional(),
  customerNotes: z.string().optional(),
  designerNotes: z.string().optional(),
  privateNotes: z.string().optional(),
  assignedDesignerId: z.string().optional().or(z.literal("")),
  pricing: orderPricingSchema.partial().optional(),
});
export type OrderUpdateInput = z.infer<typeof orderUpdateSchema>;

export const orderStatusUpdateSchema = z.object({
  status: z.enum([
    "DRAFT",
    "PENDING_CONFIRMATION",
    "CONFIRMED",
    "AWAITING_PAYMENT",
    "READY_FOR_PRODUCTION",
    "IN_PRODUCTION",
    "FITTING",
    "ALTERATION",
    "FINAL_INSPECTION",
    "COMPLETED",
    "READY_FOR_PICKUP",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "CANCELLED",
    "ON_HOLD",
  ]),
  note: z.string().optional(),
});
export type OrderStatusUpdateInput = z.infer<typeof orderStatusUpdateSchema>;

export const orderNoteSchema = z.object({
  category: z.enum(["CUSTOMER", "DESIGNER", "PRODUCTION", "FITTING", "ALTERATION", "PRIVATE"]).default("DESIGNER"),
  body: z.string().trim().min(1, "Note cannot be empty"),
});
export type OrderNoteInput = z.infer<typeof orderNoteSchema>;

export const orderFileSchema = z.object({
  category: z.enum([
    "DESIGN_IMAGE",
    "INSPIRATION",
    "SKETCH",
    "MEASUREMENT_SHEET",
    "FABRIC_IMAGE",
    "REFERENCE_DOCUMENT",
    "FINAL_PHOTO",
  ]),
  url: z.string().url(),
  name: z.string().min(1),
  fileType: z.string().optional(),
  sizeBytes: z.coerce.number().int().min(0).optional(),
  productionStageId: z.string().optional(),
});
export type OrderFileInput = z.infer<typeof orderFileSchema>;

export const productionStageUpdateSchema = z.object({
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "SKIPPED"]).optional(),
  startDate: z.coerce.date().optional(),
  completionDate: z.coerce.date().optional(),
  notes: z.string().optional(),
  photos: z.array(z.string()).optional(),
});
export type ProductionStageUpdateInput = z.infer<typeof productionStageUpdateSchema>;

export const fittingSessionSchema = z.object({
  fittingDate: z.coerce.date(),
  status: z.enum(["SCHEDULED", "COMPLETED", "ADJUSTMENT_REQUIRED", "APPROVED"]).default("SCHEDULED"),
  fitIssues: z.string().optional(),
  requiredAdjustments: z.string().optional(),
  designerComments: z.string().optional(),
  customerComments: z.string().optional(),
  photos: z.array(z.string().url()).default([]),
});
export type FittingSessionInput = z.infer<typeof fittingSessionSchema>;

export const fittingSessionUpdateSchema = fittingSessionSchema.partial();
export type FittingSessionUpdateInput = z.infer<typeof fittingSessionUpdateSchema>;

export const alterationSchema = z.object({
  fittingSessionId: z.string().optional().or(z.literal("")),
  issue: z.string().trim().min(1, "Describe the issue"),
  requiredChange: z.string().trim().min(1, "Describe the required change"),
  description: z.string().optional(),
  expectedCompletionDate: z.coerce.date().optional(),
  notes: z.string().optional(),
});
export type AlterationInput = z.infer<typeof alterationSchema>;

export const alterationUpdateSchema = z.object({
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  requiredChange: z.string().optional(),
  description: z.string().optional(),
  expectedCompletionDate: z.coerce.date().optional(),
  notes: z.string().optional(),
});
export type AlterationUpdateInput = z.infer<typeof alterationUpdateSchema>;

export const orderCancellationSchema = z.object({
  reason: z.string().trim().min(1, "A cancellation reason is required"),
});
export type OrderCancellationInput = z.infer<typeof orderCancellationSchema>;

export const orderBulkActionSchema = z.object({
  ids: z.array(z.string()).min(1),
  action: z.enum(["archive", "unarchive"]),
});

export const productionStageTemplateSchema = z.object({
  name: z.string().trim().min(1).max(60),
  sortOrder: z.coerce.number().int().min(0).default(0),
  appliesToOrderTypes: z
    .array(z.enum(["BESPOKE", "CUSTOM", "READY_TO_WEAR", "ALTERATION", "REMAKE"]))
    .default([]),
});
export type ProductionStageTemplateInput = z.infer<typeof productionStageTemplateSchema>;
