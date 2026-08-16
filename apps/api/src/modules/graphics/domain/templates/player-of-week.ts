import { h, type SatoriNode } from './hyperscript';
import { FLOODLIGHT, FONT, type ResolvedBranding } from './brand';
import { page, headerBar, badge, signatureMark, spacer } from './layout';
import type { Dimensions } from '../dimensions';
import type { PlayerOfWeekData } from './types';

export function playerOfWeekTemplate(
  data: PlayerOfWeekData,
  branding: ResolvedBranding,
  size: Dimensions,
): SatoriNode {
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
            fontFamily: FONT.mono,
            fontSize: '26px',
            color: branding.primaryColor,
            letterSpacing: '2px',
          },
          `PLAYER OF THE WEEK · ${data.weekLabel.toUpperCase()}`,
        ),
        spacer(32),
        badge(data.playerName, data.photoDataUri, branding.primaryColor, 260),
        spacer(32),
        h(
          'div',
          {
            display: 'flex',
            fontFamily: FONT.display,
            fontSize: '64px',
            color: FLOODLIGHT.ink,
          },
          data.playerName,
        ),
        spacer(8),
        h(
          'div',
          {
            display: 'flex',
            fontFamily: FONT.body,
            fontSize: '28px',
            color: FLOODLIGHT.inkDim,
          },
          data.teamName,
        ),
        spacer(28),
        h('div', { display: 'flex', flexDirection: 'row', gap: '48px' }, [
          h(
            'div',
            { display: 'flex', flexDirection: 'column', alignItems: 'center' },
            [
              h(
                'div',
                {
                  display: 'flex',
                  fontFamily: FONT.display,
                  fontSize: '44px',
                  color: branding.primaryColor,
                },
                String(data.goals),
              ),
              h(
                'div',
                {
                  display: 'flex',
                  fontFamily: FONT.mono,
                  fontSize: '18px',
                  color: FLOODLIGHT.inkDim,
                },
                'GOALS',
              ),
            ],
          ),
          h(
            'div',
            { display: 'flex', flexDirection: 'column', alignItems: 'center' },
            [
              h(
                'div',
                {
                  display: 'flex',
                  fontFamily: FONT.display,
                  fontSize: '44px',
                  color: branding.primaryColor,
                },
                String(data.assists),
              ),
              h(
                'div',
                {
                  display: 'flex',
                  fontFamily: FONT.mono,
                  fontSize: '18px',
                  color: FLOODLIGHT.inkDim,
                },
                'ASSISTS',
              ),
            ],
          ),
        ]),
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
