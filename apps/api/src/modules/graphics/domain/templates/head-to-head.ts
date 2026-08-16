import { h, type SatoriNode } from './hyperscript';
import { FLOODLIGHT, FONT, type ResolvedBranding } from './brand';
import { page, headerBar, badge, signatureMark, spacer } from './layout';
import type { Dimensions } from '../dimensions';
import type { HeadToHeadData } from './types';

export function headToHeadTemplate(
  data: HeadToHeadData,
  branding: ResolvedBranding,
  size: Dimensions,
): SatoriNode {
  return page(branding, size, [
    headerBar(branding, size.width),
    spacer(24),
    h(
      'div',
      {
        display: 'flex',
        fontFamily: FONT.mono,
        fontSize: '26px',
        color: branding.primaryColor,
        letterSpacing: '2px',
      },
      'TOMORROW',
    ),
    h('div', { display: 'flex', flexGrow: 1 }),
    h(
      'div',
      {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      },
      [
        h(
          'div',
          {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
            width: '380px',
          },
          [
            badge(
              data.homeTeamName,
              data.homeLogoDataUri,
              branding.primaryColor,
              160,
            ),
            h(
              'div',
              {
                display: 'flex',
                fontFamily: FONT.bodySemibold,
                fontSize: '34px',
                textAlign: 'center',
              },
              data.homeTeamName,
            ),
          ],
        ),
        h(
          'div',
          {
            display: 'flex',
            fontFamily: FONT.display,
            fontSize: '60px',
            color: FLOODLIGHT.inkDim,
          },
          'VS',
        ),
        h(
          'div',
          {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
            width: '380px',
          },
          [
            badge(
              data.awayTeamName,
              data.awayLogoDataUri,
              FLOODLIGHT.brand,
              160,
            ),
            h(
              'div',
              {
                display: 'flex',
                fontFamily: FONT.bodySemibold,
                fontSize: '34px',
                textAlign: 'center',
              },
              data.awayTeamName,
            ),
          ],
        ),
      ],
    ),
    data.recentForm.length > 0
      ? h(
          'div',
          {
            display: 'flex',
            flexDirection: 'row',
            gap: '12px',
            justifyContent: 'center',
          },
          data.recentForm.map((result) =>
            h(
              'div',
              {
                display: 'flex',
                width: '48px',
                height: '48px',
                borderRadius: '48px',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor:
                  result === 'W'
                    ? FLOODLIGHT.live
                    : result === 'L'
                      ? FLOODLIGHT.danger
                      : FLOODLIGHT.surfaceElevated,
                fontFamily: FONT.mono,
                fontSize: '22px',
                color: FLOODLIGHT.ink,
              },
              result,
            ),
          ),
        )
      : h('div', { display: 'flex' }),
    h('div', { display: 'flex', flexGrow: 1 }),
    h(
      'div',
      {
        display: 'flex',
        fontFamily: FONT.mono,
        fontSize: '28px',
        color: FLOODLIGHT.ink,
        justifyContent: 'center',
      },
      data.kickoffDateLabel,
    ),
    spacer(12),
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
    spacer(28),
    signatureMark(),
  ]);
}
