import { h, type SatoriNode } from './hyperscript';
import { FLOODLIGHT, FONT, type ResolvedBranding } from './brand';
import { page, headerBar, signatureMark, spacer } from './layout';
import type { Dimensions } from '../dimensions';
import type { TopScorersData } from './types';

const MAX_ROWS = 8;

export function topScorersTemplate(
  data: TopScorersData,
  branding: ResolvedBranding,
  size: Dimensions,
): SatoriNode {
  const rows = data.scorers.slice(0, MAX_ROWS);

  return page(branding, size, [
    headerBar(branding, size.width),
    spacer(32),
    h(
      'div',
      {
        display: 'flex',
        fontFamily: FONT.display,
        fontSize: '52px',
        color: FLOODLIGHT.ink,
      },
      'TOP SCORERS',
    ),
    spacer(40),
    h(
      'div',
      { display: 'flex', flexDirection: 'column', gap: '14px' },
      rows.map((row, index) =>
        h(
          'div',
          {
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor:
              index === 0 ? branding.primaryColor : FLOODLIGHT.surface,
            borderRadius: '12px',
            padding: '20px 28px',
          },
          [
            h(
              'div',
              {
                display: 'flex',
                width: '70px',
                fontFamily: FONT.display,
                fontSize: '32px',
                color: index === 0 ? FLOODLIGHT.brandInk : FLOODLIGHT.inkDim,
              },
              String(index + 1),
            ),
            h(
              'div',
              { display: 'flex', flexDirection: 'column', flexGrow: 1 },
              [
                h(
                  'div',
                  {
                    display: 'flex',
                    fontFamily: FONT.bodySemibold,
                    fontSize: '28px',
                    color: index === 0 ? FLOODLIGHT.brandInk : FLOODLIGHT.ink,
                  },
                  row.playerName,
                ),
                h(
                  'div',
                  {
                    display: 'flex',
                    fontFamily: FONT.body,
                    fontSize: '20px',
                    color:
                      index === 0 ? FLOODLIGHT.brandInk : FLOODLIGHT.inkDim,
                  },
                  row.teamName,
                ),
              ],
            ),
            h(
              'div',
              {
                display: 'flex',
                fontFamily: FONT.display,
                fontSize: '36px',
                color: index === 0 ? FLOODLIGHT.brandInk : FLOODLIGHT.ink,
              },
              String(row.goals),
            ),
          ],
        ),
      ),
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
