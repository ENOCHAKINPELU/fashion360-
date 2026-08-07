import { z } from "zod";

export const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  position: z.string().optional(),
  image: z.string().url().optional().or(z.literal("")),
});
export type ProfileInput = z.infer<typeof profileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Include at least one uppercase letter")
      .regex(/[0-9]/, "Include at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// SMS/WhatsApp/push were removed from here — no provider for any of them is
// integrated anywhere in the app (unlike the separate, honestly-labeled
// per-appointment ReminderChannel system in appointment-reminders.ts, which
// explicitly stubs those two), so a toggle for them was pure decoration:
// saved to the database, read by nothing. Only keep a preference here once
// something real enforces it.
export const notificationPreferencesSchema = z.object({
  email: z.boolean(),
});
export type NotificationPreferencesInput = z.infer<typeof notificationPreferencesSchema>;
