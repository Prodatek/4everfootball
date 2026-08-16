import { h, type SatoriNode } from './hyperscript';
import { FLOODLIGHT, FONT, type ResolvedBranding } from './brand';
import { page, headerBar, signatureMark, spacer } from './layout';
import type { Dimensions } from '../dimensions';
import type { LeagueTableData } from './types';

const MAX_ROWS = 10;

export function leagueTableTemplate(
  data: LeagueTableData,
  branding: ResolvedBranding,
  size: Dimensions,
): SatoriNode {
  const rows = data.rows.slice(0, MAX_ROWS);

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
      'TABLE',
    ),
    h(
      'div',
      {
        display: 'flex',
        fontFamily: FONT.mono,
        fontSize: '24px',
        color: branding.primaryColor,
      },
      data.roundLabel,
    ),
    spacer(32),
    h(
      'div',
      {
        display: 'flex',
        flexDirection: 'row',
        padding: '0 20px',
        fontFamily: FONT.mono,
        fontSize: '20px',
        color: FLOODLIGHT.inkDim,
      },
      [
        h('div', { display: 'flex', width: '60px' }, '#'),
        h('div', { display: 'flex', flexGrow: 1 }, 'TEAM'),
        h(
          'div',
          { display: 'flex', width: '80px', justifyContent: 'flex-end' },
          'P',
        ),
        h(
          'div',
          { display: 'flex', width: '80px', justifyContent: 'flex-end' },
          'GD',
        ),
        h(
          'div',
          { display: 'flex', width: '100px', justifyContent: 'flex-end' },
          'PTS',
        ),
      ],
    ),
    spacer(12),
    h(
      'div',
      { display: 'flex', flexDirection: 'column', gap: '10px' },
      rows.map((row) =>
        h(
          'div',
          {
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: FLOODLIGHT.surface,
            borderRadius: '10px',
            padding: '16px 20px',
          },
          [
            h(
              'div',
              {
                display: 'flex',
                width: '60px',
                fontFamily: FONT.mono,
                fontSize: '24px',
                color: branding.primaryColor,
              },
              String(row.position),
            ),
            h(
              'div',
              {
                display: 'flex',
                flexGrow: 1,
                fontFamily: FONT.bodySemibold,
                fontSize: '26px',
                color: FLOODLIGHT.ink,
              },
              row.teamName,
            ),
            h(
              'div',
              {
                display: 'flex',
                width: '80px',
                justifyContent: 'flex-end',
                fontFamily: FONT.mono,
                fontSize: '24px',
                color: FLOODLIGHT.inkDim,
              },
              String(row.played),
            ),
            h(
              'div',
              {
                display: 'flex',
                width: '80px',
                justifyContent: 'flex-end',
                fontFamily: FONT.mono,
                fontSize: '24px',
                color: FLOODLIGHT.inkDim,
              },
              row.goalDifference >= 0
                ? `+${row.goalDifference}`
                : String(row.goalDifference),
            ),
            h(
              'div',
              {
                display: 'flex',
                width: '100px',
                justifyContent: 'flex-end',
                fontFamily: FONT.display,
                fontSize: '28px',
                color: FLOODLIGHT.ink,
              },
              String(row.points),
            ),
          ],
        ),
      ),
    ),
    h('div', { display: 'flex', flexGrow: 1 }),
    signatureMark(),
  ]);
}
