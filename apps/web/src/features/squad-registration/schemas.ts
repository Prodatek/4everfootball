import { z } from "zod";
import { ALL_PLAYER_POSITIONS } from "@4ef/shared";
import { isMinor } from "./guardian-consent";

export const squadPlayerFormSchema = z
  .object({
    firstName: z.string().min(1, "First name is required").max(60),
    lastName: z.string().min(1, "Last name is required").max(60),
    dateOfBirth: z.string().min(1, "Date of birth is required"),
    position: z
      .enum(ALL_PLAYER_POSITIONS as [string, ...string[]])
      .optional()
      .or(z.literal("")),
    photoUrl: z.string().url().optional().or(z.literal("")),
    guardianName: z.string().max(120).optional().or(z.literal("")),
    guardianPhone: z.string().max(32).optional().or(z.literal("")),
    guardianEmail: z.string().email("Enter a valid email").optional().or(z.literal("")),
  })
  .superRefine((values, ctx) => {
    if (!values.dateOfBirth || !isMinor(values.dateOfBirth)) return;
    const hasConsent = Boolean(
      values.guardianName && (values.guardianPhone || values.guardianEmail),
    );
    if (!hasConsent) {
      ctx.addIssue({
        code: "custom",
        path: ["guardianName"],
        message:
          "This player is under 18 — guardian name plus a phone or email is required",
      });
    }
  });

export type SquadPlayerFormValues = z.infer<typeof squadPlayerFormSchema>;
