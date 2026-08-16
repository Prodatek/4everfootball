import { h, type SatoriNode } from './hyperscript';
import { FLOODLIGHT, FONT, type ResolvedBranding } from './brand';
import { page, headerBar, signatureMark, spacer } from './layout';
import type { Dimensions } from '../dimensions';
import type { MatchdayFixturesData } from './types';

const MAX_ROWS = 6;

export function matchdayFixturesTemplate(
  data: MatchdayFixturesData,
  branding: ResolvedBranding,
  size: Dimensions,
): SatoriNode {
  const rows = data.fixtures.slice(0, MAX_ROWS);

  return page(branding, size, [
    headerBar(branding, size.width),
    spacer(40),
    h(
      'div',
      {
        display: 'flex',
        fontFamily: FONT.display,
        fontSize: '64px',
        color: FLOODLIGHT.ink,
      },
      'MATCHDAY',
    ),
    h(
      'div',
      {
        display: 'flex',
        fontFamily: FONT.mono,
        fontSize: '28px',
        color: branding.primaryColor,
      },
      data.dateLabel,
    ),
    spacer(48),
    h(
      'div',
      { display: 'flex', flexDirection: 'column', gap: '24px' },
      rows.map((fixture) =>
        h(
          'div',
          {
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: FLOODLIGHT.surface,
            borderRadius: '16px',
            padding: '24px 32px',
          },
          [
            h(
              'div',
              {
                display: 'flex',
                fontFamily: FONT.bodySemibold,
                fontSize: '30px',
                color: FLOODLIGHT.ink,
              },
              `${fixture.homeTeamName}  vs  ${fixture.awayTeamName}`,
            ),
            h(
              'div',
              {
                display: 'flex',
                fontFamily: FONT.mono,
                fontSize: '26px',
                color: FLOODLIGHT.inkDim,
              },
              fixture.kickoffTime,
            ),
          ],
        ),
      ),
    ),
    h('div', { display: 'flex', flexGrow: 1 }),
    signatureMark(),
  ]);
}
