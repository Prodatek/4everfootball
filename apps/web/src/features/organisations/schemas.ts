import { z } from "zod";

const ORGANISATION_TYPES = ["ORGANISER", "ACADEMY", "SCHOOL_LEAGUE", "FEDERATION", "CLUB"] as const;

export const organisationFormSchema = z.object({
  name: z.string().min(2, "Name is required").max(120),
  type: z.enum(ORGANISATION_TYPES, { message: "Select an organisation type" }),
  contactName: z.string().max(120).optional().or(z.literal("")),
  phone: z.string().max(32).optional().or(z.literal("")),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  address: z.string().max(240).optional().or(z.literal("")),
  rcNumber: z.string().max(60).optional().or(z.literal("")),
});

export type OrganisationFormValues = z.infer<typeof organisationFormSchema>;
