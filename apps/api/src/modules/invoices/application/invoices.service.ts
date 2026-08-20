import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { formatNaira } from '@4ef/shared';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { S3StorageService } from '../../media/infrastructure/s3-storage.service';
import { PdfRendererService } from '../../pdf/pdf-renderer.service';
import { formatQuoteNumber } from '../domain/quote-number';
import type { CreateInvoiceDto } from './dto/create-invoice.dto';

const VALIDITY_DAYS = 14;
// Brief §3.7 default schedule: 50% on signature, 50% before first matchday.
const DEPOSIT_FRACTION = 0.5;

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly pdfRenderer: PdfRendererService,
    private readonly s3: S3StorageService,
  ) {}

  async create(dto: CreateInvoiceDto) {
    const lines = dto.lines.map((line) => ({
      description: line.description,
      basis: line.basis ?? null,
      quantity: line.quantity,
      unitKobo: line.unitKobo,
      amountKobo: line.quantity * line.unitKobo,
    }));

    const subtotalKobo = lines.reduce((sum, line) => sum + line.amountKobo, 0);
    const discountKobo = dto.discountKobo ?? 0;

    if (discountKobo > subtotalKobo) {
      throw new BadRequestException('discountKobo cannot exceed the subtotal');
    }

    const totalKobo = subtotalKobo - discountKobo;
    const depositKobo = Math.round(totalKobo * DEPOSIT_FRACTION);
    const balanceKobo = totalKobo - depositKobo;
    const quoteNumber = await this.nextQuoteNumber();

    return this.prisma.invoice.create({
      data: {
        organisationId: dto.organisationId,
        quoteNumber,
        subtotalKobo,
        discountKobo,
        totalKobo,
        depositKobo,
        balanceKobo,
        validUntil: addDays(new Date(), VALIDITY_DAYS),
        lines: { create: lines },
      },
      include: { lines: true },
    });
  }

  async getById(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { lines: true },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  async listForOrganisation(organisationId: string) {
    return this.prisma.invoice.findMany({
      where: { organisationId },
      orderBy: { createdAt: 'desc' },
      include: { lines: true },
    });
  }

  async issue(id: string) {
    const invoice = await this.getById(id);

    if (invoice.status !== 'DRAFT') {
      throw new BadRequestException('Only a DRAFT invoice can be issued');
    }

    return this.prisma.invoice.update({
      where: { id },
      data: { status: 'SENT', issuedAt: new Date() },
    });
  }

  async cancel(id: string) {
    const invoice = await this.getById(id);

    if (invoice.status === 'PAID') {
      throw new BadRequestException('A fully paid invoice cannot be cancelled');
    }

    return this.prisma.invoice.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  /**
   * Records a milestone payment against the invoice — e.g. the deposit
   * confirmed by bank transfer, then the balance before first matchday.
   * Amount-driven rather than milestone-name-driven: an organiser can pay
   * in whatever chunks actually arrive, and this is what moves the invoice
   * through PART_PAID to PAID regardless of how many payments that takes.
   */
  async recordPayment(id: string, amountKobo: number) {
    const invoice = await this.getById(id);

    if (invoice.status === 'CANCELLED' || invoice.status === 'EXPIRED') {
      throw new BadRequestException(
        `Cannot record a payment against a ${invoice.status} invoice`,
      );
    }

    if (invoice.status === 'PAID') {
      throw new BadRequestException('This invoice is already fully paid');
    }

    const currentBalanceKobo = invoice.balanceKobo ?? invoice.totalKobo;
    const newBalanceKobo = Math.max(0, currentBalanceKobo - amountKobo);
    const status = newBalanceKobo === 0 ? 'PAID' : 'PART_PAID';

    return this.prisma.invoice.update({
      where: { id },
      data: {
        balanceKobo: newBalanceKobo,
        status,
        paidAt: status === 'PAID' ? new Date() : invoice.paidAt,
      },
    });
  }

  // §5 D1: "downloadable PDFs." Same render-then-upload-to-S3 shape as
  // ImpactReportService/TermlyReportService — a POST returns a URL, the
  // browser just links to it, no StreamableFile plumbing needed.
  async generateAndUploadPdf(id: string): Promise<{ url: string }> {
    const invoice = await this.getById(id);
    const organisation = await this.prisma.organisation.findUniqueOrThrow({
      where: { id: invoice.organisationId },
      select: { name: true },
    });

    const pdf = await this.pdfRenderer.render((doc) => {
      doc.header(
        organisation.name,
        `Invoice ${invoice.quoteNumber} — ${invoice.status}`,
      );

      doc.sectionTitle('Summary');
      doc.statGrid([
        { label: 'Subtotal', value: formatNaira(invoice.subtotalKobo) },
        { label: 'Discount', value: formatNaira(invoice.discountKobo) },
        { label: 'Total', value: formatNaira(invoice.totalKobo) },
        {
          label: 'Balance due',
          value: formatNaira(invoice.balanceKobo ?? invoice.totalKobo),
        },
        {
          label: 'Valid until',
          value: invoice.validUntil.toLocaleDateString('en-NG', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }),
        },
        {
          label: 'Issued',
          value: invoice.issuedAt
            ? invoice.issuedAt.toLocaleDateString('en-NG', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })
            : 'Not yet issued',
        },
      ]);

      doc.sectionTitle('Line items');
      doc.table(
        ['Description', 'Basis', 'Qty', 'Unit', 'Amount'],
        invoice.lines.map((line) => [
          line.description,
          line.basis ?? '—',
          String(line.quantity),
          formatNaira(line.unitKobo),
          formatNaira(line.amountKobo),
        ]),
      );

      doc.signatureFooter();
    });

    const key = `invoices/${invoice.id}/${Date.now()}.pdf`;
    await this.s3.putObject(key, pdf, 'application/pdf');

    return { url: this.s3.publicUrlFor(key) };
  }

  private async nextQuoteNumber(): Promise<string> {
    const prefix = this.config.get<string>('INVOICE_PREFIX') ?? '4EV';
    const year = new Date().getFullYear();
    const rows = await this.prisma.$queryRaw<
      { nextval: bigint }[]
    >`SELECT nextval('invoice_quote_seq') AS nextval`;

    return formatQuoteNumber(prefix, year, Number(rows[0].nextval));
  }
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
