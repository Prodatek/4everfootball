import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PlayerOutcomesService } from './player-outcomes.service';
import { PrismaService } from '../../../common/prisma/prisma.service';

function fakePrisma() {
  return {
    player: { findUnique: jest.fn() },
    playerOutcome: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  };
}

describe('PlayerOutcomesService', () => {
  let service: PlayerOutcomesService;
  let prisma: ReturnType<typeof fakePrisma>;

  beforeEach(async () => {
    prisma = fakePrisma();
    const moduleRef = await Test.createTestingModule({
      providers: [
        PlayerOutcomesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(PlayerOutcomesService);
  });

  describe('create', () => {
    it('rejects an outcome for a player that does not exist', async () => {
      prisma.player.findUnique.mockResolvedValue(null);

      await expect(
        service.create({
          playerId: 'missing',
          type: 'TRIAL',
          description: 'Trial with X FC',
          sourceNote: 'Reported by scout Y on 2026-08-01',
          occurredAt: new Date(),
          createdById: 'user-1',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.playerOutcome.create).not.toHaveBeenCalled();
    });

    it('creates an outcome with its source note for an existing player', async () => {
      prisma.player.findUnique.mockResolvedValue({ id: 'p1' });
      prisma.playerOutcome.create.mockResolvedValue({ id: 'outcome-1' });

      const params = {
        playerId: 'p1',
        type: 'SIGNING' as const,
        description: 'Signed for X FC academy',
        sourceNote: 'Confirmed by club statement, 2026-08-10',
        occurredAt: new Date('2026-08-10'),
        createdById: 'user-1',
      };

      await service.create(params);

      expect(prisma.playerOutcome.create).toHaveBeenCalledWith({
        data: params,
      });
    });
  });

  describe('remove', () => {
    it('throws NotFoundException for a missing outcome', async () => {
      prisma.playerOutcome.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.playerOutcome.delete).not.toHaveBeenCalled();
    });

    it('deletes an existing outcome', async () => {
      prisma.playerOutcome.findUnique.mockResolvedValue({ id: 'outcome-1' });

      await service.remove('outcome-1');

      expect(prisma.playerOutcome.delete).toHaveBeenCalledWith({
        where: { id: 'outcome-1' },
      });
    });
  });
});
