import { z } from "zod";

export const customerPreferencesSchema = z.object({
  favoriteColors: z.array(z.string()).optional(),
  favoriteFabrics: z.array(z.string()).optional(),
  stylePreferences: z.array(z.string()).optional(),
  fashionInterests: z.array(z.string()).optional(),
  preferredClothingCategories: z.array(z.string()).optional(),
  commonOccasions: z.array(z.string()).optional(),
  preferredServiceTypes: z.array(z.enum(["CUSTOM_CLOTHING", "TRADITIONAL_WEAR", "BRIDAL_WEAR", "WEDDING_OUTFIT", "CORPORATE_WEAR", "CASUAL_WEAR", "ALTERATIONS", "CUSTOM_DESIGN", "STYLING", "CONSULTATION", "OTHER"])).optional(),
  priceRangeMin: z.number().min(0).nullable().optional(),
  priceRangeMax: z.number().min(0).nullable().optional(),
  preferredDesignerBusinessIds: z.array(z.string()).optional(),
});

export const personalizationSettingsSchema = z.object({
  personalizationEnabled: z.boolean().optional(),
  locationDiscoveryEnabled: z.boolean().optional(),
  notifyNewDesignsFromSaved: z.boolean().optional(),
  notifyStyleMatches: z.boolean().optional(),
  notifySavedDesignerServices: z.boolean().optional(),
});

export const fashionGoalSchema = z.object({
  fashionGoalKey: z.string().optional(),
  customText: z.string().trim().max(500).optional(),
  occasion: z.string().trim().max(100).optional(),
});

export const recommendationFeedbackSchema = z.object({
  action: z.enum(["not-interested", "hide", "show-more-like-this"]),
});
