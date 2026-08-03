import { z } from "zod";

export const measurementFieldCategoryOptions = [
  { value: "UPPER_BODY", label: "Upper Body" },
  { value: "LOWER_BODY", label: "Lower Body" },
  { value: "DRESS", label: "Dress Measurements" },
  { value: "ADDITIONAL", label: "Additional Measurements" },
  { value: "CUSTOM", label: "Custom" },
] as const;

export const fitPreferenceOptions = [
  { value: "TIGHT", label: "Tight" },
  { value: "REGULAR", label: "Regular" },
  { value: "LOOSE", label: "Loose" },
] as const;

export const measurementNoteCategoryOptions = [
  { value: "POSTURE", label: "Posture Notes" },
  { value: "BODY_SHAPE", label: "Body Shape" },
  { value: "ADJUSTMENT", label: "Special Adjustments" },
  { value: "FABRIC_CONSIDERATION", label: "Fabric Considerations" },
  { value: "FIT_PREFERENCE", label: "Fit Preference" },
  { value: "DESIGNER_NOTE", label: "Designer Notes" },
  { value: "PRIVATE", label: "Private Notes" },
] as const;

// Prevents negative values while allowing an "unmeasured" field to be omitted entirely.
export const measurementValuesSchema = z.record(z.string(), z.number().min(0).max(500));

export const measurementProfileSchema = z.object({
  customerId: z.string().min(1),
  name: z.string().trim().min(1, "Profile name is required"),
  isDefault: z.boolean().optional(),
});

export const measurementProfileUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
});

export const measurementCreateSchema = z.object({
  customerId: z.string().min(1),
  profileId: z.string().optional(),
  newProfileName: z.string().trim().optional(),
  templateId: z.string().optional(),
  unit: z.enum(["METRIC", "IMPERIAL"]).default("METRIC"),
  values: measurementValuesSchema,
  fitPreference: z.enum(["TIGHT", "REGULAR", "LOOSE"]).optional(),
  status: z.enum(["DRAFT", "PENDING_REVIEW", "APPROVED"]).default("APPROVED"),
});
export type MeasurementCreateInput = z.infer<typeof measurementCreateSchema>;

export const measurementUpdateSchema = z.object({
  values: measurementValuesSchema.optional(),
  fitPreference: z.enum(["TIGHT", "REGULAR", "LOOSE"]).optional(),
  unit: z.enum(["METRIC", "IMPERIAL"]).optional(),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

export const measurementNoteSchema = z.object({
  category: z.enum(["POSTURE", "BODY_SHAPE", "ADJUSTMENT", "FABRIC_CONSIDERATION", "FIT_PREFERENCE", "DESIGNER_NOTE", "PRIVATE"]),
  body: z.string().trim().min(1),
});

export const measurementTypeSchema = z.object({
  label: z.string().trim().min(1).max(50),
  category: z.enum(["UPPER_BODY", "LOWER_BODY", "DRESS", "ADDITIONAL", "CUSTOM"]),
  unit: z.enum(["METRIC", "IMPERIAL"]).default("METRIC"),
});

export const measurementTemplateSchema = z.object({
  name: z.string().trim().min(1).max(60),
  category: z.string().optional(),
  fields: z
    .array(z.object({ measurementTypeId: z.string(), required: z.boolean().default(true) }))
    .min(1, "Select at least one field"),
});

export const estimationRequestSchema = z.object({
  customerId: z.string().min(1),
  profileId: z.string().optional(),
  newProfileName: z.string().trim().optional(),
  heightCm: z.number().min(50).max(250),
  weightKg: z.number().min(10).max(300),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]),
  frontImageUrl: z.string().url(),
  sideImageUrl: z.string().url(),
  consent: z.literal(true, { message: "Customer consent is required before uploading body photos" }),
});

export const estimationApproveSchema = z.object({
  values: measurementValuesSchema,
  fitPreference: z.enum(["TIGHT", "REGULAR", "LOOSE"]).optional(),
});

