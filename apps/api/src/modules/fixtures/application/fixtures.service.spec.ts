import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FixturesService } from './fixtures.service';
import { FIXTURE_REPOSITORY } from '../domain/fixture.repository';
import type { FixtureRepository } from '../domain/fixture.repository';
import { TeamsService } from '../../teams/application/teams.service';
import { CompetitionsService } from '../../competitions/application/competitions.service';
import { PrismaService } from '../../../common/prisma/prisma.service';

describe('FixturesService', () => {
  let service: FixturesService;
  let repository: jest.Mocked<FixtureRepository>;
  let teamsService: jest.Mocked<TeamsService>;
  let competitionsService: jest.Mocked<CompetitionsService>;
  let prisma: { matchEvent: { count: jest.Mock } };

  beforeEach(async () => {
    prisma = { matchEvent: { count: jest.fn().mockResolvedValue(0) } };

    const moduleRef = await Test.createTestingModule({
      providers: [
        FixturesService,
        {
          provide: FIXTURE_REPOSITORY,
          useValue: {
            findMany: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        { provide: TeamsService, useValue: { exists: jest.fn() } },
        {
          provide: CompetitionsService,
          useValue: { exists: jest.fn(), isTeamEntered: jest.fn() },
        },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(FixturesService);
    repository = moduleRef.get(FIXTURE_REPOSITORY);
    teamsService = moduleRef.get(TeamsService);
    competitionsService = moduleRef.get(CompetitionsService);
  });

  const baseDto = {
    competitionId: 'comp-1',
    homeTeamId: 'team-1',
    awayTeamId: 'team-2',
    kickoffAt: '2026-08-01T15:00:00.000Z',
  };

  it('rejects a fixture where a team plays itself', async () => {
    await expect(
      service.create({ ...baseDto, awayTeamId: 'team-1' } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('rejects a fixture for a missing competition', async () => {
    competitionsService.exists.mockResolvedValue(false);

    await expect(service.create(baseDto as never)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('rejects a fixture when a team is not entered in the competition', async () => {
    competitionsService.exists.mockResolvedValue(true);
    teamsService.exists.mockResolvedValue(true);
    competitionsService.isTeamEntered.mockResolvedValue(false);

    await expect(service.create(baseDto as never)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('creates a fixture when both teams are entered in the competition', async () => {
    competitionsService.exists.mockResolvedValue(true);
    teamsService.exists.mockResolvedValue(true);
    competitionsService.isTeamEntered.mockResolvedValue(true);
    repository.create.mockResolvedValue({
      toPublic: () => ({ id: 'fixture-1' }),
    } as never);

    await service.create(baseDto as never);

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        competitionId: 'comp-1',
        homeTeamId: 'team-1',
        awayTeamId: 'team-2',
      }),
    );
  });

  it('throws NotFoundException when updating a fixture that does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.update('missing', {} as never)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repository.update).not.toHaveBeenCalled();
  });

  describe('remove', () => {
    it('throws NotFoundException for a fixture that does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('deletes a fixture with no recorded events', async () => {
      repository.findById.mockResolvedValue({ id: 'fixture-1' } as never);
      prisma.matchEvent.count.mockResolvedValue(0);

      await service.remove('fixture-1');

      expect(repository.delete).toHaveBeenCalledWith('fixture-1');
    });

    it('refuses to delete a fixture that has recorded events, with a clear error rather than a raw FK violation', async () => {
      repository.findById.mockResolvedValue({ id: 'fixture-1' } as never);
      prisma.matchEvent.count.mockResolvedValue(3);

      await expect(service.remove('fixture-1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(repository.delete).not.toHaveBeenCalled();
    });
  });

  describe('recordAttendance', () => {
    it('rejects a negative attendance figure', async () => {
      await expect(
        service.recordAttendance('fixture-1', -5),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for a fixture that does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.recordAttendance('missing', 200),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('records the attendance figure for an existing fixture', async () => {
      repository.findById.mockResolvedValue({ id: 'fixture-1' } as never);
      repository.update.mockResolvedValue({
        toPublic: () => ({ id: 'fixture-1', attendanceCount: 250 }),
      } as never);

      const result = await service.recordAttendance('fixture-1', 250);

      expect(repository.update).toHaveBeenCalledWith('fixture-1', {
        attendanceCount: 250,
      });
      expect(result).toEqual({ id: 'fixture-1', attendanceCount: 250 });
    });
  });
});
