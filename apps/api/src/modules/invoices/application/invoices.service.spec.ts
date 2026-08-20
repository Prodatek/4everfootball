import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { S3StorageService } from '../../media/infrastructure/s3-storage.service';
import { PdfRendererService } from '../../pdf/pdf-renderer.service';

function fakePrisma() {
  return {
    invoice: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };
}

describe('InvoicesService', () => {
  let service: InvoicesService;
  let prisma: ReturnType<typeof fakePrisma>;

  beforeEach(async () => {
    prisma = fakePrisma();
    prisma.$queryRaw.mockResolvedValue([{ nextval: BigInt(7) }]);

    const moduleRef = await Test.createTestingModule({
      providers: [
        InvoicesService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('4EV') },
        },
        { provide: PdfRendererService, useValue: { render: jest.fn() } },
        {
          provide: S3StorageService,
          useValue: { putObject: jest.fn(), publicUrlFor: jest.fn() },
        },
      ],
    }).compile();

    service = moduleRef.get(InvoicesService);
  });

  describe('create', () => {
    it('derives every money total server-side from quantity * unitKobo, never a client total', async () => {
      prisma.invoice.create.mockImplementation(
        ({ data }: { data: Record<string, unknown> }) => ({
          ...data,
          id: 'inv-1',
        }),
      );

      const invoice = await service.create({
        organisationId: 'org-1',
        lines: [
          { description: 'Licence fee', quantity: 1, unitKobo: 200_000 },
          { description: 'Onboarding', quantity: 2, unitKobo: 50_000 },
        ],
      } as never);

      expect(invoice.subtotalKobo).toBe(300_000);
      expect(invoice.totalKobo).toBe(300_000);
    });

    it('applies an optional discount before computing the total', async () => {
      prisma.invoice.create.mockImplementation(
        ({ data }: { data: Record<string, unknown> }) => ({
          ...data,
          id: 'inv-1',
        }),
      );

      const invoice = await service.create({
        organisationId: 'org-1',
        lines: [{ description: 'Licence fee', quantity: 1, unitKobo: 200_000 }],
        discountKobo: 20_000,
      } as never);

      expect(invoice.totalKobo).toBe(180_000);
    });

    it('rejects a discount larger than the subtotal', async () => {
      await expect(
        service.create({
          organisationId: 'org-1',
          lines: [
            { description: 'Licence fee', quantity: 1, unitKobo: 100_000 },
          ],
          discountKobo: 200_000,
        } as never),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.invoice.create).not.toHaveBeenCalled();
    });

    it('splits the total into a 50/50 deposit and balance by default', async () => {
      prisma.invoice.create.mockImplementation(
        ({ data }: { data: Record<string, unknown> }) => ({
          ...data,
          id: 'inv-1',
        }),
      );

      const invoice = await service.create({
        organisationId: 'org-1',
        lines: [{ description: 'Licence fee', quantity: 1, unitKobo: 100_001 }],
      } as never);

      expect(invoice.depositKobo + invoice.balanceKobo).toBe(invoice.totalKobo);
      expect(invoice.depositKobo).toBe(50_001);
      expect(invoice.balanceKobo).toBe(50_000);
    });

    it('formats the quote number from the configured prefix, current year, and sequence value', async () => {
      prisma.invoice.create.mockImplementation(
        ({ data }: { data: Record<string, unknown> }) => ({
          ...data,
          id: 'inv-1',
        }),
      );

      const invoice = await service.create({
        organisationId: 'org-1',
        lines: [{ description: 'Licence fee', quantity: 1, unitKobo: 100_000 }],
      } as never);

      expect(invoice.quoteNumber).toBe(`4EV-${new Date().getFullYear()}-0007`);
    });
  });

  describe('issue', () => {
    it('moves a DRAFT invoice to SENT and stamps issuedAt', async () => {
      prisma.invoice.findUnique.mockResolvedValue({
        id: 'inv-1',
        status: 'DRAFT',
      });
      prisma.invoice.update.mockResolvedValue({ id: 'inv-1', status: 'SENT' });

      await service.issue('inv-1');

      expect(prisma.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'SENT' }),
        }),
      );
    });

    it('rejects issuing a non-DRAFT invoice', async () => {
      prisma.invoice.findUnique.mockResolvedValue({
        id: 'inv-1',
        status: 'SENT',
      });

      await expect(service.issue('inv-1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('throws NotFoundException for a missing invoice', async () => {
      prisma.invoice.findUnique.mockResolvedValue(null);

      await expect(service.issue('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('cancel', () => {
    it('rejects cancelling a fully paid invoice', async () => {
      prisma.invoice.findUnique.mockResolvedValue({
        id: 'inv-1',
        status: 'PAID',
      });

      await expect(service.cancel('inv-1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('cancels a SENT invoice', async () => {
      prisma.invoice.findUnique.mockResolvedValue({
        id: 'inv-1',
        status: 'SENT',
      });
      prisma.invoice.update.mockResolvedValue({
        id: 'inv-1',
        status: 'CANCELLED',
      });

      await service.cancel('inv-1');

      expect(prisma.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'CANCELLED' } }),
      );
    });
  });

  describe('recordPayment', () => {
    it('moves to PART_PAID when a payment covers less than the outstanding balance', async () => {
      prisma.invoice.findUnique.mockResolvedValue({
        id: 'inv-1',
        status: 'SENT',
        totalKobo: 100_000,
        balanceKobo: 100_000,
        paidAt: null,
      });
      prisma.invoice.update.mockResolvedValue({});

      await service.recordPayment('inv-1', 50_000);

      expect(prisma.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            balanceKobo: 50_000,
            status: 'PART_PAID',
          }),
        }),
      );
    });

    it('moves to PAID and stamps paidAt once the balance reaches zero across multiple payments', async () => {
      prisma.invoice.findUnique.mockResolvedValue({
        id: 'inv-1',
        status: 'PART_PAID',
        totalKobo: 100_000,
        balanceKobo: 50_000,
        paidAt: null,
      });
      prisma.invoice.update.mockResolvedValue({});

      await service.recordPayment('inv-1', 50_000);

      expect(prisma.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            balanceKobo: 0,
            status: 'PAID',
            paidAt: expect.any(Date),
          }),
        }),
      );
    });

    it('rejects recording a payment against an already-PAID invoice', async () => {
      prisma.invoice.findUnique.mockResolvedValue({
        id: 'inv-1',
        status: 'PAID',
        totalKobo: 100_000,
        balanceKobo: 0,
      });

      await expect(
        service.recordPayment('inv-1', 10_000),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects recording a payment against a CANCELLED invoice', async () => {
      prisma.invoice.findUnique.mockResolvedValue({
        id: 'inv-1',
        status: 'CANCELLED',
        totalKobo: 100_000,
        balanceKobo: 100_000,
      });

      await expect(
        service.recordPayment('inv-1', 10_000),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
