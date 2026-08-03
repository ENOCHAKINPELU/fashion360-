import { z } from "zod";

export const designPreviewStatusOptions = [
  { value: "DRAFT", label: "Draft" },
  { value: "PREVIEW_READY", label: "Preview Ready" },
  { value: "SENT_FOR_REVIEW", label: "Sent for Review" },
  { value: "UNDER_CUSTOMER_REVIEW", label: "Under Customer Review" },
  { value: "REVISION_REQUESTED", label: "Revision Requested" },
  { value: "UPDATED", label: "Updated" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "ARCHIVED", label: "Archived" },
  { value: "LOCKED", label: "Locked" },
] as const;

export const designVersionStatusOptions = [
  { value: "DRAFT", label: "Draft" },
  { value: "ACTIVE", label: "Active" },
  { value: "SUPERSEDED", label: "Superseded" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
] as const;

export const designModelFormatOptions = [
  { value: "GLB", label: "GLB" },
  { value: "GLTF", label: "glTF" },
  { value: "OBJ", label: "OBJ" },
  { value: "FBX", label: "FBX" },
] as const;

export const designTextureRoleOptions = [
  { value: "PRIMARY", label: "Primary Fabric" },
  { value: "SECONDARY", label: "Secondary Fabric" },
  { value: "TRIM", label: "Trim" },
  { value: "LINING", label: "Lining" },
  { value: "ACCENT", label: "Accent" },
] as const;

export const designRevisionRequestStatusOptions = [
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "ADDRESSED", label: "Addressed" },
  { value: "DECLINED", label: "Declined" },
] as const;

export const designShareChannelOptions = [
  { value: "LINK", label: "Secure Link" },
  { value: "EMAIL", label: "Email" },
  { value: "WHATSAPP", label: "WhatsApp" },
] as const;

export const designVersionCustomizationSchema = z.object({
  fabricId: z.string().optional().or(z.literal("")),
  fabricNameSnapshot: z.string().optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  pattern: z.string().optional(),
  sleeveStyle: z.string().optional(),
  neckline: z.string().optional(),
  collarStyle: z.string().optional(),
  cuffStyle: z.string().optional(),
  length: z.string().optional(),
  buttonStyle: z.string().optional(),
  embroidery: z.string().optional(),
  pocketStyle: z.string().optional(),
  lining: z.string().optional(),
  accessories: z.array(z.string()).default([]),
  otherCustomizations: z.string().optional(),
});
export type DesignVersionCustomizationInput = z.infer<typeof designVersionCustomizationSchema>;

export const designModelInputSchema = z.object({
  format: z.enum(["GLB", "GLTF", "OBJ", "FBX"]),
  url: z.string().url(),
  thumbnailUrl: z.string().url().optional().or(z.literal("")),
  fileSizeBytes: z.coerce.number().int().min(0).optional(),
});
export type DesignModelInput = z.infer<typeof designModelInputSchema>;

export const designTextureInputSchema = z.object({
  role: z.enum(["PRIMARY", "SECONDARY", "TRIM", "LINING", "ACCENT"]).default("PRIMARY"),
  name: z.string().trim().min(1, "Texture name is required"),
  imageUrl: z.string().url(),
  colorHex: z.string().optional(),
  materialType: z.string().optional(),
  description: z.string().optional(),
  fabricLibraryItemId: z.string().optional().or(z.literal("")),
});
export type DesignTextureInput = z.infer<typeof designTextureInputSchema>;

export const designVersionCreateSchema = z.object({
  changesSummary: z.string().optional(),
  notes: z.string().optional(),
  previewImageUrl: z.string().url().optional().or(z.literal("")),
  customization: designVersionCustomizationSchema,
  model: designModelInputSchema.optional(),
  textures: z.array(designTextureInputSchema).default([]),
});
export type DesignVersionCreateInput = z.infer<typeof designVersionCreateSchema>;

export const designPreviewCreateSchema = z.object({
  orderItemId: z.string().min(1, "Select which order item this preview is for"),
  name: z.string().trim().min(1, "Design name is required"),
  designId: z.string().optional().or(z.literal("")),
  version: designVersionCreateSchema,
});
export type DesignPreviewCreateInput = z.infer<typeof designPreviewCreateSchema>;

export const designPreviewUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
});
export type DesignPreviewUpdateInput = z.infer<typeof designPreviewUpdateSchema>;

export const designRevisionRequestSchema = z.object({
  body: z.string().trim().min(1, "Describe the change you'd like"),
  referenceImages: z.array(z.string().url()).default([]),
  versionId: z.string().optional(),
});
export type DesignRevisionRequestInput = z.infer<typeof designRevisionRequestSchema>;

export const designRevisionRequestUpdateSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "ADDRESSED", "DECLINED"]),
});

export const designCommentSchema = z.object({
  body: z.string().trim().min(1, "Comment cannot be empty"),
  imageUrl: z.string().url().optional().or(z.literal("")),
  versionId: z.string().optional(),
});
export type DesignCommentInput = z.infer<typeof designCommentSchema>;

export const designAnnotationSchema = z.object({
  versionId: z.string().min(1),
  x: z.coerce.number().min(0).max(100),
  y: z.coerce.number().min(0).max(100),
  body: z.string().trim().min(1, "Add a note for this pin"),
});
export type DesignAnnotationInput = z.infer<typeof designAnnotationSchema>;

export const designShareCreateSchema = z.object({
  channel: z.enum(["LINK", "EMAIL", "WHATSAPP"]).default("LINK"),
  expiresInDays: z.coerce.number().int().min(1).max(90).optional(),
});
export type DesignShareCreateInput = z.infer<typeof designShareCreateSchema>;

export const designApprovalDecisionSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  confirm: z.boolean().refine((v) => v === true, "Explicit confirmation is required"),
});
export type DesignApprovalDecisionInput = z.infer<typeof designApprovalDecisionSchema>;
