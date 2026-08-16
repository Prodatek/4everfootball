import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Injectable } from '@nestjs/common';
import satori from 'satori';
import type { Font } from 'satori';
import { Resvg } from '@resvg/resvg-js';
import type { GraphicFormat, GraphicTemplate } from '@prisma/client';
import { FONT } from '../domain/templates/brand';
import { renderTemplate, type CompetitionBranding } from '../domain/templates';
import { FORMAT_DIMENSIONS } from '../domain/dimensions';

const FONTS_DIR = join(__dirname, '../assets/fonts');

@Injectable()
export class SatoriRendererService {
  private fontsPromise: Promise<Font[]> | null = null;

  /**
   * Satori has no built-in font — every render needs the actual TTF bytes.
   * Loaded once and cached rather than re-read from disk per render; these
   * are the exact faces apps/mobile's Floodlight theme already uses (see
   * domain/templates/brand.ts), copied in as static assets so this module
   * has no runtime dependency on another app's node_modules layout.
   */
  private loadFonts(): Promise<Font[]> {
    if (!this.fontsPromise) {
      this.fontsPromise = Promise.all([
        readFile(join(FONTS_DIR, 'BigShouldersDisplay-900Black.ttf')),
        readFile(join(FONTS_DIR, 'IBMPlexSans-400Regular.ttf')),
        readFile(join(FONTS_DIR, 'IBMPlexSans-600SemiBold.ttf')),
        readFile(join(FONTS_DIR, 'IBMPlexMono-600SemiBold.ttf')),
      ]).then(([display, body, bodySemibold, mono]) => [
        { name: FONT.display, data: display, weight: 900, style: 'normal' },
        { name: FONT.body, data: body, weight: 400, style: 'normal' },
        {
          name: FONT.bodySemibold,
          data: bodySemibold,
          weight: 600,
          style: 'normal',
        },
        { name: FONT.mono, data: mono, weight: 600, style: 'normal' },
      ]);
    }

    return this.fontsPromise;
  }

  /**
   * Pure function of its inputs — no DB access. `data` is expected to
   * already be prepared (image URLs resolved to data URIs by
   * ImageEmbedService.prepare(), see GraphicsWorkerService) — this
   * function itself does no network I/O, only font loading (cached after
   * the first call) and CPU-bound SVG/PNG rendering.
   */
  async render(
    template: GraphicTemplate,
    format: GraphicFormat,
    data: unknown,
    competition: CompetitionBranding | null,
  ): Promise<Buffer> {
    const size = FORMAT_DIMENSIONS[format];
    const node = renderTemplate(template, data, competition, size);
    const fonts = await this.loadFonts();

    // satori's published types demand a React `ReactNode`, but its runtime
    // only cares about the plain { type, props: { style, children } }
    // shape — see domain/templates/hyperscript.ts. Casting rather than
    // adding a real React dependency to a NestJS service for ten templates.
    const svg = await satori(node as never, {
      width: size.width,
      height: size.height,
      fonts,
    });

    return new Resvg(svg).render().asPng();
  }
}
