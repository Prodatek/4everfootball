import { join } from 'node:path';
import { createRequire } from 'node:module';
import { Injectable } from '@nestjs/common';
import type PDFDocumentType from 'pdfkit';
import { PdfBuilder } from './pdf-builder';

// pdfkit is a classic CJS export (`module.exports = PDFDocument`, no
// `.default`) and this tsconfig doesn't set esModuleInterop, so the ES
// `import X from 'pdfkit'` syntax resolves to `undefined` at runtime even
// though it type-checks. `createRequire` gets an interop-safe CJS loader
// without the bare `require()`/`import = require()` forms
// @typescript-eslint/no-require-imports (rightly) forbids everywhere else
// in this codebase.
const loadCjsModule = createRequire(__filename);
const PDFDocument: typeof PDFDocumentType = loadCjsModule('pdfkit');

// Same Floodlight display/body fonts as the media engine (Phase 3),
// referenced from the graphics module's assets rather than duplicating
// them. The mono face is the one exception: fontkit (pdfkit's font
// parser) throws on the IBM Plex Mono TTF ("Offset is outside the bounds
// of the DataView") even though Satori's own parser handles the same file
// fine — a real fontkit/font incompatibility, confirmed by testing every
// IBM Plex Mono weight. Space Mono substitutes: it's not a random swap,
// it's the mono face apps/mobile's "Fourth Official" (scout-tool) brand
// identity already uses (see apps/mobile/src/theme/fonts.ts) — the same
// platform, a different one of its two existing identities.
const GRAPHICS_FONTS_DIR = join(__dirname, '../graphics/assets/fonts');
const PDF_FONTS_DIR = join(__dirname, 'assets/fonts');

@Injectable()
export class PdfRendererService {
  /**
   * Builds a PDF via the given callback and returns the finished bytes.
   * pdfkit streams rather than returning a buffer directly, so this
   * collects chunks and resolves once the document's `end` event fires.
   */
  async render(build: (builder: PdfBuilder) => void): Promise<Buffer> {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
    });

    doc.registerFont(
      'display',
      join(GRAPHICS_FONTS_DIR, 'BigShouldersDisplay-900Black.ttf'),
    );
    doc.registerFont(
      'body',
      join(GRAPHICS_FONTS_DIR, 'IBMPlexSans-400Regular.ttf'),
    );
    doc.registerFont(
      'bodySemibold',
      join(GRAPHICS_FONTS_DIR, 'IBMPlexSans-600SemiBold.ttf'),
    );
    doc.registerFont('mono', join(PDF_FONTS_DIR, 'SpaceMono-700Bold.ttf'));

    const chunks: Buffer[] = [];
    const finished = new Promise<Buffer>((resolve, reject) => {
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    build(new PdfBuilder(doc));
    doc.end();

    return finished;
  }
}
