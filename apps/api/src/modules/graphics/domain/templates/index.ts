import type { GraphicFormat, GraphicTemplate } from '@prisma/client';
import type { SatoriNode } from './hyperscript';
import {
  resolveBranding,
  type CompetitionBranding,
  type ResolvedBranding,
} from './brand';
import type { Dimensions } from '../dimensions';
import type { TemplateDataMap } from './types';
import { fullTimeResultTemplate } from './full-time-result';
import { goalAlertTemplate } from './goal-alert';
import { matchdayFixturesTemplate } from './matchday-fixtures';
import { leagueTableTemplate } from './league-table';
import { topScorersTemplate } from './top-scorers';
import { playerOfWeekTemplate } from './player-of-week';
import { playerPassportTemplate } from './player-passport';
import { headToHeadTemplate } from './head-to-head';
import { milestoneTemplate } from './milestone';
import { seasonSummaryTemplate } from './season-summary';

export type { ResolvedBranding, CompetitionBranding };
export { resolveBranding };

// The format each template renders at when the caller doesn't override —
// list-heavy templates get the taller PORTRAIT canvas, the passport gets
// STORY for one-tap WhatsApp status sharing (brief §4), everything else is
// SQUARE.
export const DEFAULT_FORMAT: Record<GraphicTemplate, GraphicFormat> = {
  FULL_TIME_RESULT: 'SQUARE',
  GOAL_ALERT: 'SQUARE',
  MATCHDAY_FIXTURES: 'PORTRAIT',
  LEAGUE_TABLE: 'PORTRAIT',
  TOP_SCORERS: 'PORTRAIT',
  PLAYER_OF_WEEK: 'SQUARE',
  PLAYER_PASSPORT: 'STORY',
  HEAD_TO_HEAD: 'SQUARE',
  MILESTONE: 'SQUARE',
  SEASON_SUMMARY: 'PORTRAIT',
};

// PLAYER_PASSPORT is the brief's one deliberately ungated template ("it is
// the acquisition loop"); every other template requires an active
// MediaPackEntitlement for the competition's organisation.
export function isGatedTemplate(template: GraphicTemplate): boolean {
  return template !== 'PLAYER_PASSPORT';
}

const RENDERERS: {
  [K in GraphicTemplate]: (
    data: TemplateDataMap[K],
    branding: ResolvedBranding,
    size: Dimensions,
  ) => SatoriNode;
} = {
  FULL_TIME_RESULT: fullTimeResultTemplate,
  GOAL_ALERT: goalAlertTemplate,
  MATCHDAY_FIXTURES: matchdayFixturesTemplate,
  LEAGUE_TABLE: leagueTableTemplate,
  TOP_SCORERS: topScorersTemplate,
  PLAYER_OF_WEEK: playerOfWeekTemplate,
  PLAYER_PASSPORT: playerPassportTemplate,
  HEAD_TO_HEAD: headToHeadTemplate,
  MILESTONE: milestoneTemplate,
  SEASON_SUMMARY: seasonSummaryTemplate,
};

export function renderTemplate(
  template: GraphicTemplate,
  data: unknown,
  competition: CompetitionBranding | null,
  size: Dimensions,
): SatoriNode {
  const branding = resolveBranding(competition);
  const renderer = RENDERERS[template] as (
    data: unknown,
    branding: ResolvedBranding,
    size: Dimensions,
  ) => SatoriNode;

  return renderer(data, branding, size);
}
