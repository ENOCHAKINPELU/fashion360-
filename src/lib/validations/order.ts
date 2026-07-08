import { z } from "zod";

export const ORDER_STAGES = [
  "CONSULTATION",
  "MEASUREMENT",
  "DESIGN_APPROVAL",
  "PRODUCTION",
  "FITTING",
  "ALTERATION",
  "COMPLETED",
  "READY_FOR_PICKUP",
  "DELIVERED",
  "CANCELLED",
] as const;

export const orderSchema = z.object({
  customerId: z.string().min(1),
  measurementId: z.string().optional().nullable(),
  designId: z.string().optional().nullable(),
  stage: z.enum(ORDER_STAGES).default("CONSULTATION"),
  requiredStages: z.array(z.enum(ORDER_STAGES)).default([...ORDER_STAGES.filter((s) => s !== "CANCELLED")]),
  inspirationImages: z.array(z.string()).default([]),
  notes: z.string().optional().nullable(),
  deliveryDate: z.string().optional().nullable(),
  fabric: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  neckline: z.string().optional().nullable(),
  sleeveStyle: z.string().optional().nullable(),
  length: z.string().optional().nullable(),
  buttons: z.string().optional().nullable(),
  accessories: z.string().optional().nullable(),
  embroidery: z.string().optional().nullable(),
  customNotes: z.string().optional().nullable(),
  price: z.coerce.number().optional().nullable(),
});

export type OrderInput = z.infer<typeof orderSchema>;

export const STAGE_LABELS: Record<(typeof ORDER_STAGES)[number], string> = {
  CONSULTATION: "Consultation",
  MEASUREMENT: "Measurement",
  DESIGN_APPROVAL: "Design Approval",
  PRODUCTION: "Production",
  FITTING: "Fitting",
  ALTERATION: "Alteration",
  COMPLETED: "Completed",
  READY_FOR_PICKUP: "Ready for Pickup",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};
