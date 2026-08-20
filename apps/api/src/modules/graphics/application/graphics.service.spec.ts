import { Readable } from 'node:stream';
import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GraphicsService } from './graphics.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { MediaPacksService } from '../../media-packs/application/media-packs.service';
import { S3StorageService } from '../../media/infrastructure/s3-storage.service';

function fakePrisma() {
  return {
    competition: { findUnique: jest.fn() },
    graphic: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    fixture: { findMany: jest.fn().mockResolvedValue([]) },
    player: { findMany: jest.fn().mockResolvedValue([]) },
    matchEvent: { findMany: jest.fn().mockResolvedValue([]) },
  };
}

describe('GraphicsService', () => {
  let service: GraphicsService;
  let prisma: ReturnType<typeof fakePrisma>;
  let mediaPacks: jest.Mocked<MediaPacksService>;
  let s3: jest.Mocked<S3StorageService>;

  beforeEach(async () => {
    prisma = fakePrisma();
    const moduleRef = await Test.createTestingModule({
      providers: [
        GraphicsService,
        { provide: PrismaService, useValue: prisma },
        { provide: MediaPacksService, useValue: { hasEntitlement: jest.fn() } },
        {
          provide: S3StorageService,
          useValue: { getObjectStream: jest.fn(), publicUrlFor: jest.fn() },
        },
      ],
    }).compile();

    service = moduleRef.get(GraphicsService);
    mediaPacks = moduleRef.get(MediaPacksService);
    s3 = moduleRef.get(S3StorageService);
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

  describe('listForCompetition — filters', () => {
    it('with no filters, only scopes by competitionId', async () => {
      prisma.graphic.findMany.mockResolvedValue([]);

      await service.listForCompetition('comp-1');

      expect(prisma.graphic.findMany).toHaveBeenCalledWith({
        where: { AND: [{ competitionId: 'comp-1' }] },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('adds a template filter clause when given', async () => {
      prisma.graphic.findMany.mockResolvedValue([]);

      await service.listForCompetition('comp-1', { template: 'GOAL_ALERT' });

      expect(prisma.graphic.findMany).toHaveBeenCalledWith({
        where: {
          AND: [{ competitionId: 'comp-1' }, { template: 'GOAL_ALERT' }],
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('resolves a teamId filter into an OR across fixture/player/match-event subjects', async () => {
      prisma.fixture.findMany.mockResolvedValue([{ id: 'fix-1' }]);
      prisma.player.findMany.mockResolvedValue([{ id: 'player-1' }]);
      prisma.matchEvent.findMany.mockResolvedValue([{ id: 'evt-1' }]);
      prisma.graphic.findMany.mockResolvedValue([]);

      await service.listForCompetition('comp-1', { teamId: 'team-1' });

      expect(prisma.graphic.findMany).toHaveBeenCalledWith({
        where: {
          AND: [
            { competitionId: 'comp-1' },
            {
              OR: [
                { subjectType: 'FIXTURE', subjectId: { in: ['fix-1'] } },
                { subjectType: 'PLAYER', subjectId: { in: ['player-1'] } },
                { subjectType: 'MATCH_EVENT', subjectId: { in: ['evt-1'] } },
              ],
            },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('buildZipArchive', () => {
    it('only includes READY graphics that have a mediaKey', async () => {
      prisma.graphic.findMany.mockResolvedValue([
        { id: 'g1', status: 'READY', mediaKey: 'k1', template: 'GOAL_ALERT' },
        { id: 'g2', status: 'PENDING', mediaKey: null, template: 'GOAL_ALERT' },
        { id: 'g3', status: 'READY', mediaKey: null, template: 'GOAL_ALERT' },
      ]);
      (s3.getObjectStream as jest.Mock).mockResolvedValue(Readable.from(Buffer.from('fake')));

      const result = await service.buildZipArchive('comp-1');

      expect(result.count).toBe(1);
      expect(s3.getObjectStream).toHaveBeenCalledTimes(1);
      expect(s3.getObjectStream).toHaveBeenCalledWith('k1');
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

  describe('incrementShareCount', () => {
    it('increments the shareCount counter for the given graphic', async () => {
      await service.incrementShareCount('g1');

      expect(prisma.graphic.update).toHaveBeenCalledWith({
        where: { id: 'g1' },
        data: { shareCount: { increment: 1 } },
      });
    });
  });
});
