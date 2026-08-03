import { z } from "zod";

export const designProjectCategoryOptions = [
  "Traditional Wear",
  "Bridal Wear",
  "Corporate Wear",
  "Casual Wear",
  "Suits",
  "Dresses",
  "Alterations",
  "Other",
] as const;

// No `.default()` on any field bound to react-hook-form (see
// customerProfileSchema's comment in validations/customer-account.ts).
export const designProjectCreateSchema = z.object({
  serviceRequestId: z.string().min(1, "Select a service request"),
  name: z.string().trim().min(1, "Project name is required"),
  description: z.string().optional(),
  category: z.string().optional(),
  assignedDesignerId: z.string().optional(),
});
export type DesignProjectCreateInput = z.infer<typeof designProjectCreateSchema>;

export const designProjectUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  assignedDesignerId: z.string().optional().or(z.literal("")),
});

export const designReferenceTypeOptions = [
  { value: "SKETCH", label: "Sketch" },
  { value: "FRONT_VIEW", label: "Front View" },
  { value: "BACK_VIEW", label: "Back View" },
  { value: "SIDE_VIEW", label: "Side View" },
  { value: "FABRIC_REFERENCE", label: "Fabric Reference" },
  { value: "COLOR_REFERENCE", label: "Color Reference" },
  { value: "DETAIL_REFERENCE", label: "Detail Reference" },
  { value: "INSPIRATION", label: "Inspiration" },
  { value: "TECHNICAL_REFERENCE", label: "Technical Reference" },
  { value: "OTHER", label: "Other" },
] as const;

export const designReferenceCreateSchema = z.object({
  fileUrl: z.string().url(),
  title: z.string().trim().min(1, "Title is required"),
  type: z.enum([
    "SKETCH",
    "FRONT_VIEW",
    "BACK_VIEW",
    "SIDE_VIEW",
    "FABRIC_REFERENCE",
    "COLOR_REFERENCE",
    "DETAIL_REFERENCE",
    "INSPIRATION",
    "TECHNICAL_REFERENCE",
    "OTHER",
  ]),
  description: z.string().optional(),
});
export type DesignReferenceCreateInput = z.infer<typeof designReferenceCreateSchema>;

// Part 5: customer-facing fields, kept separate from `internalNotes` (never
// sent to any customer-facing endpoint's response).
export const designerCreateVersionSchema = z.object({
  designName: z.string().trim().min(1, "Design name is required"),
  description: z.string().optional(),
  fabric: z.string().optional(),
  color: z.string().optional(),
  styleNotes: z.string().optional(),
  designInstructions: z.string().optional(),
  estimatedProductionDays: z.string().trim().regex(/^\d+$/, "Enter a whole number").optional().or(z.literal("")),
  tags: z.array(z.string()),
  internalNotes: z.string().optional(),
  previewImageUrl: z.string().url().optional().or(z.literal("")),
  model: z
    .object({
      format: z.enum(["GLB", "GLTF", "OBJ", "FBX"]),
      url: z.string().url(),
      thumbnailUrl: z.string().url().optional().or(z.literal("")),
      fileSizeBytes: z.number().int().min(0).optional(),
    })
    .optional(),
  changesSummary: z.string().optional(),
});
export type DesignerCreateVersionInput = z.infer<typeof designerCreateVersionSchema>;

export const designBriefSchema = z.object({
  whatCustomerWants: z.string().optional(),
  occasion: z.string().optional(),
  preferredStyle: z.string().optional(),
  preferredColors: z.array(z.string()),
  preferredFabric: z.string().optional(),
  inspiration: z.string().optional(),
  referenceImageUrls: z.array(z.string()),
  thingsToAvoid: z.string().optional(),
  specialRequirements: z.string().optional(),
  additionalNotes: z.string().optional(),
});
export type DesignBriefInput = z.infer<typeof designBriefSchema>;

export const changeCategoryOptions = [
  { value: "COLOR", label: "Change Color" },
  { value: "FABRIC", label: "Change Fabric" },
  { value: "SLEEVE", label: "Change Sleeve" },
  { value: "NECKLINE", label: "Change Neckline" },
  { value: "LENGTH", label: "Change Length" },
  { value: "FIT", label: "Change Fit" },
  { value: "PATTERN", label: "Change Pattern" },
  { value: "EMBROIDERY", label: "Change Embroidery" },
  { value: "OTHER", label: "Other" },
] as const;

export const customerFeedbackSchema = z.object({
  versionId: z.string().min(1),
  changeCategory: z.enum(["COLOR", "FABRIC", "SLEEVE", "NECKLINE", "LENGTH", "FIT", "PATTERN", "EMBROIDERY", "OTHER"]).optional(),
  body: z.string().trim().min(1, "Describe the change you'd like"),
  referenceImages: z.array(z.string()),
});
export type CustomerFeedbackInput = z.infer<typeof customerFeedbackSchema>;

export const customerAnnotationSchema = z.object({
  versionId: z.string().min(1),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  body: z.string().trim().min(1, "Add a note for this pin"),
});
export type CustomerAnnotationInput = z.infer<typeof customerAnnotationSchema>;

export const customerApproveSchema = z.object({
  confirm: z.literal(true, { message: "Explicit confirmation is required" }),
});

export const revisionRequestResponseSchema = z.object({
  action: z.enum(["accept", "reject", "ask-clarification"]),
  responseNote: z.string().optional(),
});

export const postApprovalChangeRequestSchema = z.object({
  requestedChange: z.string().trim().min(1, "Describe the change you'd like"),
  reason: z.string().trim().min(1, "Tell the business why you need this change"),
  referenceImageUrl: z.string().url().optional().or(z.literal("")),
});
export type PostApprovalChangeRequestInput = z.infer<typeof postApprovalChangeRequestSchema>;
