import { z } from "zod";
import { ADMIN_SETTABLE_FIXTURE_STATUSES } from "@4ef/shared";

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
  // ADMIN_SETTABLE_FIXTURE_STATUSES is already a readonly literal tuple
  // (`as const`), which z.enum accepts natively — casting it to a mutable
  // [string, ...string[]] (as the old ALL_FIXTURE_STATUSES-based version
  // needed to, since that one was a plain FixtureStatus[]) would widen the
  // inferred type back down to generic `string` and defeat the point.
  status: z.enum(ADMIN_SETTABLE_FIXTURE_STATUSES),
});

export type EditFixtureFormValues = z.infer<typeof editFixtureSchema>;
