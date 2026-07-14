import { z } from "zod";
import { ALL_COMPETITION_TYPES } from "@4ef/shared";

export const competitionFormSchema = z.object({
  name: z.string().min(2, "Name is required").max(120),
  type: z.enum(ALL_COMPETITION_TYPES as [string, ...string[]]),
  season: z.string().min(4, "Season is required").max(20),
  country: z.string().max(80).optional().or(z.literal("")),
  startDate: z.string().optional().or(z.literal("")),
  endDate: z.string().optional().or(z.literal("")),
  logoUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
});

export type CompetitionFormValues = z.infer<typeof competitionFormSchema>;
