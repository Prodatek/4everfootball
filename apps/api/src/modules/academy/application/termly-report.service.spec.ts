import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TermlyReportService } from './termly-report.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { S3StorageService } from '../../media/infrastructure/s3-storage.service';
import { PdfRendererService } from '../../pdf/pdf-renderer.service';
import { AcademyAttendanceService } from './academy-attendance.service';

function fakePrisma() {
  return {
    player: { findUnique: jest.fn() },
    matchEvent: { count: jest.fn().mockResolvedValue(0) },
  };
}

const FAKE_PLAYER = {
  id: 'player-1',
  firstName: 'Ada',
  lastName: 'Okoro',
  team: {
    name: 'U12 Eagles',
    ageGroupId: 'ag-1',
    organisation: { name: 'Ikorodu Academy' },
  },
};

describe('TermlyReportService', () => {
  let service: TermlyReportService;
  let prisma: ReturnType<typeof fakePrisma>;
  let attendanceService: jest.Mocked<AcademyAttendanceService>;
  let s3: jest.Mocked<S3StorageService>;

  beforeEach(async () => {
    prisma = fakePrisma();
    const moduleRef = await Test.createTestingModule({
      providers: [
        TermlyReportService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: AcademyAttendanceService,
          useValue: {
            attendanceRateForPlayer: jest
              .fn()
              .mockResolvedValue({ present: 8, total: 10 }),
          },
        },
        {
          provide: PdfRendererService,
          useValue: { render: jest.fn().mockResolvedValue(Buffer.from('pdf')) },
        },
        {
          provide: S3StorageService,
          useValue: { putObject: jest.fn(), publicUrlFor: jest.fn() },
        },
      ],
    }).compile();

    service = moduleRef.get(TermlyReportService);
    attendanceService = moduleRef.get(AcademyAttendanceService);
    s3 = moduleRef.get(S3StorageService);
  });

  describe('generateDataset', () => {
    it('throws NotFoundException for a missing player', async () => {
      prisma.player.findUnique.mockResolvedValue(null);

      await expect(
        service.generateDataset('missing', 'ag-1', new Date(), new Date()),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("throws NotFoundException when the player isn't in the given age group", async () => {
      prisma.player.findUnique.mockResolvedValue({
        ...FAKE_PLAYER,
        team: { ...FAKE_PLAYER.team, ageGroupId: 'other-ag' },
      });

      await expect(
        service.generateDataset('player-1', 'ag-1', new Date(), new Date()),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('computes attendance rate as a rounded percentage', async () => {
      prisma.player.findUnique.mockResolvedValue(FAKE_PLAYER);

      const dataset = await service.generateDataset(
        'player-1',
        'ag-1',
        new Date('2026-01-01'),
        new Date('2026-04-01'),
      );

      expect(dataset.attendance).toEqual({
        present: 8,
        total: 10,
        ratePercent: 80,
      });
    });

    it('reports zero percent rather than dividing by zero when there are no sessions yet', async () => {
      prisma.player.findUnique.mockResolvedValue(FAKE_PLAYER);
      attendanceService.attendanceRateForPlayer.mockResolvedValue({
        present: 0,
        total: 0,
      });

      const dataset = await service.generateDataset(
        'player-1',
        'ag-1',
        new Date('2026-01-01'),
        new Date('2026-04-01'),
      );

      expect(dataset.attendance.ratePercent).toBe(0);
    });

    it('includes goals and assists scored within the date range', async () => {
      prisma.player.findUnique.mockResolvedValue(FAKE_PLAYER);
      prisma.matchEvent.count.mockResolvedValueOnce(3).mockResolvedValueOnce(2);

      const dataset = await service.generateDataset(
        'player-1',
        'ag-1',
        new Date('2026-01-01'),
        new Date('2026-04-01'),
      );

      expect(dataset.goals).toBe(3);
      expect(dataset.assists).toBe(2);
    });
  });

  describe('generateAndUploadPdf', () => {
    it('uploads the PDF and returns the dataset plus a public URL', async () => {
      prisma.player.findUnique.mockResolvedValue(FAKE_PLAYER);
      s3.publicUrlFor.mockReturnValue(
        'https://cdn.example.com/termly-reports/player-1/x.pdf',
      );

      const result = await service.generateAndUploadPdf(
        'player-1',
        'ag-1',
        new Date('2026-01-01'),
        new Date('2026-04-01'),
      );

      expect(s3.putObject).toHaveBeenCalledWith(
        expect.stringMatching(/^termly-reports\/player-1\//),
        expect.any(Buffer),
        'application/pdf',
      );
      expect(result.url).toBe(
        'https://cdn.example.com/termly-reports/player-1/x.pdf',
      );
      expect(result.dataset.playerName).toBe('Ada Okoro');
    });
  });
});
