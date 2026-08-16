import { h, type SatoriNode } from './hyperscript';
import { FLOODLIGHT, FONT, type ResolvedBranding } from './brand';
import { page, headerBar, badge, signatureMark, spacer } from './layout';
import type { Dimensions } from '../dimensions';
import type { FullTimeResultData } from './types';

export function fullTimeResultTemplate(
  data: FullTimeResultData,
  branding: ResolvedBranding,
  size: Dimensions,
): SatoriNode {
  return page(branding, size, [
    headerBar(branding, size.width),
    spacer(48),
    h(
      'div',
      {
        display: 'flex',
        fontFamily: FONT.mono,
        fontSize: '28px',
        color: FLOODLIGHT.live,
      },
      'FULL TIME',
    ),
    spacer(32),
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
            gap: '16px',
            width: '280px',
          },
          [
            badge(
              data.homeTeamName,
              data.homeLogoDataUri,
              branding.primaryColor,
              120,
            ),
            h(
              'div',
              {
                display: 'flex',
                fontFamily: FONT.bodySemibold,
                fontSize: '30px',
                textAlign: 'center',
                whiteSpace: 'nowrap',
              },
              data.homeTeamName,
            ),
          ],
        ),
        h(
          'div',
          {
            display: 'flex',
            flexDirection: 'row',
            fontFamily: FONT.display,
            fontSize: '96px',
            color: FLOODLIGHT.ink,
            whiteSpace: 'nowrap',
          },
          `${data.homeScore}–${data.awayScore}`,
        ),
        h(
          'div',
          {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            width: '280px',
          },
          [
            badge(
              data.awayTeamName,
              data.awayLogoDataUri,
              branding.secondaryColor === branding.primaryColor
                ? FLOODLIGHT.brand
                : branding.primaryColor,
              120,
            ),
            h(
              'div',
              {
                display: 'flex',
                fontFamily: FONT.bodySemibold,
                fontSize: '30px',
                textAlign: 'center',
                whiteSpace: 'nowrap',
              },
              data.awayTeamName,
            ),
          ],
        ),
      ],
    ),
    spacer(40),
    h(
      'div',
      {
        display: 'flex',
        fontFamily: FONT.body,
        fontSize: '26px',
        color: FLOODLIGHT.inkDim,
        justifyContent: 'center',
      },
      [data.competitionName, data.venueName].filter(Boolean).join(' · '),
    ),
    h('div', { display: 'flex', flexGrow: 1 }),
    signatureMark(),
  ]);
}
