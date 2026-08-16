import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GraphicsService } from './graphics.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { MediaPacksService } from '../../media-packs/application/media-packs.service';

function fakePrisma() {
  return {
    competition: { findUnique: jest.fn() },
    graphic: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
  };
}

describe('GraphicsService', () => {
  let service: GraphicsService;
  let prisma: ReturnType<typeof fakePrisma>;
  let mediaPacks: jest.Mocked<MediaPacksService>;

  beforeEach(async () => {
    prisma = fakePrisma();
    const moduleRef = await Test.createTestingModule({
      providers: [
        GraphicsService,
        { provide: PrismaService, useValue: prisma },
        { provide: MediaPacksService, useValue: { hasEntitlement: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(GraphicsService);
    mediaPacks = moduleRef.get(MediaPacksService);
  });

  describe('enqueue — ungated template (PLAYER_PASSPORT)', () => {
    it('enqueues without checking entitlement or requiring a competitionId', async () => {
      prisma.graphic.findFirst.mockResolvedValue(null);
      prisma.graphic.create.mockResolvedValue({ id: 'g1' });

      const result = await service.enqueue({
        template: 'PLAYER_PASSPORT',
        subjectType: 'PLAYER',
        subjectId: 'player-1',
        data: { playerName: 'X' },
      });

      expect(mediaPacks.hasEntitlement).not.toHaveBeenCalled();
      expect(result).toEqual({ id: 'g1' });
    });
  });

  describe('enqueue — gated template (e.g. GOAL_ALERT)', () => {
    it('skips (returns null) when there is no competitionId to gate against', async () => {
      const result = await service.enqueue({
        template: 'GOAL_ALERT',
        subjectType: 'FIXTURE',
        subjectId: 'fix-1',
        data: {},
      });

      expect(result).toBeNull();
      expect(prisma.graphic.create).not.toHaveBeenCalled();
    });

    it('skips when the organisation has no MediaPackEntitlement', async () => {
      prisma.competition.findUnique.mockResolvedValue({
        organisationId: 'org-1',
      });
      mediaPacks.hasEntitlement.mockResolvedValue(false);

      const result = await service.enqueue({
        template: 'GOAL_ALERT',
        competitionId: 'comp-1',
        subjectType: 'FIXTURE',
        subjectId: 'fix-1',
        data: {},
      });

      expect(result).toBeNull();
      expect(prisma.graphic.create).not.toHaveBeenCalled();
    });

    it('enqueues when the organisation is entitled', async () => {
      prisma.competition.findUnique.mockResolvedValue({
        organisationId: 'org-1',
      });
      mediaPacks.hasEntitlement.mockResolvedValue(true);
      prisma.graphic.findFirst.mockResolvedValue(null);
      prisma.graphic.create.mockResolvedValue({ id: 'g1' });

      const result = await service.enqueue({
        template: 'GOAL_ALERT',
        competitionId: 'comp-1',
        subjectType: 'FIXTURE',
        subjectId: 'fix-1',
        data: {},
      });

      expect(result).toEqual({ id: 'g1' });
      expect(prisma.graphic.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ format: 'SQUARE' }),
        }),
      );
    });

    it('returns null when the competition does not exist', async () => {
      prisma.competition.findUnique.mockResolvedValue(null);

      const result = await service.enqueue({
        template: 'GOAL_ALERT',
        competitionId: 'missing',
        subjectType: 'FIXTURE',
        subjectId: 'fix-1',
        data: {},
      });

      expect(result).toBeNull();
    });
  });

  describe('enqueue — dedup', () => {
    it('skips when a PENDING/PROCESSING graphic for the same subject+template+format already exists', async () => {
      prisma.graphic.findFirst.mockResolvedValue({ id: 'existing' });

      const result = await service.enqueue({
        template: 'PLAYER_PASSPORT',
        subjectType: 'PLAYER',
        subjectId: 'player-1',
        data: {},
      });

      expect(result).toBeNull();
      expect(prisma.graphic.create).not.toHaveBeenCalled();
    });
  });

  describe('findLatestForSubject', () => {
    it('returns the most recent matching graphic regardless of status', async () => {
      prisma.graphic.findFirst.mockResolvedValue({
        id: 'g1',
        status: 'FAILED',
      });

      const result = await service.findLatestForSubject(
        'PLAYER_PASSPORT',
        'PLAYER',
        'player-1',
      );

      expect(prisma.graphic.findFirst).toHaveBeenCalledWith({
        where: {
          template: 'PLAYER_PASSPORT',
          subjectType: 'PLAYER',
          subjectId: 'player-1',
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual({ id: 'g1', status: 'FAILED' });
    });
  });

  describe('getById', () => {
    it('throws NotFoundException for a missing graphic', async () => {
      prisma.graphic.findUnique.mockResolvedValue(null);
      await expect(service.getById('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
