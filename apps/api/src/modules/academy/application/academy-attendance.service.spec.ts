import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AcademyAttendanceService } from './academy-attendance.service';
import { PrismaService } from '../../../common/prisma/prisma.service';

function fakePrisma() {
  return {
    academyAttendance: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    academyAgeGroup: { findUnique: jest.fn() },
  };
}

const BASE_PARAMS = {
  organisationId: 'org-1',
  ageGroupId: 'ag-1',
  playerId: 'player-1',
  date: new Date('2026-08-16'),
  status: 'PRESENT' as const,
  recordedById: 'coach-1',
  clientEventId: 'client-event-1',
};

describe('AcademyAttendanceService', () => {
  let service: AcademyAttendanceService;
  let prisma: ReturnType<typeof fakePrisma>;

  beforeEach(async () => {
    prisma = fakePrisma();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AcademyAttendanceService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(AcademyAttendanceService);
  });

  describe('record', () => {
    it('returns the existing row without re-creating when clientEventId was already recorded (offline retry)', async () => {
      const existing = { id: 'att-1', clientEventId: 'client-event-1' };
      prisma.academyAttendance.findUnique.mockResolvedValue(existing);

      const result = await service.record(BASE_PARAMS);

      expect(result).toBe(existing);
      expect(prisma.academyAttendance.create).not.toHaveBeenCalled();
    });

    it('rejects an age group that does not belong to this organisation', async () => {
      prisma.academyAttendance.findUnique.mockResolvedValue(null);
      prisma.academyAgeGroup.findUnique.mockResolvedValue({
        id: 'ag-1',
        organisationId: 'other-org',
      });

      await expect(service.record(BASE_PARAMS)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.academyAttendance.create).not.toHaveBeenCalled();
    });

    it('creates a new attendance row for a fresh clientEventId', async () => {
      prisma.academyAttendance.findUnique.mockResolvedValue(null);
      prisma.academyAgeGroup.findUnique.mockResolvedValue({
        id: 'ag-1',
        organisationId: 'org-1',
      });
      prisma.academyAttendance.create.mockResolvedValue({ id: 'att-1' });

      const result = await service.record(BASE_PARAMS);

      expect(prisma.academyAttendance.create).toHaveBeenCalledWith({
        data: BASE_PARAMS,
      });
      expect(result).toEqual({ id: 'att-1' });
    });
  });

  describe('attendanceRateForPlayer', () => {
    it('counts PRESENT and LATE as attended, ABSENT/EXCUSED as not', async () => {
      prisma.academyAttendance.findMany.mockResolvedValue([
        { status: 'PRESENT' },
        { status: 'LATE' },
        { status: 'ABSENT' },
        { status: 'EXCUSED' },
      ]);

      const result = await service.attendanceRateForPlayer(
        'player-1',
        new Date('2026-01-01'),
        new Date('2026-12-31'),
      );

      expect(result).toEqual({ present: 2, total: 4 });
    });
  });
});
