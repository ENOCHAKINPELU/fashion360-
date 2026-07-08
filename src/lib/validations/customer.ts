import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  address: z.string().optional().nullable(),
  birthday: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  preferredColors: z.array(z.string()).default([]),
  preferredFabrics: z.array(z.string()).default([]),
  stylePreferences: z.array(z.string()).default([]),
  specialNotes: z.string().optional().nullable(),
});

export type CustomerInput = z.infer<typeof customerSchema>;