export const sessionStartSchema = z.object({
  customerId: z.string().min(1),
  profileId: z.string().optional(),
  templateId: z.string().optional(),
  method: z.enum(["MANUAL", "PHOTO_ESTIMATION"]),
});

export const sessionDraftSchema = z.object({
  draftValues: measurementValuesSchema,
});

export const sessionCompleteSchema = z.object({
  values: measurementValuesSchema,
  unit: z.enum(["METRIC", "IMPERIAL"]).default("METRIC"),
  fitPreference: z.enum(["TIGHT", "REGULAR", "LOOSE"]).optional(),
});

// ===================== Customer Measurement Vault (Phase 2 foundation, Phase 4 versioning) =====================

// Part 16's full field list, in display order. `key` matches
// MeasurementVersion.values' JSON keys (always centimeters).
export const MEASUREMENT_FIELDS = [
  { key: "height", label: "Height" },
  { key: "shoulder", label: "Shoulder" },
  { key: "chestBust", label: "Chest / Bust" },
  { key: "waist", label: "Waist" },
  { key: "hip", label: "Hip" },
  { key: "sleeveLength", label: "Sleeve Length" },
  { key: "armCircumference", label: "Arm Circumference" },
  { key: "wrist", label: "Wrist" },
  { key: "thigh", label: "Thigh" },
  { key: "knee", label: "Knee" },
  { key: "inseam", label: "Inseam" },
  { key: "outseam", label: "Outseam" },
  { key: "garmentLength", label: "Garment Length" },
  { key: "neck", label: "Neck" },
] as const;

// No `.default()` — bound to react-hook-form via zodResolver (see the
// customerProfileSchema comment for why). `values` here are in whichever
// unit the caller is working in (`unit`) — converted to centimeters before
// being written to a MeasurementVersion (see lib/measurement-conversion.ts).
export const passportMeasurementProfileSchema = z.object({
  name: z.string().trim().min(1, "Profile name is required"),
  unit: z.enum(["METRIC", "IMPERIAL"]),
  isDefault: z.boolean(),
  values: measurementValuesSchema,
  notes: z.string().optional(),
});
export type PassportMeasurementProfileInput = z.infer<typeof passportMeasurementProfileSchema>;

export const measurementAccessGrantSchema = z.object({
  scope: z.enum(["SHARED_WITH_BUSINESS", "SHARED_WITH_APPROVED_BUSINESSES"]),
  businessId: z.string().optional(),
});

// ===================== Phase 4: capture, review, correction, access requests =====================

export const measurementCaptureSchema = z.object({
  values: measurementValuesSchema,
  unit: z.enum(["METRIC", "IMPERIAL"]),
  notes: z.string().optional(),
  submitForReview: z.boolean(),
  appointmentId: z.string().optional(),
});
export type MeasurementCaptureInput = z.infer<typeof measurementCaptureSchema>;

export const measurementCorrectionRequestSchema = z.object({
  versionId: z.string().min(1),
  fieldKey: z.string().min(1),
  requestedValue: z.number().min(0).max(500),
  unit: z.enum(["METRIC", "IMPERIAL"]),
  reason: z.string().trim().min(1, "Tell the business what's wrong"),
});
export type MeasurementCorrectionRequestInput = z.infer<typeof measurementCorrectionRequestSchema>;

export const measurementCorrectionResponseSchema = z.object({
  action: z.enum(["accept", "reject", "request-new-session"]),
  responseNote: z.string().optional(),
});

export const measurementAccessRequestSchema = z.object({
  customerProfileId: z.string().min(1),
  reason: z.string().trim().min(1, "Explain why you need access"),
  serviceRequestId: z.string().optional(),
});
export type MeasurementAccessRequestInput = z.infer<typeof measurementAccessRequestSchema>;

export const measurementAccessRequestResponseSchema = z.object({
  action: z.enum(["allow", "allow-once", "allow-until-completion", "decline"]),
  measurementProfileId: z.string().optional(),
});
