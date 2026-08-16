import { h, type SatoriNode } from './hyperscript';
import { FLOODLIGHT, FONT, type ResolvedBranding } from './brand';
import { page, headerBar, signatureMark, spacer } from './layout';
import type { Dimensions } from '../dimensions';
import type { GoalAlertData } from './types';

export function goalAlertTemplate(
  data: GoalAlertData,
  branding: ResolvedBranding,
  size: Dimensions,
): SatoriNode {
  const minuteLabel = data.stoppageMinute
    ? `${data.minute}+${data.stoppageMinute}'`
    : `${data.minute}'`;

  return page(branding, size, [
    headerBar(branding, size.width),
    h('div', { display: 'flex', flexGrow: 1 }),
    h(
      'div',
      { display: 'flex', flexDirection: 'column', alignItems: 'center' },
      [
        h(
          'div',
          {
            display: 'flex',
            fontFamily: FONT.display,
            fontSize: '160px',
            color: branding.primaryColor,
            letterSpacing: '4px',
          },
          'GOAL!',
        ),
        spacer(24),
        h(
          'div',
          {
            display: 'flex',
            fontFamily: FONT.bodySemibold,
            fontSize: '52px',
            color: FLOODLIGHT.ink,
          },
          data.scorerName,
        ),
        spacer(12),
        h(
          'div',
          {
            display: 'flex',
            fontFamily: FONT.mono,
            fontSize: '30px',
            color: FLOODLIGHT.inkDim,
          },
          `${data.scoringTeamName} · ${minuteLabel}`,
        ),
      ],
    ),
    h('div', { display: 'flex', flexGrow: 1 }),
    h(
      'div',
      {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: '24px',
        fontFamily: FONT.display,
        fontSize: '64px',
        color: FLOODLIGHT.ink,
      },
      `${data.homeTeamName} ${data.homeScore}–${data.awayScore} ${data.awayTeamName}`,
    ),
    spacer(32),
    h(
      'div',
      {
        display: 'flex',
        fontFamily: FONT.body,
        fontSize: '24px',
        color: FLOODLIGHT.inkDim,
        justifyContent: 'center',
      },
      data.competitionName,
    ),
    spacer(24),
    signatureMark(),
  ]);
}
