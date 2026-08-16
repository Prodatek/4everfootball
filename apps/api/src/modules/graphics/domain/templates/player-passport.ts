import { h, type SatoriNode } from './hyperscript';
import { FLOODLIGHT, FONT, type ResolvedBranding } from './brand';
import { page, badge, signatureMark, spacer } from './layout';
import type { Dimensions } from '../dimensions';
import type { PlayerPassportData } from './types';

// Ungated (brief §4: "it is the acquisition loop") — every registered
// player gets one regardless of their club's Media Pack status. Sized as
// STORY (1080x1920) for one-tap WhatsApp status sharing.
export function playerPassportTemplate(
  data: PlayerPassportData,
  branding: ResolvedBranding,
  size: Dimensions,
): SatoriNode {
  const facts = [
    data.position,
    data.shirtNumber !== null ? `#${data.shirtNumber}` : null,
    data.nationality,
    data.ageLabel,
  ].filter((value): value is string => Boolean(value));

  return page(branding, size, [
    h(
      'div',
      {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      },
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
          'PLAYER PASSPORT',
        ),
        h(
          'div',
          {
            display: 'flex',
            fontFamily: FONT.mono,
            fontSize: '22px',
            color: FLOODLIGHT.inkDim,
          },
          'VERIFIED',
        ),
      ],
    ),
    h('div', { display: 'flex', flexGrow: 1 }),
    h(
      'div',
      { display: 'flex', flexDirection: 'column', alignItems: 'center' },
      [
        badge(data.playerName, data.photoDataUri, branding.primaryColor, 360),
        spacer(40),
        h(
          'div',
          {
            display: 'flex',
            fontFamily: FONT.display,
            fontSize: '80px',
            color: FLOODLIGHT.ink,
            textAlign: 'center',
          },
          data.playerName,
        ),
        spacer(12),
        data.teamName
          ? h(
              'div',
              {
                display: 'flex',
                fontFamily: FONT.bodySemibold,
                fontSize: '34px',
                color: FLOODLIGHT.inkDim,
              },
              data.teamName,
            )
          : h('div', { display: 'flex' }),
        spacer(28),
        h(
          'div',
          {
            display: 'flex',
            flexDirection: 'row',
            gap: '16px',
            flexWrap: 'wrap',
            justifyContent: 'center',
          },
          facts.map((fact) =>
            h(
              'div',
              {
                display: 'flex',
                backgroundColor: FLOODLIGHT.surface,
                borderRadius: '999px',
                padding: '12px 28px',
                fontFamily: FONT.mono,
                fontSize: '24px',
                color: FLOODLIGHT.ink,
              },
              fact,
            ),
          ),
        ),
      ],
    ),
    h('div', { display: 'flex', flexGrow: 1 }),
    data.competitionName
      ? h(
          'div',
          {
            display: 'flex',
            fontFamily: FONT.body,
            fontSize: '24px',
            color: FLOODLIGHT.inkDim,
            justifyContent: 'center',
          },
          data.competitionName,
        )
      : h('div', { display: 'flex' }),
    spacer(28),
    signatureMark(),
  ]);
}
