import { z } from "zod";
import { ALL_FIXTURE_STATUSES } from "@4ef/shared";

export const createFixtureSchema = z.object({
  competitionId: z.string().min(1, "Competition is required"),
  homeTeamId: z.string().min(1, "Home team is required"),
  awayTeamId: z.string().min(1, "Away team is required"),
  kickoffAt: z.string().min(1, "Kickoff date/time is required"),
  venueName: z.string().max(120).optional().or(z.literal("")),
  matchday: z.string().max(40).optional().or(z.literal("")),
});

export type CreateFixtureFormValues = z.infer<typeof createFixtureSchema>;

export const editFixtureSchema = z.object({
  kickoffAt: z.string().min(1, "Kickoff date/time is required"),
  venueName: z.string().max(120).optional().or(z.literal("")),
  matchday: z.string().max(40).optional().or(z.literal("")),
  status: z.enum(ALL_FIXTURE_STATUSES as [string, ...string[]]),
  homeScore: z.union([z.coerce.number().int().min(0), z.literal("")]).optional(),
  awayScore: z.union([z.coerce.number().int().min(0), z.literal("")]).optional(),
});

export type EditFixtureFormValues = z.infer<typeof editFixtureSchema>;
