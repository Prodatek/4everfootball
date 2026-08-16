import { h, type SatoriChild, type SatoriNode } from './hyperscript';
import { FLOODLIGHT, FONT, type ResolvedBranding } from './brand';

/** Outer page: branded background, column layout, consistent padding. */
export function page(
  branding: ResolvedBranding,
  size: { width: number; height: number },
  children: SatoriChild,
): SatoriNode {
  return h(
    'div',
    {
      display: 'flex',
      flexDirection: 'column',
      width: `${size.width}px`,
      height: `${size.height}px`,
      backgroundColor: branding.secondaryColor,
      color: FLOODLIGHT.ink,
      fontFamily: FONT.body,
      padding: '64px',
    },
    children,
  );
}

/** A logo/photo when a data URI was embedded at enqueue time, otherwise a
 * coloured initial badge — never a broken image, never a network fetch
 * during render (see GraphicsService's data-embedding step). */
export function badge(
  label: string,
  dataUri: string | null,
  color: string,
  diameter = 96,
): SatoriNode {
  if (dataUri) {
    return h(
      'img',
      {
        width: `${diameter}px`,
        height: `${diameter}px`,
        borderRadius: `${diameter}px`,
        objectFit: 'cover',
      },
      undefined,
      { src: dataUri },
    );
  }

  const initial = label.trim().charAt(0).toUpperCase() || '?';
  return h(
    'div',
    {
      display: 'flex',
      width: `${diameter}px`,
      height: `${diameter}px`,
      borderRadius: `${diameter}px`,
      backgroundColor: color,
      color: FLOODLIGHT.brandInk,
      fontFamily: FONT.display,
      fontSize: `${Math.round(diameter * 0.45)}px`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    initial,
  );
}

export function headerBar(
  branding: ResolvedBranding,
  width: number,
): SatoriNode {
  return h(
    'div',
    {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: '20px',
      width: `${width - 128}px`,
    },
    [
      badge(branding.name, branding.logoUrl, branding.primaryColor, 64),
      h(
        'div',
        {
          display: 'flex',
          fontFamily: FONT.bodySemibold,
          fontSize: '32px',
          color: FLOODLIGHT.ink,
        },
        branding.name,
      ),
    ],
  );
}

/** "A signature, not a banner" — brief §4. Small, mono, low-emphasis. */
export function signatureMark(): SatoriNode {
  return h(
    'div',
    {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'flex-end',
      fontFamily: FONT.mono,
      fontSize: '20px',
      color: FLOODLIGHT.inkDim,
      letterSpacing: '1px',
    },
    '4ever.buildspecs.io',
  );
}

export function spacer(height: number): SatoriNode {
  return h('div', { display: 'flex', height: `${height}px` });
}
