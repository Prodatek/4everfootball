import { z } from "zod";

export const teamFormSchema = z.object({
  name: z.string().min(2, "Name is required").max(120),
  shortName: z.string().max(10).optional().or(z.literal("")),
  country: z.string().max(80).optional().or(z.literal("")),
  foundedYear: z
    .union([z.coerce.number().int().min(1800).max(2100), z.literal("")])
    .optional(),
  logoUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  venueName: z.string().max(120).optional().or(z.literal("")),
});

export type TeamFormValues = z.infer<typeof teamFormSchema>;
