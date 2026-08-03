import { z } from "zod";

export const designStatusOptions = [
  { value: "DRAFT", label: "Draft" },
  { value: "PUBLISHED", label: "Published" },
  { value: "ARCHIVED", label: "Archived" },
  { value: "PRIVATE", label: "Private" },
] as const;

export const designDifficultyOptions = [
  { value: "SIMPLE", label: "Simple" },
  { value: "MODERATE", label: "Moderate" },
  { value: "ADVANCED", label: "Advanced" },
  { value: "EXPERT", label: "Expert" },
] as const;

export const fabricAvailabilityOptions = [
  { value: "IN_STOCK", label: "In stock" },
  { value: "LIMITED", label: "Limited" },
  { value: "OUT_OF_STOCK", label: "Out of stock" },
  { value: "SEASONAL", label: "Seasonal" },
] as const;

export const inspirationSourceOptions = [
  { value: "UPLOAD", label: "Upload" },
  { value: "PINTEREST", label: "Pinterest" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "SKETCH", label: "Sketch" },
  { value: "MOOD_BOARD", label: "Mood board" },
  { value: "OTHER", label: "Other" },
] as const;

export const designNoteCategoryOptions = [
  { value: "CONSTRUCTION", label: "Construction" },
  { value: "FABRIC_ADVICE", label: "Fabric advice" },
  { value: "MEASUREMENT", label: "Measurement" },
  { value: "SPECIAL_INSTRUCTION", label: "Special instruction" },
  { value: "PRIVATE", label: "Private" },
] as const;

export const PREDEFINED_DESIGN_TAGS = [
  "Luxury",
  "Trending",
  "Premium",
  "Wedding",
  "Simple",
  "Traditional",
  "Corporate",
] as const;

export const designFormSchema = z.object({
  name: z.string().trim().min(1, "Design name is required"),
  description: z.string().optional(),
  categoryId: z.string().min(1, "Category is required"),
  collectionId: z.string().optional().or(z.literal("")),
  mainImageUrl: z.string().url("A main image is required"),
  occasion: z.string().optional(),
  estimatedCompletionDays: z.coerce.number().int().min(0).optional(),
  basePrice: z.coerce.number().min(0).optional(),
  difficulty: z.enum(["SIMPLE", "MODERATE", "ADVANCED", "EXPERT"]).optional(),
  fabricRecommendations: z.array(z.string()),
  colorRecommendations: z.array(z.string()),
  tags: z.array(z.string()),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED", "PRIVATE"]),
  isFeatured: z.boolean(),
  images: z.array(z.string().url()),
  notes: z.string().optional(),
});
export type DesignFormInput = z.infer<typeof designFormSchema>;

export const designCategorySchema = z.object({
  name: z.string().trim().min(1).max(40),
  icon: z.string().optional(),
});

export const designCollectionSchema = z.object({
  name: z.string().trim().min(1, "Collection name is required").max(60),
  description: z.string().optional(),
  coverImageUrl: z.string().url().optional().or(z.literal("")),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED", "PRIVATE"]),
});
export type DesignCollectionInput = z.infer<typeof designCollectionSchema>;

export const designTagSchema = z.object({
  name: z.string().trim().min(1).max(30),
  color: z.string().optional(),
});

export const designNoteSchema = z.object({
  category: z.enum(["CONSTRUCTION", "FABRIC_ADVICE", "MEASUREMENT", "SPECIAL_INSTRUCTION", "PRIVATE"]),
  body: z.string().trim().min(1, "Note cannot be empty"),
});

export const fabricLibraryItemSchema = z.object({
  name: z.string().trim().min(1, "Fabric name is required").max(60),
  imageUrl: z.string().url().optional().or(z.literal("")),
  colorVariants: z.array(z.string()),
  texture: z.string().optional(),
  description: z.string().optional(),
  recommendedUses: z.array(z.string()),
  availability: z.enum(["IN_STOCK", "LIMITED", "OUT_OF_STOCK", "SEASONAL"]),
});
export type FabricLibraryItemInput = z.infer<typeof fabricLibraryItemSchema>;

export const colorLibraryItemSchema = z.object({
  name: z.string().trim().min(1, "Colour name is required").max(40),
  hexValue: z.string().trim().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Enter a valid hex colour"),
  pairsWith: z.array(z.string()),
});
export type ColorLibraryItemInput = z.infer<typeof colorLibraryItemSchema>;

export const designCustomizationSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  fabricId: z.string().optional().or(z.literal("")),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  sleeveStyle: z.string().optional(),
  neckline: z.string().optional(),
  collarStyle: z.string().optional(),
  buttonStyle: z.string().optional(),
  embroidery: z.string().optional(),
  length: z.string().optional(),
  pocketStyle: z.string().optional(),
  cuffStyle: z.string().optional(),
  lining: z.string().optional(),
  accessories: z.array(z.string()),
  extraNotes: z.string().optional(),
});
export type DesignCustomizationInput = z.infer<typeof designCustomizationSchema>;

export const customerInspirationSchema = z.object({
  relatedDesignId: z.string().optional().or(z.literal("")),
  source: z.enum(["UPLOAD", "PINTEREST", "INSTAGRAM", "SKETCH", "MOOD_BOARD", "OTHER"]),
  designerNotes: z.string().optional(),
  images: z.array(z.string().url()).min(1, "Add at least one image"),
});
export type CustomerInspirationInput = z.infer<typeof customerInspirationSchema>;

export const designBulkActionSchema = z.object({
  ids: z.array(z.string()).min(1),
  action: z.enum(["archive", "publish", "feature", "unfeature", "delete"]),
});
