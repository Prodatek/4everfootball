import { z } from "zod";
import { ALL_PLAYER_POSITIONS, ALL_PREFERRED_FEET } from "@4ef/shared";

export const playerFormSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(60),
  lastName: z.string().min(1, "Last name is required").max(60),
  dateOfBirth: z.string().optional().or(z.literal("")),
  nationality: z.string().max(80).optional().or(z.literal("")),
  position: z.enum(ALL_PLAYER_POSITIONS as [string, ...string[]]).optional().or(z.literal("")),
  shirtNumber: z.union([z.coerce.number().int().min(1).max(99), z.literal("")]).optional(),
  heightCm: z.union([z.coerce.number().int().min(100).max(250), z.literal("")]).optional(),
  preferredFoot: z
    .enum(ALL_PREFERRED_FEET as [string, ...string[]])
    .optional()
    .or(z.literal("")),
  photoUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  teamId: z.string().optional().or(z.literal("")),
});

export type PlayerFormValues = z.infer<typeof playerFormSchema>;
