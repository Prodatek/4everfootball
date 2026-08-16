import { h, type SatoriNode } from './hyperscript';
import { FLOODLIGHT, FONT, type ResolvedBranding } from './brand';
import { page, signatureMark, spacer } from './layout';
import type { Dimensions } from '../dimensions';
import type { MilestoneData } from './types';

export function milestoneTemplate(
  data: MilestoneData,
  branding: ResolvedBranding,
  size: Dimensions,
): SatoriNode {
  return page(branding, size, [
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
          'MILESTONE',
        ),
        spacer(32),
        h(
          'div',
          {
            display: 'flex',
            fontFamily: FONT.display,
            fontSize: '84px',
            color: FLOODLIGHT.ink,
            textAlign: 'center',
          },
          data.headline,
        ),
        spacer(20),
        h(
          'div',
          {
            display: 'flex',
            fontFamily: FONT.bodySemibold,
            fontSize: '32px',
            color: FLOODLIGHT.inkDim,
            textAlign: 'center',
          },
          data.subheadline,
        ),
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
      data.contextLabel,
    ),
    spacer(24),
    signatureMark(),
  ]);
}
