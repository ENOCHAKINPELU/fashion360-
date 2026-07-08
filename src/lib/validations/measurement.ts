import { z } from "zod";

export const measurementSchema = z.object({
  customerId: z.string().min(1),
  label: z.string().min(1).default("Measurement Profile"),
  source: z.enum(["MANUAL", "AI_ESTIMATED"]).default("MANUAL"),
  neck: z.coerce.number().optional().nullable(),
  shoulder: z.coerce.number().optional().nullable(),
  chestBust: z.coerce.number().optional().nullable(),
  waist: z.coerce.number().optional().nullable(),
  hip: z.coerce.number().optional().nullable(),
  sleeveLength: z.coerce.number().optional().nullable(),
  armLength: z.coerce.number().optional().nullable(),
  inseam: z.coerce.number().optional().nullable(),
  thigh: z.coerce.number().optional().nullable(),
  garmentLength: z.coerce.number().optional().nullable(),
  heightCm: z.coerce.number().optional().nullable(),
  weightKg: z.coerce.number().optional().nullable(),
  frontImageUrl: z.string().optional().nullable(),
  sideImageUrl: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type MeasurementInput = z.infer<typeof measurementSchema>;

export const MEASUREMENT_FIELDS = [
  { key: "neck", label: "Neck" },
  { key: "shoulder", label: "Shoulder" },
  { key: "chestBust", label: "Chest / Bust" },
  { key: "waist", label: "Waist" },
  { key: "hip", label: "Hip" },
  { key: "sleeveLength", label: "Sleeve Length" },
  { key: "armLength", label: "Arm Length" },
  { key: "inseam", label: "Inseam" },
  { key: "thigh", label: "Thigh" },
  { key: "garmentLength", label: "Garment Length" },
] as const;
