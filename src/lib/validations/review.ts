import { z } from "zod";

export const reviewCategoryOptions = [
  { value: "DESIGN_QUALITY", label: "Design Quality" },
  { value: "COMMUNICATION", label: "Communication" },
  { value: "PROFESSIONALISM", label: "Professionalism" },
  { value: "DELIVERY_TIMELINESS", label: "Delivery Timeliness" },
  { value: "VALUE_FOR_MONEY", label: "Value for Money" },
  { value: "CUSTOMER_EXPERIENCE", label: "Customer Experience" },
] as const;

export const REVIEW_BODY_MIN = 20;
export const REVIEW_BODY_MAX = 2000;

const categoryRatingSchema = z.object({
  category: z.enum(["DESIGN_QUALITY", "COMMUNICATION", "PROFESSIONALISM", "DELIVERY_TIMELINESS", "VALUE_FOR_MONEY", "CUSTOMER_EXPERIENCE"]),
  rating: z.number().int().min(1).max(5),
});

export const reviewSubmitSchema = z.object({
  overallRating: z.number().int().min(1).max(5),
  bodyText: z.string().trim().min(REVIEW_BODY_MIN, `Please write at least ${REVIEW_BODY_MIN} characters`).max(REVIEW_BODY_MAX),
  categoryRatings: z.array(categoryRatingSchema).max(6).optional(),
  photos: z
    .array(z.object({ url: z.string(), isPublic: z.boolean() }))
    .max(10)
    .optional(),
});

export const reviewEditSchema = z.object({
  overallRating: z.number().int().min(1).max(5),
  bodyText: z.string().trim().min(REVIEW_BODY_MIN).max(REVIEW_BODY_MAX),
  categoryRatings: z.array(categoryRatingSchema).max(6).optional(),
  photos: z
    .array(z.object({ url: z.string(), isPublic: z.boolean() }))
    .max(10)
    .optional(),
});

export const reviewResponseSchema = z.object({
  body: z.string().trim().min(1, "Response cannot be empty").max(2000),
});

export const reviewReportSchema = z.object({
  reason: z.enum(["SPAM", "FAKE_REVIEW", "HARASSMENT", "INAPPROPRIATE_CONTENT", "PERSONAL_INFORMATION", "FRAUD", "OTHER"]),
  details: z.string().trim().max(1000).optional(),
});

export const reviewModerationSchema = z.object({
  action: z.enum(["APPROVE", "REJECT", "HIDE", "RESTORE", "SUSPEND_PRIVILEGES"]),
  reason: z.string().trim().min(1, "A reason is required for moderation actions").max(1000),
});

export const REVIEW_EDIT_WINDOW_DAYS = 7;

// A plain helper (not a component) so Date.now() here never trips the
// react-compiler purity rule that applies to page/component render bodies.
export function isReviewEditable(review: { createdAt: Date; status: string }): boolean {
  const ageDays = (Date.now() - review.createdAt.getTime()) / (24 * 60 * 60 * 1000);
  return ageDays <= REVIEW_EDIT_WINDOW_DAYS && review.status !== "REMOVED" && review.status !== "REJECTED";
}
