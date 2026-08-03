import { z } from "zod";

export const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Enter a valid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Include at least one uppercase letter")
    .regex(/[0-9]/, "Include at least one number"),
  acceptTerms: z.literal(true, { message: "You must accept the Terms of Service" }),
});
export type RegisterInput = z.infer<typeof registerSchema>;

// Split into a shared field set + two schemas (rather than one schema with
// `.omit()`) because Zod disallows `.omit()` on a schema that already has
// `.refine()` applied — and the registration form's resolver genuinely
// needs the non-consent fields only (acceptTerms/acceptPrivacy are kept as
// local component state, not react-hook-form fields, see
// register/customer/page.tsx's own comment on why).
const customerCoreFields = {
  fullName: z.string().trim().min(1, "Full name is required"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().trim().min(7, "Enter a valid phone number"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Include at least one uppercase letter")
    .regex(/[0-9]/, "Include at least one number"),
  confirmPassword: z.string(),
};

const PASSWORD_MATCH_REFINEMENT = {
  message: "Passwords do not match",
  path: ["confirmPassword"],
};

// Used by the registration form's resolver.
export const customerRegisterFormSchema = z
  .object(customerCoreFields)
  .refine((data) => data.password === data.confirmPassword, PASSWORD_MATCH_REFINEMENT);

// Used by the API route — the full submitted payload, consent included.
export const customerRegisterSchema = z
  .object({
    ...customerCoreFields,
    acceptTerms: z.literal(true, { message: "You must accept the Terms of Service" }),
    acceptPrivacy: z.literal(true, { message: "You must accept the Privacy Policy" }),
  })
  .refine((data) => data.password === data.confirmPassword, PASSWORD_MATCH_REFINEMENT);
export type CustomerRegisterInput = z.infer<typeof customerRegisterSchema>;

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
  remember: z.boolean(),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email"),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Include at least one uppercase letter")
      .regex(/[0-9]/, "Include at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
