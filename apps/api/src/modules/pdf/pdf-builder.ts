// PDFKit.PDFDocument below is pdfkit's ambient type namespace (from
// @types/pdfkit) — no value import needed, only the type.

// Same brand palette as the media engine (Phase 3, domain/templates/brand.ts)
// — one visual identity across every generated artifact, not a second one
// invented for print.
export const PDF_COLOR = {
  ink: '#0d0812',
  inkDim: '#5b5468',
  brand: '#a238ff',
  line: '#e4dced',
  surface: '#f4eff9',
} as const;

const MARGIN = 50;

/**
 * Thin imperative wrapper over PDFDocument — pdfkit's own API already is a
 * builder, this just adds the handful of composite blocks (branded header,
 * stat grid, table, signature footer) every Phase 4 report reuses, so
 * ImpactReportService/TermlyReportService don't each hand-roll layout math.
 */
export class PdfBuilder {
  constructor(private readonly doc: PDFKit.PDFDocument) {}

  header(title: string, subtitle: string): this {
    this.doc
      .font('display')
      .fontSize(24)
      .fillColor(PDF_COLOR.ink)
      .text(title, { align: 'left' });
    this.doc
      .font('body')
      .fontSize(11)
      .fillColor(PDF_COLOR.inkDim)
      .text(subtitle);
    this.doc.moveDown(1);
    this.rule();
    this.doc.moveDown(1);
    return this;
  }

  sectionTitle(text: string): this {
    this.doc.moveDown(0.5);
    this.doc
      .font('bodySemibold')
      .fontSize(14)
      .fillColor(PDF_COLOR.brand)
      .text(text.toUpperCase());
    this.doc.moveDown(0.3);
    return this;
  }

  paragraph(text: string): this {
    this.doc.font('body').fontSize(10).fillColor(PDF_COLOR.ink).text(text);
    this.doc.moveDown(0.5);
    return this;
  }

  /**
   * A row of labeled numbers — teams registered, matches played, etc.
   * Every cell's (x, y) is computed purely from its row/column index, never
   * from the document's implicit text cursor — pdfkit advances that cursor
   * on every .text() call in ways that don't compose across a manual grid
   * (confirmed by an earlier version of this method visibly overlapping
   * columns and rows). `lineBreak: false` stops pdfkit from wrapping a
   * value/label onto a second line and disturbing the next cell.
   */
  statGrid(stats: Array<{ label: string; value: string }>): this {
    const columns = 3;
    const rowHeight = 44;
    const columnWidth = (this.doc.page.width - MARGIN * 2) / columns;
    const startX = this.doc.x;
    const startY = this.doc.y;

    stats.forEach((stat, i) => {
      const col = i % columns;
      const row = Math.floor(i / columns);
      const x = startX + col * columnWidth;
      const y = startY + row * rowHeight;

      this.doc
        .font('display')
        .fontSize(20)
        .fillColor(PDF_COLOR.ink)
        .text(stat.value, x, y, { width: columnWidth - 12, lineBreak: false });
      this.doc
        .font('mono')
        .fontSize(8)
        .fillColor(PDF_COLOR.inkDim)
        .text(stat.label.toUpperCase(), x, y + 24, {
          width: columnWidth - 12,
          lineBreak: false,
        });
    });

    const rowCount = Math.ceil(stats.length / columns);
    this.doc.x = startX;
    this.doc.y = startY + rowCount * rowHeight + 10;
    return this;
  }

  /**
   * Same fixed-position-per-cell approach as statGrid(), for the same
   * reason — a naive row-by-row cursor walk (including pdfkit's
   * `continued` text-flow option, which ignores explicit x on later
   * fragments) drifts across columns.
   */
  table(headers: string[], rows: string[][]): this {
    const columnWidth = (this.doc.page.width - MARGIN * 2) / headers.length;
    const rowHeight = 18;
    const startX = this.doc.x;
    const startY = this.doc.y;

    this.doc.font('bodySemibold').fontSize(9).fillColor(PDF_COLOR.inkDim);
    headers.forEach((h, i) => {
      this.doc.text(h.toUpperCase(), startX + i * columnWidth, startY, {
        width: columnWidth,
        lineBreak: false,
      });
    });

    const headerBottom = startY + rowHeight;
    this.doc
      .strokeColor(PDF_COLOR.line)
      .moveTo(MARGIN, headerBottom)
      .lineTo(this.doc.page.width - MARGIN, headerBottom)
      .stroke();

    this.doc.font('body').fontSize(9).fillColor(PDF_COLOR.ink);
    rows.forEach((row, r) => {
      const y = headerBottom + 6 + r * rowHeight;
      row.forEach((cell, c) => {
        this.doc.text(cell, startX + c * columnWidth, y, {
          width: columnWidth,
          lineBreak: false,
        });
      });
    });

    this.doc.x = startX;
    this.doc.y = headerBottom + 6 + rows.length * rowHeight + 10;
    return this;
  }

  rule(): this {
    this.doc
      .strokeColor(PDF_COLOR.line)
      .moveTo(MARGIN, this.doc.y)
      .lineTo(this.doc.page.width - MARGIN, this.doc.y)
      .stroke();
    return this;
  }

  signatureFooter(): this {
    this.doc.moveDown(2);
    this.rule();
    this.doc.moveDown(0.5);
    this.doc
      .font('mono')
      .fontSize(8)
      .fillColor(PDF_COLOR.inkDim)
      .text('4ever.buildspecs.io — generated from the verified record');
    return this;
  }

  newPage(): this {
    this.doc.addPage();
    return this;
  }
}
