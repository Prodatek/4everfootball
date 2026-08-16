import { h, type SatoriNode } from './hyperscript';
import { FLOODLIGHT, FONT, type ResolvedBranding } from './brand';
import { page, headerBar, signatureMark, spacer } from './layout';
import type { Dimensions } from '../dimensions';
import type { SeasonSummaryData } from './types';

function stat(label: string, value: string): SatoriNode {
  return h('div', { display: 'flex', flexDirection: 'column', gap: '4px' }, [
    h(
      'div',
      {
        display: 'flex',
        fontFamily: FONT.display,
        fontSize: '48px',
        color: FLOODLIGHT.ink,
      },
      value,
    ),
    h(
      'div',
      {
        display: 'flex',
        fontFamily: FONT.mono,
        fontSize: '18px',
        color: FLOODLIGHT.inkDim,
        letterSpacing: '1px',
      },
      label.toUpperCase(),
    ),
  ]);
}

export function seasonSummaryTemplate(
  data: SeasonSummaryData,
  branding: ResolvedBranding,
  size: Dimensions,
): SatoriNode {
  return page(branding, size, [
    headerBar(branding, size.width),
    spacer(32),
    h(
      'div',
      {
        display: 'flex',
        fontFamily: FONT.mono,
        fontSize: '26px',
        color: branding.primaryColor,
        letterSpacing: '2px',
      },
      'SEASON SUMMARY',
    ),
    h(
      'div',
      {
        display: 'flex',
        fontFamily: FONT.display,
        fontSize: '56px',
        color: FLOODLIGHT.ink,
      },
      data.season,
    ),
    spacer(40),
    data.championTeamName
      ? h(
          'div',
          {
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: branding.primaryColor,
            borderRadius: '16px',
            padding: '32px',
            gap: '8px',
          },
          [
            h(
              'div',
              {
                display: 'flex',
                fontFamily: FONT.mono,
                fontSize: '20px',
                color: FLOODLIGHT.brandInk,
              },
              'CHAMPIONS',
            ),
            h(
              'div',
              {
                display: 'flex',
                fontFamily: FONT.display,
                fontSize: '48px',
                color: FLOODLIGHT.brandInk,
              },
              data.championTeamName,
            ),
          ],
        )
      : h('div', { display: 'flex' }),
    spacer(40),
    h(
      'div',
      { display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '48px' },
      [
        stat('Matches played', String(data.totalMatches)),
        stat('Goals scored', String(data.totalGoals)),
        ...(data.topScorerName && data.topScorerGoals !== null
          ? [
              stat(
                'Top scorer',
                `${data.topScorerName} (${data.topScorerGoals})`,
              ),
            ]
          : []),
      ],
    ),
    h('div', { display: 'flex', flexGrow: 1 }),
    h(
      'div',
      {
        display: 'flex',
        fontFamily: FONT.body,
        fontSize: '22px',
        color: FLOODLIGHT.inkDim,
        justifyContent: 'center',
      },
      data.competitionName,
    ),
    spacer(24),
    signatureMark(),
  ]);
}
