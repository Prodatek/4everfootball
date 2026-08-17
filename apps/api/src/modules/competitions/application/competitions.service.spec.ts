import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CompetitionsService } from './competitions.service';
import { COMPETITION_REPOSITORY } from '../domain/competition.repository';
import type { CompetitionRepository } from '../domain/competition.repository';
import { TeamsService } from '../../teams/application/teams.service';
import { SearchService } from '../../search/application/search.service';
import { PrismaService } from '../../../common/prisma/prisma.service';

describe('CompetitionsService', () => {
  let service: CompetitionsService;
  let repository: jest.Mocked<CompetitionRepository>;
  let teamsService: jest.Mocked<TeamsService>;
  let prisma: { competition: { update: jest.Mock } };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        CompetitionsService,
        {
          provide: COMPETITION_REPOSITORY,
          useValue: {
            findMany: jest.fn(),
            findById: jest.fn(),
            findBySlug: jest.fn(),
            slugExists: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            listEntries: jest.fn(),
            entryExists: jest.fn(),
            addEntry: jest.fn(),
            removeEntry: jest.fn(),
          },
        },
        { provide: TeamsService, useValue: { exists: jest.fn() } },
        {
          provide: SearchService,
          useValue: {
            indexCompetition: jest.fn(),
            deleteCompetition: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            competition: {
              update: jest.fn().mockResolvedValue(undefined),
            },
          },
        },
      ],
    }).compile();

    service = moduleRef.get(CompetitionsService);
    prisma = moduleRef.get(PrismaService);
    repository = moduleRef.get(COMPETITION_REPOSITORY);
    teamsService = moduleRef.get(TeamsService);
  });

  it('generates a slug from name and season', async () => {
    repository.slugExists.mockResolvedValue(false);
    repository.create.mockResolvedValue({
      toPublic: () => ({ id: '1', slug: 'premier-league-2025-2026' }),
    } as never);

    await service.create({
      name: 'Premier League',
      season: '2025/2026',
      type: 'LEAGUE',
    } as never);

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'premier-league-2025-2026' }),
    );
  });

  it('throws NotFoundException when adding an entry to a missing competition', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(
      service.addEntry('missing-comp', 'team-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(teamsService.exists).not.toHaveBeenCalled();
    expect(repository.addEntry).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when adding an entry for a missing team', async () => {
    repository.findById.mockResolvedValue({ id: 'comp-1' } as never);
    teamsService.exists.mockResolvedValue(false);

    await expect(
      service.addEntry('comp-1', 'missing-team'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.addEntry).not.toHaveBeenCalled();
  });

  it('adds an entry when both the competition and team exist', async () => {
    repository.findById.mockResolvedValue({ id: 'comp-1' } as never);
    teamsService.exists.mockResolvedValue(true);
    repository.listEntries.mockResolvedValue([]);

    await service.addEntry('comp-1', 'team-1');

    expect(repository.addEntry).toHaveBeenCalledWith('comp-1', 'team-1');
  });

  describe('getBySlug', () => {
    it('increments the page view counter (fire-and-forget) on every fetch', async () => {
      repository.findBySlug.mockResolvedValue({
        toPublic: () => ({ id: 'comp-1', slug: 'lagos-cup' }),
      } as never);

      await service.getBySlug('lagos-cup');
      // Flush the fire-and-forget microtask.
      await Promise.resolve();

      expect(prisma.competition.update).toHaveBeenCalledWith({
        where: { slug: 'lagos-cup' },
        data: { pageViewCount: { increment: 1 } },
      });
    });

    it('throws NotFoundException for a missing slug without touching the counter', async () => {
      repository.findBySlug.mockResolvedValue(null);

      await expect(service.getBySlug('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.competition.update).not.toHaveBeenCalled();
    });
  });

  describe('update — slug uniqueness (Phase 4: custom sponsor-page slug)', () => {
    it('allows updating other fields without touching slug uniqueness when slug is unchanged', async () => {
      repository.findById.mockResolvedValue({
        toPublic: () => ({ id: 'comp-1', slug: 'lagos-cup' }),
      } as never);
      repository.update.mockResolvedValue({
        toPublic: () => ({ id: 'comp-1' }),
      } as never);

      await service.update('comp-1', {
        slug: 'lagos-cup',
        name: 'Lagos Cup',
      } as never);

      expect(repository.slugExists).not.toHaveBeenCalled();
      expect(repository.update).toHaveBeenCalled();
    });

    it('rejects a new slug that is already taken', async () => {
      repository.findById.mockResolvedValue({
        toPublic: () => ({ id: 'comp-1', slug: 'old-slug' }),
      } as never);
      repository.slugExists.mockResolvedValue(true);

      await expect(
        service.update('comp-1', { slug: 'taken-slug' } as never),
      ).rejects.toThrow('Slug "taken-slug" is already in use');
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('accepts a new, available slug', async () => {
      repository.findById.mockResolvedValue({
        toPublic: () => ({ id: 'comp-1', slug: 'old-slug' }),
      } as never);
      repository.slugExists.mockResolvedValue(false);
      repository.update.mockResolvedValue({
        toPublic: () => ({ id: 'comp-1', slug: 'new-slug' }),
      } as never);

      await service.update('comp-1', { slug: 'new-slug' } as never);

      expect(repository.update).toHaveBeenCalledWith(
        'comp-1',
        expect.objectContaining({ slug: 'new-slug' }),
      );
    });
  });
});
